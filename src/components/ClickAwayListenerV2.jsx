import React from 'react';
import {ClickAwayListener, withStyles} from '@material-ui/core';
import * as d3 from 'd3';
import PropTypes from 'prop-types';

const styles = theme => ({});

class ClickAwayListenerV2 extends React.Component {

    constructor(props) {
        super(props);
        this.windowOnClobber = null;
        this.clobberList = [];
    }

    componentDidMount() {
        this.windowOnClobber = d3.select(this.props.clobberedElement).on('click');
        d3.select(this.props.clobberedElement).on('click', this.props.onClickAway);

        for (let elem of document.querySelectorAll('*')) {
            this.clobberList.push(elem);
            elem.addEventListener('click', this.props.onClickAway, true);
        }
    }

    componentWillUnmount() {
        d3.select(this.props.clobberedElement).on('click', this.windowOnClobber);
        for (let elem of this.clobberList) {
            elem.removeEventListener('click', this.props.onClickAway, true);
        }
        this.clobberList = [];
    }

    render() {
        const {onClickAway} = this.props;

        return (
            <ClickAwayListener onClickAway={onClickAway}>
                {this.props.children}
            </ClickAwayListener>
        );
    }
}

ClickAwayListenerV2.propTypes = {
    classes: PropTypes.object.isRequired,
    clobberedElement: PropTypes.string.isRequired,
    onClickAway: PropTypes.func.isRequired,
    children: PropTypes.object.isRequired
};

export default withStyles(styles)(ClickAwayListenerV2);