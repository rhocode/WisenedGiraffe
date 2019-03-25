import React from 'react';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemIcon from '@material-ui/core/ListItemIcon';

import PopupDialog from './PopupDialog';
import {withStyles} from '@material-ui/core';

const styles = theme => ({
  icons: {
    marginRight: 0
  },
});

class SidebarPopup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {modalOpen: false};
  }

  render() {
    const {classes, Icon, label, title, contents} = this.props;

    return (
      <React.Fragment>
        <ListItem button key={label} onClick={() => this.setState({modalOpen: true})}>
          <ListItemIcon className={classes.icons}><Icon/></ListItemIcon>
          <ListItemText primary={label}/>
        </ListItem>
        <PopupDialog title={title} open={this.state.modalOpen}
                     handleModalClose={() => this.setState({modalOpen: false})} contents={contents}/>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(SidebarPopup);