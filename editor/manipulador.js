/* ============================================================
   PLUGINDEX — MANIPULADOR
   editor/manipulador.js

   Editor físico tipo Canva.

   FUNCIONES:
   - Arrastrar
   - Redimensionar
   - Rotar
   - Snap
   - Guías
   - Touch
   - Pointer Capture
   - Hitbox cómoda
   - Protección contra botones HTML
   - Sin RAF permanente
============================================================ */

(() => {

    "use strict";


    /* ============================================================
       CONFIG
    ============================================================ */

    const ROOT_SELECTOR =
        ".page-element";


    const HANDLE_SIZE =
        12;


    const MIN_WIDTH =
        40;


    const MIN_HEIGHT =
        30;


    const SNAP_DISTANCE =
        8;


    const MOVE_THRESHOLD =
        3;


    /* ============================================================
       ESTADO
    ============================================================ */

    const state = {

        root: null,

        active: null,

        mode: null,

        pointerId: null,

        startX: 0,

        startY: 0,

        startLeft: 0,

        startTop: 0,

        startWidth: 0,

        startHeight: 0,

        startRotation: 0,

        centerX: 0,

        centerY: 0,

        startAngle: 0,

        moved: false,

        historyBefore: null,

        handles: null,

        guides: [],

        raf: 0,

        pendingX: 0,

        pendingY: 0

    };


    /* ============================================================
       UTILIDADES
    ============================================================ */

    function getRoot() {

        return (
            document.querySelector("#designPage") ||
            document.querySelector(".design-page")
        );

    }


    function getElements() {

        if (!state.root) {
            return [];
        }

        return [
            ...state.root.querySelectorAll(
                ROOT_SELECTOR
            )
        ];

    }


    function selected() {

        return (
            window.PluginDexSelection
                ?.getSelected?.() ||
            null
        );

    }


    function isLocked(element) {

        return (
            element?.dataset?.locked ===
            "true"
        );

    }


    function px(value) {

        const result =
            parseFloat(value);

        return Number.isFinite(result)
            ? result
            : 0;

    }


    function clamp(
        value,
        min,
        max
    ) {

        return Math.min(
            Math.max(
                value,
                min
            ),
            max
        );

    }


    function emit(
        name,
        detail = {}
    ) {

        document.dispatchEvent(
            new CustomEvent(
                name,
                {
                    detail
                }
            )
        );

    }


    /* ============================================================
       POSICIÓN
    ============================================================ */

    function getRect(element) {

        return element.getBoundingClientRect();

    }


    function getPageRect() {

        return state.root
            ?.getBoundingClientRect();

    }


    function getLocalPosition(
        element
    ) {

        return {

            left:
                px(
                    element.style.left
                ),

            top:
                px(
                    element.style.top
                )

        };

    }


    function setPosition(
        element,
        left,
        top
    ) {

        element.style.left =
            `${left}px`;

        element.style.top =
            `${top}px`;


        element.style.setProperty(
            "--element-x",
            `${left}px`
        );

        element.style.setProperty(
            "--element-y",
            `${top}px`
        );

    }


    /* ============================================================
       TRANSFORM
    ============================================================ */

    function getRotation(
        element
    ) {

        const value =
            element.style.getPropertyValue(
                "--editor-rotation"
            );


        if (value) {

            return px(
                value.replace(
                    "deg",
                    ""
                )
            );

        }


        return 0;

    }


    function setRotation(
        element,
        degrees
    ) {

        element.style.setProperty(
            "--editor-rotation",
            `${degrees}deg`
        );

    }


    /* ============================================================
       HANDLES
    ============================================================ */

    function removeHandles() {

        if (
            state.handles
        ) {

            state.handles.remove();

            state.handles =
                null;

        }

    }


    function createHandle(
        type
    ) {

        const handle =
            document.createElement(
                "button"
            );


        handle.type =
            "button";


        handle.className =
            `editor-handle editor-handle-${type}`;


        handle.dataset.handle =
            type;


        handle.setAttribute(
            "aria-label",
            type
        );


        /*
         * El botón es solamente un
         * elemento del editor.
         *
         * No debe ejecutar ninguna
         * acción propia.
         */

        handle.addEventListener(
            "click",
            event => {

                event.preventDefault();

            }
        );


        return handle;

    }


    function createHandles(
        element
    ) {

        removeHandles();


        if (!element) {
            return;
        }


        const overlay =
            document.createElement(
                "div"
            );


        overlay.className =
            "editor-transform-box";


        overlay.dataset.editorOverlay =
            "";


        const positions = [

            "nw",
            "n",
            "ne",
            "e",
            "se",
            "s",
            "sw",
            "w"

        ];


        positions.forEach(
            type => {

                overlay.appendChild(
                    createHandle(
                        type
                    )
                );

            }
        );


        /*
         * Rotación.
         */

        const rotate =
            document.createElement(
                "button"
            );


        rotate.type =
            "button";


        rotate.className =
            "editor-rotation-handle";


        rotate.dataset.handle =
            "rotate";


        rotate.setAttribute(
            "aria-label",
            "Rotar"
        );


        overlay.appendChild(
            rotate
        );


        /*
         * Overlay se coloca dentro
         * del mismo parent.
         */

        state.root.appendChild(
            overlay
        );


        state.handles =
            overlay;


        updateHandles(
            element
        );

    }


    function updateHandles(
        element
    ) {

        if (
            !state.handles ||
            !element
        ) {
            return;
        }


        const rect =
            element.getBoundingClientRect();


        const rootRect =
            getPageRect();


        if (!rootRect) {
            return;
        }


        state.handles.style.left =
            `${rect.left - rootRect.left}px`;


        state.handles.style.top =
            `${rect.top - rootRect.top}px`;


        state.handles.style.width =
            `${rect.width}px`;


        state.handles.style.height =
            `${rect.height}px`;

    }


    /* ============================================================
       SNAP
    ============================================================ */

    function snapValue(
        value,
        targets
    ) {

        for (
            const target of targets
        ) {

            if (
                Math.abs(
                    value - target
                ) <= SNAP_DISTANCE
            ) {

                return {
                    value: target,
                    snapped: true
                };

            }

        }


        return {
            value,
            snapped: false
        };

    }


    function calculateSnap(
        element,
        left,
        top
    ) {

        const rootRect =
            getPageRect();


        if (!rootRect) {

            return {
                left,
                top
            };

        }


        const width =
            element.offsetWidth;


        const height =
            element.offsetHeight;


        const pageWidth =
            rootRect.width;


        const pageHeight =
            rootRect.height;


        const targetsX = [

            0,

            (pageWidth - width) / 2,

            pageWidth - width

        ];


        const targetsY = [

            0,

            (pageHeight - height) / 2,

            pageHeight - height

        ];


        /*
         * Otros elementos.
         */

        getElements().forEach(
            other => {

                if (
                    other === element
                ) {
                    return;
                }


                const otherLeft =
                    px(
                        other.style.left
                    );


                const otherTop =
                    px(
                        other.style.top
                    );


                const otherWidth =
                    other.offsetWidth;


                const otherHeight =
                    other.offsetHeight;


                targetsX.push(
                    otherLeft,

                    otherLeft +
                    otherWidth,

                    otherLeft +
                    otherWidth -
                    width
                );


                targetsY.push(
                    otherTop,

                    otherTop +
                    otherHeight,

                    otherTop +
                    otherHeight -
                    height
                );

            }
        );


        const x =
            snapValue(
                left,
                targetsX
            );


        const y =
            snapValue(
                top,
                targetsY
            );


        updateGuides(
            element,
            x.snapped,
            y.snapped,
            x.value,
            y.value
        );


        return {

            left:
                x.value,

            top:
                y.value

        };

    }


    /* ============================================================
       GUÍAS
    ============================================================ */

    function createGuide(
        axis
    ) {

        const guide =
            document.createElement(
                "div"
            );


        guide.className =
            `editor-smart-guide guide-${axis}`;


        state.root.appendChild(
            guide
        );


        state.guides.push(
            guide
        );


        return guide;

    }


    function clearGuides() {

        state.guides.forEach(
            guide =>
                guide.remove()
        );


        state.guides = [];

    }


    function updateGuides(
        element,
        snapX,
        snapY,
        x,
        y
    ) {

        clearGuides();


        const rootRect =
            getPageRect();


        if (!rootRect) {
            return;
        }


        if (snapX) {

            const guide =
                createGuide(
                    "vertical"
                );


            guide.style.left =
                `${x}px`;

        }


        if (snapY) {

            const guide =
                createGuide(
                    "horizontal"
                );


            guide.style.top =
                `${y}px`;

        }

    }


    /* ============================================================
       INICIO DE OPERACIÓN
    ============================================================ */

    function begin(
        event,
        element,
        mode
    ) {

        if (
            !element ||
            isLocked(element)
        ) {
            return;
        }


        state.active =
            element;


        state.mode =
            mode;


        state.pointerId =
            event.pointerId;


        state.startX =
            event.clientX;


        state.startY =
            event.clientY;


        const position =
            getLocalPosition(
                element
            );


        state.startLeft =
            position.left;


        state.startTop =
            position.top;


        state.startWidth =
            element.offsetWidth;


        state.startHeight =
            element.offsetHeight;


        state.startRotation =
            getRotation(
                element
            );


        state.moved =
            false;


        /*
         * Guardamos el estado para
         * que app.js pueda registrar
         * la operación.
         */

        state.historyBefore =
            window.PluginDexApp
                ?.serializeProject?.() ||
            null;


        if (
            element.setPointerCapture
        ) {

            try {

                element.setPointerCapture(
                    event.pointerId
                );

            } catch {}

        }


        document.body.classList.add(
            "plugindex-manipulating"
        );


        element.classList.add(
            "is-manipulating"
        );


        emit(
            "plugindex:manipulationstart",
            {
                element,
                mode
            }
        );


        event.preventDefault();

    }


    /* ============================================================
       MOVE
    ============================================================ */

    function move(
        event
    ) {

        const element =
            state.active;


        if (
            !element
        ) {
            return;
        }


        const dx =
            event.clientX -
            state.startX;


        const dy =
            event.clientY -
            state.startY;


        if (
            Math.abs(dx) >
                MOVE_THRESHOLD ||
            Math.abs(dy) >
                MOVE_THRESHOLD
        ) {

            state.moved =
                true;

        }


        if (
            state.mode === "move"
        ) {

            let left =
                state.startLeft +
                dx;


            let top =
                state.startTop +
                dy;


            /*
             * Shift = movimiento libre.
             * Normal = snap.
             */

            if (
                !event.shiftKey
            ) {

                const snapped =
                    calculateSnap(
                        element,
                        left,
                        top
                    );


                left =
                    snapped.left;


                top =
                    snapped.top;

            } else {

                clearGuides();

            }


            setPosition(
                element,
                left,
                top
            );

        }


        if (
            state.mode === "resize"
        ) {

            resize(
                event,
                element
            );

        }


        if (
            state.mode === "rotate"
        ) {

            rotate(
                event,
                element
            );

        }


        updateHandles(
            element
        );


        emit(
            "plugindex:elementchange",
            {
                element,
                mode:
                    state.mode
            }
        );


        event.preventDefault();

    }


    /* ============================================================
       RESIZE
    ============================================================ */

    function resize(
        event,
        element
    ) {

        const handle =
            state.resizeHandle;


        if (!handle) {
            return;
        }


        const dx =
            event.clientX -
            state.startX;


        const dy =
            event.clientY -
            state.startY;


        let left =
            state.startLeft;


        let top =
            state.startTop;


        let width =
            state.startWidth;


        let height =
            state.startHeight;


        if (
            handle.includes("e")
        ) {

            width =
                state.startWidth +
                dx;

        }


        if (
            handle.includes("s")
        ) {

            height =
                state.startHeight +
                dy;

        }


        if (
            handle.includes("w")
        ) {

            width =
                state.startWidth -
                dx;


            left =
                state.startLeft +
                dx;

        }


        if (
            handle.includes("n")
        ) {

            height =
                state.startHeight -
                dy;


            top =
                state.startTop +
                dy;

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


        /*
         * Si el ancho llegó al mínimo
         * reajustamos posición oeste.
         */

        if (
            handle.includes("w") &&
            width === MIN_WIDTH
        ) {

            left =
                state.startLeft +
                state.startWidth -
                MIN_WIDTH;

        }


        if (
            handle.includes("n") &&
            height === MIN_HEIGHT
        ) {

            top =
                state.startTop +
                state.startHeight -
                MIN_HEIGHT;

        }


        /*
         * Alt + resize desde esquina:
         * comportamiento simétrico.
         */

        if (
            event.altKey &&
            (
                handle.length === 2
            )
        ) {

            const centerX =
                state.startLeft +
                state.startWidth / 2;


            const centerY =
                state.startTop +
                state.startHeight / 2;


            if (
                handle.includes("w") ||
                handle.includes("e")
            ) {

                left =
                    centerX -
                    width / 2;

            }


            if (
                handle.includes("n") ||
                handle.includes("s")
            ) {

                top =
                    centerY -
                    height / 2;

            }

        }


        element.style.width =
            `${width}px`;


        element.style.height =
            `${height}px`;


        setPosition(
            element,
            left,
            top
        );


        clearGuides();

    }


    /* ============================================================
       ROTATE
    ============================================================ */

    function startRotation(
        element
    ) {

        const rect =
            element.getBoundingClientRect();


        state.centerX =
            rect.left +
            rect.width / 2;


        state.centerY =
            rect.top +
            rect.height / 2;


        state.startAngle =
            Math.atan2(
                state.startY -
                state.centerY,
                state.startX -
                state.centerX
            ) *
            180 /
            Math.PI;

    }


    function rotate(
        event,
        element
    ) {

        const angle =
            Math.atan2(
                event.clientY -
                state.centerY,
                event.clientX -
                state.centerX
            ) *
            180 /
            Math.PI;


        let rotation =
            state.startRotation +
            angle -
            state.startAngle;


        /*
         * Shift = snap de rotación.
         * Cada 15 grados.
         */

        if (
            event.shiftKey
        ) {

            rotation =
                Math.round(
                    rotation / 15
                ) * 15;

        }


        setRotation(
            element,
            rotation
        );


        clearGuides();

    }


    /* ============================================================
       FIN
    ============================================================ */

    function end(
        event
    ) {

        const element =
            state.active;


        if (!element) {
            return;
        }


        clearGuides();


        element.classList.remove(
            "is-manipulating"
        );


        document.body.classList.remove(
            "plugindex-manipulating"
        );


        if (
            state.pointerId !== null &&
            element.releasePointerCapture
        ) {

            try {

                element.releasePointerCapture(
                    state.pointerId
                );

            } catch {}

        }


        if (
            state.moved
        ) {

            emit(
                "plugindex:manipulationend",
                {
                    element,

                    mode:
                        state.mode,

                    changed:
                        true
                }
            );

        }


        state.active =
            null;


        state.mode =
            null;


        state.pointerId =
            null;


        state.resizeHandle =
            null;


        state.historyBefore =
            null;


        updateHandles(
            selected()
        );

    }


    /* ============================================================
       POINTERDOWN
    ============================================================ */

    function onPointerDown(
        event
    ) {

        const target =
            event.target;


        /*
         * Handle de transformación.
         */

        const handle =
            target.closest(
                "[data-handle]"
            );


        if (handle) {

            const element =
                selected();


            if (!element) {
                return;
            }


            const type =
                handle.dataset.handle;


            if (
                type === "rotate"
            ) {

                begin(
                    event,
                    element,
                    "rotate"
                );


                startRotation(
                    element
                );


            } else {

                state.resizeHandle =
                    type;


                begin(
                    event,
                    element,
                    "resize"
                );

            }


            return;

        }


        /*
         * Objeto.
         */

        const element =
            target.closest(
                ROOT_SELECTOR
            );


        if (
            !element ||
            !state.root.contains(
                element
            )
        ) {

            return;

        }


        /*
         * Si está bloqueado no hacemos nada.
         */

        if (
            isLocked(element)
        ) {
            return;
        }


        /*
         * Seleccionar.
         */

        const additive =
            event.shiftKey ||
            event.ctrlKey ||
            event.metaKey;


        if (
            !window.PluginDexSelection
        ) {

            return;

        }


        window.PluginDexSelection.select(
            element,
            {
                additive
            }
        );


        /*
         * Un toque empieza movimiento,
         * pero no lo consideramos movimiento
         * hasta superar MOVE_THRESHOLD.
         *
         * Esto hace que un botón no se
         * active accidentalmente.
         */

        begin(
            event,
            element,
            "move"
        );

    }


    /* ============================================================
       POINTERMOVE
    ============================================================ */

    function onPointerMove(
        event
    ) {

        if (
            state.pointerId === null
        ) {
            return;
        }


        if (
            event.pointerId !==
            state.pointerId
        ) {
            return;
        }


        move(
            event
        );

    }


    /* ============================================================
       POINTERUP
    ============================================================ */

    function onPointerUp(
        event
    ) {

        if (
            state.pointerId === null
        ) {
            return;
        }


        if (
            event.pointerId !==
            state.pointerId
        ) {
            return;
        }


        end(
            event
        );

    }


    /* ============================================================
       PREVENIR CLICK DEL BOTÓN
    ============================================================ */

    function preventEditorClick(
        event
    ) {

        /*
         * Si acabamos de arrastrar un botón,
         * el click generado después del pointerup
         * NO debe activar el botón.
         */

        if (
            state.suppressClick
        ) {

            event.preventDefault();

            event.stopPropagation();

            state.suppressClick =
                false;

        }

    }


    /* ============================================================
       ESTILO DE INTERACCIÓN
    ============================================================ */

    function injectInteractionStyles() {

        if (
            document.getElementById(
                "plugindex-manipulator-runtime"
            )
        ) {
            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "plugindex-manipulator-runtime";


        style.textContent = `

            .page-element {
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
                -webkit-touch-callout: none;
            }

            .page-element > button,
            .page-element button,
            .page-element input,
            .page-element textarea,
            .page-element select {
                pointer-events: none;
            }

            .editor-transform-box {
                position: absolute;
                z-index: 99999;
                pointer-events: none;
                box-sizing: border-box;
                border: 1px solid rgba(255,255,255,.78);
                border-radius: 4px;
                transform-origin: center;
            }

            .editor-handle {
                position: absolute;
                width: ${HANDLE_SIZE}px;
                height: ${HANDLE_SIZE}px;
                min-width: ${HANDLE_SIZE}px;
                min-height: ${HANDLE_SIZE}px;
                padding: 0;
                margin: 0;
                border-radius: 50%;
                border: 1px solid rgba(255,255,255,.9);
                background: rgba(12,12,14,.94);
                box-shadow:
                    0 2px 10px rgba(0,0,0,.35),
                    inset 0 0 0 2px rgba(255,255,255,.08);
                pointer-events: auto;
                cursor: nwse-resize;
                touch-action: none;
            }

            .editor-handle-nw {
                left: 0;
                top: 0;
                transform: translate(-50%,-50%);
                cursor: nwse-resize;
            }

            .editor-handle-n {
                left: 50%;
                top: 0;
                transform: translate(-50%,-50%);
                cursor: ns-resize;
            }

            .editor-handle-ne {
                right: 0;
                top: 0;
                transform: translate(50%,-50%);
                cursor: nesw-resize;
            }

            .editor-handle-e {
                right: 0;
                top: 50%;
                transform: translate(50%,-50%);
                cursor: ew-resize;
            }

            .editor-handle-se {
                right: 0;
                bottom: 0;
                transform: translate(50%,50%);
                cursor: nwse-resize;
            }

            .editor-handle-s {
                left: 50%;
                bottom: 0;
                transform: translate(-50%,50%);
                cursor: ns-resize;
            }

            .editor-handle-sw {
                left: 0;
                bottom: 0;
                transform: translate(-50%,50%);
                cursor: nesw-resize;
            }

            .editor-handle-w {
                left: 0;
                top: 50%;
                transform: translate(-50%,-50%);
                cursor: ew-resize;
            }

            .editor-rotation-handle {
                position: absolute;
                left: 50%;
                top: -30px;
                width: 20px;
                height: 20px;
                transform: translateX(-50%);
                border-radius: 50%;
                border: 1px solid rgba(255,255,255,.85);
                background: rgba(10,10,12,.96);
                color: white;
                pointer-events: auto;
                cursor: grab;
                touch-action: none;
                box-shadow: 0 3px 12px rgba(0,0,0,.4);
            }

            .editor-rotation-handle::before {
                content: "↻";
                position: absolute;
                inset: 0;
                display: grid;
                place-items: center;
                font-size: 12px;
            }

            .editor-smart-guide {
                position: absolute;
                z-index: 99998;
                pointer-events: none;
                background: rgba(255,255,255,.55);
            }

            .editor-smart-guide.guide-vertical {
                top: 0;
                bottom: 0;
                width: 1px;
            }

            .editor-smart-guide.guide-horizontal {
                left: 0;
                right: 0;
                height: 1px;
            }

            .page-element.is-manipulating {
                cursor: grabbing !important;
            }

            .plugindex-manipulating,
            .plugindex-manipulating * {
                cursor: grabbing !important;
            }

            body.preview-mode .editor-transform-box,
            body.preview-mode .editor-smart-guide {
                display: none !important;
            }

            body.preview-mode .page-element > button,
            body.preview-mode .page-element button {
                pointer-events: auto;
            }

        `;


        document.head.appendChild(
            style
        );

    }


    /* ============================================================
       SELECCIÓN CAMBIA
    ============================================================ */

    function onSelectionChange() {

        const element =
            selected();


        if (
            state.active
        ) {
            return;
        }


        createHandles(
            element
        );

    }


    /* ============================================================
       RESIZE WINDOW
    ============================================================ */

    function setupResizeObserver() {

        if (
            !window.ResizeObserver
        ) {
            return;
        }


        const observer =
            new ResizeObserver(
                () => {

                    if (
                        state.active
                    ) {
                        updateHandles(
                            state.active
                        );

                    } else {

                        updateHandles(
                            selected()
                        );

                    }

                }
            );


        if (state.root) {

            observer.observe(
                state.root
            );

        }

    }


    /* ============================================================
       INIT
    ============================================================ */

    function init() {

        state.root =
            getRoot();


        if (!state.root) {

            console.warn(
                "[PluginDex] No se encontró #designPage."
            );

            return;

        }


        injectInteractionStyles();


        state.root.addEventListener(
            "pointerdown",
            onPointerDown,
            {
                passive: false
            }
        );


        window.addEventListener(
            "pointermove",
            onPointerMove,
            {
                passive: false
            }
        );


        window.addEventListener(
            "pointerup",
            onPointerUp,
            {
                passive: false
            }
        );


        window.addEventListener(
            "pointercancel",
            onPointerUp,
            {
                passive: false
            }
        );


        document.addEventListener(
            "click",
            preventEditorClick,
            true
        );


        document.addEventListener(
            "plugindex:selectionchange",
            onSelectionChange
        );


        setupResizeObserver();


        onSelectionChange();


        console.log(
            "[PluginDex] Manipulador Canva iniciado."
        );

    }


    /* ============================================================
       API
    ============================================================ */

    window.PluginDexManipulator = {

        getState() {

            return {
                ...state
            };

        },

        refresh() {

            updateHandles(
                selected()
            );

        },

        removeHandles,

        createHandles

    };


    /* ============================================================
       START
    ============================================================ */

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
