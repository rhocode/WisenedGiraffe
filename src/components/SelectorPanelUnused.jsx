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
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    minWidth: drawerWidth - 100,
  },
  textField: {
    paddingBottom: 10,
  },
  button: {
    flex: 1,
    marginTop: 10,
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
    this.state = { in : [], out : [],  nameIn: '', nameOut: ''};
  }

  handleChangeIn = event => {
    event.stopPropagation();
    this.setState({ in: event.target.value });
  };

  handleChangeOut = event => {
    event.stopPropagation();
    this.setState({ out: event.target.value });
  };

  handleChangeFilterIn = event => {
    event.stopPropagation();
    this.setState({ nameIn: event.target.value });
  };

  handleChangeFilterOut = event => {
    event.stopPropagation();
    this.setState({ nameOut: event.target.value });
  };

  // <SelectorPanel label='Splitter' />
  render() {
    const { classes, label } = this.props;
    return(
      <Paper className={classes.paper}>
        <Typography variant='h5'>{label}</Typography>
        <Typography variant='h6'>Inputs</Typography>
        <FormControl className={classes.formControl}>
          <Select
            multiple
            value={this.state.in}
            onChange={this.handleChangeIn}
            input={<Input id="select-multiple-checkbox" />}
            renderValue={selected => selected.filter(element => element).join(', ')}
            MenuProps={MenuProps}
          >
            <MenuItem>
              <TextField
                id="standard-name"
                label="Filter"
                className={classes.textField}
                value={this.state.nameIn}
                onChange={this.handleChangeFilterIn}
                margin="normal"
                fullWidth
              />
            </MenuItem>
            {names.filter(element => element.toLowerCase().includes((this.state.nameIn).toLowerCase())).map(name => (
              <MenuItem key={name} value={name}>
                <Checkbox checked={this.state.in.indexOf(name) > -1} color="primary" />
                <ListItemText primary={name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant='h6'>Outputs</Typography>
        <FormControl className={classes.formControl}>
          <Select
            multiple
            value={this.state.out}
            onChange={this.handleChangeOut}
            input={<Input id="select-multiple-checkbox" />}
            renderValue={selected => selected.filter(element => element).join(', ')}
            MenuProps={MenuProps}
          >
            <MenuItem>
              <TextField
                id="standard-name"
                label="Filter"
                className={classes.textField}
                value={this.state.nameOut}
                onChange={this.handleChangeFilterOut}
                margin="normal"
                fullWidth
              />
            </MenuItem>
            {names.filter(element => element.toLowerCase().includes((this.state.nameOut).toLowerCase())).map(name => (
              <MenuItem key={name} value={name}>
                <Checkbox checked={this.state.out.indexOf(name) > -1} color="primary" />
                <ListItemText primary={name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>
    );
  }
}

export default withStyles(styles) (SelectorPanel);