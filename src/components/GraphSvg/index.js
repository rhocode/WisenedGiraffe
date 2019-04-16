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