import {removeSelectFromNode} from './nodeActions';
import {removeSelectFromEdge, addEdgeAndRestartSimulation} from './edgeActions';
import * as d3 from 'd3';
import constants from './constants';

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
export const drag_start = function (d, simulation, graphSvg) {
  if (graphSvg.state && graphSvg.state.shiftHeld) {
    //ignore drag...it's probably not important.
    graphSvg.setState({mouseDragSource: d});
  } else {
    if (!d3.event.active)
      simulation.alphaTarget(0.3).restart();
    graphSvg.setState({wasFixed: d.fx !== null && d.fy != null});
  }

};

//make sure you can't drag the circle outside the box
export const drag_drag = (d, graphSvg) => {

  if (graphSvg.state && graphSvg.state.shiftHeld) {
    //ignore drag...it's probably not important.
    graphSvg.dragLine.classed('hidden', false).attr('d', 'M' + d.x + ',' + d.y + 'L' +
      d3.mouse(graphSvg.svgGroup.node())[0] + ',' + d3.mouse(graphSvg.svgGroup.node())[1]);
  } else {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
    graphSvg.setState({wasMoved: true});
  }
};

export const drag_end = (d, graphSvg, simulation) => {
  // if (!d3.event.active) simulation.alphaTarget(0);
  // Uncomment below if you want it to "bounce" back?
  // d.fx = null;
  // d.fy = null;

  if (graphSvg.state && graphSvg.state.shiftHeld) {
    if (graphSvg.state.mouseOverNode) {
      console.log(graphSvg.graphData.nodes[0])
      addEdgeAndRestartSimulation.call(this, graphSvg,   graphSvg.state.mouseDragSource, graphSvg.state.mouseOverNode , simulation);
    }
    graphSvg.dragLine.classed('hidden', true).attr('d', 'M0,0L0,0');
  } else {
    if (graphSvg.state && graphSvg.state.wasMoved) {
      d.x = d.fx;
      d.y = d.fy;
    } else if (graphSvg.state && !graphSvg.state.wasFixed) {
      d.fx = null;
      d.fy = null;
    }
  }
  graphSvg.setState({shiftHeld: false, wasMoved: false, wasFixed: false});
  d3.select(this).classed(constants.graphNodeGrabbedClass, false);
};

export const node_clicked = function(d, graphSvg) {
  console.log(graphSvg.state);
  console.log('clicked');
};

export const node_mouse_over = function(d, graphSvg) {
  console.log('mouseover');
  graphSvg.setState({mouseOverNode: d3.select(this).datum()});
  d3.select(this).classed(constants.graphNodeHoverClass, true);
};

export const node_mouse_out = function(d, graphSvg) {
  graphSvg.setState({mouseOverNode: null});
  d3.select(this).classed(constants.graphNodeHoverClass, false);
};

export const node_mouse_down = function(d, graphSvg) {
  console.log("mouseDOWN!!!");
  if (d3.event.shiftKey) {
    // d3.event.stopImmediatePropagation();
    console.log(this);
    graphSvg.setState({shiftHeld: true, sourceId: d3.select(this).datum().id});
  } else {
    d3.select(this).classed(constants.graphNodeGrabbedClass, true);
  }
};

export const node_mouse_up = function(d, graphSvg) {
  // Only triggered if it's not a drag
  if (graphSvg.state && graphSvg.state.shiftHeld) {
    console.log('shift was held');
  } else {
    //probably can't get to this case
    console.log('shift was NOT held');
  }
  graphSvg.setState({shiftHeld: false});
};