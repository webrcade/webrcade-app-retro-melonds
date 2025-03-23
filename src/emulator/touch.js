
export class Touch {
  constructor(app) {
    this.app = app;
    this.canvas = app.canvas;
    this.touchEnabled = false;
    const canvas = this.canvas;

    function transformTouchToMouse(touch) {
      const rect = canvas.getBoundingClientRect();
      let x = touch.clientX - rect.left;
      let y = touch.clientY - rect.top;

      if (touch.clientX < rect.left) x = 0;
      if (touch.clientY < rect.top) y = 0;

      if (touch.clientX > rect.right) x = rect.width;
      if (touch.clientY > rect.bottom) y = rect.height;

      return { x, y };
    }

    window.addEventListener("touchstart", (e) => {
      if (!this.touchEnabled) return;
      const { x, y } = transformTouchToMouse(e.changedTouches[0]);
      sendMouseEvent("mousemove", x, y);
      sendMouseEvent("mousedown", x, y);
      e.preventDefault();
    }, { passive: false });

    window.addEventListener("touchmove", (e) => {
      if (!this.touchEnabled) return;
      const { x, y } = transformTouchToMouse(e.changedTouches[0]);
      sendMouseEvent("mousemove", x, y);
      e.preventDefault();
    }, { passive: false });

    window.addEventListener("touchend", (e) => {
      if (!this.touchEnabled) return;
      const { x, y } = transformTouchToMouse(e.changedTouches[0]);
      sendMouseEvent("mousemove", x, y);
      sendMouseEvent("mouseup", x, y); // End event, you may want to keep last x, y
      e.preventDefault();
    }, { passive: false });

    function sendMouseEvent(type, x, y) {
      const rect = canvas.getBoundingClientRect();
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x + rect.left,
        clientY: y + rect.top,
      });
      canvas.dispatchEvent(event);
    }

  /*
    canvas.addEventListener("touchstart", function (event) {
      let touch = event.changedTouches[0];

      let mouseEvent = new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      touch.target.dispatchEvent(mouseEvent);

      mouseEvent = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      touch.target.dispatchEvent(mouseEvent);
      event.preventDefault();
    }, { passive: false });

    canvas.addEventListener("touchmove", function (event) {
      let touch = event.changedTouches[0];
      let mouseEvent = new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      touch.target.dispatchEvent(mouseEvent);
      event.preventDefault();
    }, { passive: false });

    canvas.addEventListener("touchend", function (event) {
      let touch = event.changedTouches[0];

      let mouseEvent = new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      touch.target.dispatchEvent(mouseEvent);

      mouseEvent = new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      touch.target.dispatchEvent(mouseEvent);

      event.preventDefault();
    }, { passive: false });
    */
  }

  setTouchEnabled(val) {
    this.touchEnabled = val;
  }
}
