import React from 'react';
import {Typography, withStyles} from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import IconButton from '@material-ui/core/IconButton';
import Slider from '@material-ui/lab/Slider';
import {updateNodeTierExternal, wheelZoomCalculation} from "./GraphSvg/nodeActions";
import * as d3 from 'd3';

const drawerWidth = 310;

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
    textField: {
        paddingBottom: 10,
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
});

class SelectorPanel extends React.Component {

    constructor(props) {
        super(props);

        this.state = {dummy: false, sliderValue: this.props.selected.overclock};
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

    debouncedUpdate = this.debounce(() => {
        this.update();
    }, 20);

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



    render() {
        const {classes, label} = this.props;
        return (
            <Paper className={classes.paper}>
                <Typography variant='h5'>{label}</Typography>
                <Typography variant="body1">
                <IconButton color="secondary" className={classes.button} onClick={this.downgrade}>
                    <ArrowDownwardIcon/>
                </IconButton>
                {this.props.selected.instance.name}
                <IconButton color="primary" className={classes.button} onClick={this.upgrade}>
                    <ArrowUpwardIcon/>
                </IconButton>
                </Typography>
                {this.props.overclock !== -1 ?
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

            </Paper>
        );
    }
}

export default withStyles(styles)(SelectorPanel);