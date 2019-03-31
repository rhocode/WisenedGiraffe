import constants from './constants';
import {deselect_path_and_nodes} from './graphActions';
import * as d3 from 'd3';
import TinyQueue from '../TinyQueue';

export const recalculateStorageContainers = function() {
  const nodeInShallow = {};
  Object.keys(this.nodeIn).forEach(key => {
    const value = this.nodeIn[key];
    nodeInShallow[key] = value.map(elem => elem.id);
  });

  const nodeOutShallow = {};
  Object.keys(this.nodeOut).forEach(key => {
    const value = this.nodeOut[key];
    nodeOutShallow[key] = value.map(elem => elem.id);
  });

  const nodeUnion = new Set(Object.keys(nodeInShallow));
  Object.keys(nodeOutShallow).forEach(node => nodeUnion.add(node));
  const nodeUnionArray = Array.from(nodeUnion);

  const nodeLookupArray = {};

  // force reset all containers!
  this.graphData.nodes.forEach(node => {
    if (node.containedItems) {
      node.containedItems = null;
      node.containedRecipes = null;
      node.allowedIn = [];
      node.allowedOut = [];
      node.hasError = null;
    }
  });

  nodeUnionArray.forEach((value, index) => {
    nodeUnionArray[index] = this.graphData.nodes.filter(elem => elem.id.toString() === value)[0];
    nodeUnionArray[index].childProvides = [];
    nodeUnionArray[index].logisticNeeds = [];
    nodeLookupArray[nodeUnionArray[index].id] =nodeUnionArray[index];
  });


  const myTinyQueue = new TinyQueue(nodeUnionArray, (a, b) => {
    const incomingEdgesA = nodeInShallow[a.id.toString()];
    const incomingEdgesB = nodeInShallow[b.id.toString()];

    if (a.instance.name === 'Merger' || b.instance.name === 'Merger') {
      console.log('Stop here');
    }

    if ((!incomingEdgesA || !incomingEdgesA.length) && (!incomingEdgesB || !incomingEdgesB.length)) {
      if (!['Container', 'Logistic'].includes(a.machine.name)) {
        return -1;
      } else if (!['Container', 'Logistic'].includes(b.machine.name)){
        return 1;
      } else if (['Container', 'Logistic'].includes(a.machine.name ) && a.containedItems) {
        return -1;
      }  else if (['Container', 'Logistic'].includes(b.machine.name ) && b.containedItems) {
        return 1;
      } else {
        //TODO: splitters?
        //Save on a sort cycle;
        return -1;
      }
    } else if ((!incomingEdgesB || !incomingEdgesB.length)) {
      return 1;
    } else if ((!incomingEdgesA || !incomingEdgesA.length)) {
      return -1;
    } else {
      if (['Container', 'Logistic'].includes(a.machine.name) && a.containedItems) {
        return -1;
      } else if (['Container', 'Logistic'].includes(b.machine.name) && b.containedItems) {
        return 1;
      } else if (['Container', 'Logistic'].includes(a.machine.name) && a.childProvides.length) {
        return -1;
      } else if (['Container', 'Logistic'].includes(b.machine.name) && b.childProvides.length) {
        return 1;
      } else if (['Container', 'Logistic'].includes(a.machine.name)) {
        return -1;
      } else if (['Container', 'Logistic'].includes(b.machine.name)) {
        return 1;
      } else {
        return -1;
      }
    }
  });
  const reverseTraversal = [];

  //
  const nodeOutShallowCopy = JSON.parse(JSON.stringify(nodeOutShallow));
  const nodeInShallowCopy = JSON.parse(JSON.stringify(nodeInShallow));

  const strongly_connected_components = function(graph) {
    const index_counter = ['0'];
    const stack = [];
    const lowlink = {};
    const index = {};
    const result = [];

    const _strong_connect = function(node) {
      index[node] = index_counter[0];
      lowlink[node] = index_counter[0];
      index_counter[0] = (parseInt(index_counter[0]) + 1).toString();
      stack.push(node);

      const successors = graph[node] || [];
      successors.forEach(successor => {
        if(!Object.keys(index).includes(successor)) {
          _strong_connect(successor);
          if (lowlink[node] === undefined || lowlink[successor] === undefined) {
            throw new Error('Not defined: ' + node + ' ' + successor + ' '  + JSON.stringify(lowlink));
          }
          lowlink[node] = Math.min(parseInt(lowlink[node]),parseInt(lowlink[successor])).toString();
        } else if (stack.includes(successor)) {
          if (lowlink[node] === undefined || lowlink[successor] === undefined) {
            throw new Error('Not defined: ' + node + ' ' + successor + ' '  + JSON.stringify(lowlink) + ' ' + JSON.stringify(index));
          }
          lowlink[node] = Math.min(parseInt(lowlink[node]),parseInt(index[successor])).toString();
        }
      });

      if (lowlink[node] === index[node]) {
        const connected_component = [];
        /*eslint no-constant-condition: ["error", { "checkLoops": false }]*/
        while(true) {
          const successor = stack.pop();
          connected_component.push(successor);
          if (successor === node) break;
        }
        result.push(connected_component.slice());
      }
    };
    Object.keys(graph).forEach(node => {
      if (!Object.keys(index).includes(node)) {
        _strong_connect(node);
      }
    });

    return result;
  };

  const remove_node = function(G, target) {
    delete G[target];
    const values = Object.keys(G).map(key => G[key]);
    values.forEach(value => {
      value.delete(target);
    });
  };

  const subgraphs = function(G, vertices) {
    const returnMap = {};
    vertices.forEach(v => {
      const gvarray = Array.from(G[v]);
      const filtered = gvarray.filter(elem => vertices.has(elem));


      returnMap[v] = new Set(filtered);
    });
    return returnMap;
  };

  const simple_cycle = function(Ginput) {
    const _unblock = function(thisnode, blocked, B) {
      const stack = new Set([thisnode]);
      while(stack.size) {
        const node =  stack.values().next().value;
        stack.delete(node);
        if (blocked.has(node)) {
          blocked.delete(node);
          if (!B[node]) {
            B[node] = new Set();
          }
          B[node].forEach(elem => {
            stack.add(elem);
          });
          B[node].clear();
        }
      }
    };


    const G = {};
    Object.keys(Ginput).forEach(key => {
      G[key] = new Set(Ginput[key].map(elem => elem.toString()));
    });

    const sccs = strongly_connected_components(G);
    const returnValues = [];
    while(sccs.length) {
      const scc = sccs.pop();
      const startnode = scc.pop();
      const path = [startnode];
      const blocked = new Set();
      const closed = new Set();
      blocked.add(startnode);
      const B = {};
      const stack = [  [ startnode, Array.from(G[startnode] || new Set())] ];
      while(stack.length) {
        const [thisnode, nbrs] = stack[stack.length - 1];
        if (nbrs && nbrs.length) {
          const nextnode = nbrs.pop();
          if (nextnode === startnode) {
            returnValues.push(path.slice().map(elem => parseInt(elem)));
            path.forEach(node => {
              closed.add(node);
            });
          } else if (!blocked.has(nextnode)) {
            path.push(nextnode);
            stack.push([ nextnode, Array.from(G[nextnode] || new Set())  ]);
            closed.delete(nextnode);
            blocked.add(nextnode);
          }
        } else {
          if (closed.has(thisnode)) {
            _unblock(thisnode, blocked, B);
          } else {
            (G[thisnode] || []).forEach(nbr => {
              B[nbr] = B[nbr] || new Set();
              if(!B[nbr].has(nbr)) {
                B[nbr].add(thisnode);
              }
            });
          }

          stack.pop();
          path.pop();
        }
      }


      remove_node(G, startnode);
      const H = subgraphs(G, new Set(scc));
      const toAdd = strongly_connected_components(H);
      toAdd.forEach(elem => {
        sccs.push(elem);
      });
    }
    return returnValues;
  };

  // retuires nodeOutput array
  const cycled_components = (graph) => {
    const tmp = simple_cycle(graph);
    return {raw: tmp, set: new Set(tmp.reduce((a, b) => {
      const inputA = a.map(elem => parseInt(elem));
      const inputB = b.map(elem => parseInt(elem));
      return new Set([...inputA, ...inputB]);
    }))};
  };

  // how to remove dups

  //to generate the specific indexes
  // pos = myArray.map(function(e) { return e.hello; }).indexOf('stevie');


  // var a = [1, 2, 3], b = [101, 2, 1, 10];
  // var c = a.concat(b);
  // var d = c.filter(function (item, pos) {return c.indexOf(item) == pos});
  let cycleNodes = null;

  let propagate = function(node, nodeOut, cycleNodes, nodeLookupArray, firstRun) {
    const visited = new Set();
    const stack = [node];

    const myChildProvides = new Set((node.childProvides || []));
    const vertexLookup = {};
    (node.childProvides || []).forEach(provide => {
      vertexLookup[provide.source] = provide;
    });

    const edgesToDeleteFromNodes = new Set([node.id]);

    if (myChildProvides.length || firstRun) {
      while(stack.length) {
        const vertex = stack.pop();
        if (!visited.has(vertex.id)) {
          visited.add(vertex.id);

          const vertexChildProvides = new Set((vertex.childProvides || []).map(provideMap => provideMap.source));
          myChildProvides.forEach(provide=>{
            console.log('Processing provide', provide, vertexChildProvides);
            if (!vertexChildProvides.has(provide.source)) {
              console.log('Pushing provide');
              vertex.childProvides.push(provide);
            }
          });

          //If it's part of the cycle, propagate the original edges.
          if (cycleNodes.has(vertex.id)) {
            edgesToDeleteFromNodes.add(vertex.id);
            const outs = nodeOut[vertex.id];
            if (!outs) {
              throw new Error('Why are there no outs for node' + vertex.id + ' ' + JSON.stringify(nodeOut));
            } else {
              outs.filter(out => !visited.has(out)).map(elem => nodeLookupArray[elem]).forEach(elem => stack.push(elem));
            }
          }
        }
      }
    }
    return edgesToDeleteFromNodes;
  };

  while (myTinyQueue.size() > 0) {
    const elem = myTinyQueue.pop();
    console.log('Processing node: ' + elem.instance.name + ' ' + elem.id, d3);
    const outgoing = nodeOutShallow[elem.id.toString()] || [];
    if ((nodeInShallow[elem.id.toString()] || []).length) {
      if (!cycleNodes) {
        cycleNodes = cycled_components(nodeOutShallow); // TODO: maybe nodeOutShallowCopy?
      }
      // propagate myself to all nodes part of a cycle
      const otherProps = propagate(elem, nodeOutShallow, cycleNodes.set, nodeLookupArray, true);
      Array.from(otherProps).filter(id => id !== elem.id).map(i => nodeLookupArray[i]).forEach(prop => {
        propagate(prop, nodeOutShallow, cycleNodes.set, nodeLookupArray, false);
        console.log(JSON.stringify(prop, null, 4));
      });

      Array.from(otherProps).map(i => nodeLookupArray[i]).forEach(nodeElement => {
        const outgoingMapper = nodeOutShallow[nodeElement.id.toString()] || [];
        processCurrentNode.call(this, nodeElement, outgoingMapper.map(i => nodeLookupArray[i]), nodeInShallow, nodeLookupArray, nodeInShallowCopy, this.props.parentAccessor);

      });


      const source = elem.id;
      outgoing.forEach(element => {
        nodeInShallow[element].splice(nodeInShallow[element].indexOf(source), 1);
      });

      Array.from(otherProps).map(i => nodeLookupArray[i]).forEach(nodeElement => {
        const outgoingMapper = nodeOutShallow[nodeElement.id.toString()] || [];
        const sourceMapper = nodeElement.id;
        outgoingMapper.forEach(element => {
          nodeInShallow[element].splice(nodeInShallow[element].indexOf(sourceMapper), 1);
        });
      });
      reverseTraversal.push(elem);
      myTinyQueue.reheapify();
    } else {
      reverseTraversal.push(elem);
      processCurrentNode.call(this, elem, outgoing.map(i => nodeLookupArray[i]), nodeInShallow, nodeLookupArray, nodeInShallowCopy, this.props.parentAccessor);

      if (outgoing) {
        const source = elem.id;
        outgoing.forEach(element => {
          nodeInShallow[element].splice(nodeInShallow[element].indexOf(source), 1);
        });
        myTinyQueue.reheapify(); // should we reheapify later?
      }
    }
  }

  // reset the edgegraph
  // reverseTraversal.reverse();
  // reverseTraversal.forEach(elem => {
  //   const outgoing = nodeOutShallowCopy[elem.id.toString()] || [];
  //   processCurrentNode.call(this, elem, outgoing.map(i => nodeLookupArray[i]), nodeInShallowCopy, nodeLookupArray, nodeInShallowCopy, this.props.parentAccessor);
  // });
};

const processCurrentNode = function(node, outgoingEdges, nodeInShallow, nodeLookupArray, immutableNodeInShallow, mainGraphAccessor) {
  if (node.machine.name !== 'Container' && node.machine.name !== 'Logistic') {
    // update downstream
    outgoingEdges.forEach(elem => {
      if (!elem.childProvides.filter(entry => entry.source === node.id).length) {
        elem.childProvides.push({item: node.data.recipe, source: node.id});
      }
    }); // wow, we're literally only going to have one outgoing edge.
  } else if (node.machine.name ==='Logistic') {
    if (node.instance.name === 'Splitter' || (node.instance.name === 'Merger')) {
      const propagateSplitterData = (node, outgoingEdges) => {
        node.allowedIn = node.containedItems.map(elem => elem.id);
        node.allowedOut = node.containedItems.map(elem => elem.id);

        outgoingEdges.forEach(connectedNode => {
          const alreadyHasElems = new Set(connectedNode.childProvides.map(entry => entry.source));
          node.childProvides.forEach(myChildProvides => {
            if (!alreadyHasElems.has(myChildProvides.source)) {
              connectedNode.childProvides.push(myChildProvides);
            }
          });
        });
      };

      if (node.childProvides.length) {
        node.containedItems = node.childProvides.map(elem => elem.item.item);
        propagateSplitterData(node, outgoingEdges);
        console.log('Had child provides!', node.containedItems, JSON.stringify(node.childProvides), node);
      }
    }
  } else {
    //it's a container.
    const propagateContainerData = (node, outgoingEdges) => {
      node.allowedIn = node.containedItems.map(elem => elem.id);
      node.allowedOut = node.containedItems.map(elem => elem.id);

      outgoingEdges.forEach(connectedNode => {
        const alreadyHasElems = new Set(connectedNode.childProvides.map(entry => entry.source));
        node.childProvides.forEach(myChildProvides => {
          if (!alreadyHasElems.has(myChildProvides.source)) {
            connectedNode.childProvides.push(myChildProvides);
          }
        });
      });
    };

    if (node.childProvides.length) {
      // I have items!!
      node.containedItems = node.childProvides.map(elem => elem.item.item);
      propagateContainerData(node, outgoingEdges);
    } else {
      // deduce what your upstream needs:
      const parents = outgoingEdges.map(elem =>
        ({type: elem.machine.name, allowedIn: elem.allowedIn, node: elem, has: elem.childProvides, otherNodes: immutableNodeInShallow[elem.id].map(nodeId => nodeLookupArray[nodeId]).filter(other => node.id !== other.id)    })
      );  // wow, we're literally only going to have one outgoing edge.

      const remainingDeps = [];
      const recipes = {};
      parents.forEach(parent => {
        const allowedIn = parent.allowedIn.slice();
        const childrenAllowedOut = parent.otherNodes.map(node => node.allowedOut).flat();

        const unresolvedQueries = parent.otherNodes.filter(node => node.allowedOut.length === 0 && ['Container', 'Logistic'].includes(node.machine.name));
        childrenAllowedOut.forEach(item => {
          allowedIn.splice(allowedIn.indexOf(item), 1);
        });

        if (allowedIn.length === unresolvedQueries.length + 1) {
          // """"smart"""" linking. We can find the least common denominator
          allowedIn.forEach(id => recipes[id] = mainGraphAccessor.state.recipe.item[id]);
          remainingDeps.push(allowedIn);
        }
      });
      //
      //
      // // Try best fit, otherwise, FUCK it and just pick whatever.
      // remainingDeps.sort(function(a, b) {
      //   return a.length - b.length;
      // });
      // const shiftedArray = remainingDeps.slice().shift() || [];
      // const commonElements = shiftedArray.filter(function(v) {
      //   return remainingDeps.every(function(a) {
      //     return a.indexOf(v) !== -1;
      //   });
      // });
      //
      // if (commonElements.length > 0) {
      //   //pick one. May change later...but most likely not.
      //   console.log('We can pick');
      //   // In theory we COULD pick multiple.
      //   node.containedItems = [  recipes[commonElements[0]]  ];
      //   console.log(commonElements, node.containedItems);
      //   propagateContainerData(node, outgoingEdges);
      // } else {
      //   // No common elements...
      //   console.error('No common elements!!!');
      //   node.hasError = {error: 'What the fuck, why is this connected? It has no common links', type: 'NO_COMMON_LINKS'};
      // }
    }
  }
};

export const addPath = function (passedThis, source, target) {

  const sourceChecker = (source.containedItems || []).length > 0;
  const targetChecker = (target.containedItems || []).length > 0;
  const specialSource = ['Container', 'Logistic'].includes(source.machine.name);
  const specialTarget = ['Container', 'Logistic'].includes(target.machine.name);
  const targetSlotsUsed = target.instance.input_slots === (passedThis.nodeIn[target.id] ? passedThis.nodeIn[target.id].length : 0);

  console.log(sourceChecker, targetChecker, specialSource, specialTarget, targetSlotsUsed);

  if ((specialSource && specialTarget && sourceChecker && targetChecker)
    || (specialSource && !specialTarget && sourceChecker)
    || (!specialSource && specialTarget && targetChecker && targetSlotsUsed)
    || (!specialSource && !specialTarget))
  {
    //checked
    console.log('Checked Flow!');
    const newEdge = {source: source, target: target};

    // Check if there are items you can shove in
    const sharedItems =  target.allowedIn.filter(value => source.allowedOut.includes(value));

    // check if there are open slots
    const outgoing = source.id;
    const incoming = target.id;

    const usedOut = (passedThis.nodeOut[outgoing] ? passedThis.nodeOut[outgoing].length : 0);
    const usedIn = (passedThis.nodeIn[incoming] ? passedThis.nodeIn[incoming].length : 0);

    // return early if we can't do anything with this node.
    if ( usedOut >= source.instance.output_slots || usedIn >= target.instance.input_slots ||
      sharedItems.length <= 0)
    {
      passedThis.updateGraphHelper();
      return;
    }

    const filterResult = passedThis.graphData.links.filter(function (d) {
      if (d.source.id === newEdge.target.id && d.target.id === newEdge.source.id) {
        removePath(d, passedThis);
      }
      return (d.source.id === newEdge.source.id && d.target.id === newEdge.target.id) || newEdge.source.id === newEdge.target.id;
    });

    if (filterResult.length === 0) {
      passedThis.graphData.links.push(newEdge);
    }
    passedThis.updateGraphHelper();
  } else {
    // special handling if the source is a container
    const newEdge = {source: source, target: target};
    //
    // // Check if there are items you can shove in
    // const sharedItems =  target.allowedIn.filter(value => source.allowedOut.includes(value));

    // check if there are open slots
    const outgoing = source.id;
    const incoming = target.id;

    const usedOut = (passedThis.nodeOut[outgoing] ? passedThis.nodeOut[outgoing].length : 0);
    const usedIn = (passedThis.nodeIn[incoming] ? passedThis.nodeIn[incoming].length : 0);

    // return early if we can't do anything with this node,
    if ( usedOut >= source.instance.output_slots || usedIn >= target.instance.input_slots)
    {
      passedThis.updateGraphHelper();
      return;
    }

    const filterResult = passedThis.graphData.links.filter(function (d) {
      if (d.source.id === newEdge.target.id && d.target.id === newEdge.source.id) {
        removePath(d, passedThis);
      }
      return (d.source.id === newEdge.source.id && d.target.id === newEdge.target.id) || newEdge.source.id === newEdge.target.id;
    });

    if (filterResult.length === 0) {
      passedThis.graphData.links.push(newEdge);
    }
    passedThis.updateGraphHelper();
  }
};


export const pathMouseOver = function (d) {

};

export const pathMouseOut = function (d) {

};

export const pathMouseClick = function (d, t) {
  d3.event.stopImmediatePropagation();
  const parentElement = d3.select(this.parentElement);
  // const styledLine = parentElement.select('.' + constants.lineStylingPathClass);
  // const styledMarker = parentElement.select('.' + constants.lineStylingArrowClass);

  if (t.state && t.state.selectedPath && t.state.selectedPath === d) {
    // set the new selected one to this one
    deselect_path_and_nodes.call(this, t);
  } else {
    deselect_path_and_nodes.call(this, t);
    d3.selectAll('.' + constants.lineStylingFullClass).attr('display', 'none');
    t.setState({selectedPath: d});
    const both = parentElement.selectAll('.' + constants.lineStylingFullClass);
    both.attr('display', 'inherit');
  }
};

export const removePath = function (d, t) {
  if (t.graphData.links.indexOf(d) === -1) {
    throw new Error('d not found in graph links: ' + JSON.stringify(d));
  }
  const outgoing = d.source.id;
  const incoming = d.target.id;

  t.nodeOut[outgoing].splice(t.nodeOut[outgoing].indexOf(d.target), 1);
  t.nodeIn[incoming].splice(t.nodeIn[incoming].indexOf(d.source), 1);
  t.graphData.links.splice(t.graphData.links.indexOf(d), 1);
};


export const removeSelectFromEdge = function () {
  if (!this.selectedEdge) {
    return;
  }

  const outerThis = this;
  this.paths.filter(function (cd) {
    return cd === outerThis.selectedEdge;
  }).selectAll('path').classed(constants.selectedClass, false);

  this.selectedEdge = null;
};

export const addEdge = function (graphRef, edgeData) {
  const newEdge = {source: edgeData.from, target: edgeData.to};

  const filterResult = graphRef.paths.filter(function (d) {
    if (d.source === newEdge.target && d.target === newEdge.source) {
      removeEdge(graphRef, d);
    }
    return d.source === newEdge.source && d.target === newEdge.target;
  });

  //Todo: make nodes not connect if they dont provide the right resources

  // Filter if it doesn't resolve
  if (!filterResult[0].length) {
    graphRef.edges.push(newEdge);
    addEdgeToGraph.call(graphRef, edgeData);
    graphRef.updateGraph();
  }
};

export const addEdgeToGraph = function (edgeData) {

};

export const removeEdge = function (graphRef, l) {
  graphRef.edges.splice(graphRef.edges.indexOf(l), 1);
  removeEdgeFromGraph.call(graphRef, l);
};

export const removeEdgeFromGraph = function (edgeData) {

};

export const calculatePathTooltipPosition = function (link_label, d3) {
  link_label.attr('x', function (d) {
    const node = d3.select(link_label.node().parentElement).selectAll('path').node();
    const pathLength = node.getTotalLength();
    d.point = node.getPointAtLength(pathLength / 2);
    return d.point.x - (d3.select(this).attr('width') / 2);
  }).attr('y', function (d) {
    return d.point.y - (d3.select(this).attr('height') / 2);
  });
};


// GraphCreator.prototype.calculateLabelPosition = function (link_label, text) {
//   text.attr('x', function (d) {
//     var node = d3.select(link_label.node().parentElement).selectAll('path').node();
//     var pathLength = node.getTotalLength();
//     d.point = node.getPointAtLength(pathLength / 2);
//     return d.point.x;
//   }).attr('y', function (d) {
//     return d.point.y;
//   });
// };

export const insertEdgeLabel = function (gEl) {
  // Perhapos not needed!
  // var link_label = gEl.append('g').attr('class', 'textLabel');
  //
  // const text =  link_label.append('text')
  //   .style('text-anchor', 'middle')
  //   .style('dominant-baseline', 'central')
  //   .attr('class', 'edge-label').text("WHAT");
  //
  // this.calculateLabelPosition(link_label, text);

  const thisGraph = this;
  const {classes} = this.props;
  //
  // var div_label = gEl.append('foreignObject').attr({
  //   'width': '200px',
  //   'height': '200px',
  //   'class': 'path-tooltip'
  // });
  //
  // div_label.append('xhtml:div').attr({
  //   'class': 'path-tooltip-div'
  // })
  //   .append('div')
  //   .attr({
  //     'class': 'tooltip'
  //   }).append('p')
  //   .attr('class', 'lead')
  //   .attr('id', function (d) {
  //     return thisGraph.nodeNaming(d);
  //   }).html(function (d) {
  //     /*eslint-disable react/no-unknown-property*/
  //     return jsxToString(<div>
  //       <div><img class={classes.pathIcon}
  //         src="https://i.imgur.com/oBmfK3w.png" title="logo"/>
  //       <div class={classes.pathText}>Hello there!</div>
  //       </div>
  //     </div>);
  //   /*eslint-enable  react/no-unknown-property*/
  //   }).attr('dummy_attr', function (d) {
  //     const node = d3.select(this).node();
  //     d3.select(d3.select(this).node().parentElement.parentElement.parentElement)
  //       .attr('width', node.clientWidth + 0.5).attr('height', node.clientHeight + 0.5);
  //     return 'meep';
  //   });
  //
  // this.calculatePathTooltipPosition(div_label);
};