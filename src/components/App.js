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
import MenuList from '@material-ui/core/MenuList';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import AddBoxIcon from '@material-ui/icons/AddBox';
import HelpIcon from '@material-ui/icons/Help';
import InfoIcon from '@material-ui/icons/Info';
import Fab from '@material-ui/core/Fab'
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import withMobileDialog from '@material-ui/core/withMobileDialog';
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
    display: 'flex',
    paddingTop: 64,
  },
  drawerPaper: {
    width: drawerWidth,
    top: 64,
    paddingBottom: 64,
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
  },
  paper: {
    margin: theme.spacing.unit * 2,
    display: 'flex',
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.unit * 2,
    right: theme.spacing.unit * 2,
  },
  button: {
    flex: '0 0 100%',
  },
  modal: {
    position: 'absolute',
    width: theme.spacing.unit * 100,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing.unit * 4,
    outline: 'none',
    margin: 'auto'
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
      anchorEl : null,
      menuOpen : false,
      modalOpen : false,
    };
  }

  handleMenuClick(event){
    console.log(event.currentTarget)
    this.setState({anchorEl : event.currentTarget});
  }

  //TODO abstract out like https://stackoverflow.com/questions/48169492/how-to-assign-which-menuitems-open-onclick-when-multiple-menus-are-present-on-th
  handleMenuClose() {
    // if (this.anchorEl.contains(event.target)){
    //   return;
    // }

    // this.setState({menuOpen : false});
    this.setState({ anchorEl : null});
  }

  handleMenuToggle() {
    this.setState(state => ({ menuOpen: !state.menuOpen }));
  }

  handleModalOpen() {
    this.setState({modalOpen : true});
  }

  handleModalClose(){
    this.setState({modalOpen : false});
  }

  render() {
    const {classes} = this.props;
    
    const { menuOpen } = this.state;
    const { anchorEl } = this.state;
    return <div className={classes.root}>
      <CssBaseline/>
      <MuiThemeProvider theme={theme}>
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar>
            <img className={classes.logo}
              src="https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory.png"
              title="logo"/>
          </Toolbar>
        </AppBar>
      </MuiThemeProvider>
      <Fab aria-label='help' color='primary' className={classes.fab} onClick={() => this.handleModalOpen()}>
        <HelpIcon />
      </Fab>
      <Dialog
        open={Boolean(this.state.modalOpen)}
        onClose={() => this.handleModalClose()}
        id='help-modal'
      >
        <DialogTitle>Help</DialogTitle>
        <DialogContent>
          <Typography variant="h5">Graph Basics</Typography>
          <ul>
            <li>Use the left menu to add nodes to the graph.</li>
            <li>Click once on a node to select it.</li>
            <li>Click twice on a node and press DELETE to delete it.</li>
            <li>Hold down shift - click and drag from a node to direct it to another node.</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => this.handleModalClose()} color='secondary'>Close</Button>
        </DialogActions>
      </Dialog>

      <Drawer
        className={classes.drawer}
        variant="permanent"
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        

        <List>
          <Paper className={classes.paper}>
            <Button
              aria-haspopup="true"
              onClick={(event) => this.handleMenuClick(event, this)}
              className={classes.button}
              id='constructor'
            >
              <AddBoxIcon/>
              Constructor
            </Button>
          </Paper>
          <Menu id='menu' anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => this.handleMenuClose()}>
            <MenuItem onClick={() => this.handleMenuClose()} >constructor 1</MenuItem>
            <MenuItem onClick={() => this.handleMenuClose()} >Menu Item 2</MenuItem>
          </Menu>

          <Paper className={classes.paper}>
            <Button
              aria-haspopup="true"
              onClick={(event) => this.handleMenuClick(event)}
              className={classes.button}
              id='assembler'
            >
              <AddBoxIcon/>
              Assembler
            </Button>
          </Paper>
          <Menu id='menu' anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => this.handleMenuClose()}>
            <MenuItem onClick={() => this.handleMenuClose()} >assembler 1</MenuItem>
            <MenuItem onClick={() => this.handleMenuClose()} >Menu Item 2</MenuItem>
          </Menu>

          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Button
              className={classes.button}
            >
              <AddBoxIcon/>
              TEST
            </Button>
          </Paper>
        </List>
          
        <Divider/>
        <List>
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
