import constants from './constants';
import {spliceLinksForNode} from './nodeActions';
import {removeNode, delete_node} from './nodeActions';
import {removeEdge, removePath} from './edgeActions';

import * as d3 from 'd3';

export const svgKeyUp = function (d, t) {
  t.setState({pressedKey: null});
};

export const svgKeyDown = function (d, t) {
  // make sure repeated keyd presses don't register for each keydown
  if (t.state.pressedKey) return;
  t.setState({pressedKey: d3.event.keyCode});
  // this.lastKeyDown = d3.event.keyCode;
  // const selectedNode = this.selectedNode,
  //   selectedEdge = this.selectedEdge;
  //
  switch (d3.event.keyCode) {
  case constants.BACKSPACE_KEY:
  case constants.DELETE_KEY:
    d3.event.preventDefault();
    if (t.state.selectedPath) {
      removePath.call(this, t.state.selectedPath, t);
      t.setState({selectedPath: null});
    } else if (t.state.selectedNode) {
      delete_node.call(this, d, t);
      t.setState({selectedNode: null});

    }
    break;
  }
  t.updateGraphHelper();
};