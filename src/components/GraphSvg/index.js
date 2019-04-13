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
    this.updateGraphHelper();
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