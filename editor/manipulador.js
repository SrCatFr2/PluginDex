(() => {
    "use strict";

    /*
     * PluginDex — Manipulador
     * -----------------------
     * Sistema único de:
     *  - selección
     *  - mover
     *  - redimensionar
     *  - rotar
     *  - snap
     *  - límites del lienzo
     *
     * IMPORTANTE:
     * La geometría real usa únicamente:
     *
     *   left
     *   top
     *   width
     *   height
     *   --editor-rotation
     *
     * No usamos translate3d() para posicionar elementos.
     */

    const ELEMENT_SELECTOR = ".page-element, .pd-element";
    const HANDLE_SELECTOR = ".editor-handle";
    const ROTATE_SELECTOR = ".editor-rotate-handle";

    const MIN_WIDTH = 30;
    const MIN_HEIGHT = 30;

    const SNAP_DISTANCE = 8;
    const MOVE_THRESHOLD = 3;

    let active = null;
    let selectionObserver = null;

    // --------------------------------------------------
    // DOM
    // --------------------------------------------------

    function getCanvas() {
        return (
            document.querySelector(".design-page") ||
            document.querySelector("#page")
        );
    }

    function getElements() {
        const canvas = getCanvas();

        if (!canvas) return [];

        return [
            ...canvas.querySelectorAll(
                ".page-element, .pd-element"
            )
        ].filter(
            el =>
                !el.classList.contains("editor-handles") &&
                !el.closest(".editor-handles")
        );
    }

    function isLocked(element) {
        return (
            element.dataset.locked === "true" ||
            element.hasAttribute("data-locked") ||
            element.classList.contains("locked")
        );
    }

    function getRotation(element) {
        const value =
            getComputedStyle(element)
                .getPropertyValue("--editor-rotation")
                .trim();

        const rotation = parseFloat(value);

        return Number.isFinite(rotation)
            ? rotation
            : 0;
    }

    function normalizeRotation(value) {
        let rotation = Number(value) || 0;

        rotation %= 360;

        if (rotation > 180) rotation -= 360;
        if (rotation < -180) rotation += 360;

        return rotation;
    }

    // --------------------------------------------------
    // ZOOM
    // --------------------------------------------------

    function getCanvasScale() {
        const canvas = getCanvas();

        if (!canvas) return 1;

        /*
         * Si el canvas está escalado con transform: scale(),
         * getBoundingClientRect() devuelve la medida visual.
         *
         * offsetWidth devuelve la medida interna.
         *
         * Así obtenemos el zoom real sin depender de una
         * variable CSS concreta.
         */

        const internalWidth = canvas.offsetWidth;
        const visualWidth = canvas.getBoundingClientRect().width;

        if (
            !internalWidth ||
            !visualWidth ||
            !Number.isFinite(internalWidth) ||
            !Number.isFinite(visualWidth)
        ) {
            return 1;
        }

        const scale = visualWidth / internalWidth;

        if (!Number.isFinite(scale) || scale <= 0) {
            return 1;
        }

        return scale;
    }

    function pointerDelta(startX, startY, event) {
        const scale = getCanvasScale();

        return {
            x: (event.clientX - startX) / scale,
            y: (event.clientY - startY) / scale
        };
    }

    // --------------------------------------------------
    // GEOMETRÍA
    // --------------------------------------------------

    function readGeometry(element) {
        const canvas = getCanvas();

        if (!canvas || !element) {
            return null;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        const scale = getCanvasScale();

        let width =
            parseFloat(element.style.width) ||
            element.offsetWidth ||
            elementRect.width / scale;

        let height =
            parseFloat(element.style.height) ||
            element.offsetHeight ||
            elementRect.height / scale;

        let x = parseFloat(element.style.left);
        let y = parseFloat(element.style.top);

        /*
         * Si no hay left/top válidos, calculamos la posición
         * desde el rect visual y la convertimos al sistema
         * interno del canvas.
         */

        if (!Number.isFinite(x)) {
            x =
                (elementRect.left - canvasRect.left) /
                scale;
        }

        if (!Number.isFinite(y)) {
            y =
                (elementRect.top - canvasRect.top) /
                scale;
        }

        width = Math.max(MIN_WIDTH, width);
        height = Math.max(MIN_HEIGHT, height);

        return {
            x,
            y,
            width,
            height,
            rotation: getRotation(element)
        };
    }

    function getCanvasSize() {
        const canvas = getCanvas();

        if (!canvas) {
            return {
                width: 0,
                height: 0
            };
        }

        return {
            width: canvas.clientWidth,
            height: canvas.clientHeight
        };
    }

    function clamp(value, min, max) {
        return Math.max(
            min,
            Math.min(max, value)
        );
    }

    function applyGeometry(
        element,
        x,
        y,
        width,
        height,
        rotation
    ) {
        if (!element) return;

        const canvas = getCanvas();

        if (!canvas) return;

        const size = getCanvasSize();

        width = Math.max(
            MIN_WIDTH,
            Math.min(width, size.width)
        );

        height = Math.max(
            MIN_HEIGHT,
            Math.min(height, size.height)
        );

        x = clamp(
            x,
            0,
            Math.max(0, size.width - width)
        );

        y = clamp(
            y,
            0,
            Math.max(0, size.height - height)
        );

        /*
         * Este es el punto más importante:
         *
         * NO usamos transform para mover el elemento.
         */

        element.style.left = `${x}px`;
        element.style.top = `${y}px`;

        element.style.width = `${width}px`;
        element.style.height = `${height}px`;

        element.style.setProperty(
            "--editor-rotation",
            `${normalizeRotation(rotation)}deg`
        );

        /*
         * Compatibilidad con proyectos antiguos.
         * Dejamos las variables actualizadas, pero no las
         * usamos para posicionar mediante translate.
         */

        element.style.setProperty(
            "--element-x",
            `${x}px`
        );

        element.style.setProperty(
            "--element-y",
            `${y}px`
        );

        element.dataset.editorX = String(x);
        element.dataset.editorY = String(y);
        element.dataset.editorWidth = String(width);
        element.dataset.editorHeight = String(height);
        element.dataset.editorRotation =
            String(normalizeRotation(rotation));

        refreshHandles(element);
    }

    // --------------------------------------------------
    // SELECCIÓN
    // --------------------------------------------------

    function selectElement(element, additive = false) {
        if (!element) return;

        if (window.PluginDexSelection?.select) {
            window.PluginDexSelection.select(
                element,
                additive
            );
            return;
        }

        document
            .querySelectorAll(
                ".editor-selected, .selected"
            )
            .forEach(el => {
                el.classList.remove(
                    "editor-selected",
                    "selected"
                );
            });

        element.classList.add(
            "editor-selected",
            "selected"
        );

        document.dispatchEvent(
            new CustomEvent(
                "plugindex:selectionchange",
                {
                    detail: {
                        elements: [element],
                        element
                    }
                }
            )
        );
    }

    function getSelectedElements() {
        if (
            window.PluginDexSelection?.getSelected
        ) {
            const selected =
                window.PluginDexSelection.getSelected();

            if (Array.isArray(selected)) {
                return selected;
            }

            if (selected) {
                return [selected];
            }
        }

        return [
            ...document.querySelectorAll(
                ".editor-selected, .selected"
            )
        ];
    }

    // --------------------------------------------------
    // HANDLES
    // --------------------------------------------------

    function createHandles(element) {
        if (!element) return;

        let wrapper =
            element.querySelector(
                ":scope > .editor-handles"
            );

        if (wrapper) {
            refreshHandles(element);
            return wrapper;
        }

        wrapper =
            document.createElement("div");

        wrapper.className = "editor-handles";

        wrapper.setAttribute(
            "aria-hidden",
            "true"
        );

        const directions = [
            "nw",
            "n",
            "ne",
            "e",
            "se",
            "s",
            "sw",
            "w"
        ];

        directions.forEach(direction => {
            const handle =
                document.createElement("div");

            handle.className =
                `editor-handle editor-handle-${direction}`;

            handle.dataset.resize =
                direction;

            handle.setAttribute(
                "aria-hidden",
                "true"
            );

            wrapper.appendChild(handle);
        });

        const rotate =
            document.createElement("div");

        rotate.className =
            "editor-rotate-handle";

        rotate.dataset.rotate = "true";

        rotate.setAttribute(
            "aria-hidden",
            "true"
        );

        wrapper.appendChild(rotate);

        element.appendChild(wrapper);

        refreshHandles(element);

        return wrapper;
    }

    function removeHandles(element) {
        if (!element) return;

        element
            .querySelectorAll(
                ":scope > .editor-handles"
            )
            .forEach(el => el.remove());
    }

    function refreshHandles(element) {
        if (!element) return;

        const wrapper =
            element.querySelector(
                ":scope > .editor-handles"
            );

        if (!wrapper) return;

        const geometry =
            readGeometry(element);

        if (!geometry) return;

        wrapper.style.width =
            `${geometry.width}px`;

        wrapper.style.height =
            `${geometry.height}px`;
    }

    function refreshAllHandles() {
        document
            .querySelectorAll(
                ".page-element, .pd-element"
            )
            .forEach(element => {
                if (
                    element.classList.contains(
                        "editor-selected"
                    ) ||
                    element.classList.contains(
                        "selected"
                    )
                ) {
                    createHandles(element);
                } else {
                    removeHandles(element);
                }
            });
    }

    // --------------------------------------------------
    // SNAP
    // --------------------------------------------------

    function snapValue(value, targets) {
        let closest = value;
        let distance = SNAP_DISTANCE;

        for (const target of targets) {
            const current =
                Math.abs(value - target);

            if (current <= distance) {
                distance = current;
                closest = target;
            }
        }

        return closest;
    }

    function getSnapPosition(
        element,
        x,
        y,
        width,
        height
    ) {
        const size = getCanvasSize();

        const targetsX = [
            0,
            (size.width - width) / 2,
            size.width - width
        ];

        const targetsY = [
            0,
            (size.height - height) / 2,
            size.height - height
        ];

        /*
         * También hacemos snap a otros elementos.
         */

        getElements()
            .filter(other => other !== element)
            .forEach(other => {
                const geometry =
                    readGeometry(other);

                if (!geometry) return;

                targetsX.push(
                    geometry.x,
                    geometry.x +
                        geometry.width,
                    geometry.x +
                        geometry.width -
                        width,
                    geometry.x +
                        geometry.width / 2 -
                        width / 2
                );

                targetsY.push(
                    geometry.y,
                    geometry.y +
                        geometry.height,
                    geometry.y +
                        geometry.height -
                        height,
                    geometry.y +
                        geometry.height / 2 -
                        height / 2
                );
            });

        return {
            x: snapValue(x, targetsX),
            y: snapValue(y, targetsY)
        };
    }

    // --------------------------------------------------
    // GUÍAS
    // --------------------------------------------------

    function removeGuides() {
        document
            .querySelectorAll(
                ".editor-guide"
            )
            .forEach(guide => {
                guide.remove();
            });
    }

    function drawGuides(
        x,
        y,
        width,
        height
    ) {
        removeGuides();

        const canvas = getCanvas();

        if (!canvas) return;

        const size = getCanvasSize();

        const centerX =
            x + width / 2;

        const centerY =
            y + height / 2;

        const vertical =
            document.createElement("div");

        vertical.className =
            "editor-guide editor-guide-x";

        vertical.style.position =
            "absolute";

        vertical.style.left =
            `${centerX}px`;

        vertical.style.top = "0";
        vertical.style.height =
            `${size.height}px`;

        const horizontal =
            document.createElement("div");

        horizontal.className =
            "editor-guide editor-guide-y";

        horizontal.style.position =
            "absolute";

        horizontal.style.top =
            `${centerY}px`;

        horizontal.style.left = "0";

        horizontal.style.width =
            `${size.width}px`;

        canvas.append(
            vertical,
            horizontal
        );
    }

    // --------------------------------------------------
    // MOVE
    // --------------------------------------------------

    function beginMove(event, element) {
        if (!element) return;
        if (isLocked(element)) return;

        /*
         * No dejamos que un control interno real se ejecute
         * durante la edición.
         */

        if (
            event.target.closest(
                ".editor-handle"
            ) ||
            event.target.closest(
                ".editor-rotate-handle"
            )
        ) {
            return;
        }

        const geometry =
            readGeometry(element);

        if (!geometry) return;

        selectElement(
            element,
            event.shiftKey ||
            event.ctrlKey ||
            event.metaKey
        );

        active = {
            type: "move",

            element,

            pointerId:
                event.pointerId,

            startPointerX:
                event.clientX,

            startPointerY:
                event.clientY,

            startX:
                geometry.x,

            startY:
                geometry.y,

            width:
                geometry.width,

            height:
                geometry.height,

            rotation:
                geometry.rotation,

            moved: false
        };

        element.classList.add(
            "editor-moving"
        );

        try {
            document.documentElement.setPointerCapture?.(
                event.pointerId
            );
        } catch {}

        event.preventDefault();
    }

    function moveElement(event) {
        if (!active) return;

        if (
            event.pointerId !==
            active.pointerId
        ) {
            return;
        }

        const delta =
            pointerDelta(
                active.startPointerX,
                active.startPointerY,
                event
            );

        if (
            Math.abs(delta.x) >
                MOVE_THRESHOLD ||
            Math.abs(delta.y) >
                MOVE_THRESHOLD
        ) {
            active.moved = true;
        }

        let x =
            active.startX +
            delta.x;

        let y =
            active.startY +
            delta.y;

        const snapped =
            getSnapPosition(
                active.element,
                x,
                y,
                active.width,
                active.height
            );

        x = snapped.x;
        y = snapped.y;

        const size =
            getCanvasSize();

        x = clamp(
            x,
            0,
            Math.max(
                0,
                size.width -
                    active.width
            )
        );

        y = clamp(
            y,
            0,
            Math.max(
                0,
                size.height -
                    active.height
            )
        );

        applyGeometry(
            active.element,
            x,
            y,
            active.width,
            active.height,
            active.rotation
        );

        drawGuides(
            x,
            y,
            active.width,
            active.height
        );

        event.preventDefault();
    }

    // --------------------------------------------------
    // RESIZE
    // --------------------------------------------------

    function beginResize(
        event,
        element,
        direction
    ) {
        if (!element) return;
        if (isLocked(element)) return;

        const geometry =
            readGeometry(element);

        if (!geometry) return;

        selectElement(element);

        active = {
            type: "resize",

            element,

            direction,

            pointerId:
                event.pointerId,

            startPointerX:
                event.clientX,

            startPointerY:
                event.clientY,

            startX:
                geometry.x,

            startY:
                geometry.y,

            startWidth:
                geometry.width,

            startHeight:
                geometry.height,

            startRotation:
                geometry.rotation,

            moved: false,

            aspect:
                geometry.width /
                geometry.height
        };

        element.classList.add(
            "editor-resizing"
        );

        try {
            event.currentTarget.setPointerCapture(
                event.pointerId
            );
        } catch {}

        event.preventDefault();
        event.stopPropagation();
    }

    function resizeElement(event) {
        if (
            !active ||
            active.type !== "resize"
        ) {
            return;
        }

        if (
            event.pointerId !==
            active.pointerId
        ) {
            return;
        }

        const delta =
            pointerDelta(
                active.startPointerX,
                active.startPointerY,
                event
            );

        if (
            Math.abs(delta.x) >
                MOVE_THRESHOLD ||
            Math.abs(delta.y) >
                MOVE_THRESHOLD
        ) {
            active.moved = true;
        }

        const direction =
            active.direction;

        const west =
            direction.includes("w");

        const east =
            direction.includes("e");

        const north =
            direction.includes("n");

        const south =
            direction.includes("s");

        let x = active.startX;
        let y = active.startY;

        let width =
            active.startWidth;

        let height =
            active.startHeight;

        /*
         * Primero calculamos el resize normal.
         */

        if (east) {
            width =
                active.startWidth +
                delta.x;
        }

        if (west) {
            width =
                active.startWidth -
                delta.x;

            x =
                active.startX +
                delta.x;
        }

        if (south) {
            height =
                active.startHeight +
                delta.y;
        }

        if (north) {
            height =
                active.startHeight -
                delta.y;

            y =
                active.startY +
                delta.y;
        }

        /*
         * Shift = mantener proporción.
         */

        if (
            event.shiftKey &&
            (west ||
                east ||
                north ||
                south)
        ) {
            const ratio =
                active.aspect || 1;

            const widthChange =
                Math.abs(
                    width -
                        active.startWidth
                );

            const heightChange =
                Math.abs(
                    height -
                        active.startHeight
                );

            if (
                widthChange >=
                heightChange
            ) {
                height =
                    width / ratio;

                if (north) {
                    y =
                        active.startY +
                        active.startHeight -
                        height;
                }
            } else {
                width =
                    height * ratio;

                if (west) {
                    x =
                        active.startX +
                        active.startWidth -
                        width;
                }
            }
        }

        /*
         * Alt = resize desde el centro.
         */

        if (event.altKey) {
            const centerX =
                active.startX +
                active.startWidth / 2;

            const centerY =
                active.startY +
                active.startHeight / 2;

            if (west || east) {
                x =
                    centerX -
                    width / 2;
            }

            if (north || south) {
                y =
                    centerY -
                    height / 2;
            }
        }

        /*
         * Tamaño mínimo.
         */

        width = Math.max(
            MIN_WIDTH,
            width
        );

        height = Math.max(
            MIN_HEIGHT,
            height
        );

        /*
         * Límites reales del lienzo.
         */

        const size =
            getCanvasSize();

        /*
         * Si arrastramos desde izquierda:
         */

        if (west) {
            if (x < 0) {
                width += x;
                x = 0;
            }

            if (
                width >
                active.startX +
                active.startWidth
            ) {
                width =
                    active.startX +
                    active.startWidth;
                x = 0;
            }
        }

        /*
         * Derecha.
         */

        if (east) {
            width =
                Math.min(
                    width,
                    size.width -
                        x
                );
        }

        /*
         * Arriba.
         */

        if (north) {
            if (y < 0) {
                height += y;
                y = 0;
            }

            if (
                height >
                active.startY +
                active.startHeight
            ) {
                height =
                    active.startY +
                    active.startHeight;
                y = 0;
            }
        }

        /*
         * Abajo.
         */

        if (south) {
            height =
                Math.min(
                    height,
                    size.height -
                        y
                );
        }

        width = Math.max(
            MIN_WIDTH,
            width
        );

        height = Math.max(
            MIN_HEIGHT,
            height
        );

        /*
         * Última protección.
         */

        if (
            x + width >
            size.width
        ) {
            width =
                size.width - x;
        }

        if (
            y + height >
            size.height
        ) {
            height =
                size.height - y;
        }

        width = Math.max(
            MIN_WIDTH,
            width
        );

        height = Math.max(
            MIN_HEIGHT,
            height
        );

        applyGeometry(
            active.element,
            x,
            y,
            width,
            height,
            active.startRotation
        );

        drawGuides(
            x,
            y,
            width,
            height
        );

        event.preventDefault();
    }

    // --------------------------------------------------
    // ROTACIÓN
    // --------------------------------------------------

    function beginRotate(
        event,
        element
    ) {
        if (!element) return;
        if (isLocked(element)) return;

        const geometry =
            readGeometry(element);

        if (!geometry) return;

        const canvas =
            getCanvas();

        if (!canvas) return;

        const rect =
            canvas.getBoundingClientRect();

        const scale =
            getCanvasScale();

        const centerX =
            rect.left +
            (geometry.x +
                geometry.width / 2) *
                scale;

        const centerY =
            rect.top +
            (geometry.y +
                geometry.height / 2) *
                scale;

        active = {
            type: "rotate",

            element,

            pointerId:
                event.pointerId,

            centerX,

            centerY,

            startRotation:
                geometry.rotation,

            moved: false
        };

        element.classList.add(
            "editor-rotating"
        );

        try {
            event.currentTarget.setPointerCapture(
                event.pointerId
            );
        } catch {}

        event.preventDefault();
        event.stopPropagation();
    }

    function rotateElement(event) {
        if (
            !active ||
            active.type !== "rotate"
        ) {
            return;
        }

        if (
            event.pointerId !==
            active.pointerId
        ) {
            return;
        }

        const dx =
            event.clientX -
            active.centerX;

        const dy =
            event.clientY -
            active.centerY;

        if (
            Math.abs(dx) >
                MOVE_THRESHOLD ||
            Math.abs(dy) >
                MOVE_THRESHOLD
        ) {
            active.moved = true;
        }

        let angle =
            Math.atan2(
                dy,
                dx
            ) *
            180 /
            Math.PI;

        angle += 90;

        /*
         * Shift = snap cada 15 grados.
         */

        if (event.shiftKey) {
            angle =
                Math.round(
                    angle / 15
                ) * 15;
        }

        active.element.style.setProperty(
            "--editor-rotation",
            `${normalizeRotation(angle)}deg`
        );

        active.element.dataset.editorRotation =
            String(normalizeRotation(angle));

        event.preventDefault();
    }

    // --------------------------------------------------
    // NORMALIZACIÓN
    // --------------------------------------------------

    function normalizeElement(
        element
    ) {
        if (!element) return;

        const geometry =
            readGeometry(element);

        if (!geometry) return;

        const size =
            getCanvasSize();

        let width =
            clamp(
                geometry.width,
                MIN_WIDTH,
                Math.max(
                    MIN_WIDTH,
                    size.width
                )
            );

        let height =
            clamp(
                geometry.height,
                MIN_HEIGHT,
                Math.max(
                    MIN_HEIGHT,
                    size.height
                )
            );

        let x =
            clamp(
                geometry.x,
                0,
                Math.max(
                    0,
                    size.width -
                        width
                )
            );

        let y =
            clamp(
                geometry.y,
                0,
                Math.max(
                    0,
                    size.height -
                        height
                )
            );

        applyGeometry(
            element,
            x,
            y,
            width,
            height,
            geometry.rotation
        );
    }

    function normalizeAll() {
        getElements().forEach(
            normalizeElement
        );
    }

    // --------------------------------------------------
    // FIN DE GESTO
    // --------------------------------------------------

    function finish(event) {
        if (!active) return;

        if (
            event.pointerId !== undefined &&
            event.pointerId !==
                active.pointerId
        ) {
            return;
        }

        const element =
            active.element;

        element.classList.remove(
            "editor-moving",
            "editor-resizing",
            "editor-rotating"
        );

        removeGuides();

        refreshHandles(element);

        document.dispatchEvent(
            new CustomEvent(
                "plugindex:manipulationend",
                {
                    detail: {
                        element,
                        type:
                            active.type,
                        moved:
                            active.moved
                    }
                }
            )
        );

        document.dispatchEvent(
            new CustomEvent(
                "plugindex:elementchange",
                {
                    detail: {
                        element,
                        type:
                            active.type
                    }
                }
            )
        );

        active = null;
    }

    // --------------------------------------------------
    // POINTER DOWN
    // --------------------------------------------------

    function onPointerDown(event) {
        const element =
            event.target.closest(
                ELEMENT_SELECTOR
            );

        if (!element) return;

        /*
         * No permitir que los handles sean interpretados
         * como parte del elemento.
         */

        const resize =
            event.target.closest(
                HANDLE_SELECTOR
            );

        if (resize) {
            beginResize(
                event,
                element,
                resize.dataset.resize
            );

            return;
        }

        const rotate =
            event.target.closest(
                ROTATE_SELECTOR
            );

        if (rotate) {
            beginRotate(
                event,
                element
            );

            return;
        }

        /*
         * Los elementos se controlan desde el editor.
         * Los controles internos no deben ejecutar acciones
         * mientras estamos editando.
         */

        if (
            event.target.closest(
                "input, textarea, select"
            )
        ) {
            return;
        }

        beginMove(
            event,
            element
        );
    }

    // --------------------------------------------------
    // POINTER MOVE
    // --------------------------------------------------

    function onPointerMove(event) {
        if (!active) return;

        if (
            active.type === "move"
        ) {
            moveElement(event);
        }

        else if (
            active.type === "resize"
        ) {
            resizeElement(event);
        }

        else if (
            active.type === "rotate"
        ) {
            rotateElement(event);
        }
    }

    // --------------------------------------------------
    // SELECCIÓN CAMBIÓ
    // --------------------------------------------------

    function onSelectionChange(event) {
        const selected =
            event.detail?.elements ||
            [];

        document
            .querySelectorAll(
                ".page-element, .pd-element"
            )
            .forEach(element => {
                const isSelected =
                    selected.includes(
                        element
                    ) ||
                    element.classList.contains(
                        "editor-selected"
                    ) ||
                    element.classList.contains(
                        "selected"
                    );

                if (isSelected) {
                    createHandles(element);
                } else {
                    removeHandles(element);
                }
            });
    }

    // --------------------------------------------------
    // CLICK
    // --------------------------------------------------

    let suppressClick = false;

    document.addEventListener(
        "click",
        event => {
            if (!suppressClick) return;

            suppressClick = false;

            event.preventDefault();
            event.stopPropagation();
        },
        true
    );

    // --------------------------------------------------
    // EVENTOS
    // --------------------------------------------------

    document.addEventListener(
        "pointerdown",
        onPointerDown,
        {
            passive: false
        }
    );

    document.addEventListener(
        "pointermove",
        onPointerMove,
        {
            passive: false
        }
    );

    document.addEventListener(
        "pointerup",
        event => {
            if (
                active?.moved
            ) {
                suppressClick = true;
            }

            finish(event);
        },
        {
            passive: false
        }
    );

    document.addEventListener(
        "pointercancel",
        finish,
        {
            passive: false
        }
    );

    document.addEventListener(
        "plugindex:selectionchange",
        onSelectionChange
    );

    // --------------------------------------------------
    // RESIZE DEL CANVAS
    // --------------------------------------------------

    function watchCanvas() {
        const canvas =
            getCanvas();

        if (!canvas) return;

        if (
            typeof ResizeObserver ===
            "undefined"
        ) {
            return;
        }

        const observer =
            new ResizeObserver(() => {
                normalizeAll();

                getSelectedElements()
                    .forEach(
                        refreshHandles
                    );
            });

        observer.observe(canvas);

        selectionObserver =
            observer;
    }

    // --------------------------------------------------
    // API
    // --------------------------------------------------

    window.PluginDexManipulator = {
        createHandles,
        removeHandles,
        refreshHandles,
        refreshAllHandles,

        normalizeElement,
        normalizeAll,

        getGeometry:
            readGeometry,

        applyGeometry,

        getCanvas,

        getCanvasSize,

        getCanvasScale,

        isManipulating() {
            return !!active;
        },

        cancel() {
            if (!active) return;

            active.element.classList.remove(
                "editor-moving",
                "editor-resizing",
                "editor-rotating"
            );

            removeGuides();

            active = null;
        }
    };

    // --------------------------------------------------
    // INIT
    // --------------------------------------------------

    function init() {
        /*
         * Esperamos a que el resto del editor haya construido
         * el lienzo.
         */

        requestAnimationFrame(() => {
            normalizeAll();
            refreshAllHandles();
            watchCanvas();
        });
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
