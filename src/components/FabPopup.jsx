import React from 'react';
import Fab from '@material-ui/core/Fab';
import HelpIcon from '@material-ui/icons/Help';

import PopupDialog from './PopupDialog';
import {withStyles} from '@material-ui/core';

const styles = theme => ({
  fab: {
    position: 'absolute',
    bottom: theme.spacing.unit * 2,
    right: theme.spacing.unit * 2,
  },
});

class FabPopup extends React.Component {

  constructor(props) {
    super(props);
    this.state = {modalOpen: false};
  }

  render() {
    const {classes, title, contents} = this.props;

    return (
      <React.Fragment>
        <Fab aria-label='help' color='primary' className={classes.fab} onClick={() => this.setState({modalOpen: true})}>
          <HelpIcon/>
        </Fab>
        <PopupDialog title={title} open={this.state.modalOpen}
                     handleModalClose={() => this.setState({modalOpen: false})} contents={contents}/>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(FabPopup);