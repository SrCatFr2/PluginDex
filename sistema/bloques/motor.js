(() => {
  "use strict";

  const state = {
    scripts: [],
    selectedScript: null,
    dragging: null,
    nextId: 1
  };

  const BLOCKS = {
    event_click: {
      category: "event",
      title: "Al hacer clic",
      color: "event",
      inputs: [
        {
          name: "element",
          type: "element",
          value: ""
        }
      ]
    },

    event_start: {
      category: "event",
      title: "Al iniciar",
      color: "event",
      inputs: []
    },

    ui_text: {
      category: "ui",
      title: "Cambiar texto",
      color: "ui",
      inputs: [
        {
          name: "element",
          type: "element",
          value: ""
        },
        {
          name: "text",
          type: "text",
          value: "Hola"
        }
      ]
    },

    ui_show: {
      category: "ui",
      title: "Mostrar elemento",
      color: "ui",
      inputs: [
        {
          name: "element",
          type: "element",
          value: ""
        }
      ]
    },

    ui_hide: {
      category: "ui",
      title: "Ocultar elemento",
      color: "ui",
      inputs: [
        {
          name: "element",
          type: "element",
          value: ""
        }
      ]
    },

    style_color: {
      category: "style",
      title: "Cambiar color",
      color: "style",
      inputs: [
        {
          name: "element",
          type: "element",
          value: ""
        },
        {
          name: "color",
          type: "color",
          value: "#ffffff"
        }
      ]
    },

    wait: {
      category: "control",
      title: "Esperar",
      color: "control",
      inputs: [
        {
          name: "seconds",
          type: "number",
          value: 1
        }
      ]
    },

    condition: {
      category: "control",
      title: "Si",
      color: "control",
      inputs: [
        {
          name: "condition",
          type: "text",
          value: "verdadero"
        }
      ]
    }
  };

  function id() {
    return `block_${state.nextId++}`;
  }

  function create(type) {
    const definition =
      BLOCKS[type];

    if (!definition) {
      return null;
    }

    return {
      id: id(),
      type,
      inputs: Object.fromEntries(
        definition.inputs.map(input => [
          input.name,
          input.value
        ])
      ),
      children: []
    };
  }

  function createScript() {
    const script = {
      id: `script_${Date.now()}`,
      name: "Nuevo evento",
      blocks: []
    };

    state.scripts.push(script);
    state.selectedScript = script;

    return script;
  }

  function addBlock(
    script,
    type,
    index = null
  ) {
    const block = create(type);

    if (!block) return null;

    if (
      index === null ||
      index >= script.blocks.length
    ) {
      script.blocks.push(block);
    } else {
      script.blocks.splice(
        index,
        0,
        block
      );
    }

    render();

    return block;
  }

  function removeBlock(script, blockId) {
    const index =
      script.blocks.findIndex(
        block =>
          block.id === blockId
      );

    if (index === -1) return;

    script.blocks.splice(
      index,
      1
    );

    render();
  }

  function setInput(
    block,
    name,
    value
  ) {
    block.inputs[name] =
      value;

    save();
  }

  function getElements() {
    return [
      ...document.querySelectorAll(
        ".page-element"
      )
    ];
  }

  function elementOptions() {
    return getElements()
      .map((el, index) => ({
        value:
          el.dataset.id ||
          el.id ||
          `element-${index}`,

        label:
          el.dataset.name ||
          el.textContent
            ?.trim()
            .slice(0, 24) ||
          el.dataset.type ||
          "Elemento"
      }));
  }

  function inputHTML(block, input) {
    const value =
      block.inputs[input.name] ??
      input.value ??
      "";

    if (
      input.type === "element"
    ) {
      return `
        <select
          class="block-input"
          data-block="${block.id}"
          data-input="${input.name}"
        >
          <option value="">Seleccionar</option>
          ${elementOptions()
            .map(
              option => `
                <option
                  value="${escapeHTML(option.value)}"
                  ${option.value === value ? "selected" : ""}
                >
                  ${escapeHTML(option.label)}
                </option>
              `
            )
            .join("")}
        </select>
      `;
    }

    if (
      input.type === "number"
    ) {
      return `
        <input
          class="block-input"
          type="number"
          value="${escapeHTML(value)}"
          data-block="${block.id}"
          data-input="${input.name}"
        >
      `;
    }

    if (
      input.type === "color"
    ) {
      return `
        <input
          class="block-input block-color"
          type="color"
          value="${escapeHTML(value)}"
          data-block="${block.id}"
          data-input="${input.name}"
        >
      `;
    }

    return `
      <input
        class="block-input"
        type="text"
        value="${escapeHTML(value)}"
        data-block="${block.id}"
        data-input="${input.name}"
      >
    `;
  }

  function renderBlock(
    block,
    index
  ) {
    const definition =
      BLOCKS[block.type];

    if (!definition) {
      return "";
    }

    return `
      <div
        class="visual-block block-${definition.color}"
        data-block="${block.id}"
        draggable="true"
      >
        <div class="block-top">
          <span class="block-category">
            ${escapeHTML(
              definition.category
            )}
          </span>

          <button
            class="block-delete"
            data-delete-block="${block.id}"
            type="button"
          >
            ×
          </button>
        </div>

        <strong>
          ${escapeHTML(
            definition.title
          )}
        </strong>

        <div class="block-inputs">
          ${definition.inputs
            .map(
              input => `
                <label>
                  <span>
                    ${escapeHTML(
                      input.name
                    )}
                  </span>
                  ${inputHTML(
                    block,
                    input
                  )}
                </label>
              `
            )
            .join("")}
        </div>

        ${
          definition.category ===
          "control"
            ? `
              <div class="block-children">
                Soltar bloques aquí
              </div>
            `
            : ""
        }
      </div>
    `;
  }

  function render() {
    const root =
      document.querySelector(
        "#blockEditor"
      );

    if (!root) return;

    if (!state.selectedScript) {
      root.innerHTML = `
        <div class="blocks-empty">
          <div class="blocks-empty-icon"></div>
          <strong>Crea tu primer comportamiento</strong>
          <span>Selecciona un evento para empezar.</span>
        </div>
      `;

      return;
    }

    root.innerHTML = `
      <div class="block-script-header">
        <input
          class="script-name"
          value="${escapeHTML(
            state.selectedScript.name
          )}"
        >
        <button
          type="button"
          data-add-script
        >
          +
        </button>
      </div>

      <div class="block-stack">
        ${
          state.selectedScript.blocks
            .map(renderBlock)
            .join("")
        }
      </div>
    `;
  }

  function escapeHTML(value) {
    return String(
      value ?? ""
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function save() {
    try {
      localStorage.setItem(
        "plugindex-blocks-v1",
        JSON.stringify({
          scripts: state.scripts,
          nextId: state.nextId
        })
      );
    } catch {}
  }

  function load() {
    try {
      const raw =
        localStorage.getItem(
          "plugindex-blocks-v1"
        );

      if (!raw) return;

      const data =
        JSON.parse(raw);

      state.scripts =
        data.scripts || [];

      state.nextId =
        data.nextId || 1;

      state.selectedScript =
        state.scripts[0] || null;
    } catch {}
  }

  function generateJS(
    script
  ) {
    if (!script) return "";

    let output = "";

    for (
      const block of script.blocks
    ) {
      output += blockToJS(
        block
      );
    }

    return output.trim();
  }

  function blockToJS(block) {
    const get =
      name =>
        block.inputs[name];

    switch (block.type) {
      case "event_start":
        return "";

      case "event_click": {
        const selector =
          resolveSelector(
            get("element")
          );

        return `
document.querySelector(${JSON.stringify(
          selector
        )})?.addEventListener("click", () => {
`;
      }

      case "ui_text": {
        const selector =
          resolveSelector(
            get("element")
          );

        return `
  document.querySelector(${JSON.stringify(
    selector
  )}).textContent = ${JSON.stringify(
    get("text")
  )};
`;
      }

      case "ui_show": {
        const selector =
          resolveSelector(
            get("element")
          );

        return `
  document.querySelector(${JSON.stringify(
    selector
  )}).style.display = "";
`;
      }

      case "ui_hide": {
        const selector =
          resolveSelector(
            get("element")
          );

        return `
  document.querySelector(${JSON.stringify(
    selector
  )}).style.display = "none";
`;
      }

      case "style_color": {
        const selector =
          resolveSelector(
            get("element")
          );

        return `
  document.querySelector(${JSON.stringify(
    selector
  )}).style.color = ${JSON.stringify(
    get("color")
  )};
`;
      }

      case "wait":
        return `
  await new Promise(resolve =>
    setTimeout(resolve, ${Number(
      get("seconds") || 0
    ) * 1000})
  );
`;

      case "condition":
        return `
  if (${get(
    "condition"
  )}) {
`;

      default:
        return "";
    }
  }

  function resolveSelector(
    value
  ) {
    if (!value) {
      return "";
    }

    const el =
      document.querySelector(
        `[data-id="${CSS.escape(
          value
        )}"]`
      );

    if (el?.id) {
      return `#${el.id}`;
    }

    return `[data-id="${value}"]`;
  }

  document.addEventListener(
    "click",
    event => {
      const add =
        event.target.closest(
          "[data-add-block]"
        );

      if (add) {
        const type =
          add.dataset.addBlock;

        if (!state.selectedScript) {
          createScript();
        }

        addBlock(
          state.selectedScript,
          type
        );

        save();
        return;
      }

      const del =
        event.target.closest(
          "[data-delete-block]"
        );

      if (del) {
        removeBlock(
          state.selectedScript,
          del.dataset.deleteBlock
        );

        save();
      }
    }
  );

  document.addEventListener(
    "input",
    event => {
      const input =
        event.target.closest(
          ".block-input"
        );

      if (!input) return;

      const block =
        state.selectedScript?.blocks
          .find(
            item =>
              item.id ===
              input.dataset.block
          );

      if (!block) return;

      setInput(
        block,
        input.dataset.input,
        input.value
      );
    }
  );

  document.addEventListener(
    "change",
    event => {
      const input =
        event.target.closest(
          ".block-input"
        );

      if (!input) return;

      const block =
        state.selectedScript?.blocks
          .find(
            item =>
              item.id ===
              input.dataset.block
          );

      if (!block) return;

      setInput(
        block,
        input.dataset.input,
        input.value
      );
    }
  );

  window.PluginDexBlocks = {
    BLOCKS,
    state,
    createScript,
    addBlock,
    removeBlock,
    render,
    save,
    load,
    generateJS
  };

  load();

  document.addEventListener(
    "DOMContentLoaded",
    render
  );
})();
