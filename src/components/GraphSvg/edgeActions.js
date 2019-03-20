import constants from "./constants";
import {removeSelectFromNode} from "./nodeActions";

export const replaceSelectEdge = function (d3Path, edgeData) {
  d3Path.classed(constants.selectedClass, true);
  if (this.state.selectedEdge) {
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
  }).classed(constants.selectedClass, false);
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


export const addEdge = function(graphRef, edgeData) {
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

export const addEdgeToGraph = function(edgeData) {

};

export const removeEdge = function(graphRef, l) {
  graphRef.edges.splice(graphRef.edges.indexOf(l), 1);
  removeEdgeFromGraph.call(graphRef, l);
};

export const removeEdgeFromGraph = function(edgeData) {

};