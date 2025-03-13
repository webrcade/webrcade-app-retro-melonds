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
            emulator.getPrefs().setScreenLayout(values.screenLayout);
            emulator.updateScreenLayout();
            change = true;
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
            label: 'DS Settings',
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
      this.gridComps = [
          [this.screenLayoutRef],
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
      const { screenLayoutRef } = this;
      const { focusGrid } = this.context;
      const { setValues, values, emulator } = this.props;

      return (
          <Fragment>
              <FieldRow>
                  <FieldLabel>Screen Layout</FieldLabel>
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
          </Fragment>
      );
  }
}
NintendoDsSettingTab.contextType = WebrcadeContext;

