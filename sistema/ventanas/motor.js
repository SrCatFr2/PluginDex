/* =========================================================
   PLUGINDEX
   MOTOR DE VENTANAS V2
   sistema/ventanas/motor.js
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURACIÓN
    ===================================================== */

    const STORAGE_KEY =
        "plugindex-window-layout-v2";

    const MOBILE_BREAKPOINT = 700;

    const MIN_WIDTH = 240;
    const MIN_HEIGHT = 150;

    const state = {

        container: null,

        windows: new Map(),

        zIndex: 100,

        active: null,

        mode: "desktop",

        resizeTimer: null,

        saveTimer: null,

        initialized: false

    };


    /* =====================================================
       UTILIDADES
    ===================================================== */

    function isMobile() {

        return (
            window.innerWidth <=
            MOBILE_BREAKPOINT
        );

    }


    function clamp(
        value,
        min,
        max
    ) {

        return Math.max(
            min,
            Math.min(max, value)
        );

    }


    function getContainer(
        element
    ) {

        return (
            element.closest(
                "[data-window-container]"
            ) ||
            state.container ||
            document.body
        );

    }


    function getStoredLayout() {

        try {

            const raw =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (!raw) {
                return {};
            }

            return JSON.parse(raw);

        } catch {

            return {};

        }

    }


    const savedLayout =
        getStoredLayout();


    /* =====================================================
       GUARDAR POSICIONES
    ===================================================== */

    function saveLayout() {

        clearTimeout(
            state.saveTimer
        );

        state.saveTimer =
            setTimeout(() => {

                const data = {};

                state.windows.forEach(
                    (item, id) => {

                        const element =
                            item.element;

                        if (
                            isMobile()
                        ) {
                            return;
                        }

                        data[id] = {

                            left:
                                parseFloat(
                                    element.style.left
                                ) || 0,

                            top:
                                parseFloat(
                                    element.style.top
                                ) || 0,

                            width:
                                element.offsetWidth,

                            height:
                                element.offsetHeight

                        };

                    }
                );


                try {

                    localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(data)
                    );

                } catch {}

            }, 250);

    }


    /* =====================================================
       Z-INDEX
    ===================================================== */

    function focusWindow(
        item
    ) {

        if (!item) {
            return;
        }


        state.zIndex++;


        item.element.style.zIndex =
            state.zIndex;


        state.windows.forEach(
            other => {

                other.element.classList.toggle(
                    "is-focused",
                    other === item
                );

            }
        );

    }


    /* =====================================================
       POSICIÓN INICIAL
    ===================================================== */

    function positionWindow(
        item
    ) {

        if (
            isMobile()
        ) {
            return;
        }


        const element =
            item.element;


        const container =
            getContainer(
                element
            );


        const containerRect =
            container.getBoundingClientRect();


        const saved =
            savedLayout[
                item.id
            ];


        /*
         * IMPORTANTE:
         *
         * Eliminamos right/bottom
         * para que left/top sean
         * los únicos responsables
         * de la posición.
         */

        element.style.right =
            "auto";

        element.style.bottom =
            "auto";


        let width =
            saved?.width ||
            element.offsetWidth ||
            300;


        let height =
            saved?.height ||
            element.offsetHeight ||
            300;


        width =
            clamp(
                width,
                MIN_WIDTH,
                Math.max(
                    MIN_WIDTH,
                    containerRect.width - 16
                )
            );


        height =
            clamp(
                height,
                MIN_HEIGHT,
                Math.max(
                    MIN_HEIGHT,
                    containerRect.height - 16
                )
            );


        let left =
            Number.isFinite(
                saved?.left
            )
                ? saved.left
                : null;


        let top =
            Number.isFinite(
                saved?.top
            )
                ? saved.top
                : null;


        /*
         * Si no hay posición guardada,
         * usamos la posición declarada
         * originalmente en CSS.
         */

        if (
            left === null
        ) {

            const computed =
                getComputedStyle(
                    element
                );


            const cssLeft =
                parseFloat(
                    computed.left
                );


            left =
                Number.isFinite(
                    cssLeft
                )
                    ? cssLeft
                    : 20;

        }


        if (
            top === null
        ) {

            const computed =
                getComputedStyle(
                    element
                );


            const cssTop =
                parseFloat(
                    computed.top
                );


            top =
                Number.isFinite(
                    cssTop
                )
                    ? cssTop
                    : 20;

        }


        left =
            clamp(
                left,
                8,
                Math.max(
                    8,
                    containerRect.width -
                    width -
                    8
                )
            );


        top =
            clamp(
                top,
                8,
                Math.max(
                    8,
                    containerRect.height -
                    height -
                    8
                )
            );


        element.style.width =
            `${width}px`;


        element.style.height =
            `${height}px`;


        element.style.left =
            `${left}px`;


        element.style.top =
            `${top}px`;

    }


    /* =====================================================
       REGISTRAR
    ===================================================== */

    function register(
        element
    ) {

        /*
         * SOLO ventanas reales.
         *
         * El toolDock también tiene
         * data-window="tools", pero
         * NO debe entrar aquí.
         */

        if (
            !element.classList.contains(
                "window"
            )
        ) {

            return null;

        }


        const id =
            element.dataset.window;


        if (!id) {
            return null;
        }


        if (
            state.windows.has(id)
        ) {

            return state.windows.get(
                id
            );

        }


        const item = {

            id,

            element,

            drag: null,

            resize: null

        };


        state.windows.set(
            id,
            item
        );


        element.classList.add(
            "window-ready"
        );


        /*
         * Posición inicial.
         */

        positionWindow(
            item
        );


        /*
         * Header.
         */

        const header =
            element.querySelector(
                "[data-window-drag]"
            );


        if (header) {

            setupDrag(
                item,
                header
            );

        }


        /*
         * Resize.
         */

        if (
            element.hasAttribute(
                "data-window-resizable"
            )
        ) {

            setupResize(
                item
            );

        }


        /*
         * Click dentro de ventana
         * = traer al frente.
         */

        element.addEventListener(
            "pointerdown",
            () => {

                focusWindow(
                    item
                );

            },
            {
                passive: true
            }
        );


        return item;

    }


    /* =====================================================
       REGISTRAR TODAS
    ===================================================== */

    function registerAll() {

        document
            .querySelectorAll(
                ".window[data-window]"
            )
            .forEach(
                register
            );

    }


    /* =====================================================
       DRAG
    ===================================================== */

    function setupDrag(
        item,
        header
    ) {


        header.addEventListener(
            "pointerdown",
            event => {

                /*
                 * No iniciar drag al tocar
                 * controles del header.
                 */

                if (
                    event.target.closest(
                        "button"
                    ) ||
                    event.target.closest(
                        "input"
                    ) ||
                    event.target.closest(
                        "select"
                    ) ||
                    event.target.closest(
                        "textarea"
                    )
                ) {

                    return;

                }


                if (
                    isMobile()
                ) {

                    startMobileDrag(
                        item,
                        event
                    );

                    return;

                }


                startDesktopDrag(
                    item,
                    event
                );

            }
        );


        header.addEventListener(
            "pointermove",
            event => {

                if (
                    !state.active
                ) {

                    return;

                }


                if (
                    state.active.item !==
                    item
                ) {

                    return;

                }


                if (
                    state.active.type ===
                    "drag"
                ) {

                    moveDesktopDrag(
                        event
                    );

                }


                if (
                    state.active.type ===
                    "sheet"
                ) {

                    moveMobileDrag(
                        event
                    );

                }

            }
        );


        header.addEventListener(
            "pointerup",
            finishPointer
        );


        header.addEventListener(
            "pointercancel",
            cancelPointer
        );

    }


    /* =====================================================
       DESKTOP DRAG START
    ===================================================== */

    function startDesktopDrag(
        item,
        event
    ) {

        const element =
            item.element;


        if (
            element.classList.contains(
                "is-maximized"
            )
        ) {

            return;

        }


        const container =
            getContainer(
                element
            );


        const containerRect =
            container.getBoundingClientRect();


        const elementRect =
            element.getBoundingClientRect();


        const left =
            parseFloat(
                element.style.left
            ) ||
            (
                elementRect.left -
                containerRect.left
            );


        const top =
            parseFloat(
                element.style.top
            ) ||
            (
                elementRect.top -
                containerRect.top
            );


        state.active = {

            type: "drag",

            item,

            pointerId:
                event.pointerId,

            startX:
                event.clientX,

            startY:
                event.clientY,

            startLeft:
                left,

            startTop:
                top

        };


        focusWindow(
            item
        );


        element.classList.add(
            "is-dragging"
        );


        /*
         * Capturamos el puntero
         * directamente en el header.
         */

        try {

            event.currentTarget.setPointerCapture(
                event.pointerId
            );

        } catch {}


        event.preventDefault();

    }


    /* =====================================================
       DESKTOP DRAG MOVE
    ===================================================== */

    function moveDesktopDrag(
        event
    ) {

        const active =
            state.active;


        if (
            !active ||
            active.type !==
            "drag"
        ) {

            return;

        }


        if (
            active.pointerId !==
            event.pointerId
        ) {

            return;

        }


        const element =
            active.item.element;


        const container =
            getContainer(
                element
            );


        const rect =
            container.getBoundingClientRect();


        const width =
            element.offsetWidth;


        const height =
            element.offsetHeight;


        let left =
            active.startLeft +
            (
                event.clientX -
                active.startX
            );


        let top =
            active.startTop +
            (
                event.clientY -
                active.startY
            );


        left =
            clamp(
                left,
                8,
                Math.max(
                    8,
                    rect.width -
                    width -
                    8
                )
            );


        top =
            clamp(
                top,
                8,
                Math.max(
                    8,
                    rect.height -
                    height -
                    8
                )
            );


        element.style.left =
            `${left}px`;


        element.style.top =
            `${top}px`;

    }


    /* =====================================================
       RESIZE
    ===================================================== */

    function setupResize(
        item
    ) {

        const element =
            item.element;


        /*
         * Si ya existen handles,
         * no creamos otros.
         */

        if (
            element.querySelector(
                ".window-resize-handle"
            )
        ) {

            return;

        }


        const directions = [

            "n",
            "e",
            "s",
            "w",

            "ne",
            "se",
            "sw",
            "nw"

        ];


        directions.forEach(
            direction => {

                const handle =
                    document.createElement(
                        "span"
                    );


                handle.className =
                    "window-resize-handle " +
                    `window-resize-${direction}`;


                handle.dataset.resizeDirection =
                    direction;


                handle.setAttribute(
                    "aria-hidden",
                    "true"
                );


                element.appendChild(
                    handle
                );


                handle.addEventListener(
                    "pointerdown",
                    event => {

                        startResize(
                            item,
                            direction,
                            event
                        );

                    }
                );


                handle.addEventListener(
                    "pointermove",
                    moveResize
                );


                handle.addEventListener(
                    "pointerup",
                    finishPointer
                );


                handle.addEventListener(
                    "pointercancel",
                    cancelPointer
                );

            }
        );

    }


    /* =====================================================
       RESIZE START
    ===================================================== */

    function startResize(
        item,
        direction,
        event
    ) {

        if (
            isMobile()
        ) {

            return;

        }


        const element =
            item.element;


        if (
            element.classList.contains(
                "is-maximized"
            )
        ) {

            return;

        }


        const container =
            getContainer(
                element
            );


        const containerRect =
            container.getBoundingClientRect();


        const rect =
            element.getBoundingClientRect();


        state.active = {

            type: "resize",

            item,

            pointerId:
                event.pointerId,

            direction,

            startX:
                event.clientX,

            startY:
                event.clientY,

            left:
                rect.left -
                containerRect.left,

            top:
                rect.top -
                containerRect.top,

            width:
                rect.width,

            height:
                rect.height

        };


        focusWindow(
            item
        );


        element.classList.add(
            "is-resizing"
        );


        try {

            event.currentTarget.setPointerCapture(
                event.pointerId
            );

        } catch {}


        event.preventDefault();

        event.stopPropagation();

    }


    /* =====================================================
       RESIZE MOVE
    ===================================================== */

    function moveResize(
        event
    ) {

        const active =
            state.active;


        if (
            !active ||
            active.type !==
            "resize"
        ) {

            return;

        }


        if (
            active.pointerId !==
            event.pointerId
        ) {

            return;

        }


        const element =
            active.item.element;


        const container =
            getContainer(
                element
            );


        const containerRect =
            container.getBoundingClientRect();


        const dx =
            event.clientX -
            active.startX;


        const dy =
            event.clientY -
            active.startY;


        let left =
            active.left;


        let top =
            active.top;


        let width =
            active.width;


        let height =
            active.height;


        const direction =
            active.direction;


        if (
            direction.includes("e")
        ) {

            width =
                active.width +
                dx;

        }


        if (
            direction.includes("s")
        ) {

            height =
                active.height +
                dy;

        }


        if (
            direction.includes("w")
        ) {

            width =
                active.width -
                dx;

            left =
                active.left +
                dx;

        }


        if (
            direction.includes("n")
        ) {

            height =
                active.height -
                dy;

            top =
                active.top +
                dy;

        }


        if (
            width <
            MIN_WIDTH
        ) {

            if (
                direction.includes("w")
            ) {

                left =
                    active.left +
                    active.width -
                    MIN_WIDTH;

            }

            width =
                MIN_WIDTH;

        }


        if (
            height <
            MIN_HEIGHT
        ) {

            if (
                direction.includes("n")
            ) {

                top =
                    active.top +
                    active.height -
                    MIN_HEIGHT;

            }

            height =
                MIN_HEIGHT;

        }


        /*
         * Límites del workspace.
         */

        left =
            clamp(
                left,
                8,
                containerRect.width -
                width -
                8
            );


        top =
            clamp(
                top,
                8,
                containerRect.height -
                height -
                8
            );


        width =
            Math.min(
                width,
                containerRect.width -
                left -
                8
            );


        height =
            Math.min(
                height,
                containerRect.height -
                top -
                8
            );


        element.style.left =
            `${left}px`;


        element.style.top =
            `${top}px`;


        element.style.width =
            `${Math.max(
                MIN_WIDTH,
                width
            )}px`;


        element.style.height =
            `${Math.max(
                MIN_HEIGHT,
                height
            )}px`;

    }


    /* =====================================================
       MOBILE SHEET
    ===================================================== */

    function startMobileDrag(
        item,
        event
    ) {

        const element =
            item.element;


        const computed =
            getComputedStyle(
                element
            );


        const current =
            parseFloat(
                computed.getPropertyValue(
                    "--sheet-y"
                )
            ) || 0;


        state.active = {

            type: "sheet",

            item,

            pointerId:
                event.pointerId,

            startY:
                event.clientY,

            startSheetY:
                current

        };


        focusWindow(
            item
        );


        element.classList.add(
            "is-dragging"
        );


        try {

            event.currentTarget.setPointerCapture(
                event.pointerId
            );

        } catch {}


        event.preventDefault();

    }


    function moveMobileDrag(
        event
    ) {

        const active =
            state.active;


        if (
            !active ||
            active.type !==
            "sheet"
        ) {

            return;

        }


        const element =
            active.item.element;


        const delta =
            event.clientY -
            active.startY;


        const height =
            element.offsetHeight ||
            500;


        let y =
            active.startSheetY +
            delta;


        y =
            clamp(
                y,
                -50,
                height * 0.75
            );


        element.style.setProperty(
            "--sheet-y",
            `${y}px`
        );

    }


    /* =====================================================
       POINTER END
    ===================================================== */

    function finishPointer(
        event
    ) {

        const active =
            state.active;


        if (!active) {
            return;
        }


        if (
            active.pointerId !==
            event.pointerId
        ) {

            return;

        }


        const element =
            active.item.element;


        element.classList.remove(
            "is-dragging",
            "is-resizing"
        );


        if (
            active.type ===
            "sheet"
        ) {

            finishSheet(
                active
            );

        }


        try {

            event.currentTarget.releasePointerCapture(
                event.pointerId
            );

        } catch {}


        state.active =
            null;


        saveLayout();

    }


    function cancelPointer(
        event
    ) {

        const active =
            state.active;


        if (!active) {
            return;
        }


        active.item.element.classList.remove(
            "is-dragging",
            "is-resizing"
        );


        state.active =
            null;

    }


    /* =====================================================
       MOBILE SHEET SNAP
    ===================================================== */

    function finishSheet(
        active
    ) {

        const element =
            active.item.element;


        const height =
            element.offsetHeight ||
            500;


        const current =
            parseFloat(
                getComputedStyle(
                    element
                ).getPropertyValue(
                    "--sheet-y"
                )
            ) || 0;


        /*
         * Deslizar suficientemente hacia
         * abajo = cerrar.
         */

        if (
            current >
            height * 0.30
        ) {

            closeWindow(
                active.item.id
            );

            return;

        }


        /*
         * Posición intermedia.
         */

        if (
            current >
            height * 0.10
        ) {

            element.style.setProperty(
                "--sheet-y",
                `${Math.round(
                    height * 0.42
                )}px`
            );

            return;

        }


        /*
         * Posición completa.
         */

        element.style.setProperty(
            "--sheet-y",
            "0px"
        );

    }


    /* =====================================================
       ABRIR
    ===================================================== */

    function openWindow(
        id
    ) {

        const item =
            state.windows.get(
                id
            );


        if (!item) {

            console.warn(
                `[PluginDex] Ventana no encontrada: ${id}`
            );

            return;

        }


        const element =
            item.element;


        element.classList.add(
            "is-open"
        );


        /*
         * Compatibilidad con inspector
         * del app.js.
         */

        if (
            id ===
            "inspector"
        ) {

            element.classList.add(
                "visible"
            );

        }


        /*
         * Desktop:
         * aseguramos posición.
         */

        if (
            !isMobile()
        ) {

            positionWindow(
                item
            );

        }


        /*
         * Mobile:
         * subir completamente.
         */

        if (
            isMobile()
        ) {

            element.style.setProperty(
                "--sheet-y",
                "0px"
            );

        }


        focusWindow(
            item
        );

    }


    /* =====================================================
       CERRAR
    ===================================================== */

    function closeWindow(
        id
    ) {

        const item =
            state.windows.get(
                id
            );


        if (!item) {
            return;
        }


        item.element.classList.remove(
            "is-open"
        );


        if (
            id ===
            "inspector"
        ) {

            item.element.classList.remove(
                "visible"
            );

        }


        if (
            state.active?.item ===
            item
        ) {

            state.active =
                null;

        }

    }


    /* =====================================================
       MINIMIZAR
    ===================================================== */

    function minimizeWindow(
        id
    ) {

        const item =
            state.windows.get(
                id
            );


        if (!item) {
            return;
        }


        item.element.classList.toggle(
            "is-minimized"
        );


        focusWindow(
            item
        );


        saveLayout();

    }


    /* =====================================================
       MAXIMIZAR
    ===================================================== */

    function maximizeWindow(
        id
    ) {

        const item =
            state.windows.get(
                id
            );


        if (!item) {
            return;
        }


        const element =
            item.element;


        /*
         * En móvil simplemente
         * expandimos el sheet.
         */

        if (
            isMobile()
        ) {

            element.classList.toggle(
                "is-maximized"
            );


            element.style.setProperty(
                "--sheet-y",
                "0px"
            );


            return;

        }


        /*
         * Guardamos estado anterior.
         */

        if (
            !element.classList.contains(
                "is-maximized"
            )
        ) {

            item.previous = {

                left:
                    element.style.left,

                top:
                    element.style.top,

                width:
                    element.style.width,

                height:
                    element.style.height

            };


            element.classList.add(
                "is-maximized"
            );


            element.style.right =
                "auto";


            element.style.bottom =
                "auto";


            element.style.left =
                "12px";


            element.style.top =
                "12px";


            element.style.width =
                "calc(100% - 24px)";


            element.style.height =
                "calc(100% - 24px)";

        }

        else {

            element.classList.remove(
                "is-maximized"
            );


            if (
                item.previous
            ) {

                element.style.left =
                    item.previous.left;

                element.style.top =
                    item.previous.top;

                element.style.width =
                    item.previous.width;

                element.style.height =
                    item.previous.height;

            }


            item.previous =
                null;

        }


        focusWindow(
            item
        );


        saveLayout();

    }


    /* =====================================================
       BOTONES
    ===================================================== */

    function setupButtons() {

        document.addEventListener(
            "click",
            event => {

                const open =
                    event.target.closest(
                        "[data-window-open]"
                    );


                if (open) {

                    event.preventDefault();
                    event.stopPropagation();

                    openWindow(
                        open.dataset.windowOpen
                    );

                    return;

                }


                const close =
                    event.target.closest(
                        "[data-window-close]"
                    );


                if (close) {

                    event.preventDefault();
                    event.stopPropagation();

                    const windowElement =
                        close.closest(
                            ".window"
                        );


                    if (
                        windowElement
                    ) {

                        closeWindow(
                            windowElement.dataset.window
                        );

                    }

                    return;

                }


                const minimize =
                    event.target.closest(
                        "[data-window-minimize]"
                    );


                if (minimize) {

                    event.preventDefault();
                    event.stopPropagation();

                    const windowElement =
                        minimize.closest(
                            ".window"
                        );


                    if (
                        windowElement
                    ) {

                        minimizeWindow(
                            windowElement.dataset.window
                        );

                    }

                    return;

                }


                const maximize =
                    event.target.closest(
                        "[data-window-maximize]"
                    );


                if (maximize) {

                    event.preventDefault();
                    event.stopPropagation();

                    const windowElement =
                        maximize.closest(
                            ".window"
                        );


                    if (
                        windowElement
                    ) {

                        maximizeWindow(
                            windowElement.dataset.window
                        );

                    }

                }

            }
        );

    }


    /* =====================================================
       ESCAPE
    ===================================================== */

    function setupKeyboard() {

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !==
                    "Escape"
                ) {

                    return;

                }


                const opened =
                    [
                        ...state.windows.values()
                    ]
                    .filter(
                        item =>
                            item.element.classList.contains(
                                "is-open"
                            ) ||
                            item.element.classList.contains(
                                "visible"
                            )
                    )
                    .sort(
                        (a, b) =>
                            Number(
                                b.element.style.zIndex ||
                                0
                            ) -
                            Number(
                                a.element.style.zIndex ||
                                0
                            )
                    );


                const top =
                    opened[0];


                if (
                    top
                ) {

                    closeWindow(
                        top.id
                    );

                }

            }
        );

    }


    /* =====================================================
       RESPONSIVE
    ===================================================== */

    function updateResponsive() {

        const nextMode =
            isMobile()
                ? "mobile"
                : "desktop";


        if (
            nextMode ===
            state.mode
        ) {

            return;

        }


        state.mode =
            nextMode;


        state.windows.forEach(
            item => {

                const element =
                    item.element;


                if (
                    nextMode ===
                    "mobile"
                ) {

                    element.style.removeProperty(
                        "left"
                    );

                    element.style.removeProperty(
                        "right"
                    );

                    element.style.removeProperty(
                        "top"
                    );

                    element.style.removeProperty(
                        "bottom"
                    );

                    element.style.removeProperty(
                        "width"
                    );

                    element.style.removeProperty(
                        "height"
                    );


                    element.style.setProperty(
                        "--sheet-y",
                        "0px"
                    );

                }

                else {

                    positionWindow(
                        item
                    );

                }

            }
        );

    }


    /* =====================================================
       RESET
    ===================================================== */

    function reset() {

        try {

            localStorage.removeItem(
                STORAGE_KEY
            );

        } catch {}


        state.windows.forEach(
            item => {

                const element =
                    item.element;


                element.classList.remove(
                    "is-open",
                    "is-focused",
                    "is-minimized",
                    "is-maximized"
                );


                if (
                    item.id ===
                    "inspector"
                ) {

                    element.classList.remove(
                        "visible"
                    );

                }


                element.style.removeProperty(
                    "left"
                );

                element.style.removeProperty(
                    "top"
                );

                element.style.removeProperty(
                    "right"
                );

                element.style.removeProperty(
                    "bottom"
                );

                element.style.removeProperty(
                    "width"
                );

                element.style.removeProperty(
                    "height"
                );


                positionWindow(
                    item
                );

            }
        );

    }


    /* =====================================================
       INIT
    ===================================================== */

    function init(
        options = {}
    ) {

        if (
            state.initialized
        ) {

            return;

        }


        state.initialized =
            true;


        state.container =
            options.container ||
            document.querySelector(
                "[data-window-container]"
            ) ||
            document.querySelector(
                ".workspace"
            );


        state.mode =
            isMobile()
                ? "mobile"
                : "desktop";


        /*
         * SOLO .window reales.
         *
         * Esto evita romper
         * toolDock.
         */

        registerAll();


        setupButtons();

        setupKeyboard();


        /*
         * Responsive.
         */

        window.addEventListener(
            "resize",
            () => {

                clearTimeout(
                    state.resizeTimer
                );


                state.resizeTimer =
                    setTimeout(
                        () => {

                            updateResponsive();

                        },
                        100
                    );

            },
            {
                passive: true
            }
        );


        /*
         * Si una ventana ya estaba
         * visible al iniciar.
         */

        state.windows.forEach(
            item => {

                if (
                    item.element.classList.contains(
                        "visible"
                    ) ||
                    item.element.classList.contains(
                        "is-open"
                    )
                ) {

                    focusWindow(
                        item
                    );

                }

            }
        );


        console.log(
            "[PluginDex] Window Engine V2 activo."
        );

    }


    /* =====================================================
       API
    ===================================================== */

    window.PluginDexWindows = {

        init,

        open:
            openWindow,

        close:
            closeWindow,

        minimize:
            minimizeWindow,

        maximize:
            maximizeWindow,

        focus(id) {

            const item =
                state.windows.get(
                    id
                );


            if (item) {

                focusWindow(
                    item
                );

            }

        },

        reset,

        get(id) {

            return (
                state.windows.get(
                    id
                )?.element ||
                null
            );

        },

        getState() {

            return {

                mode:
                    state.mode,

                windows:
                    [
                        ...state.windows.keys()
                    ],

                active:
                    state.active?.item?.id ||
                    null

            };

        }

    };

})();
