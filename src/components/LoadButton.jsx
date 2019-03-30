import React from 'react';
import Button from '@material-ui/core/Button';

import PopupDialog from './PopupDialog';
import {withStyles} from '@material-ui/core';
import ShareIcon from '@material-ui/icons/Share';
import InputIcon from '@material-ui/icons/Input';
import TextField from '@material-ui/core/TextField';

const styles = theme => ({
  label: {
    paddingLeft: 10,
  },
  dialogContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  inlineDialogButton : {
    paddingTop: 10,
    paddingBottom: 10,
  },
  dialogButton: {
    marginTop: 10,
  },
  statusMessage: {
    display: 'flex',
    flexDirection: 'column',
  },
});

class LoadButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {modalOpen: false, inputValue: ''};
  }

  handleModalClose = () => this.setState({modalOpen: false});
  handleModalOpen = () => this.setState({modalOpen: true});


  render() {
    const {classes, label, title, children, onClick} = this.props;
    // if (this.props.t && this.props.t.graphSvg) {
    //   value =
    // }
    return (
      <React.Fragment>
        <Button color='inherit' onClick={onClick || this.handleModalOpen}>
          <InputIcon/>
          <div className={classes.label}>Load</div>
        </Button>
        <PopupDialog title={'Load Code'} open={this.state.modalOpen}
          handleModalClose={this.handleModalClose} >
          <div className={classes.dialogContainer}>


            <div>
              <TextField label="Load Code" value={this.state.inputValue} onChange={e => {
                this.setState({inputValue: e.target.value})
              }}>
              </TextField>
              <Button color="inherit" className={classes.inlineDialogButton} onClick={
                () => new Promise((resolve, reject) => {
                  try {
                    const data = this.props.t.graphSvg.inflateGraphData(this.state.inputValue);

                    this.props.t.graphSvg.loadGraphData(data);
                    resolve(true);
                  } catch (err) {
                    console.error(err);
                    reject(err);
                  }
                }).then(a => {
                  this.setState({statusMessage: 'Loaded!'}, () => {
                    setTimeout(() => {
                      this.setState({statusMessage: ''});
                    }, 3000);
                  });
                }).catch(err => {
                  this.setState({statusMessage: 'Invalid load code!'}, () => {
                    setTimeout(() => {
                      this.setState({statusMessage: ''});
                    }, 3000);
                  });
                })}

              //     setTimeout(() => {
              //
              //     }, 200);
              //
              //   }
              // }
              >
                <InputIcon/>
                <div className={classes.label}>Load</div>
              </Button>
            </div>
            <div className={classes.statusMessage}>
              {this.state.statusMessage}
            </div>
          </div>
        </PopupDialog>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(LoadButton);