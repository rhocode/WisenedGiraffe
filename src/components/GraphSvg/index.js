import React, {Component} from 'react';
import {svgKeyDown, svgKeyUp} from './keyboardEvents';
import {svgMouseDown, svgMouseUp, dragmove, drag_start, drag_drag, drag_end} from './mouseEvents';
import {zoom_actions, zoomed} from './graphActions';
import {appendMarkerAttributes} from './markerActions';
import {
  circleMouseDown,
  circleMouseUp,
  nodeNaming,
  insertNodeTitlev2,
  addOverclockArc,
  editOverclockArc
} from './nodeActions';
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
  }

  createGraphV2(inputSvg) {
    let id = 0;
    this.graphData = {
      'nodes': [
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 98},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50},
        {'id': id++, 'x': 0, 'y': 0, 'overclock': 50}
      ],
      'links': [
        {'source':  0, 'target':  1},
        {'source':  1, 'target':  2},
        {'source':  2, 'target':  3},
        {'source':  0, 'target':  4},
        {'source':  1, 'target':  5},
        {'source':  4, 'target':  6},
        {'source':  6, 'target':  7},
        {'source':  7, 'target':  8},
        {'source':  8, 'target':  9},
        {'source':  9, 'target':  10},
      ]
    };

    var bodyEl = document.getElementById('mainRender');

    var width = bodyEl.clientWidth,
      height = bodyEl.clientHeight;

    var simulation = d3.forceSimulation()
      .nodes(this.graphData.nodes);

    simulation
      .force('link', d3.forceLink().id(function(d) {
        return d.id;
      }).distance(100).strength(1))
      .force('charge', d3.forceManyBody())
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(function(d) {
        return 100;
      }))
      .force('y', d3.forceY())
      .force('x', d3.forceX());

    simulation.force('link')
      .links(this.graphData.links);

    simulation
      .on('tick', ticked);

    //add encompassing group for the zoom
    const graphObjects = inputSvg.append('g')
      .attr('class', 'objects');

    //Create deffinition for the arrow markers showing relationship directions

    const defs = graphObjects.append('defs');
    appendMarkerAttributes(defs.append('svg:marker')
      .attr('id', 'default-path-arrow')
      .attr('refX', 35));

    appendMarkerAttributes(defs.append('svg:marker')
      .attr('id', 'dragged-end-arrow')
      .attr('refX', 35));

    var link = graphObjects.append('g')
      .attr('class', 'links')
      .selectAll('.line-objects')
      .data(this.graphData.links)
      .enter().append('line')
      .attr('stroke', function(d) { return d3.color('#000000'); })
      .attr('marker-end', 'url(#default-path-arrow)');

    const node_parent = graphObjects.append('g')
      .attr('class', 'nodes')
      .selectAll('.circle-objects')
      .data(this.graphData.nodes)
      .enter();


    const node = node_parent.append('g');
    node.append('circle')
      .attr('r', 50)
      .classed(constants.graphNodeClass, true);

    addOverclockArc(node, 'overclock', 55, 385);

    node.append('svg:image')
      .attr('class', function (d) {
        if (d.machine && d.machine.icon) {
          return 'machine-icon';
        }
        return 'dev-icon';
      })
      .attr('xlink:href', function (d) {
        // if (d.machine && d.machine.icon) {
        //   return d.machine.icon;
        // }
        return 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png';
        // return 'https://i.imgur.com/oBmfK3w.png';
      })
      .attr('x', function (d) {
        return -50;
      })
      .attr('y', function (d) {
        return -50;
      })
      .attr('height', 100)
      .attr('width', 100);


    insertNodeTitlev2(node);

    node.on('mouseover', function () {
      console.log('mouseover');
      // if (graphSvg.shiftNodeDrag) {
      d3.select(this).classed(constants.graphNodeHoverClass, true);
      // }
    }).on('mouseout', function () {
      console.log('mouseout');
      d3.select(this).classed(constants.graphNodeHoverClass, false);
    }).on('mousedown', function (d) {
      console.log('MouseDown');
      d3.select(this).classed(constants.graphNodeGrabbedClass, true);
    }).on('mouseup', function (d) {
      console.log('MouseUp');
      d3.select(this).classed(constants.graphNodeGrabbedClass, false);
      // circleMouseUp.call(graphSvg, d3, d3.select(this), d);
    });

    node.on('click', function (d) {
      d3.event.stopImmediatePropagation();
      // self.onNodeClicked.emit(d.id);
    });
    node.on('dblclick', function (d) {
      d3.event.stopImmediatePropagation();
      d.fx = null;
      d.fy = null;
    });

    node.on('wheel.zoom', function(d) {
      d3.event.stopImmediatePropagation();

      const roughEstimate = -1 * Math.round(d3.event.deltaY / 200);

      d.overclock = (d.overclock + (roughEstimate));
      if (d.overclock < 0) {
        d.overclock = 100 + d.overclock;
      } else if (d.overclock > 100) {
        d.overclock = d.overclock - 101;
      }
      console.log(d.overclock);
      editOverclockArc(d3.select(this), 'overclock', 55, 385)
    });

    const thisRef = this;
    //add drag capabilities
    this.drag_handler = d3.drag()
      .on('start', (d) => {
        console.log('DragStart');
        drag_start.call(this, d, simulation, d3);
      }).on('drag', (d) => {
        console.log('DragDrag');
        drag_drag.call(this, d, d3);
      }).on('end', function(d) {
        console.log('DragEnd');
        d3.select(this).classed(constants.graphNodeGrabbedClass, false);
        drag_end.call(thisRef, d);
      });
    this.drag_handler(node);

    //add zoom capabilities
    const zoom_handler = d3.zoom()
      .on('zoom', () => zoom_actions(graphObjects));
    zoom_handler(inputSvg);
    inputSvg.on('dblclick.zoom', null);

    function ticked() {
      //update circle positions each tick of the simulation
      const k = 150 * simulation.alpha();

      node
        .attr('transform', function (d) {
          return 'translate(' + d.x + ',' + d.y + ')';
        })
        .attr('cx', function(d) { return d.x; })
        .attr('cy', function(d) { return d.y; });

      //update link positions
      link
        .attr('x1', function(d) { return d.source.x; })
        .attr('y1', function(d) { return d.source.y; })
        .attr('x2', function(d) { return d.target.x; })
        .attr('y2', function(d) { return d.target.y; })
        .each(function(d) {
          d.source.vy -= k;
          d.target.vy += k;
        });

      // text
      //   .attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });
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