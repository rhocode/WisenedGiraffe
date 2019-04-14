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