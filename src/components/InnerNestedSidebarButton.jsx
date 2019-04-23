import React from 'react';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';

import {withStyles} from '@material-ui/core';
import MenuList from '@material-ui/core/MenuList';
import Grow from '@material-ui/core/Grow';
import ClickAwayListenerV2 from './ClickAwayListenerV2';

const styles = theme => ({
  root: {},
  paper: {
    margin: theme.spacing.unit * 2,
    zIndex: 1304,
    display: 'flex',
  },
  label: {
    paddingLeft: 10,
  },
  popper: {
    zIndex: 1303,
    left: '13px !important',
  },
  itemListIcon: {
    height: 24,
    width: 24,
    paddingRight: 15,
  },
});

class InnerNestedSidebarButton extends React.Component {

  constructor(props) {
    super(props);
    this.state = {anchorEl: null};
  }

    handleMenu = event => {
      if (event.currentTarget === this.state.lastTarget)
        return;
      this.setState({anchorEl: event.currentTarget, selectedButton: event.currentTarget.id});
    };

    handleClose = (event) => {
      this.setState({
        anchorEl: null,
        lastTarget: this.state.anchorEl,
        selectedButton: null
      }, () => new Promise(resolve => setTimeout(resolve, 100)).then(() => this.setState({lastTarget: null})));
    };

    render() {
      const {classes, resource, appObject} = this.props;
      const {anchorEl} = this.state;
      const icon = resource.item.icon;
      const label = resource.item.name;
      const listItems = resource.purities;
      const machineIcon = resource.machine_class.icon;
      const open = Boolean(anchorEl);
      return (
        <React.Fragment key={label}>
          <MenuItem
            aria-owns={open ? 'menu-appbar' : null}
            aria-haspopup="true"
            onClick={open ? this.handleClose : this.handleMenu}
            selected={this.state.selectedButton === label}
            id={label}
          >
            <img src={icon} className={classes.itemListIcon}/>
            {label}
          </MenuItem>
          <Popper className={classes.popper} open={open} anchorEl={anchorEl} transition placement="right-start">
            {({TransitionProps, placement}) => (
              <Grow
                {...TransitionProps}
                id="menu-list-grow"
                style={{transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom'}}
              >
                <Paper>
                  <ClickAwayListenerV2 onClickAway={this.handleClose} clobberedElement={'#mainRender'}>
                    <MenuList>
                      {
                        listItems.map((item) => {
                          return (
                            <MenuItem onClick={
                              () => {

                                const machine_nodes = appObject.state.machine_node.machine_node;
                                console.log(machine_nodes)
                                machine_nodes.sort((node1, node2) => node1.rank - node2.rank);
                                const upgrades = machine_nodes.filter(node => node.machine_class.id === resource.machine_class.id);
                                const instance = upgrades[0];
                                appObject.graphSvg.addNode(
                                  {
                                    data: {
                                      machine: resource,
                                      node: item,
                                      recipe: resource,
                                      purity: item.name
                                    },
                                    machine: resource.machine_class,
                                    allowedIn: [],
                                    allowedOut: [resource.item.id],
                                    instance: instance,
                                    upgradeTypes: upgrades,
                                  }
                                );
                                this.handleClose();
                              }
                            } key={label + item.name}><img src={machineIcon}
                                className={classes.itemListIcon}/>{item.name}
                            </MenuItem>
                          );
                        })
                      }
                    </MenuList>
                  </ClickAwayListenerV2>
                </Paper>
              </Grow>
            )}
          </Popper>
        </React.Fragment>
      );
    }
}

export default withStyles(styles)(InnerNestedSidebarButton);