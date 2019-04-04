import React, {Component} from 'react';
import {svgKeyDown, svgKeyUp} from './keyboardEvents';
import {deselect_path_and_nodes, initSimulation, updateGraph, zoom_actions} from './graphActions';
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


  componentDidMount() {
    const data = "eJy1Vk1v2zgQ/SsBz47Nb4o57u7Fh24LdJFLERhcibWFyJJWotMaQf/7DilZomxp220RI4jFkfTm8c2boT+9ohfbtHlVoge8xmSF9o2pD38YZ9ADImiF6sKcbdMHKARamzbWwYKhb6tXVFaZbWHF4VaRl8/+Wvg74e8TkhBX6AmuEvj/irIOSUP4aNJDXlqfCMPSFEX1xWbb0gfIGHh/8tmIz52XrTNlGl5hsD7VQDezf53rwIF4EnkGW1mhr+iBc7wWmEmiVSKVVmKFzhBlZM31+OErVIEGaVGlz+iBYHi3qm25y8tdW1QOcEkfqU4uhAJ+Xmb2a7h6AVCyFjxREiuKFaGMaHtPGNyCJxjoijHhgnIhqNAEEsK+i+xDU73knXhEAPGDaT9WpybtIl63tCqdAYWyrbPHEFVB815DkkxF1FciUnwtIiVTESm9FZGyXkQSRIQNgVxMU62BPKcqGVQUePxo9V0Z8Y2MZJCRdDLe8zXhGmOlE51QJQgRo5D3nZKYaChmwphiM0pSfq0kFXNKUhmUbMNjsPZyO9Psg7PVlUpqRqUEjR7wSI1N8zo8rbu+MEe/Yjj00KkxhV8F/VPfbYh57Q95lllYfTZFazvZGXQNgX7hTxGKr0lbW5v10sYYeVn3ivZePblpYCYJtIJv3J07B86Mj07aDQMBMRGF08K0bdervq9D/zHpO/spdPpTLAJTExGSiQh6FIHjeRFAUi/AJxmJwMnVexNBfkIE9Qsi6CBC6B9OpyJc6EY1k8CwMeVzaIK57S4kDjm8+7jnxj0T7p3KQ6wbqJd0+mKFMIG9Pi73dyhIDxOggZ5doX9OpnS5Oy9JgmfrDfegbTwsAUro49EWDgCHq9YX0bm6fdhsGvNlvc/d4fT3qYVxAH1nS7dOq+OmOVQpyH357p9a59XmaFpA2eTH/aY1rqqK9rNJXdWcd77c7aZPs67L/Zj07t3zGhwxCCAW+glHRhS+JkMhGls3tgV6xnWKCz4PQWIIcdXCsQsv77rmZH/Akx5b/pAJhVzqxJGYmhggGQzA/48B2KzXRwN436PfoSiwRV8iNFm9tRGiVL0Zosi1IST+j3nxE5VKfqFSQTZ/9tz9BuYFpncTpiRiR4dZMV8hspA1soKMfEnVgEdn8egcnmQTPD7icTHgse85KMITEzwZjUaJB0A+C8hnAScHjExGQD3iiaWzbwavq1BTlXfbcg8/TmDyKnw7YDs7KTI/KDhgvOuw7/4Er8BTnSnRdjq4aFR9RVFU8ZuhpNh8Lnrh+6Ewzga+PObbzYOer5jHkN9uOsiTmRj1JsBi7hJF7rrlrhZ/40wxeYyZoMhht5h6WfsJpogwE4wik91gJgv1FNeYMsYc6ybmMBfqJr1vJ2O4n60J9xZ8y/Hp7bIL9u6n56XeWzTlRK9O/DcnFTw8kmKB1LZb+OHz2F97Hz92l95528e4HtHJnMjFk7xrmveNfeOzKuwL0oRdPf0LLim7Rg==";
    this.loadGraphData(this.inflateGraphData(data));
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