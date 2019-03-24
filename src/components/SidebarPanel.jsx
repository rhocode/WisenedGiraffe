import React from 'react';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import ShuffleIcon from '@material-ui/icons/Shuffle';
import { withStyles } from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import ListItemText from '@material-ui/core/ListItemText';
import Select from '@material-ui/core/Select';
import Checkbox from '@material-ui/core/Checkbox';
import Chip from '@material-ui/core/Chip';

const styles = theme => ({
  root : {
  },
  paper: {
    margin: 16,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0
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
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  chip: {
    margin: theme.spacing.unit / 4,
  },
});

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
    },
  },
};

const drives = [
  'Caterium Wire',
  'Encased Industrial Beam',
  'Heavy Modular Frame',
  'Iron Ingot',
  'Iron Wire',
  'Modular Frame',
  'Rotor',
  'Reinforced Iron Plate',
  'Stator',
  'Steel Ingot',
  'Screw',
  'Stitched Iron Plate',
  'Rubber Cable',
  'Circuit Board',
  'Caterium Computer',
  'Quickwire',
  'Caterium Circuit Board',
  'Crystal Computer'
];

class SidebarPanel extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = { name : []};
  }

  handleChange = event => {
    this.setState({ name: event.target.value });
  };

  render() {
    const { classes, parentState } = this.props;
    return (
      <Paper className={classes.paper}>
        <Typography variant="h5">Settings</Typography>
        <TextField
          label='Default Conveyor Speed'
          type='number'
          className={classes.textField}
          fullWidth
        >
        </TextField>

        <FormControl className={classes.formControl}>
          <InputLabel htmlFor="select-multiple-chip">Hard Drives</InputLabel>
          <Select
            multiple
            value={this.state.name}
            onChange={this.handleChange}
            input={<Input id="select-multiple-chip" />}
            MenuProps={MenuProps}
            renderValue={selected => (
              <div className={classes.chips}>
                {selected.map(value => (
                  <Chip key={value} label={value} className={classes.chip} />
                ))}
              </div>
            )}
          >
            {drives.map(name => (
              <MenuItem key={name} value={name}>
                <Checkbox checked={this.state.name.indexOf(name) > -1} color="primary" />
                <ListItemText primary={name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button className={classes.button} fullWidth onClick={() => {
          console.log(parentState);
          parentState.graphSvg.jiggle();
        }}>
          <ShuffleIcon/>
          <div className={classes.label}>Rejiggle Graph</div>
        </Button>
        <Button className={classes.button} fullWidth onClick={() => {
          parentState.graphSvg.resetCamera();
        }}>
          <ShuffleIcon/>
          <div className={classes.label}>Reset Camera</div>
        </Button>
        <Button className={classes.button} fullWidth onClick={() => {
          parentState.graphSvg.unfixNodes();
        }}>
          <ShuffleIcon/>
          <div className={classes.label}>Unfix Nodes</div>
        </Button>
      </Paper>
    );
  }
}

export default withStyles(styles) (SidebarPanel);