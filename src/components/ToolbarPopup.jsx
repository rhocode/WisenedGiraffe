import React from 'react';
import Button from '@material-ui/core/Button';

import PopupDialog from './PopupDialog';

class ToolbarPopup extends React.Component {
  constructor(props) {
    super(props);
    this.state = { modalOpen : false };
  }

  handleModalClose = () => this.setState({modalOpen : false});
  handleModalOpen = () => this.setState({modalOpen : true});

  render() {
    const {classes, Icon, label, title, contents, onClick} = this.props;
    
    return (
      <React.Fragment>
        <Button color='inherit' onClick={onClick || this.handleModalOpen}>
          <Icon/>
          <div className={classes.label}>{label}</div>
        </Button>
        <PopupDialog title={title} open={this.state.modalOpen} handleModalClose={() => this.setState({modalOpen : false})} contents={contents}/>
      </React.Fragment>
    );
  }
}

export default ToolbarPopup;