/* ============================================================
   PLUGINDEX — SELECCIÓN
   editor/seleccion.js

   Sistema de selección tipo editor visual:
   - Un toque/click = seleccionar
   - Click fuera = quitar selección
   - Shift/Ctrl/Cmd = selección múltiple
   - No ejecuta botones mientras editamos
   - Delegación de eventos para evitar cientos de listeners
============================================================ */

(() => {

    "use strict";

    const ROOT_SELECTOR = ".page-element";

    const state = {
        selected: [],
        lastSelected: null
    };


    /* ============================================================
       UTILIDADES
    ============================================================ */

    function getRoot() {

        return (
            document.querySelector("#designPage") ||
            document.querySelector(".design-page") ||
            document.body
        );

    }


    function isElement(value) {

        return (
            value &&
            value.nodeType === 1 &&
            value.matches(ROOT_SELECTOR)
        );

    }


    function getElements() {

        const root = getRoot();

        if (!root) return [];

        return [
            ...root.querySelectorAll(ROOT_SELECTOR)
        ];

    }


    function getSelected() {

        return (
            state.selected[0] ||
            null
        );

    }


    function getSelectedAll() {

        return [
            ...state.selected
        ];

    }


    function isSelected(element) {

        return state.selected.includes(
            element
        );

    }


    /* ============================================================
       EVENTO
    ============================================================ */

    function emitSelection() {

        document.dispatchEvent(
            new CustomEvent(
                "plugindex:selectionchange",
                {
                    detail: {
                        element:
                            getSelected(),

                        elements:
                            getSelectedAll()
                    }
                }
            )
        );

    }


    /* ============================================================
       MARCADO VISUAL
    ============================================================ */

    function updateClasses() {

        getElements().forEach(
            element => {

                const selected =
                    isSelected(
                        element
                    );

                element.classList.toggle(
                    "editor-selected",
                    selected
                );

                element.classList.toggle(
                    "selected",
                    selected
                );

            }
        );

    }


    /* ============================================================
       SELECCIONAR
    ============================================================ */

    function select(
        element,
        options = {}
    ) {

        if (
            !isElement(element)
        ) {
            return;
        }


        const additive =
            Boolean(
                options.additive
            );


        if (additive) {

            if (
                isSelected(element)
            ) {

                state.selected =
                    state.selected.filter(
                        item =>
                            item !== element
                    );

            } else {

                state.selected.push(
                    element
                );

            }

        } else {

            state.selected = [
                element
            ];

        }


        state.lastSelected =
            element;


        updateClasses();

        emitSelection();

    }


    function clear() {

        if (
            state.selected.length === 0
        ) {
            return;
        }


        state.selected = [];

        state.lastSelected =
            null;


        updateClasses();

        emitSelection();

    }


    function toggle(
        element
    ) {

        select(
            element,
            {
                additive: true
            }
        );

    }


    /* ============================================================
       CLICK / POINTER
    ============================================================ */

    function setupPointer() {

        const root =
            getRoot();


        if (!root) {

            console.warn(
                "[PluginDex] designPage no encontrado para selección."
            );

            return;

        }


        root.addEventListener(
            "pointerdown",
            event => {

                /*
                 * El manipulador se encarga del movimiento.
                 *
                 * Aquí solamente resolvemos selección.
                 */

                if (
                    event.button !== undefined &&
                    event.button !== 0
                ) {
                    return;
                }


                /*
                 * Los handles pertenecen al manipulador.
                 */

                if (
                    event.target.closest(
                        ".editor-handle, .editor-rotation-handle"
                    )
                ) {

                    return;

                }


                const element =
                    event.target.closest(
                        ROOT_SELECTOR
                    );


                if (
                    !element ||
                    !root.contains(element)
                ) {

                    return;

                }


                const additive =
                    event.shiftKey ||
                    event.ctrlKey ||
                    event.metaKey;


                select(
                    element,
                    {
                        additive
                    }
                );


                /*
                 * MUY IMPORTANTE:
                 *
                 * No hacemos preventDefault aquí.
                 *
                 * El manipulador necesita recibir
                 * el pointerdown.
                 */

            },
            {
                passive: true
            }
        );


        /*
         * Click fuera.
         */

        document.addEventListener(
            "pointerdown",
            event => {

                if (
                    event.target.closest(
                        ROOT_SELECTOR
                    )
                ) {
                    return;
                }


                if (
                    event.target.closest(
                        ".window, .window-header, .tool-dock, .mobile-dock, .inspector"
                    )
                ) {
                    return;
                }


                clear();

            },
            {
                passive: true
            }
        );

    }


    /* ============================================================
       TECLADO
    ============================================================ */

    function setupKeyboard() {

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    clear();

                    return;

                }


                /*
                 * No procesar Delete aquí.
                 * app.js se encarga de borrar.
                 */

            }
        );

    }


    /* ============================================================
       REFRESH
    ============================================================ */

    function refresh() {

        const elements =
            getElements();


        state.selected =
            state.selected.filter(
                element =>
                    elements.includes(
                        element
                    )
            );


        updateClasses();

        emitSelection();

    }


    /* ============================================================
       API
    ============================================================ */

    window.PluginDexSelection = {

        select,

        clear,

        toggle,

        refresh,

        getSelected,

        getSelectedAll,

        isSelected

    };


    /* ============================================================
       INIT
    ============================================================ */

    function init() {

        setupPointer();

        setupKeyboard();

        refresh();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();

    }

})();
