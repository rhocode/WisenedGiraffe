import React from 'react';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import ShuffleIcon from '@material-ui/icons/Shuffle';
import ReplayIcon from '@material-ui/icons/Replay';
import UndoIcon from '@material-ui/icons/Undo';
import {withStyles} from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import ListItemText from '@material-ui/core/ListItemText';
import Select from '@material-ui/core/Select';
import Checkbox from '@material-ui/core/Checkbox';
import Chip from '@material-ui/core/Chip';
import Tooltip from '@material-ui/core/Tooltip';

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
  tooltip: {},
  tooltipIcon: {
    height: 40,
    display: 'inline-block',
    paddingLeft: 10
  },
  tooltipIconFirst: {
    height: 40,
    display: 'inline-block',
  },
  tooltipText: {
    fontSize: 18,
    display: 'inline-block',
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

class SidebarPanel extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = { playerUnlock: this.props.playerUnlock.player_unlock, recipe : this.props.playerUnlock.recipe, selectedDrives: []};
  }

  handleChangeMultiple = event => {
    console.log(event.currentTarget);
    const options = event.currentTarget.parentElement.children;
    const value = [];
    for (let i = 0, l = options.length; i < l; i += 1) {
      if (options[i].getAttribute('value') === event.currentTarget.getAttribute('value')) {
        if (this.state.selectedDrives.indexOf(options[i].getAttribute('value')) === -1) {
          value.push(options[i].getAttribute('value'));
        }
      } else {
        if (options[i].querySelector('input').checked) {
          value.push(options[i].getAttribute('value'));
        }
      }
    }
    this.setState({
      selectedDrives: value,
    });
  };

  render() {
    const { classes, parentState, playerUnlock } = this.props;
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
            value={this.state.selectedDrives}
            onChange={this.handleChangeMultiple}
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
            {this.state.playerUnlock.map(drive => {
              return (<Tooltip key={drive.name+drive.id+'toolip'} className={classes.tooltip} placement="right" title={
                this.state.recipe[drive.id].inputs.map((element, index) => {
                  return (
                    <React.Fragment key={element.item.id}>
                      <img src={element.item.icon} className={index === 0 ? classes.tooltipIconFirst : classes.tooltipIcon}/>
                      <div className={classes.tooltipText}>{element.quantity}</div>
                    </React.Fragment>
                  );
                })
              }>
                <MenuItem key={drive.name+drive.id} value={drive.name}>
                  <Checkbox checked={this.state.selectedDrives.indexOf(drive.name) !== -1} color="primary" />
                  <ListItemText primary={drive.name} />
                </MenuItem>
              </Tooltip>);
            })}
          </Select>
        </FormControl>

        <Button className={classes.button} fullWidth onClick={() => {
          parentState.graphSvg.jiggle();
        }}>
          <ShuffleIcon/>
          <div className={classes.label}>Rejiggle Graph</div>
        </Button>
        <Button className={classes.button} fullWidth onClick={() => {
          parentState.graphSvg.resetCamera();
        }}>
          <ReplayIcon/>
          <div className={classes.label}>Reset Camera</div>
        </Button>
        <Button className={classes.button} fullWidth onClick={() => {
          parentState.graphSvg.fixNodes();
        }}>
          <ReplayIcon/>
          <div className={classes.label}>Fix Nodes</div>
        </Button>
        <Button className={classes.button} fullWidth onClick={() => {
          parentState.graphSvg.unfixNodes();
        }}>
          <UndoIcon/>
          <div className={classes.label}>Unfix Nodes</div>
        </Button>
      </Paper>
    );
  }
}

export default withStyles(styles) (SidebarPanel);