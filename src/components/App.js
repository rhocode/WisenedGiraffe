import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withStyles, MuiThemeProvider, createMuiTheme} from '@material-ui/core/styles';
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
import jsxToString from 'jsx-to-string';

import data from './data';
import newData from './newData';

/* global d3 */

const drawerWidth = 310;



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
    display: 'flex',
    paddingTop: 64
  },
  drawerPaper: {
    width: drawerWidth,
    position: 'unset'
  },
  content: {
    display: 'flex',
    flexGrow: 1,
    paddingTop: 64,
  },
  toolbar: theme.mixins.toolbar,
  logo: {
    width: drawerWidth,
  },
  icons: {
    marginRight: 0
  },
  pathIcon: {
    height: 15,
    width: 15,
    display: 'inline-block'
  },
  pathText: {
    display: 'inline-block'
  }
});

const theme = createMuiTheme({
  typography: {
    useNextVariants: true,
  },
  palette: {
    primary: {
      main: '#424242'
    },
  }
});

const getKeys = (obj) => Object.keys(obj).filter(function (elem) {
  return elem != 'get' && elem != 'getFriendlyName';
});

const round = (num) => Math.round(num * 100) / 100;

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
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
      anchorEl: null,
    };

    this.nodes = {};
    this.inputEdges = {};
    this.outputEdges = {};

    this.generateData();

    this.handleMenuClick.bind(this);
    this.handleMenuClose.bind(this);
  }


  calculateGraph() {
    console.log(newData);
    console.log('Calculation Run');
    Object.keys(this.inputEdges).forEach((e) => {
      const edge = this.inputEdges[e];
      if (Object.keys(edge) == 0) {
        return;
      }

      console.log(this.inputEdges[e]);
    });
  }

  generateNodeDef(x, y, machine, id, produces = null, requires = null, name = 'Starting Node') {
    return {produces, requires, id, name, x, y, machine};
  }

  addNode(graphRef, machine, x = null, y = null) {
    var bodyEl = document.getElementById('mainRender');
    var width = bodyEl.clientWidth,
      height = bodyEl.clientHeight;

    let produces, requires = null;
    const p = machine.produces;
    produces = {power: p.power, time: p.time, name: p.resource_name, quantity: p.output_quantity};
    if (machine.base_type !== this.structures.MACHINE_NODE_TYPES.MINER) {
      requires = machine.produces.in;
    }

    var d = this.generateNodeDef(x || width / 2, y || height / 2, machine, graphRef.idct++, produces, requires, machine.name);
    graphRef.nodes.push(d);
    this.addNodeToGraph(graphRef, d);
    graphRef.updateGraph();
  }

  addNodeToGraph(graphRef, d) {
    const nodeId = graphRef.idct - 1;
    this.nodes[nodeId] = d;
    this.outputEdges[nodeId] = {};
    this.inputEdges[nodeId] = {};
  }


  removeNode(graphRef, l) {
    graphRef.nodes.splice(graphRef.nodes.indexOf(l), 1);
    this.removeNodeFromGraph(l);
  }

  removeNodeFromGraph(l) {
    const nodeId = l.id;
    delete this.nodes[nodeId];
    delete this.inputEdges[nodeId];
    delete this.outputEdges[nodeId];
  }

  addEdge(graphRef, edgeData) {
    const access = this;
    var newEdge = {source: edgeData.from, target: edgeData.to};
    var filtRes = graphRef.paths.filter(function (d) {
      if (d.source === newEdge.target && d.target === newEdge.source) {
        access.removeEdge(graphRef, d);
      }
      return d.source === newEdge.source && d.target === newEdge.target;
    });

    const fromResource = edgeData.from.produces.name;
    const toResources = edgeData.to.requires ? edgeData.to.requires.map(elem => elem.resource) : [];
    // Filter if it doesn't resolve
    if (!filtRes[0].length && toResources.includes(fromResource)) {
      graphRef.edges.push(newEdge);
      this.addEdgeToGraph(edgeData);
      graphRef.updateGraph();
    }
  }

  addEdgeToGraph(edgeData) {
    this.inputEdges[edgeData.to.id][edgeData.from.id] = {};
    this.outputEdges[edgeData.from.id][edgeData.to.id] = {};
  }

  removeEdge(graphRef, l) {
    graphRef.edges.splice(graphRef.edges.indexOf(l), 1);
    this.removeEdgeFromGraph(l);
  }

  removeEdgeFromGraph(edgeData) {
    delete this.inputEdges[edgeData.target.id][edgeData.source.id];
    delete this.outputEdges[edgeData.source.id][edgeData.target.id];
  }

  addResourceIcon(parentElement) {
    const s = this.structures;
    const requirements = parentElement.datum().requires ? parentElement.datum().requires.length : 0;
    for (let i = 0; i < requirements; i++) {
      //Text First
      const input = parentElement.append('text').text(function (d) {
        const resource = s.ITEMS.get[d.requires[i].resource];

        return resource.name;
      })
        .attr('y', function (d) {
          return 65 + (20 * i);
        })
        .attr('x', function (d) {
          return 15 / 2;
        });
      const bound = input.node().getBBox();

      parentElement.append('svg:image')
        .attr('class', function (d) {
          if (d.machine && d.machine.icon) {
            return 'machine-icon';
          }
          return 'dev-icon';
        })
        .attr('xlink:href', function (d) {
          const resource = s.ITEMS.get[d.requires[i].resource];
          if (resource && resource.icon) {
            return resource.icon;
          }
          return 'https://i.imgur.com/oBmfK3w.png';
        })
        .attr('x', function (d) {
          return bound.x - 15;
        })
        .attr('y', function (d) {
          return bound.y + 1;
        })
        .attr('height', 15)
        .attr('width', 15);
    }

    // ========================
    //Text First
    if (requirements == 0) {
      const input = parentElement.append('text').text(function (d) {
        // const resource = s.ITEMS.get[d.requires[i].resource];
        return round(60 / d.produces.time * d.produces.quantity) + '/min';
        // return resource.name;
      })
        .attr('y', function (d) {
          return 65;
        })
        .attr('x', function (d) {
          return 15 / 2;
        });
      const input_bound = input.node().getBBox();

      parentElement.append('svg:image')
        .attr('class', function (d) {
          if (d.machine && d.machine.icon) {
            return 'machine-icon';
          }
          return 'dev-icon';
        })
        .attr('xlink:href', function (d) {
          const resource = s.ITEMS.get[d.produces.name];
          if (resource && resource.icon) {
            return resource.icon;
          }
          return 'https://i.imgur.com/oBmfK3w.png';
        })
        .attr('x', function (d) {
          return input_bound.x - 15;
        })
        .attr('y', function (d) {
          return input_bound.y + 1;
        })
        .attr('height', 15)
        .attr('width', 15);
    }
    //===================================

    //Output text next
    const output = parentElement.append('text').text(function (d) {
      const resource = s.ITEMS.get[d.produces.name];

      return resource.name;
    })
      .attr('y', function (d) {
        return -53;
      })
      .attr('x', function (d) {
        return 15 / 2;
      });
    const bound = output.node().getBBox();

    parentElement.append('svg:image')
      .attr('class', function (d) {
        if (d.machine && d.machine.icon) {
          return 'machine-icon';
        }
        return 'dev-icon';
      })
      .attr('xlink:href', function (d) {
        const resource = s.ITEMS.get[d.produces.name];
        if (resource && resource.icon) {
          return resource.icon;
        }
        return 'https://i.imgur.com/oBmfK3w.png';
      })
      .attr('x', function (d) {
        return bound.x - 15;
      })
      .attr('y', function (d) {
        return bound.y + 1;
      })
      .attr('height', 15)
      .attr('width', 15);

  }


  generateMeme(d3) {

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
    GraphCreator.prototype.insertNodeTitle = function (gEl) {
      const title = gEl.datum().name;

      var words = title.split(/-/g),
        nwords = words.length;
      var el = gEl.append('g').attr('text-anchor', 'middle').attr('dy', '-' + (nwords - 1) * 7.5);
      for (var i = 0; i < words.length; i++) {
        var backgroundText = el.append('text').attr({
          'fill': 'white',
          'stroke': 'white',
          'stroke-width': 8
        }).text(words[i]);
        if (i > 0) backgroundText.attr('x', 0).attr('dy', 15 * i);
        var tspan = el.append('text').attr('fill', 'black').text(words[i]);
        if (i > 0) tspan.attr('x', 0).attr('dy', 15 * i);
      }

      globalAccessor.addResourceIcon(el);
    };

    // remove edges associated with a node
    GraphCreator.prototype.spliceLinksForNode = function (node) {
      var thisGraph = this,
        toSplice = thisGraph.edges.filter(function (l) {
          return l.source === node || l.target === node;
        });
      toSplice.map(function (l) {
        globalAccessor.removeEdge(thisGraph, l);
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
      thisGraph.updateGraph();
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
        // Create edge and add it to the graph.
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
            // var d3txt = thisGraph.changeTextOfNode(d3node, d);
            // var txtNode = d3txt.node();
            // thisGraph.selectElementContents(txtNode);
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
        // globalAccessor.addNode(thisGraph, {name: 'Debug Node'});
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
          //remove the node
          thisGraph.spliceLinksForNode(selectedNode);
          globalAccessor.removeNode(thisGraph, selectedNode);
          state.selectedNode = null;
          thisGraph.updateGraph();
        } else if (selectedEdge) {
          globalAccessor.removeEdge(thisGraph, selectedEdge);
          state.selectedEdge = null;
          thisGraph.updateGraph();
        }
        break;
      }
    };

    GraphCreator.prototype.svgKeyUp = function () {
      this.state.lastKeyDown = -1;
    };

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

    GraphCreator.prototype.calculateLabelPosition = function (link_label, text) {
      text.attr('x', function (d) {
        var node = d3.select(link_label.node().parentElement).selectAll('path').node();
        var pathLength = node.getTotalLength();
        d.point = node.getPointAtLength(pathLength / 2);
        return d.point.x;
      }).attr('y', function (d) {
        return d.point.y;
      });
    };

    GraphCreator.prototype.insertEdgeLabel = function (gEl) {
      // var link_label = gEl.append('g').attr('class', 'textLabel');
      //
      // const text =  link_label.append('text')
      //   .style('text-anchor', 'middle')
      //   .style('dominant-baseline', 'central')
      //   .attr('class', 'edge-label').text("WHAT");
      //
      // this.calculateLabelPosition(link_label, text);

      const thisGraph = this;
      const {classes} = globalAccessor.props;

      var div_label = gEl.append('foreignObject').attr({
        'width': '200px',
        'height': '200px',
        'class': 'path-tooltip'
      });

      div_label.append('xhtml:div').attr({
        'class': 'path-tooltip-div'
      })
        .append('div')
        .attr({
          'class': 'tooltip'
        }).append('p')
        .attr('class', 'lead')
        .attr('id', function (d) {
          return thisGraph.nodeNaming(d);
        }).html(function (d) {
          /*eslint-disable react/no-unknown-property*/
          return jsxToString(<div>
            <div><img class={classes.pathIcon}
              src="https://i.imgur.com/oBmfK3w.png" title="logo"/>
            <div class={classes.pathText}>Hello there!</div>
            </div>
          </div>);
        /*eslint-enable  react/no-unknown-property*/
        }).attr('dummy_attr', function (d) {
          const node = d3.select(this).node();
          d3.select(d3.select(this).node().parentElement.parentElement.parentElement)
            .attr('width', node.clientWidth + 0.5).attr('height', node.clientHeight + 0.5);
          return 'meep';
        });

      this.calculatePathTooltipPosition(div_label);
    };
    // call to propagate changes to graph
    GraphCreator.prototype.updateGraph = function () {
      globalAccessor.calculateGraph();
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

      // paths.select('.edge-label').each(function(d) {
      //   thisGraph.calculateLabelPosition(d3.select(this.parentElement), d3.select(this));
      // });

      paths.select('foreignObject.path-tooltip').each(function (d) {
        thisGraph.calculatePathTooltipPosition(d3.select(this));
      });

      // add new paths
      const pathObject = paths.enter().append('g');

      pathObject.append('path').style('marker-end', 'url(#end-arrow)').classed('link real-link', true).attr('d', function (d) {
        return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
      }).attr('id', function (d) {
        return 'path-' + thisGraph.nodeNaming(d);
      });

      pathObject.each(function (d) {
        thisGraph.insertEdgeLabel(d3.select(this));
      });

      // Add a copy of the path to the front, but make it invisible
      pathObject.append('path').classed('link hidden-hitbox', true).attr('d', function (d) {
        return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
      }).on('mouseover', function (d) {
        d3.select('#path-' + thisGraph.nodeNaming(d)).classed('tooltip', true);
      }).on('mouseout', function (d) {
        d3.select('#path-' + thisGraph.nodeNaming(d)).classed('tooltip', false);
      }).on('mousedown', function (d) {
        thisGraph.pathMouseDown.call(thisGraph, d3.select('#path-' + thisGraph.nodeNaming(d)), d);
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
        .attr('id', function(d) {
          return 'graph-node-' + d.id;
        })
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
        .attr('class', function (d) {
          if (d.machine && d.machine.icon) {
            return 'machine-icon';
          }
          return 'dev-icon';
        })
        .attr('xlink:href', function (d) {
          if (d.machine && d.machine.icon) {
            return d.machine.icon;
          }
          return 'https://i.imgur.com/oBmfK3w.png';
        })
        .attr('x', function (d) {
          return -50;
        })
        .attr('y', function (d) {
          return -50;
        })
        .attr('height', 100)
        .attr('width', 100);


      newGs.each(function (d) {
        thisGraph.insertNodeTitle(d3.select(this));
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

    // // initial node data
    // var nodes = [
    //   this.generateNodeDef(xLoc, yLoc, null, 0, null, "Debug Node 1"),
    //   this.generateNodeDef(xLoc, yLoc + 200, null, 1, null, "Debug Node 1")
    // ];
    // var edges = [{source: nodes[1], target: nodes[0]}];

    /** MAIN SVG **/
    const svg = d3.select('#mainRender');

    this.graph = new this.GraphCreator(svg);
    // this.graph = new this.GraphCreator(svg, nodes, edges);
    this.graph.setIdCt(0);
    this.graph.updateGraph();
    const machine1 = {
      'name': 'Smelter Mk.1: Iron Ingot',
      'icon': 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png',
      'base_type': 'SMELTER_NODE',
      'produces': {
        'name': 'Iron Ingot',
        'resource_name': 'IRON_INGOT',
        'in': [{'resource': 'IRON_ORE', 'quantity': 1}],
        'machine': 'SMELTER_NODE',
        'output_quantity': 1,
        'time': 2,
        'power': 4
      }
    };
    this.addNode(this.graphCreatorInstance, machine1, 0, 200);
    const machine2 = {
      'name': 'Miner Mk.1: Impure Iron',
      'icon': 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Miner_MK1.png',
      'base_type': 'MINER_NODE',
      'produces': {
        'name': 'Iron Ore',
        'resource_name': 'IRON_ORE',
        'in': [{'resource': 'IRON', 'quantity': 1, 'raw': true, 'purity': 'IMPURE'}],
        'machine': 'MINER_NODE',
        'output_quantity': 1,
        'time': 2,
        'power': 5
      },
      'mining_data': {
        'name': 'Impure Iron',
        'icon': 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Ore.png',
        'produces': 'IRON_ORE',
        'quality': 'IMPURE'
      }
    };
    this.addNode(this.graphCreatorInstance, machine2, 0, 0);
    this.graph.updateGraph();
    this.addEdge(this.graphCreatorInstance, {
      'from': d3.select('#graph-node-1').datum(),
      'to': d3.select('#graph-node-0').datum()
    });
    this.graph.updateGraph();
  }

  generateOresList() {
    const s = this.structures.RESOURCES;

    return getKeys(s).map(function (a) {
      if (s.get[s[a]].hidden) return null;
      const types = s.get[s[a]].types;
      return Object.keys(types).map(function (resource_map) {
        types[resource_map].produces = s.get[s[a]].produces;
        types[resource_map].quality = resource_map;

        return types[resource_map];
      });

    }).flat().filter(elem => elem != null);
  }

  // generateOreButtons() {
  //   const types = this.generateOresList();
  //
  //   return types.map(resource_type =>
  //     (<ListItem button key={resource_type.name} onClick={() => this.addNode(this.graphCreatorInstance, resource_type)}>
  //       <ListItemIcon><AddBoxIcon/></ListItemIcon>
  //       <ListItemText primary={resource_type.name}/>
  //     </ListItem>)
  //   );
  // }


  handleMenuClick(event){
    console.log(event.currentTarget.id);
    this.setState({anchorEl : event.currentTarget});
  }

  handleMenuClose() {
    this.setState({anchorEl : null});
  }

  generateMachineButtons()
  {
    // const types = this.generateMachinesList();
    // const {classes} = this.props;
    // const {anchorEl} = this.state;
    // console.log(anchorEl , this.handleMenuClose);
    // let id = 0;
    //
    // return Object.keys(types).map(mech => {
    //   const machine = types[mech].data;
    //   const machineGroupName = types[mech].name;
    //   console.log(machineGroupName);
    //
    //   return (<div key={'machine-list-panel=' + (++id)}><Divider/>
    //     <ListItem id={machineGroupName + (++id)} onClick={(event) => this.handleMenuClick(event)}>
    //       <ListItemIcon className={classes.icons} ><AddBoxIcon/></ListItemIcon>
    //       <ListItemText primary={machineGroupName} />
    //     </ListItem>
    //     <Menu id={machineGroupName + (++id)} anchorEl={anchorEl} open={(anchorEl && anchorEl.id.includes(machineGroupName)) || false} onClose={() => this.handleMenuClose()}>
    //       {machine.map(each_machine =>
    //         <MenuItem button key={each_machine.name} onClick={() => this.addNode(this.graphCreatorInstance, each_machine)}>{each_machine.name}</MenuItem>
    //       )}
    //     </Menu>
    //   </div>);
    // }
    // );
    const types = this.generateMachinesList();
    const {classes} = this.props;
    let id = 0;

    return Object.keys(types).map(mech => {
      const machine = types[mech].data;
      const machineGroupName = types[mech].name;
      console.log(machineGroupName);

      return (<div key={'machine-list-panel=' + (++id)}><Divider/> {machine.map(each_machine =>
        <ListItem button key={each_machine.name} onClick={() => this.addNode(this.graphCreatorInstance, each_machine)}>
          <ListItemIcon className={classes.icons}><AddBoxIcon/></ListItemIcon>
          <ListItemText primary={each_machine.name}/>
        </ListItem>
      )}</div>);
    }
    );
  }

  generateMachinesList() {
    const s = this.structures.MACHINES;
    const m = this.structures.MACHINE_NODE_TYPES.MINER;
    const n = this.structures.MACHINE_NODE_TYPES;
    const ores = this.generateOresList();
    const returnObj = Object.keys(s).map(function (a) {
      if (s[a].hidden) return null;

      if (a == m) {
        const marks = s[a].types;
        return Object.keys(marks).map(function (b) {
          if (marks[b].hidden) return null;
          const oresMap = ores.map(ore => {

            const recipies = n.get[a];

            const rec = recipies.filter(elem => {
              return elem.in[0].purity == ore.quality && elem.resource_name == ore.produces;
            })[0];
            return Object.assign({}, marks[b], {produces: rec}, {mining_data: ore}, {name: marks[b].name + ': ' + ore.name});
          });
          return oresMap;
        });
      } else {
        const marks = s[a].types;
        return Object.keys(marks).map(function (b) {
          if (marks[b].hidden) return null;
          const recipies = n.get[a];
          return recipies.map(recipie => {
            if (recipie.hidden) return null;
            return Object.assign({}, marks[b], {produces: recipie}, {name: marks[b].name + ': ' + recipie.name});
          }).filter(elem => elem != null);
        });
      }
    });
    const adamHack = returnObj.flat().filter(item => item != null);
    const returnMap = {};
    const st = this.structures.MACHINE_NODE_TYPES;

    adamHack.map(elem => {
      returnMap[elem[0].base_type] = {
        name: st.getFriendlyName[elem[0].base_type],
        data: elem
      };
    });
    return returnMap;
  }

  generateData() {
    this.structures = data;
    this.mutateItemData();
    this.mutateMachineData();
  }

  mutateMachineData() {
    getKeys(this.structures.MACHINES).map(key => {
      getKeys(this.structures.MACHINES[key].types).map(subType => {
        this.structures.MACHINES[key].types[subType].base_type = key;
      });
    });
  }

  mutateItemData() {
    this.structures.MACHINE_NODE_TYPES.get = {};

    const machineRecipies = this.structures.MACHINE_NODE_TYPES.get;

    const items = this.structures.ITEMS;
    const itemKeys = getKeys(this.structures.ITEMS);

    itemKeys.map(element => {
      const item = items.get[items[element]];
      item.crafting.map((elem) => {
        if (machineRecipies[elem.machine] == null) {
          machineRecipies[elem.machine] = [];
        }
        machineRecipies[elem.machine].push(Object.assign({}, {name: item.name, resource_name: element}, elem));
      });
    });

    const s = this.structures.RESOURCES;

    getKeys(s).map(function (a) {
      const types = s.get[s[a]].types;
      Object.keys(types).map(function (resource_map) {

        // For some reason, this doesn't work quite properly.
        types[resource_map].produces = s.get[s[a]].produces;
      });
    });
  }

  render() {
    const {classes} = this.props;
    return <div className={classes.root}>
      <CssBaseline/>
      <MuiThemeProvider theme={theme}>
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar>
            <Typography variant="h6" color="inherit" noWrap>
              <img className={classes.logo}
                src="https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory.png"
                title="logo"/>
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer
          className={classes.drawer}
          variant="permanent"
          classes={{
            paper: classes.drawerPaper,
          }}
        >
          {/*<div className={classes.toolbar}/>*/}
          <List>
            {this.generateMachineButtons()}
          </List>
          <Divider/>
          <List>
            <ListItem button key='Help'>
              <ListItemIcon className={classes.icons}><HelpIcon/></ListItemIcon>
              <ListItemText primary='Help'/>
            </ListItem>
            <ListItem button key='About'>
              <ListItemIcon className={classes.icons}><InfoIcon/></ListItemIcon>
              <ListItemText primary='About'/>
            </ListItem>
          </List>
        </Drawer>
        <main className={classes.content}>
          <svg id="mainRender"/>
        </main>
      </MuiThemeProvider>
    </div>;
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);
