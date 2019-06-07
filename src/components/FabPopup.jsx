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
        const dontShowAgain = window.localStorage.getItem('dontShowAgainv2');
        let modalOpen = false;
        let dontShow = false;

        if (dontShowAgain === '1') {
            window.localStorage.setItem('dontShowAgainv2', '1');
            dontShow = true;
        } else {
            window.localStorage.setItem('dontShowAgainv2', '0');
            dontShow = false;
        }

        if (!dontShow) {
            modalOpen = true;
        }

        this.state = {modalOpen, dontShow};
    }

    handleDontShow = event => {
        this.setState({ dontShow: event.target.checked });
        if (event.target.checked) {
            window.localStorage.setItem('dontShowAgainv2', '1');
        } else {
            window.localStorage.setItem('dontShowAgainv2', '0');
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