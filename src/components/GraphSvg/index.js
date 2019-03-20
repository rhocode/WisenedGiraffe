import React, {Component} from 'react';
import {svgKeyDown, svgKeyUp} from './keyboardEvents';
import {svgMouseDown, svgMouseUp, dragmove} from './mouseEvents';
import {zoomed} from './graphActions';
import {appendMarkerAttributes} from './markerActions';
import {circleMouseDown, circleMouseUp} from './nodeActions';
import constants from './constants';

// import * as d3 from 'd3';

const d3 = window.d3;

class GraphSvg extends Component {
  constructor(props) {
    super(props);
    this.nodes = [];
    this.edges = [];
    this.justDragged = false;
    this.shiftNodeDrag = false;
    this.idct = 0;

    this.circles = [];

    this.mouseDownNode = null;
  }

  updateGraph() {
    console.log('UpdateGraph');
    const graphSvg = this;
    // thisGraph.paths = thisGraph.paths.data(thisGraph.edges, function (d) {
    //   return String(d.source.id) + '+' + String(d.target.id);
    // });
    //
    // var paths = thisGraph.paths;
    //
    // // update existing paths
    // paths.selectAll('path').classed(consts.selectedClass, function (d) {
    //   return d === state.selectedEdge;
    // }).attr('d', function (d) {
    //   return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
    // });
    //
    // // paths.select('.edge-label').each(function(d) {
    // //   thisGraph.calculateLabelPosition(d3.select(this.parentElement), d3.select(this));
    // // });
    //
    // paths.select('foreignObject.path-tooltip').each(function (d) {
    //   thisGraph.calculatePathTooltipPosition(d3.select(this));
    // });
    //
    // // add new paths
    // const pathObject = paths.enter().append('g');
    //
    // pathObject.append('path').style('marker-end', 'url(#end-arrow)').classed('link real-link', true).attr('d', function (d) {
    //   return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
    // }).attr('id', function (d) {
    //   return 'path-' + thisGraph.nodeNaming(d);
    // });
    //
    // pathObject.each(function (d) {
    //   thisGraph.insertEdgeLabel(d3.select(this));
    // });
    //
    // // Add a copy of the path to the front, but make it invisible
    // pathObject.append('path').classed('link hidden-hitbox', true).attr('d', function (d) {
    //   return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
    // }).on('mouseover', function (d) {
    //   d3.select('#path-' + thisGraph.nodeNaming(d)).classed('tooltip', true);
    // }).on('mouseout', function (d) {
    //   d3.select('#path-' + thisGraph.nodeNaming(d)).classed('tooltip', false);
    // }).on('mousedown', function (d) {
    //   thisGraph.pathMouseDown.call(thisGraph, d3, d3.select('#path-' + thisGraph.nodeNaming(d)), d);
    // }).on('mouseup', function (d) {
    //   state.mouseDownLink = null;
    // });
    //
    //
    // // remove old links
    // paths.exit().remove();

    // update existing nodes
    graphSvg.circles = graphSvg.circles.data(graphSvg.nodes, function (d) {
      return d.id;
    });

    graphSvg.circles.attr('transform', function (d) {
      console.log("TRANSLATED?", d.x, d.y);
      return 'translate(' + d.x + ',' + d.y + ')';
    });

    // add new nodes
    const newGs = graphSvg.circles.enter().append('g');

    newGs.classed(constants.graphNodeClass, true)
      .attr('id', function(d) {
        return constants.graphNodeIdBase+ d.id;
      })
      .attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      })
      .on('mouseover', function () {
        if (graphSvg.shiftNodeDrag) {
          d3.select(this).classed(constants.connectableClass, true);
        }
      }).on('mouseout', function () {
        d3.select(this).classed(constants.connectableClass, false);
      }).on('mousedown', function (d) {
        circleMouseDown.call(graphSvg, d3, d3.select(this), d);
      }).on('mouseup', function (d) {
        circleMouseUp.call(graphSvg, d3, d3.select(this), d);
      }).call(graphSvg.drag);

    newGs.append('circle').attr('r', String(constants.nodeRadius));

    // TODO: add back the icon
    // var images = newGs.append('svg:image')
    //   .attr('class', function (d) {
    //     if (d.machine && d.machine.icon) {
    //       return 'machine-icon';
    //     }
    //     return 'dev-icon';
    //   })
    //   .attr('xlink:href', function (d) {
    //     if (d.machine && d.machine.icon) {
    //       return d.machine.icon;
    //     }
    //     return 'https://i.imgur.com/oBmfK3w.png';
    //   })
    //   .attr('x', function (d) {
    //     return -50;
    //   })
    //   .attr('y', function (d) {
    //     return -50;
    //   })
    //   .attr('height', 100)
    //   .attr('width', 100);


    newGs.each(function (d) {
      // TODO: insert node title
      // thisGraph.insertNodeTitle(d3.select(this));
    });

    // remove old nodes
    graphSvg.circles.exit().remove();
  }

  createGraph(svg) {
    // Generate definitions for arrow markers
    const defs = svg.append('svg:defs');
    const graphSvgRef = this;

    appendMarkerAttributes(defs.append('svg:marker')
      .attr('id', 'path-end-arrow')
      .attr('refX', '32'));

    // define arrow markers for leading arrow
    appendMarkerAttributes(defs.append('svg:marker')
      .attr('id', 'dragged-end-arrow')
      .attr('refX', '7'));

    // Add the graph class attribute to the actual graph for easy access
    this.graph = svg.append('g').classed(constants.svgGraphClass, true);

    //The dragged line
    this.dragLine = this.graph.append('svg:path')
      .attr('class', 'link dragline hidden')
      .attr('d', 'M0,0L0,0')
      .style('marker-end', 'url(#dragged-end-arrow)');

    this.paths = this.graph.append('g').selectAll('g');
    this.circles = this.graph.append('g').selectAll('g');

    //Dragging functions
    this.drag = d3.behavior.drag().origin(function (d) {
      return {x: d.x, y: d.y};
    }).on('drag', function (args) {
      graphSvgRef.justDragged = true;
      dragmove.call(graphSvgRef, args, d3);
    }).on('dragend', function () {
      // ??
    });

    //key functions
    d3.select(window).on('keydown', function () {
      svgKeyDown.call(graphSvgRef);
    }).on('keyup', function () {
      svgKeyUp.call(graphSvgRef);
    });

    // Mouse functions
    svg.on('mousedown', function () {
      svgMouseDown.call(graphSvgRef);
    });
    svg.on('mouseup', function () {
      svgMouseUp.call(graphSvgRef, d3);
    });

    // listen for dragging
    const dragSvg = d3.behavior.zoom().on('zoom', function () {
      if (d3.event.sourceEvent.shiftKey) {
        // TODO  the internal d3 state is still changing
        return false;
      } else {
        zoomed.call(graphSvgRef, d3);
      }
      return true;
    }).on('zoomstart', function () {
      if (!d3.event.sourceEvent.shiftKey){
        d3.select('body').style('cursor', 'move');
      }
    }).on('zoomend', function () {
      d3.select('body').style('cursor', 'auto');
    });

    svg.call(dragSvg).on('dblclick.zoom', null);
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