import constants from './constants';
import {deselect_path_and_nodes} from './graphActions';
import * as d3 from 'd3';
import TinyQueue from '../TinyQueue';
import {simple_cycle} from './algorithms';
import {spliceUtil} from './util';

const nodeComparator = (nodeInShallow) => (a, b) => {
  const incomingEdgesA = nodeInShallow[a.id.toString()];
  const incomingEdgesB = nodeInShallow[b.id.toString()];

  if ((!incomingEdgesA || !incomingEdgesA.length) && (!incomingEdgesB || !incomingEdgesB.length)) {
    if (!['Container', 'Logistic'].includes(a.machine.name)) {
      return -1;
    } else if (!['Container', 'Logistic'].includes(b.machine.name)) {
      return 1;
    } else if (['Container', 'Logistic'].includes(a.machine.name) && a.containedItems) {
      return -1;
    } else if (['Container', 'Logistic'].includes(b.machine.name) && b.containedItems) {
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
};

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

  const nodeOutShallowCopy = JSON.parse(JSON.stringify(nodeOutShallow));

  const nodeUnion = new Set(Object.keys(nodeInShallow));
  Object.keys(nodeOutShallow).forEach(node => nodeUnion.add(node));
  const nodeUnionArray = Array.from(nodeUnion);

  const nodeLookupArray = {};

  // force reset all specials!
  this.graphData.nodes.forEach(node => {
    if (node.containedItems) {
      node.containedItems = null;
      node.containedRecipes = null;
      node.allowedIn = [];
      node.allowedOut = [];
      node.possibleAllowedIn = [];
      node.hasError = null;
    }
  });

  nodeUnionArray.forEach((value, index) => {
    nodeUnionArray[index] = this.graphData.nodes.filter(elem => elem.id.toString() === value)[0];
    nodeUnionArray[index].childProvides = [];
    nodeUnionArray[index].logisticNeeds = [];
    nodeLookupArray[nodeUnionArray[index].id] =nodeUnionArray[index];
  });


  const myTinyQueue = new TinyQueue(nodeUnionArray, nodeComparator(nodeInShallow));
  const reverseTraversal = [];

  // retuires nodeOutput array
  const cycled_components = (graph) => {
    const tmp = simple_cycle(graph);
    return {raw: tmp, set: new Set(tmp.reduce((a, b) => {
      const inputA = a.map(elem => parseInt(elem));
      const inputB = b.map(elem => parseInt(elem));
      return new Set([...inputA, ...inputB]);
    }))};
  };


  let cycleNodes = null;

  let propagate = function(node, nodeOut, cycleNodes, nodeLookupArray) {
    const visited = new Set();
    const stack = [node];

    const vertexLookup = {};
    (node.childProvides || []).forEach(provide => {
      vertexLookup[provide.source] = provide;
    });

    const combinedChildProvides = [];

    const nodesToPropagateData = [];

    while(stack.length) {
      const vertex = stack.pop();
      if (!visited.has(vertex.id)) {
        visited.add(vertex.id);

        console.log('Visiting', vertex.instance.name, vertex.id);

        (vertex.childProvides || []).forEach(provide=>{
          console.log('It has', provide.item.item.name);
          combinedChildProvides.push(provide);
        });

        //If it's part of the cycle, propagate the original edges.
        if (cycleNodes.has(vertex.id)) {
          nodesToPropagateData.push(vertex);
          const outs = nodeOut[vertex.id];
          if (!outs) {
            throw new Error('Why are there no outs for node' + vertex.id + ' ' + JSON.stringify(nodeOut));
          } else {
            outs.filter(out => !visited.has(out)).map(elem => nodeLookupArray[elem]).forEach(elem => stack.push(elem));
          }
        } else {

        }
      }
    }

    nodesToPropagateData.forEach(node => {
      node.childProvides = combinedChildProvides;
    });

    console.error(combinedChildProvides);

    return nodesToPropagateData;
  };


  console.error('RUN ==========');
  while (myTinyQueue.size() > 0) {
    const elem = myTinyQueue.pop();
    console.log('Processing node: ' + elem.instance.name + ' ' + elem.id, d3);
    const outgoing = nodeOutShallow[elem.id.toString()] || [];
    if ((nodeInShallow[elem.id.toString()] || []).length) {
      console.log('PROPAGATION ZS', JSON.parse(JSON.stringify(nodeUnionArray.map(elem => elem.id ))));
      if (!cycleNodes) {
        cycleNodes = cycled_components(nodeOutShallow); // TODO: maybe nodeOutShallowCopy?
      }
      // propagate myself to all nodes part of a cycle
      console.error('Propagating');
      const nodesToOperateOn = propagate(elem, nodeOutShallow, cycleNodes.set, nodeLookupArray, true);

      console.log('Nodes to remove:', JSON.parse(JSON.stringify(nodesToOperateOn.map(elem => elem.id ))));

      nodesToOperateOn.forEach(item => {
        const localOutgoing = nodeOutShallow[item] || [];

        processCurrentNode.call(this, item, localOutgoing.map(i => nodeLookupArray[i]), false);
        myTinyQueue.remove(item);
        const sourceMapper = item.id;

        Object.keys(nodeOutShallow).forEach(key => {
          const outList = nodeOutShallow[key];
          spliceUtil(outList, sourceMapper);
        });
      });

      reverseTraversal.push(nodesToOperateOn);
      myTinyQueue.reheapify();
    } else {
      reverseTraversal.push([elem]);
      processCurrentNode.call(this, elem, outgoing.map(i => nodeLookupArray[i]));

      // If there's outgoing edges, let's go ahead and remove those
      if (outgoing.length) {
        const source = elem.id;
        outgoing.forEach(element => {
          spliceUtil(nodeInShallow[element], source);
        });
        myTinyQueue.reheapify(); // should we reheapify later?
      }
    }
  }

  // reset the edgegraph
  reverseTraversal.reverse();
  reverseTraversal.forEach(elemList => {
    if (elemList.length > 1) return;

    const elem = elemList[0];

    const outgoing = nodeOutShallowCopy[elem.id.toString()] || [];
    reverseProcessCurrentNode.call(this, elem, outgoing.map(i => nodeLookupArray[i]));
  });
};


const reverseProcessCurrentNode = function(node, outgoingEdges) {
  if (node.machine.name !== 'Container' && node.machine.name !== 'Logistic') {
    console.log('This is a normal node, skipping!');
  } else {
    if (node.instance.name === 'Splitter' || node.instance.name === 'Merger' || node.machine.name === 'Container') {
      if (node.allowedIn.length) {
        return;
      }
      const acceptableInput = new Set();
      outgoingEdges.forEach(connectedNode => {
        (connectedNode.allowedIn || []).forEach(elem => acceptableInput.add(elem));
      });
      node.allowedIn = Array.from(new Set([...node.allowedIn, ...acceptableInput]));
    } else {
      throw new Error('Not implemented!');
    }
  }
};

const processCurrentNode = function(node, outgoingEdges, shouldPushEdges = true) {
  if (node.machine.name !== 'Container' && node.machine.name !== 'Logistic') {
    // update downstream
    if (shouldPushEdges) {
      outgoingEdges.forEach(elem => {
        if (!elem.childProvides.filter(entry => entry.source === node.id).length) {
          console.log('Pushing to id', elem.id, node.data.recipe.item.name);
          elem.childProvides.push({item: node.data.recipe, source: node.id});
        }
      }); // wow, we're literally only going to have one outgoing edge.
    }
  } else if (node.machine.name ==='Logistic') {
    if (node.instance.name === 'Splitter' || (node.instance.name === 'Merger')) {
      const propagateSplitterData = (node, outgoingEdges) => {
        node.allowedIn = node.containedItems.map(elem => elem.id);
        node.allowedOut = node.containedItems.map(elem => elem.id);

        if (shouldPushEdges) {
          outgoingEdges.forEach(connectedNode => {
            const alreadyHasElems = new Set(connectedNode.childProvides.map(entry => entry.source));
            node.childProvides.forEach(myChildProvides => {
              if (!alreadyHasElems.has(myChildProvides.source)) {
                connectedNode.childProvides.push(myChildProvides);
              }
            });
          });
        }
      };

      if (node.childProvides.length) {
        node.containedItems = node.childProvides.map(elem => elem.item.item);
        if (shouldPushEdges) {
          propagateSplitterData(node, outgoingEdges);
        }
      }
    } else {
      throw new Error('Not implemented!');
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
      if (shouldPushEdges) {
        propagateContainerData(node, outgoingEdges);
      }
    }
  }
};

export const addPath = function (passedThis, source, target) {

  const sourceChecker = (source.allowedIn || []).length > 0 || (source.allowedOut || []).length > 0;
  const targetChecker = (target.allowedIn || []).length > 0 || (target.allowedOut || []).length > 0;
  const specialSource = ['Container', 'Logistic'].includes(source.machine.name);
  const specialTarget = ['Container', 'Logistic'].includes(target.machine.name);
  const targetSlotsUsed = target.instance.input_slots === (passedThis.nodeIn[target.id] ? passedThis.nodeIn[target.id].length : 0);

  console.error(sourceChecker, targetChecker, specialSource, specialTarget, targetSlotsUsed);

  if ((specialSource && specialTarget && sourceChecker && targetChecker)
    || (specialSource && !specialTarget && sourceChecker)
    || (!specialSource && specialTarget && targetChecker && targetSlotsUsed)
    || (sourceChecker && targetChecker)
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
  spliceUtil(t.nodeOut[outgoing], d.target);
  spliceUtil(t.nodeIn[incoming], d.source);
  spliceUtil(t.graphData.links, d);
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
  spliceUtil(graphRef.edges, l);
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