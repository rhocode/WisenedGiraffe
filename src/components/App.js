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
import InfoIcon from '@material-ui/icons/Info';

import SettingsInputComponentIcon from '@material-ui/icons/SettingsInputComponent';
import InputIcon from '@material-ui/icons/Input';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Loader from './Loader';
import createDatabase from './newData';
import GraphSvg from './GraphSvg';

import SidebarButton from './SidebarButton';
import FabPopup from './FabPopup';
import ToolbarPopup from './ToolbarPopup';
import SidebarPopup from './SidebarPopup';
import NestedSidebarButton from './NestedSidebarButton';
import SimpleSidebarButton from './SimpleSidebarButton';
import SidebarPanel from './SidebarPanel';
import SelectorPanel from './SelectorPanel';
import ClearButton from "./ClearButton";
import ShareButton from "./ShareButton";
import LoadButton from "./LoadButton";
// import * as d3 from 'd3';

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
    width: drawerWidth,
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
  inlineDialogButton : {
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

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false
    };
  }

  getRefkeyTable(table) {
    const db = this.state.db;
    const tableRef = db.getSchema().table(table);
    return new Promise(resolve => db.select()
      .from(tableRef).exec().then(results => resolve(results)));
  }

  generateRecursiveStructure(startingTable) {
    const db = this.state.db;
    const starting = db.getSchema().table(startingTable);
    this.globalStructure = this.globalStructure || {};
    const globalStructure = this.globalStructure;

    return db.select().from(starting).exec().then(async results => {
      if (results.length > 0) {
        globalStructure[startingTable] = results;

        const refKeysToProcess = Object.keys(results[0]).filter(str => str.endsWith('_id'));

        while (refKeysToProcess.length > 0) {
          const refKey = refKeysToProcess.pop();
          const tableName = refKey.slice(0, -3);
          if (!globalStructure[tableName]) {
            globalStructure[tableName] = await this.getRefkeyTable(tableName);
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

  componentDidMount() {
    createDatabase().then((db) => {
      this.setState({db, loaded: true});
    }).then(() => {
      return this.generateRecursiveStructure('player_unlock').then(player_unlock => {
        this.setState({player_unlock}, () => {
          return this.generateRecursiveStructure('recipe').then(recipe => {
            this.setState({recipe}, () => {
              return this.generateRecursiveStructure('machine_node').then(machine_node => {
                this.setState({machine_node}, () => {
                  return this.generateRecursiveStructure('spring').then(spring => {
                    this.setState({spring}, () => {
                      return this.generateRecursiveStructure('purity_type').then(purity_type => {
                        this.setState({purity_type, isLoaded: true});
                      });
                    });
                  });
                });
              });
            });
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
    return Object.keys(recipesByMachineClass).map(key =>
      <SidebarButton appObject={this} label={machineClassPlural[key]} key={key} items={recipesByMachineClass[key]}/>
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
        <SimpleSidebarButton label="Logistics" appObject={this} listItems={springByClass} />
      </React.Fragment>

    );
  }

  generateUnlocksList() {
    const dataList = [];
    this.state.player_unlock && this.state.player_unlock.player_unlock.forEach(player_unlock => {
      const item = this.state.recipe.recipe.filter(elem => elem.player_unlock && (elem.player_unlock.id === player_unlock.id) )[0];
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


  render() {
    const {classes} = this.props;
    if (!this.state.isReady) {
      return <Loader ready={this.state.isLoaded} parentState={this}/>;
    }

    const t = this;

    return <div className={classes.root}>
      <CssBaseline/>
      <MuiThemeProvider theme={theme}>
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar>
            <img alt="wow so satis factory" className={classes.logo}
              src="https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory.png"
              title="logo"/>
            <div className={classes.grow}></div>
            <Button color="inherit" >
              <OfflineBoltIcon/>
              <div className={classes.label}>Analyze</div>
            </Button>
            <Button color="inherit" >
              <SettingsInputComponentIcon/>
              <div className={classes.label}>Optimize</div>
            </Button>
            <ShareButton t={t} />
            <LoadButton t={t} />
            <ClearButton t={t} />
          </Toolbar>
        </AppBar>

        <FabPopup title='Help' contents={
          <React.Fragment>
            <Typography variant="h5">Graph Basics</Typography>
            <ul>
              <li><Typography variant="body1">Use the left menu to add nodes to the graph.</Typography></li>
              <li><Typography variant="body1">Click once on a node to select it.</Typography></li>
              <li><Typography variant="body1">Click twice on a node and press DELETE to delete it.</Typography></li>
              <li><Typography variant="body1">Hold down shift - click and drag from a node to direct it to another
                node.</Typography></li>
            </ul>
            <Typography variant="h5">Saving/Loading</Typography>
            <Typography variant="body1">TODO</Typography>
          </React.Fragment>
        }/>

        <SelectorPanel label='Splitters'/>

        <Drawer
          className={classes.drawer}
          variant="permanent"
          classes={{
            paper: classes.drawerPaper,
          }}
        >
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
            <SidebarPopup Icon={InfoIcon} label='About/Disclaimers' title='About/Disclaimers' contents={
              <React.Fragment>
                <Typography variant="body1">Created by <a href="https://github.com/tehalexf">Alex</a> and <a href="https://github.com/thinkaliker">Adam</a> (<a href="https://twitter.com/thinkaliker">@thinkaliker</a>).</Typography>
                <Typography variant="body1">Not officially affiliated with Satisfactory, Coffee Stain Studios AB, or THQ Nordic AB.</Typography>
                <Typography variant="body1">Images sourced from the Satisfactory Wiki, which is sourced from Coffee Stain Studios AB's Satisfactory.</Typography>
              </React.Fragment>
            } />
          </List>
        </Drawer>
        <main className={classes.content}>
          {this.state.loaded ? <GraphSvg parentAccessor={this} ref={(graphSvg) => {
            console.log('Loaded graphSvg main object:', graphSvg);
            t.graphSvg = graphSvg;
          }}/> : <div/>}
        </main>
      </MuiThemeProvider>
    </div>;
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);
