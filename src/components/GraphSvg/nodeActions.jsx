import constants from './constants';
import {addEdge, removeEdge, removeSelectFromEdge} from './edgeActions';

export const insertNodeTitle = (gEl) => {
  // const title = gEl.datum().name;
  //
  // var words = title.split(/-/g),
  //   nwords = words.length;
  // var el = gEl.append('g').attr('text-anchor', 'middle').attr('dy', '-' + (nwords - 1) * 7.5);
  // for (var i = 0; i < words.length; i++) {
  //   var backgroundText = el.append('text').attr({
  //     'fill': 'white',
  //     'stroke': 'white',
  //     'stroke-width': 8
  //   }).text(words[i]);
  //   if (i > 0) backgroundText.attr('x', 0).attr('dy', 15 * i);
  //   var tspan = el.append('text').attr('fill', 'black').text(words[i]);
  //   if (i > 0) tspan.attr('x', 0).attr('dy', 15 * i);
  // }
  //
  // globalAccessor.addResourceIcon(el);
};

export const nodeNaming = function (d) {
  return d.source.id + '-' + d.target.id;
};

export const generateNodeDef = (x, y, id, data) => {
  return {id, x, y, data};
};

export const addNode = (graphRef, machine, x = null, y = null) => {
  var bodyEl = document.getElementById('mainRender');
  var width = bodyEl.clientWidth,
    height = bodyEl.clientHeight;
  console.log('Called addNode');
  const d = generateNodeDef(x || width / 2, y || height / 2, graphRef.idct++, {});
  graphRef.nodes.push(d);
  console.log(graphRef);
  addNodeToGraph(graphRef, d);

  graphRef.updateGraph();
};

export const removeNode = (graphRef, l) => {
  graphRef.nodes.splice(graphRef.nodes.indexOf(l), 1);
  removeNodeFromGraph.call(graphRef, l);
};

export const addNodeToGraph = (graphRef, d) => {
  // const nodeId = graphRef.idct - 1;
  // this.nodes[nodeId] = d;
  // this.outputEdges[nodeId] = {};
  // this.inputEdges[nodeId] = {};
};

export const removeNodeFromGraph = function(l) {
  // const nodeId = l.id;
  // delete this.nodes[nodeId];
  // delete this.inputEdges[nodeId];
  // delete this.outputEdges[nodeId];
};

// mousedown on node
export const circleMouseDown = function(d3, d3node, d) {
  d3.event.stopPropagation();
  // Select this node
  this.mouseDownNode = d;
  if (d3.event.shiftKey) {
    this.shiftNodeDrag = d3.event.shiftKey;
    // reposition dragged directed edge
    this.dragLine.classed('hidden', false).attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
  }
};

// mouseup on nodes
export const circleMouseUp = function(d3, d3node, d) {
  // reset the states
  this.shiftNodeDrag = false;
  d3node.classed(constants.connectableClass, false);
  const mouseDownNode = this.mouseDownNode;
  if (!mouseDownNode) {
    return;
  }

  removeSelectFromEdge.call(this);

  // Set the drag line as hidden!
  this.dragLine.classed('hidden', true);

  if (mouseDownNode !== d) {
    // Create edge and add it to the graph.
    //TODO: Add edge!!
    addEdge(this, {from: mouseDownNode, to: d});
  } else {
    // we're in the same node
    if (this.justDragged) {
      // dragged, not clicked
      this.justDragged = false;
    } else {
      // clicked, not dragged
      if (!d3.event.shiftKey) {
        if (this.selectedEdge) {
          removeSelectFromEdge.call(this);
        }
        const prevNode = this.selectedNode;

        if (!prevNode || prevNode.id !== d.id) {
          replaceSelectNode.call(this, d3node, d);
        } else {
          removeSelectFromNode.call(this);
        }
      }
    }
  }
  this.mouseDownNode = null;
}; // end of circles mouseup

export const removeSelectFromNode = function () {
  if (!this.selectedNode) {
    return;
  }

  const outerThis = this;

  this.circles.filter(function (cd) {
    return cd.id === outerThis.selectedNode.id;
  }).classed(constants.selectedClass, false);
  this.selectedNode = null;
};

export const replaceSelectNode = function (d3Node, nodeData) {
  d3Node.classed(constants.selectedClass, true);
  if (this.selectedNode) {
    removeSelectFromNode.call(this);
  }
  this.selectedNode = nodeData;
};

// remove edges associated with a node
export const spliceLinksForNode = function (node) {
  const toSplice = this.edges.filter(function (l) {
    return l.source === node || l.target === node;
  });

  toSplice.map(function (l) {
    removeEdge(this, l);
  });
};