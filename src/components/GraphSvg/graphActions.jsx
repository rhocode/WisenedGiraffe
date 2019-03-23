import constants from './constants';
import * as d3 from 'd3';
import {addOverclockArc, insertNodeLevel, wheelZoomCalculation, addNodeImage} from './nodeActions';
import {
  drag_drag,
  drag_end,
  drag_start, node_clicked,
  node_mouse_down,
  node_mouse_out,
  node_mouse_over,
  node_mouse_up
} from './mouseEvents';

//v2

export const initSimulation = () => {
  const bodyEl = document.getElementById('mainRender');

  const width = bodyEl.clientWidth;
  const height = bodyEl.clientHeight;

  return d3.forceSimulation()
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
};

export const updateGraph = function(simulation, graphNodesGroup, graphLinksGroup) {
  const t = this;
  console.log(this);
  let nodes = this.graphData.nodes;
  let links  = this.graphData.links;

  const drag =  d3.drag()
    .clickDistance(10)
    .on('start', (d) => {
      console.log('DragStart');
      drag_start.call(this, d, simulation, t);
    }).on('drag', (d) => {
      console.log('DragDrag');
      drag_drag.call(this, d, t);
    }).on('end', function(d) {
      console.log('DragEnd');
      d3.event.sourceEvent.stopImmediatePropagation();
      drag_end.call(this, d, t, simulation);
    });

  let graphNodesData =
    graphNodesGroup
      .selectAll('.' + 'node-data-class')
      .data(nodes, d => d.id);

  let graphNodesEnter =
    graphNodesData
      .enter()
      .append('g')
      .classed('node-data-class', true)
      .attr('id', d => d.id || null)
      // .on('contextmenu', (d, i)  => {
      //   t.remove(d);
      //   d3.event.preventDefault();
      // })
      // .on('mouseover', d => console.log(`d.id: ${d.id}`))
      // .on('click', d => t.handleNodeClicked(d))
      .on('wheel.zoom', function(d) {
        wheelZoomCalculation.call(this, d);
      })
      .on('click', function (d) {
        d3.event.stopImmediatePropagation();
        node_clicked.call(this, d, t);
        // self.onNodeClicked.emit(d.id);
      }).on('dblclick', function (d) {
        d3.event.stopImmediatePropagation();
        d.fx = null;
        d.fy = null;
      }).on('mouseover', function (d) {
        node_mouse_over.call(this, d, t);
      }).on('mouseout', function (d) {
        node_mouse_out.call(this, d, t);
      }).on('mousedown', function (d) {
        node_mouse_down.call(this, d, t);
      }).on('mouseup', function (d) {
        node_mouse_up.call(this, d, t);
      }).call(drag);

  let graphNodesExit =
    graphNodesData
      .exit()
      .remove();

  let graphNodeCircles =
    graphNodesEnter
      .append('circle')
      .classed(constants.graphNodeClass, true)
      .attr('cursor', 'pointer')
      .attr('r', d => 50);

  insertNodeLevel(graphNodesEnter);
  addOverclockArc(graphNodesEnter, 'overclock', 55, 330);
  addNodeImage(graphNodesEnter);


  // merge
  graphNodesData =
    graphNodesEnter.merge(graphNodesData);

  // links
  let graphLinksData =
    graphLinksGroup
      .selectAll('.' + 'link-data-class')
      .data(links);
  let graphLinksEnter =
    graphLinksData
      .enter()
      .append('g')
      .classed('link-data-class', true);

  let graphLinksExit =
    graphLinksData
      .exit()
      .remove();

  let graphNodeLinks =
    graphLinksEnter
      .append('line')
      .classed(constants.lineObjectClass, true)
      .attr('stroke', function(d) { return d3.color('#000000'); })
      .attr('marker-end', 'url(#default-path-arrow)');

  // merge
  graphLinksData =
    graphLinksEnter.merge(graphLinksData);

  simulation
    .nodes(nodes)
    .on('tick', () => {
      handleTick.call(this, graphNodesData, graphLinksData, simulation);
    })
    .on('end', () => {
      console.log('Simulation Ended!');
    });

  simulation
    .force('link')
    .links(links);
};


export const zoom_actions = (graphObjects) => {
  graphObjects.attr('transform', d3.event.transform);
};

export const handleTick = function(graphNodesData, graphLinksData, simulation) {
  //update circle positions each tick of the simulation
  const k = 150 * simulation.alpha();
  graphNodesData
    .attr('transform', function (d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    })
    .attr('cx', function(d) { return d.x; })
    .attr('cy', function(d) { return d.y; });

  //update link positions
  graphLinksData.selectAll('line')
    .attr('x1', function(d) { return d.source.x; })
    .attr('y1', function(d) { return d.source.y; })
    .attr('x2', function(d) { return d.target.x; })
    .attr('y2', function(d) { return d.target.y; })
    .each(function(d) {
      d.source.vy -= k;
      d.target.vy += k;
    });
};






//v1

export const zoomed = function (d3) {
  this.justScaleTransGraph = true;
  d3.select('.' + constants.svgGraphClass)
    .attr('transform', 'translate(' + d3.event.translate + ') scale(' + d3.event.scale + ')');
};

//
// addResourceIcon(parentElement) {
//   const s = this.structures;
//   const requirements = parentElement.datum().requires ? parentElement.datum().requires.length : 0;
//   for (let i = 0; i < requirements; i++) {
//     //Text First
//     const input = parentElement.append('text').text(function (d) {
//       const resource = s.ITEMS.get[d.requires[i].resource];
//
//       return resource.name;
//     })
//     .attr('y', function (d) {
//       return 65 + (20 * i);
//     })
//     .attr('x', function (d) {
//       return 15 / 2;
//     });
//     const bound = input.node().getBBox();
//
//     parentElement.append('svg:image')
//     .attr('class', function (d) {
//       if (d.machine && d.machine.icon) {
//         return 'machine-icon';
//       }
//       return 'dev-icon';
//     })
//     .attr('xlink:href', function (d) {
//       const resource = s.ITEMS.get[d.requires[i].resource];
//       if (resource && resource.icon) {
//         return resource.icon;
//       }
//       return 'https://i.imgur.com/oBmfK3w.png';
//     })
//     .attr('x', function (d) {
//       return bound.x - 15;
//     })
//     .attr('y', function (d) {
//       return bound.y + 1;
//     })
//     .attr('height', 15)
//     .attr('width', 15);
//   }
//
//   // ========================
//   //Text First
//   if (requirements == 0) {
//     const input = parentElement.append('text').text(function (d) {
//       // const resource = s.ITEMS.get[d.requires[i].resource];
//       return round(60 / d.produces.time * d.produces.quantity) + '/min';
//       // return resource.name;
//     })
//     .attr('y', function (d) {
//       return 65;
//     })
//     .attr('x', function (d) {
//       return 15 / 2;
//     });
//     const input_bound = input.node().getBBox();
//
//     parentElement.append('svg:image')
//     .attr('class', function (d) {
//       if (d.machine && d.machine.icon) {
//         return 'machine-icon';
//       }
//       return 'dev-icon';
//     })
//     .attr('xlink:href', function (d) {
//       const resource = s.ITEMS.get[d.produces.name];
//       if (resource && resource.icon) {
//         return resource.icon;
//       }
//       return 'https://i.imgur.com/oBmfK3w.png';
//     })
//     .attr('x', function (d) {
//       return input_bound.x - 15;
//     })
//     .attr('y', function (d) {
//       return input_bound.y + 1;
//     })
//     .attr('height', 15)
//     .attr('width', 15);
//   }
// //===================================