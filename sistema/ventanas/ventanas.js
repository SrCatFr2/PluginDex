/* =========================================================
   PLUGINDEX
   SISTEMA DE VENTANAS
   Liquid Glass Workspace
========================================================= */

(() => {

    "use strict";

    const STORAGE_KEY = "plugindex-window-layout-v1";

    const state = {

        windows: new Map(),

        zIndex: 100,

        active: null,

        dragging: null,

        resizing: null,

        pointer: {
            x: 0,
            y: 0
        },

        layout: loadLayout()

    };


    /* =====================================================
       UTILIDADES
    ===================================================== */

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }


    function isMobile() {
        return window.matchMedia("(max-width: 700px)").matches;
    }


    function getWorkspace() {
        return document.querySelector(".workspace");
    }


    function getElement(id) {
        return document.querySelector(`[data-window="${id}"]`);
    }


    function saveLayout() {

        const output = {};

        state.windows.forEach((win, id) => {

            if (!win.element) return;

            const rect = win.element.getBoundingClientRect();
            const workspace = getWorkspace();

            if (!workspace) return;

            const workspaceRect =
                workspace.getBoundingClientRect();

            output[id] = {

                x:
                    win.x ??
                    (rect.left - workspaceRect.left),

                y:
                    win.y ??
                    (rect.top - workspaceRect.top),

                width:
                    win.element.offsetWidth,

                height:
                    win.element.offsetHeight,

                minimized:
                    !!win.minimized,

                mode:
                    win.mode || "floating"
            };

        });

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(output)
            );

        } catch {}

    }


    function loadLayout() {

        try {

            const data =
                localStorage.getItem(STORAGE_KEY);

            return data
                ? JSON.parse(data)
                : {};

        } catch {

            return {};

        }

    }


    /* =====================================================
       REGISTRO
    ===================================================== */

    function register(id, options = {}) {

        const element =
            document.querySelector(
                `[data-window="${id}"]`
            );

        if (!element) return null;

        if (state.windows.has(id)) {
            return state.windows.get(id);
        }


        const win = {

            id,

            element,

            x: null,
            y: null,

            mode:
                options.mode ||
                "floating",

            minimized: false,

            resizable:
                options.resizable !== false,

            draggable:
                options.draggable !== false,

            minWidth:
                options.minWidth || 220,

            minHeight:
                options.minHeight || 120,

            maxWidth:
                options.maxWidth || Infinity,

            maxHeight:
                options.maxHeight || Infinity

        };


        state.windows.set(id, win);


        setupWindow(win);

        restoreWindow(win);

        return win;
    }


    /* =====================================================
       PREPARAR VENTANA
    ===================================================== */

    function setupWindow(win) {

        const el = win.element;


        el.classList.add("physical-window");


        if (!el.hasAttribute("tabindex")) {
            el.setAttribute("tabindex", "-1");
        }


        /*
           Buscar header.
        */

        const header =
            el.querySelector(
                "[data-window-drag], .inspector-header, .sheet-header"
            );


        if (header) {

            header.classList.add(
                "window-drag-handle"
            );

            header.dataset.windowDrag = win.id;

        }


        /*
           Botón cerrar.
        */

        const close =
            el.querySelector(
                "[data-window-close]"
            );

        if (close) {

            close.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    closeWindow(win.id);

                }
            );

        }


        /*
           Botón minimizar.
        */

        const minimize =
            el.querySelector(
                "[data-window-minimize]"
            );

        if (minimize) {

            minimize.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    minimizeWindow(win.id);

                }
            );

        }


        /*
           Click = ventana superior.
        */

        el.addEventListener(
            "pointerdown",
            () => {

                bringToFront(win.id);

            },
            {
                passive: true
            }
        );


        /*
           Resize handle.
        */

        if (win.resizable) {

            createResizeHandles(win);

        }

    }


    /* =====================================================
       RESTAURAR
    ===================================================== */

    function restoreWindow(win) {

        const saved =
            state.layout[win.id];

        const workspace =
            getWorkspace();

        if (!workspace) return;


        /*
           En móvil dejamos que CSS controle
           completamente la posición.
        */

        if (isMobile()) {

            win.mode = "mobile";

            return;

        }


        if (saved) {

            win.x = saved.x;
            win.y = saved.y;

            if (saved.width) {
                win.element.style.width =
                    `${saved.width}px`;
            }

            if (saved.height) {
                win.element.style.height =
                    `${saved.height}px`;
            }

            applyPosition(win);


            if (saved.minimized) {
                minimizeWindow(
                    win.id,
                    false
                );
            }

        } else {

            centerWindow(win);

        }

    }


    /* =====================================================
       POSICIÓN
    ===================================================== */

    function applyPosition(win) {

        if (isMobile()) return;

        if (
            win.x === null ||
            win.y === null
        ) return;


        const workspace =
            getWorkspace();

        if (!workspace) return;


        const maxX =
            Math.max(
                0,
                workspace.clientWidth -
                win.element.offsetWidth
            );

        const maxY =
            Math.max(
                0,
                workspace.clientHeight -
                win.element.offsetHeight
            );


        win.x =
            clamp(
                win.x,
                0,
                maxX
            );

        win.y =
            clamp(
                win.y,
                0,
                maxY
            );


        win.element.style.setProperty(
            "--window-x",
            `${win.x}px`
        );

        win.element.style.setProperty(
            "--window-y",
            `${win.y}px`
        );

    }


    function centerWindow(win) {

        const workspace =
            getWorkspace();

        if (!workspace) return;


        const width =
            win.element.offsetWidth;

        const height =
            win.element.offsetHeight;


        win.x =
            Math.max(
                10,
                (workspace.clientWidth -
                    width) / 2
            );

        win.y =
            Math.max(
                10,
                (workspace.clientHeight -
                    height) / 2
            );


        applyPosition(win);

    }


    /* =====================================================
       Z-INDEX
    ===================================================== */

    function bringToFront(id) {

        const win =
            state.windows.get(id);

        if (!win) return;


        state.zIndex++;

        win.element.style.zIndex =
            state.zIndex;


        state.active = id;


        state.windows.forEach(other => {

            other.element.classList.toggle(
                "window-active",
                other.id === id
            );

        });

    }


    /* =====================================================
       DRAG
    ===================================================== */

    function startDrag(
        win,
        event
    ) {

        if (
            !win.draggable ||
            isMobile()
        ) return;


        const target =
            event.target.closest(
                ".window-drag-handle"
            );

        if (!target) return;


        event.preventDefault();


        bringToFront(win.id);


        const rect =
            win.element.getBoundingClientRect();


        const workspace =
            getWorkspace();

        if (!workspace) return;


        const workspaceRect =
            workspace.getBoundingClientRect();


        win.x =
            rect.left -
            workspaceRect.left;

        win.y =
            rect.top -
            workspaceRect.top;


        state.dragging = {

            win,

            pointerId:
                event.pointerId,

            offsetX:
                event.clientX -
                rect.left,

            offsetY:
                event.clientY -
                rect.top

        };


        win.element.classList.add(
            "is-moving"
        );


        try {
            target.setPointerCapture(
                event.pointerId
            );
        } catch {}

    }


    function moveDrag(event) {

        const drag =
            state.dragging;

        if (!drag) return;


        const {
            win,
            offsetX,
            offsetY
        } = drag;


        const workspace =
            getWorkspace();

        if (!workspace) return;


        const rect =
            workspace.getBoundingClientRect();


        const width =
            win.element.offsetWidth;

        const height =
            win.element.offsetHeight;


        const x =
            event.clientX -
            rect.left -
            offsetX;

        const y =
            event.clientY -
            rect.top -
            offsetY;


        win.x =
            clamp(
                x,
                0,
                Math.max(
                    0,
                    workspace.clientWidth -
                    width
                )
            );

        win.y =
            clamp(
                y,
                0,
                Math.max(
                    0,
                    workspace.clientHeight -
                    height
                )
            );


        win.element.style.setProperty(
            "--window-x",
            `${win.x}px`
        );

        win.element.style.setProperty(
            "--window-y",
            `${win.y}px`
        );


        detectSnap(win);

    }


    function endDrag() {

        const drag =
            state.dragging;

        if (!drag) return;


        const win =
            drag.win;


        state.dragging = null;


        win.element.classList.remove(
            "is-moving"
        );


        const snap =
            win.element.dataset.snap;


        if (snap) {

            applySnap(
                win,
                snap
            );

            delete win.element.dataset.snap;

        }


        win.element.classList.add(
            "is-resting"
        );


        window.setTimeout(
            () => {

                win.element.classList.remove(
                    "is-resting"
                );

            },
            700
        );


        saveLayout();

    }


    /* =====================================================
       SNAP
    ===================================================== */

    function detectSnap(win) {

        const workspace =
            getWorkspace();

        if (!workspace) return;


        const threshold = 45;


        const maxX =
            workspace.clientWidth -
            win.element.offsetWidth;

        const maxY =
            workspace.clientHeight -
            win.element.offsetHeight;


        let snap = null;


        if (win.x <= threshold) {
            snap = "left";
        }

        else if (
            maxX - win.x <= threshold
        ) {
            snap = "right";
        }

        else if (
            win.y <= threshold
        ) {
            snap = "top";
        }

        else if (
            maxY - win.y <= threshold
        ) {
            snap = "bottom";
        }


        if (snap) {

            win.element.dataset.snap =
                snap;

            win.element.classList.add(
                "snap-preview"
            );

        } else {

            delete win.element.dataset.snap;

            win.element.classList.remove(
                "snap-preview"
            );

        }

    }


    function applySnap(
        win,
        position
    ) {

        const workspace =
            getWorkspace();

        if (!workspace) return;


        const width =
            win.element.offsetWidth;

        const height =
            win.element.offsetHeight;


        switch (position) {

            case "left":

                win.x = 12;

                break;


            case "right":

                win.x =
                    workspace.clientWidth -
                    width -
                    12;

                break;


            case "top":

                win.y = 12;

                break;


            case "bottom":

                win.y =
                    workspace.clientHeight -
                    height -
                    12;

                break;

        }


        applyPosition(win);

    }


    /* =====================================================
       RESIZE
    ===================================================== */

    function createResizeHandles(win) {

        const positions = [
            "n",
            "e",
            "s",
            "w",
            "ne",
            "se",
            "sw",
            "nw"
        ];


        positions.forEach(
            position => {

                const handle =
                    document.createElement(
                        "div"
                    );


                handle.className =
                    `window-resize-handle resize-${position}`;


                handle.dataset.resize =
                    position;


                win.element.appendChild(
                    handle
                );


                handle.addEventListener(
                    "pointerdown",
                    event => {

                        startResize(
                            win,
                            position,
                            event
                        );

                    }
                );

            }
        );

    }


    function startResize(
        win,
        direction,
        event
    ) {

        if (isMobile()) return;


        event.preventDefault();


        bringToFront(win.id);


        const rect =
            win.element.getBoundingClientRect();


        state.resizing = {

            win,

            direction,

            pointerId:
                event.pointerId,

            startX:
                event.clientX,

            startY:
                event.clientY,

            startWidth:
                rect.width,

            startHeight:
                rect.height,

            startLeft:
                rect.left,

            startTop:
                rect.top

        };


        win.element.classList.add(
            "is-resizing"
        );


        try {

            event.currentTarget.setPointerCapture(
                event.pointerId
            );

        } catch {}

    }


    function moveResize(event) {

        const resize =
            state.resizing;

        if (!resize) return;


        const {
            win,
            direction,
            startX,
            startY,
            startWidth,
            startHeight,
            startLeft,
            startTop
        } = resize;


        const workspace =
            getWorkspace();

        if (!workspace) return;


        const workspaceRect =
            workspace.getBoundingClientRect();


        let width =
            startWidth;

        let height =
            startHeight;

        let left =
            startLeft;

        let top =
            startTop;


        const dx =
            event.clientX -
            startX;

        const dy =
            event.clientY -
            startY;


        if (direction.includes("e")) {
            width =
                startWidth + dx;
        }

        if (direction.includes("s")) {
            height =
                startHeight + dy;
        }

        if (direction.includes("w")) {

            width =
                startWidth - dx;

            left =
                startLeft + dx;

        }

        if (direction.includes("n")) {

            height =
                startHeight - dy;

            top =
                startTop + dy;

        }


        width =
            clamp(
                width,
                win.minWidth,
                Math.min(
                    win.maxWidth,
                    workspace.clientWidth
                )
            );


        height =
            clamp(
                height,
                win.minHeight,
                Math.min(
                    win.maxHeight,
                    workspace.clientHeight
                )
            );


        /*
           Si estamos redimensionando
           desde izquierda/arriba,
           corregimos posición.
        */

        if (direction.includes("w")) {

            left =
                Math.min(
                    left,
                    startLeft +
                    startWidth -
                    win.minWidth
                );

            left =
                Math.max(
                    workspaceRect.left,
                    left
                );

        }


        if (direction.includes("n")) {

            top =
                Math.min(
                    top,
                    startTop +
                    startHeight -
                    win.minHeight
                );

            top =
                Math.max(
                    workspaceRect.top,
                    top
                );

        }


        win.element.style.width =
            `${width}px`;

        win.element.style.height =
            `${height}px`;


        win.x =
            left -
            workspaceRect.left;

        win.y =
            top -
            workspaceRect.top;


        applyPosition(win);

    }


    function endResize() {

        const resize =
            state.resizing;

        if (!resize) return;


        resize.win.element.classList.remove(
            "is-resizing"
        );


        state.resizing = null;


        saveLayout();

    }


    /* =====================================================
       MINIMIZAR
    ===================================================== */

    function minimizeWindow(
        id,
        save = true
    ) {

        const win =
            state.windows.get(id);

        if (!win) return;


        win.minimized = true;


        win.element.classList.add(
            "window-minimized"
        );


        if (save) {
            saveLayout();
        }

    }


    function restore(id) {

        const win =
            state.windows.get(id);

        if (!win) return;


        win.minimized = false;


        win.element.classList.remove(
            "window-minimized"
        );


        bringToFront(id);

        saveLayout();

    }


    /* =====================================================
       ABRIR / CERRAR
    ===================================================== */

    function openWindow(id) {

        const win =
            state.windows.get(id);

        if (!win) return;


        if (
            win.element.classList.contains(
                "window-minimized"
            )
        ) {

            restore(id);

            return;

        }


        win.element.classList.add(
            "window-open"
        );


        win.element.classList.remove(
            "window-closed"
        );


        bringToFront(id);

    }


    function closeWindow(id) {

        const win =
            state.windows.get(id);

        if (!win) return;


        win.element.classList.remove(
            "window-open"
        );


        win.element.classList.add(
            "window-closed"
        );


        saveLayout();

    }


    /* =====================================================
       RESET
    ===================================================== */

    function resetLayout() {

        try {

            localStorage.removeItem(
                STORAGE_KEY
            );

        } catch {}


        state.windows.forEach(
            win => {

                win.element.style.width = "";
                win.element.style.height = "";

                win.x = null;
                win.y = null;

                win.minimized = false;

                win.element.classList.remove(
                    "window-minimized"
                );

                centerWindow(win);

            }
        );

    }


    /* =====================================================
       RESPONSIVE
    ===================================================== */

    function handleResize() {

        if (isMobile()) {

            state.windows.forEach(
                win => {

                    win.mode = "mobile";

                    win.element.style.removeProperty(
                        "--window-x"
                    );

                    win.element.style.removeProperty(
                        "--window-y"
                    );

                }
            );

            return;

        }


        state.windows.forEach(
            win => {

                win.mode = "floating";

                if (
                    win.x !== null &&
                    win.y !== null
                ) {

                    applyPosition(win);

                }

            }
        );

    }


    /* =====================================================
       POINTER GLOBAL
    ===================================================== */

    function setupPointerSystem() {

        window.addEventListener(
            "pointerdown",
            event => {

                startDragFromEvent(
                    event
                );

            },
            {
                passive: false
            }
        );


        window.addEventListener(
            "pointermove",
            event => {

                state.pointer.x =
                    event.clientX;

                state.pointer.y =
                    event.clientY;


                if (state.dragging) {

                    moveDrag(event);

                }


                if (state.resizing) {

                    moveResize(event);

                }

            },
            {
                passive: false
            }
        );


        window.addEventListener(
            "pointerup",
            () => {

                if (state.dragging) {
                    endDrag();
                }

                if (state.resizing) {
                    endResize();
                }

            },
            {
                passive: true
            }
        );


        window.addEventListener(
            "pointercancel",
            () => {

                if (state.dragging) {
                    endDrag();
                }

                if (state.resizing) {
                    endResize();
                }

            },
            {
                passive: true
            }
        );

    }


    function startDragFromEvent(event) {

        const handle =
            event.target.closest(
                ".window-drag-handle"
            );

        if (!handle) return;


        const id =
            handle.dataset.windowDrag;

        if (!id) return;


        const win =
            state.windows.get(id);

        if (!win) return;


        startDrag(
            win,
            event
        );

    }


    /* =====================================================
       INIT
    ===================================================== */

    function init() {

        /*
           Ventanas existentes.
        */

        register(
            "inspector",
            {
                minWidth: 230,
                minHeight: 260,
                maxWidth: 430,
                maxHeight: 800
            }
        );


        /*
           Si posteriormente añadimos
           paneles reales, se registran aquí.
        */


        setupPointerSystem();


        window.addEventListener(
            "resize",
            handleResize,
            {
                passive: true
            }
        );


        window.addEventListener(
            "orientationchange",
            handleResize,
            {
                passive: true
            }
        );


        /*
           Guardado antes de abandonar.
        */

        window.addEventListener(
            "beforeunload",
            saveLayout
        );


        handleResize();

    }


    /* =====================================================
       API
    ===================================================== */

    window.PluginDexWindows = {

        init,

        register,

        open: openWindow,

        close: closeWindow,

        minimize: minimizeWindow,

        restore,

        bringToFront,

        reset: resetLayout,

        save: saveLayout,

        get(id) {

            return state.windows.get(id);

        },

        getState() {

            return state;

        }

    };


})();
