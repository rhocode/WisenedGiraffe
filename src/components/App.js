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
import AddBoxIcon from '@material-ui/icons/AddBox';
import HelpIcon from '@material-ui/icons/Help';
import InfoIcon from '@material-ui/icons/Info';
import jsxToString from 'jsx-to-string';

import data from './data';

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
  },
  drawerPaper: {
    width: drawerWidth,
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

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
    };
  }

  render() {
    const {classes} = this.props;
    return <div className={classes.root}>
      <CssBaseline/>
      <MuiThemeProvider theme={theme}>
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar>
            <Typography variant="h6" color="inherit" noWrap>
              <img className={classes.logo}
                src="https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory.png"
                title="logo"/>
            </Typography>
          </Toolbar>
        </AppBar>
      </MuiThemeProvider>
      <Drawer
        className={classes.drawer}
        variant="permanent"
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <div className={classes.toolbar}/>
        <List>
          {
            // <div key={'machine-list-panel=' + (++id)}><Divider/>
              //     <ListItem id={machineGroupName + (++id)} onClick={(event) => this.handleMenuClick(event)}>
                //       <ListItemIcon className={classes.icons} ><AddBoxIcon/></ListItemIcon>
                //       <ListItemText primary={machineGroupName} />
                //     </ListItem>
              //     <Menu id={machineGroupName + (++id)} anchorEl={anchorEl} open={(anchorEl && anchorEl.id.includes(machineGroupName)) || false} onClose={() => this.handleMenuClose()}>
                //       {machine.map(each_machine =>
                //         <MenuItem button key={each_machine.name} onClick={() => this.addNode(this.graphCreatorInstance, each_machine)}>{each_machine.name}</MenuItem>
                //       )}
                //     </Menu>
                //   </div>
          }
        </List>
        <List>
          <ListItem button key='Help'>
            <ListItemIcon className={classes.icons}><HelpIcon/></ListItemIcon>
            <ListItemText primary='Help'/>
          </ListItem>
          <ListItem button key='About'>
            <ListItemIcon className={classes.icons}><InfoIcon/></ListItemIcon>
            <ListItemText primary='About'/>
          </ListItem>
        </List>
      </Drawer>
      <main className={classes.content}>
        <svg id="mainRender"/>
      </main>
    </div>;

  }

}

App.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);
