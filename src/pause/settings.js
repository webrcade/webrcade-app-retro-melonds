import React, { Fragment } from 'react';
import { Component } from 'react';

import {
  AppDisplaySettingsTab,
  EditorScreen,
  TelevisionWhiteImage,
  GamepadWhiteImage,
  FieldsTab,
  FieldRow,
  FieldLabel,
  FieldControl,
  Switch,
  WebrcadeContext,
} from '@webrcade/app-common';

import { ScreenLayoutSelect } from './screenlayoutselect';

export class NintendoDsSettingsEditor extends Component {
  constructor() {
    super();
    this.state = {
      tabIndex: null,
      focusGridComps: null,
      values: {},
    };
  }

  componentDidMount() {
    const { emulator } = this.props;

    this.setState({
      values: {
        origBilinearMode: emulator.getPrefs().isBilinearEnabled(),
        bilinearMode: emulator.getPrefs().isBilinearEnabled(),
        origScreenSize: emulator.getPrefs().getScreenSize(),
        screenSize: emulator.getPrefs().getScreenSize(),
        origScreenLayout: emulator.getPrefs().getScreenLayout(),
        screenLayout: emulator.getPrefs().getScreenLayout(),
        origScreenGap: emulator.getPrefs().getScreenGap(),
        screenGap: emulator.getPrefs().getScreenGap(),
        origBookMode: emulator.isBookMode(),
        bookMode: emulator.isBookMode(),
        origDualAnalog: emulator.isDualAnalogMode(),
        dualAnalog: emulator.isDualAnalogMode(),
        origMicrophone: emulator.getPrefs().isMicrophoneSupported(),
        microphone: emulator.getPrefs().isMicrophoneSupported(),
        origScreenControls: emulator.getPrefs().getScreenControls(),
        screenControls: emulator.getPrefs().getScreenControls(),
      },
    });
  }

  render() {
    const { emulator, onClose, showOnScreenControls } = this.props;
    const { tabIndex, values, focusGridComps } = this.state;

    const setFocusGridComps = (comps) => {
      this.setState({ focusGridComps: comps });
    };

    const setValues = (values) => {
      this.setState({ values: values });
    };

    return (
      <EditorScreen
        showCancel={true}
        onOk={() => {
          let change = false;
          let layoutChange = false;
          if (values.origBilinearMode !== values.bilinearMode) {
            emulator.getPrefs().setBilinearEnabled(values.bilinearMode);
            emulator.updateBilinearFilter();
            change = true;
          }
          if (values.origScreenSize !== values.screenSize) {
            emulator.getPrefs().setScreenSize(values.screenSize);
            emulator.updateScreenSize();
            change = true;
          }
          if (values.origScreenLayout !== values.screenLayout) {
            emulator.resetToggleLayout();
            emulator.getPrefs().setScreenLayout(values.screenLayout);
            layoutChange = true;
            change = true;
          }
          if (values.origScreenGap !== values.screenGap) {
            emulator.getPrefs().setScreenGap(values.screenGap);
            layoutChange = true;
            change = true;
          }
          if (values.origBookMode !== values.bookMode) {
            emulator.setBookMode(values.bookMode);
            layoutChange = true;
            change = true;
          }
          if (values.origDualAnalog !== values.dualAnalog) {
            emulator.setDualAnalogMode(values.dualAnalog);
            change = true;
          }
          if (values.origScreenControls !== values.screenControls) {
            emulator.getPrefs().setScreenControls(values.screenControls);
            emulator.updateOnScreenControls();
            change = true;
          }
          emulator.getPrefs().setMicrophoneSupported(values.microphone);
          if (layoutChange) {
            if (values.bookMode) {
              emulator.getPrefs().setScreenLayout( emulator.SCREEN_LAYOUT_LEFT_RIGHT);
            }
            setTimeout(() => {
              emulator.updateScreenLayout()
            }, 50);
          }
          if (change) {
            emulator.getPrefs().save();
          }
          onClose();
        }}
        onClose={onClose}
        focusGridComps={focusGridComps}
        onTabChange={(oldTab, newTab) => this.setState({ tabIndex: newTab })}
        tabs={[
          {
            image: GamepadWhiteImage,
            label: 'DS Settings (Session only)',
            content: (
              <NintendoDsSettingTab
                emulator={emulator}
                isActive={tabIndex === 0}
                setFocusGridComps={setFocusGridComps}
                values={values}
                setValues={setValues}
              />
            ),
          },
          {
            image: TelevisionWhiteImage,
            label: 'Display Settings',
            content: (
              <AppDisplaySettingsTab
                emulator={emulator}
                isActive={tabIndex === 1}
                showOnScreenControls={showOnScreenControls}
                setFocusGridComps={setFocusGridComps}
                values={values}
                setValues={setValues}
              />
            ),
          },
        ]}
      />
    );
  }
}


export class NintendoDsSettingTab extends FieldsTab {
  constructor() {
      super();
      this.screenLayoutRef = React.createRef();
      this.screenGapRef = React.createRef();
      this.bookModeRef = React.createRef();
      this.dualAnalogRef = React.createRef();
      this.microphoneRef = React.createRef();
      this.gridComps = [
          [this.screenLayoutRef],
          [this.screenGapRef],
          [this.bookModeRef],
          [this.microphoneRef],
          [this.dualAnalogRef],
      ];
  }

  componentDidUpdate(prevProps, prevState) {
      const { gridComps } = this;
      const { setFocusGridComps } = this.props;
      const { isActive } = this.props;

      if (isActive && isActive !== prevProps.isActive) {
          setFocusGridComps(gridComps);
      }
  }

  render() {
      const { screenLayoutRef, screenGapRef, bookModeRef, dualAnalogRef, microphoneRef } = this;
      const { focusGrid } = this.context;
      const { setValues, values, emulator } = this.props;

      return (
          <Fragment>
              <FieldRow>
                  <FieldLabel>Screen layout</FieldLabel>
                  <FieldControl>
                    <ScreenLayoutSelect
                      emulator={emulator}
                      selectRef={screenLayoutRef}
                      // addDefault={true}
                      onChange={(value) => {
                          console.log(value);
                          setValues({ ...values, ...{ screenLayout: value } });
                      }}
                      value={values.screenLayout}
                      onPad={e => focusGrid.moveFocus(e.type, screenLayoutRef)}
                    />
                  </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>Screen gap</FieldLabel>
                <FieldControl>
                    <Switch
                        ref={screenGapRef}
                        onPad={(e) => focusGrid.moveFocus(e.type, screenGapRef)}
                        onChange={(e) => {
                            setValues({ ...values, ...{ screenGap: e.target.checked } });
                        }}
                        checked={values.screenGap}
                    />
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>Book mode</FieldLabel>
                <FieldControl>
                    <Switch
                        ref={bookModeRef}
                        onPad={(e) => focusGrid.moveFocus(e.type, bookModeRef)}
                        onChange={(e) => {
                            setValues({ ...values, ...{ bookMode: e.target.checked } });
                        }}
                        checked={values.bookMode}
                    />
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>Microphone supported</FieldLabel>
                <FieldControl>
                    <Switch
                        ref={microphoneRef}
                        onPad={(e) => focusGrid.moveFocus(e.type, microphoneRef)}
                        onChange={(e) => {
                            setValues({ ...values, ...{ microphone: e.target.checked } });
                        }}
                        checked={values.microphone}
                    />
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>Dual analog mode (Stylus)</FieldLabel>
                <FieldControl>
                    <Switch
                        ref={dualAnalogRef}
                        onPad={(e) => focusGrid.moveFocus(e.type, dualAnalogRef)}
                        onChange={(e) => {
                            setValues({ ...values, ...{ dualAnalog: e.target.checked } });
                        }}
                        checked={values.dualAnalog}
                    />
                </FieldControl>
              </FieldRow>
          </Fragment>
      );
  }
}
NintendoDsSettingTab.contextType = WebrcadeContext;

