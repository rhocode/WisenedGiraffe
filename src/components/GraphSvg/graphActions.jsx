import constants from './constants';
import * as d3 from 'd3';
import {addOverclockArc, insertNodeTitlev2, wheelZoomCalculation} from "./nodeActions";
import {
  drag_drag,
  drag_end,
  drag_start, node_clicked,
  node_mouse_down,
  node_mouse_out,
  node_mouse_over,
  node_mouse_up
} from "./mouseEvents";

//v2
export const updateGraph = function() {
  //
  // //
  // // this.link = this.links.enter().append('g')
  // //   .attr('class', 'parent-line-object')
  // //   .append('line') // graphLinksEnter
  // //   .attr('class', 'line-object')
  // //   .attr('stroke', function(d) { return d3.color('#000000'); })
  // //   .attr('marker-end', 'url(#default-path-arrow)');
  // //
  // // this.links
  // //   .exit()
  // //   .remove();
  // // this.links = this.link.merge(this.links);
  //
  //
  //
  //
  //
  // this.node = graphLinksGroup.append('g');
  // this.node.append('circle')
  // .attr('r', 50)
  // .classed(constants.graphNodeClass, true);
  //
  //
  //
  //
  //
  // //Add nodes
  // simulation
  // .nodes(this.graphData.nodes);
  //
  // //Add links
  // simulation
  //
  // simulation.force('link')
  // .links(this.graphData.links);
  //
  // simulation
  // .on('tick', () => handleTick.call(this, this.node, this.links, simulation));
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  // addOverclockArc(this.node, 'overclock', 55, 385);
  //
  // this.node.append('svg:image')
  // .attr('class', function (d) {
  //   if (d.machine && d.machine.icon) {
  //     return 'machine-icon';
  //   }
  //   return 'dev-icon';
  // })
  // .attr('xlink:href', function (d) {
  //   // if (d.machine && d.machine.icon) {
  //   //   return d.machine.icon;
  //   // }
  //   return 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png';
  //   // return 'https://i.imgur.com/oBmfK3w.png';
  // })
  // .attr('x', function (d) {
  //   return -50;
  // })
  // .attr('y', function (d) {
  //   return -50;
  // })
  // .attr('height', 100)
  // .attr('width', 100);
  //
  //
  // insertNodeTitlev2(this.node);
  //
  // const graphSvgClass = this;
  // this.node.on('mouseover', function (d) {
  //   node_mouse_over.call(this, d, graphSvgClass);
  // }).on('mouseout', function (d) {
  //   node_mouse_out.call(this, d, graphSvgClass);
  // }).on('mousedown', function (d) {
  //   node_mouse_down.call(this, d, graphSvgClass);
  // }).on('mouseup', function (d) {
  //   node_mouse_up.call(this, d, graphSvgClass);
  // });
  //
  // //add drag capabilities
  // this.drag_handler = d3.drag()
  // // .clickDistance(10)
  // .on('start', (d) => {
  //   console.log('DragStart');
  //   drag_start.call(this, d, simulation, graphSvgClass);
  // }).on('drag', (d) => {
  //   drag_drag.call(this, d, graphSvgClass);
  // }).on('end', function(d) {
  //   d3.event.sourceEvent.stopImmediatePropagation();
  //   drag_end.call(this, d, graphSvgClass, simulation);
  // });
  // this.drag_handler(this.node);
  //
  //
  // this.node.on('click', function (d) {
  //   d3.event.stopImmediatePropagation();
  //   node_clicked.call(this, d, graphSvgClass);
  //   // self.onNodeClicked.emit(d.id);
  // });
  //
  // this.node.on('dblclick', function (d) {
  //   d3.event.stopImmediatePropagation();
  //   d.fx = null;
  //   d.fy = null;
  // });
  //
  // this.node.on('wheel.zoom', function(d) {
  //   wheelZoomCalculation.call(this, d);
  // });
}


export const zoom_actions = (graphObjects) => {
  graphObjects.attr('transform', d3.event.transform);
};

export const handleTick = function(node, link, simulation) {
  //update circle positions each tick of the simulation
  const k = 150 * simulation.alpha();
  console.log("Handling tick", node, link, simulation);
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