import constants from './constants';
import {delete_node} from './nodeActions';
import {removePath} from './edgeActions';

import * as d3 from 'd3';

export const svgKeyUp = function (d, t) {
    t.setState({pressedKey: null});
};

export const svgKeyDown = function (d, t) {
    // make sure repeated keyd presses don't register for each keydown
    if (document.activeElement && document.activeElement.nodeName === 'INPUT') return;
    if (t.state.pressedKey) return;
    t.setState({pressedKey: d3.event.keyCode});
    // this.lastKeyDown = d3.event.keyCode;
    // const selectedNode = this.selectedNode,
    //   selectedEdge = this.selectedEdge;
    //
    switch (d3.event.keyCode) {
        case constants.BACKSPACE_KEY:
        case constants.DELETE_KEY:
            if (t.state.selectedPath) {
                removePath.call(this, t.state.selectedPath, t);
                t.setState({selectedPath: null});
                t.updateGraphHelper();
            } else if (t.state.selectedNode) {
                delete_node.call(this, d, t);
                t.setState({selectedNode: null});
                t.updateGraphHelper();
            }
            break;
    }
};