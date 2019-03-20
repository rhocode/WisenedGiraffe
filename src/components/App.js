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
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import AddBoxIcon from '@material-ui/icons/AddBox';
import InfoIcon from '@material-ui/icons/Info';
import ShareIcon from '@material-ui/icons/Share';
import SettingsInputComponentIcon from '@material-ui/icons/SettingsInputComponent';
import InputIcon from '@material-ui/icons/Input';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';
import DeleteIcon from '@material-ui/icons/Delete';
// import * as d3 from 'd3';

import jsxToString from 'jsx-to-string';

import data from './data';
import createDatabase from './newData';
import GraphSvg from './GraphSvg/index';
import SidebarButton from './SidebarButton';
import FabPopup from './FabPopup';
import {addNode} from "./GraphSvg/nodeActions";

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
    paddingTop: 64,
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
  grow: {
    flexGrow: 1,
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
  },
  paper: {
    margin: theme.spacing.unit * 2,
    display: 'flex',
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.unit * 2,
    right: theme.spacing.unit * 2,
  },
  button: {
    flex: '0 0 100%',
  },
  label: {
    paddingLeft: 10,
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


const round = (num) => Math.round(num * 100) / 100;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false
    };
  }


  // calculateGraph() {
  //   console.log('Calculation Run');
  //   Object.keys(this.inputEdges).forEach((e) => {
  //     const edge = this.inputEdges[e];
  //     if (Object.keys(edge) == 0) {
  //       return;
  //     }
  //
  //     console.log(this.inputEdges[e]);
  //   });
  // }


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


    var GraphCreator = function GraphCreator(svg, nodes, edges) {

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

    // GraphCreator.prototype.insertEdgeLabel = function (gEl) {
    //   // var link_label = gEl.append('g').attr('class', 'textLabel');
    //   //
    //   // const text =  link_label.append('text')
    //   //   .style('text-anchor', 'middle')
    //   //   .style('dominant-baseline', 'central')
    //   //   .attr('class', 'edge-label').text("WHAT");
    //   //
    //   // this.calculateLabelPosition(link_label, text);
    //
    //   const thisGraph = this;
    //   const {classes} = globalAccessor.props;
    //
    //   var div_label = gEl.append('foreignObject').attr({
    //     'width': '200px',
    //     'height': '200px',
    //     'class': 'path-tooltip'
    //   });
    //
    //   div_label.append('xhtml:div').attr({
    //     'class': 'path-tooltip-div'
    //   })
    //     .append('div')
    //     .attr({
    //       'class': 'tooltip'
    //     }).append('p')
    //     .attr('class', 'lead')
    //     .attr('id', function (d) {
    //       return thisGraph.nodeNaming(d);
    //     }).html(function (d) {
    //       /*eslint-disable react/no-unknown-property*/
    //       return jsxToString(<div>
    //         <div><img class={classes.pathIcon}
    //           src="https://i.imgur.com/oBmfK3w.png" title="logo"/>
    //         <div class={classes.pathText}>Hello there!</div>
    //         </div>
    //       </div>);
    //     /*eslint-enable  react/no-unknown-property*/
    //     }).attr('dummy_attr', function (d) {
    //       const node = d3.select(this).node();
    //       d3.select(d3.select(this).node().parentElement.parentElement.parentElement)
    //         .attr('width', node.clientWidth + 0.5).attr('height', node.clientHeight + 0.5);
    //       return 'meep';
    //     });
    //
    //   this.calculatePathTooltipPosition(div_label);
    // };




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
    createDatabase().then((db) => {
      this.setState({db, loaded: true});
    }).then(() => {
      this.generateMeme(window.d3);
      addNode(this.graphSvg, {}, 0,0);
      //
      //
      // const svg = d3.select('#mainRender');
      //
      // this.graph = new this.GraphCreator(svg);
      // // this.graph = new this.GraphCreator(svg, nodes, edges);
      // this.graph.setIdCt(0);
      // this.graph.updateGraph();
      // const machine1 = {
      //   'name': 'Smelter Mk.1: Iron Ingot',
      //   'icon': 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png',
      //   'base_type': 'SMELTER_NODE',
      //   'produces': {
      //     'name': 'Iron Ingot',
      //     'resource_name': 'IRON_INGOT',
      //     'in': [{'resource': 'IRON_ORE', 'quantity': 1}],
      //     'machine': 'SMELTER_NODE',
      //     'output_quantity': 1,
      //     'time': 2,
      //     'power': 4
      //   }
      // };
      // this.addNode(this.graphCreatorInstance, machine1, 0, 200);
      // const machine2 = {
      //   'name': 'Miner Mk.1: Impure Iron',
      //   'icon': 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Miner_MK1.png',
      //   'base_type': 'MINER_NODE',
      //   'produces': {
      //     'name': 'Iron Ore',
      //     'resource_name': 'IRON_ORE',
      //     'in': [{'resource': 'IRON', 'quantity': 1, 'raw': true, 'purity': 'IMPURE'}],
      //     'machine': 'MINER_NODE',
      //     'output_quantity': 1,
      //     'time': 2,
      //     'power': 5
      //   },
      //   'mining_data': {
      //     'name': 'Impure Iron',
      //     'icon': 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Iron_Ore.png',
      //     'produces': 'IRON_ORE',
      //     'quality': 'IMPURE'
      //   }
      // };
      // this.addNode(this.graphCreatorInstance, machine2, 0, 0);
      // this.graph.updateGraph();
      // this.addEdge(this.graphCreatorInstance, {
      //   'from': d3.select('#graph-node-1').datum(),
      //   'to': d3.select('#graph-node-0').datum()
      // });
      // this.graph.updateGraph();
    });
  }

  render() {
    const {classes} = this.props;

    return <div className={classes.root}>
      <CssBaseline/>
      <MuiThemeProvider theme={theme}>
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar>
            <img className={classes.logo}
              src="https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory.png"
              title="logo"/>
            <div className={classes.grow}/>
            <Button color='inherit'><SettingsInputComponentIcon/><div className={classes.label}>Optimize</div></Button>
            <Button color='inherit'><OfflineBoltIcon/><div className={classes.label}>Analyze</div></Button>
            <Button color='inherit'><DeleteIcon/><div className={classes.label}>Clear</div></Button>
            <Button color='inherit'><InputIcon/><div className={classes.label}>Load</div></Button>
            <Button color='inherit'><ShareIcon/><div className={classes.label}>Share</div></Button>
          </Toolbar>
        </AppBar>


        <FabPopup title='Help' classes={classes} contents={
          <React.Fragment>
            <Typography variant="h5">Graph Basics</Typography>
            <ul>
              <li>Use the left menu to add nodes to the graph.</li>
              <li>Click once on a node to select it.</li>
              <li>Select a node and press DELETE to delete it.</li>
              <li>Hold down shift - click and drag from a node to direct it to another node.</li>
            </ul>
          </React.Fragment>
        }/>


        <Drawer
          className={classes.drawer}
          variant="permanent"
          classes={{
            paper: classes.drawerPaper,
          }}
        >
          <List>
            <SidebarButton label={'Constructor'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'Assembler'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'sidebar button'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'sidebar button'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'sidebar button'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'sidebar button'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'sidebar button'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'sidebar button'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'sidebar button'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'sidebar button'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'sidebar button'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'sidebar button'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'sidebar button'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'sidebar button'} items={['menu item 1', 'menu 2']} />
            <SidebarButton label={'sidebar button'} items={['menu item 1', 'menu 2']} />
          </List>

          <Divider/>
          <List>
            <ListItem button key='About'>
              <ListItemIcon className={classes.icons}><InfoIcon/></ListItemIcon>
              <ListItemText primary='About'/>
            </ListItem>
          </List>
        </Drawer>
        <main className={classes.content}>
          {this.state.loaded ? <GraphSvg ref={(graphSvg) => {
            this.graphSvg = graphSvg;
          }} /> : <div />}
        </main>
      </MuiThemeProvider>
    </div>;
  }

}

App.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);
