import React from 'react';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';

import { withStyles } from '@material-ui/core';
import MenuList from '@material-ui/core/MenuList';
import Grow from '@material-ui/core/Grow';

const styles = theme => ({
  root: {
  },
  paper: {
    margin: theme.spacing.unit * 2,
    display: 'flex',
  },
  label: {
    paddingLeft: 10,
  },
  popper: {
    zIndex: 1200,
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
    this.state = {anchorEl : null};
  }

  handleMenu = event => {
    if (event.currentTarget === this.state.lastTarget)
      return;
    this.setState({ anchorEl: event.currentTarget, selectedButton: event.currentTarget.id });
  };

  handleClose = () => {
    this.setState({ anchorEl: null, lastTarget: this.state.anchorEl, selectedButton: null}, () => new Promise(resolve => setTimeout(resolve, 100)).then(()=> this.setState({lastTarget: null})) );
  };

  render() {
    const { classes, resource} = this.props;
    const { anchorEl } = this.state;
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
          {({ TransitionProps, placement }) => (
            <Grow
              {...TransitionProps}
              id="menu-list-grow"
              style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
            >
              <Paper>
                <ClickAwayListener onClickAway={this.handleClose}>
                  <MenuList>
                    {
                      listItems.map((item) => {
                        return(
                          <MenuItem key={label+item.name}><img src={machineIcon} className={classes.itemListIcon}/>{item.name}</MenuItem>
                        );
                      })
                    }
                  </MenuList>
                </ClickAwayListener>
              </Paper>
            </Grow>
          )}
        </Popper>
      </React.Fragment>
    );
  }
}

export default withStyles(styles) (InnerNestedSidebarButton);