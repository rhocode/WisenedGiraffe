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



  componentDidMount() {
    createDatabase().then((db) => {
      this.setState({db, loaded: true});
    }).then(() => {
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
