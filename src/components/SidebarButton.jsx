import React from 'react';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import AddBoxIcon from '@material-ui/icons/AddBox';
import Popper from '@material-ui/core/Popper';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Tooltip from '@material-ui/core/Tooltip';

import { withStyles } from '@material-ui/core';
import MenuList from '@material-ui/core/MenuList';
import Grow from '@material-ui/core/Grow';

const styles = theme => ({
  root: {
  },
  button: {
    flex: '0 0 100%',
    justifyContent: 'left',
    padding: 10,
  },
  paper: {
    margin: theme.spacing.unit * 2,
    display: 'flex',
  },
  label: {
    paddingLeft: 10,
  },
  popper: {
    zIndex: 1
  },
  itemListIcon: {
    height: 24,
    width: 24,
    paddingRight: 10,
    paddingLeft: 10,
  },
});

class SidebarButton extends React.Component {

  constructor(props) {
    super(props);
    this.state = {anchorEl : null};
  }

  handleChange = (event, checked) => {
    this.setState({ auth: checked });
  };

  handleMenu = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleClose = () => {
    this.setState({ anchorEl: null });
  };

  generateInputs(inputs) {
    var output = ''
    for (var input in inputs) {
      for (const [key, value] of input.entries()) {
        output += key + ':' + value + ' ';
      }
    }
    return output;
  }

  render() {
    const { classes } = this.props;
    console.log(this.props)
    const { auth, anchorEl } = this.state;
    const open = Boolean(anchorEl);
    const label = this.props.label;
    const listItems = this.props.items.map((link) => {
      console.log(link);
      return (
        <Tooltip key={link.id} title={this.generateInputs(link.inputs)}>
          <MenuItem onClick={this.handleClose}>
            <img src={link.item.icon} className={classes.itemListIcon} />
            {link.name}
            <div className={classes.grow}/>
          </MenuItem>
        </Tooltip>
      );
    }

    );

    return (
      <React.Fragment key={label}>
        <Paper className={classes.paper}>
          <Button
            aria-owns={open ? 'menu-appbar' : null}
            aria-haspopup="true"
            onClick={this.handleMenu}
            className={classes.button}
          >
            <AddBoxIcon/>
            <div className={classes.label}>
              {label}
            </div>
          </Button>
          <Popper className={classes.popper} open={open} anchorEl={anchorEl} transition disablePortal>
            {({ TransitionProps, placement }) => (
              <Grow
                {...TransitionProps}
                id="menu-list-grow"
                style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
              >
                <Paper>
                  <ClickAwayListener onClickAway={this.handleClose}>
                    <MenuList>
                      {listItems}
                    </MenuList>
                  </ClickAwayListener>
                </Paper>
              </Grow>
            )}
          </Popper>
        </Paper>
        {/*<Menu*/}
        {/*id="menu-appbar"*/}
        {/*anchorEl={anchorEl}*/}
        {/*open={open}*/}
        {/*onClose={this.handleClose}*/}
        {/*>*/}
        {/*{listItems}*/}
        {/*</Menu>*/}
      </React.Fragment>
    );
  }
}

export default withStyles(styles) (SidebarButton);