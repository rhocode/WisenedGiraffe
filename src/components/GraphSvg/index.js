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