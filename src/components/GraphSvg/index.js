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