import React from 'react';
import {Typography, withStyles} from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import ListItemText from '@material-ui/core/ListItemText';
import Select from '@material-ui/core/Select';
import Checkbox from '@material-ui/core/Checkbox';
import TextField from '@material-ui/core/TextField';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio from '@material-ui/core/Radio';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import IconButton from '@material-ui/core/IconButton';
import {updateNodeTierExternal} from "./GraphSvg/nodeActions";
import * as d3 from 'd3';
const drawerWidth = 310;

const styles = theme => ({
  root : {
  },
  formControl: {
    maxWidth: drawerWidth,
  },
  paper: {
    position: 'absolute',
    left: drawerWidth + 20,
    bottom: 20,
    margin: 16,
    padding: 12,
    minWidth: drawerWidth - 100,
  },
  textField: {
    paddingBottom: 10,
  },
  button: {
  },
  label: {
    paddingLeft: 10,
  },
});

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      minWidth: drawerWidth / 2,
    },
  },
};

const names = [
  'Oliver Hansen',
  'Van Henry',
  'April Tucker',
  'Ralph Hubbard',
  'Omar Alexander',
  'Carlos Abbott',
  'Miriam Wagner',
  'Bradley Wilkerson',
  'Virginia Andrews',
  'Kelly Snyder',
];

class SelectorPanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = { dummy: false};
  }

  update = () => {
    if (this.props.selected.machine)  {
      const el = d3.select('#' + 'node-level-accessor-' + this.props.selected.id);
      updateNodeTierExternal(el);
    } else {
      // it's a path
      const el = d3.select('#' + 'path-parent' + this.props.selected.source.id + '-' + this.props.selected.target.id);
      updateNodeTierExternal(el);
    }
  }

  upgrade = () => {
    const instance = this.props.selected.instance
    let index = this.props.selected.upgradeTypes.indexOf(instance);
    const n = this.props.selected.upgradeTypes.length;
    index = (index + 1);
    if (index >= n) return;
    this.props.selected.instance = this.props.selected.upgradeTypes[index];
    this.update();

    this.setState({dummy: !this.state.dummy});
  }

  downgrade = () => {
    const instance = this.props.selected.instance
    let index = this.props.selected.upgradeTypes.indexOf(instance);
    const n = this.props.selected.upgradeTypes.length;
    index = index - 1;

    if (index < 0) return;

    this.props.selected.instance = this.props.selected.upgradeTypes[index];
    this.update();

    this.setState({dummy: !this.state.dummy});
  }

  render() {
    const { classes, label } = this.props;
    return(
      <Paper className={classes.paper}>
        <Typography variant='h5'>{label}</Typography>
        <IconButton color="primary" className={classes.button} onClick={this.upgrade}>
          <ArrowUpwardIcon />
        </IconButton>
        {this.props.selected.instance.name}
        <IconButton color="secondary" className={classes.button} onClick={this.downgrade}>
          <ArrowDownwardIcon />
        </IconButton>
      </Paper>
    );
  }
}

export default withStyles(styles) (SelectorPanel);