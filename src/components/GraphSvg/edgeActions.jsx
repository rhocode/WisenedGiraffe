import constants from './constants';
import {deselect_path_and_nodes} from './graphActions';
import * as d3 from 'd3';
import TinyQueue from '../TinyQueue';
import {
  simple_cycle,
  strongly_connected_components,
  strongly_connected_components_nostring,
  strongly_connected_components_standalone
} from './algorithms';
import {spliceUtil} from './util';

export const recalculateStorageContainers = function() {

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

  const myTinyQueue = new TinyQueue([...Object.keys(derivedGraphOutgoing), ...Object.keys(derivedGraphIncoming)], (a, b) => {
    return derivedGraphIncoming[a].size - derivedGraphIncoming[b].size;
  });

  const globalProvideMap = {};

  const reverseTraversalStack = [];

  while(myTinyQueue.size()) {
    const node = myTinyQueue.pop();

    reverseTraversalStack.push(node);

    const thisNodeInflated = superNodeGraphLookupInflated[node];
    const outgoing = Array.from(derivedGraphOutgoing[node] || new Set());
    const outgoingInflated = outgoing.map(item => superNodeGraphLookupInflated[item]);

    const propagateNodeToEdges = (nodeGroupSource, nodeGroupTarget, origin, targets) => {
      //gather this node
      const combinedProvides = [];
      const combinedProvidesSource = new Set();
      nodeGroupSource.forEach(node => {
        if (node.machine.name !== 'Container' && node.machine.name !== 'Logistic') {
          combinedProvides.push({item: node.data.recipe, source: origin});
        } else {
          node.childProvides = globalProvideMap[origin]  || [];
          node.childProvides.forEach(provide => {
            if (!combinedProvidesSource.has(provide.source)) {
              combinedProvides.push(provide);
              combinedProvidesSource.add(provide.source);
            }
          });
          node.allowedIn = node.childProvides.map(elem => elem.item.item.id);
          node.allowedOut = node.childProvides.map(elem => elem.item.item.id);
          node.containedItems = node.childProvides.map(elem => elem.item.item);
        }
      });

      targets.forEach(target => {
        if (!globalProvideMap[target]) {
          globalProvideMap[target] = [];
        }

        combinedProvides.forEach(provide => {
          if (!new Set(globalProvideMap[target].map(elem => elem.source)).has(provide.source)) {
            globalProvideMap[target].push(provide);
          }
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

  while(reverseTraversalStack.length) {
    const node = reverseTraversalStack.pop();

    const thisNodeInflated = superNodeGraphLookupInflated[node];

    const outgoing = Array.from(derivedGraphOutgoing[node] || new Set());
    const outgoingInflated = outgoing.map(item => superNodeGraphLookupInflated[item]);

    const propagateNodeToEdgesReversed = (nodeGroupSource, nodeGroupTarget, origin, targets) => {

      const allowed = new Set();
      nodeGroupTarget.forEach(nodeGroup => nodeGroup.forEach(node => {
        node.allowedIn.forEach(item => allowed.add(item))
      }));

      nodeGroupSource.forEach(node => {
        if (node.machine.name !== 'Container' && node.machine.name !== 'Logistic') {
          // NoOp
        } else {
          if (node.allowedIn.length === 0 && node.allowedOut.length === 0) {
            node.allowedIn = Array.from(allowed);
            node.allowedOut = Array.from(allowed);
          }
        }
      });
    };
    propagateNodeToEdgesReversed(thisNodeInflated, outgoingInflated, node, outgoing);
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