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

// V2 functions
export const drag_start = (d, simulation, d3) => {
  if (!d3.event.active)
    simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
};

//make sure you can't drag the circle outside the box
export const drag_drag = (d, d3) => {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
};

export const drag_end = (d) => {
  // if (!d3.event.active) simulation.alphaTarget(0);
  // Uncomment below if you want it to "bounce" back?
  // d.fx = null;
  // d.fy = null;
  d.x = d.fx;
  d.y = d.fy;
};