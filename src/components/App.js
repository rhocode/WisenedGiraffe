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

import createDatabase from './newData';
import GraphSvg from './GraphSvg';
import SidebarButton from './SidebarButton';
import FabPopup from './FabPopup';
import ToolbarPopup from './ToolbarPopup';
import SidebarPopup from './SidebarPopup';
import NestedSidebarButton from './NestedSidebarButton';
import Loader from './Loader';
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
                      this.setState({isLoaded: true});
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
    return Object.keys(springByClass)
      .map(key => {
        const returnDivList = [];
        if (!['Miner'].includes(key)) {
          returnDivList.push(<div/>);
        }
        return returnDivList;
      });
  }

  generateSpringList() {
    const springByClass = {};
    this.state.spring && this.state.spring.spring.forEach(spring => {
      const thisList = springByClass[spring.spring_type.name] || [];
      thisList.push(spring);
      springByClass[spring.spring_type.name] = thisList;
    });
    return (
      <NestedSidebarButton appObject={this} label='Miner' listItems={springByClass}/>
      // <React.Fragment key={label}>
      //   <Paper className={classes.paper}>
      //     <Button
      //       aria-owns={open ? 'menu-appbar' : null}
      //       aria-haspopup="true"
      //       onClick={open ? this.handleClose : this.handleMenu}
      //       className={classes.button}
      //     >
      //       <AddBoxIcon/>
      //       <div className={classes.label}>Miner</div>
      //     </Button>
      //     {Object.keys(springByClass).map(key => {
      //       const returnDivList = [];
      //       if (['Miner'].includes(key)) {
      //         springByClass[key].forEach(resource => {
      //           console.log(resource);
      //           returnDivList.push();
      //         });
      //       }
      //       return returnDivList;
      //     })}
      //   </Paper>
      // </React.Fragment>
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
            <div className={classes.grow} />
            <ToolbarPopup Icon={OfflineBoltIcon} title='Analyze' label='Analyze' contents=''/>
            <ToolbarPopup Icon={SettingsInputComponentIcon} title='Optimize' label='Optimize' contents=''/>
            <ToolbarPopup Icon={DeleteIcon} title='Clear' label='Clear' contents=''/>
            <ToolbarPopup Icon={InputIcon} title='Load' label='Load' contents=''/>
            <ToolbarPopup Icon={ShareIcon} title='Share' label='Share' contents=''/>
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
            {this.generateNodeList()}
            {this.generateSpringList()}
          </List>
          <Divider/>
          <List>
            <SidebarPopup Icon={InfoIcon} label='About' title='About' contents=''/>
          </List>
        </Drawer>
        <main className={classes.content}>
          {this.state.loaded ? <GraphSvg ref={(graphSvg) => {
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
