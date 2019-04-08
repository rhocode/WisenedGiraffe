import constants from './constants';
import * as d3 from 'd3';
import {
  addEfficiencyArc,
  addNodeImage,
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
  const reverseTraversal = [];
  while(myTinyQueue.size()) {
    const node = myTinyQueue.pop();

    const thisNodeInflated = superNodeGraphLookupInflated[node];
    const outgoing = Array.from(derivedGraphOutgoing[node] || new Set());
    const outgoingInflated = outgoing.map(item => superNodeGraphLookupInflated[item]);
    reverseTraversal.push(thisNodeInflated);

    const propagateNodeToEdges = (nodeGroupSource, nodeGroupTarget, origin, targets) => {
      //gather this node
      // console.log('Doing queue', nodeGroupSource.map(item=> item.id));

      const nodeGroupSourceThroughput = [];

      if (nodeGroupSource.length === 1) {
        const node = nodeGroupSource[0];
        let throughput = null;
        let efficiency = null;

        const provided = providedThroughput[origin];

        if (node.data.node) {
          // this is a purity calculation
          const recipe = node.data.recipe;
          const purity = node.data.purity;
          const fetchedPurity = recipe.purities.filter(item => item.name === purity);
          if (fetchedPurity.length !== 1) {
            throw new Error('Trying to get purity', purity, 'wtf?');
          }
          const actualPurity = fetchedPurity[0];

          throughput = {quantity: actualPurity.quantity, item: recipe.item.id, time: 60, power: node.instance.power, inputs: []};
          efficiency = 1;
        } else {
          throughput = {quantity: node.data.recipe.quantity, item: node.data.recipe.item.id, time: node.data.recipe.time, power: node.data.recipe.power, inputs: node.data.recipe.inputs.map(elem => {
            return {item: elem.item.id, quantity: elem.quantity};
          })};
          const resources = {};

          const providedSet = new Set();

          provided.forEach(provide => {
            const q = provide.throughput.quantity;
            const t = provide.throughput.time;
            const e = provide.efficiency;
            const i = provide.throughput.item;

            providedSet.add(i);

            const itemPerSec = q/t * e;
            resources[i] = resources[i] || 0;
            resources[i] += itemPerSec * 60;
          });

          const missing = new Set();
          const efficiencies = [Infinity];
          throughput.inputs.forEach(inp => {
            const item = inp.item;
            const quantity = inp.quantity;

            if (!providedSet.has(item)) {
              missing.add(item);
            } else {
              // todo: overclock

              const maxThroughput = (throughput.quantity / throughput.time * 60);

              const expectedThroughput = (resources[item] / quantity) / maxThroughput;
              console.error(resources[item], quantity, maxThroughput, expectedThroughput);
              //TODO: store the overclock percentage!!!!!
              const optimalOverClockPercentage = Math.min(250, expectedThroughput);
              efficiencies.push(Math.min(1, expectedThroughput));
            }
          });

          if (missing.size > 0) {
            efficiency = 0;
          } else {
            efficiency = Math.min(...efficiencies);
          }

          console.log(throughput, efficiency);
        }

        nodeGroupSourceThroughput.push({throughput, efficiency, source: origin});
      } else {
        nodeGroupSource.forEach(node => {
          if (node.machine.name !== 'Container' && node.machine.name !== 'Logistic') {
          } else {
            // node.childProvides = globalProvideMap[origin]  || [];
            // node.childProvides.forEach(provide => {
            //   if (!combinedProvidesSource.has(proBvide.source)) {
            //     combinedProvides.push(provide);
            //     combinedProvidesSource.add(provide.source);
            //   }
            // });
            // node.allowedIn = node.childProvides.map(elem => elem.item.item.id);
            // node.allowedOut = node.childProvides.map(elem => elem.item.item.id);
            // node.containedItems = node.childProvides.map(elem => elem.item.item);
          }
        });
      }

      (derivedGraphOutgoing[origin] || []).forEach(elem => {
        providedThroughput[elem] = providedThroughput[elem] || [];
        nodeGroupSourceThroughput.forEach(item => {
          providedThroughput[elem].push(item);
        });
      });
    };

    propagateNodeToEdges(thisNodeInflated, outgoingInflated, node, outgoing);

    Object.keys(derivedGraphIncoming).forEach(key => {
      const accessor = derivedGraphIncoming[key];
      accessor.delete(parseInt(node, 10));
    });

    myTinyQueue.reheapify();
  }

  // const nodeUnion = new Set(Object.keys(this.nodeIn));
  // Object.keys(this.nodeOut).forEach(node => nodeUnion.add(node));
  // const nodeUnionArray = Array.from(nodeUnion);
  //
  // const nodeLookup = {};
  //
  // nodeUnionArray.forEach((value, index) => {
  //   nodeUnionArray[index] = this.graphData.nodes.filter(elem => elem.id.toString() === value)[0];
  //   nodeLookup[nodeUnionArray[index].id] = nodeUnionArray[index];
  // });
  //
  // const derivedGraph = {};
  //
  // let nodeIndex = 0;
  //
  // const edges = {};
  // const sources = [];
  // const sinks = [];
  // const newNodeLookup = {};
  // nodeUnionArray.forEach(node => {
  //   if (node.machine.name !== 'Container' && node.machine.name !== 'Logistic') {
  //     const inputs = node.data.recipe.inputs;
  //
  //     const inputNodes = [];
  //
  //     const middleNode = nodeIndex++;
  //     const outputNode = nodeIndex++;
  //
  //     // optionally, if it has no inputs? || (this.nodeIn[node.id] || []).length === 0
  //     if (!inputs ) {
  //       // skip the initial source node.
  //       sources.push(middleNode);
  //
  //       //as well as put the right recipe onto this consumption, but i'm pretty sure it's the same as everythinh else
  //       //???
  //       newNodeLookup[node.id] = {inputs: [{target: middleNode, data: null}], outputs: [{target: outputNode, data: null}]}
  //     } else {
  //       // business as usual. link input nodes to middle nodes.
  //       const generatedInputs = inputs.map(inp => {
  //         const input = nodeIndex++;
  //         inputNodes.push(input);
  //         return input;
  //       });
  //
  //       const populatedGeneratedInputs = generatedInputs.map(inp => {
  //         //link the recipe somehow....
  //
  //         // Link middle node to the incoming nodes.
  //         edges[inp] = [{target: middleNode}];
  //         return {target: inp, data: null};
  //       });
  //
  //       newNodeLookup[node.id] = {inputs: populatedGeneratedInputs.slice(), outputs: [outputNode]};
  //     }
  //
  //     console.log(inputNodes, middleNode, outputNode);
  //
  //     // TODO: add the recipe here somehow.
  //     edges[middleNode] = [{target: outputNode}];
  //     const outs = this.nodeOut[node.id] || [];
  //     if (!outs.length) {
  //       sinks.push(outputNode);
  //     }
  //   } else {
  //     if (node.machine.name === 'Container') {
  //
  //
  //
  //       const inputNode = nodeIndex++;
  //       const outputNode = nodeIndex++;
  //
  //
  //       if ((this.nodeIn[node.id] || []).length === 0) {
  //         // Containers are ineligible to be a source
  //         // sources.push(inputNode);
  //       }
  //
  //       const outs = this.nodeOut[node.id] || [];
  //       if (!outs.length) {
  //         sinks.push(outputNode);
  //       } else {
  //         // This has outputs, so let's gooooooo!!!
  //         outs.forEach(out => {
  //
  //         })
  //       }
  //
  //       newNodeLookup[node.id] = {inputs: [{target: inputNode, data: null}], outputs: [{target: outputNode, data: null}]}
  //
  //
  //     } else {
  //       if (node.instance.name === 'Splitter') {
  //
  //       } else if (node.instance.name === 'Merger') {
  //
  //       }
  //     }
  //   }
  //
  // })
  //
  // console.log(sources, sinks, edges);
  //
  //
  // const bfs = (capacities, s, t, parent, outEdges) => {
  //   const visited = new Set();
  //   const q = [];
  //   q.push(s);
  //   visited.add(s);
  //   parent[s] = -1;
  //   while(q.length) {
  //     const u = q.pop();
  //     const outgoing = outEdges[u];
  //     outgoing.forEach(elem => {
  //       // SHOULD ALSO CHECK THE RESIDUALS!!!!
  //       if(!visited.has(elem) && capacities[u][elem]) {
  //         q.push(elem);
  //         visited.add(elem);
  //         parent[elem] = u;
  //       }
  //     });
  //   }
  //
  //   return visited.has(t);
  // };



};
export const initSimulation = () => {
  const bodyEl = document.getElementById('mainRender');

  const width = bodyEl.clientWidth;
  const height = bodyEl.clientHeight;

  console.log(width, height);
  return d3.forceSimulation()
    .force('link', d3.forceLink().id(function (d) {
      return d.id;
    }).distance(50))
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
  addEfficiencyArc(graphNodesEnter, 'overclock', 59, 322);
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

  // insertEdgeLabel.call(this, graphLinksData.selectAll('.' + constants.lineParentObjectClass));

  graphLinksData.selectAll('.' + constants.lineObjectClass)
    .each(function (d) {
      d.source.vx += k;
      d.target.vx -= k;
    });
};

//
// addResourceIcon(parentElement) {
//   const s = this.structures;
//   const requirements = parentElement.datum().requires ? parentElement.datum().requires.length : 0;
//   for (let i = 0; i < requirements; i++) {
//     //Text First
//     const input = parentElement.append('text').text(function (d) {
//       const resource = s.ITEMS.get[d.requires[i].resource];
//
//       return resource.name;
//     })
//     .attr('y', function (d) {
//       return 65 + (20 * i);
//     })
//     .attr('x', function (d) {
//       return 15 / 2;
//     });
//     const bound = input.node().getBBox();
//
//     parentElement.append('svg:image')
//     .attr('class', function (d) {
//       if (d.machine && d.machine.icon) {
//         return 'machine-icon';
//       }
//       return 'dev-icon';
//     })
//     .attr('xlink:href', function (d) {
//       const resource = s.ITEMS.get[d.requires[i].resource];
//       if (resource && resource.icon) {
//         return resource.icon;
//       }
//       return 'https://i.imgur.com/oBmfK3w.png';
//     })
//     .attr('x', function (d) {
//       return bound.x - 15;
//     })
//     .attr('y', function (d) {
//       return bound.y + 1;
//     })
//     .attr('height', 15)
//     .attr('width', 15);
//   }
//
//   // ========================
//   //Text First
//   if (requirements == 0) {
//     const input = parentElement.append('text').text(function (d) {
//       // const resource = s.ITEMS.get[d.requires[i].resource];
//       return round(60 / d.produces.time * d.produces.quantity) + '/min';
//       // return resource.name;
//     })
//     .attr('y', function (d) {
//       return 65;
//     })
//     .attr('x', function (d) {
//       return 15 / 2;
//     });
//     const input_bound = input.node().getBBox();
//
//     parentElement.append('svg:image')
//     .attr('class', function (d) {
//       if (d.machine && d.machine.icon) {
//         return 'machine-icon';
//       }
//       return 'dev-icon';
//     })
//     .attr('xlink:href', function (d) {
//       const resource = s.ITEMS.get[d.produces.name];
//       if (resource && resource.icon) {
//         return resource.icon;
//       }
//       return 'https://i.imgur.com/oBmfK3w.png';
//     })
//     .attr('x', function (d) {
//       return input_bound.x - 15;
//     })
//     .attr('y', function (d) {
//       return input_bound.y + 1;
//     })
//     .attr('height', 15)
//     .attr('width', 15);
//   }
// //===================================