import constants from './constants';
import {removeSelectFromNode} from './nodeActions';
import {deselect_path_and_nodes} from './graphActions';
import * as d3 from 'd3';
import TinyQueue from "../TinyQueue";

const processNodeTopologically = function() {

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

  console.error(nodeInShallow, nodeOutShallow);
  const nodeUnion = new Set(Object.keys(nodeInShallow));
  Object.keys(nodeOutShallow).forEach(node => nodeUnion.add(node));
  const nodeUnionArray = Array.from(nodeUnion);
  console.error('AAAAA');
  console.error(nodeUnion, nodeUnionArray);
  nodeUnionArray.forEach((value, index) => {
    nodeUnionArray[index] = this.graphData.nodes.filter(elem => elem.id.toString() === value)[0];
  });

  const myTinyQueue = new TinyQueue(nodeUnionArray, (a, b) => {
    const incomingEdgesA = nodeInShallow[a.id.toString()];
    const incomingEdgesB = nodeInShallow[b.id.toString()];

    if ((!incomingEdgesA || !incomingEdgesA.length) && (!incomingEdgesB || !incomingEdgesB.length)) {
      if (a.machine.name !== 'Container') {
        return -1;
      } else if (b.machine.name !== 'Container'){
        return 1;
      } else if (a.machine.name === 'Container' && a.containedItem) {
        return -1;
      }  else if (b.machine.name === 'Container' && b.containedItem) {
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
      return -1;
    }
  });
  const reverseTraversal = [];
  while (myTinyQueue.size() > 0) {
    const elem = myTinyQueue.pop();
    reverseTraversal.push(elem)
    const outgoing = nodeOutShallow[elem.id.toString()];
    if (outgoing) {
      const source = elem.id;

      outgoing.forEach(element => {
        nodeInShallow[element].splice(nodeInShallow[element].indexOf(source), 1);
      });
      myTinyQueue.reheapify();
    }
    console.log(elem.machine.name);
  }

  // Now reverse the traversal

  // reset the edgegraph
  reverseTraversal.forEach(elem => {
    console.log(elem);
  })
};

export const addPath = function (passedThis, source, target) {
  if (source.machine.name === 'Container' || target.machine.name === 'Container') {
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
  } else {
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

  if (t.state && t.state.selectedPath && t.state.selectedPath == d) {
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

//v1
export const replaceSelectEdge = function (d3Path, edgeData) {
  d3Path.classed(constants.selectedClass, true);
  if (this.selectedEdge) {
    removeSelectFromEdge.call(this);
  }
  this.selectedEdge = edgeData;
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