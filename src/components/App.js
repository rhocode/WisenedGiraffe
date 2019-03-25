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
import ShareIcon from '@material-ui/icons/Share';
import SettingsInputComponentIcon from '@material-ui/icons/SettingsInputComponent';
import InputIcon from '@material-ui/icons/Input';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';
import DeleteIcon from '@material-ui/icons/Delete';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
// import * as d3 from 'd3';

import Loader from './Loader';
import createDatabase from './newData';
import GraphSvg from './GraphSvg';
import {addNode} from './GraphSvg/nodeActions';

import SidebarButton from './SidebarButton';
import FabPopup from './FabPopup';
import ToolbarPopup from './ToolbarPopup';
import SidebarPopup from './SidebarPopup';
import NestedSidebarButton from './NestedSidebarButton';
import SimpleSidebarButton from './SimpleSidebarButton';
import SidebarPanel from './SidebarPanel';


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
    const globalStructure = {};
    this.globalStructure = this.globalStructure || globalStructure;

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
      return this.generateRecursiveStructure('recipe').then(recipes => {
        this.setState({recipes}, () => {
          return this.generateRecursiveStructure('machine_node').then(machine_node => {
            this.setState({machine_node}, () => {
              return this.generateRecursiveStructure('spring').then(spring => {
                this.setState({spring}, () => {
                  return this.generateRecursiveStructure('purity_type').then(purity_type => {
                    this.setState({purity_type}, () => {
                      return this.generateRecursiveStructure('player_unlock').then(player_unlock => {
                        this.setState({player_unlock, isLoaded: true});
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
    this.state.recipes && this.state.recipes.recipe.forEach(recipe => {
      const thisList = recipesByMachineClass[recipe.machine_class.name] || [];
      thisList.push(recipe);
      recipesByMachineClass[recipe.machine_class.name] = thisList;
    });
    return Object.keys(recipesByMachineClass).map(key =>
      <SidebarButton appObject={this} label={key} key={key} items={recipesByMachineClass[key]}/>
    );
  }

  generateContainerList() {
    const springByClass = {};
    this.state.purity_type && this.state.spring && this.state.spring.spring.forEach(spring => {
      const thisList = springByClass[spring.spring_type.name] || [];
      thisList.push(spring);
      springByClass[spring.spring_type.name] = thisList;
    });
    return (
      <SimpleSidebarButton label="Container" listItems={springByClass} />
    );
  }

  generateUnlocksList() {
    const dataList = [];
    this.state.player_unlock && this.state.player_unlock.player_unlock.forEach(player_unlock => {
      console.log(this.state.recipes.recipe)
      const item = this.state.recipes.recipe.filter(elem => elem.player_unlock && (elem.player_unlock.id === player_unlock.id) )[0];
      dataList.push({player_unlock, item});
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
            <ToolbarPopup Icon={DeleteIcon} title='Clear' label='Clear' contents={
              <React.Fragment>
                <div className={classes.dialogContainer}>
                  <Typography variant="h5">Are you sure you want to clear everything?</Typography>
                  <Button color="secondary" variant="outlined" className={`${classes.dialogButton}`}>
                    <DeleteIcon />
                    <div className={classes.label}>Yes, I'm sure!</div>
                  </Button>
                </div>
              </React.Fragment>
            } />
            <ToolbarPopup Icon={InputIcon} title='Load' label='Load' contents={
              <React.Fragment>
                <TextField label="Share Code">
                </TextField>
                <Button color="inherit" className={classes.inlineDialogButton}>
                  <InputIcon/>
                  <div className={classes.label}>Load</div>
                </Button>
              </React.Fragment>
            } />
            <ToolbarPopup Icon={ShareIcon} title='Share' label='Share' contents={
              <React.Fragment>
                <div className={classes.dialogContainer}>
                  <div>
                    <TextField label="Share Code">
                    </TextField>
                    <Button color="inherit" className={classes.inlineDialogButton}>
                      <FileCopyIcon/>
                      <div className={classes.label}>Copy</div>
                    </Button>
                  </div>
                  <Button color="inherit" className={classes.dialogButton} fullWidth>
                    <ShareIcon/>
                    <div className={classes.label}>Generate Image</div>
                  </Button>
                </div>
              </React.Fragment>
            } />
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
          
          <SidebarPanel parentState={this}/>

          <Divider/>

          <List>
            <SidebarPopup Icon={InfoIcon} label='About' title='About' contents={
              <React.Fragment>
                <Typography variant="body1">Created by <a href="https://github.com/tehalexf">Alex</a> and <a href="https://github.com/thinkaliker">Adam</a>.</Typography>
                <Typography variant="body1">Images sourced from the Satisfactory Wiki, which is sourced from Coffee Stain Studios' Satisfactory.</Typography>
              </React.Fragment>
            } />
          </List>
        </Drawer>
        <main className={classes.content}>
          {this.state.loaded ? <GraphSvg parentAccessor={this} ref={(graphSvg) => {
            console.log(graphSvg);
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
