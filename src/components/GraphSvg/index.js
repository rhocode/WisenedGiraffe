import React, {Component} from 'react';
import {svgKeyDown, svgKeyUp} from './keyboardEvents';
import {svgMouseDown, svgMouseUp, dragmove} from './mouseEvents';
import {zoomed} from './graphActions';
import {appendMarkerAttributes} from './markerActions';
import {circleMouseDown, circleMouseUp, nodeNaming} from './nodeActions';
import constants from './constants';
import {calculatePathTooltipPosition, insertEdgeLabel, pathMouseDown} from './edgeActions';

import * as d3 from 'd3';

// const d3 = window.d3;

class GraphSvg extends Component {
  constructor(props) {
    super(props);
    this.nodes = [];
    this.edges = [];
    this.justDragged = false;
    this.shiftNodeDrag = false;
    this.idct = 0;

    this.circles = null;
    this.paths = null;

    this.mouseDownNode = null;
    this.mouseDownLink = null;
  }

  updateGraph() {
    const graphSvg = this;

    // Bind the path data
    graphSvg.paths = graphSvg.paths.data(graphSvg.edges, function (d) {
      return String(d.source.id) + '+' + String(d.target.id);
    });

    const paths = graphSvg.paths;


    // add new paths
    const pathObject = paths.enter().append('g');

    pathObject.append('path').style('marker-end', 'url(#path-end-arrow)').classed('link real-link', true).attr('d', function (d) {
      return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
    }).attr('id', function (d) {
      return 'path-' + nodeNaming(d);
    });

    //TODO: Should we add the label here or in tick?
    // pathObject.each(function () {
    //   insertEdgeLabel.call(graphSvg, d3.select(this));
    // });

    // Add a copy of the path to the front, but make it invisible
    pathObject.append('path').classed('link hidden-hitbox', true).attr('d', function (d) {
      return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
    }).on('mouseover', function (d) {
      d3.select('#path-' + nodeNaming(d)).classed('tooltip', true);
    }).on('mouseout', function (d) {
      d3.select('#path-' + nodeNaming(d)).classed('tooltip', false);
    }).on('mousedown', function (d) {
      pathMouseDown.call(graphSvg, d3, d3.select('#path-' + nodeNaming(d)), d);
    }).on('mouseup', function () {
      graphSvg.mouseDownLink = null;
    });


    // remove old links
    paths.exit().remove();

    // Bind the node data
    graphSvg.circles = graphSvg.circles.data(graphSvg.nodes, function (d) {
      return d.id;
    });

    graphSvg.circles.attr('transform', function (d) {
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

  tickGraph = () =>  {
    // const graphSvg = this;
    // const paths = graphSvg.paths;
    //
    // // update existing paths
    // paths.selectAll('path').classed(constants.selectedClass, function (d) {
    //   return d === graphSvg.selectedEdge;
    // }).attr('d', function (d) {
    //   return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
    // });
    //
    // // paths.select('.edge-label').each(function(d) {
    // //   thisGraph.calculateLabelPosition(d3.select(this.parentElement), d3.select(this));
    // // });
    //
    // paths.select('foreignObject.path-tooltip').each(function () {
    //   calculatePathTooltipPosition(d3.select(this), this);
    // });
    //
    //
    // d3.selectAll('.' + constants.graphNodeClass).attr('transform', function (d) {
    //   console.log(d);
    //   return 'translate(' + d.x + ',' + d.y + ')';
    // });


    // this.graphSvgRaw.selectAll("circle")

  };

  createGraph(svg) {
    // Generate definitions for arrow markers
    const defs = svg.append('svg:defs');
    const graphSvgRef = this;
    this.graphSvgRaw = svg;

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
      svgKeyDown.call(graphSvgRef, d3);
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

    const width = window.innerWidth, height = window.innerHeight;


    // this.force = d3.layout.force()
    //   .charge(-120)
    //   .linkDistance(30)
    //   .size([width, height]);
    //
    // this.force
    //   .nodes(this.nodes)
    //   .links(this.edges)
    //   .on('tick', this.tickGraph)
    //   .start();

    // Resize listener
    // window.addEventListener('resize', resize);
    //
    // function resize() {
    //   var width = window.innerWidth, height = window.innerHeight;
    //   svg.attr("width", width).attr("height", height);
    //   force.size([width, height]).resume();
    // }
  }

  createGraphV2(inSvg) {
    let id = 0;
    const graph = {
      'nodes': [
        {'id': id++, 'x': 0, 'y': 0},
        {'id': id++, 'x': 0, 'y': 0},
        {'id': id++, 'x': 0, 'y': 0},
        {'id': id++, 'x': 0, 'y': 0},
        {'id': id++, 'x': 0, 'y': 0},
        {'id': id++, 'x': 0, 'y': 0},
        {'id': id++, 'x': 0, 'y': 0},
        {'id': id++, 'x': 0, 'y': 0},
        {'id': id++, 'x': 0, 'y': 0},
        {'id': id++, 'x': 0, 'y': 0},
        {'id': id++, 'x': 0, 'y': 0},
        {'id': id++, 'x': 0, 'y': 0},
        {'id': id++, 'x': 0, 'y': 0}
      ],
      'links': [
        {'source':  0, 'target':  1},
        {'source':  1, 'target':  2},
        {'source':  2, 'target':  3},
        {'source':  0, 'target':  4},
        {'source':  1, 'target':  5},
        {'source':  4, 'target':  6},
        {'source':  6, 'target':  7},
        {'source':  7, 'target':  8}
      ]
    };

    var bodyEl = document.getElementById('mainRender');

    var width = bodyEl.clientWidth,
      height = bodyEl.clientHeight;

    var simulation = d3.forceSimulation()
      .nodes(graph.nodes);

    simulation
      .force('charge_force', d3.forceManyBody().strength(-120))
      .force('center_force', d3.forceCenter(width / 2, height / 2))
      .force('links', d3.forceLink(graph.links).id(function (d) { console.log(d.id); return d.id; }).distance(200).strength(1))
      .force('collide', d3.forceCollide().radius(2))
    ;

    simulation
      .on('tick', ticked);

    //add encompassing group for the zoom
    const g = inSvg.append('g')
      .attr('class', 'everything');

    //Create deffinition for the arrow markers showing relationship directions
    g.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -3 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');

    var link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graph.links)
      .enter().append('line')
      .attr('stroke', function(d) { return d3.color('#000000'); })
      .attr('marker-end', 'url(#arrow)');

    var node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(graph.nodes)
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('fill', function(d) {
        if (d.sourceOnly) return d3.color('#0000FF');

        return d3.color('#FFFF2F'); })
      .style('stroke', function(d) {
        if (d.sourceOnly) return d3.color('#000080');

        return d3.color('#FF8D2F');
      });

    //add drag capabilities
    var drag_handler = d3.drag()
      .on('start', drag_start)
      .on('drag', drag_drag)
      .on('end', drag_end);

    drag_handler(node);

    var text = g.append('g').attr('class', 'labels').selectAll('g')
      .data(graph.nodes)
      .enter().append('g')
      .append('text')
      .attr('x', 14)
      .attr('y', '.31em')
      .style('font-family', 'sans-serif')
      .style('font-size', '0.7em')
      .text(function (d) { return d.lotid; });

    // node.on('click', function (d) {
    //   d3.event.stopImmediatePropagation();
    //   self.onNodeClicked.emit(d.id);
    // });

    node.on('dblclick', function (d) {
      d3.event.stopImmediatePropagation();
      console.log('DOUBLE CLICKED ME!!', d);
      d.fx = null;
      d.fy = null;
    });

    node.append('title')
      .text(function (d) { return d.lotid; });

    //add zoom capabilities
    var zoom_handler = d3.zoom()
      .on('zoom', zoom_actions);

    zoom_handler(inSvg);

    //Drag functions
    //d is the node
    function drag_start(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    //make sure you can't drag the circle outside the box
    function drag_drag(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function drag_end(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      // d.fx = null;
      // d.fy = null;
    }

    //Zoom functions
    function zoom_actions(){
      g.attr('transform', d3.event.transform);
    }

    function ticked() {
      //update circle positions each tick of the simulation

      const k = 6 * simulation.alpha();

      graph.links.forEach(function(d, i) {
        d.source.y -= k;
        d.target.y += k;
      });

      node
        .attr('cx', function(d) { return d.x; })
        .attr('cy', function(d) { return d.y; });

      //update link positions
      link
        .attr('x1', function(d) { return d.source.x; })
        .attr('y1', function(d) { return d.source.y; })
        .attr('x2', function(d) { return d.target.x; })
        .attr('y2', function(d) { return d.target.y; });

      text
        .attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    }
  }

  componentDidMount() {
    const svg = d3.select('#mainRender');
    // this.createGraph(svg);
    this.createGraphV2(svg);
  }

  render() {
    return <svg id="mainRender"/>;
  }
}

export default GraphSvg;