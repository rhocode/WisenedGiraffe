import React from 'react';
import {Typography, withStyles} from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import IconButton from '@material-ui/core/IconButton';
import Slider from '@material-ui/lab/Slider';
import {updateNodeTierExternal, wheelZoomCalculation} from "./GraphSvg/nodeActions";
import * as d3 from 'd3';
import Checkbox from "@material-ui/core/Checkbox";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Input from "@material-ui/core/Input";
import Chip from "@material-ui/core/Chip";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import TextField from "@material-ui/core/TextField";
import Hidden from "@material-ui/core/Hidden";

const drawerWidth = 260;

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;

const styles = theme => ({
    root: {},
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
    paperMobile: {
        position: 'absolute',
        left: 20,
        bottom: 20,
        margin: 16,
        padding: 12,
        minWidth: drawerWidth - 100,
    },
    textField: {
        paddingBottom: 10,
        minWidth: 110
    },
    button: {},
    label: {
        paddingLeft: 10,
    },
    slider: {
        padding: '10px',
    },
    overclock: {
        paddingLeft: 10,
    },
    icon: {
        paddingRight: 4
    },
    itemInput: {

    },
    formGroup: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end'
    },

    textMiddle: {
        margin: 10,
        marginBottom: 20.
    }
});

const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        },
    },
};

class SelectorPanel extends React.Component {

    constructor(props) {
        super(props);
        const items = JSON.parse(JSON.stringify(props.items.filter(item => !item.hidden)));

        this.itemMap = {};
        items.forEach(it => {
            this.itemMap[it.id] = it;
        });

        items.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
        this.items = items;
        this.state = {quantity: props.selected.quantityPerInfinite || 0, time: props.selected.timePerInfinite || 1, dummy: false, sliderValue: props.selected.overclock, selectedSource:  props.selected.allowedOut || []};
    }

    debounce = (func, wait, immediate) => {
        var timeout;

        return function executedFunction() {
            var context = this;
            var args = arguments;

            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };

            var callNow = immediate && !timeout;

            clearTimeout(timeout);

            timeout = setTimeout(later, wait);

            if (callNow) func.apply(context, args);
        };
    };

    update = () => {
        if (this.props.selected.machine) {
            const el = d3.select('#' + 'node-level-accessor-' + this.props.selected.id);
            updateNodeTierExternal(el);

            this.props.selected.overclock = this.state.sliderValue;
            const el2 = d3.select('#' + 'node-overclock-accessor-' + this.props.selected.id);
            wheelZoomCalculation.call(this, this.props.selected, this.state.sliderValue, el2);
        } else {
            // it's a path
            const el = d3.select('#' + 'path-parent' + this.props.selected.source.id + '-' + this.props.selected.target.id);
            updateNodeTierExternal(el);
        }
    };

    debouncedUpdateGraph = this.debounce(() => {
        this.props.graphSvg.updateGraphHelper();
    }, 200);

    debouncedUpdate = this.debounce(() => {
        this.update();
    }, 200);

    upgrade = () => {
        const instance = this.props.selected.instance;
        let index = this.props.selected.upgradeTypes.indexOf(instance);
        const n = this.props.selected.upgradeTypes.length;
        index = (index + 1);
        if (index >= n) return;
        this.props.selected.instance = this.props.selected.upgradeTypes[index];
        this.update();

        this.setState({dummy: !this.state.dummy});
    };

    downgrade = () => {
        const instance = this.props.selected.instance;
        let index = this.props.selected.upgradeTypes.indexOf(instance);
        const n = this.props.selected.upgradeTypes.length;
        index = index - 1;

        if (index < 0) return;

        this.props.selected.instance = this.props.selected.upgradeTypes[index];
        this.update();

        this.setState({dummy: !this.state.dummy});
    };

    changeSlider = (event, value) => {
        this.setState({sliderValue: value}, () => {
            this.debouncedUpdate();
        });
    };

    handleCheckboxChange = () => {
        if (this.infiniteSourceEligible) {
            if (this.props.selected.infiniteSource) {
                this.props.selected.open_in_slots = 1;
                delete this.props.selected.infiniteSource;
                delete this.props.selected.quantityPerInfinite;
                delete this.props.selected.timePerInfinite;
                this.props.selected.allowedIn = this.props.selected.allowedInClobbered;
            } else {
                this.props.selected.open_in_slots = 0;
                this.props.selected.allowedInClobbered = this.props.selected.allowedIn;
                this.props.selected.allowedIn = [];
                this.props.selected.infiniteSource = true;
                this.updateContained();
            }
        } else {
            this.props.selected.open_in_slots = 1;
            delete this.props.selected.infiniteSource;
            delete this.props.selected.quantityPerInfinite;
            delete this.props.selected.timePerInfinite;
            this.props.selected.allowedIn = this.props.selected.allowedInClobbered;
        }

        // force an update anyways.
        this.setState({dummy: !this.state.dummy});
        this.debouncedUpdateGraph();
    };

    infiniteSourceEligible = () => {
        return this.props.selected.machine && this.props.selected.machine.name === 'Container' && (this.props.selected.open_in_slots === 1) || (this.props.selected.infiniteSource && this.props.selected.open_in_slots === 0)
    };

    hasInfiniteSource = () => {
        return this.props.selected.machine && this.props.selected.infiniteSource;
    };

    updateContained = () => {
        const usedSet = this.props.selected.allowedOut;

        const contained = [];
        usedSet.forEach(it => {
            contained.push(this.props.items.filter(item => item.id === it)[0]);
        });

        this.props.selected.containedItems = contained;
    };

    handleChange = event => {
        let usedSet = event.target.value;
        if (this.props.selected.open_out_slots === 0) {
            usedSet = Array.from(new Set([...event.target.value, this.props.selected.allowedInClobbered]))
        }

        this.props.selected.allowedOut = usedSet;

        this.updateContained();

        this.setState({ selectedSource: usedSet });

        this.debouncedUpdateGraph();
    };

    handleTextChangeQuantity = event => {
        this.props.selected.quantityPerInfinite = parseInt(event.target.value);
        this.setState({quantity: event.target.value});
        this.debouncedUpdateGraph();
    };

    handleTextChangeSeconds = event => {
        this.props.selected.timePerInfinite = parseInt(event.target.value);
        this.setState({time: event.target.value});
        this.debouncedUpdateGraph();
    };

    renderContent = () => {
        const {classes, label} = this.props;
        return (
                <React.Fragment><Typography variant='h5'>{label}</Typography>
                <Typography variant="body1">
                    <IconButton color="secondary" className={classes.button} onClick={this.downgrade}>
                        <ArrowDownwardIcon/>
                    </IconButton>
                    {this.props.selected.instance.name}
                    <IconButton color="primary" className={classes.button} onClick={this.upgrade}>
                        <ArrowUpwardIcon/>
                    </IconButton>
                </Typography>
                {this.props.overclock !== -1 && this.props.selected.machine.name !== 'Container' && this.props.selected.machine.name !== 'Logistic' ?
                    <React.Fragment>
                        <Typography id="label" className={classes.overclock} variant="body1">Overclock: {this.state.sliderValue}%</Typography>
                        <Slider
                            classes={{ root: classes.slider }}
                            value={this.state.sliderValue}
                            min={0}
                            max={250}
                            step={1}
                            onChange={this.changeSlider}
                        />
                    </React.Fragment>
                    : null}
                {
                    this.infiniteSourceEligible() ?
                        <React.Fragment>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={this.props.selected.infiniteSource || false}
                                        onChange={this.handleCheckboxChange}
                                        value="snapToGrid"
                                        className={classes.checkbox}
                                    />
                                }
                                label="Use as Infinite Source"
                                className={classes.checkboxLabel}
                            />
                        </React.Fragment>
                        : null
                }

                {this.hasInfiniteSource() ?
                    <div>
                        <FormControl>
                            <InputLabel htmlFor="select-multiple-chip">Contents</InputLabel>
                            <Select
                                multiple
                                className={classes.itemInput}
                                value={this.state.selectedSource}
                                onChange={this.handleChange}
                                input={<Input id="select-multiple-chip" />}
                                renderValue={selected => (
                                    <div className={classes.chips}>
                                        {selected.map(value => (
                                            <Chip key={value} label={this.itemMap[value].name} className={classes.chip} />
                                        ))}
                                    </div>
                                )}
                                MenuProps={MenuProps}
                            >
                                {this.items.map(item => {
                                    return <MenuItem key={item.id} value={item.id}><img className={classes.icon} src={item.icon} alt="" height="30" width="30" />{item.name}</MenuItem>
                                })
                                }
                            </Select>
                            <div className={classes.formGroup}>
                                <TextField
                                    id="quantity"
                                    label="Quantity (each)"
                                    className={classes.textField}
                                    value={this.state.quantity}
                                    onChange={this.handleTextChangeQuantity}
                                    margin="normal"
                                    type="number" inputProps={{ min: "0", max: "999999", step: "1" }}
                                />
                                <div className={classes.textMiddle}>every</div>
                                <TextField
                                    id="quantity"
                                    label="Seconds"
                                    className={classes.textField}
                                    value={this.state.time}
                                    onChange={this.handleTextChangeSeconds}
                                    margin="normal"
                                    type="number" inputProps={{ min: "1", max: "60", step: "1" }}
                                />
                            </div>
                        </FormControl>
                    </div>
                    : null}
                </React.Fragment>
        );
    };

    render() {
        const {classes} = this.props;
        return (<React.Fragment>
            <Hidden smDown implementation="css">
                <Paper className={classes.paper}>
                    {this.renderContent()}
                </Paper>
            </Hidden>
            <Hidden mdUp implementation="css">
                <Paper className={classes.paperMobile}>
                    {this.renderContent()}
                </Paper>
            </Hidden>
            </React.Fragment>)
    }
}

export default withStyles(styles)(SelectorPanel);