import React, {Component} from 'react';
import {svgKeyDown, svgKeyUp} from './keyboardEvents';
import {svgMouseDown, svgMouseUp, dragmove, drag_start, drag_drag, drag_end,
  node_mouse_up, node_mouse_down, node_mouse_out, node_mouse_over, node_clicked} from './mouseEvents';
import {zoom_actions, zoomed, handleTick, updateGraph, initSimulation} from './graphActions';
import {appendMarkerAttributes} from './markerActions';
import {
  circleMouseDown,
  circleMouseUp,
  nodeNaming,
  insertNodeLevel,
  addOverclockArc,
  wheelZoomCalculation
} from './nodeActions';
import constants from './constants';
import {calculatePathTooltipPosition, insertEdgeLabel, pathMouseDown} from './edgeActions';

import * as d3 from 'd3';

// const d3 = window.d3;

class GraphSvg extends Component {
  constructor(props) {
    super(props);
    this.nodes = [];
    this.edges = [];
    this.justDragged = false;
    this.shiftNodeDrag = false;
    this.idct = 0;

    this.circles = null;
    this.paths = null;

    this.mouseDownNode = null;
    this.mouseDownLink = null;
  }

  createGraph(svg) {
    // Generate definitions for arrow markers
    const defs = svg.append('svg:defs');
    const graphSvgRef = this;
    this.graphSvgRaw = svg;

    appendMarkerAttributes(defs.append('svg:marker')
      .attr('id', 'path-end-arrow')
      .attr('refX', '32'));

    // define arrow markers for leading arrow
    appendMarkerAttributes(defs.append('svg:marker')
      .attr('id', 'dragged-end-arrow')
      .attr('refX', '7'));

    // Add the graph class attribute to the actual graph for easy access
    this.graph = svg.append('g').classed(constants.svgGraphClass, true);

    //The dragged line
    this.dragLine = this.graph.append('svg:path')
      .attr('class', 'link dragline hidden')
      .attr('d', 'M0,0L0,0')
      .style('marker-end', 'url(#dragged-end-arrow)');

    this.paths = this.graph.append('g').selectAll('g');
    this.circles = this.graph.append('g').selectAll('g');

    //Dragging functions
    this.drag = d3.behavior.drag().origin(function (d) {
      return {x: d.x, y: d.y};
    }).on('drag', function (args) {
      graphSvgRef.justDragged = true;
      dragmove.call(graphSvgRef, args, d3);
    }).on('dragend', function () {
      // ??
    });


    //key functions
    d3.select(window).on('keydown', function () {
      svgKeyDown.call(graphSvgRef, d3);
    }).on('keyup', function () {
      svgKeyUp.call(graphSvgRef);
    });

    // Mouse functions
    svg.on('mousedown', function () {
      svgMouseDown.call(graphSvgRef);
    });
    svg.on('mouseup', function () {
      svgMouseUp.call(graphSvgRef, d3);
    });

    // listen for dragging
    const dragSvg = d3.behavior.zoom().on('zoom', function () {
      if (d3.event.sourceEvent.shiftKey) {
        // TODO  the internal d3 state is still changing
        return false;
      } else {
        zoomed.call(graphSvgRef, d3);
      }
      return true;
    }).on('zoomstart', function () {
      if (!d3.event.sourceEvent.shiftKey){
        d3.select('body').style('cursor', 'move');
      }
    }).on('zoomend', function () {
      d3.select('body').style('cursor', 'auto');
    });

    svg.call(dragSvg).on('dblclick.zoom', null);

    const width = window.innerWidth, height = window.innerHeight;
  }

  createGraphV2(inputSvg) {
    let id = 0;
    this.graphData = {
      'nodes': [
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 98},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        // {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        // {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        // {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        // {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        // {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        // {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        // {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        // {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        // {'id': id++, 'x': 0, 'y': 0, 'overclock': 50}
      ],
      'links': [
        {'source':  0, 'target':  1},
        // {'source':  1, 'target':  2},
        // {'source':  2, 'target':  3},
        // {'source':  0, 'target':  4},
        // {'source':  1, 'target':  5},
        // {'source':  4, 'target':  6},
        // {'source':  6, 'target':  7},
        // {'source':  7, 'target':  8},
        // {'source':  8, 'target':  9},
        // {'source':  9, 'target':  10},
      ]
    };

    //add encompassing group for the zoom
    this.svgGroup = inputSvg.append('g')
      .attr('class', 'objects')
      .attr('id', 'svgGroup');

    const graphObjects = this.svgGroup;

    //add zoom capabilities
    const zoom_handler = d3.zoom()
      .on('zoom', () => zoom_actions(graphObjects));
    zoom_handler(inputSvg);
    inputSvg.on('dblclick.zoom', null);

    //Create definitions for the arrow markers showing relationship directions
    const defs = graphObjects.append('defs');
    appendMarkerAttributes(defs.append('svg:marker')
      .attr('id', 'default-path-arrow')
      .attr('refX', 35));

    appendMarkerAttributes(defs.append('svg:marker')
      .attr('id', 'dragged-end-arrow')
      .attr('refX', 7));

    //The dragged line
    this.dragLine = graphObjects.append('g').append('svg:path')
      .attr('class', 'link dragline line-object hidden')
      .attr('d', 'M0,0L0,0')
      .attr('stroke', function(d) { return d3.color('#000000'); })
      .style('marker-end', 'url(#dragged-end-arrow)');

    const graphLinksGroup =graphObjects.append('g') //graphLinksData
      .attr('class', 'links-g-group');

    const graphNodesGroup = graphObjects
      .append('g')
      .attr('class', 'nodes-g-group');

    let simulation = initSimulation();

    this.graphNodesGroup = graphNodesGroup;
    this.graphLinksGroup = graphLinksGroup;
    this.simulation = simulation;
    this.updateGraphHelper();
  }

  updateGraphHelper() {
    updateGraph.call(this, this.simulation, this.graphNodesGroup, this.graphLinksGroup);
  }

  componentDidMount() {
    const svg = d3.select('#mainRender');
    // this.createGraph(svg);
    this.createGraphV2(svg);
  }

  render() {
    return <svg id="mainRender"/>;
  }
}

export default GraphSvg;