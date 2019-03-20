import constants from "./constants";
import {spliceLinksForNode} from "./nodeActions";
import {removeNode} from "./nodeActions";
import {removeEdge} from "./edgeActions";

export const svgKeyUp = function () {
  this.lastKeyDown = -1;
};

export const svgKeyDown = function (d3) {
  // make sure repeated key presses don't register for each keydown
  if (this.lastKeyDown !== -1) return;

  this.lastKeyDown = d3.event.keyCode;
  const selectedNode = this.selectedNode,
    selectedEdge = this.selectedEdge;

  switch (d3.event.keyCode) {
  case constants.BACKSPACE_KEY:
  case constants.DELETE_KEY:
    d3.event.preventDefault();
    if (selectedNode) {
      //remove the node
      spliceLinksForNode.call(this, selectedNode);
      removeNode(this, selectedNode);
      this.selectedNode = null;
      this.updateGraph();
    } else if (selectedEdge) {
      removeEdge(this, selectedEdge);
      this.selectedEdge = null;
      this.updateGraph();
    }
    break;
  }
};