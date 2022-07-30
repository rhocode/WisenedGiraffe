import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {createMuiTheme, MuiThemeProvider, withStyles} from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import AppBar from '@material-ui/core/AppBar';
import CssBaseline from '@material-ui/core/CssBaseline';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
import Link from '@material-ui/core/Link';
import * as ReactGA from 'react-ga';

import WarningIcon from '@material-ui/icons/Warning';
import MenuIcon from '@material-ui/icons/Menu';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';
import SettingsInputComponentIcon from '@material-ui/icons/SettingsInputComponent';
import InfoIcon from '@material-ui/icons/Info';

import Button from '@material-ui/core/Button';
import Loader from './Loader';
import GraphSvg from './GraphSvg';

import SidebarButton from './SidebarButton';
import FabPopup from './FabPopup';
import SidebarPopup from './SidebarPopup';
import NestedSidebarButton from './NestedSidebarButton';
import SimpleSidebarButton from './SimpleSidebarButton';
import SidebarPanel from './SidebarPanel';
import ClearButton from './ClearButton';
import ShareButton from './ShareButton';
import SelectorPanel from './SelectorPanel';
import NightToggle from './NightToggle';
import {loadHash, useExperimentalFeature} from './GraphSvg/util';

import createDatabase from './newData';
import IconButton from '@material-ui/core/IconButton';
import Hidden from '@material-ui/core/Hidden';

const drawerWidth = 260;

const styles = theme => ({
  centeredLogo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  root: {
    display: 'flex',
    flexGrow: 1,
    flexBasis: 'auto',
  },
  menuButton: {
    marginLeft: 0,
    marginRight: 12,
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    minHeight: 64
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
  drawerTitle: {
    paddingLeft: 15,
    paddingTop: 5,
  },
  content: {
    display: 'flex',
    flexGrow: 1,
    paddingTop: 64,
  },
  toolbar: theme.mixins.toolbar,
  logo: {
    width: drawerWidth - 10,
  },
  logoSmall: {
    width: 25,
  },
  grow: {
    flexGrow: 1,
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
  button: {
    flex: '0 0 100%',
  },
  label: {
    paddingLeft: 10,
  },
  inlineDialogButton: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  dialogButton: {
    marginTop: 10,
  },
  dialogContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  clearButton: {
    paddingTop: 20,
  },
  hiddenFlex: {
    display: 'flex',
    height: '100%'
  },
});

const palette = {
  type: 'light',
  primary: { main: '#FF9100' },
  secondary: { main: '#FF3D00', contrastText: '#FAFAFA' }
};

const paletteDark = {
  type: 'dark',
  primary: { main: '#FF9100' },
  secondary: { main: '#FF3D00', contrastText: '#FAFAFA' }
};

const themeName = 'Pizazz Vermilion Gayal';

const theme = createMuiTheme({ typography: {
  useNextVariants: true,
}, palette : {
  type: 'light',
  primary: { main: '#FF9100' },
  secondary: { main: '#FF3D00', contrastText: '#FAFAFA'},
}, themeName: themeName});

const themeDark = createMuiTheme({ typography: {
  useNextVariants: true,
}, palette: {
  type: 'dark',
  primary: { main: '#FF9100' },
  secondary: { main: '#FF3D00', contrastText: '#FAFAFA'},
}, themeName: themeName});

class App extends Component {
  constructor(props) {
    super(props);
    let n = (window.localStorage.getItem('nightMode') != null) ? window.localStorage.getItem('nightMode') : 'light';
    window.localStorage.setItem('nightMode', n);
    this.state = {
      loaded: false,
      mobileOpen: false,
      theme: n === 'light' ? theme : themeDark,
      night: n,
    };
  }

  handleNightToggle = () => {
    let newPaletteType = window.localStorage.getItem('nightMode') === 'light' ? 'dark' : 'light';
    this.setState({
      theme: newPaletteType === 'light' ? theme : themeDark,
      night: newPaletteType
    });
    window.localStorage.setItem('nightMode', newPaletteType);
  };

  handleDrawerToggle = () => {
    this.setState(state => ({ mobileOpen: !state.mobileOpen }));
  };

  getRefkeyTableFireBase(table) {
    const db = this.state.fbdb;
    const tableRef = db[table]
    return Promise.resolve(tableRef);
  }

  generateRecursiveStructureFireBase(startingTable) {
    const db = this.state.fbdb;
    const starting = db[startingTable];
    this.globalStructure = this.globalStructure || {};
    const globalStructure = this.globalStructure;

    return Promise.resolve(starting).then( async results => {
      if (results.length > 0) {
        globalStructure[startingTable] = results;

        const refKeysToProcess = Object.keys(results[0]).filter(str => str.endsWith('_id'));

        while (refKeysToProcess.length > 0) {
          const refKey = refKeysToProcess.pop();
          const tableName = refKey.slice(0, -3);
          if (!globalStructure[tableName]) {
            globalStructure[tableName] = await this.getRefkeyTableFireBase(tableName);
            Object.keys(globalStructure[tableName]).filter(str => str.endsWith('_id'))
              .forEach(name => {
                if (!globalStructure[name.slice(0, -3)]) {
                  refKeysToProcess.push(name);
                }
              });
          }
        }

        const recursiveFind = (element, functionToApply) => {
          if (Array.isArray(element)) {
            element.forEach((elem, index) => {
              const shouldChangeThis = recursiveFind(elem, functionToApply);
              if (shouldChangeThis) {
                console.error('Why are we doing this to an array?');
                element[index] = functionToApply(elem);
              }
            });
            return false;
          } else if (typeof element === 'object') {
            Object.keys(element).forEach(key => {
              const elem = element[key];

              const shouldChangeThis = recursiveFind(elem, functionToApply);
              if (shouldChangeThis) {
                functionToApply(elem, key, element);
              }
            });
            return false;
          } else {
            return true;
          }
        };

        Object.keys(globalStructure).forEach(key => {
          const rows = globalStructure[key];

          rows.forEach(row => {
            Object.keys(row).filter(str => str.endsWith('_id')).forEach(rowKey => {
              const refId = row[rowKey];
              const tableName = rowKey.slice(0, -3);
              const associatedData = globalStructure[tableName];
              delete row[rowKey];
              const possibleData = associatedData.filter(elem => elem.id === refId);
              if (possibleData.length === 1) {
                row[tableName] = possibleData[0];
              } else {
                throw new Error('Unrecognized Id ' + refId + ' in ' + rowKey + ' within ' + key);
              }
            });
          });
        });

        Object.keys(globalStructure).forEach(key => {
          const rows = globalStructure[key];
          rows.forEach(row => {
            Object.keys(row).filter(str => str.endsWith('_id')).forEach(rowKey => {
              const refId = row[rowKey];
              const tableName = rowKey.slice(0, -3);
              const associatedData = globalStructure[tableName];
              delete row[rowKey];

              const possibleData = associatedData.filter(elem => elem.id === refId);
              if (possibleData.length === 1) {
                row[tableName] = possibleData[0];
              } else {
                throw new Error('Unrecognized Id ' + refId + ' in ' + rowKey + ' within ' + key);
              }
            });
            Object.keys(row).filter(str => !str.endsWith('_id')).forEach(rowKey => {
              const rowValue = row[rowKey];
              const replaceTable = (id, id_name, object) => {
                if (!id_name.endsWith('_id')) {
                  if (typeof object[id_name] === 'string' && object[id_name].startsWith('http')) {
                    const img = new Image();
                    img.src = object[id_name];
                  }
                  return;
                }

                const refId = id;
                const tableName = id_name.slice(0, -3);
                const associatedData = globalStructure[tableName];
                delete object[id_name];

                const possibleData = associatedData.filter(elem => elem.id === refId);
                if (possibleData.length === 1) {
                  object[tableName] = possibleData[0];
                } else {
                  throw new Error('Unrecognized Id ' + refId + ' in table ' + id_name + ' within ' + object);
                }
              };
              recursiveFind(rowValue, replaceTable);
            });
          });
        });
      }

      return globalStructure;
    });
  }

  recursiveDataTransferFromDb(index, db, tempData) {
    if (index < db.getSchema().tables().length-1) {

      return this.recursiveDataTransferFromDb(index + 1, db, tempData).then((result) => {        

        if (index+1 == db.getSchema().tables().length-1) {
          tempData[db.getSchema().tables()[index+1].getName()] = result;
        }
        
        return db.select().from(db.getSchema().tables()[index]).exec();
      }).then((result) => {
        tempData[db.getSchema().tables()[index].getName()] = result;
        return Promise.resolve(result);
      });

    }
    else {
      return db.select().from(db.getSchema().tables()[index]).exec();
    }
  }

  componentDidMount() {
    ReactGA.initialize('UA-136827615-1');
    ReactGA.pageview(window.location.pathname + window.location.search);
    window.addEventListener('hashchange', () => {
      document.location.reload();
    }, false);

    let temporaryData = {};

    loadHash().then(data => {
      this.setState({coreGraphData: data}, () => {

        createDatabase().then((db) => {
          return db;
        }).then((db) => {
          return this.recursiveDataTransferFromDb(0, db, temporaryData);
         
        }).then(() => {

          this.setState({fbdb: temporaryData, loaded: true}, () => {
  
            const generate = (name, cb = () => {}) => {
              console.log (20);
              return () => {
                return this.generateRecursiveStructureFireBase(name).then(data => {
                  this.setState({[name]: data}, () => {
                    cb();
                  });
                });
              };
            };
  
            let wrappedFunction = () => {
              this.setState({isLoaded: true});
            };
  
            const list = ['spring', 'recipe', 'path_type','machine_node', 'player_unlock', 'machine_class', 'item', 'spring_type', 'purity_type', 'node_type', 'machine_version', 'machine_class'];
  
            list.forEach(item => {
              wrappedFunction = generate(item, wrappedFunction);
            });
  
            wrappedFunction();
  
          });
        });
      });
    });
  }

  generateNodeList() {
    const recipesByMachineClass = {};
    const machineClassPlural = {};
    this.state.recipe && this.state.recipe.recipe.forEach(recipe => {
      const thisList = recipesByMachineClass[recipe.machine_class.name] || [];
      thisList.push(recipe);
      recipesByMachineClass[recipe.machine_class.name] = thisList;
      machineClassPlural[recipe.machine_class.name] = recipe.machine_class.plural;
    });
    Object.keys(recipesByMachineClass).map(item  => {
      recipesByMachineClass[item].sort((a, b) => {
        return a.item.id - b.item.id;
      });
    });
    return Object.keys(recipesByMachineClass).map(key =>
      <SidebarButton appObject={this} label={machineClassPlural[key]} key={key}
        items={recipesByMachineClass[key]}/>
    );
  }

  generateContainerList() {
    const springByClass = {};
    this.state.purity_type && this.state.spring && this.state.spring.spring.forEach(spring => {
      const thisList = springByClass[spring.spring_type.name] || [];
      thisList.push(spring);
      springByClass[spring.spring_type.name] = thisList;
    });

    // Manually handle splitters and mergers
    springByClass['Logistic'] = this.state.machine_node.machine_node.filter(elem => elem.machine_class.name === 'Logistic');


    return (
      <React.Fragment>
        <SimpleSidebarButton label="Logistics" appObject={this} listItems={springByClass}/>
      </React.Fragment>

    );
  }

  generateUnlocksList() {
    const dataList = [];
    this.state.player_unlock && this.state.player_unlock.player_unlock.forEach(player_unlock => {
      const item = this.state.recipe.recipe.filter(elem => elem.player_unlock && (elem.player_unlock.id === player_unlock.id))[0];
      if (item) {
        // dataList.push({player_unlock, item});
      }
    });
    return (
      <div>hello</div>
    );
  }

  generateSpringList() {
    this.generateUnlocksList();
    const springByClass = {};
    this.state.spring && this.state.spring.spring.forEach(spring => {
      const thisList = springByClass[spring.spring_type.name] || [];
      thisList.push(spring);
      springByClass[spring.spring_type.name] = thisList;
    });
    return (
      <NestedSidebarButton label='Miners' listItems={springByClass} appObject={this}/>
    );
  }

  drawerContents = () => {
    const classes = this.props.classes;
    return <React.Fragment>
      <List>
        <Typography variant="h5" className={classes.drawerTitle}>Nodes</Typography>
        {this.generateNodeList()}
        {this.generateSpringList()}
        {this.generateContainerList()}
      </List>
      <Divider/>

      <SidebarPanel parentState={this} playerUnlock={this.state.player_unlock}/>

      <Divider/>

      <List>
        <SidebarPopup Icon={InfoIcon} label='About/Disclaimers' title='About/Disclaimers'>
          <Typography variant="body1">Created by <Link href="https://github.com/tehalexf" target="_blank" rel="noopener" color='secondary'>Alex</Link> and <Link
            href="https://github.com/thinkaliker" target="_blank" rel="noopener" color='secondary'>Adam</Link> (<Link
            href="https://twitter.com/thinkaliker" target="_blank" rel="noopener" color='secondary'>@thinkaliker</Link>).</Typography>
          <Typography variant="body1">Not officially affiliated with Satisfactory, Coffee Stain
                    Studios AB, or THQ Nordic AB.</Typography>
          <Typography variant="body1">Images sourced from the Satisfactory Wiki, which is sourced from
                    Coffee Stain Studios AB's Satisfactory.</Typography>
        </SidebarPopup>
        <SidebarPopup Icon={WarningIcon} label='Known Issues' title='Known Issues'>
          <ul>
            <Typography variant='body1'><li>Resource nodes do not have purities displayed on the graph.</li></Typography>
            <Typography variant='body1'><li>No option yet to hide belt and factory numbers.</li></Typography>
          </ul>
        </SidebarPopup>
      </List>
    </React.Fragment>;
  };

  render() {
    const {classes} = this.props;
    if (!this.state.isReady) {
      return <Loader ready={this.state.isLoaded} parentState={this}/>;
    }
    const t = this;

    return <div className={classes.root}>

      <CssBaseline/>
      <MuiThemeProvider theme={this.state.theme}>
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar>
            <Hidden mdUp implementation="css">
              <div className={classes.centeredLogo}>
                <IconButton
                  color="inherit"
                  aria-label="Open drawer"
                  onClick={this.handleDrawerToggle}
                  // className={classes.menuButton}
                >
                  <MenuIcon />
                </IconButton>
                <img alt="wow so satis factory" className={classes.logoSmall}
                  src="https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/dot.png"
                  title="logo"/>
              </div>
            </Hidden>
            <Hidden smDown implementation="css">
              <img alt="wow so satis factory" className={classes.logo}
                src="https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satisgraphtory.png"
                title="logo"/>
            </Hidden>

            <div className={classes.grow} />
            <NightToggle t={t} onNightToggle={this.handleNightToggle} night={this.state.night}/>
            {useExperimentalFeature('opt') ? <Button color="inherit" onClick={() => t.graphSvg.optimize()}>
              <OfflineBoltIcon/>
              <Hidden smDown implementation="css">
                <div className={classes.label}>Optimize</div>
              </Hidden>
            </Button> : null }
            <Button color="inherit" onClick={() => t.graphSvg.analyze()}>
              <SettingsInputComponentIcon/>
              <Hidden smDown implementation="css">
                <div className={classes.label}>Analyze</div>
              </Hidden>
            </Button>
            <ShareButton t={t}/>
            {/*<LoadButton t={t}/>*/}
            <ClearButton t={t}/>
          </Toolbar>
        </AppBar>

        <FabPopup>
          <Typography variant="h4">Welcome to SatisGraphtory!</Typography>
          <Typography variant="body1">This is a factory planner/optimizer/analyzer tool for factories old and new, meant to accompany the game Satisfactory by Coffee Stain Studios. </Typography>
          <br />
          <Typography variant="body1">We are looking for more developers! If you know React, reach out to us on our <Link href={'https://discord.gg/ZRpcgqY'} target="_blank" rel="noopener" color="secondary">Discord server</Link>!</Typography>
          <Typography variant="body1">Thanks for checking out our tool! If you have any questions, suggestions, feedback, <Link href={'https://discord.gg/ZRpcgqY'} target="_blank" rel="noopener" color="secondary">join our community!</Link></Typography>
          <br />
          <Typography variant="h5">This tool will always be free.</Typography>
          <br />
          <Typography variant="h5">Graph Basics</Typography>
          <ul>
            <Typography variant="body1"><li>Use the <b>left menu</b> to <b>add</b> machines to the diagram</li></Typography>
            
            <Typography variant="body1"><li><b>CLICK</b> on a node/path to <b>select</b> it</li></Typography>
            <Typography variant="body1"><li>Press <b>BACKSPACE</b> on a selected node/path to delete it</li></Typography>
            <Typography variant="body1"><li>Hold down <b>SHIFT</b> and <b>drag</b> from node to node to create belts</li></Typography>
            <Typography variant="body1"><li>Use <b>MOUSE SCROLL</b> to control overclock (black text in the white circle)</li></Typography>
          </ul>
          <Typography variant="h5">Sharing</Typography>
          <Typography variant="body1">Generate a share code by using the Share button in the top right.</Typography>
          <br/>
          <Typography variant="h5">Legend</Typography>
          <Typography variant="body1"><span style={{'color': 'orange'}}>Orange</span> numbers means the machine wastes time doing nothing.</Typography>
          <Typography variant="body1"><span style={{'color': 'LightCoral'}}>Red</span> numbers means the machine isn't processing fast enough.</Typography>
          <Typography variant="body1"><span style={{'color': 'Blue'}}>Blue</span> numbers means the belt capacity was overridden (and you need to fix it ASAP!)</Typography>
          <br/>
          {/*<Typography variant="body1">Special thanks to the following testers: GeekyMeerkat, Stay, HartWeed, safken, marcspc, Laugexd</Typography>*/}
          <Typography variant="body1">Revisit these instructions anytime by clicking on the <b>?</b> in the bottom right.</Typography>

        </FabPopup>
        {/*{(this.state.selectedNode && ['Container', 'Oil Pump'].includes(this.state.selectedNode.machine.name)) ||(this.state.selectedNode && this.state.selectedNode.upgradeTypes.length > 1) || (this.state.selectedPath && this.state.selectedPath.upgradeTypes*/}
        {/*          && this.state.selectedPath.upgradeTypes.length > 1) ?*/}
        {/*   : null}*/}
        {this.state.selectedNode || this.state.selectedPath ? <SelectorPanel items={this.state.item.item} label='Options' graphSvg={this.graphSvg}
                                                                              overclock={this.state.selectedNode ? this.state.selectedNode.overclock : -1} selected={this.state.selectedNode || this.state.selectedPath}/> : null}

        <Hidden mdUp implementation="css">
          <Drawer
            container={this.props.container}
            variant="temporary"
            anchor={theme.direction === 'rtl' ? 'right' : 'left'}
            open={this.state.mobileOpen}
            onClose={this.handleDrawerToggle}
            classes={{
              paper: classes.drawerPaper,
            }}
          >
            {this.drawerContents()}
          </Drawer>
        </Hidden>
        <Hidden smDown implementation="css">
          <div className={classes.hiddenFlex}>
            <Drawer
              className={classes.drawer}
              variant="permanent"
              classes={{
                paper: classes.drawerPaper,
              }}
            >
              {this.drawerContents()}
            </Drawer>
          </div>
        </Hidden>



        <div id="svgParent" className={`${classes.content} ${this.state.night === 'dark' ? 'dark' : ''}`}>
          {this.state.loaded ? <GraphSvg parentAccessor={this} ref={(graphSvg) => {
            t.graphSvg = graphSvg;
          }}/> : <div/>}
        </div>
      </MuiThemeProvider>
    </div>;
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);
