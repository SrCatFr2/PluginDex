/* =========================================================
   PLUGINDEX
   APP ENGINE
   ========================================================= */

"use strict";


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (selector, root = document) =>
    root.querySelector(selector);

const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

const clamp = (value, min, max) =>
    Math.min(Math.max(value, min), max);

const lerp = (a, b, amount) =>
    a + (b - a) * amount;

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));


/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY = "plugindex-project-v2";


/* =========================================================
   STATE
   ========================================================= */

const state = {

    selected: null,

    zoom: 1,

    history: [],

    historyIndex: -1,

    draggingElement: null,

    wallpaper: "black",

    smoke: true,

    motion: true,

    physical: new WeakMap()

};


/* =========================================================
   DOM
   ========================================================= */

const page =
    $(".design-page");

const canvas =
    $(".canvas-space");

const inspector =
    $(".inspector");

const toast =
    $(".toast");

const elementSheet =
    $("#elementSheet");

const backgroundSheet =
    $("#backgroundSheet");


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer;

function showToast(message) {

    if (!toast) return;

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 1800);
}


/* =========================================================
   AUTOSAVE
   ========================================================= */

let saveTimer;

function saveProject() {

    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {

        const data = {

            html: page?.innerHTML || "",

            wallpaper:
                state.wallpaper,

            smoke:
                state.smoke,

            motion:
                state.motion,

            zoom:
                state.zoom

        };

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(data)
        );

        updateSaveStatus();

    }, 350);

}


function updateSaveStatus() {

    const status =
        $(".save-status");

    if (!status) return;

    status.textContent =
        "Guardado";

}


/* =========================================================
   LOAD
   ========================================================= */

function loadProject() {

    try {

        const raw =
            localStorage.getItem(STORAGE_KEY);

        if (!raw) return;

        const data =
            JSON.parse(raw);

        if (data.html && page) {

            page.innerHTML =
                data.html;

        }

        if (data.wallpaper) {

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

        if (data.zoom) {

            state.zoom =
                data.zoom;

        }

    } catch (error) {

        console.warn(
            "No se pudo cargar el proyecto.",
            error
        );

    }

}


/* =========================================================
   HISTORY
   ========================================================= */

function snapshot() {

    if (!page) return;

    const html =
        page.innerHTML;

    state.history =
        state.history.slice(
            0,
            state.historyIndex + 1
        );

    state.history.push(html);

    if (state.history.length > 40) {

        state.history.shift();

    }

    state.historyIndex =
        state.history.length - 1;

}


function restoreHistory(index) {

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

    state.selected =
        null;

    refreshElements();

    updateInspector();

    saveProject();

}


function undo() {

    if (
        state.historyIndex <= 0
    ) {

        showToast(
            "No hay cambios anteriores"
        );

        return;

    }

    restoreHistory(
        state.historyIndex - 1
    );

}


function redo() {

    if (
        state.historyIndex >=
        state.history.length - 1
    ) {

        showToast(
            "No hay cambios posteriores"
        );

        return;

    }

    restoreHistory(
        state.historyIndex + 1
    );

}


/* =========================================================
   WALLPAPER
   ========================================================= */

function applyWallpaper(name) {

    state.wallpaper =
        name;

    document.body.dataset.wallpaper =
        name;

    saveProject();

}


function setupWallpaper() {

    $$("[data-wallpaper]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    applyWallpaper(
                        button.dataset.wallpaper
                    );

                    closeSheet(
                        backgroundSheet
                    );

                }
            );

        });

}


/* =========================================================
   SMOKE
   ========================================================= */

function setupSmoke() {

    const toggle =
        $("[data-smoke-toggle]");

    if (!toggle) return;

    toggle.addEventListener(
        "click",
        () => {

            state.smoke =
                !state.smoke;

            document.body.classList.toggle(
                "no-smoke",
                !state.smoke
            );

            saveProject();

        }
    );

}


/* =========================================================
   MOTION
   ========================================================= */

function setupMotion() {

    const toggle =
        $("[data-motion-toggle]");

    if (!toggle) return;

    toggle.addEventListener(
        "click",
        () => {

            state.motion =
                !state.motion;

            document.body.classList.toggle(
                "no-motion",
                !state.motion
            );

            saveProject();

        }
    );

}


/* =========================================================
   PARALLAX GLOBAL
   ========================================================= */

let pointerX = .5;
let pointerY = .5;

let targetX = .5;
let targetY = .5;


function setupParallax() {

    window.addEventListener(
        "pointermove",
        event => {

            targetX =
                event.clientX /
                window.innerWidth;

            targetY =
                event.clientY /
                window.innerHeight;

        },
        {
            passive: true
        }
    );

    animateParallax();

}


function animateParallax() {

    pointerX =
        lerp(
            pointerX,
            targetX,
            .045
        );

    pointerY =
        lerp(
            pointerY,
            targetY,
            .045
        );

    const x =
        (pointerX - .5) * 24;

    const y =
        (pointerY - .5) * 24;

    document.documentElement.style
        .setProperty(
            "--wall-x",
            `${x}px`
        );

    document.documentElement.style
        .setProperty(
            "--wall-y",
            `${y}px`
        );

    document.documentElement.style
        .setProperty(
            "--light-x",
            `${50 + (pointerX - .5) * 30}%`
        );

    document.documentElement.style
        .setProperty(
            "--light-y",
            `${50 + (pointerY - .5) * 30}%`
        );

    requestAnimationFrame(
        animateParallax
    );

}


/* =========================================================
   PHYSICAL GLASS ENGINE
   ========================================================= */

function makePhysicalGlass(element) {

    if (!element) return;

    if (
        state.physical.has(element)
    ) {
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
        targetShineY: 50

    };

    state.physical.set(
        element,
        data
    );

    element.classList.add(
        "physical-window"
    );

    animateGlass(
        element,
        data
    );

}


function animateGlass(
    element,
    data
) {

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
            .1
        );

    data.shineY =
        lerp(
            data.shineY,
            data.targetShineY,
            .1
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
        () => animateGlass(
            element,
            data
        )
    );

}


/* =========================================================
   GLASS INTERACTION
   ========================================================= */

function setupGlassInteraction(element) {

    if (!element) return;

    makePhysicalGlass(
        element
    );

    element.addEventListener(
        "pointermove",
        event => {

            const rect =
                element.getBoundingClientRect();

            const x =
                ((event.clientX - rect.left) /
                    rect.width) * 100;

            const y =
                ((event.clientY - rect.top) /
                    rect.height) * 100;

            const data =
                state.physical.get(
                    element
                );

            if (!data) return;

            data.targetShineX =
                clamp(x, 0, 100);

            data.targetShineY =
                clamp(y, 0, 100);

            data.targetRotation =
                clamp(
                    (x - 50) * .018,
                    -1.2,
                    1.2
                );

        },
        {
            passive: true
        }
    );

    element.addEventListener(
        "pointerenter",
        () => {

            const data =
                state.physical.get(
                    element
                );

            if (!data) return;

            data.targetScale =
                1.006;

        }
    );

    element.addEventListener(
        "pointerleave",
        () => {

            const data =
                state.physical.get(
                    element
                );

            if (!data) return;

            data.targetScale =
                1;

            data.targetRotation =
                0;

            data.targetShineX =
                50;

            data.targetShineY =
                50;

        }
    );

}


/* =========================================================
   INITIAL GLASS ELEMENTS
   ========================================================= */

function setupAllGlass() {

    $$(".glass")
        .forEach(
            setupGlassInteraction
        );

}


/* =========================================================
   ELEMENT SELECTION
   ========================================================= */

function selectElement(element) {

    if (!element) return;

    $$(".page-element.selected")
        .forEach(el => {

            el.classList.remove(
                "selected"
            );

        });

    element.classList.add(
        "selected"
    );

    state.selected =
        element;

    updateInspector();

}


function clearSelection() {

    $$(".page-element.selected")
        .forEach(el => {

            el.classList.remove(
                "selected"
            );

        });

    state.selected =
        null;

    updateInspector();

}


/* =========================================================
   REFRESH ELEMENTS
   ========================================================= */

function refreshElements() {

    $$(".page-element")
        .forEach(element => {

            element.draggable = true;

            setupElementEvents(
                element
            );

        });

}


/* =========================================================
   ELEMENT EVENTS
   ========================================================= */

function setupElementEvents(element) {

    if (
        element.dataset.pluginDexReady
    ) {
        return;
    }

    element.dataset.pluginDexReady =
        "true";

    element.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            selectElement(
                element
            );

        }
    );


    /* Doble click = editar texto */

    element.addEventListener(
        "dblclick",
        event => {

            event.stopPropagation();

            if (
                element.matches(
                    "img"
                )
            ) {
                return;
            }

            const old =
                element.textContent;

            const value =
                prompt(
                    "Editar contenido",
                    old
                );

            if (
                value !== null &&
                value.trim() !== ""
            ) {

                snapshot();

                element.textContent =
                    value;

                saveProject();

            }

        }
    );


    /* Drag */

    element.addEventListener(
        "dragstart",
        event => {

            state.draggingElement =
                element;

            element.style.opacity =
                ".45";

            event.dataTransfer.effectAllowed =
                "move";

        }
    );


    element.addEventListener(
        "dragend",
        () => {

            element.style.opacity =
                "";

            state.draggingElement =
                null;

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

            const after =
                event.clientY >
                rect.top +
                rect.height / 2;

            if (after) {

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


/* =========================================================
   INSPECTOR
   ========================================================= */

function updateInspector() {

    if (!inspector) return;

    if (!state.selected) {

        inspector.classList.remove(
            "has-selection"
        );

        return;

    }

    inspector.classList.add(
        "has-selection"
    );

    const element =
        state.selected;


    const opacity =
        element.dataset.opacity ||
        "1";

    const scale =
        element.dataset.scale ||
        "1";


    const opacityInput =
        $("[data-opacity]", inspector);

    const scaleInput =
        $("[data-scale]", inspector);


    if (opacityInput) {

        opacityInput.value =
            opacity;

    }

    if (scaleInput) {

        scaleInput.value =
            scale;

    }


    $$(".color-chip", inspector)
        .forEach(chip => {

            chip.classList.toggle(
                "active",
                chip.dataset.color ===
                getComputedStyle(
                    element
                ).color
            );

        });

}


/* =========================================================
   OPACITY
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
   SCALE
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
   COLORS
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

                    const color =
                        chip.dataset.color;

                    state.selected.style.color =
                        color;

                    saveProject();

                    updateInspector();

                }
            );

        });


    const picker =
        $("[data-color-picker]");

    if (!picker) return;

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


/* =========================================================
   ELEMENT CREATION
   ========================================================= */

function createElement(type) {

    if (!page) return;

    snapshot();

    let element;

    switch (type) {

        case "heading":

            element =
                document.createElement(
                    "h1"
                );

            element.className =
                "page-element page-heading";

            element.textContent =
                "Nuevo título";

            break;


        case "text":

            element =
                document.createElement(
                    "p"
                );

            element.className =
                "page-element page-text";

            element.textContent =
                "Escribe algo aquí.";

            break;


        case "button":

            element =
                document.createElement(
                    "button"
                );

            element.className =
                "page-element page-button";

            element.textContent =
                "Nuevo botón";

            break;


        case "image":

            element =
                document.createElement(
                    "div"
                );

            element.className =
                "page-element page-image";

            element.textContent =
                "Imagen";

            break;


        default:

            return;

    }

    page.appendChild(
        element
    );

    setupElementEvents(
        element
    );

    selectElement(
        element
    );

    saveProject();

    closeSheet(
        elementSheet
    );

}


/* =========================================================
   ELEMENT SHEET
   ========================================================= */

function setupElementCreation() {

    $$("[data-create-element]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    createElement(
                        button.dataset.createElement
                    );

                }
            );

        });

}


/* =========================================================
   SHEETS
   ========================================================= */

function openSheet(sheet) {

    if (!sheet) return;

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

    if (
        !$(".sheet.open")
    ) {

        document.body.classList.remove(
            "sheet-open"
        );

    }

}


function setupSheets() {

    $$("[data-open-sheet]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const target =
                        document.getElementById(
                            button.dataset.openSheet
                        );

                    openSheet(
                        target
                    );

                }
            );

        });


    $$("[data-close-sheet]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    closeSheet(
                        button.closest(
                            ".sheet"
                        )
                    );

                }
            );

        });


    $$(".sheet-backdrop")
        .forEach(backdrop => {

            backdrop.addEventListener(
                "click",
                () => {

                    closeSheet(
                        backdrop.closest(
                            ".sheet"
                        )
                    );

                }
            );

        });

}


/* =========================================================
   SHEET TOUCH DRAG
   ========================================================= */

function setupSheetDragging() {

    $$(".sheet")
        .forEach(sheet => {

            const handle =
                $(".sheet-handle", sheet);

            if (!handle) return;

            let startY = 0;

            let currentY = 0;

            let dragging = false;


            handle.addEventListener(
                "pointerdown",
                event => {

                    dragging = true;

                    startY =
                        event.clientY;

                    currentY =
                        0;

                    handle.setPointerCapture(
                        event.pointerId
                    );

                }
            );


            handle.addEventListener(
                "pointermove",
                event => {

                    if (!dragging)
                        return;

                    currentY =
                        Math.max(
                            0,
                            event.clientY -
                            startY
                        );

                    sheet.style.transform =
                        `translateY(${currentY}px)`;

                }
            );


            handle.addEventListener(
                "pointerup",
                event => {

                    dragging = false;

                    handle.releasePointerCapture(
                        event.pointerId
                    );

                    sheet.style.transform =
                        "";

                    if (
                        currentY > 100
                    ) {

                        closeSheet(
                            sheet
                        );

                    }

                }
            );

        });

}


/* =========================================================
   ZOOM
   ========================================================= */

function applyZoom() {

    if (!page) return;

    page.style.transform =
        `scale(${state.zoom})`;

    const indicator =
        $("[data-zoom-value]");

    if (indicator) {

        indicator.textContent =
            `${Math.round(
                state.zoom * 100
            )}%`;

    }

}


function setupZoom() {

    $$("[data-zoom]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const action =
                        button.dataset.zoom;

                    if (
                        action === "in"
                    ) {

                        state.zoom =
                            clamp(
                                state.zoom + .1,
                                .4,
                                2.5
                            );

                    }

                    if (
                        action === "out"
                    ) {

                        state.zoom =
                            clamp(
                                state.zoom - .1,
                                .4,
                                2.5
                            );

                    }

                    if (
                        action === "reset"
                    ) {

                        state.zoom =
                            1;

                    }

                    applyZoom();

                    saveProject();

                }
            );

        });


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

function setPreview(enabled) {

    document.body.classList.toggle(
        "preview-mode",
        enabled
    );

}


function setupPreview() {

    $$("[data-preview]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const enabled =
                        !document.body.classList.contains(
                            "preview-mode"
                        );

                    setPreview(
                        enabled
                    );

                    showToast(
                        enabled
                            ? "Vista previa"
                            : "Editor"
                    );

                }
            );

        });

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    $$("[data-view]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    $$("[data-view]")
                        .forEach(item =>
                            item.classList.remove(
                                "active"
                            )
                        );

                    button.classList.add(
                        "active"
                    );

                    const view =
                        button.dataset.view;

                    if (
                        view === "code"
                    ) {

                        showToast(
                            "Editor de código"
                        );

                    }

                    if (
                        view === "editor"
                    ) {

                        showToast(
                            "Editor visual"
                        );

                    }

                }
            );

        });

}


/* =========================================================
   BACKGROUND BUTTON
   ========================================================= */

function setupBackgroundButton() {

    $$("[data-background]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openSheet(
                        backgroundSheet
                    );

                }
            );

        });

}


/* =========================================================
   SETTINGS / PROFILE
   ========================================================= */

function setupPlaceholders() {

    $$("[data-settings]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    showToast(
                        "Ajustes del proyecto"
                    );

                }
            );

        });


    $$("[data-profile]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    showToast(
                        "Perfil"
                    );

                }
            );

        });

}


/* =========================================================
   KEYBOARD
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

                if (event.shiftKey) {

                    redo();

                } else {

                    undo();

                }

            }


            if (
                modifier &&
                event.key.toLowerCase() === "y"
            ) {

                event.preventDefault();

                redo();

            }


            if (
                modifier &&
                event.key.toLowerCase() === "s"
            ) {

                event.preventDefault();

                saveProject();

                showToast(
                    "Proyecto guardado"
                );

            }


            if (
                event.key === "Escape"
            ) {

                if (
                    document.body.classList.contains(
                        "preview-mode"
                    )
                ) {

                    setPreview(
                        false
                    );

                }

                $$(".sheet.open")
                    .forEach(closeSheet);

            }

        }
    );

}


/* =========================================================
   CANVAS CLICK
   ========================================================= */

function setupCanvas() {

    canvas?.addEventListener(
        "click",
        event => {

            if (
                event.target === canvas ||
                event.target.classList.contains(
                    "canvas-stage"
                )
            ) {

                clearSelection();

            }

        }
    );

}


/* =========================================================
   SAVE BUTTON
   ========================================================= */

function setupSave() {

    $$("[data-save]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    snapshot();

                    localStorage.setItem(
                        STORAGE_KEY,
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

                    updateSaveStatus();

                }
            );

        });

}


/* =========================================================
   MOBILE BACKDROP
   ========================================================= */

function setupMobileGestures() {

    let startX = 0;
    let startY = 0;

    document.addEventListener(
        "pointerdown",
        event => {

            startX =
                event.clientX;

            startY =
                event.clientY;

        },
        {
            passive: true
        }
    );


    document.addEventListener(
        "pointerup",
        event => {

            const dx =
                event.clientX -
                startX;

            const dy =
                event.clientY -
                startY;


            /*
             * Swipe horizontal hacia
             * la derecha desde borde.
             */

            if (
                Math.abs(dx) > 120 &&
                Math.abs(dx) >
                Math.abs(dy) * 1.5 &&
                startX < 35 &&
                window.innerWidth < 800
            ) {

                showToast(
                    "Herramientas"
                );

            }

        },
        {
            passive: true
        }
    );

}


/* =========================================================
   RESIZE
   ========================================================= */

function setupResize() {

    let timer;

    window.addEventListener(
        "resize",
        () => {

            clearTimeout(timer);

            timer = setTimeout(
                () => {

                    applyZoom();

                },
                100
            );

        }
    );

}


/* =========================================================
   INITIALIZATION
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


    refreshElements();

    snapshot();

    setupWallpaper();

    setupSmoke();

    setupMotion();

    setupParallax();

    setupAllGlass();

    setupOpacity();

    setupScale();

    setupColors();

    setupElementCreation();

    setupSheets();

    setupSheetDragging();

    setupZoom();

    setupPreview();

    setupNavigation();

    setupBackgroundButton();

    setupPlaceholders();

    setupKeyboard();

    setupCanvas();

    setupSave();

    setupMobileGestures();

    setupResize();

    applyZoom();

    updateInspector();

}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

} else {

    init();

}
