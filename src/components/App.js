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
import * as ReactGA from 'react-ga';

import WarningIcon from '@material-ui/icons/Warning';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';
import SettingsInputComponentIcon from '@material-ui/icons/SettingsInputComponent';

import Button from '@material-ui/core/Button';
import Loader from './Loader';
import createDatabase from './newData';
import GraphSvg from './GraphSvg';

import SidebarButton from './SidebarButton';
import FabPopup from './FabPopup';
import SidebarPopup from './SidebarPopup';
import NestedSidebarButton from './NestedSidebarButton';
import SimpleSidebarButton from './SimpleSidebarButton';
import SidebarPanel from './SidebarPanel';
import ClearButton from './ClearButton';
import ShareButton from './ShareButton';
import LoadButton from './LoadButton';
import SelectorPanel from './SelectorPanel';
import {loadHash, saveHash, useExperimentalFeature} from "./GraphSvg/util";
import 'intro.js/introjs.css';
import { Steps, Hints } from 'intro.js-react';


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
});

const palette = {
    primary: { main: '#FF9100' },
    secondary: { main: '#FF3D00', contrastText: '#FAFAFA' }
};

const themeName = 'Pizazz Vermilion Gayal';

const theme = createMuiTheme({ typography: {
        useNextVariants: true,
    }, palette, themeName: themeName});

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
        ReactGA.initialize('UA-136827615-1');
        ReactGA.pageview(window.location.pathname + window.location.search);
        window.addEventListener("hashchange", () => {
            document.location.reload();
        }, false);

        loadHash().then(data => {
            this.setState({coreGraphData: data}, () => {
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
                                                    return this.generateRecursiveStructure('path_type').then(path_type => {
                                                        this.setState({path_type}, () => {
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
                    });
                });
            });
        });
        // saveHash({data: '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'});
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
                             src="https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satisgraphtory.png"
                             title="logo"/>
                        <div className={classes.grow} />
                        {useExperimentalFeature('opt') ? <Button color="inherit">
                            <OfflineBoltIcon/>
                            <div className={classes.label}>Optimize</div>
                        </Button> : null }
                        <Button color="inherit" onClick={() => t.graphSvg.analyze()}>
                            <SettingsInputComponentIcon/>
                            <div className={classes.label}>Analyze</div>
                        </Button>
                        <ShareButton t={t}/>
                        {/*<LoadButton t={t}/>*/}
                        <ClearButton t={t}/>
                    </Toolbar>
                </AppBar>

                <FabPopup>
                    <Typography variant="h4">Welcome to SatisGraphtory!</Typography>
                    <Typography variant="body1">Thanks for checking out our tool! If you have any questions, suggestions, or feedback, please feel free to join our <a href={"https://discord.gg/ZRpcgqY"}>Discord server</a>! 
                    We're always looking to add more functionality!</Typography>
                    <br />
                    <Typography variant="h5">This tool will always be free.</Typography>
                    <Typography variant="body1">If you would like to contribute, please contact us on Discord. We would love your help!</Typography>
                    <br />
                    <Typography variant="h5">Graph Basics</Typography>
                    <ul>
                        <li><Typography variant="body1">Use the <b>left menu</b> to <b>add</b> nodes (machines/resources) to the graph.</Typography></li>
                        <li><Typography variant="body1"><b>CLICK</b> on a node/path to <b>select</b> it.</Typography></li>
                        <li><Typography variant="body1">Press <b>BACKSPACE</b> on a selected node/path to delete it.</Typography></li>
                        <li><Typography variant="body1">Hold down <b>SHIFT</b> and <b>drag</b> from node to node to create belts.</Typography></li>
                        <li><Typography variant="body1">Use <b>MOUSE WHEEL</b> to control overclock (black text in the white circle).</Typography></li>
                    </ul>
                    <Typography variant="h5">Sharing</Typography>
                    <Typography variant="body1">Generate a share code by clicking the Share button in the top right.</Typography>
                    <br/>
                    <Typography variant="h5">Legend</Typography>
                    <Typography variant="body1"><span style={{'color': 'orange'}}>Orange</span> numbers means that the machine wastes time doing nothing.</Typography>
                    <Typography variant="body1"><span style={{'color': 'LightCoral'}}>Red</span> numbers means that the machine isn't processing fast enough.</Typography>
                    <Typography variant="body1"><span style={{'color': 'Blue'}}>Blue</span> numbers means that the belt capacity was overridden (and you should fix it ASAP!).</Typography>
                    <br/>
                    {/*<Typography variant="body1">Special thanks to the following testers: GeekyMeerkat, Stay, HartWeed, safken, marcspc, Laugexd</Typography>*/}
                    <Typography variant="body1">Revisit these instructions anytime by clicking on the <b>?</b> in the bottom right.</Typography>

                </FabPopup>
                {(this.state.selectedNode && this.state.selectedNode.upgradeTypes.length > 1) || (this.state.selectedPath && this.state.selectedPath.upgradeTypes && this.state.selectedPath.upgradeTypes.length > 1) ?
                    <SelectorPanel label='Options' graphSvg={this.graphSvg}
                                   overclock={this.state.selectedNode ? this.state.selectedNode.overclock : -1} selected={this.state.selectedNode || this.state.selectedPath}/> : null}
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
                        <SidebarPopup Icon={InfoIcon} label='About/Disclaimers' title='About/Disclaimers'>
                            <Typography variant="body1">Created by <a href="https://github.com/tehalexf">Alex</a> and <a
                                href="https://github.com/thinkaliker">Adam</a> (<a
                                href="https://twitter.com/thinkaliker">@thinkaliker</a>).</Typography>
                            <Typography variant="body1">Not officially affiliated with Satisfactory, Coffee Stain
                                Studios AB, or THQ Nordic AB.</Typography>
                            <Typography variant="body1">Images sourced from the Satisfactory Wiki, which is sourced from
                                Coffee Stain Studios AB's Satisfactory.</Typography>
                        </SidebarPopup>
                        <SidebarPopup Icon={WarningIcon} label='Known Issues' title='Known Issues'>
                            <ul>
                                <li>Resource nodes do not have purities displayed on the graph.</li>
                                <li>No option yet to hide belt and factory numbers.</li>
                            </ul>
                        </SidebarPopup>
                    </List>
                </Drawer>
                <div id="svgParent" className={classes.content}>
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
