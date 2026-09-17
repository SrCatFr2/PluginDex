/* =============================================================
   PLUGINDEX
   APP ENGINE
   funciones/app.js
============================================================= */

(() => {

    "use strict";


    /* =========================================================
       DOM
    ========================================================= */

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        [...root.querySelectorAll(selector)];


    const app = $("#app");
    const workspace = $("#workspace");

    const designPage = $("#designPage");
    const canvasStage = $("#canvasStage");

    const zoomValue = $("#zoomValue");

    const inspector = $("#inspector");
    const inspectorEmpty = $("#inspectorEmpty");
    const inspectorProperties = $("#inspectorProperties");

    const selectedElementName = $("#selectedElementName");

    const opacityRange = $("#opacityRange");
    const opacityValue = $("#opacityValue");

    const scaleRange = $("#scaleRange");
    const scaleValue = $("#scaleValue");

    const customColor = $("#customColor");

    const smokeToggle = $("#smokeToggle");
    const motionToggle = $("#motionToggle");

    const wallpaper = $("#wallpaper");

    const toast = $("#toast");
    const toastText = $("#toastText");


    /* =========================================================
       ESTADO
    ========================================================= */

    const state = {

        selected: null,

        zoom: 1,

        wallpaper: "black",

        smoke: true,

        motion: true,

        preview: false,

        history: [],

        historyIndex: -1,

        historyLock: false,

        saveTimer: null,

        toastTimer: null,

        elementCounter: 10

    };


    /* =========================================================
       CONSTANTES
    ========================================================= */

    const STORAGE_KEY = "plugindex-project-v4";

    const ZOOM_MIN = 0.5;
    const ZOOM_MAX = 2;


    /* =========================================================
       UTILIDADES
    ========================================================= */

    function clamp(value, min, max) {
        return Math.min(
            Math.max(value, min),
            max
        );
    }


    function escapeHTML(value) {

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    function getElementId(element) {

        return element?.dataset?.elementId || null;

    }


    function getElements() {

        return $$(".page-element", designPage);

    }


    function getSelected() {

        return state.selected;

    }


    /* =========================================================
       TOAST
    ========================================================= */

    function showToast(message) {

        if (!toast || !toastText) return;

        toastText.textContent = message;

        toast.classList.add("visible");

        clearTimeout(state.toastTimer);

        state.toastTimer = setTimeout(() => {

            toast.classList.remove("visible");

        }, 1800);

    }


    /* =========================================================
       PROYECTO
    ========================================================= */

    function serializeProject() {

        return {

            version: 4,

            zoom: state.zoom,

            wallpaper: state.wallpaper,

            smoke: state.smoke,

            motion: state.motion,

            elementCounter: state.elementCounter,

            elements: getElements().map(element => {

                const editable =
                    $(".editable-text", element);

                const computed =
                    getComputedStyle(element);

                return {

                    id: element.dataset.elementId,

                    type: element.dataset.elementType,

                    text: editable
                        ? editable.textContent.trim()
                        : "",

                    x:
                        parseFloat(
                            element.style.getPropertyValue(
                                "--element-x"
                            )
                        ) || 0,

                    y:
                        parseFloat(
                            element.style.getPropertyValue(
                                "--element-y"
                            )
                        ) || 0,

                    opacity:
                        parseFloat(
                            element.style.opacity ||
                            computed.opacity ||
                            "1"
                        ),

                    scale:
                        parseFloat(
                            element.dataset.scale ||
                            "1"
                        ),

                    color:
                        element.dataset.color ||
                        null

                };

            })

        };

    }


    function saveProject(silent = false) {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    serializeProject()
                )
            );

            if (!silent) {

                showToast(
                    "Proyecto guardado"
                );

            }

        } catch (error) {

            console.error(
                "[PluginDex] Error guardando proyecto:",
                error
            );

            showToast(
                "No se pudo guardar"
            );

        }

    }


    function scheduleSave() {

        clearTimeout(
            state.saveTimer
        );

        state.saveTimer = setTimeout(() => {

            saveProject(true);

        }, 450);

    }


    function loadProject() {

        try {

            const raw =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (!raw) return false;

            const data =
                JSON.parse(raw);

            if (!data || typeof data !== "object") {
                return false;
            }


            if (
                Number.isFinite(data.zoom)
            ) {

                state.zoom = clamp(
                    data.zoom,
                    ZOOM_MIN,
                    ZOOM_MAX
                );

            }


            if (typeof data.wallpaper === "string") {

                state.wallpaper =
                    data.wallpaper;

            }


            if (typeof data.smoke === "boolean") {

                state.smoke =
                    data.smoke;

            }


            if (typeof data.motion === "boolean") {

                state.motion =
                    data.motion;

            }


            if (
                Number.isFinite(
                    data.elementCounter
                )
            ) {

                state.elementCounter =
                    data.elementCounter;

            }


            if (Array.isArray(data.elements)) {

                restoreElements(
                    data.elements
                );

            }


            return true;

        } catch (error) {

            console.warn(
                "[PluginDex] Proyecto inválido:",
                error
            );

            return false;

        }

    }


    function restoreElements(elements) {

        getElements().forEach(
            element => element.remove()
        );

        elements.forEach(data => {

            createElement(
                data.type,
                {
                    id: data.id,
                    text: data.text,
                    x: data.x,
                    y: data.y,
                    opacity: data.opacity,
                    scale: data.scale,
                    color: data.color
                },
                false
            );

        });

    }


    /* =========================================================
       HISTORIAL
    ========================================================= */

    function captureHistory() {

        if (state.historyLock) {
            return;
        }

        const snapshot =
            JSON.stringify(
                serializeProject()
            );


        if (
            state.history[
                state.historyIndex
            ] === snapshot
        ) {
            return;
        }


        state.history =
            state.history.slice(
                0,
                state.historyIndex + 1
            );


        state.history.push(
            snapshot
        );


        if (
            state.history.length > 50
        ) {

            state.history.shift();

        }


        state.historyIndex =
            state.history.length - 1;

    }


    function restoreSnapshot(snapshot) {

        if (!snapshot) return;

        try {

            const data =
                JSON.parse(snapshot);

            state.historyLock = true;

            state.zoom =
                clamp(
                    Number(data.zoom) || 1,
                    ZOOM_MIN,
                    ZOOM_MAX
                );

            state.wallpaper =
                data.wallpaper || "black";

            state.smoke =
                data.smoke !== false;

            state.motion =
                data.motion !== false;

            state.elementCounter =
                Number(
                    data.elementCounter
                ) || 10;


            restoreElements(
                Array.isArray(data.elements)
                    ? data.elements
                    : []
            );


            applyZoom();

            applyWallpaper();

            applySmoke();

            applyMotion();

            selectElement(null);

        } catch (error) {

            console.error(
                "[PluginDex] Error restaurando:",
                error
            );

        } finally {

            state.historyLock = false;

        }

    }


    function undo() {

        if (
            state.historyIndex <= 0
        ) {

            showToast(
                "Nada que deshacer"
            );

            return;

        }


        state.historyIndex--;

        restoreSnapshot(
            state.history[
                state.historyIndex
            ]
        );

        scheduleSave();

    }


    function redo() {

        if (
            state.historyIndex >=
            state.history.length - 1
        ) {

            showToast(
                "Nada que rehacer"
            );

            return;

        }


        state.historyIndex++;

        restoreSnapshot(
            state.history[
                state.historyIndex
            ]
        );

        scheduleSave();

    }


    /* =========================================================
       ZOOM
    ========================================================= */

    function applyZoom() {

        if (!canvasStage) return;

        canvasStage.style.setProperty(
            "--canvas-zoom",
            state.zoom
        );


        if (zoomValue) {

            zoomValue.textContent =
                `${Math.round(
                    state.zoom * 100
                )}%`;

        }

    }


    function setZoom(value) {

        state.zoom =
            clamp(
                Number(value),
                ZOOM_MIN,
                ZOOM_MAX
            );

        applyZoom();

    }


    function zoomIn() {

        setZoom(
            state.zoom + 0.1
        );

    }


    function zoomOut() {

        setZoom(
            state.zoom - 0.1
        );

    }


    function resetZoom() {

        setZoom(1);

    }


    /* =========================================================
       WALLPAPER
    ========================================================= */

    const wallpaperPresets = {

        black: {

            background:
                "radial-gradient(circle at 50% 30%, rgba(255,255,255,.055), transparent 34%), linear-gradient(135deg,#020203,#08090b 52%,#020203)"

        },

        silver: {

            background:
                "radial-gradient(circle at 30% 25%, rgba(255,255,255,.12), transparent 30%), linear-gradient(135deg,#08090b,#1a1d21 48%,#050506)"

        },

        blue: {

            background:
                "radial-gradient(circle at 30% 20%, rgba(80,120,255,.16), transparent 32%), linear-gradient(135deg,#020307,#080d18 55%,#020204)"

        },

        violet: {

            background:
                "radial-gradient(circle at 65% 20%, rgba(145,90,255,.15), transparent 30%), linear-gradient(135deg,#050307,#100918 55%,#020203)"

        }

    };


    function applyWallpaper() {

        const preset =
            wallpaperPresets[
                state.wallpaper
            ] ||
            wallpaperPresets.black;


        if (wallpaper) {

            wallpaper.style.background =
                preset.background;

        }


        $$("[data-wallpaper]").forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.wallpaper ===
                    state.wallpaper
                );

            }
        );

    }


    function setWallpaper(name) {

        if (
            !wallpaperPresets[name]
        ) {
            return;
        }


        state.wallpaper =
            name;

        applyWallpaper();

        captureHistory();

        scheduleSave();

    }


    /* =========================================================
       HUMO
    ========================================================= */

    function applySmoke() {

        document.body.classList.toggle(
            "smoke-disabled",
            !state.smoke
        );


        if (smokeToggle) {

            smokeToggle.checked =
                state.smoke;

        }

    }


    function setSmoke(enabled) {

        state.smoke =
            Boolean(enabled);

        applySmoke();

        captureHistory();

        scheduleSave();

    }


    /* =========================================================
       MOVIMIENTO
    ========================================================= */

    function applyMotion() {

        document.body.classList.toggle(
            "motion-disabled",
            !state.motion
        );


        if (motionToggle) {

            motionToggle.checked =
                state.motion;

        }


        if (
            window.PluginDexOptimization
        ) {

            window.PluginDexOptimization
                .setEffects({
                    motion: state.motion
                });

        }

    }


    function setMotion(enabled) {

        state.motion =
            Boolean(enabled);

        applyMotion();

        captureHistory();

        scheduleSave();

    }


    /* =========================================================
       SELECCIÓN
    ========================================================= */

    function selectElement(element) {

        getElements().forEach(
            item => {

                item.classList.toggle(
                    "selected",
                    item === element
                );

            }
        );


        state.selected =
            element || null;


        if (!element) {

            showEmptyInspector();

            updateLayerSelection(
                null
            );

            return;

        }


        showInspector(
            element
        );

        updateLayerSelection(
            element
        );

    }


    function showEmptyInspector() {

        if (inspector) {

            inspector.classList.remove(
                "visible"
            );

        }


        if (inspectorEmpty) {

            inspectorEmpty.hidden =
                false;

        }


        if (inspectorProperties) {

            inspectorProperties.hidden =
                true;

        }

    }


    function showInspector(element) {

        if (inspector) {

            inspector.classList.add(
                "visible"
            );

        }


        if (inspectorEmpty) {

            inspectorEmpty.hidden =
                true;

        }


        if (inspectorProperties) {

            inspectorProperties.hidden =
                false;

        }


        const type =
            element.dataset.elementType ||
            "element";


        const names = {

            heading: "Título",

            text: "Texto",

            button: "Botón",

            image: "Imagen"

        };


        if (selectedElementName) {

            selectedElementName.textContent =
                names[type] ||
                "Elemento";

        }


        const opacity =
            parseFloat(
                element.style.opacity ||
                "1"
            );


        const scale =
            parseFloat(
                element.dataset.scale ||
                "1"
            );


        if (opacityRange) {

            opacityRange.value =
                Math.round(
                    opacity * 100
                );

        }


        if (opacityValue) {

            opacityValue.textContent =
                `${Math.round(
                    opacity * 100
                )}%`;

        }


        if (scaleRange) {

            scaleRange.value =
                Math.round(
                    scale * 100
                );

        }


        if (scaleValue) {

            scaleValue.textContent =
                `${Math.round(
                    scale * 100
                )}%`;

        }


        updateColorButtons(
            element.dataset.color
        );

    }


    function updateColorButtons(color) {

        $$(".color-chip").forEach(
            chip => {

                chip.classList.toggle(
                    "active",
                    chip.dataset.color ===
                    color
                );

            }
        );


        if (
            customColor &&
            color
        ) {

            try {

                customColor.value =
                    color;

            } catch {

                // Color inválido.
            }

        }

    }


    /* =========================================================
       CAPAS
    ========================================================= */

    function updateLayerSelection(
        element
    ) {

        const id =
            getElementId(element);


        $$("[data-layer-select]").forEach(
            layer => {

                layer.classList.toggle(
                    "active",
                    layer.dataset.layerSelect ===
                    id
                );

            }
        );

    }


    function selectLayer(id) {

        const element =
            getElements().find(
                item =>
                    item.dataset.elementId ===
                    id
            );


        if (element) {

            selectElement(
                element
            );

        }

    }


    /* =========================================================
       ELEMENTOS
    ========================================================= */

    function nextElementId(type) {

        state.elementCounter++;

        return `${type}-${state.elementCounter}`;

    }


    function getDefaultText(type) {

        const texts = {

            heading:
                "Nuevo título",

            text:
                "Nuevo texto",

            button:
                "Botón",

            image:
                "Imagen"

        };


        return (
            texts[type] ||
            "Elemento"
        );

    }


    function createElement(
        type,
        options = {},
        record = true
    ) {

        const validTypes = [
            "heading",
            "text",
            "button",
            "image"
        ];


        if (
            !validTypes.includes(type)
        ) {

            return null;

        }


        const id =
            options.id ||
            nextElementId(type);


        const element =
            document.createElement(
                type === "button"
                    ? "button"
                    : "div"
            );


        element.className =
            `page-element page-${type}`;


        element.dataset.element =
            "";

        element.dataset.elementId =
            id;

        element.dataset.elementType =
            type;


        element.style.setProperty(
            "--element-x",
            `${Number(
                options.x ?? 100
            )}px`
        );


        element.style.setProperty(
            "--element-y",
            `${Number(
                options.y ?? 100
            )}px`
        );


        const opacity =
            Number(
                options.opacity ?? 1
            );


        const scale =
            Number(
                options.scale ?? 1
            );


        element.style.opacity =
            clamp(
                opacity,
                0.2,
                1
            );


        element.dataset.scale =
            clamp(
                scale,
                0.5,
                1.8
            );


        if (options.color) {

            element.dataset.color =
                options.color;

        }


        if (
            type === "image"
        ) {

            element.innerHTML = `

                <div class="generated-image-placeholder">

                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                    >
                        <rect
                            x="4"
                            y="5"
                            width="16"
                            height="14"
                            rx="2"
                            stroke="currentColor"
                            stroke-width="1.5"
                        />

                        <circle
                            cx="9"
                            cy="10"
                            r="1.5"
                            stroke="currentColor"
                            stroke-width="1.5"
                        />

                        <path
                            d="m5 17 4-4 3 3 2-2 5 5"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linejoin="round"
                        />
                    </svg>

                    <span>
                        ${escapeHTML(
                            options.text ||
                            "Imagen"
                        )}
                    </span>

                </div>

            `;

        } else {

            const span =
                document.createElement(
                    "span"
                );

            span.className =
                "editable-text";

            span.textContent =
                options.text ||
                getDefaultText(type);


            element.appendChild(
                span
            );

        }


        designPage.appendChild(
            element
        );


        setupElement(
            element
        );


        if (record) {

            captureHistory();

            scheduleSave();

        }


        return element;

    }


    function setupElement(element) {

        if (
            element.dataset.initialized ===
            "true"
        ) {

            return;

        }


        element.dataset.initialized =
            "true";


        element.addEventListener(
            "pointerdown",
            event => {

                if (
                    event.button !== 0 &&
                    event.pointerType ===
                    "mouse"
                ) {
                    return;
                }


                if (
                    event.target.closest(
                        "button"
                    ) &&
                    element.tagName !==
                    "BUTTON"
                ) {
                    return;
                }


                event.stopPropagation();

                selectElement(
                    element
                );

            }
        );


        element.addEventListener(
            "dblclick",
            event => {

                event.stopPropagation();

                editElementText(
                    element
                );

            }
        );

    }


    function editElementText(element) {

        const editable =
            $(".editable-text", element);


        if (!editable) {
            return;
        }


        const current =
            editable.textContent.trim();


        const next =
            window.prompt(
                "Editar texto",
                current
            );


        if (
            next === null
        ) {

            return;

        }


        editable.textContent =
            next;


        captureHistory();

        scheduleSave();

        showToast(
            "Texto actualizado"
        );

    }


    /* =========================================================
       INSPECTOR
    ========================================================= */

    function updateSelectedOpacity(
        value
    ) {

        const element =
            getSelected();


        if (!element) return;


        const opacity =
            clamp(
                Number(value) / 100,
                0.2,
                1
            );


        element.style.opacity =
            opacity;


        if (opacityValue) {

            opacityValue.textContent =
                `${Math.round(
                    opacity * 100
                )}%`;

        }


        scheduleSave();

    }


    function updateSelectedScale(
        value
    ) {

        const element =
            getSelected();


        if (!element) return;


        const scale =
            clamp(
                Number(value) / 100,
                0.5,
                1.8
            );


        element.dataset.scale =
            scale;


        element.style.setProperty(
            "--element-scale",
            scale
        );


        if (scaleValue) {

            scaleValue.textContent =
                `${Math.round(
                    scale * 100
                )}%`;

        }


        scheduleSave();

    }


    function updateSelectedColor(
        color
    ) {

        const element =
            getSelected();


        if (!element) return;


        element.dataset.color =
            color;


        element.style.setProperty(
            "--element-color",
            color
        );


        const type =
            element.dataset.elementType;


        if (
            type === "heading" ||
            type === "text"
        ) {

            element.style.color =
                color;

        }


        if (
            type === "button"
        ) {

            element.style.setProperty(
                "--button-color",
                color
            );

        }


        updateColorButtons(
            color
        );


        captureHistory();

        scheduleSave();

    }


    /* =========================================================
       EVENTOS GENERALES
    ========================================================= */

    function setupGlobalEvents() {


        /* -----------------------------------------------------
           ACCIONES
        ----------------------------------------------------- */

        document.addEventListener(
            "click",
            event => {

                const action =
                    event.target.closest(
                        "[data-action]"
                    );


                if (!action) {
                    return;
                }


                const value =
                    action.dataset.action;


                switch (value) {

                    case "add":

                        if (
                            window.PluginDexWindows
                        ) {

                            window.PluginDexWindows
                                .open("elements");

                        }

                        break;


                    case "undo":

                        undo();

                        break;


                    case "redo":

                        redo();

                        break;


                    case "zoom-in":

                        zoomIn();

                        break;


                    case "zoom-out":

                        zoomOut();

                        break;


                    case "zoom-reset":

                        resetZoom();

                        break;


                    case "save":

                        saveProject();

                        break;


                    case "reset-layout":

                        if (
                            window.PluginDexWindows
                        ) {

                            window.PluginDexWindows
                                .reset();

                        }

                        break;


                    case "preview":

                        togglePreview();

                        break;

                }

            }
        );


        /* -----------------------------------------------------
           CREAR ELEMENTOS
        ----------------------------------------------------- */

        document.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-create-element]"
                    );


                if (!button) {
                    return;
                }


                const type =
                    button.dataset.createElement;


                const element =
                    createElement(
                        type
                    );


                if (element) {

                    selectElement(
                        element
                    );

                    showToast(
                        `${type} añadido`
                    );

                }

            }
        );


        /* -----------------------------------------------------
           CAPAS
        ----------------------------------------------------- */

        document.addEventListener(
            "click",
            event => {

                const layer =
                    event.target.closest(
                        "[data-layer-select]"
                    );


                if (!layer) {
                    return;
                }


                selectLayer(
                    layer.dataset.layerSelect
                );

            }
        );


        /* -----------------------------------------------------
           WALLPAPER
        ----------------------------------------------------- */

        document.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-wallpaper]"
                    );


                if (!button) {
                    return;
                }


                setWallpaper(
                    button.dataset.wallpaper
                );

            }
        );


        /* -----------------------------------------------------
           OPACIDAD
        ----------------------------------------------------- */

        if (opacityRange) {

            opacityRange.addEventListener(
                "input",
                event => {

                    updateSelectedOpacity(
                        event.target.value
                    );

                }
            );


            opacityRange.addEventListener(
                "change",
                () => {

                    captureHistory();

                }
            );

        }


        /* -----------------------------------------------------
           ESCALA
        ----------------------------------------------------- */

        if (scaleRange) {

            scaleRange.addEventListener(
                "input",
                event => {

                    updateSelectedScale(
                        event.target.value
                    );

                }
            );


            scaleRange.addEventListener(
                "change",
                () => {

                    captureHistory();

                }
            );

        }


        /* -----------------------------------------------------
           COLOR
        ----------------------------------------------------- */

        document.addEventListener(
            "click",
            event => {

                const chip =
                    event.target.closest(
                        ".color-chip"
                    );


                if (!chip) {
                    return;
                }


                updateSelectedColor(
                    chip.dataset.color
                );

            }
        );


        if (customColor) {

            customColor.addEventListener(
                "input",
                event => {

                    updateSelectedColor(
                        event.target.value
                    );

                }
            );

        }


        /* -----------------------------------------------------
           HUMO
        ----------------------------------------------------- */

        if (smokeToggle) {

            smokeToggle.addEventListener(
                "change",
                event => {

                    setSmoke(
                        event.target.checked
                    );

                }
            );

        }


        /* -----------------------------------------------------
           MOVIMIENTO
        ----------------------------------------------------- */

        if (motionToggle) {

            motionToggle.addEventListener(
                "change",
                event => {

                    setMotion(
                        event.target.checked
                    );

                }
            );

        }


        /* -----------------------------------------------------
           CLICK EN CANVAS
        ----------------------------------------------------- */

        if (designPage) {

            designPage.addEventListener(
                "pointerdown",
                event => {

                    if (
                        event.target ===
                        designPage
                    ) {

                        selectElement(
                            null
                        );

                    }

                }
            );

        }


        /* -----------------------------------------------------
           WHEEL ZOOM
        ----------------------------------------------------- */

        if (canvasStage) {

            canvasStage.addEventListener(
                "wheel",
                event => {

                    if (
                        !event.ctrlKey &&
                        !event.metaKey
                    ) {
                        return;
                    }


                    event.preventDefault();


                    const amount =
                        event.deltaY > 0
                            ? -0.05
                            : 0.05;


                    setZoom(
                        state.zoom +
                        amount
                    );

                },
                {
                    passive: false
                }
            );

        }


        /* -----------------------------------------------------
           TECLADO
        ----------------------------------------------------- */

        document.addEventListener(
            "keydown",
            event => {

                const modifier =
                    event.ctrlKey ||
                    event.metaKey;


                if (
                    modifier &&
                    event.key.toLowerCase() ===
                    "s"
                ) {

                    event.preventDefault();

                    saveProject();

                    return;

                }


                if (
                    modifier &&
                    event.key.toLowerCase() ===
                    "z"
                ) {

                    event.preventDefault();

                    if (event.shiftKey) {

                        redo();

                    } else {

                        undo();

                    }

                    return;

                }


                if (
                    modifier &&
                    event.key.toLowerCase() ===
                    "y"
                ) {

                    event.preventDefault();

                    redo();

                    return;

                }


                if (
                    event.key ===
                    "Escape"
                ) {

                    selectElement(
                        null
                    );

                }

            }
        );

    }


    /* =========================================================
       PREVIEW
    ========================================================= */

    function togglePreview() {

        state.preview =
            !state.preview;


        document.body.classList.toggle(
            "preview-mode",
            state.preview
        );


        if (state.preview) {

            showToast(
                "Vista previa"
            );

        } else {

            showToast(
                "Editor"
            );

        }

    }


    /* =========================================================
       ARRASTRE DE ELEMENTOS
    ========================================================= */

    let elementDrag = null;

    let elementDragFrame = 0;


    function setupElementDragging() {

        if (!designPage) {
            return;
        }


        designPage.addEventListener(
            "pointerdown",
            event => {

                const element =
                    event.target.closest(
                        ".page-element"
                    );


                if (!element) {
                    return;
                }


                if (
                    event.pointerType ===
                    "mouse" &&
                    event.button !== 0
                ) {
                    return;
                }


                if (
                    event.target.closest(
                        "button"
                    ) &&
                    element.tagName !==
                    "BUTTON"
                ) {
                    return;
                }


                const rect =
                    element.getBoundingClientRect();


                const pageRect =
                    designPage.getBoundingClientRect();


                const zoom =
                    state.zoom;


                const startX =
                    event.clientX;


                const startY =
                    event.clientY;


                const startLeft =
                    parseFloat(
                        element.style.getPropertyValue(
                            "--element-x"
                        )
                    ) || 0;


                const startTop =
                    parseFloat(
                        element.style.getPropertyValue(
                            "--element-y"
                        )
                    ) || 0;


                elementDrag = {

                    element,

                    startX,

                    startY,

                    startLeft,

                    startTop,

                    zoom,

                    currentX: startX,

                    currentY: startY

                };


                selectElement(
                    element
                );


                element.classList.add(
                    "is-dragging"
                );


                element.setPointerCapture(
                    event.pointerId
                );


                event.preventDefault();

            }
        );


        designPage.addEventListener(
            "pointermove",
            event => {

                if (!elementDrag) {
                    return;
                }


                elementDrag.currentX =
                    event.clientX;

                elementDrag.currentY =
                    event.clientY;


                if (
                    elementDragFrame
                ) {
                    return;
                }


                elementDragFrame =
                    requestAnimationFrame(
                        updateElementDrag
                    );

            }
        );


        designPage.addEventListener(
            "pointerup",
            finishElementDrag
        );


        designPage.addEventListener(
            "pointercancel",
            finishElementDrag
        );

    }


    function updateElementDrag() {

        elementDragFrame = 0;


        if (!elementDrag) {
            return;
        }


        const drag =
            elementDrag;


        const dx =
            (
                drag.currentX -
                drag.startX
            ) / drag.zoom;


        const dy =
            (
                drag.currentY -
                drag.startY
            ) / drag.zoom;


        const x =
            drag.startLeft +
            dx;


        const y =
            drag.startTop +
            dy;


        drag.element.style.setProperty(
            "--element-x",
            `${x}px`
        );


        drag.element.style.setProperty(
            "--element-y",
            `${y}px`
        );

    }


    function finishElementDrag() {

        if (!elementDrag) {
            return;
        }


        if (elementDragFrame) {

            cancelAnimationFrame(
                elementDragFrame
            );

            elementDragFrame = 0;

            updateElementDrag();

        }


        const element =
            elementDrag.element;


        element.classList.remove(
            "is-dragging"
        );


        elementDrag = null;


        captureHistory();

        scheduleSave();

    }


    /* =========================================================
       INICIALIZACIÓN DE ELEMENTOS
    ========================================================= */

    function initializeElements() {

        getElements().forEach(
            setupElement
        );

    }


    /* =========================================================
       ESTADO INICIAL
    ========================================================= */

    function createInitialHistory() {

        state.history = [
            JSON.stringify(
                serializeProject()
            )
        ];

        state.historyIndex = 0;

    }


    /* =========================================================
       OPTIMIZACIÓN
    ========================================================= */

    function connectOptimization() {

        if (
            !window.PluginDexOptimization
        ) {

            return;

        }


        window.PluginDexOptimization
            .init?.();

    }


    /* =========================================================
       VENTANAS
    ========================================================= */

    function connectWindows() {

        if (
            !window.PluginDexWindows
        ) {

            console.warn(
                "[PluginDex] Motor de ventanas no encontrado."
            );

            return;

        }


        window.PluginDexWindows.init?.({

            container:
                workspace

        });

    }


    /* =========================================================
       RESIZE
    ========================================================= */

    let resizeTimer = 0;


    function setupResize() {

        window.addEventListener(
            "resize",
            () => {

                clearTimeout(
                    resizeTimer
                );


                resizeTimer =
                    setTimeout(() => {

                        applyZoom();

                    }, 120);

            },
            {
                passive: true
            }
        );

    }


    /* =========================================================
       ESTADO DE RENDIMIENTO
    ========================================================= */

    function updatePerformanceLabel() {

        const label =
            $("#performanceStatus");


        if (
            !label ||
            !window.PluginDexOptimization
        ) {
            return;
        }


        const lowEnd =
            window.PluginDexOptimization
                .isLowEnd?.();


        label.textContent =
            lowEnd
                ? "Modo eficiente activo"
                : "Optimización automática activa";

    }


    /* =========================================================
       INICIO
    ========================================================= */

    function init() {

        if (!app) {

            console.error(
                "[PluginDex] App no encontrada."
            );

            return;

        }


        const loaded =
            loadProject();


        initializeElements();


        setupGlobalEvents();

        setupElementDragging();

        setupResize();


        applyZoom();

        applyWallpaper();

        applySmoke();

        applyMotion();


        if (!loaded) {

            createInitialHistory();

        } else {

            createInitialHistory();

        }


        /*
         * El inspector permanece oculto
         * hasta seleccionar un elemento.
         */

        selectElement(
            null
        );


        connectOptimization();

        connectWindows();

        updatePerformanceLabel();


        /*
         * Guardado inicial silencioso.
         */

        saveProject(true);


        console.log(
            "[PluginDex] Interface Engine iniciado."
        );

    }


    /* =========================================================
       API PÚBLICA
    ========================================================= */

    window.PluginDexApp = {

        getState() {

            return {
                ...state
            };

        },

        save() {

            saveProject();

        },

        undo,

        redo,

        zoomIn,

        zoomOut,

        resetZoom,

        selectElement,

        createElement,

        setWallpaper,

        setSmoke,

        setMotion,

        togglePreview

    };


    /* =========================================================
       DOM READY
    ========================================================= */

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
