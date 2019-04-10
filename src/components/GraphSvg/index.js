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