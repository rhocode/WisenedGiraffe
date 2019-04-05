import React, {Component} from 'react';
import {svgKeyDown, svgKeyUp} from './keyboardEvents';
import {deselect_path_and_nodes, initSimulation, updateGraph, zoom_actions, analyzeGraph} from './graphActions';
import {appendMarkerAttributes} from './markerActions';

import * as d3 from 'd3';
import {add_node} from './nodeActions';
import {parse, stringify} from 'flatted/esm';
import pako from 'pako';
import Base64 from 'Base64';

const styles = theme => ({
  tooltip: {
    position: 'absolute',
    textAlign: 'center',
    padding: 2,
    font: '12px sans-serif',
    background: 'lightsteelblue',
    border: 0,
    borderRadius: 8,
    pointerEvents: 'none',
    zIndex: 1202
  }
});

class GraphSvg extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  addNode(nodeData) {
    add_node(nodeData, this);
    console.log(JSON.stringify(nodeData));
  }

  resetCamera() {
    this.inputSvg.transition()
      .duration(750)
      .call(this.zoom_handler.transform, d3.zoomIdentity);

    this.updateGraphHelper();
  }

  jiggle() {
    this.graphData.nodes.forEach(node => {
      node.x = 0;
      node.y = 0;
    });

    this.updateGraphHelper();
  }

  fixNodes() {
    this.graphData.nodes.forEach(node => {
      node.fx = node.x;
      node.fy = node.y;
    });

    this.updateGraphHelper();
  }

  unfixNodes() {
    this.graphData.nodes.forEach(node => {
      node.fx = null;
      node.fy = null;
      node.vx = 0;
      node.vy  = 0;
    });

    this.updateGraphHelper();
  }

  createGraph(inputSvg, nodes = [], links = [], data = {}) {
    this.graphData = {
      nodes: nodes,
      links: links
    };

    this.id = Math.max(...(this.graphData.nodes.map(elem => elem.id))) + 1;
    if (this.id === Number.NEGATIVE_INFINITY) {
      this.id = 0;
    }
    this.inputSvg = inputSvg;

    //add encompassing group for the zoom
    this.svgGroup = inputSvg.append('g')
      .attr('class', 'objects')
      .attr('id', 'svgGroup');

    const graphObjects = this.svgGroup;

    const t = this;

    inputSvg.on('click', function (d) {
      deselect_path_and_nodes.call(this, t);
    });

    d3.select(window).on('keydown', function (d) {
      svgKeyDown.call(this, d, t);
    }).on('keyup', function (d) {
      svgKeyUp.call(this, d, t);
    });

    //add zoom capabilities
    this.zoom_handler = d3.zoom()
      .on('zoom', () => zoom_actions(graphObjects))
      .scaleExtent([0.1, 6]);
    this.zoom_handler(inputSvg);
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

    const filter = defs.append('filter')
      .attr('id', 'drop-shadow')
      .attr('height', '130%')
      .attr('width', '130%')
      .attr('filterUnits', 'userSpaceOnUse');

    filter.append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', 5)
      .attr('result', 'blur');

    filter.append('feOffset')
      .attr('in', 'blur')
      .attr('result', 'offsetBlur');

    filter.append('feFlood')
      .attr('in', 'offsetBlur')
      .attr('flood-color','white')
      .attr('flood-opacity', '1')
      .attr('result', 'offsetColor');

    filter.append('feComposite')
      .attr('in', 'offsetColor')
      .attr('in2', 'offsetBlur')
      .attr('operator', 'in')
      .attr('result', 'offsetBlur');

    const feMerge = filter.append('feMerge');

    feMerge.append('feMergeNode')
      .attr('in', 'offsetBlur');
    feMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');


    //The dragged line
    this.dragLine = graphObjects.append('g').append('svg:path')
      .attr('class', 'link dragline line-object hidden')
      .attr('d', 'M0,0L0,0')
      .attr('stroke', function (d) {
        return d3.color('#000000');
      })
      .style('marker-end', 'url(#dragged-end-arrow)');

    const graphLinksGroup = graphObjects.append('g') //graphLinksData
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

  clearGraphDataRaw() {
    const parent = d3.select(d3.select('#mainRender').node().parentElement);
    d3.select('#mainRender').selectAll('*').remove();
    d3.select('#mainRender').remove();

    return parent.append('svg').attr('id', 'mainRender');
  }

  clearGraphData(t) {
    deselect_path_and_nodes.call(this, t);
    const svg = this.clearGraphDataRaw();
    this.createGraph(svg);
  }

  loadGraphData(data) {
    const svg = this.clearGraphDataRaw();
    //nodes, links, data
    this.createGraph(svg, data.graphData.nodes, data.graphData.links);
  }

  compressGraphData() {
    const compressedData = {
      version: 0.01,
      graphData: this.graphData,
      playerData: {},
      secret: {}
    };
    return Base64.btoa(pako.deflate(stringify(compressedData), { to: 'string' }));
  }

  inflateGraphData(data) {
    return parse(pako.inflate(Base64.atob(data),  { to: 'string' }));
  }

  analyze = () =>  {
    analyzeGraph.call(this);
  };

  componentDidMount() {
    const data = "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";
    this.loadGraphData(this.inflateGraphData(data));
    this.analyze();
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.state.selectedPath !== prevState.selectedPath || this.state.selectedNode !== prevState.selectedNode) {
      this.props.parentAccessor.setState({selectedPath: this.state.selectedPath, selectedNode: this.state.selectedNode});
    }
  }

  render() {
    return <svg id="mainRender"/>;
  }
}

export default GraphSvg;