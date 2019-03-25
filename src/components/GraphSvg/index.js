import React, {Component} from 'react';
import {svgKeyDown, svgKeyUp} from './keyboardEvents';
import {node_clicked, node_mouse_down, node_mouse_out, node_mouse_over, node_mouse_up} from './mouseEvents';
import {deselect_path_and_nodes, initSimulation, updateGraph, zoom_actions} from './graphActions';
import {appendMarkerAttributes} from './markerActions';
import {withStyles} from '@material-ui/core';

import * as d3 from 'd3';
import {add_node} from './nodeActions';

// const d3 = window.d3;

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
    });

    this.updateGraphHelper();
  }

  createGraph(inputSvg) {
    this.id = 0;
    this.graphData = {
      'nodes': [
        {'data':{'recipe':{'name':'Iron Ingot','inputs':[{'quantity':1,'item':{'name':'Iron Ore','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Ore.png','hidden':false,'id':1}}],'time':2,'power':4,'quantity':1,'hidden':false,'id':0,'machine_class':{'name':'Smelter','plural':'Smelters','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','hidden':false,'id':3},'item':{'name':'Iron Ingot','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Ingot.png','hidden':false,'id':4}}},'machine':{'name':'Smelter','plural':'Smelters','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','hidden':false,'id':3},'allowedIn':[1],'allowedOut':[4],'instance':{'name':'Smelter Mk.1','speed':100,'icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','input_slots':1,'output_slots':1,'hidden':false,'id':4,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.1','rank':0,'hidden':false,'id':1},'machine_class':{'name':'Smelter','plural':'Smelters','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','hidden':false,'id':3}},'upgradeTypes':[{'name':'Smelter Mk.1','speed':100,'icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','input_slots':1,'output_slots':1,'hidden':false,'id':4,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.1','rank':0,'hidden':false,'id':1},'machine_class':{'name':'Smelter','plural':'Smelters','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','hidden':false,'id':3}},{'name':'Smelter Mk.2','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','speed':100,'hidden':true,'input_slots':1,'output_slots':1,'id':5,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.2','rank':1,'hidden':false,'id':2},'machine_class':{'name':'Smelter','plural':'Smelters','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png','hidden':false,'id':3}}],'id':2,'x':0,'y':0,'overclock':100},
        {'data':{'recipe':{'name':'Iron Plate','inputs':[{'quantity':12,'item':{'name':'Iron Ingot','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Ingot.png','hidden':false,'id':4}}],'time':4,'power':4,'quantity':1,'hidden':false,'id':2,'machine_class':{'name':'Constructor','plural':'Constructors','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','hidden':false,'id':0},'item':{'name':'Iron Plate','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Plate.png','hidden':false,'id':6}}},'machine':{'name':'Constructor','plural':'Constructors','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','hidden':false,'id':0},'allowedIn':[4],'allowedOut':[6],'instance':{'name':'Constructor Mk.1','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','speed':100,'input_slots':1,'output_slots':1,'hidden':false,'id':6,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.1','rank':0,'hidden':false,'id':1},'machine_class':{'name':'Constructor','plural':'Constructors','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','hidden':false,'id':0}},'upgradeTypes':[{'name':'Constructor Mk.1','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','speed':100,'input_slots':1,'output_slots':1,'hidden':false,'id':6,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.1','rank':0,'hidden':false,'id':1},'machine_class':{'name':'Constructor','plural':'Constructors','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','hidden':false,'id':0}},{'name':'Constructor Mk.2','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','speed':100,'hidden':true,'input_slots':1,'output_slots':1,'id':7,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.2','rank':1,'hidden':false,'id':2},'machine_class':{'name':'Constructor','plural':'Constructors','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Constructor.png','hidden':false,'id':0}}],'id':3,'x':0,'y':0,'overclock':100},
        {'overclock':100, 'data':{'recipe':{'hidden':false,'id':4,'machine_class':{'name':'Container','plural':'Containers','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Storage_Container_MK1.png','hidden':false,'id':6},'spring_type':{'name':'Container','hidden':false,'id':1}}},'machine':{'name':'Container','plural':'Containers','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Storage_Container_MK1.png','hidden':false,'id':6},'allowedIn':[],'allowedOut':[],'instance':{'name':'Container','speed':999999,'icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Storage_Container_MK1.png','input_slots':1,'output_slots':1,'hidden':false,'id':0,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.1','rank':0,'hidden':false,'id':1},'machine_class':{'name':'Container','plural':'Containers','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Storage_Container_MK1.png','hidden':false,'id':6}},'upgradeTypes':[{'name':'Container','speed':999999,'icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Storage_Container_MK1.png','input_slots':1,'output_slots':1,'hidden':false,'id':0,'node_type':{'name':'Machine Node','hidden':false,'id':0},'machine_version':{'name':'Mk.1','rank':0,'hidden':false,'id':1},'machine_class':{'name':'Container','plural':'Containers','icon':'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Storage_Container_MK1.png','hidden':false,'id':6}}]}
      ],
    };
    this.inputSvg = inputSvg;
    this.graphData.nodes.forEach(elem => {
      elem.id = (this.id++);
    });

    const getter = id => {
      return this.graphData.nodes[id];
    };

    this.graphData.links = [
      {'source': getter(0), 'target': getter(1)},
    ];

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

  componentDidMount() {
    const svg = d3.select('#mainRender');
    this.createGraph(svg);
  }

  render() {
    return <svg id="mainRender"/>;
  }
}

export default GraphSvg;

// export default withStyles(styles)(GraphSvg);