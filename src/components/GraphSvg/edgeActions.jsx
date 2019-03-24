import constants from './constants';
import {removeSelectFromNode} from './nodeActions';
import {deselect_path_and_nodes} from './graphActions';
import * as d3 from 'd3';

//v2
export const addPath = function (passedThis, source, target) {
  const newEdge = {source: source, target: target};


  //
  const filterResult = passedThis.graphData.links.filter(function (d) {
    if (d.source.id === newEdge.target.id && d.target.id === newEdge.source.id) {
      removePath(d, passedThis);
    }
    return d.source.id === newEdge.source.id && d.target.id === newEdge.target.id;
  });

  //Todo: make nodes not connect if they dont provide the right resources

  // Filter if it doesn't resolve
  if (!filterResult.length) {
    passedThis.graphData.links.push(newEdge);
  }
  passedThis.updateGraphHelper();
};

export const pathMouseOver = function (d) {

};

export const pathMouseOut = function (d) {

};

export const pathMouseClick = function (d, t) {
  d3.event.stopImmediatePropagation();
  const parentElement = d3.select(this.parentElement);
  // const styledLine = parentElement.select('.' + constants.lineStylingPathClass);
  // const styledMarker = parentElement.select('.' + constants.lineStylingArrowClass);

  if (t.state && t.state.selectedPath && t.state.selectedPath == d) {
    // set the new selected one to this one
    deselect_path_and_nodes.call(this, t);
  } else {
    deselect_path_and_nodes.call(this, t);
    d3.selectAll('.' + constants.lineStylingFullClass).attr('display', 'none');
    t.setState({selectedPath: d});
    const both = parentElement.selectAll('.' + constants.lineStylingFullClass);
    both.attr('display', 'inherit');
  }
};

export const removePath = function (d, t) {
  t.graphData.links.splice(t.graphData.links.indexOf(d), 1);
};

//v1
export const replaceSelectEdge = function (d3Path, edgeData) {
  d3Path.classed(constants.selectedClass, true);
  if (this.selectedEdge) {
    removeSelectFromEdge.call(this);
  }
  this.selectedEdge = edgeData;
};

export const removeSelectFromEdge = function () {
  if (!this.selectedEdge) {
    return;
  }

  const outerThis = this;
  this.paths.filter(function (cd) {
    return cd === outerThis.selectedEdge;
  }).selectAll('path').classed(constants.selectedClass, false);

  this.selectedEdge = null;
};

export const pathMouseDown = function (d3, d3path, d) {
  d3.event.stopPropagation();
  this.mouseDownLink = d;

  if (this.selectedNode) {
    removeSelectFromNode.call(this);
  }

  const prevEdge = this.selectedEdge;
  if (!prevEdge || prevEdge !== d) {
    replaceSelectEdge.call(this, d3path, d);
  } else {
    removeSelectFromEdge.call(this);
  }

  this.updateGraph();
};


export const addEdge = function (graphRef, edgeData) {
  const newEdge = {source: edgeData.from, target: edgeData.to};

  const filterResult = graphRef.paths.filter(function (d) {
    if (d.source === newEdge.target && d.target === newEdge.source) {
      removeEdge(graphRef, d);
    }
    return d.source === newEdge.source && d.target === newEdge.target;
  });

  //Todo: make nodes not connect if they dont provide the right resources

  // Filter if it doesn't resolve
  if (!filterResult[0].length) {
    graphRef.edges.push(newEdge);
    addEdgeToGraph.call(graphRef, edgeData);
    graphRef.updateGraph();
  }
};

export const addEdgeToGraph = function (edgeData) {

};

export const removeEdge = function (graphRef, l) {
  graphRef.edges.splice(graphRef.edges.indexOf(l), 1);
  removeEdgeFromGraph.call(graphRef, l);
};

export const removeEdgeFromGraph = function (edgeData) {

};

export const calculatePathTooltipPosition = function (link_label, d3) {
  link_label.attr('x', function (d) {
    const node = d3.select(link_label.node().parentElement).selectAll('path').node();
    const pathLength = node.getTotalLength();
    d.point = node.getPointAtLength(pathLength / 2);
    return d.point.x - (d3.select(this).attr('width') / 2);
  }).attr('y', function (d) {
    return d.point.y - (d3.select(this).attr('height') / 2);
  });
};


// GraphCreator.prototype.calculateLabelPosition = function (link_label, text) {
//   text.attr('x', function (d) {
//     var node = d3.select(link_label.node().parentElement).selectAll('path').node();
//     var pathLength = node.getTotalLength();
//     d.point = node.getPointAtLength(pathLength / 2);
//     return d.point.x;
//   }).attr('y', function (d) {
//     return d.point.y;
//   });
// };

export const insertEdgeLabel = function (gEl) {
  // Perhapos not needed!
  // var link_label = gEl.append('g').attr('class', 'textLabel');
  //
  // const text =  link_label.append('text')
  //   .style('text-anchor', 'middle')
  //   .style('dominant-baseline', 'central')
  //   .attr('class', 'edge-label').text("WHAT");
  //
  // this.calculateLabelPosition(link_label, text);

  const thisGraph = this;
  const {classes} = this.props;
  //
  // var div_label = gEl.append('foreignObject').attr({
  //   'width': '200px',
  //   'height': '200px',
  //   'class': 'path-tooltip'
  // });
  //
  // div_label.append('xhtml:div').attr({
  //   'class': 'path-tooltip-div'
  // })
  //   .append('div')
  //   .attr({
  //     'class': 'tooltip'
  //   }).append('p')
  //   .attr('class', 'lead')
  //   .attr('id', function (d) {
  //     return thisGraph.nodeNaming(d);
  //   }).html(function (d) {
  //     /*eslint-disable react/no-unknown-property*/
  //     return jsxToString(<div>
  //       <div><img class={classes.pathIcon}
  //         src="https://i.imgur.com/oBmfK3w.png" title="logo"/>
  //       <div class={classes.pathText}>Hello there!</div>
  //       </div>
  //     </div>);
  //   /*eslint-enable  react/no-unknown-property*/
  //   }).attr('dummy_attr', function (d) {
  //     const node = d3.select(this).node();
  //     d3.select(d3.select(this).node().parentElement.parentElement.parentElement)
  //       .attr('width', node.clientWidth + 0.5).attr('height', node.clientHeight + 0.5);
  //     return 'meep';
  //   });
  //
  // this.calculatePathTooltipPosition(div_label);
};