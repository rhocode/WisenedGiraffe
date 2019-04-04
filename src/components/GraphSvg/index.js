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