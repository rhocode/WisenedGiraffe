import {addPath} from './edgeActions';
import * as d3 from 'd3';
import constants from './constants';

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

const round_up = function (x, factor) {
    return Math.round(x / factor) * factor;
};

export const drag_end = (d, graphSvg, simulation) => {
    if (graphSvg.state && graphSvg.state.shiftHeld) {
        if (graphSvg.state.mouseOverNode) {
            const source = graphSvg.state.mouseDragSource;
            const target = graphSvg.state.mouseOverNode;
            addPath.call(this, graphSvg, graphSvg.state.mouseDragSource, graphSvg.state.mouseOverNode);
        }
        graphSvg.dragLine.classed('hidden', true).attr('d', 'M0,0L0,0');
    } else {
        if (graphSvg.state && graphSvg.state.wasMoved) {
            d.x = d.fx;
            d.y = d.fy;

            if (graphSvg.state.snapToGrid) {
                if (d.fx) {
                    d.fx = round_up(d.fx, 100);
                    d.fy = round_up(d.fy, 100);
                }
            }
        } else if (graphSvg.state && !graphSvg.state.wasFixed) {
            d.fx = null;
            d.fy = null;
        }
    }
    d3.select('.' + constants.graphNodeGrabbedClass).classed(constants.graphNodeGrabbedClass, false);
    graphSvg.setState({shiftHeld: false, wasMoved: false, wasFixed: false});
};