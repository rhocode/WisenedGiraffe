import React from 'react';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import DeleteIcon from '@material-ui/icons/Delete';

import PopupDialog from './PopupDialog';
import {withStyles} from '@material-ui/core';
import Hidden from "@material-ui/core/Hidden";

const styles = theme => ({
    label: {
        paddingLeft: 10,
    },
    dialogContainer: {
        display: 'flex',
        flexDirection: 'column',
    },
});

class ClearButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {modalOpen: false};
    }

    handleModalClose = () => this.setState({modalOpen: false});
    handleModalOpen = () => this.setState({modalOpen: true});


    render() {
        const {classes, label, title, children, onClick} = this.props;
        return (
            <React.Fragment>
                <Button color='inherit' onClick={onClick || this.handleModalOpen}>

                    <DeleteIcon/>
                    <Hidden smDown implementation="css">
                    <div className={classes.label}>Clear</div>
                    </Hidden>
                </Button>
                <PopupDialog title={'Clear Graph?'} open={this.state.modalOpen}
                             handleModalClose={this.handleModalClose}>
                    <div className={classes.dialogContainer}>
                        <Typography variant="h5">Are you sure you want to clear everything?</Typography>
                        <Button color="secondary" variant="outlined" className={`${classes.dialogButton}`} onClick={
                            () => {
                                this.props.t.graphSvg.clearGraphData(this.props.t);
                                this.handleModalClose();
                            }
                        }>
                            <DeleteIcon/>
                            <div className={classes.label}>Yes, I'm sure!</div>
                        </Button>
                    </div>
                </PopupDialog>
            </React.Fragment>
        );
    }
}

export default withStyles(styles)(ClearButton);