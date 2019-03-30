import constants from './constants';
import * as d3 from 'd3';
import {
  addEfficiencyArc,
  addNodeImage,
  insertComponents,
  insertNodeOverclock,
  insertNodeTier,
  node_clicked,
  node_mouse_down,
  node_mouse_out,
  node_mouse_over,
  node_mouse_up,
  remove_select_from_nodes,
  wheelZoomCalculation
} from './nodeActions';
import {drag_drag, drag_end, drag_start} from './mouseEvents';
import {pathMouseClick, recalculateStorageContainers} from './edgeActions';

//v2
export const initSimulation = () => {
  const bodyEl = document.getElementById('mainRender');

  const width = bodyEl.clientWidth;
  const height = bodyEl.clientHeight;

  return d3.forceSimulation()
    .force('link', d3.forceLink().id(function (d) {
      return d.id;
    }).distance(50))
    .force('charge', d3.forceManyBody().strength(20))
    // .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(function (d) {
      return 120;
    }))
    .force('x', d3.forceX().strength(0.1).x(function(d){return width/2;}))
    .force('y', d3.forceY().strength(0.1).y(function(d){return height/2;}));
};

export const updateGraph = function (simulation, graphNodesGroup, graphLinksGroup) {
  const t = this;
  let nodes = this.graphData.nodes;
  let links = this.graphData.links;

  this.nodeIn = {};
  this.nodeOut = {};

  links.forEach(elem => {
    const outgoing = elem.source.id;
    const incoming = elem.target.id;
    this.nodeOut[outgoing] = this.nodeOut[outgoing] || [];
    this.nodeIn[incoming] = this.nodeIn[incoming] || [];

    this.nodeOut[outgoing].push(elem.target);
    this.nodeIn[incoming].push(elem.source);
  });

  nodes.forEach(node => {
    const input_slots = node.instance.input_slots;
    const output_slots = node.instance.output_slots;
    node.open_in_slots = input_slots - (t.nodeIn[node.id] || []).length;
    node.open_out_slot = output_slots - (t.nodeOut[node.id] || []).length;
  });

  recalculateStorageContainers.call(t);

  const drag = d3.drag()
    .clickDistance(10)
    .on('start', (d) => {
      drag_start.call(this, d, simulation, t);
    }).on('drag', (d) => {
      drag_drag.call(this, d, t);
    }).on('end', function (d) {
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
      .on('wheel.zoom', function (d) {
        wheelZoomCalculation.call(this, d);
      })
      .on('click', function (d) {
        d3.event.stopImmediatePropagation();
        node_clicked.call(this, d, t);
      // self.onNodeClicked.emit(d.id);
      }).on('dblclick', function (d) {
        d3.event.stopImmediatePropagation();
        remove_select_from_nodes(t);
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

  const callbacks = [];

  addEfficiencyArc(graphNodesEnter, 'overclock', 59, 322);
  addNodeImage(graphNodesEnter);
  insertNodeOverclock(graphNodesEnter);
  insertNodeTier(graphNodesEnter);
  insertComponents.call(t, graphNodesEnter);

  // merge
  graphNodesData =
    graphNodesEnter.merge(graphNodesData);

  // links
  let graphLinksData =
    graphLinksGroup
      .selectAll('.' + 'link-data-class')
      .data(links, function (d) {
        return d.source.id + '-' + d.target.id;
      });
  let graphLinksEnter =
    graphLinksData
      .enter()
      .append('g')
      .classed('link-data-class', true);

  let graphLinksExit =
    graphLinksData
      .exit()
      .remove();


  const linkFullObject = graphLinksEnter
    .append('g')
    .attr('id', function (d) {
      return 'path-parent' + d.source.id + '-' + d.target.id;
    });

  // apply styling to each selected line
  linkFullObject.append('line')
    .classed(constants.lineStylingPathClass, true)
    .classed(constants.lineStylingFullClass, true)
    .attr('display', 'none')
    .attr('stroke', 'orange')
    .attr('stroke-width', 10);
  linkFullObject.append('line')
    .classed(constants.lineStylingArrowClass, true)
    .classed(constants.lineStylingFullClass, true)
    .attr('display', 'none')
    .attr('stroke', null)
    .attr('marker-end', 'url(#highlight-path-arrow-orange)')
    .attr('stroke-width', 3);


  linkFullObject
    .append('line')
    .classed(constants.lineObjectClass, true)
    .attr('stroke', function (d) {
      return d3.color('#000000');
    })
    .attr('marker-end', 'url(#default-path-arrow)');

  // apply styling to each selected line
  linkFullObject
    .append('line')
    .classed(constants.lineHitboxObjectClass, true)
    .on('mouseover', function (d) {
    }).on('mouseout', function (d) {
    }).on('click', function (d) {
      pathMouseClick.call(this, d, t);
    });

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
  // simulation
  // .force('link', d3.forceLink().links(forceLinks))
  // experiment: weights>
  // t.linkWeights = {}
  // links.forEach(elem => {
  //   t.linkWeights[elem.target.id] = t.linkWeights[elem.target.id] + 1 || 1;
  //   // t.linkWeights[elem.source.id] = t.linkWeights[elem.source.id] + 1 || 1;
  // })
  //
  // simulation.force('charge', d3.forceManyBody().strength(function(d) {
  //   return 20 - (20 * t.linkWeights[d.id]);
  // }));
  callbacks.forEach(callback => callback());
  simulation.alphaTarget(0.3).restart();
};

export const deselect_path_and_nodes = function (t) {
  t.setState({selectedPath: null, selectedNode: null});
  d3.selectAll('.' + constants.lineStylingFullClass).attr('display', 'none');
  remove_select_from_nodes(t);
};

export const zoom_actions = (graphObjects) => {
  graphObjects.attr('transform', d3.event.transform);
};

export const handleTick = function (graphNodesData, graphLinksData, simulation) {
  //update circle positions each tick of the simulation
  const k = 100 * simulation.alpha();
  graphNodesData
    .attr('transform', function (d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    })
    .attr('cx', function (d) {
      return d.x;
    })
    .attr('cy', function (d) {
      return d.y;
    });

  //update link positions
  graphLinksData.selectAll('line')
    .attr('x1', function (d) {
      return d.source.x;
    })
    .attr('y1', function (d) {
      return d.source.y;
    })
    .attr('x2', function (d) {
      return d.target.x;
    })
    .attr('y2', function (d) {
      return d.target.y;
    });

  graphLinksData.selectAll('.' + constants.lineObjectClass)
    .each(function (d) {
      d.source.vx += k;
      d.target.vx -= k;
    });
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