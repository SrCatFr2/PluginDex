(() => {
  "use strict";

  const state = {
    selected: null,
    multi: new Set()
  };

  const SELECTOR = ".page-element";

  function getCanvas() {
    return document.querySelector(".design-page");
  }

  function getElements() {
    return [...document.querySelectorAll(SELECTOR)];
  }

  function select(element, additive = false) {
    if (!element) {
      clear();
      return;
    }

    if (!additive) {
      state.multi.clear();
      state.multi.add(element);
    } else {
      if (state.multi.has(element)) {
        state.multi.delete(element);
      } else {
        state.multi.add(element);
      }
    }

    state.selected = element;

    getElements().forEach(el => {
      el.classList.toggle("editor-selected", state.multi.has(el));
    });

    element.scrollIntoView({
      block: "nearest",
      inline: "nearest"
    });

    document.dispatchEvent(
      new CustomEvent("plugindex:selectionchange", {
        detail: {
          element,
          elements: [...state.multi]
        }
      })
    );
  }

  function clear() {
    state.selected = null;
    state.multi.clear();

    getElements().forEach(el => {
      el.classList.remove("editor-selected");
    });

    document.dispatchEvent(
      new CustomEvent("plugindex:selectionchange", {
        detail: {
          element: null,
          elements: []
        }
      })
    );
  }

  function getSelected() {
    return state.selected;
  }

  function getSelectedAll() {
    return [...state.multi];
  }

  function refresh() {
    const selected = state.selected;

    getElements().forEach(el => {
      el.classList.toggle(
        "editor-selected",
        state.multi.has(el)
      );
    });

    if (selected && !document.body.contains(selected)) {
      clear();
    }
  }

  document.addEventListener("click", event => {
    const element = event.target.closest(SELECTOR);

    if (!element) {
      if (
        event.target.closest(".design-page") &&
        !event.target.closest(".editor-control")
      ) {
        clear();
      }

      return;
    }

    if (
      event.target.closest(
        ".resize-handle,.rotate-handle,.element-toolbar"
      )
    ) {
      return;
    }

    select(
      element,
      event.shiftKey || event.ctrlKey || event.metaKey
    );
  });

  document.addEventListener("keydown", event => {
    if (
      event.key === "Escape" &&
      state.selected
    ) {
      clear();
    }
  });

  window.PluginDexSelection = {
    select,
    clear,
    refresh,
    getSelected,
    getSelectedAll,
    getCanvas
  };
})();
