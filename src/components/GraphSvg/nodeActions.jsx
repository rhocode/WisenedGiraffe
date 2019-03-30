import constants from './constants';
import {addPath, removePath} from './edgeActions';
import * as d3 from 'd3';
import {deselect_path_and_nodes} from './graphActions';

export const add_node = (d, t) => {
  d.id = d.id || t.id++;
  d.x = d.x || 0;
  d.y = d.y || 0;
  d.overclock = d.overclock || 100;
  console.log(JSON.stringify(d));
  t.graphData.nodes.push(d);
  t.updateGraphHelper();
};

export const delete_node = function (d, t) {
  // unselect currently selected node
  const selectedNode = t.state.selectedNode;
  remove_select_from_nodes(t);

  const toSplice = t.graphData.links.filter(function (l) {
    return l.source.id === selectedNode.id || l.target.id === selectedNode.id;
  });

  toSplice.map(function (l) {
    removePath(l, t);
  });

  t.graphData.nodes.splice(t.graphData.nodes.indexOf(selectedNode), 1);
};


export const node_clicked = function (d, t) {
  // unselect currently selected node
  const previouslySelected = t.state.selectedNode;
  remove_select_from_nodes(t);
  if (previouslySelected !== d) {
    deselect_path_and_nodes(t);
    t.setState({selectedNode: d});
    d3.select(this).classed(constants.graphNodeHoverClass, true)
      .classed(constants.graphNodeGrabbedClass, false)
      .classed(constants.selectedNodeClass, true);
  }
};

export const remove_select_from_nodes = function (graphSvg) {
  d3.select('.' + constants.selectedNodeClass)
    .classed(constants.selectedNodeClass, false)
    .classed(constants.graphNodeGrabbedClass, false);
  graphSvg.setState({selectedNode: null});
};


export const node_mouse_over = function (d, graphSvg) {

  graphSvg.setState({mouseOverNode: d3.select(this).datum()});
  d3.select(this).classed(constants.graphNodeHoverClass, true);
};

export const node_mouse_out = function (d, graphSvg) {
  graphSvg.setState({mouseOverNode: null});
  d3.select(this).classed(constants.graphNodeHoverClass, false);
};

export const node_mouse_down = function (d, graphSvg) {
  if (d3.event.shiftKey) {
    graphSvg.setState({shiftHeld: true, sourceId: d3.select(this).datum().id});
  } else {
    d3.select(this).classed(constants.graphNodeGrabbedClass, true);
  }
};

export const node_mouse_up = function (d, graphSvg) {
  // Only triggered if it's not a drag
  if (graphSvg.state && graphSvg.state.shiftHeld) {
  } else {
    //probably can't get to this case
  }
  graphSvg.setState({shiftHeld: false});
};


const overClockCalculation = (d, percentage_metric, offset, endOffsetRaw) => {
  const endOffset = endOffsetRaw + offset;
  const percentage = d[percentage_metric];
  const arc = d3.arc()
    .innerRadius(50)
    .outerRadius(50);

  const m = (endOffset - offset) / 250;
  const b = offset;

  const start = b / 180 * Math.PI;
  const end = (m * percentage + b) / 180 * Math.PI;
  return arc({startAngle: start, endAngle: end});
};

export const addEfficiencyArc = (parent, percentage_metric, offset, endOffset) => {
  parent.append('path')
    .attr('class', constants.overclockedArcClass)
    .attr('fill', 'none')
    .attr('stroke-width', 8)
    .attr('stroke', 'darkslategray')
    .attr('d', function (d) {
      return overClockCalculation(d, percentage_metric, offset, endOffset);
    });
};

export const editEfficiencyArc = (parent, percentage_metric, offset, endOffset) => {
  parent.select('.' + constants.overclockedArcClass)
  // .attr('class', constants.overclockedArcClass)
  // .attr('fill', 'none')
  // .attr('stroke-width', 4)
  // .attr('stroke', 'darkslategray')
    .attr('d', function (d) {
      return overClockCalculation(d, percentage_metric, offset, endOffset);
    });
};

export const addNodeImage = (parent) => {
  parent.append('svg:image')
    .attr('class', function (d) {
      if (d.machine && d.machine.icon) {
        return 'machine-icon';
      }
      return 'dev-icon';
    })
    .attr('xlink:href', function (d) {
      if (d.instance && d.instance.icon) {
        return d.instance.icon;
      }
      if (d.machine && d.machine.icon) {
        return d.machine.icon;
      }
      return 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png';
    })
    .attr('x', function (d) {
      return -50;
    })
    .attr('y', function (d) {
      return -50;
    })
    .attr('height', 100)
    .attr('width', 100);
};

export const wheelZoomCalculation = function (d) {
  d3.event.stopImmediatePropagation();

  let roughEstimate = -1;

  if (d3.event.deltaY < 0) {
    roughEstimate = 1;
  }

  d.overclock = (d.overclock + (roughEstimate));
  if (d.overclock < 0) {
    d.overclock = 251 + d.overclock;
  } else if (d.overclock > 250) {
    d.overclock = d.overclock - 251;
  }
  updateOverclock(d3.select(this).select('.' + constants.overclockedTextClass));
  // editEfficiencyArc(d3.select(this), 'overclock', 59, 322);
};

export const updateOverclock = function(textElement) {
  textElement.text(function (d) {
    return d.overclock;
  });
};

export const updateNodeTier = function(textElement) {
  textElement.text(function (d) {
    return d.instance.machine_version.representation;
  });
};

export const updateComponents = function(elementsToUpdate) {
  const t = this;
  const itemAccessor = t.props.parentAccessor.state.recipe.item;
  elementsToUpdate.each(function(d) {
    const allowedInRemaining = d.allowedIn.slice();
    const provided = t.nodeIn[d.id] || [];
    const actualIn = provided.map(node => node.allowedOut).flat(1);
    new Set(actualIn).forEach(id => { allowedInRemaining.splice(allowedInRemaining.indexOf(id), 1); });
    const element = d3.select(this);

    element.selectAll('.' + constants.nodeRequirementsSubIconClass).remove();

    if (allowedInRemaining.length > 0) {
      element.append('text').attr('class', 'fas fa-arrow-left')
        .classed(constants.nodeRequirementsSubIconClass, true)
        .attr('x', function (d) {
          return 56;
        })
        .attr('y', function (d) {
          return -28;
        })
        .attr('height', 25)
        .attr('width', 25);
      const fetchRemainingIn = allowedInRemaining.map(item =>
        itemAccessor.filter(findItem => item === findItem.id)[0]
      );

      const outputtedItems = new Set();

      fetchRemainingIn.forEach((remaining, i) => {
        if (outputtedItems.has(remaining.icon)) {
          return;
        }
        outputtedItems.add(remaining.icon);
        element.append('svg:image')
          .classed(constants.nodeRequirementsSubIconClass, true)
          .on('mousedown', function(d) {
            d3.event.stopImmediatePropagation();
          })
          .on('click', function(d) {
            const findSuitableSource = t.graphData.nodes.filter(node => node.id !== d.id && node.open_out_slot > 0
              && node.allowedOut.includes(remaining.id));
            const thisNode = t.graphData.nodes.filter(node => node.id === d.id);
            if (findSuitableSource.length > 0) {
              addPath(t, findSuitableSource[0], thisNode[0]);
            }
            d3.event.stopImmediatePropagation();
          })
          .attr('xlink:href', function (d) {
            return remaining.icon;
          })
          .attr('x', function (d) {
            return 58 + 28 + (28 * i);
          })
          .attr('y', function (d) {
            return -28;
          })
          .attr('height', 25)
          .attr('width', 25);
      });
    }
    const allowedOutRemaining = d.allowedOut.slice();
    const provides = t.nodeOut[d.id] || [];
    const actualOut = provides.map(node => node.allowedIn).flat(1);
    new Set(actualOut).forEach(id => { allowedOutRemaining.splice(allowedOutRemaining.indexOf(id), 1); });

    if (allowedOutRemaining.length > 0) {
      element.append('text').attr('class', 'fas fa-arrow-right')
        .classed(constants.nodeRequirementsSubIconClass, true)
        .attr('x', function (d) {
          return 58;
        })
        .attr('y', function (d) {
          return 3;
        })
        .attr('height', 25)
        .attr('width', 25);
      const fetchRemainingOut = allowedOutRemaining.map(item =>
        itemAccessor.filter(findItem => item === findItem.id)[0]
      );

      const outputtedItemsIn = new Set();

      fetchRemainingOut.forEach((remaining, i) => {
        if (outputtedItemsIn.has(remaining.icon)) {
          return;
        }
        outputtedItemsIn.add(remaining.icon);
        element.append('svg:image')
          .classed(constants.nodeRequirementsSubIconClass, true)
          .on('mousedown', function(d) {
            d3.event.stopImmediatePropagation();
          })
          .on('click', function(d) {
            const findSuitableTarget = t.graphData.nodes.filter(node => node.id !== d.id && node.open_in_slots > 0
              && node.allowedIn.includes(remaining.id));
            const thisNode = t.graphData.nodes.filter(node => node.id === d.id);
            if (findSuitableTarget.length > 0) {
              addPath(t, thisNode[0], findSuitableTarget[0]);
            }
            d3.event.stopImmediatePropagation();
          })
          .attr('xlink:href', function (d) {
            return remaining.icon;
          })
          .attr('x', function (d) {
            return 56 + 28 + (28 * i);
          })
          .attr('y', function (d) {
            return 3;
          })
          .attr('height', 25)
          .attr('width', 25);
      });
    }
  });
};

export const forceUpdateComponentLabel = function() {
  updateComponents.call(this, d3.selectAll('.' + constants.nodeRequirementsIconClass));

};


export const insertComponents = function(parentElement) {

  const el1 = parentElement.append('g').classed(constants.nodeRequirementsIconClass, true);

  el1.each(function(d){
    if (d.machine && ['Container', 'Logistic'].includes(d.machine.name)) {
      // save this for later...
    } else {
      d3.select(this).append('svg:image')
        .classed(constants.nodeProducesClass, true)
        .attr('xlink:href', function (d) {
          return d.data.recipe.item.icon;
        })
        .attr('x', function (d) {
          return -55;
        })
        .attr('y', function (d) {
          return 18;
        })
        .attr('height', 40)
        .attr('width', 40);
    }
  });

  d3.selectAll('.' + constants.nodeRequirementsIconClass).each(function(d) {
    if (d.machine && ['Container', 'Logistic'].includes(d.machine.name)) {
      const nodeThis = d3.select(this);
      nodeThis.selectAll('.' + constants.nodeProducesClass).remove();
      const outputtedItems = new Set();
      (d.containedItems || []).forEach((containedItem, index) => {
        if (outputtedItems.has(containedItem.icon)) {
          return;
        }
        outputtedItems.add(containedItem.icon);
        nodeThis.append('svg:image')
          .classed(constants.nodeProducesClass, true)
          .attr('xlink:href', function (d) {
            return d.containedItems[index].icon;
          })
          .attr('x', function (d) {
            return -55;
          })
          .attr('y', function (d) {
            return 18 + (30 * index);
          })
          .attr('height', 40)
          .attr('width', 40);
      });
    }
  });


  forceUpdateComponentLabel.call(this);
};

export const insertNodeTier = (gEl) => {
  // const el = gEl.append('g').attr('text-anchor', 'middle').attr('dy', '-' + (nwords - 1) * 7.5);
  const el = gEl.append('g').attr('text-anchor', 'middle').attr('dy', 0);
  // el.append('circle').attr('r', 17).attr('fill', '#FFFFFF').attr('cx', 32).attr('cy', -38).attr('stroke', 'black').attr('stroke-width', 1);

  const backgroundText = el.append('text')
    .attr('fill', 'white')
    .attr('class', 'overclockFont')
    .classed(constants.nodeVersionTextClass, true)
    .attr('stroke', 'black')
    .attr('stroke-width', 4)
    .attr('x', 32).attr('dy', 46)
    .attr('font-size', 30);

  updateNodeTier(backgroundText);

  const tspan = el.append('text').attr('fill', 'white')
    .attr('class', 'overclockFont')
    .classed(constants.nodeVersionTextClass, true)
    .attr('x', 32).attr('dy', 46)
    .attr('font-size', 30);

  updateNodeTier(tspan);
  // updateOverclock(tspan);
};

export const insertNodeOverclock = (gEl) => {
  // const el = gEl.append('g').attr('text-anchor', 'middle').attr('dy', '-' + (nwords - 1) * 7.5);
  const el = gEl.append('g').attr('text-anchor', 'middle').attr('dy', 0);
  el.append('circle').attr('r', 17).attr('fill', '#FFFFFF').attr('cx', 32).attr('cy', -38).attr('stroke', 'black').attr('stroke-width', 1);

  const tspan = el.append('text').attr('fill', 'black')
    .attr('class', 'overclockFont')
    .classed(constants.overclockedTextClass, true)
    .attr('x', 32).attr('dy', -32)
    .attr('font-size', 20);

  updateOverclock(tspan);
};


export const generateNodeDef = (x, y, id, data) => {
  return {id, x, y, data};
};

export const addNode = (graphRef, machine, x = null, y = null) => {
  var bodyEl = document.getElementById('mainRender');
  var width = bodyEl.clientWidth,
    height = bodyEl.clientHeight;
  const d = generateNodeDef(x || width / 2, y || height / 2, graphRef.idct++, {});
  graphRef.nodes.push(d);
  addNodeToGraph(graphRef, d);

  graphRef.updateGraph();
};

export const addNodeToGraph = (graphRef, d) => {
  // const nodeId = graphRef.idct - 1;
  // this.nodes[nodeId] = d;
  // this.outputEdges[nodeId] = {};
  // this.inputEdges[nodeId] = {};
};


export const removeSelectFromNode = function () {
  if (!this.selectedNode) {
    return;
  }

  const outerThis = this;

  this.circles.filter(function (cd) {
    return cd.id === outerThis.selectedNode.id;
  }).classed(constants.selectedClass, false);
  this.selectedNode = null;
};
