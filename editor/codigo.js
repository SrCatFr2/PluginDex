(() => {
  "use strict";

  let panel = null;

  function createPanel() {
    if (panel) return;

    panel =
      document.createElement("section");

    panel.id = "codeStudio";

    panel.innerHTML = `
      <div class="code-studio glass">

        <header class="code-studio-header">

          <div>
            <span class="code-kicker">
              LOGIC
            </span>

            <strong>
              Código
            </strong>
          </div>

          <div class="code-tabs">

            <button
              class="code-tab active"
              data-code-tab="blocks"
            >
              Bloques
            </button>

            <button
              class="code-tab"
              data-code-tab="javascript"
            >
              JavaScript
            </button>

          </div>

          <button
            class="code-close"
            data-code-close
          >
            ×
          </button>

        </header>

        <div
          class="code-content"
          data-code-view="blocks"
        >

          <aside class="block-library">

            <div class="library-title">
              BLOQUES
            </div>

            <button
              data-add-block="event_click"
              class="library-block event"
            >
              <span>Evento</span>
              Al hacer clic
            </button>

            <button
              data-add-block="event_start"
              class="library-block event"
            >
              <span>Evento</span>
              Al iniciar
            </button>

            <button
              data-add-block="ui_text"
              class="library-block ui"
            >
              <span>Interfaz</span>
              Cambiar texto
            </button>

            <button
              data-add-block="ui_show"
              class="library-block ui"
            >
              <span>Interfaz</span>
              Mostrar
            </button>

            <button
              data-add-block="ui_hide"
              class="library-block ui"
            >
              <span>Interfaz</span>
              Ocultar
            </button>

            <button
              data-add-block="style_color"
              class="library-block style"
            >
              <span>Estilo</span>
              Cambiar color
            </button>

            <button
              data-add-block="wait"
              class="library-block control"
            >
              <span>Control</span>
              Esperar
            </button>

            <button
              data-add-block="condition"
              class="library-block control"
            >
              <span>Control</span>
              Si
            </button>

          </aside>

          <main
            id="blockEditor"
            class="block-editor"
          ></main>

        </div>

        <div
          class="code-content code-source"
          data-code-view="javascript"
          hidden
        >
          <pre id="generatedCode"></pre>
        </div>

      </div>
    `;

    document.body.appendChild(
      panel
    );

    bind();
  }

  function open() {
    createPanel();

    panel.classList.add(
      "code-visible"
    );

    updateCode();
  }

  function close() {
    panel?.classList.remove(
      "code-visible"
    );
  }

  function updateCode() {
    const pre =
      panel?.querySelector(
        "#generatedCode"
      );

    if (!pre) return;

    const script =
      window.PluginDexBlocks
        ?.state.selectedScript;

    pre.textContent =
      window.PluginDexBlocks
        ?.generateJS(script) ||
      "// Todavía no hay código.";
  }

  function bind() {
    panel.addEventListener(
      "click",
      event => {
        if (
          event.target.closest(
            "[data-code-close]"
          )
        ) {
          close();
          return;
        }

        const tab =
          event.target.closest(
            "[data-code-tab]"
          );

        if (!tab) return;

        const mode =
          tab.dataset.codeTab;

        panel
          .querySelectorAll(
            "[data-code-tab]"
          )
          .forEach(button =>
            button.classList.toggle(
              "active",
              button === tab
            )
          );

        panel
          .querySelectorAll(
            "[data-code-view]"
          )
          .forEach(view => {
            view.hidden =
              view.dataset.codeView !==
              mode;
          });

        updateCode();
      }
    );
  }

  document.addEventListener(
    "click",
    event => {
      const button =
        event.target.closest(
          '[data-action="code"], [data-editor-mode="code"]'
        );

      if (!button) return;

      open();
    }
  );

  document.addEventListener(
    "plugindex:elementchange",
    updateCode
  );

  window.PluginDexCode = {
    open,
    close,
    updateCode
  };
})();
