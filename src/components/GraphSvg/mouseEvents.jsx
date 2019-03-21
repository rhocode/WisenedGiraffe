import {removeSelectFromNode} from "./nodeActions";
import {removeSelectFromEdge} from "./edgeActions";

export const svgMouseDown = function () {
  this.graphMouseDown = true;
};

export const svgMouseUp = function (d3) {
  if (this.justScaleTransGraph) {
    // dragged not clicked
    this.justScaleTransGraph = false;
  } else if (this.graphMouseDown && d3.event.shiftKey) {
    // svg was shift-clicked
  } else if (this.shiftNodeDrag) {
    // dragged from node
    this.shiftNodeDrag = false;
    this.dragLine.classed('hidden', true);
  } else if (this.graphMouseDown) {
    // SVG was clicked, deselecting nodes and edges.
    removeSelectFromNode.call(this);
    removeSelectFromEdge.call(this);
  }
  this.graphMouseDown = false;
};

export const dragmove = function(d, d3) {
  if (this.shiftNodeDrag) {
    this.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' +
      d3.mouse(this.graph.node())[0] + ',' + d3.mouse(this.graph.node())[1]);
  } else {
    d.x += d3.event.dx;
    d.y += d3.event.dy;
    this.updateGraph();
  }
};
