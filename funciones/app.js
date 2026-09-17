"use strict";

/*
=========================================================
 PLUGINDEX ENGINE
 Motor principal
 Optimizado para móviles y dispositivos de gama baja
=========================================================
*/

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const STORAGE = "plugindex-project-v3";

const state = {
    selected: null,

    zoom: 1,

    wallpaper: "black",

    smoke: true,

    motion: true,

    history: [],

    historyIndex: -1,

    glass: new WeakMap(),

    pointer: {
        x: .5,
        y: .5,
        targetX: .5,
        targetY: .5
    }
};


/* =========================================================
   ELEMENTOS PRINCIPALES
========================================================= */

const page = $(".design-page");
const canvas = $(".canvas-space");
const inspector = $(".inspector");
const toast = $(".toast");


/* =========================================================
   UTILIDADES
========================================================= */

const clamp = (n, min, max) =>
    Math.min(Math.max(n, min), max);

const lerp = (a, b, t) =>
    a + (b - a) * t;


/* =========================================================
   TOAST
========================================================= */

let toastTimeout = null;

function showToast(text) {

    if (!toast) return;

    toast.textContent = text;

    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 1700);
}


/* =========================================================
   GUARDAR
========================================================= */

let saveTimeout;

function saveProject() {

    clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {

        const data = {
            html: page?.innerHTML || "",
            wallpaper: state.wallpaper,
            smoke: state.smoke,
            motion: state.motion,
            zoom: state.zoom
        };

        try {
            localStorage.setItem(
                STORAGE,
                JSON.stringify(data)
            );
        } catch (e) {
            console.warn("No se pudo guardar.", e);
        }

        const status = $(".save-status");

        if (status) {
            status.textContent = "Guardado";
        }

    }, 250);
}


/* =========================================================
   CARGAR
========================================================= */

function loadProject() {

    try {

        const raw =
            localStorage.getItem(STORAGE);

        if (!raw) return;

        const data =
            JSON.parse(raw);

        if (data.html && page) {
            page.innerHTML = data.html;
        }

        if (data.wallpaper) {
            state.wallpaper = data.wallpaper;
        }

        if (typeof data.smoke === "boolean") {
            state.smoke = data.smoke;
        }

        if (typeof data.motion === "boolean") {
            state.motion = data.motion;
        }

        if (typeof data.zoom === "number") {
            state.zoom = data.zoom;
        }

    } catch (e) {

        console.warn(
            "Proyecto corrupto o incompatible.",
            e
        );

    }
}


/* =========================================================
   HISTORIAL
========================================================= */

function snapshot() {

    if (!page) return;

    const html = page.innerHTML;

    state.history =
        state.history.slice(
            0,
            state.historyIndex + 1
        );

    state.history.push(html);

    if (state.history.length > 30) {
        state.history.shift();
    }

    state.historyIndex =
        state.history.length - 1;
}


function restore(index) {

    if (!page) return;

    if (
        index < 0 ||
        index >= state.history.length
    ) {
        return;
    }

    page.innerHTML =
        state.history[index];

    state.historyIndex =
        index;

    state.selected = null;

    refreshElements();

    updateInspector();

    saveProject();
}


function undo() {

    if (state.historyIndex <= 0) {
        showToast("No hay cambios anteriores");
        return;
    }

    restore(
        state.historyIndex - 1
    );

}


function redo() {

    if (
        state.historyIndex >=
        state.history.length - 1
    ) {
        showToast("No hay cambios posteriores");
        return;
    }

    restore(
        state.historyIndex + 1
    );

}


/* =========================================================
   WALLPAPER
========================================================= */

function applyWallpaper(name) {

    state.wallpaper = name;

    document.body.dataset.wallpaper =
        name;

    saveProject();

    showToast(
        "Fondo cambiado"
    );
}


/* =========================================================
   SMOKE
========================================================= */

function setSmoke(enabled) {

    state.smoke = enabled;

    document.body.classList.toggle(
        "no-smoke",
        !enabled
    );

    saveProject();

}


/* =========================================================
   MOTION
========================================================= */

function setMotion(enabled) {

    state.motion = enabled;

    document.body.classList.toggle(
        "no-motion",
        !enabled
    );

    saveProject();

}


/* =========================================================
   PARALLAX
========================================================= */

/*
    IMPORTANTE:

    Antes se actualizaban demasiadas propiedades.
    Ahora solo modificamos variables CSS.
*/

let parallaxRunning = false;

function startParallax() {

    if (parallaxRunning) return;

    parallaxRunning = true;

    requestAnimationFrame(
        parallaxLoop
    );
}


function parallaxLoop() {

    const p = state.pointer;

    p.x =
        lerp(
            p.x,
            p.targetX,
            .055
        );

    p.y =
        lerp(
            p.y,
            p.targetY,
            .055
        );

    const dx =
        (p.x - .5) * 18;

    const dy =
        (p.y - .5) * 18;

    const root =
        document.documentElement;

    root.style.setProperty(
        "--wall-x",
        `${dx}px`
    );

    root.style.setProperty(
        "--wall-y",
        `${dy}px`
    );

    root.style.setProperty(
        "--light-x",
        `${50 + (p.x - .5) * 25}%`
    );

    root.style.setProperty(
        "--light-y",
        `${50 + (p.y - .5) * 25}%`
    );

    requestAnimationFrame(
        parallaxLoop
    );
}


function setupParallax() {

    window.addEventListener(
        "pointermove",
        event => {

            state.pointer.targetX =
                event.clientX /
                window.innerWidth;

            state.pointer.targetY =
                event.clientY /
                window.innerHeight;

        },
        {
            passive: true
        }
    );

    startParallax();
}


/* =========================================================
   GLASS ENGINE
========================================================= */

function createGlass(element) {

    if (!element) return;

    if (state.glass.has(element)) {
        return;
    }

    const data = {

        x: 0,
        y: 0,

        targetX: 0,
        targetY: 0,

        rotation: 0,
        targetRotation: 0,

        scale: 1,
        targetScale: 1,

        shineX: 50,
        shineY: 50,

        targetShineX: 50,
        targetShineY: 50,

        active: false

    };

    state.glass.set(
        element,
        data
    );

    element.classList.add(
        "physical-window"
    );

    glassFrame(
        element,
        data
    );

}


function glassFrame(element, data) {

    data.x =
        lerp(
            data.x,
            data.targetX,
            .12
        );

    data.y =
        lerp(
            data.y,
            data.targetY,
            .12
        );

    data.rotation =
        lerp(
            data.rotation,
            data.targetRotation,
            .12
        );

    data.scale =
        lerp(
            data.scale,
            data.targetScale,
            .12
        );

    data.shineX =
        lerp(
            data.shineX,
            data.targetShineX,
            .10
        );

    data.shineY =
        lerp(
            data.shineY,
            data.targetShineY,
            .10
        );

    element.style.setProperty(
        "--glass-x",
        `${data.x}px`
    );

    element.style.setProperty(
        "--glass-y",
        `${data.y}px`
    );

    element.style.setProperty(
        "--glass-scale",
        data.scale
    );

    element.style.setProperty(
        "--shine-x",
        `${data.shineX}%`
    );

    element.style.setProperty(
        "--shine-y",
        `${data.shineY}%`
    );

    requestAnimationFrame(
        () => glassFrame(
            element,
            data
        )
    );
}


/* =========================================================
   GLASS INTERACTION
========================================================= */

function setupGlass(element) {

    createGlass(element);

    element.addEventListener(
        "pointerenter",
        () => {

            const data =
                state.glass.get(element);

            if (!data) return;

            data.active = true;

            data.targetScale =
                1.006;

        },
        {
            passive: true
        }
    );


    element.addEventListener(
        "pointermove",
        event => {

            const data =
                state.glass.get(element);

            if (!data) return;

            const rect =
                element.getBoundingClientRect();

            const x =
                ((event.clientX - rect.left) /
                    rect.width) * 100;

            const y =
                ((event.clientY - rect.top) /
                    rect.height) * 100;

            data.targetShineX =
                clamp(x, 0, 100);

            data.targetShineY =
                clamp(y, 0, 100);

            data.targetRotation =
                clamp(
                    (x - 50) * .015,
                    -1,
                    1
                );

        },
        {
            passive: true
        }
    );


    element.addEventListener(
        "pointerleave",
        () => {

            const data =
                state.glass.get(element);

            if (!data) return;

            data.active = false;

            data.targetScale = 1;

            data.targetRotation = 0;

            data.targetShineX = 50;

            data.targetShineY = 50;

        },
        {
            passive: true
        }
    );
}


function setupAllGlass() {

    $$(".glass")
        .forEach(setupGlass);

}


/* =========================================================
   SELECCIÓN
========================================================= */

function selectElement(element) {

    if (!element) return;

    $$(".page-element.selected")
        .forEach(el =>
            el.classList.remove("selected")
        );

    element.classList.add(
        "selected"
    );

    state.selected =
        element;

    updateInspector();

}


function clearSelection() {

    $$(".page-element.selected")
        .forEach(el =>
            el.classList.remove("selected")
        );

    state.selected = null;

    updateInspector();
}


/* =========================================================
   ELEMENTOS
========================================================= */

function setupElement(element) {

    if (
        element.dataset.pluginReady === "1"
    ) {
        return;
    }

    element.dataset.pluginReady = "1";

    element.draggable = true;


    element.addEventListener(
        "click",
        event => {

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

            if (
                element.dataset.type ===
                "image"
            ) {
                return;
            }

            const old =
                element.textContent.trim();

            const value =
                prompt(
                    "Editar texto",
                    old
                );

            if (
                value === null ||
                !value.trim()
            ) {
                return;
            }

            snapshot();

            element.textContent =
                value;

            saveProject();

        }
    );


    /* Drag desktop */

    element.addEventListener(
        "dragstart",
        () => {

            state.draggingElement =
                element;

            element.classList.add(
                "is-dragging"
            );

        }
    );


    element.addEventListener(
        "dragend",
        () => {

            state.draggingElement =
                null;

            element.classList.remove(
                "is-dragging"
            );

        }
    );


    element.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

        }
    );


    element.addEventListener(
        "drop",
        event => {

            event.preventDefault();

            const source =
                state.draggingElement;

            if (
                !source ||
                source === element
            ) {
                return;
            }

            snapshot();

            const rect =
                element.getBoundingClientRect();

            if (
                event.clientY >
                rect.top +
                rect.height / 2
            ) {

                element.after(
                    source
                );

            } else {

                element.before(
                    source
                );

            }

            saveProject();

        }
    );

}


function refreshElements() {

    $$(".page-element")
        .forEach(setupElement);

}


/* =========================================================
   CREAR ELEMENTOS
========================================================= */

function createElement(type) {

    if (!page) return;

    snapshot();

    let element;

    if (type === "heading") {

        element =
            document.createElement("h1");

        element.className =
            "page-element page-heading";

        element.textContent =
            "Nuevo título";

    }


    else if (type === "text") {

        element =
            document.createElement("p");

        element.className =
            "page-element page-text";

        element.textContent =
            "Nuevo texto";

    }


    else if (type === "button") {

        element =
            document.createElement("button");

        element.className =
            "page-element page-button";

        element.textContent =
            "Nuevo botón";

    }


    else if (type === "image") {

        element =
            document.createElement("div");

        element.className =
            "page-element page-image";

        element.textContent =
            "Imagen";

    }


    else {

        return;

    }

    element.dataset.type =
        type;

    page.appendChild(
        element
    );

    setupElement(
        element
    );

    selectElement(
        element
    );

    saveProject();

    closeAllSheets();

}


/* =========================================================
   INSPECTOR
========================================================= */

function updateInspector() {

    if (!inspector) return;

    const selected =
        state.selected;

    inspector.classList.toggle(
        "has-selection",
        !!selected
    );

    if (!selected) return;

    const opacity =
        $("[data-opacity]", inspector);

    const scale =
        $("[data-scale]", inspector);

    if (opacity) {

        opacity.value =
            selected.dataset.opacity ||
            "1";

    }

    if (scale) {

        scale.value =
            selected.dataset.scale ||
            "1";

    }

}


/* =========================================================
   OPACIDAD
========================================================= */

function setupOpacity() {

    const input =
        $("[data-opacity]");

    if (!input) return;

    input.addEventListener(
        "input",
        () => {

            if (!state.selected)
                return;

            const value =
                input.value;

            state.selected.style.opacity =
                value;

            state.selected.dataset.opacity =
                value;

            saveProject();

        }
    );

}


/* =========================================================
   ESCALA
========================================================= */

function setupScale() {

    const input =
        $("[data-scale]");

    if (!input) return;

    input.addEventListener(
        "input",
        () => {

            if (!state.selected)
                return;

            const value =
                input.value;

            state.selected.style.transform =
                `scale(${value})`;

            state.selected.dataset.scale =
                value;

            saveProject();

        }
    );

}


/* =========================================================
   COLOR
========================================================= */

function setupColors() {

    $$(".color-chip")
        .forEach(chip => {

            chip.addEventListener(
                "click",
                () => {

                    if (!state.selected)
                        return;

                    snapshot();

                    state.selected.style.color =
                        chip.dataset.color;

                    saveProject();

                }
            );

        });


    const picker =
        $("[data-color-picker]");

    if (picker) {

        picker.addEventListener(
            "input",
            () => {

                if (!state.selected)
                    return;

                state.selected.style.color =
                    picker.value;

                saveProject();

            }
        );

    }

}


/* =========================================================
   SHEETS
========================================================= */

function openSheet(id) {

    const sheet =
        typeof id === "string"
            ? document.getElementById(id)
            : id;

    if (!sheet) return;

    closeAllSheets();

    sheet.classList.add(
        "open"
    );

    document.body.classList.add(
        "sheet-open"
    );

}


function closeSheet(sheet) {

    if (!sheet) return;

    sheet.classList.remove(
        "open"
    );

}


function closeAllSheets() {

    $$(".sheet.open")
        .forEach(sheet =>
            sheet.classList.remove("open")
        );

    document.body.classList.remove(
        "sheet-open"
    );

}


/* =========================================================
   SHEET BUTTONS
========================================================= */

function setupSheets() {

    /*
        Event delegation.
        Así no importa si los botones
        se crean dinámicamente.
    */

    document.addEventListener(
        "click",
        event => {

            const open =
                event.target.closest(
                    "[data-open-sheet]"
                );

            if (open) {

                event.preventDefault();

                openSheet(
                    open.dataset.openSheet
                );

                return;
            }


            const close =
                event.target.closest(
                    "[data-close-sheet]"
                );

            if (close) {

                event.preventDefault();

                closeSheet(
                    close.closest(".sheet")
                );

                return;
            }


            const backdrop =
                event.target.closest(
                    ".sheet-backdrop"
                );

            if (backdrop) {

                closeSheet(
                    backdrop.closest(".sheet")
                );

            }

        }
    );

}


/* =========================================================
   CREACIÓN DE ELEMENTOS
========================================================= */

function setupCreationButtons() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-create-element]"
                );

            if (!button) return;

            event.preventDefault();

            createElement(
                button.dataset.createElement
            );

        }
    );

}


/* =========================================================
   WALLPAPER BUTTONS
========================================================= */

function setupWallpaperButtons() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-wallpaper]"
                );

            if (!button) return;

            event.preventDefault();

            applyWallpaper(
                button.dataset.wallpaper
            );

            closeAllSheets();

        }
    );

}


/* =========================================================
   TOGGLES
========================================================= */

function setupToggles() {

    document.addEventListener(
        "click",
        event => {

            const smoke =
                event.target.closest(
                    "[data-smoke-toggle]"
                );

            if (smoke) {

                setSmoke(
                    !state.smoke
                );

                return;
            }


            const motion =
                event.target.closest(
                    "[data-motion-toggle]"
                );

            if (motion) {

                setMotion(
                    !state.motion
                );

            }

        }
    );

}


/* =========================================================
   ZOOM
========================================================= */

function applyZoom() {

    if (!page) return;

    page.style.setProperty(
        "--page-scale",
        state.zoom
    );

    /*
       Si el CSS utiliza transform directamente,
       conservamos compatibilidad.
    */

    if (
        !page.dataset.customTransform
    ) {

        page.style.transform =
            `scale(${state.zoom})`;

    }

    const display =
        $("[data-zoom-value]");

    if (display) {

        display.textContent =
            `${Math.round(
                state.zoom * 100
            )}%`;

    }

}


function setupZoom() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-zoom]"
                );

            if (!button) return;

            const action =
                button.dataset.zoom;

            if (action === "in") {

                state.zoom =
                    clamp(
                        state.zoom + .1,
                        .4,
                        2.5
                    );

            }

            else if (action === "out") {

                state.zoom =
                    clamp(
                        state.zoom - .1,
                        .4,
                        2.5
                    );

            }

            else if (action === "reset") {

                state.zoom = 1;

            }

            applyZoom();

            saveProject();

        }
    );


    canvas?.addEventListener(
        "wheel",
        event => {

            if (!event.ctrlKey)
                return;

            event.preventDefault();

            state.zoom =
                clamp(
                    state.zoom -
                    event.deltaY * .001,
                    .4,
                    2.5
                );

            applyZoom();

        },
        {
            passive: false
        }
    );

}


/* =========================================================
   PREVIEW
========================================================= */

function setupPreview() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-preview]"
                );

            if (!button) return;

            event.preventDefault();

            const enabled =
                !document.body.classList.contains(
                    "preview-mode"
                );

            document.body.classList.toggle(
                "preview-mode",
                enabled
            );

            clearSelection();

            showToast(
                enabled
                    ? "Vista previa"
                    : "Editor"
            );

        }
    );

}


/* =========================================================
   NAVEGACIÓN
========================================================= */

function setupNavigation() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-view]"
                );

            if (!button) return;

            event.preventDefault();

            $$("[data-view]")
                .forEach(
                    item =>
                        item.classList.remove(
                            "active"
                        )
                );

            button.classList.add(
                "active"
            );

            const view =
                button.dataset.view;

            document.body.dataset.view =
                view;

        }
    );

}


/* =========================================================
   GUARDAR MANUAL
========================================================= */

function setupSave() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-save]"
                );

            if (!button) return;

            event.preventDefault();

            localStorage.setItem(
                STORAGE,
                JSON.stringify({
                    html:
                        page?.innerHTML || "",

                    wallpaper:
                        state.wallpaper,

                    smoke:
                        state.smoke,

                    motion:
                        state.motion,

                    zoom:
                        state.zoom
                })
            );

            showToast(
                "Proyecto guardado"
            );

        }
    );

}


/* =========================================================
   CANVAS
========================================================= */

function setupCanvas() {

    canvas?.addEventListener(
        "click",
        event => {

            if (
                event.target === canvas ||
                event.target.classList.contains(
                    "canvas-stage"
                ) ||
                event.target.classList.contains(
                    "design-page"
                )
            ) {

                clearSelection();

            }

        }
    );

}


/* =========================================================
   TECLADO
========================================================= */

function setupKeyboard() {

    document.addEventListener(
        "keydown",
        event => {

            const modifier =
                event.ctrlKey ||
                event.metaKey;

            if (
                modifier &&
                event.key.toLowerCase() === "z"
            ) {

                event.preventDefault();

                event.shiftKey
                    ? redo()
                    : undo();

                return;
            }


            if (
                modifier &&
                event.key.toLowerCase() === "y"
            ) {

                event.preventDefault();

                redo();

                return;
            }


            if (
                modifier &&
                event.key.toLowerCase() === "s"
            ) {

                event.preventDefault();

                localStorage.setItem(
                    STORAGE,
                    JSON.stringify({
                        html:
                            page?.innerHTML || "",
                        wallpaper:
                            state.wallpaper,
                        smoke:
                            state.smoke,
                        motion:
                            state.motion,
                        zoom:
                            state.zoom
                    })
                );

                showToast(
                    "Proyecto guardado"
                );

                return;
            }


            if (
                event.key === "Escape"
            ) {

                closeAllSheets();

                document.body.classList.remove(
                    "preview-mode"
                );

                clearSelection();

            }

        }
    );

}


/* =========================================================
   OPTIMIZACIÓN DE DISPOSITIVO
========================================================= */

function optimizeDevice() {

    /*
       No cambiamos el diseño.

       Solo evitamos efectos innecesarios
       en dispositivos muy limitados.
    */

    const cores =
        navigator.hardwareConcurrency || 4;

    const memory =
        navigator.deviceMemory || 4;

    const lowEnd =
        cores <= 4 &&
        memory <= 4;


    if (lowEnd) {

        document.body.classList.add(
            "low-end-device"
        );

    }


    /*
       Touch = menos parallax global.
    */

    if (
        window.matchMedia(
            "(pointer: coarse)"
        ).matches
    ) {

        document.body.classList.add(
            "touch-device"
        );

    }

}


/* =========================================================
   RESIZE
========================================================= */

let resizeTimer;

function setupResize() {

    window.addEventListener(
        "resize",
        () => {

            clearTimeout(
                resizeTimer
            );

            resizeTimer =
                setTimeout(
                    applyZoom,
                    100
                );

        },
        {
            passive: true
        }
    );

}


/* =========================================================
   INICIO
========================================================= */

function init() {

    loadProject();

    document.body.dataset.wallpaper =
        state.wallpaper;

    document.body.classList.toggle(
        "no-smoke",
        !state.smoke
    );

    document.body.classList.toggle(
        "no-motion",
        !state.motion
    );


    optimizeDevice();

    refreshElements();

    snapshot();


    setupParallax();

    setupAllGlass();

    setupSheets();

    setupCreationButtons();

    setupWallpaperButtons();

    setupToggles();

    setupOpacity();

    setupScale();

    setupColors();

    setupZoom();

    setupPreview();

    setupNavigation();

    setupSave();

    setupCanvas();

    setupKeyboard();

    setupResize();


    applyZoom();

    updateInspector();

}


if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

} else {

    init();

}
