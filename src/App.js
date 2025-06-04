import React, { Fragment } from "react";

import {
  WebrcadeRetroApp
} from '@webrcade/app-common';

import { Emulator } from './emulator';
import { EmulatorPauseScreen } from './pause';
import { TouchOverlay } from "./touchoverlay";

import './App.scss';

class App extends WebrcadeRetroApp {
  createEmulator(app, isDebug) {
    return new Emulator(app, isDebug);
  }

  getHeapAllocSize(size) {
    let CartROMSize = 0x200; // Start at 512
    while (CartROMSize < size) {
      CartROMSize <<= 1; // Multiply by 2
    }
    return CartROMSize;
  }

  isRomProgressBased() {
    return true;
  }

  isHeapAllocEnabled() {
    return true;
  }

  isDiscBased() {
    return false;
  }

  getBiosMap() {
    return {};
  }

  getAlternateBiosMap() {
    return {
      'df692a80a5b1bc90728bc3dfc76cd948': 'bios7.bin',
      'a392174eb3e572fed6447e956bde4b25': 'bios9.bin',
      '3c704824663ce26b6a1ed4d85238ae5b': 'firmware.bin',
      '94bc5094607c5e6598d50472c52f27f2': 'firmware.bin',
      // '559dae4ea78eb9d67702c56c1d791e81' : 'dsi_bios7.bin',
      // '87b665fce118f76251271c3732532777' : 'dsi_bios9.bin	',
      // '74f23348012d7b3e1cc216c47192ffeb' : 'dsi_firmware.bin',
    };
  }

  getBiosUrls(appProps) {
    return appProps.ds_bios ? appProps.ds_bios : [];
  }

  showCanvas() {
    this.setState({showCanvas: true});
  }

  renderErrorScreen() {
    const touch = this?.emulator?.touch;
    if (touch) touch.setTouchEnabled(false);
    return super.renderErrorScreen();
  }

  renderYesNoScreen() {
    const touch = this?.emulator?.touch;
    if (touch) touch.setTouchEnabled(false);
    return super.renderYesNoScreen();
  }

  renderPauseScreen() {
    const { appProps, emulator } = this;

    return (
      <EmulatorPauseScreen
        emulator={emulator}
        appProps={appProps}
        closeCallback={() => this.resume()}
        exitCallback={() => {
          this.exitFromPause();
        }}
        isEditor={this.isEditor}
        isStandalone={this.isStandalone}
      />
    );
  }

  render() {
    const { showCanvas } = this.state;

    return (
      <Fragment>
        {super.render()}
        <TouchOverlay show={showCanvas} />
        <div id="background"/>
      </Fragment>
    );
  }
}

export default App;
