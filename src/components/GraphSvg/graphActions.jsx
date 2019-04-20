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

    if (node.data && node.data.recipe && !node.data.node && this.props.parentAccessor.state && this.props.parentAccessor.state.recipe && this.props.parentAccessor.state.recipe.recipe) {
      if (window.location.search.indexOf('thankYouStay=veryYes') > -1) {
        const workaroundHack = this.props.parentAccessor.state.recipe.recipe.filter(rec => rec.id === node.data.recipe.id);
        if (workaroundHack.length > 0) {
          node.data.recipe = workaroundHack[0];
        }
        console.log('Replaced recipe', workaroundHack[0]);
      }
    }

    node.itemIconLookup = itemLookup;
  });

  this.graphData.links.forEach(link => {
    delete link.itemThroughPut;
    delete link.tempIndex;
    delete link.forceOverwritable;
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
            provide.maxItemsPerSecLimiter = provide.calculatedItemPerSecond;
                // / ((this.nodeOut[nodeGroupSource[0].id] || []).length || 1);

            provide.reconstructionMultiplier = ((this.nodeOut[nodeGroupSource[0].id] || []).length || 1);

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

        let totalItemThroughput = 0;
        let totalLinkThroughput = 0;
        let totalItemThroughputByItem = {};

        let linkPairs = [];

        (derivedGraphOutgoing[origin] || []).forEach(outgoingNode => {
          const sources = nodeGroupSource.map(node => node.id);
          const targets = superNodeGraphLookupInflated[outgoingNode].map(node => node.id);

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

              linkPairs.push({source, target, speed: foundLink.instance.speed, link: foundLink});
              totalLinkThroughput += foundLink.instance.speed;
            });
          });
        });

        const localItemThroughput = nodeGroupSourceThroughput.map(throughput => {

          const q = throughput.throughput.quantity;
          const t = throughput.throughput.time;
          const e = throughput.efficiency;
          const o = throughput.throughput.overclock;
          const s = throughput.throughput.speed;
          const i = throughput.throughput.item;

          const maxItemsPerSecLimiter = throughput.maxItemsPerSecLimiter === undefined ? Infinity : throughput.maxItemsPerSecLimiter;
          const tmp = Math.min(q / t * e * o * s || 0, maxItemsPerSecLimiter);

          totalItemThroughputByItem[i] = totalItemThroughputByItem[i] || 0;
          totalItemThroughputByItem[i] += tmp;

          return tmp;
        }).reduce((a, b = 0) => a + b, 0);

        totalItemThroughput += localItemThroughput;

        linkPairs.sort(
          (t1, t2) => {
            return t1.speed - t2.speed;
          }
        );

        let processingType = 1;
        if (totalItemThroughput * 60 > totalLinkThroughput) {
          // split proportioanly the totalItemThroughput
        } else {
          processingType = 0;
          //fill things sequentiually
        }



        let remainingItemProcessing = totalItemThroughput * 60;
        let remainingLinkPairs = linkPairs.length;
        linkPairs.forEach(pair => {
          const target = pair.target;
          const limitedSpeed = pair.speed;

          providedThroughput[target] = providedThroughput[target] || [];
          if (processingType === 1) {
            // split everything
            // fraction of this belt of ALL belts:
            const fraction = limitedSpeed / (totalLinkThroughput);
            pair.fraction = fraction;
          } else {
            if (remainingItemProcessing / remainingLinkPairs > limitedSpeed) {
              // there will be residuals
              const itemsUsed = limitedSpeed;
              remainingItemProcessing -= itemsUsed;
              const fraction = limitedSpeed / (totalItemThroughput * 60);
              pair.fraction = fraction;
            } else {
              // no residuals.
              const itemsUsed = remainingItemProcessing / remainingLinkPairs;
              remainingItemProcessing -= itemsUsed;
              const fraction = itemsUsed / (totalItemThroughput * 60);
              pair.fraction = fraction;
            }
          }
          remainingLinkPairs -= 1;
        });

        linkPairs.forEach(pair => {
          const source = pair.source;
          const target = pair.target;
          const speed = pair.speed;
          const foundLink = pair.link;
          const fraction = pair.fraction || 1;
          const limitedSpeed = speed;

          providedThroughput[target] = providedThroughput[target] || [];

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
            const limitedItemPerSecByBelt = limitedSpeed / 60;

            const beltMaxForThisEntry = limitedItemPerSecByBelt * 60;

            throughput.maxItemsPerSecLimiter = Math.min(limitedItemPerSecByBelt * (maxItemsPerSecLimiter / totalItemThroughput), beltMaxForThisEntry * (maxItemsPerSecLimiter / totalItemThroughput)   ,limitedItemPerSecByBelt, maxItemsPerSecLimiter, itemPerSecBeforeBeltLimiting * fraction);
            throughput.calculatedItemPerSecond = throughput.maxItemsPerSecLimiter;

            foundLink.itemThroughPut = foundLink.itemThroughPut || {};
            foundLink.itemThroughPut[i] = foundLink.itemThroughPut[i] || {max: 0, actual: 0};
            foundLink.itemThroughPut[i].max +=  (itemPerSecBeforeBeltLimiting / totalItemThroughput) * beltMaxForThisEntry;
            foundLink.itemThroughPut[i].actual += itemPerSecBeforeBeltLimiting * 60 * fraction;

            providedThroughput[target].push(throughput);
          });
        })
      } else {
        const loopedNodes = new Set();
        nodeGroupSource.forEach((node) => {
          loopedNodes.add(node.id);
          const provided = providedThroughput[node.id] || [];
          provided.forEach(provideRaw => {
            const provide = JSON.parse(JSON.stringify(provideRaw));
            nodeGroupSourceThroughput.push(provide);
          });
        });

        const visit = (nodeInitial, provide, loopedNodes) => {
          let i = 0;

          let initialItemPerSec = provide.calculatedItemPerSecond;

          let resources = {[nodeInitial.id] : initialItemPerSec * 60};
          const initialNode = nodeInitial.id;
          let  previousOutput = {[nodeInitial.id] : initialItemPerSec * 60};
          let  outputIterator = {[nodeInitial.id] : initialItemPerSec * 60};
          let iteratorTemp = initialItemPerSec * 60;
          while(i < 999) {
            const visitedNodes = new Set();
            const stack = [nodeInitial];
            visitedNodes.add(nodeInitial.id);
            while(stack.length) {
              const node = stack.pop();

              let theseResources = resources[node.id];

              if (node.machine.name === 'Logistic' && node.instance.name === 'Splitter') {
                theseResources = theseResources / ((this.nodeOut[node.id] || []).length || 1);
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
                resources[outNode.id] = resources[outNode.id] || 0;
                resources[outNode.id] += (theseResources);
              });

              (this.nodeOut[node.id] || []).forEach(outNode => {
                if (!visitedNodes.has(outNode.id) && loopedNodes.has(outNode.id)) {
                  visitedNodes.add(outNode.id);
                  stack.push(outNode);
                }
              });

            }

            const delta = resources[initialNode] - previousOutput[initialNode];

            if (!nodeGroupTarget.length || delta > previousOutput || Math.round(delta * 1000000) === 0 || i === 998) {
              Object.keys(resources).forEach(key => {
                outputIterator[key] = Math.round(100 * outputIterator[key]) / 100;
              });
              return outputIterator;
            } else {

              iteratorTemp += delta;

              resources[initialNode] -= previousOutput[initialNode];

              Object.keys(resources).forEach(key => {
                outputIterator[key] = outputIterator[key] || 0;
                outputIterator[key] += resources[key];
              });

              previousOutput[initialNode] = delta; // rabbit and the hare.
              resources = {[initialNode]: delta};
              i++;
            }
          }
        };

        const itemPerNode = {};
        nodeGroupSource.forEach((node) => {
          const providedThroughputFromOthers = JSON.parse(JSON.stringify(providedThroughput[node.id] || []));
          providedThroughputFromOthers.forEach(provide => {
            const resultantResource = visit(node, provide, loopedNodes);
            const item = provide.throughput.item;
            Object.keys(resultantResource || []).forEach(nodeId => {
              itemPerNode[nodeId] = itemPerNode[nodeId] || {};
              itemPerNode[nodeId][item] = itemPerNode[nodeId][item] || 0;
              itemPerNode[nodeId][item] +=  resultantResource[nodeId];
            });
          });
        });

        nodeGroupSource.forEach((node) => {
          this.nodeOut[node.id].forEach(outNode => {

            if (!loopedNodes.has(outNode.id)) {
              return;
            }

            const links = this.graphData.links.filter(link => link.source.id === node.id && link.target.id === outNode.id);
            if (links && links.length !== 1) {
              throw new Error('Too many links found!!!');
            }
            const foundLink = links[0];
            const linkSpeed = foundLink.instance.speed;

            const totalItems = Object.keys(itemPerNode[node.id] || {}).map(item => itemPerNode[node.id][item]).reduce((a, b = 0) => a + b, 0);

            Object.keys(itemPerNode[node.id] || {}).forEach(item => {
              const q = itemPerNode[node.id][item];
              foundLink.itemThroughPut = foundLink.itemThroughPut || {};
              foundLink.itemThroughPut[item] = foundLink.itemThroughPut[item] || {max: 0, actual: 0};
              foundLink.itemThroughPut[item].max = (q/totalItems * linkSpeed);
              foundLink.itemThroughPut[item].actual += (q  / ((this.nodeOut[node.id] || []).length || 1));
              foundLink.forceOverwritable = true;
            });
          });
        });

        nodeGroupSource.forEach((outerNode) => {
          outerNode.itemsPerMinute = {};
          outerNode.efficiency = 1;
          nodeGroupSource.forEach((node) => {
            const provided = providedThroughput[node.id] || [];
            provided.forEach(provideRaw => {
              const provide = JSON.parse(JSON.stringify(provideRaw));
              const item = provide.throughput.item;
              outerNode.itemsPerMinute[item] = (itemPerNode[outerNode.id][item] || 0);
            });
          });
        });



        //=========================
        // let totalLinkThroughput = {};
        //
        // let linkPairs = [];
        // let sourcesSet = new Set();
        //
        // (derivedGraphOutgoing[origin] || []).forEach(outgoingNode => {
        //   const sources = nodeGroupSource.map(node => node.id);
        //   const targets = superNodeGraphLookupInflated[outgoingNode].map(node => node.id);
        //
        //   sources.forEach(source => {
        //     targets.forEach(target => {
        //       const link = this.graphData.links.filter(link => link.source.id === source && link.target.id === target);
        //       let foundLink = null;
        //       if (link && link.length === 1) {
        //         foundLink = link[0];
        //       } else if (link && link.length > 1) {
        //         throw new Error('Too many links found!!!');
        //       } else {
        //         return;
        //       }
        //
        //       linkPairs.push({source, target, speed: foundLink.instance.speed, link: foundLink});
        //       sourcesSet.add(source);
        //       totalLinkThroughput[source] = totalLinkThroughput[source] || 0;
        //       totalLinkThroughput[source] += foundLink.instance.speed;
        //     });
        //   });
        // });
        //
        // linkPairs.sort(
        //     (t1, t2) => {
        //       return t1.speed - t2.speed;
        //     }
        // );
        //
        // console.error("HE WASSSSS", sourcesSet);
        //
        // sourcesSet.forEach(sourceMain => {
        //   let totalItemThroughput = 0;
        //   const localItemThroughput = nodeGroupSourceThroughput.map(throughput => {
        //
        //     const q = throughput.throughput.quantity;
        //     const t = throughput.throughput.time;
        //     const e = throughput.efficiency;
        //     const o = throughput.throughput.overclock;
        //     const s = throughput.throughput.speed;
        //     const i = throughput.throughput.item;
        //
        //     const maxItemsPerSecLimiter = throughput.maxItemsPerSecLimiter === undefined ? Infinity : throughput.maxItemsPerSecLimiter;
        //     const tmp = Math.min(q / t * e * o * s || 0, maxItemsPerSecLimiter);
        //
        //     return tmp;
        //   }).reduce((a, b = 0) => a + b, 0);
        //
        //   const totalItems = Object.keys(itemPerNode[sourceMain] || {}).map(item => itemPerNode[sourceMain][item]).reduce((a, b = 0) => a + b, 0);
        //
        //   console.log("HE WAS", itemPerNode, totalItems, sourceMain);
        //
        //   totalItemThroughput += (totalItems / 60);
        //
        //   let processingType = 1;
        //   if (totalItemThroughput * 60 > totalLinkThroughput[sourceMain]) {
        //     // split proportioanly the totalItemThroughput
        //     console.error("WE HAVE TOO MANY ITEMS DAMMIT!!!", totalItemThroughput * 60, totalLinkThroughput[sourceMain])
        //   } else {
        //     processingType = 0;
        //     console.error("fewer items!!!")
        //     //fill things sequentiually
        //   }
        //
        //
        //
        //   let remainingItemProcessing = totalItemThroughput * 60;
        //   let remainingLinkPairs = linkPairs.filter((link) => link.source === sourceMain).length;
        //   console.error("Starting calc with", remainingItemProcessing, "items", remainingLinkPairs, "pairs", "on", sourceMain);
        //   linkPairs.filter((link) => link.source === sourceMain).forEach(pair => {
        //     const target = pair.target;
        //     const limitedSpeed = pair.speed;
        //
        //     providedThroughput[target] = providedThroughput[target] || [];
        //     if (processingType === 1) {
        //       // split everything
        //       // fraction of this belt of ALL belts:
        //       const fraction = limitedSpeed / (totalLinkThroughput[sourceMain]);
        //       pair.fraction = fraction;
        //       console.error("Processing type 1", limitedSpeed, totalLinkThroughput[sourceMain])
        //     } else {
        //       if (remainingItemProcessing / remainingLinkPairs > limitedSpeed) {
        //         // there will be residuals
        //         const itemsUsed = limitedSpeed;
        //         remainingItemProcessing -= itemsUsed;
        //         const fraction = limitedSpeed / (totalItemThroughput * 60);
        //         pair.fraction = fraction;
        //         console.error("Processing type 2.1", limitedSpeed, totalItemThroughput * 60)
        //       } else {
        //         // no residuals.
        //         const itemsUsed = remainingItemProcessing / remainingLinkPairs;
        //         remainingItemProcessing -= itemsUsed;
        //         const fraction = itemsUsed / (totalItemThroughput * 60);
        //         pair.fraction = fraction;
        //         console.error("Processing type 2.2", itemsUsed, totalItemThroughput * 60)
        //       }
        //     }
        //     console.error("Created one link with fraction", pair.fraction);
        //     remainingLinkPairs -= 1;
        //   });
        //
        //   linkPairs.filter((link) => link.source === sourceMain).forEach(pair => {
        //     const source = pair.source;
        //     const target = pair.target;
        //     const speed = pair.speed;
        //     const foundLink = pair.link;
        //     const fraction = pair.fraction || 1;
        //     const limitedSpeed = speed;
        //
        //     providedThroughput[target] = providedThroughput[target] || [];
        //
        //     console.error("OK HERE IS THE DEBUG", nodeGroupSourceThroughput, linkPairs.filter((link) => link.source === sourceMain));
        //
        //     nodeGroupSourceThroughput.forEach(itemRaw => {
        //       const throughput = JSON.parse(JSON.stringify(itemRaw));
        //       const i = throughput.throughput.item;
        //       //check propagated limited
        //       const maxItemsPerSecLimiter = throughput.maxItemsPerSecLimiter === undefined ? Infinity : throughput.maxItemsPerSecLimiter;
        //
        //       let itemPerSecBeforeBeltLimiting = itemPerNode[sourceMain][i]  * fraction / 60 / (nodeGroupSourceThroughput.filter(item => item.throughput.item ===i)).length;
        //       console.error("???", itemPerNode[sourceMain][i], fraction)
        //       console.log("Here is the limiting thing", itemPerSecBeforeBeltLimiting * 60 * 2)
        //
        //       // need to do some weird math to constrain the items/psec to a PORTION of the belt limited
        //       const limitedItemPerSecByBelt = limitedSpeed / 60;
        //
        //       const beltMaxForThisEntry = limitedItemPerSecByBelt * 60;
        //
        //       throughput.maxItemsPerSecLimiter = itemPerSecBeforeBeltLimiting;
        //       console.log("Here are the prereqs", itemPerSecBeforeBeltLimiting)
        //       console.error("Processing throughput from", source, '->', target, 'quantity: ', 60 * throughput.maxItemsPerSecLimiter, 'fraction:', fraction);
        //       throughput.calculatedItemPerSecond = throughput.maxItemsPerSecLimiter;
        //       throughput.efficiency = Infinity;
        //
        //       foundLink.itemThroughPut = foundLink.itemThroughPut || {};
        //       foundLink.itemThroughPut[i] = foundLink.itemThroughPut[i] || {max: 0, actual: 0};
        //       foundLink.itemThroughPut[i].max +=  (itemPerSecBeforeBeltLimiting / totalItemThroughput) * beltMaxForThisEntry;
        //       foundLink.itemThroughPut[i].actual += itemPerSecBeforeBeltLimiting * 60 * fraction;
        //
        //       providedThroughput[target].push(throughput);
        //     });
        //   })
        // })


        //=========================



        (derivedGraphOutgoing[origin] || []).forEach(outgoingNode => {
          const sources = nodeGroupSource.map(node => node.id);
          const targets = superNodeGraphLookupInflated[outgoingNode].map(node => node.id);

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

              const linkSpeed = foundLink.instance.speed;

              const totalItems = Object.keys(itemPerNode[source] || {}).map(item => itemPerNode[source][item]).reduce((a, b = 0) => a + b, 0);


              Object.keys(itemPerNode[source] || {}).forEach(item => {
                const q = itemPerNode[source][item];
                foundLink.itemThroughPut = foundLink.itemThroughPut || {};
                foundLink.itemThroughPut[item] = foundLink.itemThroughPut[item] || {max: 0, actual: 0};
                foundLink.itemThroughPut[item].max = (q/totalItems * linkSpeed);
                foundLink.itemThroughPut[item].actual += (q  / ((this.nodeOut[source] || []).length || 1));
                foundLink.forceOverwritable = true;
              });


              nodeGroupSource.forEach((node) => {
                const provided = providedThroughput[node.id] || [];


                const provideByItem = {};

                provided.forEach(provide => {
                  const item = provide.throughput.item;
                  provideByItem[item] = provideByItem[item] || [];
                  provideByItem[item].push(provide);
                });

                Object.keys(provideByItem).forEach(item => {
                  const thisProvide = provideByItem[item];
                  const totalCalculated = thisProvide.map(item => item.calculatedItemPerSecond).reduce((a, b = 0) => a + b, 0);

                  thisProvide.forEach(provideRaw => {
                    const provide = JSON.parse(JSON.stringify(provideRaw));

                    const localModifier = provide.calculatedItemPerSecond / totalCalculated;

                    provide.calculatedItemPerSecond = localModifier / 60 * (itemPerNode[source][item]   / ((this.nodeOut[source] || []).length || 1));

                    provide.calculatedItemPerSecond = Math.min(provide.calculatedItemPerSecond, linkSpeed / 60);
                    provide.maxItemsPerSecLimiter = provide.calculatedItemPerSecond;

                    const throughput = provide;
                    const q = throughput.throughput.quantity;
                    const t = throughput.throughput.time;
                    const e = throughput.efficiency;
                    const o = throughput.throughput.overclock;
                    const s = throughput.throughput.speed;

                    const rawCalculation = q / t * e * o * s || 0;

                    if (rawCalculation < provide.calculatedItemPerSecond) {
                      throughput.throughput.overclock = Infinity;
                    }

                    providedThroughput[target] = providedThroughput[target] || [];
                    providedThroughput[target].push(throughput);
                  });
                });
              });

            });
          });

        });


















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
    .force('xAxis', d3.forceX().strength(0.1).x(function(d){return d.initialX || (width/2);}))
    .force('yAxis', d3.forceY().strength(0.5).y(function(d){return d.initialY || (height/2);}));
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