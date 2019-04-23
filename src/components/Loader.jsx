import React from 'react';
import {withStyles} from '@material-ui/core';
import * as d3 from 'd3';

const loading = [
  'Loading...',
  'Burning Coal...',
  'Deleting Steam Keys...',
  'Exploiting Resources...',
  'Petting Lizard Doggo...',
  'Adding Pipes...',
  'Adding Mana...',
  'Spilling Coffee...',
  'Becoming A Goat...',
  'Charging Batteries...',
  'Reticulating Splines'
];

export const styles = theme => ({
  root: {},
});

class Loader extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidUpdate(previousProps, previousState) {
    if (this.props.ready === true && !previousProps.ready) {
      this.props.parentState.setState({isReady: true}, () => {
        console.info('App set as "Ready"');
      });
    }
  }

  render() {
    const {ready, parentState, classes} = this.props;
    return (
      <React.Fragment>
        <div className="loader-spinner"/>
        <div className="align-loading">
          <div
            className='loading-text align-loading-text'>{loading[Math.floor(Math.random() * loading.length)]}</div>
        </div>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(Loader);