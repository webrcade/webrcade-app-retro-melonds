import {
  DisplayLoop,
  RetroAppWrapper,
  KeyCodeToControlMapping,
  Controllers,
  Controller,
  KCODES,
  CIDS,
  SCREEN_CONTROLS,
  LOG,
} from '@webrcade/app-common';

import { Prefs } from './prefs';
import { Touch } from './touch';

export class MelonDsKeyCodeToControlMapping extends KeyCodeToControlMapping {
  constructor() {
    super({
      [KCODES.ARROW_UP]: CIDS.UP,
      [KCODES.ARROW_DOWN]: CIDS.DOWN,
      [KCODES.ARROW_RIGHT]: CIDS.RIGHT,
      [KCODES.ARROW_LEFT]: CIDS.LEFT,
      [KCODES.Z]: CIDS.A,
      [KCODES.A]: CIDS.X,
      [KCODES.X]: CIDS.B,
      [KCODES.S]: CIDS.Y,
      [KCODES.Q]: CIDS.LBUMP,
      [KCODES.W]: CIDS.RBUMP,
      [KCODES.SHIFT_RIGHT]: CIDS.SELECT,
      [KCODES.ENTER]: CIDS.START,
      [KCODES.ESCAPE]: CIDS.ESCAPE,
      [KCODES.C]: CIDS.LTRIG,
    });
  }
}

export class Emulator extends RetroAppWrapper {

  VIDEO_WIDTH = 256;
  VIDEO_HEIGHT = 192;

  SCREEN_LAYOUT_TOP_BOTTOM = 0;
  SCREEN_LAYOUT_BOTTOM_TOP = 1
  SCREEN_LAYOUT_LEFT_RIGHT = 2;
  SCREEN_LAYOUT_RIGHT_LEFT = 3;
  SCREEN_LAYOUT_TOP_ONLY = 4;
  SCREEN_LAYOUT_BOTTOM_ONLY = 5;
  SCREEN_LAYOUT_HYBRID_TOP = 6;
  SCREEN_LAYOUT_HYBRID_BOTTOM = 7;

  GAME_SRAM_NAME = 'game.sav';
  SAVE_NAME = 'sav';

  constructor(app, debug = false) {
    super(app, debug);

    window.emulator = this;

    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseAbsX = 0;
    this.mouseAbsY = 0;
    this.mouseButtons = 0;

    this.gamepadMouseAdjust = 0;
    this.gamepadMouseX = 0;
    this.gamepadMouseY = 0;

    this.biosChecked = false;
    this.aspectRatio = 4/3;
    this.prefs = new Prefs(this);

    this.firstFrame = true;
    this.touchStartTime = 0;
    this.touch = null;

    this.gap = 0;
    this.bookMode = false;
    this.dualAnalogMode = false;
    this.gamepadForceCentered = false;
    this.originalToggleLayout = null;
    this.isToggling = false;

    document.onmousemove = (e) => {
      this.mouseX = e.movementX;
      this.mouseY = e.movementY;
    }

    document.onmousedown = (e) => {
      switch (e.button) {
        case 0:
          this.mouseButtons |= this.MOUSE_LEFT;
          break;
        case 1:
          this.mouseButtons |= this.MOUSE_MIDDLE;
          break;
        case 2:
          this.mouseButtons |= this.MOUSE_RIGHT;
          break;
        default:
      }
    };

    document.onmouseup = (e) => {
      switch (e.button) {
        case 0:
          this.mouseButtons &= ~this.MOUSE_LEFT;
          break;
        case 1:
          this.mouseButtons &= ~this.MOUSE_MIDDLE;
          break;
        case 2:
          this.mouseButtons &= ~this.MOUSE_RIGHT;
          break;
        default:
      }
    }
  }

  isWriteEmptyRomEnabled() {
    const ret = this.romPointer > 0;
    return ret;
  }

  createControllers() {
    return new Controllers([
      new Controller(new MelonDsKeyCodeToControlMapping()),
      new Controller(),
      new Controller(),
      new Controller(),
    ]);
  }

  getTouchRect() {
    const result = [0, 0];
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      const layout = this.getScreenLayout();
      if (this.bookMode) {
        result[0] = rect.width >>> 1;
        result[1] = rect.height;
      } else {
        if (layout === this.SCREEN_LAYOUT_TOP_BOTTOM || layout === this.SCREEN_LAYOUT_BOTTOM_TOP) {
          result[0] = rect.width;
          result[1] = rect.height >>> 1;
        } else if (layout === this.SCREEN_LAYOUT_LEFT_RIGHT || layout === this.SCREEN_LAYOUT_RIGHT_LEFT) {
          result[0] = rect.width >>> 1;
          result[1] = rect.height;
        } else {
          result[0] = rect.width;
          result[1] = rect.height;
        }
      }
    }

    return result;
  }

  async createDisplayLoop(debug) {
    const isSynced = await this.checkScreenSyncSync(60);
    return new DisplayLoop(60, true, debug, isSynced, false);
  }

  getScriptUrl() {
    return 'js/melonds_libretro.js';
  }

  getPrefs() {
    return this.prefs;
  }

  async saveState() {
    const { saveStatePath, started } = this;
    const { FS, Module } = window;

    try {
      if (!started) {
        return;
      }

      // Save to files
      Module._cmd_savefiles();

      let path = '';
      const files = [];
      let s = null;

      path = `/home/web_user/retroarch/userdata/saves/${this.GAME_SRAM_NAME}`;
      LOG.info('Checking: ' + path);
      try {
        s = FS.readFile(path);
        if (s) {
          LOG.info('Found save file: ' + path);
          files.push({
            name: this.SAVE_NAME,
            content: s,
          });
        }
      } catch (e) {}

      if (files.length > 0) {
        if (await this.getSaveManager().checkFilesChanged(files)) {
          await this.getSaveManager().save(
            saveStatePath,
            files,
            this.saveMessageCallback,
          );
        }
      } else {
        await this.getSaveManager().delete(path);
      }
    } catch (e) {
      LOG.error('Error persisting save state: ' + e);
    }
  }

  async loadState() {
    const { saveStatePath } = this;
    const { FS } = window;

    // Write the save state (if applicable)
    try {
      // Load
      const files = await this.getSaveManager().load(
        saveStatePath,
        this.loadMessageCallback,
      );

      if (files) {
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (f.name === this.SAVE_NAME) {
            LOG.info(`writing ${this.GAME_SRAM_NAME} file`);
            FS.writeFile(
              `/home/web_user/retroarch/userdata/saves/${this.GAME_SRAM_NAME}`,
              f.content,
            );
          }
        }

        // Cache the initial files
        await this.getSaveManager().checkFilesChanged(files);
      }
    } catch (e) {
      LOG.error('Error loading save state: ' + e);
    }
  }

  isEscapeHackEnabled() {
    return false;
  }

  applyGameSettings() {
    const props = this.getProps();
    console.log(props)

    const gap = props.screenGap;
    if (gap) {
      this.getPrefs().setScreenGap(true);
    }

    let layout = props.screenLayout;
    const bookMode = props.bookMode;
    if (bookMode) {
      this.bookMode = bookMode;
      layout = this.SCREEN_LAYOUT_TOP_BOTTOM;
    }

    const dualAnalog = props.dualAnalog;
    if (dualAnalog) {
      this.setDualAnalogMode(true);
    }

    if (layout) {
      let nextLayout = null;
      if (layout === "left-right") {
        nextLayout = this.SCREEN_LAYOUT_LEFT_RIGHT;
      } else if (layout === "right-left") {
        nextLayout = this.SCREEN_LAYOUT_RIGHT_LEFT;
      } else if (layout === "top-bottom") {
        nextLayout = this.SCREEN_LAYOUT_TOP_BOTTOM;
      } else if (layout === "bottom-top") {
        nextLayout = this.SCREEN_LAYOUT_BOTTOM_TOP;
      } else if (layout === "top-only") {
        nextLayout = this.SCREEN_LAYOUT_TOP_ONLY;
      } else if (layout === "bottom-only") {
        nextLayout = this.SCREEN_LAYOUT_BOTTOM_ONLY;
      }
      if (nextLayout !== null) {
        this.getPrefs().setScreenLayout(nextLayout);
      }
    }

    this.updateScreenLayout();
  }

  isForceAspectRatio() {
    return false;
  }

  resetToggleLayout() {
    this.originalToggleLayout = null;
  }

  toggleScreens() {
    let layout = this.getPrefs().getScreenLayout();
    if (this.originalToggleLayout === null) {
      if (layout !== this.SCREEN_LAYOUT_BOTTOM_ONLY && layout !== this.SCREEN_LAYOUT_TOP_ONLY) {
        this.originalToggleLayout = layout;
      } else {
        // Don't toggle to it
        this.originalToggleLayout = -1;
      }
    }

    if (layout === this.SCREEN_LAYOUT_TOP_ONLY) {
      layout = this.SCREEN_LAYOUT_BOTTOM_ONLY;
    } else if (layout === this.SCREEN_LAYOUT_BOTTOM_ONLY && this.originalToggleLayout !== -1) {
      layout = this.originalToggleLayout;
    } else {
      layout = this.SCREEN_LAYOUT_TOP_ONLY;
    }

    this.getPrefs().setScreenLayout(layout);
    setTimeout(() => {
      this.updateScreenLayout()
    }, 50);
  }

  updateScreenLayout(redraw = true) {
    const { Module, canvas } = window;
    //const props = this.getProps();
    let options = 0;
    options |= this.OPT1;

    if (this.getPrefs().getScreenGap()) {
      options |= this.OPT2;
    }

    if (redraw) {
      canvas.style.setProperty('visibility', 'hidden', 'important');
    }

    Module._wrc_set_options(options);
    setTimeout(() => {
      this.updateScreenSize(redraw);
      if (redraw) {
        // TODO: removed when not redraw... why was this necessary?
        window.dispatchEvent(new Event("resize"));
      }
    }, 50);
  }

  getScreenLayout() {
    let layout = this.getPrefs().getScreenLayout();

    if (this.bookMode) {
      if (layout === this.SCREEN_LAYOUT_TOP_BOTTOM) {
        layout = this.SCREEN_LAYOUT_LEFT_RIGHT;
      } else if (layout === this.SCREEN_LAYOUT_BOTTOM_TOP) {
        layout = this.SCREEN_LAYOUT_RIGHT_LEFT;
      } else if (layout === this.SCREEN_LAYOUT_LEFT_RIGHT) {
          layout = this.SCREEN_LAYOUT_TOP_BOTTOM;
      } else if (layout === this.SCREEN_LAYOUT_RIGHT_LEFT) {
        layout = this.SCREEN_LAYOUT_BOTTOM_TOP;
      }
    }

    return layout;
  }

  setScreenWidthAndHeight(width, height, gap) {
    console.log("## width and height: " + width + ", " + height);
    console.log("## gap: " + gap);
    this.aspectRatio = width/height;
    this.gap = gap;
  }

  getDefaultAspectRatio() {
    return this.aspectRatio;
  }

  resizeScreen(canvas) {
    this.canvas = canvas;
    this.updateScreenSize();
  }

  updateScreenSize(redraw = true) {
    const { canvas } = this;

    let updateCount = 0;
    if (canvas && redraw /*&& this.bookMode*/) {
      canvas.style.setProperty('visibility', 'hidden', 'important');
      if (!this.updateCount) {
        this.updateCount = 0;
        this.initialUpdate = true;
      }
      this.updateCount++;
      updateCount = this.updateCount;
    }

    super.updateScreenSize();

    if (canvas) {
      if (this.bookMode) {
        canvas.classList.add('book-mode');
      } else {
        canvas.classList.remove('book-mode');
      }
    }

    if (canvas && redraw /*&& this.bookMode*/) {
      setTimeout(() => {
        if (this.updateCount === updateCount) {
          if (this.initialUpdate) {
            setTimeout(() => {
              canvas.style.setProperty('visibility', 'visible', 'important');
            }, 3000);
            this.initialUpdate = false;
          } else {
            canvas.style.setProperty('visibility', 'visible', 'important');
          }
        }
      }, 100);
    }
  }

  setDualAnalogMode(val) {
    this.dualAnalogMode = val;
  }

  isDualAnalogMode() {
    return this.dualAnalogMode;
  }

  setBookMode(val) {
    this.bookMode = val;
  }

  isBookMode() {
    return this.bookMode;
  }

  isScreenRotated() {
    return this.bookMode;
  }

  onPause(p) {
    super.onPause(p);

    if (this.touch) {
      this.touch.setTouchEnabled(!p);
    }

    if (!p) {
      setTimeout(() => {
        this.updateScreenLayout(false)
      }, 50);
    }
  }

  showTouchOverlay(show) {
    const to = document.getElementById("touch-overlay");
    if (to) {
      to.style.display = show ? 'block' : 'none';
    }
  }

  checkOnScreenControls() {
    const controls = this.prefs.getScreenControls();
    if (controls === SCREEN_CONTROLS.SC_AUTO) {
      setTimeout(() => {
        this.showTouchOverlay(true);
        this.app.forceRefresh();
      }, 0);
    }
  }

  onKeyboardEvent(e) {
    if (e.code && !this.keyboardEvent) {
      this.keyboardEvent = true;
      this.checkOnScreenControls();
    }
  }

  onTouchEvent() {
    if (!this.touchEvent) {
      //this.touch.setTouchEnabled(true);
      this.touchEvent = true;
      this.checkOnScreenControls();
    }
  }

  onMouseEvent() {
    if (!this.mouseEvent) {
      this.mouseEvent = true;
      this.checkOnScreenControls();
    }

    this.mouseEventCount++;
  }

  updateOnScreenControls(initial = false) {
    const controls = this.prefs.getScreenControls();
    if (controls === SCREEN_CONTROLS.SC_OFF) {
      this.showTouchOverlay(false);
    } else if (controls === SCREEN_CONTROLS.SC_ON) {
      this.showTouchOverlay(true);
    } else if (controls === SCREEN_CONTROLS.SC_AUTO) {
      if (!initial) {
        setTimeout(() => {
          this.showTouchOverlay(this.touchEvent || this.mouseEvent);
          this.app.forceRefresh();
        }, 0);
      }
    }
  }

  getMouseAbsX() {
    // if (this.disableInput) return 0;
    return this.mouseAbsX;
  }

  getMouseAbsY() {
    // if (this.disableInput) return 0;
    return this.mouseAbsY;
  }

  updateMouseFromGamepad() {
    const { canvas, controllers } = this;

    if (!canvas || !controllers) return 0;

    // Sensitivity factor for analog stick movement
    let sensitivity = 3; // Adjust this value to change sensitivity

    // Dead zone threshold
    let deadZone = 0.15; // This value can be adjusted (0.1 means 10% of the stick's range)

    const gamepads = navigator.getGamepads();
    if (gamepads.length <= 0) return 0;

    const gamepad = gamepads[0];
    if (!gamepad || gamepad.axes.length < 4) return 0;

    // Get the analog stick values (ranging from -1 to 1)
    let stickX = gamepad.axes[2]; // X-axis (left-right)
    let stickY = gamepad.axes[3]; // Y-axis (up-down)

    if (this.bookMode) {
      let temp = stickY;
      stickY = stickX;
      stickX = temp;
    }

    // Check if the movement is within the dead zone
    if (Math.abs(stickX) < deadZone) stickX = 0;
    if (Math.abs(stickY) < deadZone) stickY = 0;

    if (stickX !== 0 || stickY !== 0) {
      if (stickX !== 0) {
        stickX = stickX > 0 ? stickX - deadZone : stickX + deadZone;
      }
      if (stickY !== 0) {
        stickY = stickY > 0 ? stickY - deadZone : stickY + deadZone;
      }

      // Apply sensitivity by multiplying the stick values
      stickX *= sensitivity;
      stickY *= sensitivity;

      // const slow = false; // controllers.isControlDown(0, CIDS.RBUMP);
      this.gamepadMouseX = stickX;
      this.gamepadMouseY = stickY;

      if (this.bookMode) {
        this.gamepadMouseX = -1 * stickX;
      }
    }

    // Center Stylus (Cursor)
    if (controllers.isControlDown(0, CIDS.LANALOG)) {
      this.mouseAbsX = this.VIDEO_WIDTH / 2;
      this.mouseAbsY = this.VIDEO_HEIGHT / 2;
      this.gamepadMouseX = 0;
      this.gamepadMouseY = 0;
      this.gamepadForceCentered = true;
    }

    return (
      controllers.isControlDown(0, CIDS.RANALOG) ||
      controllers.isControlDown(0, CIDS.RTRIG)/* ||
      controllers.isControlDown(0, CIDS.LTRIG)*/) ? this.MOUSE_LEFT : 0;
  }

  handleEscape(controllers) {
    if ((controllers.isControlDown(0, CIDS.LTRIG) && !controllers.isControlDown(0, CIDS.LANALOG))
  ) {
      return true;
    }
    return false;
  }

  // getExitOnLoopError() {
  //   return true;
  // }

  onFrame() {
    const { controllers } = this;

    if (this.touch) {
      this.touch.setTouchEnabled(true);
    }

    if (this.firstFrame) {
      this.firstFrame = false;

      const canvas = this.canvas;
      this.touch = new Touch(this);

      canvas.addEventListener("mousemove", (event) => {
        const touchRect = this.getTouchRect();
        const layout = this.getScreenLayout();

        let adjustX = this.VIDEO_WIDTH / touchRect[0];
        let adjustY = 0;
        if (layout === this.SCREEN_LAYOUT_TOP_BOTTOM || layout === this.SCREEN_LAYOUT_BOTTOM_TOP ) {
          adjustY = (this.VIDEO_HEIGHT + (this.gap / 2)) / touchRect[1];
        } else {
          adjustY = this.VIDEO_HEIGHT / touchRect[1];
        }

        if (this.bookMode) {
          adjustX = (this.VIDEO_WIDTH + ((this.gap * (this.VIDEO_WIDTH / this.VIDEO_HEIGHT)) / 2)) / touchRect[0];
          adjustY = this.VIDEO_HEIGHT / touchRect[1];
        }

        const rect = canvas.getBoundingClientRect();
        let x = (event.clientX - rect.left) * adjustX;
        let y = (event.clientY - rect.top) * adjustY;

        if (this.bookMode) {
          x -= this.VIDEO_WIDTH;
          let temp = y;
          y = x * (this.VIDEO_HEIGHT / this.VIDEO_WIDTH);
          x = this.VIDEO_WIDTH - (temp * (this.VIDEO_WIDTH / this.VIDEO_HEIGHT));
          y -= (this.gap)
        } else {
          if (layout === this.SCREEN_LAYOUT_TOP_BOTTOM) {
            y -= this.VIDEO_HEIGHT
            y -= (this.gap);
          } else if (layout === this.SCREEN_LAYOUT_LEFT_RIGHT) {
            x -= this.VIDEO_WIDTH;
          }
        }

        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x >= this.VIDEO_WIDTH) x = this.VIDEO_WIDTH - 1;
        if (y >= this.VIDEO_HEIGHT) y = this.VIDEO_HEIGHT - 1;
        this.mouseAbsX = x | 0;
        this.mouseAbsY = y | 0;
      });

      document.getElementById("background").addEventListener("touchstart", (e) => {
        e.preventDefault();
      });

      window.addEventListener("contextmenu", e => e.preventDefault());
      document.body.addEventListener("contextmenu", e => e.preventDefault());
      setTimeout(() => {
        const onTouch = () => { this.onTouchEvent() };
        window.addEventListener("touchstart", () => {
          this.touchStartTime = Date.now();
          onTouch();
        });
        window.addEventListener("touchend", () => {
          this.touchStartTime = Date.now();
          onTouch();
        });
        window.addEventListener("touchcancel", onTouch);
        window.addEventListener("touchmove", onTouch);

        const onMouse = () => { this.onMouseEvent() };
        window.addEventListener("mousedown", onMouse);
        window.addEventListener("mouseup", onMouse);
        window.addEventListener("mousemove", onMouse);

        this.app.showCanvas();
      }, 10);
    } else {
      // Flip the screen
      if (controllers.isControlDown(0, CIDS.RANALOG) && controllers.isControlDown(0, CIDS.LANALOG)) {
        this.isToggling = true;
      } else if (this.isToggling) {
        this.isToggling = false;
        this.toggleScreens();
      }

      const touchRect = this.getTouchRect();

      let gamepadMouseButtons = this.updateMouseFromGamepad();
      const gamepadInput = (this.gamepadMouseX !== 0 || this.gamepadMouseY !==0)

      this.mouseAbsX += this.gamepadMouseX;
      this.mouseAbsY += this.gamepadMouseY;
      this.gamepadMouseX = 0;
      this.gamepadMouseY = 0;

      let bounds = false;
      if (this.mouseAbsX < 0) {
        this.mouseAbsX = 0;
        bounds = true;
      }
      if (this.mouseAbsY < 0) {
        this.mouseAbsY = 0;
        bounds = true;
      }
      if (this.mouseAbsX >= this.VIDEO_WIDTH) {
        this.mouseAbsX = this.VIDEO_WIDTH - 1;
        bounds = true;
      }
      if (this.mouseAbsY >= this.VIDEO_HEIGHT) {
        this.mouseAbsY  = this.VIDEO_HEIGHT - 1;
        bounds = true;
      }

      if (this.gamepadForceCentered) {
        gamepadMouseButtons = 0;
        this.mouseAbsX = this.VIDEO_WIDTH / 2;
        this.mouseAbsY = this.VIDEO_HEIGHT / 2;
        this.gamepadForceCentered = false;
      }

      if (this.dualAnalogMode && bounds && gamepadInput) {
        this.gamepadForceCentered = true;
      }

      window.Module._wrc_update_mouse(
        this.mouseX * (this.VIDEO_WIDTH / touchRect[0]) | 0 /** adjust*/,
        this.mouseY * (this.VIDEO_HEIGHT / touchRect[1]) | 0 /** adjust*/,
        this.mouseButtons | gamepadMouseButtons /*| this.touchClick */
      );
      this.mouseX = 0; this.mouseY = 0;
    }
  }

  getShotAspectRatio() { return this.getDefaultAspectRatio(); }

  getRaConfigContents() {
    return (
      "video_threaded = \"false\"\n" +
      "video_vsync = \"false\"\n" +
      "video_driver = \"256\"\n" +
      "audio_latency = \"192\"\n" +
      "audio_buffer_size = \"8192\"\n" +
      "audio_sync = \"false\"\n" +
      "audio_driver = \"sdl2\"\n"
    )
  }

  createTouchListener() {}

  checkScreenSyncSync(targetFPS = 60) {
    return new Promise((resolve) => {
      let frameCount = 0;

      const currentTimeMillis = Date.now();

      // Function to update FPS and check synchronization
      function calculateFPS(timestamp) {
        frameCount++;

        // Calculate FPS every 1 second
        if (frameCount === targetFPS) {
          const elapsed = ((Date.now() - currentTimeMillis) / 1000.0);
          resolve(elapsed > 0.92 && elapsed < 1.08);
        }

        // Continue the animation frame loop
        requestAnimationFrame(calculateFPS);
      }

      // Start the FPS checking
      requestAnimationFrame(calculateFPS);
    });
  }
}
