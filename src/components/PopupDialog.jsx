import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core';

const styles = theme => ({
  root: {
  },
  modal: {
    position: 'absolute',
    width: theme.spacing.unit * 100,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing.unit * 4,
    outline: 'none',
    margin: 'auto'
  },
});

class PopupDialog extends React.Component{

  constructor(props) {
    super(props);
  }
  
  render() {
    const { classes, title, contents, open, handleModalClose } = this.props;
    return (
      <Dialog
        open={Boolean(open)}
        onClose={handleModalClose}
        id='modal'
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {contents}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleModalClose} color='secondary'>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }
};

export default withStyles(styles) (PopupDialog);