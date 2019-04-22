import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import {withStyles} from '@material-ui/core';

const styles = theme => ({
    root: {},
});

class PopupDialog extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        const {classes, title, contents, open, handleModalClose, children} = this.props;
        return (
            <Dialog
                className={classes.modal}
                open={Boolean(open)}
                onClose={handleModalClose}
                id='modal'
            >
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    {children}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleModalClose} color='secondary'>Close</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default
withStyles(styles)(PopupDialog);