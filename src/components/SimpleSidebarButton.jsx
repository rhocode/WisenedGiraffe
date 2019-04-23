import React from 'react';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import RemoveCircleIcon from '@material-ui/icons/RemoveCircle';
import Popper from '@material-ui/core/Popper';
import {withStyles} from '@material-ui/core';
import MenuList from '@material-ui/core/MenuList';
import Grow from '@material-ui/core/Grow';
import ClickAwayListenerV2 from "./ClickAwayListenerV2";

const styles = theme => ({
    root: {},
    button: {
        flex: '0 0 100%',
        justifyContent: 'left',
        padding: 10,
    },
    paper: {
        margin: theme.spacing.unit * 2,
        display: 'flex',
        zIndex: 1302,
    },
    label: {
        paddingLeft: 10,
    },
    popper: {
        zIndex: 1301,
        left: '13px !important',
    },
    itemListIcon: {
        height: 24,
        width: 24,
        paddingRight: 15,
    },
});

class SimpleSidebarButton extends React.Component {

    constructor(props) {
        super(props);
        this.state = {anchorEl: null};
    }

    handleMenu = event => {
        if (event.currentTarget === this.state.lastTarget)
            return;
        this.setState({anchorEl: event.currentTarget});
    };

    handleClose = () => {
        this.setState({
            anchorEl: null,
            lastTarget: this.state.anchorEl
        }, () => new Promise(resolve => setTimeout(resolve, 100)).then(() => this.setState({lastTarget: null})));
    };

    render() {
        const {classes, listItems, label, appObject} = this.props;
        const {anchorEl} = this.state;
        const open = Boolean(anchorEl);

        return (
            <Paper className={classes.paper}>
                <Button
                    aria-owns={open ? 'menu-appbar' : null}
                    aria-haspopup="true"
                    onClick={open ? this.handleClose : this.handleMenu}
                    className={classes.button}
                >
                        {
                            open ? <RemoveCircleIcon/> : <AddCircleOutlineIcon/>
                        }
                    <div className={classes.label}>Logistics</div>
                </Button>
                <Popper className={classes.popper} open={open} anchorEl={anchorEl} transition placement="right-start">
                    {({TransitionProps, placement}) => (
                        <Grow
                            {...TransitionProps}
                            id="menu-list-grow-1"
                            style={{transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom'}}
                        >
                            <Paper>
                                <ClickAwayListenerV2 onClickAway={this.handleClose} clobberedElement={'#mainRender'}>
                                    <MenuList>
                                        {Object.keys(listItems).map(key => {
                                            const returnDivList = [];
                                            if (!['Miner', 'Logistic'].includes(key)) {
                                                listItems[key].forEach(resource => {
                                                    returnDivList.push(<MenuItem onClick={() => {
                                                        const machine_nodes = appObject.state.machine_node.machine_node;
                                                        machine_nodes.sort((node1, node2) => node1.rank - node2.rank);
                                                        const upgrades = machine_nodes.filter(node => node.machine_class.id === resource.machine_class.id);
                                                        const instance = upgrades[0];
                                                        appObject.graphSvg.addNode(
                                                            {
                                                                data: {recipe: resource},
                                                                machine: resource.machine_class,
                                                                allowedIn: [],
                                                                allowedOut: [],
                                                                instance: instance,
                                                                upgradeTypes: upgrades
                                                            }
                                                        );
                                                        this.handleClose();
                                                    }}
                                                                                 key={resource.machine_class.name + resource.machine_class.id}>
                                                        <img
                                                            src={resource.machine_class.icon}
                                                            className={classes.itemListIcon}/>{resource.machine_class.name}
                                                    </MenuItem>);
                                                });
                                            }
                                            if (['Logistic'].includes(key)) {
                                                listItems[key].forEach(resource => {
                                                    returnDivList.push(<MenuItem onClick={() => {
                                                        const machine_nodes = appObject.state.machine_node.machine_node;
                                                        machine_nodes.sort((node1, node2) => node1.rank - node2.rank);
                                                        const upgrades = machine_nodes.filter(node => node.machine_class.id === resource.machine_class.id && resource.name === node.name);
                                                        const instance = upgrades[0];
                                                        appObject.graphSvg.addNode(
                                                            {
                                                                data: {recipe: resource},
                                                                machine: resource.machine_class,
                                                                allowedIn: [],
                                                                allowedOut: [],
                                                                instance: instance,
                                                                upgradeTypes: upgrades
                                                            }
                                                        );
                                                        this.handleClose();
                                                        appObject.setState({mobileOpen: false})
                                                    }}
                                                                                 key={resource.name}>
                                                        <img src={resource.icon}
                                                             className={classes.itemListIcon}/>{resource.name}
                                                    </MenuItem>);
                                                });
                                            }
                                            return returnDivList;
                                        })}
                                    </MenuList>
                                </ClickAwayListenerV2>
                            </Paper>
                        </Grow>
                    )}
                </Popper>
            </Paper>
        );
    }
}

export default withStyles(styles)(SimpleSidebarButton);