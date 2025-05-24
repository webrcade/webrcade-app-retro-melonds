import { Component } from "react";

import {
  ImageButton,
  // KeyboardWhiteImage,
  PauseWhiteImage,
  SelectWindowImage,
  SplitSceneImage,
  // VideoGameAssetWhiteImage,
  // VideoGameAssetOffWhiteImage,
} from '@webrcade/app-common';

import './style.scss'

export class TouchOverlay extends Component {
  constructor() {
    super();

    this.state = {
      refresh: 0,
      initialShow: true
    }
  }

  render() {
    const { show } = this.props;
    const { initialShow } = this.state;
    const { emulator } = window;

    if (!emulator || !show) return <></>;

    if (initialShow) {
      this.setState({initialShow: false});
      setTimeout(() => {
        emulator.updateOnScreenControls(true);
      }, 0);
    }

    const app = emulator.app;

    const showPause = (e) => {
      e.stopPropagation();
      if (!app.isShowOverlay() && emulator.pause(true)) {
        setTimeout(() => emulator.showPauseMenu(), 50);
      }
    }

    const triggerClick = (e) => {
      const touch = e.changedTouches[0];
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      e.target.dispatchEvent(clickEvent);
      e.stopPropagation();
    }

    return (
      <div className="touch-overlay" id="touch-overlay">
        <div className="touch-overlay-buttons">
          <div className="touch-overlay-buttons-left"></div>
          <div className="touch-overlay-buttons-center"></div>
          <div className="touch-overlay-buttons-right">
            {!emulator.isBookMode() &&
              <ImageButton
                className="touch-overlay-button-small"
                imgSrc={SelectWindowImage}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  triggerClick(e);
                }}
                onClick={(e) => {
                  e.stopPropagation();

                  const prefs = emulator.getPrefs();
                  let layout = prefs.getScreenLayout();
                  if (layout === emulator.SCREEN_LAYOUT_TOP_ONLY) {
                    layout = emulator.SCREEN_LAYOUT_BOTTOM_ONLY;
                  } else {
                    layout = emulator.SCREEN_LAYOUT_TOP_ONLY;
                  }
                  emulator.resetToggleLayout();
                  prefs.setScreenLayout(layout);
                  emulator.updateScreenLayout();

                  return false;
                }}
                onFocus={(e) => {e.target.blur()}}
              />
            }
            {!emulator.isBookMode() &&
              <ImageButton
                className="touch-overlay-button-small"
                imgSrc={SplitSceneImage}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  triggerClick(e);
                }}
                onClick={() => {
                  const prefs = emulator.getPrefs();
                  let layout = prefs.getScreenLayout();

                  // SCREEN_LAYOUT_TOP_BOTTOM = 0;
                  // SCREEN_LAYOUT_BOTTOM_TOP = 1
                  // SCREEN_LAYOUT_LEFT_RIGHT = 2;
                  // SCREEN_LAYOUT_RIGHT_LEFT = 3;
                  // SCREEN_LAYOUT_TOP_ONLY = 4;
                  // SCREEN_LAYOUT_BOTTOM_ONLY = 5;
                  // SCREEN_LAYOUT_HYBRID_TOP = 6;
                  // SCREEN_LAYOUT_HYBRID_BOTTOM = 7;

                  if (layout > emulator.SCREEN_LAYOUT_RIGHT_LEFT) {
                    layout = emulator.SCREEN_LAYOUT_LEFT_RIGHT;
                  } else if (layout === emulator.SCREEN_LAYOUT_RIGHT_LEFT) {
                    layout = emulator.SCREEN_LAYOUT_TOP_BOTTOM;
                  } else {
                    layout++;
                  }
                  prefs.setScreenLayout(layout);
                  emulator.updateScreenLayout();

                  return false;
                }}
              />
            }
            <ImageButton
              className="touch-overlay-button touch-overlay-button-last"
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                triggerClick(e);
              }}
              onClick={showPause}
              imgSrc={PauseWhiteImage}
              onFocus={(e) => {e.target.blur()}}
            />
          </div>
        </div>
      </div>
    );
  }
}

