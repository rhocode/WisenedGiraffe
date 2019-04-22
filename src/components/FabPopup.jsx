import React from 'react';
import Fab from '@material-ui/core/Fab';
import HelpIcon from '@material-ui/icons/Help';

import PopupDialog from './PopupDialog';
import {withStyles} from '@material-ui/core';
import Checkbox from "@material-ui/core/Checkbox";
import FormControlLabel from "@material-ui/core/FormControlLabel";

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
        const seenMessage = window.localStorage.getItem('seenWelcome');
        const dontShowAgain = window.localStorage.getItem('dontShowAgain');
        let modalOpen = false;
        let dontShow = false;

        if (!seenMessage) {
            window.localStorage.setItem('seenWelcome', '1');
            modalOpen = true;
        }

        if (dontShowAgain === '1') {
            window.localStorage.setItem('dontShowAgain', '1');
            dontShow = true;
        }

        if (!dontShowAgain) {
            modalOpen = true;
        }

        this.state = {modalOpen, dontShow};
    }

    handleDontShow = event => {
        this.setState({ dontShow: event.target.checked });
        if (event.target.checked) {
            window.localStorage.setItem('dontShowAgain', '1');
        } else {
            window.localStorage.setItem('dontShowAgain', '0');
        }
    };

    render() {
        const {classes, title} = this.props;
        const children = this.props.children;
        return (
            <React.Fragment>
                <Fab id='helpFab' aria-label='help' color='secondary' className={classes.fab}
                     onClick={() => this.setState({modalOpen: true})}>
                    <HelpIcon/>
                </Fab>
                <PopupDialog title={''} open={this.state.modalOpen}
                             handleModalClose={() => this.setState({modalOpen: false})}>
                    {children}
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={this.state.dontShow}
                                onChange={this.handleDontShow}
                                value="checkedA"
                            />
                        }
                        label="Don't show this message again"
                    />

                </PopupDialog>
            </React.Fragment>
        );
    }
}

export default withStyles(styles)(FabPopup);