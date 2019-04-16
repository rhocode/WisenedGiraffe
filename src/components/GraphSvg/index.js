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