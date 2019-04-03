import React, {Component} from 'react';
import {svgKeyDown, svgKeyUp} from './keyboardEvents';
import {deselect_path_and_nodes, initSimulation, updateGraph, zoom_actions} from './graphActions';
import {appendMarkerAttributes} from './markerActions';

import * as d3 from 'd3';
import {add_node} from './nodeActions';
import {parse, stringify} from 'flatted/esm';
import JSONC from 'jsoncomp';
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

  clearGraphData() {
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
    console.log(this);
    const svg = d3.select('#mainRender');

    let id = 0;
    const graphData = {
      'nodes': [
        {'data':{'recipe':{'name':'Iron Ingot','inputs':[{'quantity':1,'item':{'name':'Iron Ore','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Ore.png','hidden':false,'id':1}}],'time':2,'power':4,'quantity':1,'hidden':false,'id':0,'machine_class':{'name':'Smelter','plural':'Smelters','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','hidden':false,'id':3},'item':{'name':'Iron Ingot','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Ingot.png','hidden':false,'id':4}}},'machine':{'name':'Smelter','plural':'Smelters','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','hidden':false,'id':3},'allowedIn':[1],'allowedOut':[4],'instance':{'name':'Smelter Mk.1','speed':100,'icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','input_slots':1,'output_slots':1,'hidden':false,'id':5,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.1','rank':0,'representation':'I','hidden':false,'id':1},'machine_class':{'name':'Smelter','plural':'Smelters','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','hidden':false,'id':3}},'upgradeTypes':[{'name':'Smelter Mk.1','speed':100,'icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','input_slots':1,'output_slots':1,'hidden':false,'id':5,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.1','rank':0,'representation':'I','hidden':false,'id':1},'machine_class':{'name':'Smelter','plural':'Smelters','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','hidden':false,'id':3}},{'name':'Smelter Mk.2','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','speed':100,'hidden':true,'input_slots':1,'output_slots':1,'id':6,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.2','rank':1,'representation':'II','hidden':false,'id':2},'machine_class':{'name':'Smelter','plural':'Smelters','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','hidden':false,'id':3}}],'id':3,'x':0,'y':0,'overclock':100,'open_in_slots':1,'open_out_slot':1,'index':1,'vy':0,'vx':0},
        {'data':{'recipe':{'name':'Iron Plate','inputs':[{'quantity':12,'item':{'name':'Iron Ingot','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Ingot.png','hidden':false,'id':4}}],'time':4,'power':4,'quantity':1,'hidden':false,'id':3,'machine_class':{'name':'Constructor','plural':'Constructors','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','hidden':false,'id':0},'item':{'name':'Iron Plate','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Plate.png','hidden':false,'id':6}}},'machine':{'name':'Constructor','plural':'Constructors','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','hidden':false,'id':0},'allowedIn':[4],'allowedOut':[6],'instance':{'name':'Constructor Mk.1','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','speed':100,'input_slots':1,'output_slots':1,'hidden':false,'id':7,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.1','rank':0,'representation':'I','hidden':false,'id':1},'machine_class':{'name':'Constructor','plural':'Constructors','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','hidden':false,'id':0}},'upgradeTypes':[{'name':'Constructor Mk.1','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','speed':100,'input_slots':1,'output_slots':1,'hidden':false,'id':7,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.1','rank':0,'representation':'I','hidden':false,'id':1},'machine_class':{'name':'Constructor','plural':'Constructors','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','hidden':false,'id':0}},{'name':'Constructor Mk.2','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','speed':100,'hidden':true,'input_slots':1,'output_slots':1,'id':8,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.2','rank':1,'representation':'II','hidden':false,'id':2},'machine_class':{'name':'Constructor','plural':'Constructors','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','hidden':false,'id':0}}],'id':3,'x':0,'y':0,'overclock':100,'open_in_slots':1,'open_out_slot':1,'index':3,'vy':0,'vx':0},
        {'data':{'recipe':{'hidden':false,'id':5,'machine_class':{'name':'Container','plural':'Containers','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Storage_Container_MK1.png','hidden':false,'id':6},'spring_type':{'name':'Container','hidden':false,'id':1}}},'machine':{'name':'Container','plural':'Containers','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Storage_Container_MK1.png','hidden':false,'id':6},'allowedIn':[],'allowedOut':[],'instance':{'name':'Container','speed':999999,'icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Storage_Container_MK1.png','input_slots':1,'output_slots':1,'hidden':false,'id':0,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.1','rank':0,'representation':'I','hidden':false,'id':1},'machine_class':{'name':'Container','plural':'Containers','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Storage_Container_MK1.png','hidden':false,'id':6}},'upgradeTypes':[{'name':'Container','speed':999999,'icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Storage_Container_MK1.png','input_slots':1,'output_slots':1,'hidden':false,'id':0,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.1','rank':0,'representation':'I','hidden':false,'id':1},'machine_class':{'name':'Container','plural':'Containers','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Storage_Container_MK1.png','hidden':false,'id':6}}],'id':3,'x':0,'y':0,'overclock':100,'open_in_slots':1,'open_out_slot':1,'index':0,'vy':0,'vx':0}
      ],
    };

    graphData.nodes.forEach(elem => {
      elem.id = (id++);
    });

    const getter = id => {
      return graphData.nodes[id];
    };

    graphData.links = [
      {'source': getter(0), 'target': getter(1)},
    ];

    // this.createGraph(svg, graphData.nodes, graphData.links);
    const data = "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";
    this.loadGraphData(this.inflateGraphData(data));
  }

  render() {
    return <svg id="mainRender"/>;
  }
}

export default GraphSvg;