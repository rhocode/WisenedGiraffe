import React, {Component} from 'react';
import {svgKeyDown, svgKeyUp} from './keyboardEvents';
import {svgMouseDown, svgMouseUp, dragmove, drag_start, drag_drag, drag_end,
  node_mouse_up, node_mouse_down, node_mouse_out, node_mouse_over, node_clicked} from './mouseEvents';
import {zoom_actions, zoomed, handleTick, updateGraph, initSimulation, deselect_path_and_nodes} from './graphActions';
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
    this.state = {};
  }

  createGraphV2(inputSvg) {
    let id = 0;
    this.graphData = {
      'nodes': [
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 98},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
      ],
    };

    const getter = id => {
      return this.graphData.nodes[id];
    };

    this.graphData.links = [
      {'source':  getter(0), 'target':  getter(1)},
      {'source':  getter(1), 'target':  getter(2)},
      {'source':  getter(2), 'target':  getter(0)},
    ];

    this.graphData.forceLinks = [
      {'source':  0, 'target':  1},
      {'source':  1, 'target':  2},
      {'source':  2, 'target':  0},
    ];

    //add encompassing group for the zoom
    this.svgGroup = inputSvg.append('g')
      .attr('class', 'objects')
      .attr('id', 'svgGroup');

    const graphObjects = this.svgGroup;

    const t = this;
    inputSvg.on('click', function(d) {
      deselect_path_and_nodes.call(this, t);
    });

    d3.select(window).on('keydown', function(d) {
      svgKeyDown.call(this, d, t);
    }).on('keyup', function(d) {
      svgKeyUp.call(this, d, t);
    });

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
      .attr('id', 'highlight-path-arrow-orange')
      .attr('fill', 'orange')
      .attr('refX', 24));

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
    console.log("Graph helper called");
  }

  componentDidMount() {
    const svg = d3.select('#mainRender');
    // this.createGraph(svg);
    this.createGraphV2(svg);
  }

  render() {
    console.log(this.state.selectedNode, this.state.selectedPath);
    return <svg id="mainRender"/>;
  }
}

export default GraphSvg;