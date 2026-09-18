(() => {
    "use strict";

    const STORAGE_KEY = "plugindex-window-layout-v1";
    const MOBILE_BREAKPOINT = 760;

    const MIN_WIDTH = 240;
    const MIN_HEIGHT = 150;

    const state = {
        container: null,
        windows: new Map(),
        zIndex: 100,
        active: null,
        mode: "__boot__",
        saveTimer: 0,
        resizeTimer: 0
    };

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        [...root.querySelectorAll(selector)];

    function isMobile() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function loadLayout() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    const layout = loadLayout();

    function saveLayout() {
        clearTimeout(state.saveTimer);

        state.saveTimer = setTimeout(() => {
            const data = {};

            state.windows.forEach((item, id) => {
                const element = item.element;

                const rect = element.getBoundingClientRect();

                data[id] = {
                    left: parseFloat(element.style.left) || 0,
                    top: parseFloat(element.style.top) || 0,
                    width: rect.width,
                    height: rect.height,

                    minimized:
                        element.classList.contains(
                            "is-minimized"
                        ),

                    maximized:
                        element.classList.contains(
                            "is-maximized"
                        )
                };
            });

            try {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(data)
                );
            } catch {}
        }, 180);
    }

    function getContainer(element) {
        return (
            element.closest(
                "[data-window-container]"
            ) ||
            state.container ||
            document.body
        );
    }

    function focusWindow(item) {
        if (!item) return;

        state.zIndex += 1;

        item.element.style.zIndex =
            state.zIndex;

        state.windows.forEach(other => {
            other.element.classList.toggle(
                "is-focused",
                other === item
            );
        });
    }

    function getStored(id) {
        return layout[id] || null;
    }

    function setupInitialPosition(item) {
        const element = item.element;

        if (isMobile()) {
            return;
        }

        const container =
            getContainer(element);

        const containerRect =
            container.getBoundingClientRect();

        const stored =
            getStored(item.id);

        const currentRect =
            element.getBoundingClientRect();

        let width =
            stored?.width ||
            currentRect.width ||
            340;

        let height =
            stored?.height ||
            currentRect.height ||
            360;

        width = clamp(
            width,
            MIN_WIDTH,
            Math.max(
                MIN_WIDTH,
                containerRect.width - 16
            )
        );

        height = clamp(
            height,
            MIN_HEIGHT,
            Math.max(
                MIN_HEIGHT,
                containerRect.height - 16
            )
        );

        let left = stored?.left;
        let top = stored?.top;

        if (!Number.isFinite(left)) {
            left =
                containerRect.width -
                width -
                24;
        }

        if (!Number.isFinite(top)) {
            top = 76;
        }

        left = clamp(
            left,
            8,
            Math.max(
                8,
                containerRect.width -
                width -
                8
            )
        );

        top = clamp(
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

        if (stored?.minimized) {
            element.classList.add(
                "is-minimized"
            );
        }

        if (stored?.maximized) {
            element.classList.add(
                "is-maximized"
            );
        }
    }

    function openWindow(id) {
        const item =
            state.windows.get(id);

        if (!item) {
            console.warn(
                `[PluginDex] Ventana "${id}" no encontrada.`
            );

            return;
        }

        item.element.classList.add(
            "is-open"
        );

        /*
         * El inspector antiguo de PluginDex
         * utiliza .visible.
         */
        if (id === "inspector") {
            item.element.classList.add(
                "visible"
            );
        }

        focusWindow(item);

        if (isMobile()) {
            item.element.style.setProperty(
                "--sheet-y",
                "0px"
            );
        }

        saveLayout();
    }

    function closeWindow(id) {
        const item =
            state.windows.get(id);

        if (!item) return;

        item.element.classList.remove(
            "is-open",
            "is-focused",
            "is-minimized",
            "is-maximized"
        );

        if (id === "inspector") {
            item.element.classList.remove(
                "visible"
            );
        }

        if (
            state.active &&
            state.active.item === item
        ) {
            state.active = null;
        }

        saveLayout();
    }

    function toggleMinimize(item) {
        if (!item) return;

        item.element.classList.toggle(
            "is-minimized"
        );

        focusWindow(item);

        saveLayout();
    }

    function toggleMaximize(item) {
        if (!item) return;

        const element = item.element;

        /*
         * En móvil maximizar significa
         * expandir el bottom sheet.
         */
        if (isMobile()) {
            element.classList.toggle(
                "is-maximized"
            );

            element.style.setProperty(
                "--sheet-y",
                "0px"
            );

            focusWindow(item);

            return;
        }

        if (
            !element.classList.contains(
                "is-maximized"
            )
        ) {
            item.previous = {
                left: element.style.left,
                top: element.style.top,
                width: element.style.width,
                height: element.style.height
            };

            element.classList.add(
                "is-maximized"
            );

            element.style.left =
                "12px";

            element.style.top =
                "12px";

            element.style.width =
                "calc(100% - 24px)";

            element.style.height =
                "calc(100% - 24px)";
        } else {
            element.classList.remove(
                "is-maximized"
            );

            if (item.previous) {
                element.style.left =
                    item.previous.left;

                element.style.top =
                    item.previous.top;

                element.style.width =
                    item.previous.width;

                element.style.height =
                    item.previous.height;
            }

            item.previous = null;
        }

        focusWindow(item);

        saveLayout();
    }

    /*
     * ================================
     * DRAG DESKTOP
     * ================================
     */

    function beginDrag(event, item) {
        if (isMobile()) {
            beginSheetDrag(event, item);
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

        const target =
            event.target;

        if (
            target.closest("button") ||
            target.closest("input") ||
            target.closest("select") ||
            target.closest("textarea") ||
            target.closest("[data-no-window-drag]")
        ) {
            return;
        }

        const container =
            getContainer(element);

        const containerRect =
            container.getBoundingClientRect();

        const elementRect =
            element.getBoundingClientRect();

        const startLeft =
            parseFloat(
                element.style.left
            ) ||
            (
                elementRect.left -
                containerRect.left
            );

        const startTop =
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
            pointerId: event.pointerId,

            startX: event.clientX,
            startY: event.clientY,

            startLeft,
            startTop
        };

        focusWindow(item);

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

    function updateDrag(event) {
        const active =
            state.active;

        if (
            !active ||
            active.type !== "drag" ||
            active.pointerId !== event.pointerId
        ) {
            return;
        }

        const item =
            active.item;

        const element =
            item.element;

        const container =
            getContainer(element);

        const containerRect =
            container.getBoundingClientRect();

        const width =
            element.offsetWidth;

        const height =
            element.offsetHeight;

        const left =
            clamp(
                active.startLeft +
                (
                    event.clientX -
                    active.startX
                ),

                8,

                Math.max(
                    8,
                    containerRect.width -
                    width -
                    8
                )
            );

        const top =
            clamp(
                active.startTop +
                (
                    event.clientY -
                    active.startY
                ),

                8,

                Math.max(
                    8,
                    containerRect.height -
                    height -
                    8
                )
            );

        element.style.left =
            `${left}px`;

        element.style.top =
            `${top}px`;
    }

    /*
     * ================================
     * RESIZE DESKTOP
     * ================================
     */

    function beginResize(
        event,
        item,
        handle
    ) {
        if (isMobile()) return;

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
            getContainer(element);

        const containerRect =
            container.getBoundingClientRect();

        const rect =
            element.getBoundingClientRect();

        state.active = {
            type: "resize",

            item,

            handle,

            pointerId:
                event.pointerId,

            startX:
                event.clientX,

            startY:
                event.clientY,

            startLeft:
                rect.left -
                containerRect.left,

            startTop:
                rect.top -
                containerRect.top,

            startWidth:
                rect.width,

            startHeight:
                rect.height
        };

        focusWindow(item);

        element.classList.add(
            "is-resizing"
        );

        try {
            handle.setPointerCapture(
                event.pointerId
            );
        } catch {}

        event.preventDefault();
        event.stopPropagation();
    }

    function updateResize(event) {
        const active =
            state.active;

        if (
            !active ||
            active.type !== "resize" ||
            active.pointerId !== event.pointerId
        ) {
            return;
        }

        const item =
            active.item;

        const element =
            item.element;

        const container =
            getContainer(element);

        const containerRect =
            container.getBoundingClientRect();

        const dx =
            event.clientX -
            active.startX;

        const dy =
            event.clientY -
            active.startY;

        let left =
            active.startLeft;

        let top =
            active.startTop;

        let width =
            active.startWidth;

        let height =
            active.startHeight;

        const west =
            active.handle.includes("w");

        const east =
            active.handle.includes("e");

        const north =
            active.handle.includes("n");

        const south =
            active.handle.includes("s");

        if (east) {
            width =
                active.startWidth +
                dx;
        }

        if (south) {
            height =
                active.startHeight +
                dy;
        }

        if (west) {
            width =
                active.startWidth -
                dx;

            left =
                active.startLeft +
                dx;
        }

        if (north) {
            height =
                active.startHeight -
                dy;

            top =
                active.startTop +
                dy;
        }

        if (width < MIN_WIDTH) {
            if (west) {
                left =
                    active.startLeft +
                    active.startWidth -
                    MIN_WIDTH;
            }

            width =
                MIN_WIDTH;
        }

        if (height < MIN_HEIGHT) {
            if (north) {
                top =
                    active.startTop +
                    active.startHeight -
                    MIN_HEIGHT;
            }

            height =
                MIN_HEIGHT;
        }

        if (left < 8) {
            width +=
                left - 8;

            left = 8;
        }

        if (top < 8) {
            height +=
                top - 8;

            top = 8;
        }

        if (
            left + width >
            containerRect.width - 8
        ) {
            width =
                containerRect.width -
                8 -
                left;
        }

        if (
            top + height >
            containerRect.height - 8
        ) {
            height =
                containerRect.height -
                8 -
                top;
        }

        width =
            Math.max(
                MIN_WIDTH,
                width
            );

        height =
            Math.max(
                MIN_HEIGHT,
                height
            );

        element.style.left =
            `${left}px`;

        element.style.top =
            `${top}px`;

        element.style.width =
            `${width}px`;

        element.style.height =
            `${height}px`;
    }

    /*
     * ================================
     * MOBILE SHEET
     * ================================
     */

    function beginSheetDrag(
        event,
        item
    ) {
        const element =
            item.element;

        const header =
            event.currentTarget;

        if (
            event.target.closest("button") ||
            event.target.closest("input") ||
            event.target.closest("select") ||
            event.target.closest("textarea")
        ) {
            return;
        }

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

        focusWindow(item);

        element.classList.add(
            "is-dragging"
        );

        try {
            header.setPointerCapture(
                event.pointerId
            );
        } catch {}

        event.preventDefault();
    }

    function updateSheet(event) {
        const active =
            state.active;

        if (
            !active ||
            active.type !== "sheet" ||
            active.pointerId !== event.pointerId
        ) {
            return;
        }

        const element =
            active.item.element;

        const height =
            element.offsetHeight ||
            window.innerHeight * 0.7;

        const delta =
            event.clientY -
            active.startY;

        let y =
            active.startSheetY +
            delta;

        y =
            clamp(
                y,
                -70,
                height * 0.72
            );

        element.style.setProperty(
            "--sheet-y",
            `${y}px`
        );
    }

    /*
     * ================================
     * FINALIZAR POINTER
     * ================================
     */

    function finishPointer(event) {
        const active =
            state.active;

        if (!active) return;

        if (
            active.pointerId !==
            event.pointerId
        ) {
            return;
        }

        active.item.element.classList.remove(
            "is-dragging",
            "is-resizing"
        );

        try {
            event.currentTarget.releasePointerCapture(
                event.pointerId
            );
        } catch {}

        if (
            active.type === "drag" ||
            active.type === "resize"
        ) {
            state.active = null;
            saveLayout();
        }
    }

    /*
     * ================================
     * FINALIZAR SHEET
     * ================================
     */

    function finishSheet(event) {
        const active =
            state.active;

        if (
            !active ||
            active.type !== "sheet"
        ) {
            return;
        }

        if (
            active.pointerId !==
            event.pointerId
        ) {
            return;
        }

        const item =
            active.item;

        const element =
            item.element;

        const y =
            parseFloat(
                getComputedStyle(
                    element
                ).getPropertyValue(
                    "--sheet-y"
                )
            ) || 0;

        const height =
            element.offsetHeight ||
            window.innerHeight * 0.7;

        element.classList.remove(
            "is-dragging"
        );

        /*
         * Si bajó demasiado,
         * cerrar ventana.
         */
        if (
            y >
            height * 0.28
        ) {
            closeWindow(
                item.id
            );
        }

        /*
         * Posición intermedia.
         */
        else if (
            y >
            height * 0.10
        ) {
            element.style.setProperty(
                "--sheet-y",
                `${Math.round(
                    height * 0.42
                )}px`
            );
        }

        /*
         * Posición completa.
         */
        else {
            element.style.setProperty(
                "--sheet-y",
                "0px"
            );
        }

        state.active = null;

        saveLayout();
    }

    /*
     * ================================
     * RESIZE HANDLES
     * ================================
     */

    function createResizeHandles(item) {
        const element =
            item.element;

        if (
            !element.hasAttribute(
                "data-window-resizable"
            )
        ) {
            return;
        }

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

        directions.forEach(direction => {
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
                    beginResize(
                        event,
                        item,
                        direction
                    );
                }
            );

            handle.addEventListener(
                "pointermove",
                updateResize
            );

            handle.addEventListener(
                "pointerup",
                finishPointer
            );

            handle.addEventListener(
                "pointercancel",
                finishPointer
            );
        });
    }

    /*
     * ================================
     * REGISTRAR VENTANA
     * ================================
     */

    function register(element) {
        const id =
            element.dataset.window;

        if (!id) return null;

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
            previous: null
        };

        state.windows.set(
            id,
            item
        );

        element.classList.add(
            "window-ready"
        );

        createResizeHandles(
            item
        );

        element.addEventListener(
            "pointerdown",
            () => {
                focusWindow(item);
            },
            { passive: true }
        );

        const header =
            element.querySelector(
                "[data-window-drag]"
            );

        if (header) {
            header.addEventListener(
                "pointerdown",
                event => {
                    beginDrag(
                        event,
                        item
                    );
                }
            );

            header.addEventListener(
                "pointermove",
                event => {
                    updateDrag(event);
                    updateSheet(event);
                }
            );

            header.addEventListener(
                "pointerup",
                event => {
                    finishPointer(event);
                    finishSheet(event);
                }
            );

            header.addEventListener(
                "pointercancel",
                event => {
                    finishPointer(event);
                    finishSheet(event);
                }
            );
        }

        return item;
    }

    function registerAll() {
        $$("[data-window]")
            .forEach(register);
    }

    /*
     * ================================
     * EVENTOS GLOBALES
     * ================================
     */

    function setupDelegation() {
        document.addEventListener(
            "click",
            event => {

                /*
                 * ABRIR
                 */
                const open =
                    event.target.closest(
                        "[data-window-open]"
                    );

                if (open) {
                    event.preventDefault();

                    openWindow(
                        open.dataset.windowOpen
                    );

                    return;
                }

                /*
                 * CERRAR
                 */
                const close =
                    event.target.closest(
                        "[data-window-close]"
                    );

                if (close) {
                    event.preventDefault();

                    const element =
                        close.closest(
                            "[data-window]"
                        );

                    if (element) {
                        closeWindow(
                            element.dataset.window
                        );
                    }

                    return;
                }

                /*
                 * MINIMIZAR
                 */
                const minimize =
                    event.target.closest(
                        "[data-window-minimize]"
                    );

                if (minimize) {
                    event.preventDefault();

                    const element =
                        minimize.closest(
                            "[data-window]"
                        );

                    if (element) {
                        const item =
                            state.windows.get(
                                element.dataset.window
                            );

                        if (item) {
                            toggleMinimize(
                                item
                            );
                        }
                    }

                    return;
                }

                /*
                 * MAXIMIZAR
                 */
                const maximize =
                    event.target.closest(
                        "[data-window-maximize]"
                    );

                if (maximize) {
                    event.preventDefault();

                    const element =
                        maximize.closest(
                            "[data-window]"
                        );

                    if (element) {
                        const item =
                            state.windows.get(
                                element.dataset.window
                            );

                        if (item) {
                            toggleMaximize(
                                item
                            );
                        }
                    }
                }
            }
        );

        /*
         * ESCAPE
         */
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
                    [...state.windows.values()]
                        .filter(item => {
                            const el =
                                item.element;

                            return (
                                el.classList.contains(
                                    "is-open"
                                ) ||
                                el.classList.contains(
                                    "visible"
                                )
                            );
                        })
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

                const item =
                    opened[0];

                if (item) {
                    closeWindow(
                        item.id
                    );
                }
            }
        );
    }

    /*
     * ================================
     * RESPONSIVE
     * ================================
     */

    function updateMode() {
        const nextMode =
            isMobile()
                ? "mobile"
                : "desktop";

        if (
            state.mode ===
            nextMode
        ) {
            return;
        }

        state.mode =
            nextMode;

        state.windows.forEach(
            item => {
                const element =
                    item.element;

                element.classList.toggle(
                    "window-mobile",
                    nextMode ===
                    "mobile"
                );

                element.classList.toggle(
                    "window-desktop",
                    nextMode ===
                    "desktop"
                );

                if (
                    nextMode ===
                    "mobile"
                ) {
                    element.style.removeProperty(
                        "left"
                    );

                    element.style.removeProperty(
                        "top"
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
                } else {
                    setupInitialPosition(
                        item
                    );
                }
            }
        );
    }

    /*
     * ================================
     * INIT
     * ================================
     */

    function init(options = {}) {
        state.container =
            options.container ||
            document.querySelector(
                "[data-window-container]"
            ) ||
            document.querySelector(
                ".workspace"
            ) ||
            document.body;

        /*
         * Forzamos el primer update
         * para que el modo inicial
         * sí se aplique.
         */
        state.mode =
            "__boot__";

        registerAll();

        updateMode();

        setupDelegation();

        window.addEventListener(
            "resize",
            () => {
                clearTimeout(
                    state.resizeTimer
                );

                state.resizeTimer =
                    setTimeout(() => {
                        updateMode();

                        if (
                            !isMobile()
                        ) {
                            state.windows.forEach(
                                item => {
                                    if (
                                        item.element.classList.contains(
                                            "is-open"
                                        ) ||
                                        item.element.classList.contains(
                                            "visible"
                                        )
                                    ) {
                                        setupInitialPosition(
                                            item
                                        );
                                    }
                                }
                            );
                        }
                    },
                    100
                );
            },
            { passive: true }
        );

        state.windows.forEach(
            item => {
                if (
                    item.element.classList.contains(
                        "is-open"
                    ) ||
                    item.element.classList.contains(
                        "visible"
                    )
                ) {
                    focusWindow(item);
                }
            }
        );

        console.log(
            "[PluginDex] Motor de ventanas activo."
        );
    }

    /*
     * ================================
     * RESET
     * ================================
     */

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
                    "is-maximized",
                    "visible"
                );

                element.style.removeProperty(
                    "left"
                );

                element.style.removeProperty(
                    "top"
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

                item.previous =
                    null;
            }
        );

        state.windows.forEach(
            setupInitialPosition
        );
    }

    /*
     * ================================
     * API PÚBLICA
     * ================================
     */

    window.PluginDexWindows = {
        init,

        open:
            openWindow,

        close:
            closeWindow,

        focus(id) {
            const item =
                state.windows.get(id);

            if (item) {
                focusWindow(item);
            }
        },

        reset,

        get(id) {
            return (
                state.windows.get(id)
                    ?.element ||
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
