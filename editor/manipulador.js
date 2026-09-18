(() => {
  "use strict";

  const ELEMENT = ".page-element";
  const HANDLE = ".editor-handle";

  const MIN_SIZE = 30;
  const SNAP = 8;

  let active = null;

  function canvas() {
    return document.querySelector(".design-page");
  }

  function getRect(el) {
    const rect = el.getBoundingClientRect();
    const parent = canvas().getBoundingClientRect();

    return {
      x: rect.left - parent.left,
      y: rect.top - parent.top,
      width: rect.width,
      height: rect.height
    };
  }

  function apply(el, x, y, width, height, rotation) {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;

    if (rotation !== undefined) {
      el.style.setProperty(
        "--editor-rotation",
        `${rotation}deg`
      );
    }
  }

  function snap(value, targets) {
    for (const target of targets) {
      if (Math.abs(value - target) <= SNAP) {
        return target;
      }
    }

    return value;
  }

  function snapPosition(el, x, y, width, height) {
    const parent = canvas();

    if (!parent) {
      return { x, y };
    }

    const rect = parent.getBoundingClientRect();

    const targetsX = [
      0,
      rect.width / 2 - width / 2,
      rect.width - width
    ];

    const targetsY = [
      0,
      rect.height / 2 - height / 2,
      rect.height - height
    ];

    return {
      x: snap(x, targetsX),
      y: snap(y, targetsY)
    };
  }

  function beginMove(event, el) {
    if (
      event.target.closest(".editor-handle") ||
      event.target.closest("button") ||
      event.target.closest("input")
    ) {
      return;
    }

    if (
      el.hasAttribute("data-locked") ||
      el.dataset.locked === "true"
    ) {
      return;
    }

    const r = getRect(el);

    active = {
      type: "move",
      element: el,
      pointerId: event.pointerId,

      startPointerX: event.clientX,
      startPointerY: event.clientY,

      startX: r.x,
      startY: r.y,

      width: r.width,
      height: r.height,

      rotation:
        parseFloat(
          getComputedStyle(el)
            .getPropertyValue("--editor-rotation")
        ) || 0
    };

    el.classList.add("editor-moving");

    try {
      el.setPointerCapture(event.pointerId);
    } catch {}

    event.preventDefault();

    window.PluginDexSelection?.select(el);
  }

  function move(event) {
    if (!active) return;
    if (event.pointerId !== active.pointerId) return;

    const el = active.element;

    const dx =
      event.clientX -
      active.startPointerX;

    const dy =
      event.clientY -
      active.startPointerY;

    let x = active.startX + dx;
    let y = active.startY + dy;

    const snapped = snapPosition(
      el,
      x,
      y,
      active.width,
      active.height
    );

    x = snapped.x;
    y = snapped.y;

    const parent = canvas();

    if (parent) {
      const maxX =
        parent.clientWidth -
        active.width;

      const maxY =
        parent.clientHeight -
        active.height;

      x = Math.max(0, Math.min(maxX, x));
      y = Math.max(0, Math.min(maxY, y));
    }

    apply(
      el,
      x,
      y,
      active.width,
      active.height,
      active.rotation
    );

    drawGuides(el, x, y);
  }

  function end(event) {
    if (!active) return;

    if (
      event.pointerId !== undefined &&
      event.pointerId !== active.pointerId
    ) {
      return;
    }

    active.element.classList.remove(
      "editor-moving",
      "editor-resizing",
      "editor-rotating"
    );

    removeGuides();

    document.dispatchEvent(
      new CustomEvent("plugindex:elementchange", {
        detail: {
          element: active.element,
          type: active.type
        }
      })
    );

    active = null;
  }

  function beginResize(event, el, direction) {
    if (
      el.hasAttribute("data-locked") ||
      el.dataset.locked === "true"
    ) {
      return;
    }

    const r = getRect(el);

    active = {
      type: "resize",
      element: el,
      direction,
      pointerId: event.pointerId,

      startPointerX: event.clientX,
      startPointerY: event.clientY,

      startX: r.x,
      startY: r.y,
      startWidth: r.width,
      startHeight: r.height
    };

    el.classList.add("editor-resizing");

    try {
      event.currentTarget.setPointerCapture(
        event.pointerId
      );
    } catch {}

    event.preventDefault();
    event.stopPropagation();
  }

  function resize(event) {
    if (!active || active.type !== "resize") {
      return;
    }

    if (event.pointerId !== active.pointerId) {
      return;
    }

    const dx =
      event.clientX -
      active.startPointerX;

    const dy =
      event.clientY -
      active.startPointerY;

    let x = active.startX;
    let y = active.startY;
    let width = active.startWidth;
    let height = active.startHeight;

    const west =
      active.direction.includes("w");

    const east =
      active.direction.includes("e");

    const north =
      active.direction.includes("n");

    const south =
      active.direction.includes("s");

    if (east) {
      width =
        active.startWidth + dx;
    }

    if (south) {
      height =
        active.startHeight + dy;
    }

    if (west) {
      width =
        active.startWidth - dx;

      x =
        active.startX + dx;
    }

    if (north) {
      height =
        active.startHeight - dy;

      y =
        active.startY + dy;
    }

    width = Math.max(
      MIN_SIZE,
      width
    );

    height = Math.max(
      MIN_SIZE,
      height
    );

    const parent = canvas();

    if (parent) {
      width = Math.min(
        width,
        parent.clientWidth - x
      );

      height = Math.min(
        height,
        parent.clientHeight - y
      );
    }

    apply(
      active.element,
      x,
      y,
      width,
      height
    );

    drawGuides(
      active.element,
      x,
      y
    );
  }

  function beginRotate(event, el) {
    const r = getRect(el);

    const centerX =
      r.x + r.width / 2;

    const centerY =
      r.y + r.height / 2;

    active = {
      type: "rotate",
      element: el,
      pointerId: event.pointerId,

      centerX,
      centerY,

      startRotation:
        parseFloat(
          getComputedStyle(el)
            .getPropertyValue(
              "--editor-rotation"
            )
        ) || 0
    };

    el.classList.add("editor-rotating");

    try {
      event.currentTarget.setPointerCapture(
        event.pointerId
      );
    } catch {}

    event.preventDefault();
    event.stopPropagation();
  }

  function rotate(event) {
    if (!active || active.type !== "rotate") {
      return;
    }

    if (event.pointerId !== active.pointerId) {
      return;
    }

    const parent = canvas();

    if (!parent) return;

    const rect =
      parent.getBoundingClientRect();

    const x =
      rect.left +
      active.centerX;

    const y =
      rect.top +
      active.centerY;

    const angle =
      Math.atan2(
        event.clientY - y,
        event.clientX - x
      ) *
      180 /
      Math.PI;

    const rotation =
      angle +
      90;

    active.element.style.setProperty(
      "--editor-rotation",
      `${rotation}deg`
    );
  }

  function createHandles(el) {
    if (
      el.querySelector(
        ".editor-handles"
      )
    ) {
      return;
    }

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "editor-handles";

    [
      "nw",
      "n",
      "ne",
      "e",
      "se",
      "s",
      "sw",
      "w"
    ].forEach(direction => {
      const handle =
        document.createElement("div");

      handle.className =
        `editor-handle editor-handle-${direction}`;

      handle.dataset.resize =
        direction;

      wrapper.appendChild(handle);
    });

    const rotate =
      document.createElement("div");

    rotate.className =
      "editor-rotate-handle";

    rotate.dataset.rotate = "true";

    wrapper.appendChild(rotate);

    el.appendChild(wrapper);
  }

  function removeGuides() {
    document
      .querySelectorAll(
        ".editor-guide"
      )
      .forEach(el => el.remove());
  }

  function drawGuides(el, x, y) {
    removeGuides();

    const parent = canvas();

    if (!parent) return;

    const r = getRect(el);

    const centerX =
      x + r.width / 2;

    const centerY =
      y + r.height / 2;

    const p = parent.getBoundingClientRect();

    const guideX =
      document.createElement("div");

    guideX.className =
      "editor-guide editor-guide-x";

    guideX.style.left =
      `${centerX}px`;

    guideX.style.top = "0";

    guideX.style.height =
      `${p.height}px`;

    const guideY =
      document.createElement("div");

    guideY.className =
      "editor-guide editor-guide-y";

    guideY.style.top =
      `${centerY}px`;

    guideY.style.left = "0";

    guideY.style.width =
      `${p.width}px`;

    parent.append(
      guideX,
      guideY
    );
  }

  document.addEventListener(
    "pointerdown",
    event => {
      const el =
        event.target.closest(ELEMENT);

      if (!el) return;

      createHandles(el);

      const resize =
        event.target.closest(
          HANDLE
        );

      if (resize) {
        beginResize(
          event,
          el,
          resize.dataset.resize
        );

        return;
      }

      const rotate =
        event.target.closest(
          ".editor-rotate-handle"
        );

      if (rotate) {
        beginRotate(
          event,
          el
        );

        return;
      }

      beginMove(event, el);
    },
    {
      passive: false
    }
  );

  document.addEventListener(
    "pointermove",
    event => {
      if (!active) return;

      if (active.type === "move") {
        move(event);
      }

      if (active.type === "resize") {
        resize(event);
      }

      if (active.type === "rotate") {
        rotate(event);
      }
    },
    {
      passive: false
    }
  );

  document.addEventListener(
    "pointerup",
    end
  );

  document.addEventListener(
    "pointercancel",
    end
  );

  document.addEventListener(
    "plugindex:selectionchange",
    event => {
      document
        .querySelectorAll(
          `${ELEMENT} .editor-handles`
        )
        .forEach(handles => {
          handles.remove();
        });

      event.detail.elements.forEach(
        createHandles
      );
    }
  );

  window.PluginDexManipulator = {
    createHandles
  };
})();
