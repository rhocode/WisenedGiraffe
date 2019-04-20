import React from 'react';
import Button from '@material-ui/core/Button';

import PopupDialog from './PopupDialog';
import {withStyles} from '@material-ui/core';

const styles = theme => ({
    label: {
        paddingLeft: 10,
    },
});

const MyContext = React.createContext();

class ToolbarPopup extends React.Component {
    constructor(props) {
        super(props);
        this.state = {modalOpen: false};
    }

    handleModalClose = () => this.setState({modalOpen: false});
    handleModalOpen = () => this.setState({modalOpen: true});


    render() {
        const {classes, Icon, label, title, children, onClick} = this.props;
        return (
            <React.Fragment>
                <Button color='inherit' onClick={onClick || this.handleModalOpen}>
                    <Icon/>
                    <div className={classes.label}>{label}</div>
                </Button>
                <PopupDialog title={title} open={this.state.modalOpen}
                             handleModalClose={this.handleModalClose}>
                    <MyContext.Provider
                        value={{handleModalClose: this.handleModalClose, handleModalOpen: this.handleModalOpen}}>
                        {children}
                    </MyContext.Provider>
                </PopupDialog>
            </React.Fragment>
        );
    }
}

export default withStyles(styles)(ToolbarPopup);