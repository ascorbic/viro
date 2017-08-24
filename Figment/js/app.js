/**
 * Copyright (c) 2017-present, Viro, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

import React, { Component } from 'react';


import { connect } from 'react-redux';
import { BlurView } from 'react-native-blur';
import {toggleModelSelection, togglePortalSelection, changePortalLoadState, changeModelLoadState, switchListMode, removeARObject, displayUIScreen } from './redux/actions';
import * as LoadingConstants from './redux/LoadingStateConstants';
import * as UIConstants from './redux/UIConstants';
import renderIf from './helpers/renderIf';
import ButtonComponent from './component/ButtonComponent';
import FigmentListView from './component/FigmentListView';
import PhotosSelector from './component/PhotosSelector';

const kObjSelectMode = 1;
const kPortalSelectMode = 2;
const kEffectSelectMode = 3;

const kPreviewTypePhoto = 1;
const kPreviewTypeVideo = 2;


import {
  AppRegistry,
  Text,
  View,
  StyleSheet,
  PixelRatio,
  ListView,
  Image,
  TouchableHighlight,
  TouchableOpacity,
  ActivityIndicator,
  ActionSheetIOS,
  CameraRoll,
  Alert,
} from 'react-native';

import {
  ViroARSceneNavigator,
  ViroConstants,
} from 'react-viro';

import Video from 'react-native-video';

var InitialScene = require('./figment');

export class App extends Component {

  constructor(props) {
    super(props);

    this._renderShareScreen = this._renderShareScreen.bind(this);
    this._renderButtonLeftMenu = this._renderButtonLeftMenu.bind(this);
    this._renderRecord = this._renderRecord.bind(this);
    this._startRecording = this._startRecording.bind(this);
    this._stopRecording = this._stopRecording.bind(this);
    this._setARNavigatorRef = this._setARNavigatorRef.bind(this);
    this._onListItemLoaded = this._onListItemLoaded.bind(this);
    this._onListPressed = this._onListPressed.bind(this);
    this._getListItems = this._getListItems.bind(this);
    this._saveToCameraRoll = this._saveToCameraRoll.bind(this);
    this._renderPhotosSelector = this._renderPhotosSelector.bind(this);
    this._takeScreenshot = this._takeScreenshot.bind(this);

    this.state = {
      currentModeSelected:kObjSelectMode,
      videoUrl: null,
      haveSavedMedia: false,
      playPreview : false,
      viroAppProps: {loadingObjectCallback: this._onListItemLoaded},
      showPhotosSelector : false,
      previewType: kPreviewTypeVideo,
    };
  }

  render() {
      console.log("RERENDER App OCCURRED");
      return (
        <View style={localStyles.flex}>
          <ViroARSceneNavigator style={localStyles.arView} apiKey="7EEDCB99-2C3B-4681-AE17-17BC165BF792"
            initialScene={{scene: InitialScene}}  ref={this._setARNavigatorRef} viroAppProps={this.state.viroAppProps}
            />

          {renderIf(this.props.currentScreen != UIConstants.SHOW_SHARE_SCREEN,
            <View style={localStyles.listView}>
              <BlurView style={localStyles.absolute} blurType="dark" blurAmount={10} />
              <Text style={localStyles.listViewText}>{this.props.listTitle}</Text>
              <FigmentListView items={this._getListItems()} onPress={this._onListPressed} />
            </View>)}

          {this._renderRecord()}
          {this._renderButtonLeftMenu()}
          {this._renderShareScreen()}
          {this._renderPhotosSelector()}
        </View>
      );
    }

  _renderPhotosSelector() {
    // TODO: remove the return to render the selector when portal is tapped
    return;
    if (this.props.listMode == UIConstants.LIST_MODE_PORTAL) {
      return (<PhotosSelector style={localStyles.photosSelectorStyle} rows={2.3} columns={4}
        onPhotoSelected={(index, source)=>{console.log("Selected " + index + ", source " + source)}}/>)
    }
  }

  _setARNavigatorRef(ARNavigator){
    console.log("SETTING ARNAVIGATOR REF!!");
    this._arNavigator = ARNavigator;
  }

  _renderShareScreen() {
    if(this.props.currentScreen == UIConstants.SHOW_SHARE_SCREEN) {
      return (
        <View style={localStyles.shareScreenContainer} >

          {/* So with react-native-video, if you turn repeat to true and then onEnd pause
              the video, you'll end up with black screen. So we should simply not repeat
              and seek to 0 when we want to play the video again (seeking will auto start
              the video player too, but we set the state to true to dismiss the play btn)*/}

          {renderIf(this.state.previewType == kPreviewTypePhoto, <Image source={{uri:this.state.videoUrl}} style={localStyles.backgroundVideo} />)}

          {renderIf(this.state.previewType == kPreviewTypeVideo, <Video ref={(ref) => {this.player = ref}}
            source={{uri : this.state.videoUrl}} paused={!this.state.playPreview}
            repeat={false} style={localStyles.backgroundVideo}
            onEnd={()=>{this.setState({playPreview : false})}} />
          )}


          {renderIf(!this.state.playPreview && (this.state.previewType == kPreviewTypeVideo),
          <TouchableOpacity onPress={()=>{this.player.seek(0); this.setState({ playPreview : true })}} underlayColor="#00000000">
            <Image source={require("./res/play_btn.png")} style={localStyles.previewPlayButton} />
          </TouchableOpacity>
          )}

          <View style={{position:'absolute', left:10, bottom:10, width:100, height:100}}>
            <TouchableHighlight onPress={()=>{this._saveToCameraRoll()}} underlayColor="#00000000">
              <Image source={require("./res/btn_save.png")} style={localStyles.previewScreenButtons} />
            </TouchableHighlight>
          </View>

          <View style={{position:'absolute', left:120, bottom:10, width:100, height:100}}>
            <TouchableHighlight onPress={()=>{this._openShareActionSheet()}} underlayColor="#00000000">
              <Image source={require("./res/btn_share.png")} style={localStyles.previewScreenButtons} />
            </TouchableHighlight>
          </View>

          <View style={{position:'absolute', left:10, top:10, width:100, height:100}}>
            <TouchableHighlight onPress={()=>{this.props.dispatchDisplayUIScreen(UIConstants.SHOW_MAIN_SCREEN)}} underlayColor="#00000000">
              <Image source={require("./res/btn_close.png")} style={localStyles.previewScreenButtons} />
            </TouchableHighlight>
          </View>
        </View>
      )
    }
  }

  _renderButtonLeftMenu() {
    var buttons = [];
    // render the object mode button.
    buttons.push(
        <ButtonComponent key="button_portals"
          onPress={()=>{this.props.dispatchSwitchListMode(UIConstants.LIST_MODE_PORTAL, UIConstants.LIST_TITLE_PORTALS)}}
          buttonState={(this.props.listMode==UIConstants.LIST_MODE_PORTAL) ? 'on':'off'}
          stateImageArray={[require("./res/btn_mode_portals_on.png"), require("./res/btn_mode_portals.png")]}
          />);

    buttons.push(
        <ButtonComponent key="button_effects"
          onPress={()=>{this.props.dispatchSwitchListMode(UIConstants.LIST_MODE_EFFECTS, UIConstants.LIST_TITLE_EFFECTS)}}
          buttonState={(this.props.listMode==UIConstants.LIST_MODE_EFFECT) ? 'on':'off'}
          stateImageArray={[require("./res/btn_mode_effects_on.png"), require("./res/btn_mode_effects.png")]}
          />);

    buttons.push(
        <ButtonComponent key="button_models"
            onPress={()=>{this.props.dispatchSwitchListMode(UIConstants.LIST_MODE_MODEL, UIConstants.LIST_TITLE_MODELS)}}
            buttonState={(this.props.listMode==UIConstants.LIST_MODE_MODEL) ? 'on':'off'}
            stateImageArray={[require("./res/btn_mode_objects_on.png"), require("./res/btn_mode_objects.png")]}
            />);

    return (
         <View style={{position:'absolute', justifyContent: 'space-between', flexDirection:'column', left:10, bottom:120, width:100, height:240, flex:1}}>
            {buttons}
         </View>
      );
  }

  _renderRecord() {
    var recordViews = [];

    if(this.props.currentScreen == UIConstants.SHOW_RECORDING_SCREEN) {
      recordViews.push(
        <View  key="record_timeline" style={{position: 'absolute', backgroundColor: '#22222244', left: 0, right: 0, top: 0, height:100,  alignSelf: 'stretch', }}>
          <Text style={localStyles.recordingTimeText}>00:01:00</Text>
        </View>
      );
    }

    recordViews.push(
      <View key="record_button_container" style={{position: 'absolute', left: 0, right: 0, bottom: 120,  alignItems: 'center'}}>
        <ButtonComponent
          key="record_button" onPress={()=>{(this.props.currentScreen==UIConstants.SHOW_MAIN_SCREEN) ? this._startRecording(): this._stopRecording()}}
          buttonState={(this.props.currentScreen==UIConstants.SHOW_MAIN_SCREEN) ? 'off':'on'}
          stateImageArray={[require("./res/btn_stop.png"), require("./res/btn_record.png")]}
          />
      </View>);

      recordViews.push(
        <View key="camera_button_container" style={{position: 'absolute',  right: 70, bottom: 120,  alignItems: 'center'}}>
          <ButtonComponent
            key="camera_button" onPress={()=>{this._takeScreenshot()}}
            buttonState={(this.props.currentScreen==UIConstants.SHOW_MAIN_SCREEN) ? 'off':'on'}
            stateImageArray={[require("./res/btn_camera.png"), require("./res/btn_camera.png")]}
            />
        </View>);
    return recordViews;
  }

  _takeScreenshot() {
    this._arNavigator._takeScreenshot("figment_11", false).then((retDict)=>{
      if (!retDict.success) {
        if (retDict.errorCode == ViroConstants.RECORD_ERROR_NO_PERMISSION) {
          this._displayVideoRecordAlert("Screenshot Error", "Please allow camera permissions!" + errorCode);
        }
      }

      this.setState({
        videoUrl: "file://" + retDict.url,
        haveSavedMedia : false,
        playPreview : false,
        previewType: kPreviewTypePhoto,
      });
      this.props.dispatchDisplayUIScreen(UIConstants.SHOW_SHARE_SCREEN);
    });
  }

  _startRecording() {
    console.log("[JS] begin recording!");
    this._arNavigator._startVideoRecording("testVid11", false,
       (errorCode)=>{
        this._displayVideoRecordAlert("Recording Error", "[JS] onError callback errorCode: " + errorCode);
        this.props.dispatchDisplayUIScreen(UIConstants.SHOW_MAIN_SCREEN);
        });
    this.props.dispatchDisplayUIScreen(UIConstants.SHOW_RECORDING_SCREEN);
  }

  _stopRecording() {
    this._arNavigator._stopVideoRecording().then((retDict)=>{
      console.log("[JS] success? " + retDict.success);
      console.log("[JS] the url was: " + retDict.url);
      if (!retDict.success) {
        if (retDict.errorCode == ViroConstants.RECORD_ERROR_NO_PERMISSION) {
          this._displayVideoRecordAlert("Recording Error", "Please allow camera record permissions!" + errorCode);
        }
      }
      this.setState({
        videoUrl: "file://" + retDict.url,
        haveSavedMedia : false,
        playPreview : true,
        previewType: kPreviewTypeVideo,
      });
      this.props.dispatchDisplayUIScreen(UIConstants.SHOW_SHARE_SCREEN);
    });
  }

  _saveToCameraRoll() {
    if (this.state.videoUrl != undefined && !this.state.haveSavedMedia) {
      this.setState({
        haveSavedMedia : true
      })
      CameraRoll.saveToCameraRoll(this.state.videoUrl)
        .then(Alert.alert('Success!', 'Added to Camera Roll.', [{text: 'OK'}]))
        .catch((err) => {console.log('Error saving to Camera Roll:', err)})
    }
  }

  _displayVideoRecordAlert(title, message) {
    Alert.alert(
      title,
      message,
      [
        {text: 'OK', onPress: () => this.props.dispatchDisplayUIScreen(UIConstants.SHOW_MAIN_SCREEN)},
      ],
      { cancelable: false }
    )
  }

  _onListPressed(index) {
    if(this.props.listMode == UIConstants.LIST_MODE_MODEL) {
      if(this.props.modelItems[index].selected == true) {
            this.props.dispatchChangeModelLoadState(index, LoadingConstants.NONE);
      }
      this.props.dispatchToggleModelSelection(index);
    }

    if(this.props.listMode == UIConstants.LIST_MODE_PORTAL) {
      if(this.props.portalItems[index].selected == true) {
            this.props.dispatchChangePortalLoadState(index, LoadingConstants.NONE);
      }
      this.props.dispatchTogglePortalSelection(index);
    }
  }

  _onListItemLoaded(index, loadState) {
    console.log("Dispatching change load state:" + index + ", loadState:" + loadState);
    if(this.props.listMode == UIConstants.LIST_MODE_MODEL) {
      this.props.dispatchChangeModelLoadState(index, loadState);
    }

    if(this.props.listMode == UIConstants.LIST_MODE_PORTAL) {
      this.props.dispatchChangePortalLoadState(index, loadState);
    }
  }

  _getListItems() {
    if(this.props.listMode == UIConstants.LIST_MODE_MODEL) {
      return this.props.modelItems;
    }else if(this.props.listMode == UIConstants.LIST_MODE_PORTAL) {
      return this.props.portalItems;
    } else if(this.props.listMode == UIConstants.LIST_MODE_EFFECT) {
      return this.props.portalItems;
    }
  }

  _openShareActionSheet() {
      ActionSheetIOS.showShareActionSheetWithOptions({url:this.state.videoUrl},  (error) => alert(error),
      (success, method) => {
      var text;
      if (success) {
        text = `Shared via ${method}`;
      } else {
        text = 'You didn\'t share';
      }
      alert(text);
    });
  }
}

App.propTypes =  {
  objIndex: React.PropTypes.number.isRequired,
}

App.defaultProps =  {
  objIndex: -1,
}

var localStyles = StyleSheet.create({
  flex : {
    flex : 1,
  },
  arView: {
    flex:1,
  },
  listView: {
    height : 115,
    width : '100%',
    position : 'absolute',
    bottom : 0,
  },
  listViewText: {
    textAlign: 'left',
    color: '#d6d6d6',
    fontFamily: 'Helvetica Neue',
    marginLeft:25,
    marginTop:5,
    marginBottom: 5,
    backgroundColor: '#00000000',
  },
  previewScreenButtons: {
    height: 80,
    width: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft:10,
    paddingRight:10,
  },
  overlayView : {
    position: 'absolute',
    bottom: 10,
    left: 10,
    height: 80,
    width: 80,
    paddingTop:20,
    paddingBottom:20,
    backgroundColor:'#68a0cf',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fff',
  },
  recordingTimeText: {
    textAlign: 'center',
    color: '#ffffff',
    marginBottom: 5,
    marginTop:20,
    borderWidth: 1,
  },
  previewPlayButton : {
    height : 100,
    width : 100,
  },
  shareScreenContainer: {
    position : 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor : '#000000',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  photosSelectorStyle : {
    position: 'absolute',
    width: '100%',
    height : '40%',
    bottom : 0
  },
  absolute: {
    position: "absolute",
    top: 0, left: 0, bottom: 0, right: 0,
  },

});

function selectProps(store) {

  return {
    modelItems: store.arobjects.modelItems,
    portalItems: store.arobjects.portalItems,
    currentScreen: store.ui.currentScreen,
    listMode: store.ui.listMode,
    listTitle: store.ui.listTitle,
  };
}


//const mapStateToProps = (state) => {
//  return {
//  objIndex: state.objIndex,
//  }
//}

const mapDispatchToProps = (dispatch) => {
  return {
    dispatchToggleModelSelection: (index) => dispatch(toggleModelSelection(index)),
    dispatchTogglePortalSelection: (index) => dispatch(togglePortalSelection(index)),
    dispatchChangeModelLoadState:(index, loadState) =>dispatch(changeModelLoadState(index, loadState)),
    dispatchChangePortalLoadState:(index, loadState) =>dispatch(changePortalLoadState(index, loadState)),
    dispatchDisplayUIScreen: (uiScreenState) => dispatch(displayUIScreen(uiScreenState)),
    dispatchSwitchListMode: (listMode, listTitle) =>dispatch(switchListMode(listMode, listTitle)),
  }
}

export default connect(selectProps, mapDispatchToProps)(App)