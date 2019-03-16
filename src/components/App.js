import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { withStyles, MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import grey from '@material-ui/core/colors/grey';
import Drawer from '@material-ui/core/Drawer';
import AppBar from '@material-ui/core/AppBar';
import CssBaseline from '@material-ui/core/CssBaseline';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import AddBoxIcon from '@material-ui/icons/AddBox';
import HelpIcon from '@material-ui/icons/Help';
import InfoIcon from '@material-ui/icons/Info';

/* global d3 */

const drawerWidth = 240;

const styles = theme => ({
  root: {
    display: 'flex',
    flexGrow: 1,
    flexBasis: 'auto',
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  content: {
    display: 'flex',
    flexGrow: 1,
    paddingTop: 64,
  },
  toolbar: theme.mixins.toolbar,
  logo: {
    width: drawerWidth,
  }
});

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#424242'
    },
  }
});

class App extends Component {

  constructor(props) {
    super(props);

    this.state= {
      nodes: {},
      edges: {},
      selectedNode: null,
      selectedEdge: null,
      mouseDownNode: null,
      mouseDownLink: null,
      justDragged: false,
      justScaleTransGraph: false,
      lastKeyDown: -1,
      shiftNodeDrag: false,
      selectedText: null,
    };
  }

  addNode(graphRef, nodeName) {
    var bodyEl = document.getElementById('mainRender');
    var width = bodyEl.clientWidth,
      height = bodyEl.clientHeight;

    var d = {id: graphRef.idct++, title: nodeName, x: width / 2, y: height / 2};
  graphRef.nodes.push(d);
    graphRef.updateGraph();
  }

  addEdge(graphRef, edgeData) {
    var newEdge = {source: edgeData.from, target: edgeData.to};
    var filtRes = graphRef.paths.filter(function (d) {
      if (d.source === newEdge.target && d.target === newEdge.source) {
        graphRef.edges.splice(graphRef.edges.indexOf(d), 1);
      }
      return d.source === newEdge.source && d.target === newEdge.target;
    });
    if (!filtRes[0].length) {
      graphRef.edges.push(newEdge);
      graphRef.updateGraph();
    }
  }

  generateMeme(d3) {

    const globalState = this.state;
    const globalAccessor = this;
    this.graphCreatorInstance = null;


    var GraphCreator = function GraphCreator(svg, nodes, edges) {
      globalAccessor.graphCreatorInstance = this;
      var thisGraph = this;
      thisGraph.idct = 0;

      thisGraph.nodes = nodes || [];
      thisGraph.edges = edges || [];

      thisGraph.state = globalAccessor.state;

      // define arrow markers for graph links
      var defs = svg.append('svg:defs');
      defs.append('svg:marker').attr('id', 'end-arrow').attr('viewBox', '0 -5 10 10').attr('refX', '32').attr('markerWidth', 3.5).attr('markerHeight', 3.5).attr('orient', 'auto').append('svg:path').attr('d', 'M0,-5L10,0L0,5');

      // define arrow markers for leading arrow
      defs.append('svg:marker').attr('id', 'mark-end-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 7).attr('markerWidth', 3.5).attr('markerHeight', 3.5).attr('orient', 'auto').append('svg:path').attr('d', 'M0,-5L10,0L0,5');

      thisGraph.svg = svg;
      thisGraph.svgG = svg.append('g').classed(thisGraph.consts.graphClass, true);
      var svgG = thisGraph.svgG;

      // displayed when dragging between nodes
      thisGraph.dragLine = svgG.append('svg:path').attr('class', 'link dragline hidden').attr('d', 'M0,0L0,0').style('marker-end', 'url(#mark-end-arrow)');

      // svg nodes and edges
      thisGraph.paths = svgG.append('g').selectAll('g');
      thisGraph.circles = svgG.append('g').selectAll('g');

      thisGraph.drag = d3.behavior.drag().origin(function (d) {
        return {x: d.x, y: d.y};
      }).on('drag', function (args) {
        globalAccessor.state.justDragged = true;
        thisGraph.dragmove.call(thisGraph, args);
      }).on('dragend', function () {
        // todo check if edge-mode is selected
      });

      // listen for key events
      d3.select(window).on('keydown', function () {
        thisGraph.svgKeyDown.call(thisGraph);
      }).on('keyup', function () {
        thisGraph.svgKeyUp.call(thisGraph);
      });
      svg.on('mousedown', function (d) {
        thisGraph.svgMouseDown.call(thisGraph, d);
      });
      svg.on('mouseup', function (d) {
        thisGraph.svgMouseUp.call(thisGraph, d);
      });

      // listen for dragging
      var dragSvg = d3.behavior.zoom().on('zoom', function () {
        if (d3.event.sourceEvent.shiftKey) {
          // TODO  the internal d3 state is still changing
          return false;
        } else {
          thisGraph.zoomed.call(thisGraph);
        }
        return true;
      }).on('zoomstart', function () {
        var ael = d3.select('#' + thisGraph.consts.activeEditId).node();
        if (ael) {
          ael.blur();
        }
        if (!d3.event.sourceEvent.shiftKey) d3.select('body').style('cursor', 'move');
      }).on('zoomend', function () {
        d3.select('body').style('cursor', 'auto');
      });

      svg.call(dragSvg).on('dblclick.zoom', null);

      // handle download data
      d3.select('#download-input').on('click', function () {
        var saveEdges = [];
        thisGraph.edges.forEach(function (val, i) {
          saveEdges.push({source: val.source.id, target: val.target.id});
        });
        var blob = new Blob([window.JSON.stringify({
          'nodes': thisGraph.nodes,
          'edges': saveEdges
        })], {type: 'text/plain;charset=utf-8'});
        saveAs(blob, 'mydag.json');
      });

      // handle uploaded data
      d3.select('#upload-input').on('click', function () {
        document.getElementById('hidden-file-upload').click();
        document.getElementById('hidden-file-upload').click();
      });
      d3.select('#hidden-file-upload').on('change', function () {
        if (window.File && window.FileReader && window.FileList && window.Blob) {
          var uploadFile = this.files[0];
          var filereader = new window.FileReader();

          filereader.onload = function () {
            var txtRes = filereader.result;
            // TODO better error handling
            try {
              var jsonObj = JSON.parse(txtRes);
              thisGraph.deleteGraph(true);
              thisGraph.nodes = jsonObj.nodes;
              thisGraph.setIdCt(jsonObj.nodes.length + 1);
              var newEdges = jsonObj.edges;
              newEdges.forEach(function (e, i) {
                newEdges[i] = {
                  source: thisGraph.nodes.filter(function (n) {
                    return n.id == e.source;
                  })[0],
                  target: thisGraph.nodes.filter(function (n) {
                    return n.id == e.target;
                  })[0]
                };
              });
              thisGraph.edges = newEdges;
              thisGraph.updateGraph();
            } catch (err) {
              window.alert('Error parsing uploaded file\nerror message: ' + err.message);
              return;
            }
          };
          filereader.readAsText(uploadFile);
        } else {
          alert('Your browser won\'t let you save this graph -- try upgrading your browser to IE 10+ or Chrome or Firefox.');
        }
      });

      // handle delete graph
      d3.select('#delete-graph').on('click', function () {
        thisGraph.deleteGraph(false);
      });
    };

    this.GraphCreator = GraphCreator;

    GraphCreator.prototype.setIdCt = function (idct) {
      this.idct = idct;
    };

    GraphCreator.prototype.consts = {
      selectedClass: 'selected',
      connectClass: 'connect-node',
      circleGClass: 'conceptG',
      graphClass: 'graph',
      activeEditId: 'active-editing',
      BACKSPACE_KEY: 8,
      DELETE_KEY: 46,
      ENTER_KEY: 13,
      nodeRadius: 50
    };

    /* PROTOTYPE FUNCTIONS */

    GraphCreator.prototype.dragmove = function (d) {
      var thisGraph = this;
      if (globalAccessor.state.shiftNodeDrag) {
        thisGraph.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(thisGraph.svgG.node())[0] + ',' + d3.mouse(this.svgG.node())[1]);
      } else {
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        thisGraph.updateGraph();
      }
    };

    GraphCreator.prototype.deleteGraph = function (skipPrompt) {
      var thisGraph = this,
        doDelete = true;
      if (!skipPrompt) {
        doDelete = window.confirm('Press OK to delete this graph');
      }
      if (doDelete) {
        thisGraph.nodes = [];
        thisGraph.edges = [];
        thisGraph.updateGraph();
      }
    };

    /* select all text in element: taken from http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element */
    GraphCreator.prototype.selectElementContents = function (el) {
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    };

    /* insert svg line breaks: taken from http://stackoverflow.com/questions/13241475/how-do-i-include-newlines-in-labels-in-d3-charts */
    GraphCreator.prototype.insertTitleLinebreaks = function (gEl, title) {
      var words = title.split(/\s+/g),
        nwords = words.length;
      var el = gEl.append('g').attr('text-anchor', 'middle').attr('dy', '-' + (nwords - 1) * 7.5);
      for (var i = 0; i < words.length; i++) {
        var backgroundText = el.append('text').attr({'fill': 'white', 'stroke': 'white', 'stroke-width': 8}).text(words[i]);
        if (i > 0) backgroundText.attr('x', 0).attr('dy', 15 * i);
        var tspan = el.append('text').attr('fill', 'black').text(words[i]);
        if (i > 0) tspan.attr('x', 0).attr('dy', 15 * i);
      }
    };

    // remove edges associated with a node
    GraphCreator.prototype.spliceLinksForNode = function (node) {
      var thisGraph = this,
        toSplice = thisGraph.edges.filter(function (l) {
          return l.source === node || l.target === node;
        });
      toSplice.map(function (l) {
        thisGraph.edges.splice(thisGraph.edges.indexOf(l), 1);
      });
    };

    GraphCreator.prototype.replaceSelectEdge = function (d3Path, edgeData) {
      var thisGraph = this;
      d3Path.classed(thisGraph.consts.selectedClass, true);
      if (globalAccessor.state.selectedEdge) {
        thisGraph.removeSelectFromEdge();
      }
      globalAccessor.state.selectedEdge = edgeData;
    };

    GraphCreator.prototype.replaceSelectNode = function (d3Node, nodeData) {
      var thisGraph = this;
      d3Node.classed(this.consts.selectedClass, true);
      if (globalAccessor.state.selectedNode) {
        thisGraph.removeSelectFromNode();
      }
      globalAccessor.state.selectedNode = nodeData;
    };

    GraphCreator.prototype.removeSelectFromNode = function () {
      var thisGraph = this;
      thisGraph.circles.filter(function (cd) {
        return cd.id === globalAccessor.state.selectedNode.id;
      }).classed(thisGraph.consts.selectedClass, false);
      globalAccessor.state.selectedNode = null;
    };

    GraphCreator.prototype.removeSelectFromEdge = function () {
      var thisGraph = this;
      thisGraph.paths.filter(function (cd) {
        return cd === globalAccessor.state.selectedEdge;
      }).classed(thisGraph.consts.selectedClass, false);
      globalAccessor.state.selectedEdge = null;
    };

    GraphCreator.prototype.pathMouseDown = function (d3path, d) {
      var thisGraph = this,
        state = globalAccessor.state;
      d3.event.stopPropagation();
      state.mouseDownLink = d;

      if (state.selectedNode) {
        thisGraph.removeSelectFromNode();
      }

      var prevEdge = state.selectedEdge;
      if (!prevEdge || prevEdge !== d) {
        thisGraph.replaceSelectEdge(d3path, d);
      } else {
        thisGraph.removeSelectFromEdge();
      }
    };

    // mousedown on node
    GraphCreator.prototype.circleMouseDown = function (d3node, d) {
      var thisGraph = this,
        state = globalAccessor.state;
      d3.event.stopPropagation();
      state.mouseDownNode = d;
      if (d3.event.shiftKey) {
        state.shiftNodeDrag = d3.event.shiftKey;
        // reposition dragged directed edge
        thisGraph.dragLine.classed('hidden', false).attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
        return;
      }
    };

    /* place editable text on node in place of svg text */
    GraphCreator.prototype.changeTextOfNode = function (d3node, d) {
      var thisGraph = this,
        consts = thisGraph.consts,
        htmlEl = d3node.node();
      d3node.selectAll('text').remove();
      var nodeBCR = htmlEl.getBoundingClientRect(),
        curScale = nodeBCR.width / consts.nodeRadius,
        placePad = 5 * curScale,
        useHW = curScale > 1 ? nodeBCR.width * 0.71 : consts.nodeRadius * 1.42;
      // replace with editableconent text

      var d3txt = thisGraph.svg.selectAll('foreignObject.editableContent')
        .data([d])
        .enter().append('foreignObject')
        .attr('class', 'editableContent')
        .attr('x', nodeBCR.left + placePad)
        .attr('y', nodeBCR.top + placePad)
        .attr('height', 2 * useHW).attr('width', useHW)
        .append('xhtml:p').attr('id', consts.activeEditId)
        .attr('contentEditable', 'true')
        .text(d.title)
        .on('mousedown', function (d) {
          d3.event.stopPropagation();
        }).on('keydown', function (d) {
          d3.event.stopPropagation();
          if (d3.event.keyCode == consts.ENTER_KEY && !d3.event.shiftKey) {
            this.blur();
          }
        }).on('blur', function (d) {
          d.title = this.textContent;
          thisGraph.insertTitleLinebreaks(d3node, d.title);
          d3.select(this.parentElement).remove();
        });

      return d3txt;
    };

    // mouseup on nodes
    GraphCreator.prototype.circleMouseUp = function (d3node, d) {
      var thisGraph = this,
        state = globalAccessor.state,
        consts = thisGraph.consts;
      // reset the states
      state.shiftNodeDrag = false;
      d3node.classed(consts.connectClass, false);

      var mouseDownNode = state.mouseDownNode;

      if (!mouseDownNode) {
        return;
      }

      // Set the drag line as hidden!
      thisGraph.dragLine.classed('hidden', true);

      if (mouseDownNode !== d) {
        // Create node and add it to the graph.
        globalAccessor.addEdge(thisGraph, {from: mouseDownNode, to: d});
      } else {
        // we're in the same node
        if (state.justDragged) {
          // dragged, not clicked
          state.justDragged = false;
        } else {
          // clicked, not dragged
          if (d3.event.shiftKey) {
            // shift-clicked node: edit text content
            var d3txt = thisGraph.changeTextOfNode(d3node, d);
            var txtNode = d3txt.node();
            thisGraph.selectElementContents(txtNode);
            // txtNode.focus();
          } else {
            if (state.selectedEdge) {
              thisGraph.removeSelectFromEdge();
            }
            var prevNode = state.selectedNode;

            if (!prevNode || prevNode.id !== d.id) {
              thisGraph.replaceSelectNode(d3node, d);
            } else {
              thisGraph.removeSelectFromNode();
            }
          }
        }
      }
      state.mouseDownNode = null;
      return;
    }; // end of circles mouseup

    // mousedown on main svg
    GraphCreator.prototype.svgMouseDown = function () {
      globalAccessor.state.graphMouseDown = true;
    };

    // mouseup on main svg
    GraphCreator.prototype.svgMouseUp = function () {
      var thisGraph = this,
        state = thisGraph.state;
      if (state.justScaleTransGraph) {
        // dragged not clicked
        state.justScaleTransGraph = false;
      } else if (state.graphMouseDown && d3.event.shiftKey) {
        // clicked not dragged from svg

        globalAccessor.addNode(thisGraph, "Debug Node");
      } else if (state.shiftNodeDrag) {
        // dragged from node
        state.shiftNodeDrag = false;
        thisGraph.dragLine.classed('hidden', true);
      } else if (state.graphMouseDown) {
        // SVG was clicked, should we delete?
      }
      state.graphMouseDown = false;
    };

    // keydown on main svg
    GraphCreator.prototype.svgKeyDown = function () {
      var thisGraph = this,
        state = thisGraph.state,
        consts = thisGraph.consts;
      // make sure repeated key presses don't register for each keydown
      if (state.lastKeyDown !== -1) return;

      state.lastKeyDown = d3.event.keyCode;
      var selectedNode = state.selectedNode,
        selectedEdge = state.selectedEdge;

      switch (d3.event.keyCode) {
      case consts.BACKSPACE_KEY:
      case consts.DELETE_KEY:
        d3.event.preventDefault();
        if (selectedNode) {
          thisGraph.nodes.splice(thisGraph.nodes.indexOf(selectedNode), 1);
          thisGraph.spliceLinksForNode(selectedNode);
          state.selectedNode = null;
          thisGraph.updateGraph();
        } else if (selectedEdge) {
          thisGraph.edges.splice(thisGraph.edges.indexOf(selectedEdge), 1);
          state.selectedEdge = null;
          thisGraph.updateGraph();
        }
        break;
      }
    };

    GraphCreator.prototype.svgKeyUp = function () {
      this.state.lastKeyDown = -1;
    };

    // GraphCreator.prototype.calculateLabelPosition = function (link_label) {
    //   link_label.attr('x', function(d) {
    //     var node = d3.select(link_label.node().parentElement).selectAll('path').node();
    //     var pathLength = node.getTotalLength();
    //     d.point = node.getPointAtLength(pathLength / 2);
    //     return d.point.x;
    //   }).attr('y', function(d) {
    //     return d.point.y;
    //   });
    // };

    GraphCreator.prototype.calculatePathTooltipPosition = function (link_label) {

      link_label.attr('x', function (d) {
        var node = d3.select(link_label.node().parentElement).selectAll('path').node();
        var pathLength = node.getTotalLength();
        d.point = node.getPointAtLength(pathLength / 2);
        return d.point.x - (d3.select(this).attr('width') / 2);
      }).attr('y', function (d) {
        return d.point.y - (d3.select(this).attr('height') / 2);
      });
    };

    GraphCreator.prototype.nodeNaming = function (d) {
      return d.source.id + '-' + d.target.id;
    };

    GraphCreator.prototype.insertEdgeLabel = function (gEl, label) {
      // var link_label = gEl.append('text');
      // link_label.style('text-anchor', 'middle')
      //   .style('dominant-baseline', 'central')
      //   .attr('class', 'edge-label').text(label);
      //
      // this.calculateLabelPosition(link_label);
      const thisGraph = this;

      var div_label = gEl.append('foreignObject').attr({
        'width': '200px',
        'height': '200px',
        'class': 'path-tooltip'
      });

      const subDiv = div_label.append('xhtml:div').attr({
        'class': 'path-tooltip-div'
      })
        .append('div')
        .attr({
          'class': 'tooltip'
        }).append('p')
        .attr('class', 'lead')
        .attr('id', function(d) {
          return thisGraph.nodeNaming(d);
        }).html(function(d) {
          return d;
        }).attr('dummy_attr', function(d) {
          const node = d3.select(this).node();
          d3.select(d3.select(this).node().parentElement.parentElement.parentElement)
          .attr('width', node.clientWidth + 0.5).attr('height', node.clientHeight + 0.5);
          return 'meep';
        });


      // .text();

      // look here you idiot //

      this.calculatePathTooltipPosition(div_label);
    };
    // call to propagate changes to graph
    GraphCreator.prototype.updateGraph = function () {

      var thisGraph = this,
        consts = thisGraph.consts,
        state = thisGraph.state;

      thisGraph.paths = thisGraph.paths.data(thisGraph.edges, function (d) {
        return String(d.source.id) + '+' + String(d.target.id);
      });

      var paths = thisGraph.paths;

      // update existing paths
      paths.selectAll('path').classed(consts.selectedClass, function (d) {
        return d === state.selectedEdge;
      }).attr('d', function (d) {
        return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
      });

      // paths.select('text').each(function(d) {
      //   thisGraph.calculateLabelPosition(d3.select(this));
      // });

      paths.select('foreignObject.path-tooltip').each(function (d) {
        thisGraph.calculatePathTooltipPosition(d3.select(this));
      });

      // add new paths
      const pathObject = paths.enter().append('g');

      pathObject.append('path').style('marker-end', 'url(#end-arrow)').classed('link real-link', true).attr('d', function (d) {
        return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
      }).attr('id', function(d) {
        return 'path-' + thisGraph.nodeNaming(d);
      });

      pathObject.each(function (d) {
        thisGraph.insertEdgeLabel(d3.select(this), 'Sample Link');
      });

      // Add a copy of the path to the front, but make it invisible
      pathObject.append('path').classed('link hidden-hitbox', true).attr('d', function (d) {
        return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
      }).on('mouseover', function (d) {
        d3.select('#path-'+ thisGraph.nodeNaming(d)).classed('tooltip', true);
      }).on('mouseout', function (d) {
        d3.select('#path-'+ thisGraph.nodeNaming(d)).classed('tooltip', false);
      }).on('mousedown', function (d) {
        thisGraph.pathMouseDown.call(thisGraph, d3.select('#path-'+ thisGraph.nodeNaming(d)), d);
      }).on('mouseup', function (d) {
        state.mouseDownLink = null;
      });


      // remove old links
      paths.exit().remove();

      // update existing nodes
      thisGraph.circles = thisGraph.circles.data(thisGraph.nodes, function (d) {
        return d.id;
      });

      thisGraph.circles.attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });

      // add new nodes
      var newGs = thisGraph.circles.enter().append('g');

      newGs.classed(consts.circleGClass, true)
        .attr('transform', function (d) {
          return 'translate(' + d.x + ',' + d.y + ')';
        })
        .on('mouseover', function (d) {
          if (state.shiftNodeDrag) {
            d3.select(this).classed(consts.connectClass, true);
          }
        }).on('mouseout', function (d) {
          d3.select(this).classed(consts.connectClass, false);
        }).on('mousedown', function (d) {
          thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d);
        }).on('mouseup', function (d) {
          thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
        }).call(thisGraph.drag);

      newGs.append('circle').attr('r', String(consts.nodeRadius));

      var images = newGs.append('svg:image')
        .attr('xlink:href',  function(d) { return 'https://i.imgur.com/DEHn9RZ.png';})
        .attr('x', function(d) { return -50;})
        .attr('y', function(d) { return -50;})
        .attr('height', 100)
        .attr('width', 100);


      newGs.each(function (d) {
        thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
      });

      // remove old nodes
      thisGraph.circles.exit().remove();
    };

    GraphCreator.prototype.zoomed = function () {
      this.state.justScaleTransGraph = true;
      d3.select('.' + this.consts.graphClass).attr('transform', 'translate(' + d3.event.translate + ') scale(' + d3.event.scale + ')');
    };
  }

  componentDidMount() {
    this.generateMeme(window.d3);



    /**** MAIN ****/

    var bodyEl = document.getElementById('mainRender');

    var width = bodyEl.clientWidth;

    var xLoc = width / 2 - 25,
      yLoc = 100;

    // initial node data
    var nodes = [
      {title: '0 memes/sec', id: 0, x: xLoc, y: yLoc}, {
        title: '0 memes/sec',
        id: 1,
        x: xLoc,
        y: yLoc + 200
      }];
    var edges = [{source: nodes[1], target: nodes[0]}];

    /** MAIN SVG **/
    const svg = d3.select('#mainRender');

    this.graph = new this.GraphCreator(svg, nodes, edges);
    this.graph.setIdCt(2);
    this.graph.updateGraph();
  }

  render() {

    let id_counter = 0;

    var machine_types = {
      miner : { types : [{ name : 'Miner Mk.1', icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Miner_MK1.png'}, { name : 'Miner Mk.2', icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Miner_MK1.png'}]},
      smelter : { types : [{ name : 'Smelter Mk.1', icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png'}, { name : 'Smelter Mk.2', icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png' }]},
      assembler : { types : [{ name : 'Assembler Mk.1', icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Assembler.png' }, { name : 'Assembler Mk.2', icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Assembler.png' }]},
      manufacturer : { types : [{ name : 'Manufacturer Mk.1', icon : '' }, { name : 'Manufacturer Mk.2', icon : '' }]},
      coal_generator : { types : [{ name: 'Coal Generator', icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Coal_Generator.png', icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Coal_Generator.png' }]}
    }

    id_counter = 0;
    var purity = {
      impure : { name : 'Impure', id : id_counter++},
      normal : { name : 'Normal', id : id_counter++},
      pure : { name : 'Pure', id : id_counter++}
    }

    id_counter = 0;
    var resources = {
      iron : { id : id_counter++, name : 'Iron', purity : {[purity.impure.id] : 30, [purity.normal.id] : 60, [purity.pure.id] : 120}, icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Ore.png' },
      coal : { id : id_counter++, name : 'Coal', purity : {[purity.impure.id] : 30, [purity.normal.id] : 60, [purity.pure.id] : 120}, icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Coal.png' },
      copper : { id : id_counter++, name : 'Copper', purity : {[purity.impure.id] : 30, [purity.normal.id] : 60, [purity.pure.id] : 120}, icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Copper_Ore.png' },
      limestone : { id : id_counter++, name : 'Limestone', purity : {[purity.impure.id] : 30, [purity.normal.id] : 60, [purity.pure.id] : 120}, icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Limestone.png' }
    }

    var items = {
      iron_ingot : { id : id_counter++, crafting : [{ from : resources.iron, in_quantity : 1, out_quantity : 1 }], icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Ingot.png'},
      iron_plate : { id : id_counter++, crafting : [{ from : items.iron_ingot, in_quantity : 2, out_quantity : 1 }], icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Plate.png'},
      iron_rod : { id : id_counter++, crafting : [{ from : items.iron_ingot, in_quantity : 1, out_quantity : 1 }], icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Rod.png'},
      screw : { id : id_counter++, crafting : [{ from : items.iron_rod, in_quantity : 1, out_quantity : 5 }], icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Screw.png'},
      copper_ingot : { id : id_counter++, crafting : [{ from : resources.copper, in_quantity : 1, out_quantity : 1 }], icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Copper_Ingot.png'},
      wire : { id : id_counter++, crafting : [{ from : items.copper_ingot, in_quantity : 1, out_quantity : 3 }], icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Wire.png'},
      cable : { id : id_counter++, crafting : [{ from : items.wire, in_quantity : 2, out_quantity : 1 }], icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Cable.png'},
      concrete : { id : id_counter++, crafting : [{ from : resources.limestone, in_quantity :  3, out_quantity : 1 }], icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Concrete.png'},
      reinforced_iron_plate : { id : id_counter++, crafting : [{ from: [{in : items.iron_plate, in_quantity : 4}, {in : items.screw, in_quantity : 24}], out_quantity : 1} ], icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Reinforced_Iron_Plate.png'},
      modular_frame : { id : id_counter++, crafting : [{ from: [{in : items.reinforced_iron_plate, in_quantity : 3}, {in : items.iron_rod, in_quantity : 6}], out_quantity : 1} ], icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Modular_Frame.png'},
      rotor : { id : id_counter++, crafting : [{ from: [{in : items.iron_rod, in_quantity : 3}, {in : items.screw, in_quantity : 22}], out_quantity : 1} ], icon : 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Rotor.png'}
    }

    const { classes } = this.props;
    return <div className={classes.root}>
      <CssBaseline />
      <MuiThemeProvider theme={theme}>
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar>
            <Typography variant="h7" color="inherit" noWrap>
              <img className={classes.logo} src="https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory.png" title="logo" />
            </Typography>
          </Toolbar>
        </AppBar>
      </MuiThemeProvider>
      <Drawer
        className={classes.drawer}
        variant="permanent"
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <div className={classes.toolbar} />
        <List>
          {Object.keys(machine_types).map((a, b) => machine_types[a].name ).map((text) => (
            <ListItem button key={text} onClick={() => this.addNode(this.graphCreatorInstance, "Fuck you")}>
              <ListItemIcon><AddBoxIcon /></ListItemIcon>
              <ListItemText primary={text} />
            </ListItem>
          ))}
        </List>
        <Divider />
        <List>
          {Object.keys(resources).map((a, b) => resources[a].name).map((text) => (
            <ListItem button key={text}>
              <ListItemIcon><AddBoxIcon /></ListItemIcon>
              <ListItemText primary={text} />
            </ListItem>
          ))}
        </List>
        <Divider />
        <List>
          <ListItem button key='Help'>
            <ListItemIcon><HelpIcon /></ListItemIcon>
            <ListItemText primary='Help' />
          </ListItem>
          <ListItem button key='About'>
            <ListItemIcon><InfoIcon /></ListItemIcon>
            <ListItemText primary='About' />
          </ListItem>
        </List>
      </Drawer>
      <main className={classes.content}>
        <svg id="mainRender"/>
      </main>
    </div>;

  };

}

App.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);
