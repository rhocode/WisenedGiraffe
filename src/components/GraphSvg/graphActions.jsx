import constants from './constants';
import * as d3 from 'd3';
import {
  addEfficiencyArc,
  addNodeImage, editEfficiencyArc,
  insertComponents,
  insertNodeOverclock,
  insertNodeTier,
  node_clicked,
  node_mouse_down,
  node_mouse_out,
  node_mouse_over,
  node_mouse_up,
  remove_select_from_nodes,
  wheelZoomCalculation
} from './nodeActions';
import {drag_drag, drag_end, drag_start} from './mouseEvents';
import {pathMouseClick, recalculateStorageContainers, insertEdgeLabel, calculateLabelPositions} from './edgeActions';
import {strongly_connected_components_standalone} from './algorithms';
import TinyQueue from '../TinyQueue';


export const analyzeGraph = function() {
  const nodeUnion = new Set(Object.keys(this.nodeIn));
  Object.keys(this.nodeOut).forEach(node => nodeUnion.add(node));
  const nodeUnionArray = Array.from(nodeUnion);

  const nodeLookup = {};

  nodeUnionArray.forEach((value, index) => {
    nodeUnionArray[index] = this.graphData.nodes.filter(elem => elem.id.toString() === value)[0];
    nodeLookup[nodeUnionArray[index].id] = nodeUnionArray[index];
    nodeUnionArray[index].childProvides = [];
    nodeUnionArray[index].hasSources = new Set();
    nodeUnionArray[index].containedItems = [];

    if (nodeUnionArray[index].machine.name !== 'Container' && nodeUnionArray[index].machine.name !== 'Logistic') {
    } else {
      nodeUnionArray[index].allowedIn = [];
      nodeUnionArray[index].allowedOut = [];
    }
  });

  const nodeOutWithSets = {};
  Object.keys(this.nodeOut).forEach(key => {
    const value = this.nodeOut[key];
    nodeOutWithSets[key] = new Set(value.map(elem => elem.id.toString()));
  });

  const componentsList = strongly_connected_components_standalone(nodeOutWithSets);
  const superNodeGraphLookup = {};
  const superNodeGraphLookupInflated = {};
  const lookupArray = {};
  componentsList.forEach((list, index) => {
    superNodeGraphLookup[index] = list;
    superNodeGraphLookupInflated[index] = list.map(id => nodeLookup[id]);
    list.forEach(item => {
      lookupArray[item] = index;
    });
  });
  const derivedGraphOutgoing = {};

  // Derive a graph from this new info
  Object.keys(this.nodeOut).forEach(node => {
    const ids = this.nodeOut[node].map(item => item.id);
    const thisNode = lookupArray[node];
    derivedGraphOutgoing[thisNode] = derivedGraphOutgoing[thisNode] || new Set();
    const derivedGraphAccessor = derivedGraphOutgoing[thisNode];
    ids.forEach(id => {
      const thisId = lookupArray[id];
      if (thisId === thisNode) return;
      derivedGraphAccessor.add(thisId);
    });
  });
  const derivedGraphIncoming = {};
  const immutableDerivedGraphIncoming = {};

  // Derive a graph from this new info
  Object.keys(this.nodeOut).forEach(node => {
    const ids = this.nodeOut[node].map(item => item.id);
    const thisNode = lookupArray[node];
    derivedGraphIncoming[thisNode] = derivedGraphIncoming[thisNode] || new Set();
    immutableDerivedGraphIncoming[thisNode] = immutableDerivedGraphIncoming[thisNode] || new Set();
    ids.forEach(id => {
      const thisId = lookupArray[id];
      if (thisId === thisNode) return;

      if (!derivedGraphIncoming[thisId]) {
        derivedGraphIncoming[thisId] = new Set();
        immutableDerivedGraphIncoming[thisId] = new Set();
      }

      const derivedGraphAccessor = derivedGraphIncoming[thisId];
      derivedGraphAccessor.add(thisNode);
      immutableDerivedGraphIncoming[thisId].add(thisNode);
    });
  });
  const myTinyQueue = new TinyQueue(Array.from(new Set([...Object.keys(derivedGraphOutgoing), ...Object.keys(derivedGraphIncoming)])), (a, b) => {
    return (derivedGraphIncoming[a] || []).size - (derivedGraphIncoming[b] || []).size;
  });

  const providedThroughput = {};

  const itemLookup = {};

  this.props.parentAccessor.state.recipe.item.forEach(item => {
    itemLookup[item.id] = item.icon;
  });

  this.graphData.nodes.forEach(node => {
    delete node.efficiency;
    delete node.itemThroughPut;
    delete node.itemsPerMinute;
    delete node.internalError;
    node.itemIconLookup = itemLookup;
  });

  this.graphData.links.forEach(link => {
    delete link.itemThroughPut;
    delete link.tempIndex;
    link.itemIconLookup = itemLookup;
  });


  while(myTinyQueue.size()) {
    const node = myTinyQueue.pop();

    const thisNodeInflated = superNodeGraphLookupInflated[node];
    const outgoing = Array.from(derivedGraphOutgoing[node] || new Set());
    const outgoingInflated = outgoing.map(item => superNodeGraphLookupInflated[item]);

    const propagateNodeToEdgesRevised = (nodeGroupSource, nodeGroupTarget, origin, targets) => {
      const nodeGroupSourceThroughput = [];
      if (nodeGroupSource.length === 1) {
        const node = nodeGroupSource[0];
        let throughput = null;
        let efficiency = null;

        const nodeSpeed = node.instance.speed / 100;
        const overclock = node.overclock / 100;

        const provided = providedThroughput[node.id] || [];

        if (node.data.node) {
          // this is a purity calculation
          const recipe = node.data.recipe;
          const purity = node.data.purity;
          const fetchedPurity = recipe.purities.filter(item => item.name === purity);

          if (fetchedPurity.length !== 1) {
            throw new Error('Trying to get purity', purity, 'wtf?');
          }
          const actualPurity = fetchedPurity[0];

          throughput = {
            speed: nodeSpeed,
            overclock,
            quantity: actualPurity.quantity,
            item: recipe.item.id,
            time: 60,
            power: node.instance.power,
            inputs: []
          };
          efficiency = 1;

          const maxThroughput = (throughput.quantity / throughput.time) * 60 * node.instance.speed / 100 * throughput.overclock;
          nodeGroupSourceThroughput.push({throughput, efficiency, source: origin });

          nodeGroupSource.forEach(node => {
            node.efficiency = efficiency;
            node.itemsPerMinute = {[throughput.item]: maxThroughput};

            // Comment this out if we should remove the display from nodes
            node.itemThroughPut = {[throughput.item]: {max: maxThroughput, actual: maxThroughput}};
          });
        } else if (node.machine.name === 'Logistic' && node.instance.name === 'Splitter') {
          const resources = {};
          const providedSet = new Set();
          provided.forEach(provideRaw => {
            const provide = JSON.parse(JSON.stringify(provideRaw));

            //TODO: change the 3 to the actual number of links out
            provide.maxItemsPerSecLimiter = provide.calculatedItemPerSecond / ((this.nodeOut[nodeGroupSource[0].id] || []).length || 1);
            const i = provide.throughput.item;
            providedSet.add(i);
            const itemPerSec = provide.calculatedItemPerSecond;
            resources[i] = resources[i] || 0;
            resources[i] += itemPerSec * 60;

            nodeGroupSourceThroughput.push(provide);
          });

          nodeGroupSource.forEach(node => {
            node.efficiency = 1;
            node.itemsPerMinute = {};
            node.itemThroughPut = {};
            providedSet.forEach(providedItem => {
              const resourceCount = resources[providedItem];
              node.itemsPerMinute[providedItem] = resourceCount;
              node.itemThroughPut[providedItem] = {max: resourceCount, actual: resourceCount};
            });
          });
        } else if (node.machine.name === 'Logistic' && node.instance.name === 'Merger') {
          const resources = {};
          const providedSet = new Set();
          provided.forEach(provideRaw => {
            const provide = JSON.parse(JSON.stringify(provideRaw));
            const i = provide.throughput.item;
            providedSet.add(i);
            const itemPerSec = provide.calculatedItemPerSecond;
            resources[i] = resources[i] || 0;
            resources[i] += itemPerSec * 60;
            nodeGroupSourceThroughput.push(provide);
          });

          nodeGroupSource.forEach(node => {
            node.efficiency = 1;
            node.itemsPerMinute = {};
            node.itemThroughPut = {};
            providedSet.forEach(providedItem => {
              const resourceCount = resources[providedItem];
              node.itemsPerMinute[providedItem] = resourceCount;
              node.itemThroughPut[providedItem] = {max: resourceCount, actual: resourceCount};
            });
          });
        } else if (node.machine.name === 'Container') {
          const resources = {};
          const providedSet = new Set();
          provided.forEach(provide => {
            const i = provide.throughput.item;
            providedSet.add(i);
            const itemPerSec = provide.calculatedItemPerSecond;
            resources[i] = resources[i] || 0;
            resources[i] += itemPerSec * 60;
            nodeGroupSourceThroughput.push(provide);
          });

          nodeGroupSource.forEach(node => {
            node.efficiency = 1;
            node.itemsPerMinute = {};
            providedSet.forEach(providedItem => {
              const resourceCount = resources[providedItem];
              node.itemsPerMinute[providedItem] = resourceCount;
              node.itemThroughPut = {[providedItem]: {max: resourceCount, actual: resourceCount}};
            });
          });
        } else {
          throughput = {
            speed: nodeSpeed,
            overclock,
            quantity: node.data.recipe.quantity,
            item: node.data.recipe.item.id,
            time: node.data.recipe.time,
            power: node.data.recipe.power,
            inputs: node.data.recipe.inputs.map(elem => {
              return {item: elem.item.id, quantity: elem.quantity};
            })
          };

          const resources = {};

          const providedSet = new Set();

          provided.forEach(provide => {
            const i = provide.throughput.item;

            providedSet.add(i);

            const itemPerSec = provide.calculatedItemPerSecond;

            resources[i] = resources[i] || 0;
            resources[i] += itemPerSec * 60;
          });

          const missing = new Set();
          const efficiencies = [Infinity];

          const maxThroughput = (throughput.quantity / throughput.time) * 60 * node.instance.speed / 100 * throughput.overclock;

          throughput.inputs.forEach(inp => {
            const item = inp.item;
            const quantity = inp.quantity;
            const providedQuantity = resources[item] || 0;
            if (!providedSet.has(item)) {
              missing.add(item);
            }

            const resourceThroughputNeeded = maxThroughput * (quantity / throughput.quantity);

            // console.log("Debug: Producing ", node.data.recipe.quantity, "of", node.data.recipe.item.name, "from", quantity, "of", item)
            // console.log("Looking like we will need ", throughput.time, throughput.quantity);
            const calculatedThroughput = maxThroughput * (Math.min(resourceThroughputNeeded, providedQuantity) / resourceThroughputNeeded);

            const maxThroughputPerItem = resourceThroughputNeeded;

            node.itemThroughPut = node.itemThroughPut || {};
            node.itemThroughPut[item] = node.itemThroughPut[item] || {max: 0, actual: 0};
            node.itemThroughPut[item].max += maxThroughputPerItem;
            node.itemThroughPut[item].actual += providedQuantity;

            const efficiency = calculatedThroughput / maxThroughput;

            efficiencies.push(Math.min(1, efficiency));

          });

          if (missing.size > 0) {
            efficiency = 0;
          } else {
            efficiency = Math.min(...efficiencies);
          }

          nodeGroupSourceThroughput.push({throughput, efficiency, source: origin});

          nodeGroupSource.forEach(node => {
            node.efficiency = efficiency;
            node.itemsPerMinute = {[throughput.item]: maxThroughput * efficiency};
          });
        }

        (derivedGraphOutgoing[origin] || []).forEach(outgoingNode => {
          const sources = nodeGroupSource.map(node => node.id);
          const targets = superNodeGraphLookupInflated[outgoingNode].map(node => node.id);

          const totalItemThroughput = nodeGroupSourceThroughput.map(throughput => {
            const q = throughput.throughput.quantity;
            const t = throughput.throughput.time;
            const e = throughput.efficiency;
            const o = throughput.throughput.overclock;
            const s = throughput.throughput.speed;

            //check propagated limited
            const maxItemsPerSecLimiter = throughput.maxItemsPerSecLimiter === undefined ? Infinity : throughput.maxItemsPerSecLimiter;
            return Math.min(q / t * e * o * s || 0, maxItemsPerSecLimiter);
          }).reduce((a, b = 0) => a + b, 0);

          sources.forEach(source => {
            targets.forEach(target => {

              const link = this.graphData.links.filter(link => link.source.id === source && link.target.id === target);

              let foundLink = null;
              if (link && link.length === 1) {
                foundLink = link[0];
              } else if (link && link.length > 1) {
                throw new Error('Too many links found!!!');
              } else {
                return;
              }

              providedThroughput[target] = providedThroughput[target] || [];

              // Now totalItemPerSec contains the actual throughput of items
              const limitedSpeed = foundLink.instance.speed;

              nodeGroupSourceThroughput.forEach(itemRaw => {

                const throughput = JSON.parse(JSON.stringify(itemRaw));

                const q = throughput.throughput.quantity;
                const t = throughput.throughput.time;
                const e = throughput.efficiency;
                const o = throughput.throughput.overclock;
                const s = throughput.throughput.speed;
                const i = throughput.throughput.item;

                //check propagated limited
                const maxItemsPerSecLimiter = throughput.maxItemsPerSecLimiter === undefined ? Infinity : throughput.maxItemsPerSecLimiter;


                let itemPerSecBeforeBeltLimiting = Math.min(q / t * e * o * s || 0, maxItemsPerSecLimiter);

                // need to do some weird math to constrain the items/psec to a PORTION of the belt limited
                const limitedItemPerSecByBelt = limitedSpeed / 60 * (itemPerSecBeforeBeltLimiting/totalItemThroughput);


                throughput.maxItemsPerSecLimiter = Math.min(limitedItemPerSecByBelt, maxItemsPerSecLimiter);

                throughput.calculatedItemPerSecond = Math.min(itemPerSecBeforeBeltLimiting, throughput.maxItemsPerSecLimiter);

                foundLink.itemThroughPut = foundLink.itemThroughPut || {};
                foundLink.itemThroughPut[i] = foundLink.itemThroughPut[i] || {max: 0, actual: 0};
                foundLink.itemThroughPut[i].max = limitedItemPerSecByBelt * 60;
                foundLink.itemThroughPut[i].actual += itemPerSecBeforeBeltLimiting * 60;

                providedThroughput[target].push(throughput);
              });

            });
          });

        });
      } else {
        // propagate to nodes in this nodeGroup only.
        // then





        const loopedNodes = new Set();


        // const resources = {};
        // const resourcePrevious = {};
        // const resourceInitial = {};

        nodeGroupSource.forEach((node) => {
          loopedNodes.add(node.id);
        });


        const propagate = (initialNode, resourcesRaw, optionalVisitedSet = null) => {
          const stack = [];
          const visitedNodes = optionalVisitedSet || new Set();
          if (!visitedNodes.has(initialNode.id)) {
            visitedNodes.add(initialNode.id);
            stack.push(initialNode);
          }

          const resourceToPropagate = resourcesRaw[node.id] || [];

          const resources = {[node.id] : JSON.parse(JSON.stringify(resourceToPropagate))};


          while(stack.length) {
            const node = stack.pop();
            if (node.machine.name === 'Logistic' && node.instance.name === 'Splitter') {

            }
          }
        };

        const visit = (nodeInitial, provide, loopedNodes) => {
          let i = 0;

          const item = provide.throughput.item;
          let initialItemPerSec = provide.calculatedItemPerSecond;
          const resources = {[nodeInitial.id] : initialItemPerSec};
          while(i < 1) {
            const visitedNodes = new Set();
            const stack = [nodeInitial];
            visitedNodes.add(nodeInitial.id);

            while(stack.length) {
              const node = stack.pop();


              const theseResources = resources[node.id];


              if (node.machine.name === 'Logistic' && node.instance.name === 'Splitter') {

              } else if (node.machine.name === 'Logistic' && node.instance.name === 'Merger') {

              } else if (node.machine.name === 'Container' ) {

              }

              this.nodeOut[node.id].forEach(outNode => {

                if (!loopedNodes.has(outNode.id)) {
                  return;
                }

                const links = this.graphData.links.filter(link => link.source.id === node.id && link.target.id === outNode.id);
                if (links && links.length !== 1) {
                  throw new Error('Too many links found!!!');
                }
                const link = links[0];
                const limitedSpeed = link.instance.speed;

                console.log('Link:', node.id, outNode.id, limitedSpeed);

                resources[outNode.id] = resources[outNode.id] || 0;

                resources[outNode.id] += (theseResources * 60);


                // const totalItemThroughput = Object.keys(myResources).map(key  => myResources[key]).reduce((a, b = 0) => a + b, 0);
                // resources[outNode.id] = resources[outNode.id] || {};
                //
                // Object.keys(myResources).forEach(key => {
                //   const resourceCountPerMinute = myResources[key];
                //   resources[outNode.id][key] = resources[outNode.id][key] || 0;
                //   const limitedItemPerSecByBelt = limitedSpeed  * (resourceCountPerMinute/totalItemThroughput);
                //   resources[outNode.id][key] += Math.min(resourceCountPerMinute, limitedItemPerSecByBelt) ;
                // });
              });

              (this.nodeOut[node.id] || []).forEach(outNode => {
                if (!visitedNodes.has(outNode.id) && loopedNodes.has(outNode.id)) {
                  visitedNodes.add(outNode.id);
                  stack.push(outNode);
                }
              });

            }
            i++;
          }
          console.log(resources);
        };

        nodeGroupSource.forEach((node) => {
          const providedThroughputFromOthers = JSON.parse(JSON.stringify(providedThroughput[node.id] || []));

          providedThroughputFromOthers.forEach(provide => {
            visit(node, provide, loopedNodes);
          });

        });
        // console.error(providedThroughputFromOtherSources, this.nodeOut);
        // nodeGroupSource.forEach((node, index) => {
        //   if (index === 0) {
        //     providedThroughputFromOtherSources.forEach(provide => {
        //       const i = provide.throughput.item;
        //       const itemPerSec = provide.calculatedItemPerSecond;
        //       resources[node.id] = resources[node.id] || {};
        //       resources[node.id][i] = resources[node.id][i] || 0;
        //       resources[node.id][i] += itemPerSec * 60;
        //
        //       resourcePrevious[node.id] = resourcePrevious[node.id] || {};
        //       resourcePrevious[node.id][i] = resourcePrevious[node.id][i] || 0;
        //       resourcePrevious[node.id][i] += itemPerSec * 60;
        //
        //       resourceInitial[node.id] = resourceInitial[node.id] || {};
        //       resourceInitial[node.id][i] = resourceInitial[node.id][i] || 0;
        //       resourceInitial[node.id][i] += itemPerSec * 60;
        //
        //       nodeGroupSourceThroughput.push(provide);
        //     });
        //   }
        // });
        // let i = 0;
        // let minSpeed = Infinity;
        // while(i < 300 && nodeGroupSourceThroughput.length > 0) {
        //
        //   const visitNodes = (resources) => {
        //     const visitedNodes = new Set();
        //     nodeGroupSource.forEach((nodeInitial) => {
        //       const stack = [];
        //       if (!visitedNodes.has(nodeInitial.id)) {
        //         visitedNodes.add(nodeInitial.id);
        //         stack.push(nodeInitial);
        //       }
        //
        //       while(stack.length) {
        //         const node = stack.pop();
        //
        //         const myResources = resources[node.id] || [];
        //
        //         // const provided = localProvide[node.id] || [];
        //         if (node.machine.name === 'Logistic' && node.instance.name === 'Splitter') {
        //
        //           const nWaySplit = (this.nodeOut[node.id] || []).length || 1;
        //
        //           const totalItemThroughput = Object.keys(myResources).map(key  => myResources[key]).reduce((a, b = 0) => a + b, 0) / nWaySplit;
        //
        //           this.nodeOut[node.id].forEach(outNode => {
        //
        //             if (!loopedNodes.has(outNode.id)) {
        //               return;
        //             }
        //
        //             const links = this.graphData.links.filter(link => link.source.id === node.id && link.target.id === outNode.id);
        //             if (links && links.length !== 1) {
        //               throw new Error('Too many links found!!!');
        //             }
        //             const link = links[0];
        //             const limitedSpeed = link.instance.speed;
        //
        //             minSpeed = Math.min(minSpeed, limitedSpeed);
        //
        //             resources[outNode.id] = resources[outNode.id] || {};
        //             console.log(node.instance.name, totalItemThroughput, limitedSpeed)
        //             if (totalItemThroughput > limitedSpeed) {
        //               // UNSTABLE RESULTS!!!
        //               outNode.internalError = outNode.internalError || new Set();
        //               outNode.internalError.add("LIMITED_OUTPUT");
        //               console.error("UNSTABLE NODE");
        //             }
        //
        //             Object.keys(myResources).forEach(key => {
        //               const resourceCountPerMinute = myResources[key] / nWaySplit;
        //               resources[outNode.id][key] = resources[outNode.id][key] || 0;
        //
        //               const limitedItemPerSecByBelt = limitedSpeed  * (resourceCountPerMinute / totalItemThroughput);
        //
        //               resources[outNode.id][key] += Math.min(resourceCountPerMinute, limitedItemPerSecByBelt) ;
        //             });
        //           });
        //         } else if (node.machine.name === 'Logistic' && node.instance.name === 'Merger') {
        //           this.nodeOut[node.id].forEach(outNode => {
        //             const links = this.graphData.links.filter(link => link.source.id === node.id && link.target.id === outNode.id);
        //             if (links && links.length !== 1) {
        //               throw new Error('Too many links found!!!');
        //             }
        //             const link = links[0];
        //             const limitedSpeed = link.instance.speed;
        //
        //             minSpeed = Math.min(minSpeed, limitedSpeed);
        //
        //             const totalItemThroughput = Object.keys(myResources).map(key  => myResources[key]).reduce((a, b = 0) => a + b, 0);
        //             resources[outNode.id] = resources[outNode.id] || {};
        //
        //             Object.keys(myResources).forEach(key => {
        //               const resourceCountPerMinute = myResources[key];
        //               resources[outNode.id][key] = resources[outNode.id][key] || 0;
        //
        //               const limitedItemPerSecByBelt = limitedSpeed  * (resourceCountPerMinute/totalItemThroughput);
        //
        //               console.log("The limited node", resourceCountPerMinute, limitedItemPerSecByBelt);
        //
        //               resources[outNode.id][key] += Math.min(resourceCountPerMinute, limitedItemPerSecByBelt) ;
        //             });
        //           });
        //           // I need to output to my edges. Fortunately, all my edges will be in the cycle.
        //         } else if (node.machine.name === 'Container' ) {
        //           // I need to output to my edges. Fortunately, all my edges will be in the cycle.
        //
        //           this.nodeOut[node.id].forEach(outNode => {
        //             const links = this.graphData.links.filter(link => link.source.id === node.id && link.target.id === outNode.id);
        //             if (links && links.length !== 1) {
        //               throw new Error('Too many links found!!!');
        //             }
        //             const link = links[0];
        //             const limitedSpeed = link.instance.speed;
        //
        //             minSpeed = Math.min(minSpeed, limitedSpeed);
        //             const totalItemThroughput = Object.keys(myResources).map(key  => myResources[key]).reduce((a, b = 0) => a + b, 0);
        //             resources[outNode.id] = resources[outNode.id] || {};
        //
        //             Object.keys(myResources).forEach(key => {
        //               const resourceCountPerMinute = myResources[key];
        //               resources[outNode.id][key] = resources[outNode.id][key] || 0;
        //               const limitedItemPerSecByBelt = limitedSpeed  * (resourceCountPerMinute/totalItemThroughput);
        //               resources[outNode.id][key] += Math.min(resourceCountPerMinute, limitedItemPerSecByBelt) ;
        //             })
        //           });
        //         }
        //
        //         (this.nodeOut[node.id] || []).forEach(outNode => {
        //           if (!visitedNodes.has(outNode.id) && loopedNodes.has(outNode.id)) {
        //             visitedNodes.add(outNode.id);
        //             stack.push(outNode);
        //           }
        //         });
        //       }
        //     });
        //
        //     let preventDelete = 0;
        //     const rounder = 1000;
        //     nodeGroupSource.forEach((nodeInitial, index) => {
        //
        //       if (index === 0) {
        //         Object.keys(resourcePrevious[nodeInitial.id] || {}).forEach(key => {
        //           const item = resources[nodeInitial.id][key];
        //           const prevItem = resourcePrevious[nodeInitial.id][key];
        //           const delta = item - prevItem;
        //
        //
        //           resources[nodeInitial.id][key] = resourceInitial[nodeInitial.id][key] + delta;
        //           resourcePrevious[nodeInitial.id][key] = resources[nodeInitial.id][key];
        //
        //
        //           if (Math.round(prevItem * rounder) === Math.round(resources[nodeInitial.id][key] * rounder)) {
        //             i += 9999999;
        //             preventDelete = true;
        //           }
        //         });
        //         if (!preventDelete) return;
        //       }
        //       if (preventDelete) {
        //         Object.keys(resources[nodeInitial.id] || {}).forEach(key => {
        //           resources[nodeInitial.id][key] = Math.round(resources[nodeInitial.id][key] * (rounder / 100) ) / (rounder / 100);
        //         });
        //         return;
        //       }
        //       delete resources[nodeInitial.id];
        //     });
        //   };
        //
        //   visitNodes(resources);
        //   i += 1;
        // }
        //
        // console.log(minSpeed);
        //
        // nodeGroupSourceThroughput.forEach(provide => {
        //   if (provide.maxItemsPerSecLimiter === undefined) {
        //     provide.maxItemsPerSecLimiter = Infinity;
        //   }
        //
        //   provide.maxItemsPerSecLimiter = Math.min(minSpeed/60, provide.maxItemsPerSecLimiter);
        // })
        //
        // nodeGroupSource.forEach(node => {
        //   node.efficiency = 1;
        //   node.itemsPerMinute = {};
        //   node.itemThroughPut = {};
        //   Object.keys(resources[node.id] || {}).forEach(providedItem => {
        //     const resourceCount = resources[node.id][providedItem] || 0;
        //     console.error(resourceCount)
        //     node.itemsPerMinute[providedItem] = resourceCount;
        //     node.itemThroughPut[providedItem] = {max: resourceCount, actual: resourceCount};
        //   });
        //
        //   this.nodeOut[node.id].forEach(outNode => {
        //
        //   });
        //
        // });
        //
        //
        //
        //
        //
        // (derivedGraphOutgoing[origin] || []).forEach(outgoingNode => {
        //   const sources = nodeGroupSource.map(node => node.id);
        //   const targets = superNodeGraphLookupInflated[outgoingNode].map(node => node.id);
        //
        //
        //   const totalItemThroughput = nodeGroupSourceThroughput.map(throughput => {
        //     const q = throughput.throughput.quantity;
        //     const t = throughput.throughput.time;
        //     const e = throughput.efficiency;
        //     const o = throughput.throughput.overclock;
        //     const s = throughput.throughput.speed;
        //     //check propagated limited
        //     const maxItemsPerSecLimiter = throughput.maxItemsPerSecLimiter === undefined ? Infinity : throughput.maxItemsPerSecLimiter;
        //     return Math.min(q / t * e * o * s || 0, maxItemsPerSecLimiter);
        //   }).reduce((a, b = 0) => a + b, 0);
        //
        //   console.log(totalItemThroughput);
        //
        //   sources.forEach(source => {
        //     targets.forEach(target => {
        //
        //       const link = this.graphData.links.filter(link => link.source.id === source && link.target.id === target);
        //
        //       let foundLink = null;
        //       if (link && link.length === 1) {
        //         foundLink = link[0];
        //       } else if (link && link.length > 1) {
        //         throw new Error('Too many links found!!!');
        //       } else {
        //         return;
        //       }
        //
        //       providedThroughput[outgoingNode] = providedThroughput[outgoingNode] || [];
        //
        //       // Now totalItemPerSec contains the actual throughput of items
        //       const limitedSpeed = foundLink.instance.speed;
        //
        //       nodeGroupSourceThroughput.forEach(itemRaw => {
        //
        //         const throughput = JSON.parse(JSON.stringify(itemRaw));
        //
        //         const q = throughput.throughput.quantity;
        //         const t = throughput.throughput.time;
        //         const e = throughput.efficiency;
        //         const o = throughput.throughput.overclock;
        //         const s = throughput.throughput.speed;
        //         const i = throughput.throughput.item;
        //
        //         //check propagated limited
        //         const maxItemsPerSecLimiter = throughput.maxItemsPerSecLimiter === undefined ? Infinity : throughput.maxItemsPerSecLimiter;
        //
        //
        //         let itemPerSecBeforeBeltLimiting = Math.min(q / t * e * o * s || 0, maxItemsPerSecLimiter);
        //
        //         // need to do some weird math to constrain the items/psec to a PORTION of the belt limited
        //         const limitedItemPerSecByBelt = limitedSpeed / 60 * (itemPerSecBeforeBeltLimiting/totalItemThroughput);
        //
        //
        //         throughput.maxItemsPerSecLimiter = Math.min(limitedItemPerSecByBelt, maxItemsPerSecLimiter);
        //
        //         throughput.calculatedItemPerSecond = Math.min(itemPerSecBeforeBeltLimiting, throughput.maxItemsPerSecLimiter);
        //
        //         foundLink.itemThroughPut = foundLink.itemThroughPut || {};
        //         foundLink.itemThroughPut[i] = foundLink.itemThroughPut[i] || {max: 0, actual: 0};
        //         foundLink.itemThroughPut[i].max = limitedItemPerSecByBelt * 60;
        //         foundLink.itemThroughPut[i].actual += itemPerSecBeforeBeltLimiting * 60;
        //
        //         providedThroughput[outgoingNode].push(throughput);
        //       });
        //
        //     });
        //   });
        //
        // });






        // push everything to edges as usual.
      }






    };

    propagateNodeToEdgesRevised(thisNodeInflated, outgoingInflated, node, outgoing);

    Object.keys(derivedGraphIncoming).forEach(key => {
      const accessor = derivedGraphIncoming[key];
      accessor.delete(parseInt(node, 10));
    });

    myTinyQueue.reheapify();
  }

  editEfficiencyArc('efficiency', 59, 322);
};
export const initSimulation = () => {
  const bodyEl = document.getElementById('mainRender');

  const width = bodyEl.clientWidth;
  const height = bodyEl.clientHeight;
  return d3.forceSimulation()
    .force('link', d3.forceLink().id(function (d) {
      return d.id;
    }).distance(60))
    .force('charge', d3.forceManyBody().strength(20))
    // .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(function (d) {
      return 120;
    }))
    .force('xAxis', d3.forceX().strength(0.1).x(function(d){return width/2;}))
    .force('yAxis', d3.forceY().strength(0.5).y(function(d){return height/2;}));
};

export const updateGraph = function (simulation, graphNodesGroup, graphLinksGroup) {
  const t = this;
  let nodes = this.graphData.nodes;
  let links = this.graphData.links;

  this.nodeIn = {};
  this.nodeOut = {};

  links.forEach(elem => {
    const outgoing = elem.source.id;
    const incoming = elem.target.id;
    this.nodeOut[outgoing] = this.nodeOut[outgoing] || [];
    this.nodeIn[incoming] = this.nodeIn[incoming] || [];

    this.nodeOut[outgoing].push(elem.target);
    this.nodeIn[incoming].push(elem.source);
  });

  nodes.forEach(node => {
    const input_slots = node.instance.input_slots;
    const output_slots = node.instance.output_slots;
    node.open_in_slots = input_slots - (t.nodeIn[node.id] || []).length;
    node.open_out_slot = output_slots - (t.nodeOut[node.id] || []).length;
  });

  recalculateStorageContainers.call(t);

  const drag = d3.drag()
    .clickDistance(10)
    .on('start', (d) => {
      drag_start.call(this, d, simulation, t);
    }).on('drag', (d) => {
      drag_drag.call(this, d, t);
    }).on('end', function (d) {
      d3.event.sourceEvent.stopImmediatePropagation();
      drag_end.call(this, d, t, simulation);
    });

  let graphNodesData =
    graphNodesGroup
      .selectAll('.' + 'node-data-class')
      .data(nodes, d => d.id);

  let graphNodesEnter =
    graphNodesData
      .enter()
      .append('g')
      .classed('node-data-class', true)
      .attr('id', d => d.id || null)
    // .on('contextmenu', (d, i)  => {
    //   t.remove(d);
    //   d3.event.preventDefault();
    // })
    // .on('mouseover', d => console.log(`d.id: ${d.id}`))
    // .on('click', d => t.handleNodeClicked(d))
      .on('wheel.zoom', function (d) {
        wheelZoomCalculation.call(this, d);
      })
      .on('click', function (d) {
        d3.event.stopImmediatePropagation();
        node_clicked.call(this, d, t);
      // self.onNodeClicked.emit(d.id);
      }).on('dblclick', function (d) {
        d3.event.stopImmediatePropagation();
        remove_select_from_nodes(t);
        d.fx = null;
        d.fy = null;
      }).on('mouseover', function (d) {
        node_mouse_over.call(this, d, t);
      }).on('mouseout', function (d) {
        node_mouse_out.call(this, d, t);
      }).on('mousedown', function (d) {
        node_mouse_down.call(this, d, t);
      }).on('mouseup', function (d) {
        node_mouse_up.call(this, d, t);
      }).call(drag);

  let graphNodesExit =
    graphNodesData
      .exit()
      .remove();

  let graphNodeCircles =
    graphNodesEnter
      .append('circle')
      .classed(constants.graphNodeClass, true)
      .attr('cursor', 'pointer')
      .attr('r', d => 50);

  const callbacks = [];
  addEfficiencyArc(graphNodesEnter, 'efficiency', 59, 322);
  addNodeImage(graphNodesEnter);
  insertNodeOverclock(graphNodesEnter);
  insertNodeTier(graphNodesEnter);
  insertComponents.call(t, graphNodesEnter);

  // merge
  graphNodesData =
    graphNodesEnter.merge(graphNodesData);

  // links
  let graphLinksData =
    graphLinksGroup
      .selectAll('.' + 'link-data-class')
      .data(links, function (d) {
        return d.source.id + '-' + d.target.id;
      });
  let graphLinksEnter =
    graphLinksData
      .enter()
      .append('g')
      .classed('link-data-class', true);

  let graphLinksExit =
    graphLinksData
      .exit()
      .remove();


  const linkFullObject = graphLinksEnter
    .append('g')
    .attr('id', function (d) {
      return 'path-parent' + d.source.id + '-' + d.target.id;
    })
    .classed(constants.lineParentObjectClass, true);


  // apply styling to each selected line
  linkFullObject.append('path')
    .classed(constants.lineStylingPathClass, true)
    .classed(constants.lineStylingFullClass, true)
    .attr('display', 'none')
    .attr('stroke', 'orange')
    .attr('stroke-width', 10);
  linkFullObject.append('path')
    .classed(constants.lineStylingArrowClass, true)
    .classed(constants.lineStylingFullClass, true)
    .attr('display', 'none')
    .attr('stroke', null)
    .attr('marker-end', 'url(#highlight-path-arrow-orange)')
    .attr('stroke-width', 3);

  linkFullObject
    .append('path')
    .classed(constants.lineObjectClass, true)
    .attr('stroke', function (d) {
      return d3.color('#000000');
    })
    .attr('marker-end', 'url(#default-path-arrow)');

  insertEdgeLabel.call(this, linkFullObject);

  // apply styling to each selected line
  linkFullObject
    .append('path')
    .classed(constants.lineHitboxObjectClass, true)
    .on('mouseover', function (d) {
    }).on('mouseout', function (d) {
    }).on('click', function (d) {
      pathMouseClick.call(this, d, t);
    });

  // merge
  graphLinksData =
    graphLinksEnter.merge(graphLinksData);

  simulation
    .nodes(nodes)
    .on('tick', () => {
      handleTick.call(this, graphNodesData, graphLinksData, simulation);
    })
    .on('end', () => {
      console.log('Simulation Ended!');
    });

  simulation
    .force('link')
    .links(links);
  // simulation
  // .force('link', d3.forceLink().links(forceLinks))
  // experiment: weights>
  // t.linkWeights = {}
  // links.forEach(elem => {
  //   t.linkWeights[elem.target.id] = t.linkWeights[elem.target.id] + 1 || 1;
  //   // t.linkWeights[elem.source.id] = t.linkWeights[elem.source.id] + 1 || 1;
  // })
  //
  // simulation.force('charge', d3.forceManyBody().strength(function(d) {
  //   return 20 - (20 * t.linkWeights[d.id]);
  // }));
  callbacks.forEach(callback => callback());
  simulation.alphaTarget(0.3).restart();
};

export const deselect_path_and_nodes = function (t) {
  t.setState({selectedPath: null, selectedNode: null});
  d3.selectAll('.' + constants.lineStylingFullClass).attr('display', 'none');
  remove_select_from_nodes(t);
};

export const zoom_actions = (graphObjects) => {
  graphObjects.attr('transform', d3.event.transform);
};

export const handleTick = function (graphNodesData, graphLinksData, simulation) {
  //update circle positions each tick of the simulation
  const k = 100 * simulation.alpha();
  graphNodesData
    .attr('transform', function (d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    })
    .attr('cx', function (d) {
      return d.x;
    })
    .attr('cy', function (d) {
      return d.y;
    });

  //update link positions
  graphLinksData.selectAll('line')
    .attr('x1', function (d) {
      return d.source.x;
    })
    .attr('y1', function (d) {
      return d.source.y;
    })
    .attr('x2', function (d) {
      return d.target.x;
    })
    .attr('y2', function (d) {
      return d.target.y;
    });

  //update link positions
  graphLinksData.selectAll('path')
    .attr('d', function(d) {return 'M '+d.source.x+' '+d.source.y+' L '+ d.target.x +' '+d.target.y;});

  calculateLabelPositions.call(this, graphLinksData);

  graphLinksData.selectAll('.' + constants.lineObjectClass)
    .each(function (d) {
      d.source.vx += k;
      d.target.vx -= k;
    });
};