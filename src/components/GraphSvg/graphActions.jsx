import constants from './constants';
import * as d3 from 'd3';
import {
  addEfficiencyArc,
  addNodeImage,
  editEfficiencyArc,
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
import {calculateLabelPositions, insertEdgeLabel, pathMouseClick, recalculateStorageContainers} from './edgeActions';
import {strongly_connected_components_standalone} from './algorithms';
import TinyQueue from '../TinyQueue';
import {useExperimentalFeature} from './util';
import React from 'react';


const isMiner = (node) => {
  return node.data.node;
};

const isSplitter = (node) => {
  return node.machine.name === 'Logistic' && node.instance.name === 'Splitter';
};

const isMerger = (node) => {
  return node.machine.name === 'Logistic' && node.instance.name === 'Merger';
};

const isContainer = (node) => {
  return node.machine.name === 'Container';
};

const calculateBaseNodeThroughput = (throughput) => {
  return (throughput.quantity / throughput.time) * 60 * throughput.speed;
};

const calculateActualThroughput = (throughput) => {
  return calculateBaseNodeThroughput(throughput) * throughput.overclock;
};

const getLink = (links, source, target) => {
  const link = links.filter(link => link.source.id === source.id && link.target.id === target.id);
  if (link && link.length === 1) {
    return link[0];
  } else if (link && link.length > 1) {
    throw new Error(`Too many links found for ${source.id}, ${target.id}`);
  } else {
    throw new Error(`No links found for ${source.id}, ${target.id}`);
  }
};

const duplicateGraphAdjacencyList = (graph) => {
  const baseObject = {};
  Object.keys(graph).forEach(key => {
    const arr = Array.from(graph[key]);
    baseObject[key] = new Set(arr);
  });

  return baseObject;
};

const calculateAbsoluteMaxNodeThroughput = (throughput) => {
  return calculateBaseNodeThroughput(throughput) * 2.5;
};

const simplifyPool = (poolToChange, outputPool, replacement) => {
  Object.keys(poolToChange).forEach(pool => {
    const transformation = poolToChange[pool].map(item => {
      if (outputPool.includes(item)) {
        return replacement;
      }
      return item;
    });
    poolToChange[pool] = Array.from(new Set(transformation));
  });
};


const poolCalculation = (blobOrder, blobToNodes, blobIncoming, blobOutgoing) => {
  let newPoolIndex = 0;
  const poolLookupOutputs = {};
  const poolLookupInputs = {};
  const poolLookup = {};

  blobOrder.forEach(blob => {
    let inputPool = null;
    let outputPool = poolLookup[blob] || [];
    if (outputPool.length > 1) {
      const realOutputPool = Math.min(...outputPool);
      outputPool.forEach(pool_number => {
        if (pool_number !== realOutputPool) {
          simplifyPool(poolLookup, outputPool, realOutputPool);
          simplifyPool(poolLookupInputs, outputPool, realOutputPool);
          simplifyPool(poolLookupOutputs, outputPool, realOutputPool);
        }
      });
      outputPool =  poolLookup[blob]; // refresh outputool
    } else if (outputPool.length === 0) {
      outputPool = [newPoolIndex++];
    }

    const nodes = blobToNodes[blob];
    inputPool = outputPool[0];

    if (nodes.length === 1) {
      const node = nodes[0];
      if (isMiner(node)) {
        poolLookupOutputs[blob] = poolLookupOutputs[blob] || [];
        poolLookupOutputs[blob].push(outputPool[0]);
      } else if ((blobIncoming[blob] || []).length === 0) {
        poolLookupOutputs[blob] = poolLookupOutputs[blob] || [];
        poolLookupOutputs[blob].push(outputPool[0]);
      } else if ((blobOutgoing[blob] || []).length === 0) {
        poolLookupInputs[blob] = poolLookupInputs[blob] || [];
        poolLookupInputs[blob].push(outputPool[0]);
      } else if (isSplitter(node)) {
      } else if (isMerger(node)) {
      } else if (isContainer(node)) {
      } else { // it's a machine node
        inputPool = newPoolIndex++;
        poolLookupInputs[blob] = poolLookupInputs[blob] || [];
        poolLookupInputs[blob].push(inputPool);
        poolLookupOutputs[blob] = poolLookupOutputs[blob] || [];
        poolLookupOutputs[blob].push(outputPool[0]);
      }
    }

    (blobIncoming[blob] || []).forEach(incomingBlob => {
      poolLookup[incomingBlob] = poolLookup[incomingBlob] || [];
      poolLookup[incomingBlob].push(inputPool);
    });
  });

  const outputs = Object.keys(poolLookupOutputs).map(i =>poolLookupOutputs[i]).flat(1);
  const inputs = Object.keys(poolLookupInputs).map(i =>poolLookupInputs[i]).flat(1);
  const commonalities = Array.from(new Set(outputs.filter(output => {
    return inputs.includes(output);
  })));

  const sources ={};

  Object.keys(poolLookupOutputs).forEach(input => {
    Array.from(new Set((poolLookupOutputs[input] || []))).forEach(item => {
      if (commonalities.includes(item)) {
        sources[input] = item;
      }
    });
  });

  const sinks ={};

  Object.keys(poolLookupInputs).forEach(input => {
    Array.from(new Set((poolLookupInputs[input] || []))).forEach(item => {
      if (commonalities.includes(item)) {
        sinks[input] = item;
      }
    });
  });

  return {sources: sources, sinks: sinks, pools: commonalities, poolOutputs: poolLookupOutputs, poolInputs: poolLookupInputs, poolLookup};
};

//************ Splitter Calc
const greatestCommonDivisor = (a, b) => {
  if (b === 0)
    return a;
  else
    return greatestCommonDivisor(b, a % b);
};

const gcf = (list) => {
  return list.reduce(greatestCommonDivisor);
};

const leastCommonFactor = (a, b) => {
  return a * b / greatestCommonDivisor(a, b)
};

const lcms = (list) => {
  return list.reduce(leastCommonFactor);
};

const reduceRatio = (ratioList => {
  const denominator = gcf(ratioList);
  return  denominator.reduce(i => i/denominator);
});

const splitList = (list) => {
  const halfLength = Math.round(list.length / 2);
  return [list.slice(0, halfLength), list.slice(halfLength)]
};

const splitterCalculator = (inputSpeed, outputsSpeed) => {
  let belt = 1;
  let blocked = [0, 0, 0];

  const beltOutputReciprocal = outputsSpeed.map(i => i === 0 ? Infinity : 60/i);

  const timeScale = 60 / inputSpeed;
  const usedItems = outputsSpeed.filter(i => i);
  const scaleMultiplier = lcms([...usedItems, inputSpeed]);

  const sums  = {0: 0, 1: 0, 2: 0};
  let i = 0;
  let itemsProcessed = 0;
  let beltStuckCount = 0;
  // const timeList = [];
  const checkedSequence = [];
  let readyToCheck = false;
  const usedItemsLength = usedItems.length;
  while(true) {
    let lastBeltUsed = -1;
    let time = Math.round(i * timeScale * scaleMultiplier);
    let beltChanged = false;

    for (let i = 0; i < usedItemsLength; i++) {
      if (outputsSpeed[belt]) {
        const isBeltBlocked = blocked[belt] > time;

        if (!isBeltBlocked) {
          blocked[belt] = time + Math.round(beltOutputReciprocal[belt] * scaleMultiplier)
          sums[belt] += 1;
          // print("Belt %d is unlocked, pushing. Next time is %d" %(belt, blocked[belt]), end =" ")
          lastBeltUsed = belt;
          belt = (belt + 1) % 3;
          itemsProcessed += 1;
          beltChanged = true;
          break;
        }
      }

      belt = (belt + 1) % 3;
    }

    if (!beltChanged) {
      beltStuckCount += 1;
    }

    if (i >= usedItemsLength) {
      checkedSequence.push(lastBeltUsed);
      // timeList.push(time);
    }

    if (i >= usedItemsLength) {
      if (!readyToCheck) {
        readyToCheck = Object.values(sums).map(i =>
          i >= 2
        ).every(i => i);
      }

      if (readyToCheck && checkedSequence.length % 2 !== 1) {
        const [left, right] = splitList(checkedSequence);

        if (JSON.stringify(left) === JSON.stringify(right)) {
          i+= 1;
          break
        }
      }
    }
    i += 1;
  }

  i -= 1;

  const [left, right] = splitList(checkedSequence);

  return {
    timeScale, sequence: left
  }
};

const beltOutputs = [60, 120, 270];
const beltInputs = 450;

splitterCalculator(beltInputs, beltOutputs);


//************************** end splitter calcs


const bfs = (source, target, parent, adjacency, capacity) => {
  parent[source] = -2;
  const queue = [];
  queue.push([source, Infinity]);

  while(!queue.length) {
    const item = queue.pop();
    const cur = item[0];
    const flow = item[1];
    adjacency[cur].forEach(next => {
      if (parent[next] === -1 && capacity[cur][next]) {
        parent[next] = cur;
        const new_flow = Math.min(flow, capacity[cur][next]);
        if (next === target) {
          return new_flow;
        }
        queue.push([next, new_flow]);
      }
    });
  }

  return 0;
};

const experimentalPropagation = (source, target, edgeCapacities, blobOrder, reverseBlobOrder, blobToNodes, demandByBlob, poolData, linksByBlob) => {

  const produceQuantityByBlob = {};

  blobOrder.forEach(blob => {

    const outgoingLinks = linksByBlob[blob] || [];

    const nodes = blobToNodes[blob];
    const throughputDemand = demandByBlob[blob] || {};
    const thisPool = poolData.sinks[blob] || poolData.sources[blob] || ((poolData.poolLookup[blob] || []).length ? poolData.poolLookup[blob][0] : null);

    let throughput = {};

    if (nodes.length === 1) {
      const node = nodes[0];
      const nodeSpeed = node.instance.speed / 100;
      const overclock = node.overclock / 100;

      if (isMiner(node)) {
        // this is a purity calculation (aka miner or pump)
        const recipe = node.data.recipe;
        const purity = node.data.purity;
        const fetchedPurity = recipe.purities.filter(item => item.name === purity);

        if (fetchedPurity.length !== 1) {
          throw new Error('Trying to get purity' + purity + 'but none found');
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

        const actualThroughput = calculateActualThroughput(throughput);

        outgoingLinks.forEach(link => {
          const { source, target, sourceBlob, targetBlob } = link;
          produceQuantityByBlob[targetBlob] = produceQuantityByBlob[targetBlob] || [];
          produceQuantityByBlob[targetBlob].push({throughput: actualThroughput, item: throughput.item});
        });

      } else if (isSplitter(node)) {
      } else if (isMerger(node)) {
      } else if (isContainer(node)) {
        outgoingLinks.forEach(link => {
          const { source, target, sourceBlob, targetBlob } = link;
          const propagatedThroughput = produceQuantityByBlob[sourceBlob] || [];

          produceQuantityByBlob[targetBlob] = produceQuantityByBlob[targetBlob] || [];

          propagatedThroughput.forEach(throughput => {
            produceQuantityByBlob[targetBlob].push(throughput);
          });

        });
      } else { // it's a machine node
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

        const actualThroughput = Math.min(calculateActualThroughput(throughput), (throughputDemand[throughput.item] || {actual: Infinity}).actual);

        throughput.inputs.forEach(input => {
          const item = input.item;
          const quantity = input.quantity;

          let throughputActualNeeded = actualThroughput * (quantity / throughput.quantity);

          const throughputMaxNeeded = maxThroughput * (quantity / throughput.quantity);
          inputsBase[item] = inputsBase[item] || 0;
          inputsMaxSpeed[item] = inputsMaxSpeed[item] || 0;
          inputsBase[item] += throughputActualNeeded;
          inputsMaxSpeed[item] += throughputMaxNeeded;
        });
      }
    } else {
      // it's a cycle
    }

  });
};

const maxFlow = (source, target, edgeCapacities) => {
  let flow = 0;
  const parent = {};
  let new_flow = null;
  const capacities = {};

  new_flow = bfs(source, target, parent);
  while(new_flow) {
    flow += new_flow;
    let cur = target;
    while(cur !== source) {
      const prev  = parent[cur];
      capacities[prev][cur] -= new_flow;
      capacities[cur][prev] += new_flow;
      cur = prev;
    }
    new_flow = bfs(source, target, parent);
  }

  return flow;
};

const demandCalculation = (blobOrder, blobToNodes, blobIncoming, blobOutgoing, graphLinks)  => {
  const demandByBlob = {};
  const edgeCapacities = {};

  const poolData = poolCalculation(blobOrder, blobToNodes, blobIncoming, blobOutgoing);

  blobOrder.forEach(blob => {

    const nodes = blobToNodes[blob];
    const throughputDemand = demandByBlob[blob] || {};

    console.log('Processing', blob, throughputDemand, nodes.map(item => item.id));

    let inputsBase = {};
    let inputsMaxSpeed = {};

    if (nodes.length === 1) {
      const node = nodes[0];
      const nodeSpeed = node.instance.speed / 100;
      const overclock = node.overclock / 100;
      let throughput = null;
      if (isMiner(node)) {
        // NoOp?
      } else if (isSplitter(node)) {
        Object.keys(throughputDemand).forEach(key => {
          inputsBase[key] = ((throughputDemand[key] || {}).actual || Infinity);
          inputsMaxSpeed[key] = ((throughputDemand[key] || {}).max || Infinity);
        });
      } else if (isMerger(node)) {
        Object.keys(throughputDemand).forEach(key => {
          inputsBase[key] = ((throughputDemand[key] || {}).actual || Infinity);
          inputsMaxSpeed[key] = ((throughputDemand[key] || {}).max || Infinity);
        });
      } else if (isContainer(node)) {
        Object.keys(throughputDemand).forEach(key => {
          inputsBase[key] = ((throughputDemand[key] || {}).actual || Infinity);
          inputsMaxSpeed[key] = ((throughputDemand[key] || {}).max || Infinity);
        });
      } else { // it's a machine node
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

        const actualThroughput = Math.min(calculateActualThroughput(throughput), (throughputDemand[throughput.item] || {actual: Infinity}).actual);
        const maxThroughput = calculateAbsoluteMaxNodeThroughput(throughput);

        throughput.inputs.forEach(input => {
          const item = input.item;
          const quantity = input.quantity;

          let throughputActualNeeded = actualThroughput * (quantity / throughput.quantity);

          const throughputMaxNeeded = maxThroughput * (quantity / throughput.quantity);
          inputsBase[item] = inputsBase[item] || 0;
          inputsMaxSpeed[item] = inputsMaxSpeed[item] || 0;
          inputsBase[item] += throughputActualNeeded;
          inputsMaxSpeed[item] += throughputMaxNeeded;
        });
      }

      (blobIncoming[blob] || []).forEach(incomingBlob => {
        // TODO - Optimize: is it expensive to load the nodes? Or should we just load the indexes instead
        const sources = blobToNodes[incomingBlob];
        const targets = blobToNodes[blob];
        sources.forEach(source => {
          targets.forEach(target => {
            try {
              const link = getLink(graphLinks, source, target);
              demandByBlob[incomingBlob] = demandByBlob[incomingBlob] || {};
              const totalItemsActual = Object.keys(inputsBase).map(key => inputsBase[key]).reduce((a, b = 0) => a + b, 0);
              const totalItemsActualMax = Object.keys(inputsMaxSpeed).map(key => inputsMaxSpeed[key]).reduce((a, b = 0) => a + b, 0);
              let actualIsFraction = false;
              let maxIsFraction = false;
              const speed = link.instance.speed;

              if (speed < totalItemsActual) {
                actualIsFraction = true;
              }

              if (speed < totalItemsActualMax) {
                maxIsFraction = true;
              }

              if (Object.keys(inputsBase).length === 0) {
                edgeCapacities[source.id] = edgeCapacities[source.id] || {};
                edgeCapacities[source.id][target.id] = speed;
              }

              Object.keys(inputsBase).forEach(itemKey => {

                demandByBlob[incomingBlob][itemKey] = demandByBlob[incomingBlob][itemKey] || {actual: 0, max: 0};
                if (actualIsFraction) {
                  edgeCapacities[source.id] = edgeCapacities[source.id] || {};
                  edgeCapacities[source.id][target.id] = edgeCapacities[source.id][target.id] || 0;
                  const addition = ((inputsBase[itemKey]  * speed) / totalItemsActual);

                  demandByBlob[incomingBlob][itemKey].actual += addition;
                  edgeCapacities[source.id][target.id] += addition;
                } else {
                  edgeCapacities[source.id] = edgeCapacities[source.id] || {};
                  edgeCapacities[source.id][target.id] = edgeCapacities[source.id][target.id] || 0;
                  const addition = inputsBase[itemKey];

                  demandByBlob[incomingBlob][itemKey].actual += addition;
                  edgeCapacities[source.id][target.id] += addition;
                }

                if (maxIsFraction) {
                  demandByBlob[incomingBlob][itemKey].max += ((inputsMaxSpeed[itemKey] * speed) /  totalItemsActualMax);
                } else {
                  demandByBlob[incomingBlob][itemKey].max += inputsMaxSpeed[itemKey];
                }
              });
            } catch (err) {
              console.error(err);
              //no-op
            }
          });
        });
      });

    } else {
      // copy over cycle code
    }
  });
  return {poolData, edgeCapacities, demandByBlob};
};



const processPool = function(blobOrder, reverseBlobOrder, sourceBlobs, sinkBlobs, blobToNodes, blobOutgoing, graphLinks, poolData, edgeCapacities, demandByBlob) {

  const masterEdgeCapacities = {};
  const linksByBlob = {};
  blobOrder.forEach(blob => {
    (blobOutgoing[blob] || []).forEach(outgoingBlob => {
      if (sinkBlobs.indexOf(blob) !== -1) {
        return;
      }

      const sources = blobToNodes[blob];
      const targets = blobToNodes[outgoingBlob];
      linksByBlob[blob] = linksByBlob[blob] || [];
      sources.forEach(source => {
        targets.forEach(target => {
          try {
            getLink(graphLinks, source, target);

            const edgeAccessor = edgeCapacities[source.id] || {};
            const edgeWeight = !edgeAccessor[target.id] && edgeAccessor[target.id] !== 0 ? Infinity : edgeAccessor[target.id];

            if (!edgeAccessor[target.id] && edgeAccessor[target.id] !== 0) {
              console.error('There is a problem!!!', edgeAccessor[target.id], JSON.stringify(edgeAccessor, null, 4), target.id);
            }

            masterEdgeCapacities[source.id] = masterEdgeCapacities[source.id] || {};
            masterEdgeCapacities[source.id][target.id] = edgeWeight;


            linksByBlob[blob].push({source, target, sourceBlob: blob, targetBlob: outgoingBlob, edgeWeight});
              // Math.min(throughputUsed, edgeWeight);
          } catch (err) {
            //noOp
            console.log(err)
          }
        });
      });

      // console.log(blob, nodes.map(i => i.id), 'going out to blob', outgoingBlob, blobToNodes[outgoingBlob].map(i => i.id));
    });


  });
  // console.error(masterEdgeCapacities);
  experimentalPropagation(sourceBlobs, sinkBlobs, masterEdgeCapacities, blobOrder, reverseBlobOrder, blobToNodes, demandByBlob, poolData, linksByBlob);
  // console.error(sourceBlobs.map(i => blobToNodes[i][0].id), sinkBlobs.map(i => blobToNodes[i][0].id))
  // maxFlow(masterSource, masterSink, masterEdgeCapacities);
};



const processPoolOriginal = function(blobOrder, reverseBlobOrder, sourceBlobs, sinkBlobs, blobToNodes, blobOutgoing, graphLinks, poolData, edgeCapacities, demandByBlob) {

  const masterSource = -1000;
  const masterSink = -2000;

  const masterEdgeCapacities = {};

  // Connect sources
  sourceBlobs.forEach(blob => {
    const nodes = blobToNodes[blob];
    nodes.forEach(node => {
      masterEdgeCapacities[masterSource] = masterEdgeCapacities[masterSource] || {};
      masterEdgeCapacities[masterSource][node.id] = Infinity;
    });
  });

  // Connect sinks
  sinkBlobs.forEach(blob => {
    const nodes = blobToNodes[blob];
    nodes.forEach(node => {
      masterEdgeCapacities[node.id] = masterEdgeCapacities[node.id] || {};
      masterEdgeCapacities[node.id][masterSink] = Infinity;
    });
  });

  blobOrder.forEach(blob => {
    const nodes = blobToNodes[blob];
    const throughputDemand = demandByBlob[blob] || {};
    const thisPool = poolData.sinks[blob] || poolData.sources[blob] || ((poolData.poolLookup[blob] || []).length ? poolData.poolLookup[blob][0] : null);

    let throughputUsed = Infinity;
    let throughput = {};

    if (nodes.length === 1) {
      const node = nodes[0];
      const nodeSpeed = node.instance.speed / 100;
      const overclock = node.overclock / 100;

      if (isMiner(node)) {
        // this is a purity calculation (aka miner or pump)
        const recipe = node.data.recipe;
        const purity = node.data.purity;
        const fetchedPurity = recipe.purities.filter(item => item.name === purity);

        if (fetchedPurity.length !== 1) {
          throw new Error('Trying to get purity' + purity + 'but none found');
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

        throughputUsed = calculateActualThroughput(throughput);

      } else if (isSplitter(node)) {
      } else if (isMerger(node)) {
      } else if (isContainer(node)) {
      } else { // it's a machine node
        // throughput = {
        //   speed: nodeSpeed,
        //   overclock,
        //   quantity: node.data.recipe.quantity,
        //   item: node.data.recipe.item.id,
        //   time: node.data.recipe.time,
        //   power: node.data.recipe.power,
        //   inputs: node.data.recipe.inputs.map(elem => {
        //     return {item: elem.item.id, quantity: elem.quantity};
        //   })
        // };
      }
    } else {
      // it's a cycle
    }

    (blobOutgoing[blob] || []).forEach(outgoingBlob => {
      if (sinkBlobs.indexOf(blob) !== -1) {
        return;
      }

      const sources = blobToNodes[blob];
      const targets = blobToNodes[outgoingBlob];
      sources.forEach(source => {
        targets.forEach(target => {
          try {
            getLink(graphLinks, source, target);

            const edgeAccessor = edgeCapacities[source.id] || {};
            const edgeWeight = !edgeAccessor[target.id] && edgeAccessor[target.id] !== 0 ? Infinity : edgeAccessor[target.id];

            if (!edgeAccessor[target.id] && edgeAccessor[target.id] !== 0) {
              console.error('There is a problem!!!', edgeAccessor[target.id], JSON.stringify(edgeAccessor, null, 4), target.id);
            }

            masterEdgeCapacities[source.id] = masterEdgeCapacities[source.id] || {};
            masterEdgeCapacities[source.id][target.id] = Math.min(throughputUsed, edgeWeight);
          } catch (err) {
            //noOp
          }
        });
      });

      // console.log(blob, nodes.map(i => i.id), 'going out to blob', outgoingBlob, blobToNodes[outgoingBlob].map(i => i.id));
    });


  });
  // experimentalPropagation(masterSource, masterSink, masterEdgeCapacities);
  // maxFlow(masterSource, masterSink, masterEdgeCapacities);
};

const forwardPropagation = function (blobOrder, reverseBlobOrder, blobToNodes, blobOutgoing, graphLinks, poolData, edgeCapacities, demandByBlob) {
  const poolsVisited = new Set();
  const blobSources = new Set(Object.keys(poolData.sources));
  const blobSinks = new Set(Object.keys(poolData.sinks));

  blobOrder.forEach(blob => {
    const thisPool = poolData.sinks[blob];
    if (blobSinks.has(blob) && !poolsVisited.has(thisPool)) {
      poolsVisited.add(thisPool);
      const subBlobOrder = blobOrder.filter(subBlob => {
        return ((poolData.poolLookup[subBlob] || []).length && thisPool === poolData.poolLookup[subBlob][0])
          || thisPool === poolData.sinks[subBlob] || thisPool === poolData.sources[subBlob];
      });

      const reverseSubBlobOrder = reverseBlobOrder.filter(subBlob => {
        return ((poolData.poolLookup[subBlob] || []).length && thisPool === poolData.poolLookup[subBlob][0])
          || thisPool === poolData.sinks[subBlob] || thisPool === poolData.sources[subBlob];
      });

      const subBlobSources = blobOrder.filter(subBlob => {
        return thisPool === poolData.sources[subBlob];
      });

      const subBlobSinks = blobOrder.filter(subBlob => {
        return thisPool === poolData.sinks[subBlob];
      });

      processPool(subBlobOrder, reverseSubBlobOrder, subBlobSources, subBlobSinks, blobToNodes, blobOutgoing, graphLinks, poolData, edgeCapacities, demandByBlob);
    }
  });
};

export const analyzeGraph = function (optimize=false) {

  // Item lookup map
  const itemLookup = {};
  this.props.parentAccessor.state.recipe.item.forEach(item => {
    itemLookup[item.id] = item.icon;
  });

  const nodeUnion = new Set(Object.keys(this.nodeIn));
  Object.keys(this.nodeOut).forEach(node => nodeUnion.add(node));
  const nodeUnionArray = Array.from(nodeUnion);
  const nodeLookup = {};

  nodeUnionArray.forEach((nodeIndex, index) => {
    nodeUnionArray[index] = this.graphData.nodes.filter(elem => elem.id.toString() === nodeIndex)[0];
    nodeLookup[nodeIndex] = nodeUnionArray[index];

  });
  const nodeOutSets = {};
  Object.keys(this.nodeOut).forEach(key => {
    const value = this.nodeOut[key];
    nodeOutSets[key] = new Set(value.map(elem => elem.id.toString()));
  });

  const componentsList = strongly_connected_components_standalone(nodeOutSets);
  const blobs = {};
  const nodeToBlobIndex = {};
  const blobToNodes = {};

  componentsList.forEach((list, index) => {
    blobs[index] = list;
    (list  || []).forEach(item => {
      nodeToBlobIndex[item] = index;
    });
    blobToNodes[index] = list.map(id => nodeLookup[id]);
  });

  // Derive a graph from this new info
  const deriveBlobGraph = (nodeDictSource, outputData, copiedData = {}) => {
    Object.keys(nodeDictSource).forEach(node => {
      const ids = nodeDictSource[node].map(item => item.id);
      const blobIndex = nodeToBlobIndex[node];
      outputData[blobIndex] = outputData[blobIndex] || new Set();
      const blobGraphAccessor = outputData[blobIndex];

      copiedData[blobIndex] = copiedData[blobIndex] || new Set();
      const blobGraphAccessorCopy = copiedData[blobIndex];

      ids.forEach(id => {
        const thisBlobIndex = nodeToBlobIndex[id];
        if (thisBlobIndex !== blobIndex)
          blobGraphAccessor.add(thisBlobIndex);
        blobGraphAccessorCopy.add(thisBlobIndex);
      });
    });
  };

  const immutableBlobGraphOutgoing = {};

  deriveBlobGraph(this.nodeOut, immutableBlobGraphOutgoing);
  let mutableBlobGraphOutgoing = duplicateGraphAdjacencyList(immutableBlobGraphOutgoing);


  const immutableBlobGraphIncoming = {};
  deriveBlobGraph(this.nodeIn, immutableBlobGraphIncoming);
  let mutableBlobGraphIncoming = duplicateGraphAdjacencyList(immutableBlobGraphIncoming);

  // Creates a topological queue to pull from. Each blob contains one or more nodes.

  // Housekeeping nodes
  this.graphData.nodes.forEach(node => {
    clearNodeState(node);
    node.itemIconLookup = itemLookup;
  });

  // Housekeeping edges
  this.graphData.links.forEach(link => {
    clearEdgeState(link);
    link.itemIconLookup = itemLookup;
  });

  const blobTopologicalSort = [];

  const topologicalQueue = new TinyQueue(Array.from(new Set([...Object.keys(mutableBlobGraphOutgoing), ...Object.keys(mutableBlobGraphIncoming)])), (a, b) => {
    return (mutableBlobGraphIncoming[a] || new Set()).size - (mutableBlobGraphIncoming[b] || new Set()).size;
  });

  while (topologicalQueue.size()) {
    const blobNode = topologicalQueue.pop();
    blobTopologicalSort.push(blobNode);

    Object.keys(mutableBlobGraphIncoming).forEach(key => {
      const accessor = mutableBlobGraphIncoming[key];
      accessor.delete(parseInt(blobNode, 10));
    });

    topologicalQueue.reheapify();
  }

  const reverseBlobTopologicalSort = [];

  mutableBlobGraphOutgoing = duplicateGraphAdjacencyList(immutableBlobGraphOutgoing);
  mutableBlobGraphIncoming = duplicateGraphAdjacencyList(immutableBlobGraphIncoming);

  const reverseTopologicalQueue = new TinyQueue(Array.from(new Set([...Object.keys(mutableBlobGraphOutgoing), ...Object.keys(mutableBlobGraphIncoming)])), (a, b) => {
    return (mutableBlobGraphOutgoing[a] || new Set()).size - (mutableBlobGraphOutgoing[b] || new Set()).size;
  });

  while (reverseTopologicalQueue.size()) {
    const blobNode = reverseTopologicalQueue.pop();
    reverseBlobTopologicalSort.push(blobNode);

    Object.keys(mutableBlobGraphOutgoing).forEach(key => {
      const accessor = mutableBlobGraphOutgoing[key];
      accessor.delete(parseInt(blobNode, 10));
    });

    reverseTopologicalQueue.reheapify();
  }

  const {poolData, edgeCapacities, demandByBlob} = demandCalculation(reverseBlobTopologicalSort, blobToNodes, immutableBlobGraphIncoming, immutableBlobGraphOutgoing, this.graphData.links);
  forwardPropagation(blobTopologicalSort, reverseBlobTopologicalSort, blobToNodes, immutableBlobGraphOutgoing, this.graphData.links, poolData, edgeCapacities, demandByBlob);
};

const clearEdgeState = (link) => {
  delete link.itemThroughPut;
  delete link.tempIndex;
  delete link.forceOverwritable;
};

const clearNodeState = (node) => {
  delete node.efficiency;
  delete node.itemThroughPut;
  delete node.itemsPerMinute;
  delete node.internalError;
};

export const analyzeGraph2 = function (optimize=false) {
  const nodeUnion = new Set(Object.keys(this.nodeIn));
  Object.keys(this.nodeOut).forEach(node => nodeUnion.add(node));
  const nodeUnionArray = Array.from(nodeUnion);

  const nodeLookup = {};

  nodeUnionArray.forEach((value, index) => {
    nodeUnionArray[index] = this.graphData.nodes.filter(elem => elem.id.toString() === value)[0];
    nodeLookup[nodeUnionArray[index].id] = nodeUnionArray[index];
    nodeUnionArray[index].childProvides = [];
    nodeUnionArray[index].hasSources = new Set();
    if (!nodeUnionArray[index].infiniteSource) {
      nodeUnionArray[index].containedItems = [];
    }

    if (nodeUnionArray[index].machine.name !== 'Container' && nodeUnionArray[index].machine.name !== 'Logistic') {
    } else {
      nodeUnionArray[index].allowedIn = [];
      if (!nodeUnionArray[index].infiniteSource) {
        nodeUnionArray[index].allowedOut = [];
      }

    }
  });

  const nodeOutWithSets = {};
  Object.keys(this.nodeOut).forEach(key => {
    const value = this.nodeOut[key];
    nodeOutWithSets[key] = new Set(value.map(elem => elem.id.toString()));
  });

  const componentsList = strongly_connected_components_standalone(nodeOutWithSets);
  const superNodeGraphLookup = {};
  this.singleToGroupNodeLookup = {};
  const superNodeGraphLookupInflated = {};
  const lookupArray = {};
  componentsList.forEach((list, index) => {
    superNodeGraphLookup[index] = list;
    (list  || []).forEach(item => {
      this.singleToGroupNodeLookup[item] = index;
    });

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
    return (derivedGraphIncoming[a] || new Set()).size - (derivedGraphIncoming[b] || new Set()).size;
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
      if (useExperimentalFeature('forceRecalculate')) {
        const workaroundHack = this.props.parentAccessor.state.recipe.recipe.filter(rec => rec.id === node.data.recipe.id);
        const nodeWorkaround = this.props.parentAccessor.state.machine_node.machine_node.filter(rec => rec.id === node.instance.id);

        if (workaroundHack.length > 0) {
          node.data.recipe = workaroundHack[0];
          console.log('Replaced recipe', workaroundHack[0]);
        }
        if (nodeWorkaround.length > 0) {
          node.instance = nodeWorkaround[0];
          console.log('Replaced node', nodeWorkaround[0]);
        }

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


  while (myTinyQueue.size()) {
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
          // this is a purity calculation (aka miner or pump)
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
          nodeGroupSourceThroughput.push({throughput, efficiency, source: origin});

          nodeGroupSource.forEach(node => {
            node.efficiency = efficiency;
            node.itemsPerMinute = {[throughput.item]: maxThroughput};
            node.optimumOverclock = 2.5;
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
          if (node.infiniteSource) {
            let maxThroughput = 0;
            let localThroughput = 0;
            (node.allowedOut || []).forEach(itemid => {
              throughput = {
                speed: 1,
                overclock: 1,
                quantity: node.quantityPerInfinite || 0,
                item: itemid,
                time: node.timePerInfinite || 1,
                power: 0,
                inputs: []
              };
              efficiency = 1;

              localThroughput = (throughput.quantity / throughput.time) * 60;
              maxThroughput += localThroughput;
              nodeGroupSourceThroughput.push({throughput, efficiency, source: origin});
            });

            const itemsPerMinute = {};
            const itemThroughPut = {};
            nodeGroupSourceThroughput.forEach(item => {
              itemThroughPut[item.throughput.item] = {max: localThroughput, actual: localThroughput};
              itemsPerMinute[item.throughput.item] = localThroughput;
            });

            nodeGroupSource.forEach(node => {
              node.efficiency = efficiency;
              node.itemsPerMinute = itemsPerMinute;
              node.optimumOverclock = 1.0;
              // Comment this out if we should remove the display from nodes
              node.itemThroughPut = itemThroughPut;
            });
          } else {
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
          }
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
          const overclocks = [2.5];

          const throughputWithoutOverclock = (throughput.quantity / throughput.time) * 60 * node.instance.speed / 100;

          throughput.inputs.forEach(inp => {
            const item = inp.item;
            const quantity = inp.quantity;
            const providedQuantity = resources[item] || 0;
            const bestOverclock = Math.min((providedQuantity / (throughputWithoutOverclock || 1)) * (throughput.quantity / (quantity || 1)), 2.5);
            overclocks.push(bestOverclock);
          });

          const optimumOverclock = Math.round(Math.ceil(Math.min(...overclocks) * 100));
          if (optimize) {
            throughput.overclock = optimumOverclock / 100;
          }

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
            node.overclock = throughput.overclock * 100;
            node.optimumOverclock = optimumOverclock;
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

            throughput.maxItemsPerSecLimiter = Math.min(limitedItemPerSecByBelt * (maxItemsPerSecLimiter / totalItemThroughput), beltMaxForThisEntry * (maxItemsPerSecLimiter / totalItemThroughput), limitedItemPerSecByBelt, maxItemsPerSecLimiter, itemPerSecBeforeBeltLimiting * fraction);
            throughput.calculatedItemPerSecond = throughput.maxItemsPerSecLimiter;

            foundLink.itemThroughPut = foundLink.itemThroughPut || {};
            foundLink.itemThroughPut[i] = foundLink.itemThroughPut[i] || {max: 0, actual: 0};
            foundLink.itemThroughPut[i].max += (itemPerSecBeforeBeltLimiting / (totalItemThroughput || 1)) * beltMaxForThisEntry;
            foundLink.itemThroughPut[i].actual += itemPerSecBeforeBeltLimiting * 60 * fraction;

            providedThroughput[target].push(throughput);
          });
        });
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

          let resources = {[nodeInitial.id]: initialItemPerSec * 60};
          const initialNode = nodeInitial.id;
          let previousOutput = {[nodeInitial.id]: initialItemPerSec * 60};
          let outputIterator = {[nodeInitial.id]: initialItemPerSec * 60};
          let iteratorTemp = initialItemPerSec * 60;
          while (i < 999) {
            const visitedNodes = new Set();
            const stack = [nodeInitial];
            visitedNodes.add(nodeInitial.id);
            while (stack.length) {
              const node = stack.pop();

              let theseResources = resources[node.id];

              if (node.machine.name === 'Logistic' && node.instance.name === 'Splitter') {
                theseResources = theseResources / ((this.nodeOut[node.id] || []).length || 1);
              } else if (node.machine.name === 'Logistic' && node.instance.name === 'Merger') {

              } else if (node.machine.name === 'Container') {

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
              itemPerNode[nodeId][item] += resultantResource[nodeId];
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
              foundLink.itemThroughPut[item].max = (q / (totalItems || 1) * linkSpeed);
              foundLink.itemThroughPut[item].actual += (q / ((this.nodeOut[node.id] || []).length || 1));
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
                foundLink.itemThroughPut[item].max = (q / totalItems * linkSpeed);
                foundLink.itemThroughPut[item].actual += (q / ((this.nodeOut[source] || []).length || 1));
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

                    provide.calculatedItemPerSecond = localModifier / 60 * (itemPerNode[source][item] / ((this.nodeOut[source] || []).length || 1));

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
  const bodyEl = document.getElementById('svgParent');
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
    .force('xAxis', d3.forceX().strength(0.1).x(function (d) {
      return d.initialX || (width / 2);
    }))
    .force('yAxis', d3.forceY().strength(0.5).y(function (d) {
      return d.initialY || (height / 2);
    }));
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
      console.debug('[Debug] Dragstart');
      drag_start.call(this, d, simulation, t);
    }).on('drag', (d) => {
      console.debug('[Debug] Dragging');
      drag_drag.call(this, d, t);
    }).on('end', function (d) {
      console.debug('[Debug] Drag end');
      // d3.event.sourceEvent.stopImmediatePropagation(); // REMOVEDNOW
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
            console.debug('Wheel zoom');
            wheelZoomCalculation.call(this, d);
          })
          .on('click', function (d) {
            console.debug('Clicked');
            d3.event.stopImmediatePropagation();
            //REMOVEDNOW
            node_clicked.call(this, d, t);
            // self.onNodeClicked.emit(d.id);
          }).on('dblclick', function (d) {
            console.debug('Double clicked');
            d3.event.stopImmediatePropagation();
            remove_select_from_nodes(t);

            if (useExperimentalFeature('nodePhysics')) {
              //double click
              d.fx = null;
              d.fy = null;
            }
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

//     //get svg element.
//     var svg = document.getElementById("mainRender");
//
// //get svg source.
//     var serializer = new XMLSerializer();
//     var source = serializer.serializeToString(svg);
//
// //add name spaces.
//     if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
//         source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
//     }
//     if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
//         source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
//     }
//
// //add xml declaration
//     source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
//
// //convert svg source to URI data scheme.
//     var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);
//
// //set url value to a element's href attribute.
//
//     var download = document.createElement('a');
//     download.href = url;
//     download.download = 'reddot.png';
//     download.click();
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
    .attr('d', function (d) {
      return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
    });

  calculateLabelPositions.call(this, graphLinksData);

  graphLinksData.selectAll('.' + constants.lineObjectClass)
    .each(function (d) {
      d.source.vx += k;
      d.target.vx -= k;
    });
};