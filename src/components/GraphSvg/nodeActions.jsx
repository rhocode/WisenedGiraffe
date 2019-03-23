import constants from './constants';
import {addEdge, removeEdge, removeSelectFromEdge} from './edgeActions';
import * as d3 from 'd3';

const overClockCalculation = (d, percentage_metric, offset, endOffsetRaw) => {
  const endOffset = endOffsetRaw + offset;
  const percentage = d[percentage_metric];
  const arc = d3.arc()
    .innerRadius(50)
    .outerRadius(50);

  const m = (endOffset - offset) / 250;
  const b = offset;

  const start = b / 180 * Math.PI;
  const end = (m * percentage + b )/ 180 * Math.PI;
  return arc({startAngle:start, endAngle: end});
};

export const addOverclockArc = (parent, percentage_metric, offset, endOffset) => {
  parent.append('path')
    .attr('class', constants.overclockedArcClass)
    .attr('fill', 'none')
    .attr('stroke-width', 4)
    .attr('stroke', 'darkslategray')
    .attr('d', function(d) {
      return overClockCalculation(d, percentage_metric, offset, endOffset);
    });
};

export const editOverclockArc = (parent, percentage_metric, offset, endOffset) => {
  parent.select('.' + constants.overclockedArcClass)
  // .attr('class', constants.overclockedArcClass)
  // .attr('fill', 'none')
  // .attr('stroke-width', 4)
  // .attr('stroke', 'darkslategray')
    .attr('d', function(d) {
      return overClockCalculation(d, percentage_metric, offset, endOffset);
    });
};

export const addNodeImage = (parent) => {
  parent.append('svg:image')
    .attr('class', function (d) {
      if (d.machine && d.machine.icon) {
        return 'machine-icon';
      }
      return 'dev-icon';
    })
    .attr('xlink:href', function (d) {
    // if (d.machine && d.machine.icon) {
    //   return d.machine.icon;
    // }
      return 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png';
    // return 'https://i.imgur.com/oBmfK3w.png';
    })
    .attr('x', function (d) {
      return -50;
    })
    .attr('y', function (d) {
      return -50;
    })
    .attr('height', 100)
    .attr('width', 100);
};

export const wheelZoomCalculation = function(d) {
  d3.event.stopImmediatePropagation();

  let roughEstimate = -1;

  if (d3.event.deltaY < 0) {
    roughEstimate = 1;
  }

  d.overclock = (d.overclock + (roughEstimate));
  if (d.overclock < 0) {
    d.overclock = 251 + d.overclock;
  } else if (d.overclock > 250) {
    d.overclock = d.overclock - 251;
  }
  console.log(d.overclock);
  editOverclockArc(d3.select(this), 'overclock', 55, 330);
};

export const insertNodeLevel = (gEl) => {
  // const title = gEl.datum().name;
  const title = 'V';
  const words = title.split(/-/g);
  const nwords = words.length;
  const el = gEl.append('g').attr('text-anchor', 'middle').attr('dy', '-' + (nwords - 1) * 7.5);
  el.append('circle').attr('r', 13).attr('fill', '#FFFFFF').attr('cx', 32).attr('cy', -38).attr('stroke', 'black').attr('stroke-width', 1);
  for (let i = 0; i < words.length; i++) {
    const backgroundText = el.append('text')
      .attr('fill', 'white')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .text(words[i]).attr('x', 32).attr('dy', -32);

    // if (i > 0) backgroundText.attr('x', 0).attr('dy', 15 * i);
    const tspan = el.append('text').attr('fill', 'black').text(words[i]).attr('x', 32).attr('dy', -32);
    // if (i > 0) tspan.attr('x', 0).attr('dy', 15 * i);
  }

};

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