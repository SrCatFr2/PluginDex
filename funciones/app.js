/* ============================================================
   PLUGINDEX
   APP ENGINE
   funciones/app.js

   RESPONSABILIDAD:
   - Estado general
   - Proyecto / localStorage
   - Historial
   - Creación de elementos
   - Inspector
   - Capas
   - Zoom
   - Wallpaper
   - Preview
   - Integración con módulos externos

   NO RESPONSABILIDAD:
   - Drag de elementos
   - Resize de elementos
   - Rotación
   - Selección física

   Eso pertenece a:
   editor/seleccion.js
   editor/manipulador.js
============================================================ */

(() => {

    "use strict";

    /* ============================================================
       DOM
    ============================================================ */

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        [...root.querySelectorAll(selector)];


    const app =
        $("#app");

    const workspace =
        $("#workspace");

    const designPage =
        $("#designPage");

    const canvasStage =
        $("#canvasStage");

    const zoomValue =
        $("#zoomValue");


    /* ============================================================
       INSPECTOR
    ============================================================ */

    const inspector =
        $("#inspector");

    const inspectorEmpty =
        $("#inspectorEmpty");

    const inspectorProperties =
        $("#inspectorProperties");

    const selectedElementName =
        $("#selectedElementName");

    const opacityRange =
        $("#opacityRange");

    const opacityValue =
        $("#opacityValue");

    const scaleRange =
        $("#scaleRange");

    const scaleValue =
        $("#scaleValue");

    const customColor =
        $("#customColor");


    /* ============================================================
       AMBIENTE
    ============================================================ */

    const smokeToggle =
        $("#smokeToggle");

    const motionToggle =
        $("#motionToggle");

    const wallpaper =
        $("#wallpaper");


    /* ============================================================
       UI
    ============================================================ */

    const toast =
        $("#toast");

    const toastText =
        $("#toastText");


    /* ============================================================
       ESTADO
    ============================================================ */

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

        elementCounter: 10,

        initialized: false

    };


    /* ============================================================
       CONSTANTES
    ============================================================ */

    const STORAGE_KEY =
        "plugindex-project-v5";

    const BLOCK_STORAGE_KEY =
        "plugindex-blocks-v1";

    const ZOOM_MIN =
        0.5;

    const ZOOM_MAX =
        2;

    const MAX_HISTORY =
        60;


    /* ============================================================
       UTILIDADES
    ============================================================ */

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


    function number(
        value,
        fallback = 0
    ) {

        const parsed =
            Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : fallback;

    }


    function escapeHTML(value) {

        return String(value)
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );

    }


    function getElements() {

        if (!designPage) {
            return [];
        }

        return $$(".page-element", designPage);

    }


    function getElementId(element) {

        return (
            element?.dataset?.elementId ||
            null
        );

    }


    function findElement(id) {

        if (!id) {
            return null;
        }

        return getElements().find(
            element =>
                element.dataset.elementId === id
        ) || null;

    }


    /* ============================================================
       TOAST
    ============================================================ */

    function showToast(message) {

        if (!toast || !toastText) {
            return;
        }

        toastText.textContent =
            message;

        toast.classList.add(
            "visible"
        );

        clearTimeout(
            state.toastTimer
        );

        state.toastTimer =
            setTimeout(() => {

                toast.classList.remove(
                    "visible"
                );

            }, 1800);

    }


    /* ============================================================
       ELEMENT STATE
    ============================================================ */

    function getElementPosition(element) {

        if (!element) {
            return {
                x: 0,
                y: 0
            };
        }

        /*
         * El manipulador nuevo trabaja con
         * left/top.
         *
         * Pero mantenemos --element-x / --element-y
         * para compatibilidad con proyectos antiguos.
         */

        const left =
            parseFloat(
                element.style.left
            );

        const top =
            parseFloat(
                element.style.top
            );

        const variableX =
            parseFloat(
                element.style.getPropertyValue(
                    "--element-x"
                )
            );

        const variableY =
            parseFloat(
                element.style.getPropertyValue(
                    "--element-y"
                )
            );

        return {

            x: Number.isFinite(left)
                ? left
                : (
                    Number.isFinite(variableX)
                        ? variableX
                        : 0
                ),

            y: Number.isFinite(top)
                ? top
                : (
                    Number.isFinite(variableY)
                        ? variableY
                        : 0
                )

        };

    }


    function syncElementPosition(element) {

        if (!element) {
            return;
        }

        const position =
            getElementPosition(
                element
            );

        element.style.setProperty(
            "--element-x",
            `${position.x}px`
        );

        element.style.setProperty(
            "--element-y",
            `${position.y}px`
        );

    }


    function getElementText(element) {

        if (!element) {
            return "";
        }

        const editable =
            $(".editable-text", element);

        if (editable) {
            return editable.textContent.trim();
        }

        const placeholder =
            $(".generated-image-placeholder span", element);

        if (placeholder) {
            return placeholder.textContent.trim();
        }

        return "";

    }


    /* ============================================================
       PROYECTO
    ============================================================ */

    function serializeProject() {

        return {

            version: 5,

            zoom:
                state.zoom,

            wallpaper:
                state.wallpaper,

            smoke:
                state.smoke,

            motion:
                state.motion,

            elementCounter:
                state.elementCounter,

            elements:
                getElements().map(
                    element => {

                        syncElementPosition(
                            element
                        );

                        const position =
                            getElementPosition(
                                element
                            );

                        const computed =
                            getComputedStyle(
                                element
                            );

                        return {

                            id:
                                element.dataset.elementId,

                            type:
                                element.dataset.elementType ||
                                "element",

                            text:
                                getElementText(
                                    element
                                ),

                            x:
                                position.x,

                            y:
                                position.y,

                            width:
                                element.style.width ||
                                "",

                            height:
                                element.style.height ||
                                "",

                            rotation:
                                element.style.getPropertyValue(
                                    "--editor-rotation"
                                ) || "0deg",

                            opacity:
                                number(
                                    element.style.opacity ||
                                    computed.opacity,
                                    1
                                ),

                            scale:
                                number(
                                    element.dataset.scale,
                                    1
                                ),

                            color:
                                element.dataset.color ||
                                null,

                            locked:
                                element.dataset.locked ===
                                "true",

                            hidden:
                                element.dataset.hidden ===
                                "true"

                        };

                    }
                )

        };

    }


    function saveProject(
        silent = false
    ) {

        try {

            const project =
                serializeProject();

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(project)
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

            if (!silent) {

                showToast(
                    "No se pudo guardar"
                );

            }

        }

    }


    function scheduleSave() {

        clearTimeout(
            state.saveTimer
        );

        state.saveTimer =
            setTimeout(
                () => {

                    saveProject(
                        true
                    );

                },
                400
            );

    }


    function loadProject() {

        try {

            const raw =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (!raw) {
                return false;
            }

            const data =
                JSON.parse(raw);

            if (
                !data ||
                typeof data !== "object"
            ) {
                return false;
            }


            state.zoom =
                clamp(
                    number(
                        data.zoom,
                        1
                    ),
                    ZOOM_MIN,
                    ZOOM_MAX
                );


            state.wallpaper =
                typeof data.wallpaper === "string"
                    ? data.wallpaper
                    : "black";


            state.smoke =
                data.smoke !== false;


            state.motion =
                data.motion !== false;


            state.elementCounter =
                Math.max(
                    10,
                    number(
                        data.elementCounter,
                        10
                    )
                );


            if (
                Array.isArray(
                    data.elements
                )
            ) {

                restoreElements(
                    data.elements
                );

            }


            return true;

        } catch (error) {

            console.warn(
                "[PluginDex] No se pudo cargar el proyecto:",
                error
            );

            return false;

        }

    }


    function restoreElements(
        elements
    ) {

        if (!designPage) {
            return;
        }

        getElements().forEach(
            element =>
                element.remove()
        );


        elements.forEach(
            data => {

                createElement(
                    data.type,
                    {
                        id:
                            data.id,

                        text:
                            data.text,

                        x:
                            data.x,

                        y:
                            data.y,

                        width:
                            data.width,

                        height:
                            data.height,

                        rotation:
                            data.rotation,

                        opacity:
                            data.opacity,

                        scale:
                            data.scale,

                        color:
                            data.color,

                        locked:
                            data.locked,

                        hidden:
                            data.hidden
                    },
                    false
                );

            }
        );

    }


    /* ============================================================
       HISTORIAL
    ============================================================ */

    function getSnapshot() {

        return JSON.stringify(
            serializeProject()
        );

    }


    function createInitialHistory() {

        const snapshot =
            getSnapshot();

        state.history = [
            snapshot
        ];

        state.historyIndex = 0;

    }


    function captureHistory() {

        if (
            state.historyLock
        ) {
            return;
        }

        const snapshot =
            getSnapshot();

        const current =
            state.history[
                state.historyIndex
            ];

        if (
            current === snapshot
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
            state.history.length >
            MAX_HISTORY
        ) {

            state.history.shift();

        }


        state.historyIndex =
            state.history.length - 1;

    }


    function restoreSnapshot(
        snapshot
    ) {

        if (!snapshot) {
            return;
        }

        try {

            const data =
                JSON.parse(
                    snapshot
                );

            state.historyLock =
                true;


            state.zoom =
                clamp(
                    number(
                        data.zoom,
                        1
                    ),
                    ZOOM_MIN,
                    ZOOM_MAX
                );


            state.wallpaper =
                data.wallpaper ||
                "black";


            state.smoke =
                data.smoke !== false;


            state.motion =
                data.motion !== false;


            state.elementCounter =
                Math.max(
                    10,
                    number(
                        data.elementCounter,
                        10
                    )
                );


            restoreElements(
                Array.isArray(
                    data.elements
                )
                    ? data.elements
                    : []
            );


            applyZoom();

            applyWallpaper();

            applySmoke();

            applyMotion();


            clearSelection();

        } catch (error) {

            console.error(
                "[PluginDex] Error restaurando snapshot:",
                error
            );

        } finally {

            state.historyLock =
                false;

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


    /* ============================================================
       ZOOM
    ============================================================ */

    function applyZoom() {

        if (!canvasStage) {
            return;
        }

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
                number(
                    value,
                    1
                ),
                ZOOM_MIN,
                ZOOM_MAX
            );

        applyZoom();

        scheduleSave();

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

        setZoom(
            1
        );

    }


    /* ============================================================
       WALLPAPER
    ============================================================ */

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


        $$(
            "[data-wallpaper]"
        ).forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.wallpaper ===
                    state.wallpaper
                );

            }
        );

    }


    function setWallpaper(
        name
    ) {

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


    /* ============================================================
       HUMO
    ============================================================ */

    function applySmoke() {

        document.body.classList.toggle(
            "smoke-disabled",
            !state.smoke
        );


        if (smokeToggle) {

            smokeToggle.checked =
                state.smoke;

        }


        if (
            window.PluginDexOptimization
        ) {

            window.PluginDexOptimization
                .setEffects?.({

                    smoke:
                        state.smoke

                });

        }

    }


    function setSmoke(
        enabled
    ) {

        state.smoke =
            Boolean(
                enabled
            );

        applySmoke();

        captureHistory();

        scheduleSave();

    }


    /* ============================================================
       MOVIMIENTO
    ============================================================ */

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
                .setEffects?.({

                    motion:
                        state.motion

                });

        }

    }


    function setMotion(
        enabled
    ) {

        state.motion =
            Boolean(
                enabled
            );

        applyMotion();

        captureHistory();

        scheduleSave();

    }


    /* ============================================================
       SELECCIÓN
       IMPORTANTE:
       app.js NO vuelve a implementar selección física.
       Usa editor/seleccion.js.
    ============================================================ */

    function getSelected() {

        if (
            window.PluginDexSelection
        ) {

            return (
                window.PluginDexSelection
                    .getSelected?.() ||
                null
            );

        }

        return state.selected;

    }


    function selectElement(
        element
    ) {

        if (
            window.PluginDexSelection
        ) {

            if (element) {

                window.PluginDexSelection
                    .select(
                        element
                    );

            } else {

                window.PluginDexSelection
                    .clear();

            }

            return;

        }


        /*
         * Fallback mínimo por si el módulo
         * todavía no está cargado.
         */

        state.selected =
            element || null;


        getElements().forEach(
            item => {

                item.classList.toggle(
                    "editor-selected",
                    item === element
                );

            }
        );


        updateInspector(
            element
        );

    }


    function clearSelection() {

        if (
            window.PluginDexSelection
        ) {

            window.PluginDexSelection
                .clear();

            return;

        }

        state.selected =
            null;

        updateInspector(
            null
        );

    }


    /* ============================================================
       INSPECTOR
    ============================================================ */

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


    function showInspector() {

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

    }


    function updateInspector(
        element
    ) {

        state.selected =
            element || null;


        if (!element) {

            showEmptyInspector();

            updateLayerSelection(
                null
            );

            return;

        }


        showInspector();


        const type =
            element.dataset.elementType ||
            "element";


        const names = {

            heading:
                "Título",

            text:
                "Texto",

            button:
                "Botón",

            image:
                "Imagen"

        };


        if (selectedElementName) {

            selectedElementName.textContent =
                names[type] ||
                "Elemento";

        }


        const opacity =
            clamp(
                number(
                    element.style.opacity,
                    1
                ),
                0.2,
                1
            );


        const scale =
            clamp(
                number(
                    element.dataset.scale,
                    1
                ),
                0.5,
                1.8
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


        updateLayerSelection(
            element
        );

    }


    function updateColorButtons(
        color
    ) {

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

            } catch {}

        }

    }


    function updateSelectedOpacity(
        value,
        commit = false
    ) {

        const element =
            getSelected();

        if (!element) {
            return;
        }


        const opacity =
            clamp(
                number(value) / 100,
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


        if (commit) {

            captureHistory();

        }

        scheduleSave();

    }


    function updateSelectedScale(
        value,
        commit = false
    ) {

        const element =
            getSelected();

        if (!element) {
            return;
        }


        const scale =
            clamp(
                number(value) / 100,
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


        if (commit) {

            captureHistory();

        }

        scheduleSave();

    }


    function updateSelectedColor(
        color
    ) {

        const element =
            getSelected();

        if (!element) {
            return;
        }


        if (
            typeof color !== "string" ||
            !color
        ) {
            return;
        }


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


    /* ============================================================
       CAPAS
    ============================================================ */

    function updateLayerSelection(
        element
    ) {

        const id =
            getElementId(
                element
            );


        $$(
            "[data-layer-select]"
        ).forEach(
            layer => {

                layer.classList.toggle(
                    "active",
                    layer.dataset.layerSelect ===
                    id
                );

            }
        );

    }


    function selectLayer(
        id
    ) {

        const element =
            findElement(
                id
            );


        if (!element) {
            return;
        }


        selectElement(
            element
        );

    }


    function refreshLayers() {

        const layers =
            $$(
                "[data-layer-select]"
            );

        if (!layers.length) {
            return;
        }


        const selected =
            getSelected();


        layers.forEach(
            layer => {

                const id =
                    layer.dataset.layerSelect;

                layer.classList.toggle(
                    "active",
                    selected &&
                    selected.dataset.elementId === id
                );

            }
        );

    }


    /* ============================================================
       ELEMENTOS
    ============================================================ */

    function nextElementId(
        type
    ) {

        state.elementCounter++;

        return `${type}-${state.elementCounter}`;

    }


    function getDefaultText(
        type
    ) {

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


    function applyElementData(
        element,
        options
    ) {

        const x =
            number(
                options.x,
                100
            );

        const y =
            number(
                options.y,
                100
            );


        /*
         * Compatibilidad:
         * el sistema viejo usa variables,
         * el manipulador nuevo usa left/top.
         */

        element.style.left =
            `${x}px`;

        element.style.top =
            `${y}px`;


        element.style.setProperty(
            "--element-x",
            `${x}px`
        );

        element.style.setProperty(
            "--element-y",
            `${y}px`
        );


        if (
            options.width
        ) {

            element.style.width =
                options.width;

        }


        if (
            options.height
        ) {

            element.style.height =
                options.height;

        }


        if (
            options.rotation !== undefined
        ) {

            element.style.setProperty(
                "--editor-rotation",
                String(
                    options.rotation
                ).includes("deg")
                    ? options.rotation
                    : `${options.rotation}deg`
            );

        }


        const opacity =
            clamp(
                number(
                    options.opacity,
                    1
                ),
                0.2,
                1
            );


        const scale =
            clamp(
                number(
                    options.scale,
                    1
                ),
                0.5,
                1.8
            );


        element.style.opacity =
            opacity;


        element.dataset.scale =
            scale;


        element.style.setProperty(
            "--element-scale",
            scale
        );


        if (
            options.color
        ) {

            element.dataset.color =
                options.color;

            element.style.setProperty(
                "--element-color",
                options.color
            );

        }


        if (
            options.locked
        ) {

            element.dataset.locked =
                "true";

        }


        if (
            options.hidden
        ) {

            element.dataset.hidden =
                "true";

            element.hidden =
                true;

        }

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
            !validTypes.includes(
                type
            )
        ) {

            return null;

        }


        if (!designPage) {

            console.error(
                "[PluginDex] designPage no encontrado."
            );

            return null;

        }


        const id =
            options.id ||
            nextElementId(
                type
            );


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


        element.dataset.scale =
            "1";


        /*
         * IMPORTANTE:
         * no añadimos listeners de drag aquí.
         * El manipulador externo se encarga de ello.
         */


        if (
            type === "image"
        ) {

            element.innerHTML = `

                <div class="generated-image-placeholder">

                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
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
                getDefaultText(
                    type
                );


            span.contentEditable =
                "false";


            element.appendChild(
                span
            );

        }


        applyElementData(
            element,
            options
        );


        designPage.appendChild(
            element
        );


        /*
         * El manipulador/selector trabajan
         * por delegación y por selector.
         * No necesitamos registrar listeners
         * individuales aquí.
         */


        if (record) {

            captureHistory();

            scheduleSave();

        }


        refreshEditorModules();


        return element;

    }


    /* ============================================================
       TEXTO
    ============================================================ */

    function editElementText(
        element
    ) {

        if (!element) {
            return;
        }


        const editable =
            $(".editable-text", element);


        if (!editable) {
            return;
        }


        const current =
            editable.textContent.trim();


        /*
         * Evitamos prompt en móvil si existe
         * una API futura de edición.
         */

        const next =
            window.prompt(
                "Editar texto",
                current
            );


        if (next === null) {
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


    function setupTextEditing() {

        if (!designPage) {
            return;
        }


        /*
         * Un único listener delegado.
         * Mucho más barato que un listener
         * por elemento.
         */

        designPage.addEventListener(
            "dblclick",
            event => {

                const element =
                    event.target.closest(
                        ".page-element"
                    );


                if (!element) {
                    return;
                }


                if (
                    event.target.closest(
                        ".editor-handle"
                    )
                ) {
                    return;
                }


                editElementText(
                    element
                );

            }
        );

    }


    /* ============================================================
       EVENTOS DEL MANIPULADOR
    ============================================================ */

    function setupEditorIntegration() {

        document.addEventListener(
            "plugindex:selectionchange",
            event => {

                const element =
                    event.detail?.element ||
                    null;


                state.selected =
                    element;


                updateInspector(
                    element
                );


                refreshLayers();

            }
        );


        document.addEventListener(
            "plugindex:elementchange",
            event => {

                const element =
                    event.detail?.element ||
                    getSelected();


                if (element) {

                    syncElementPosition(
                        element
                    );

                    updateInspector(
                        element
                    );

                }


                /*
                 * Guardado ligero durante edición.
                 * El historial definitivo se captura
                 * al terminar la operación si el
                 * manipulador lo notifica.
                 */

                scheduleSave();

            }
        );


        document.addEventListener(
            "plugindex:manipulationend",
            event => {

                const element =
                    event.detail?.element ||
                    getSelected();


                if (element) {

                    syncElementPosition(
                        element
                    );

                }


                captureHistory();

                scheduleSave();

            }
        );

    }


    function refreshEditorModules() {

        window.PluginDexSelection
            ?.refresh?.();

    }


    /* ============================================================
       EVENTOS GENERALES
    ============================================================ */

    function setupActions() {

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

                        window.PluginDexWindows
                            ?.open?.(
                                "elements"
                            );

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

                        window.PluginDexWindows
                            ?.reset?.();

                        break;


                    case "preview":

                        togglePreview();

                        break;


                    case "clear-selection":

                        clearSelection();

                        break;

                }

            }
        );

    }


    /* ============================================================
       CREACIÓN
    ============================================================ */

    function setupCreation() {

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


                if (!element) {
                    return;
                }


                selectElement(
                    element
                );


                /*
                 * Cerramos la ventana de elementos
                 * si existe.
                 */

                window.PluginDexWindows
                    ?.close?.(
                        "elements"
                    );


                showToast(
                    `${type} añadido`
                );

            }
        );

    }


    /* ============================================================
       CAPAS
    ============================================================ */

    function setupLayers() {

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

    }


    /* ============================================================
       WALLPAPER
    ============================================================ */

    function setupWallpaper() {

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

    }


    /* ============================================================
       INSPECTOR EVENTS
    ============================================================ */

    function setupInspector() {

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


                if (
                    chip.dataset.color
                ) {

                    updateSelectedColor(
                        chip.dataset.color
                    );

                }

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

    }


    /* ============================================================
       TOGGLES
    ============================================================ */

    function setupToggles() {

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

    }


    /* ============================================================
       PREVIEW
    ============================================================ */

    function togglePreview() {

        state.preview =
            !state.preview;


        document.body.classList.toggle(
            "preview-mode",
            state.preview
        );


        if (
            window.PluginDexSelection
        ) {

            if (state.preview) {

                window.PluginDexSelection
                    .clear();

            }

        }


        showToast(
            state.preview
                ? "Vista previa"
                : "Editor"
        );

    }


    /* ============================================================
       TECLADO
    ============================================================ */

    function setupKeyboard() {

        document.addEventListener(
            "keydown",
            event => {

                const modifier =
                    event.ctrlKey ||
                    event.metaKey;


                /*
                 * Guardar
                 */

                if (
                    modifier &&
                    event.key.toLowerCase() === "s"
                ) {

                    event.preventDefault();

                    saveProject();

                    return;

                }


                /*
                 * Undo
                 */

                if (
                    modifier &&
                    event.key.toLowerCase() === "z"
                ) {

                    event.preventDefault();


                    if (event.shiftKey) {

                        redo();

                    } else {

                        undo();

                    }

                    return;

                }


                /*
                 * Redo
                 */

                if (
                    modifier &&
                    event.key.toLowerCase() === "y"
                ) {

                    event.preventDefault();

                    redo();

                    return;

                }


                /*
                 * Escape
                 */

                if (
                    event.key === "Escape"
                ) {

                    if (
                        state.preview
                    ) {

                        togglePreview();

                    } else {

                        clearSelection();

                    }

                }


                /*
                 * Delete / Backspace
                 */

                if (
                    event.key === "Delete" ||
                    event.key === "Backspace"
                ) {

                    const active =
                        document.activeElement;


                    if (
                        active &&
                        (
                            active.tagName === "INPUT" ||
                            active.tagName === "TEXTAREA" ||
                            active.isContentEditable
                        )
                    ) {

                        return;

                    }


                    deleteSelected();

                }

            }
        );

    }


    /* ============================================================
       BORRAR ELEMENTO
    ============================================================ */

    function deleteSelected() {

        const element =
            getSelected();


        if (!element) {
            return;
        }


        const id =
            getElementId(
                element
            );


        element.remove();


        clearSelection();

        captureHistory();

        scheduleSave();


        /*
         * Actualizar cualquier capa
         * externa si existe.
         */

        refreshEditorModules();

        refreshLayers();


        showToast(
            "Elemento eliminado"
        );


        /*
         * Aviso opcional para otros sistemas.
         */

        document.dispatchEvent(
            new CustomEvent(
                "plugindex:elementdelete",
                {
                    detail: {
                        id
                    }
                }
            )
        );

    }


    /* ============================================================
       DUPLICAR
    ============================================================ */

    function duplicateSelected() {

        const original =
            getSelected();


        if (!original) {
            return null;
        }


        const type =
            original.dataset.elementType;


        const position =
            getElementPosition(
                original
            );


        const duplicate =
            createElement(
                type,
                {

                    text:
                        getElementText(
                            original
                        ),

                    x:
                        position.x + 24,

                    y:
                        position.y + 24,

                    width:
                        original.style.width,

                    height:
                        original.style.height,

                    rotation:
                        original.style.getPropertyValue(
                            "--editor-rotation"
                        ) || "0deg",

                    opacity:
                        number(
                            original.style.opacity,
                            1
                        ),

                    scale:
                        number(
                            original.dataset.scale,
                            1
                        ),

                    color:
                        original.dataset.color ||
                        null

                }
            );


        if (duplicate) {

            selectElement(
                duplicate
            );

            showToast(
                "Elemento duplicado"
            );

        }


        return duplicate;

    }


    /* ============================================================
       EVENTO DE DUPLICAR
    ============================================================ */

    function setupDuplicate() {

        document.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-action='duplicate']"
                    );


                if (!button) {
                    return;
                }


                duplicateSelected();

            }
        );

    }


    /* ============================================================
       OPTIMIZACIÓN
    ============================================================ */

    function connectOptimization() {

        if (
            !window.PluginDexOptimization
        ) {
            console.warn(
                "[PluginDex] Optimización no encontrada."
            );

            return;

        }


        window.PluginDexOptimization
            .init?.();


        window.PluginDexOptimization
            .setEffects?.({

                smoke:
                    state.smoke,

                motion:
                    state.motion

            });

    }


    /* ============================================================
       VENTANAS
    ============================================================ */

    function connectWindows() {

        if (
            !window.PluginDexWindows
        ) {

            console.warn(
                "[PluginDex] Motor de ventanas no encontrado."
            );

            return;

        }


        window.PluginDexWindows
            .init?.({

                container:
                    workspace

            });

    }


    /* ============================================================
       BLOQUES
    ============================================================ */

    function connectBlocks() {

        if (
            !window.PluginDexBlocks
        ) {

            /*
             * No hacemos nada.
             * El editor sigue funcionando sin
             * el sistema visual de bloques.
             */

            return;

        }


        /*
         * El motor de bloques mantiene
         * su propio estado.
         *
         * Aquí únicamente avisamos de que
         * el proyecto ya está listo.
         */

        document.dispatchEvent(
            new CustomEvent(
                "plugindex:appready"
            )
        );

    }


    /* ============================================================
       RESIZE
    ============================================================ */

    let resizeTimer =
        0;


    function setupResize() {

        window.addEventListener(
            "resize",
            () => {

                clearTimeout(
                    resizeTimer
                );


                resizeTimer =
                    setTimeout(
                        () => {

                            applyZoom();

                            refreshEditorModules();

                        },
                        100
                    );

            },
            {
                passive: true
            }
        );

    }


    /* ============================================================
       RENDIMIENTO
    ============================================================ */

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


    /* ============================================================
       ESTADO INICIAL
    ============================================================ */

    function ensureElementIds() {

        getElements().forEach(
            element => {

                if (
                    !element.dataset.elementId
                ) {

                    const type =
                        element.dataset.elementType ||
                        "element";


                    element.dataset.elementId =
                        nextElementId(
                            type
                        );

                }


                if (
                    !element.dataset.elementType
                ) {

                    element.dataset.elementType =
                        "element";

                }


                syncElementPosition(
                    element
                );

            }
        );

    }


    function initializeExistingElements() {

        ensureElementIds();

        refreshEditorModules();

    }


    /* ============================================================
       INIT
    ============================================================ */

    function init() {

        if (
            state.initialized
        ) {

            return;

        }


        if (!app) {

            console.error(
                "[PluginDex] #app no encontrado."
            );

            return;

        }


        state.initialized =
            true;


        /*
         * 1. Cargar proyecto.
         */

        const loaded =
            loadProject();


        /*
         * 2. Preparar elementos
         * existentes.
         */

        initializeExistingElements();


        /*
         * 3. Conectar sistemas externos
         * antes de interacción.
         */

        connectOptimization();

        connectWindows();

        connectBlocks();


        /*
         * 4. Eventos internos.
         */

        setupActions();

        setupCreation();

        setupLayers();

        setupWallpaper();

        setupInspector();

        setupToggles();

        setupTextEditing();

        setupEditorIntegration();

        setupKeyboard();

        setupDuplicate();

        setupResize();


        /*
         * 5. Estado visual.
         */

        applyZoom();

        applyWallpaper();

        applySmoke();

        applyMotion();


        /*
         * 6. Historial.
         *
         * IMPORTANTE:
         * solamente se crea aquí si no existe.
         * El proyecto cargado también necesita
         * tener su estado como punto inicial.
         */

        createInitialHistory();


        /*
         * 7. Nada seleccionado
         * inicialmente.
         */

        clearSelection();


        /*
         * 8. Guardado inicial.
         */

        saveProject(
            true
        );


        /*
         * 9. Estado de rendimiento.
         */

        updatePerformanceLabel();


        console.log(
            "[PluginDex] Interface Engine v5 iniciado."
        );

    }


    /* ============================================================
       API PÚBLICA
    ============================================================ */

    window.PluginDexApp = {

        getState() {

            return {

                ...state,

                selected:
                    getSelected()

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


        clearSelection,


        createElement,


        deleteSelected,


        duplicateSelected,


        setWallpaper,


        setSmoke,


        setMotion,


        togglePreview,


        getSelected,


        findElement,


        serializeProject,


        captureHistory,


        editElementText

    };


    /* ============================================================
       DOM READY
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
