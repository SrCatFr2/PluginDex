/* =========================================================
   PLUGINDEX 2.0
   APP ENGINE
   Liquid Glass Black
   ========================================================= */

"use strict";


/* =========================================================
   DOM
   ========================================================= */

const $ = (selector, parent = document) =>
    parent.querySelector(selector);

const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];


const app = $("#app");
const canvasStage = $("#canvasStage");
const designPage = $("#designPage");

const inspector = $("#inspector");
const selectedElementName = $("#selectedElementName");

const elementSheet = $("#elementSheet");
const backgroundSheet = $("#backgroundSheet");
const sheetBackdrop = $("#sheetBackdrop");

const toast = $("#toast");
const toastText = $("#toastText");

const documentStatus = $("#documentStatus");

const zoomValue = $("#zoomValue");


/* =========================================================
   STATE
   ========================================================= */

const state = {

    selectedElement: null,

    zoom: 1,

    wallpaper: "black",

    smoke: 65,

    motion: 45,

    pointer: {
        x: .5,
        y: .5,

        targetX: .5,
        targetY: .5
    },

    pageRotation: {
        x: 0,
        y: 0
    },

    history: [],

    historyIndex: -1,

    isDragging: false,

    dragElement: null,

    saveTimer: null

};


/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY = "plugindex-project-v2";


function saveProject() {

    const project = {

        html: designPage.innerHTML,

        wallpaper: state.wallpaper,

        smoke: state.smoke,

        motion: state.motion,

        zoom: state.zoom

    };

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(project)
        );

        setStatus("Guardado");

    } catch (error) {

        console.warn(
            "No se pudo guardar el proyecto.",
            error
        );

    }

}


function loadProject() {

    try {

        const raw =
            localStorage.getItem(STORAGE_KEY);

        if (!raw) return;

        const project =
            JSON.parse(raw);

        if (project.html) {

            designPage.innerHTML =
                project.html;

        }

        if (project.wallpaper) {

            state.wallpaper =
                project.wallpaper;

        }

        if (typeof project.smoke === "number") {

            state.smoke =
                project.smoke;

        }

        if (typeof project.motion === "number") {

            state.motion =
                project.motion;

        }

        if (typeof project.zoom === "number") {

            state.zoom =
                project.zoom;

        }

        applyWallpaper();
        applySmoke();
        updateZoom();

        setStatus("Proyecto restaurado");

    } catch (error) {

        console.warn(
            "Proyecto guardado inválido.",
            error
        );

    }

}


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(text) {

    if (!documentStatus) return;

    documentStatus.textContent =
        text;

}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer = null;


function showToast(message) {

    if (!toast || !toastText) return;

    toastText.textContent =
        message;

    toast.classList.add("visible");

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(() => {

            toast.classList.remove("visible");

        }, 1800);

}


/* =========================================================
   AUTO SAVE
   ========================================================= */

function requestSave() {

    setStatus("Cambios sin guardar");

    clearTimeout(state.saveTimer);

    state.saveTimer =
        setTimeout(() => {

            saveProject();

        }, 700);

}


/* =========================================================
   POINTER / LIQUID GLASS MOVEMENT
   ========================================================= */

function updatePointer(x, y) {

    state.pointer.targetX =
        Math.max(
            0,
            Math.min(1, x)
        );

    state.pointer.targetY =
        Math.max(
            0,
            Math.min(1, y)
        );

}


function pointerMove(event) {

    const x =
        event.clientX /
        window.innerWidth;

    const y =
        event.clientY /
        window.innerHeight;

    updatePointer(x, y);

}


function touchMove(event) {

    if (!event.touches.length)
        return;

    const touch =
        event.touches[0];

    const x =
        touch.clientX /
        window.innerWidth;

    const y =
        touch.clientY /
        window.innerHeight;

    updatePointer(x, y);

}


function animateEnvironment() {

    const p =
        state.pointer;

    p.x +=
        (p.targetX - p.x)
        * .045;

    p.y +=
        (p.targetY - p.y)
        * .045;


    const centerX =
        p.x - .5;

    const centerY =
        p.y - .5;


    const motion =
        state.motion / 100;


    /* Wallpaper */

    const wallX =
        centerX *
        34 *
        motion;

    const wallY =
        centerY *
        25 *
        motion;


    document.documentElement.style
        .setProperty(
            "--wall-x",
            `${wallX}px`
        );

    document.documentElement.style
        .setProperty(
            "--wall-y",
            `${wallY}px`
        );


    /* Ambient light */

    const lightX =
        50 + centerX * 35;

    const lightY =
        45 + centerY * 30;

    document.documentElement.style
        .setProperty(
            "--light-x",
            `${lightX}%`
        );

    document.documentElement.style
        .setProperty(
            "--light-y",
            `${lightY}%`
        );


    /* Topbar movement */

    document.documentElement.style
        .setProperty(
            "--top-x",
            `${centerX * 3 * motion}px`
        );

    document.documentElement.style
        .setProperty(
            "--top-y",
            `${centerY * 2 * motion}px`
        );


    /* Tool dock */

    document.documentElement.style
        .setProperty(
            "--dock-x",
            `${centerX * -4 * motion}px`
        );

    document.documentElement.style
        .setProperty(
            "--dock-y",
            `${centerY * -3 * motion}px`
        );


    /* Canvas page */

    const rotationY =
        centerX *
        1.8 *
        motion;

    const rotationX =
        centerY *
        -1.2 *
        motion;


    state.pageRotation.x =
        rotationX;

    state.pageRotation.y =
        rotationY;


    designPage.style
        .setProperty(
            "--page-rx",
            `${rotationX}deg`
        );

    designPage.style
        .setProperty(
            "--page-ry",
            `${rotationY}deg`
        );


    requestAnimationFrame(
        animateEnvironment
    );

}


document.addEventListener(
    "pointermove",
    pointerMove,
    { passive: true }
);

document.addEventListener(
    "touchmove",
    touchMove,
    { passive: true }
);


/* =========================================================
   WALLPAPER
   ========================================================= */

function applyWallpaper() {

    const wallpaper =
        $(".wallpaper");

    if (!wallpaper)
        return;


    const backgrounds = {

        black: `
            radial-gradient(
                circle at 18% 20%,
                rgba(255,255,255,.07),
                transparent 24%
            ),
            radial-gradient(
                circle at 78% 25%,
                rgba(120,130,145,.055),
                transparent 28%
            ),
            radial-gradient(
                circle at 48% 85%,
                rgba(255,255,255,.035),
                transparent 30%
            ),
            #050607
        `,

        silver: `
            radial-gradient(
                circle at 30% 20%,
                rgba(210,215,220,.12),
                transparent 27%
            ),
            radial-gradient(
                circle at 80% 70%,
                rgba(140,145,155,.08),
                transparent 32%
            ),
            #080a0d
        `,

        blue: `
            radial-gradient(
                circle at 72% 25%,
                rgba(80,105,135,.22),
                transparent 32%
            ),
            radial-gradient(
                circle at 20% 80%,
                rgba(55,70,90,.13),
                transparent 30%
            ),
            #05080d
        `,

        violet: `
            radial-gradient(
                circle at 30% 30%,
                rgba(105,85,125,.2),
                transparent 32%
            ),
            radial-gradient(
                circle at 80% 80%,
                rgba(70,55,90,.12),
                transparent 30%
            ),
            #08060c
        `

    };


    wallpaper.style.background =
        backgrounds[state.wallpaper]
        || backgrounds.black;


    $$(".wallpaper-choice")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.wallpaper ===
                state.wallpaper
            );

        });

}


/* =========================================================
   SMOKE
   ========================================================= */

function applySmoke() {

    const opacity =
        .08 +
        (state.smoke / 100) * .34;


    $$(".smoke")
        .forEach(smoke => {

            smoke.style.opacity =
                opacity;

        });

}


/* =========================================================
   WALLPAPER CONTROLS
   ========================================================= */

$$(".wallpaper-choice")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const wallpaper =
                    button.dataset.wallpaper;

                if (!wallpaper)
                    return;

                state.wallpaper =
                    wallpaper;

                applyWallpaper();

                requestSave();

                showToast(
                    "Wallpaper actualizado"
                );

            }
        );

    });


const smokeControl =
    $("#smokeControl");

if (smokeControl) {

    smokeControl.addEventListener(
        "input",
        () => {

            state.smoke =
                Number(
                    smokeControl.value
                );

            applySmoke();

            requestSave();

        }
    );

}


const motionControl =
    $("#motionControl");

if (motionControl) {

    motionControl.addEventListener(
        "input",
        () => {

            state.motion =
                Number(
                    motionControl.value
                );

            requestSave();

        }
    );

}


/* =========================================================
   SHEETS
   ========================================================= */

function openSheet(sheet) {

    if (!sheet)
        return;

    closeInspector();

    elementSheet.classList.remove(
        "visible"
    );

    backgroundSheet.classList.remove(
        "visible"
    );

    sheet.classList.add(
        "visible"
    );

    sheet.setAttribute(
        "aria-hidden",
        "false"
    );

    sheetBackdrop.classList.add(
        "visible"
    );

}


function closeSheets() {

    elementSheet.classList.remove(
        "visible"
    );

    backgroundSheet.classList.remove(
        "visible"
    );

    sheetBackdrop.classList.remove(
        "visible"
    );

    elementSheet.setAttribute(
        "aria-hidden",
        "true"
    );

    backgroundSheet.setAttribute(
        "aria-hidden",
        "true"
    );

}


$("#addElementButton")
    ?.addEventListener(
        "click",
        () => {

            openSheet(
                elementSheet
            );

        }
    );


$("#backgroundButton")
    ?.addEventListener(
        "click",
        () => {

            openSheet(
                backgroundSheet
            );

        }
    );


$("#closeSheet")
    ?.addEventListener(
        "click",
        closeSheets
    );


$("#closeBackground")
    ?.addEventListener(
        "click",
        closeSheets
    );


sheetBackdrop
    ?.addEventListener(
        "click",
        closeSheets
    );


/* =========================================================
   ELEMENT CREATION
   ========================================================= */

$$("[data-create]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const type =
                    button.dataset.create;

                createElement(type);

                closeSheets();

            }
        );

    });


function createElement(type) {

    let element;


    if (type === "heading") {

        element =
            document.createElement(
                "div"
            );

        element.className =
            "page-element page-heading";

        element.dataset.element =
            "heading";

        element.textContent =
            "Nuevo título";

    }


    else if (type === "text") {

        element =
            document.createElement(
                "div"
            );

        element.className =
            "page-element page-text";

        element.dataset.element =
            "text";

        element.textContent =
            "Nuevo texto";

    }


    else if (type === "button") {

        element =
            document.createElement(
                "button"
            );

        element.className =
            "page-element page-button";

        element.dataset.element =
            "button";

        element.textContent =
            "Nuevo botón";

    }


    else if (type === "image") {

        element =
            document.createElement(
                "div"
            );

        element.className =
            "page-element page-image";

        element.dataset.element =
            "image";

        element.textContent =
            "Imagen";

        element.style.width =
            "220px";

        element.style.height =
            "140px";

        element.style.display =
            "grid";

        element.style.placeItems =
            "center";

        element.style.borderRadius =
            "16px";

        element.style.background =
            "#dedede";

        element.style.color =
            "#666";

    }


    if (!element)
        return;


    element.draggable = true;

    designPage.appendChild(
        element
    );

    attachElement(element);

    selectElement(element);

    pushHistory();

    requestSave();

    showToast(
        "Elemento añadido"
    );

}


/* =========================================================
   ELEMENT SELECTION
   ========================================================= */

function getElementName(element) {

    if (!element)
        return "Nada seleccionado";


    const names = {

        heading: "Título",

        text: "Texto",

        button: "Botón",

        image: "Imagen"

    };


    return names[
        element.dataset.element
    ]
    || "Elemento";

}


function selectElement(element) {

    if (!element)
        return;


    if (
        state.selectedElement &&
        state.selectedElement !== element
    ) {

        state.selectedElement
            .classList.remove(
                "selected"
            );

    }


    state.selectedElement =
        element;


    element.classList.add(
        "selected"
    );


    selectedElementName.textContent =
        getElementName(
            element
        );


    inspector.classList.add(
        "visible"
    );

    inspector.setAttribute(
        "aria-hidden",
        "false"
    );


    updateInspector();

}


function closeInspector() {

    inspector.classList.remove(
        "visible"
    );

    inspector.setAttribute(
        "aria-hidden",
        "true"
    );

}


$("#closeInspector")
    ?.addEventListener(
        "click",
        closeInspector
    );


/* =========================================================
   ELEMENT INTERACTION
   ========================================================= */

function attachElement(element) {

    if (!element)
        return;


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

            makeEditable(
                element
            );

        }
    );


    element.addEventListener(
        "dragstart",
        event => {

            state.dragElement =
                element;

            state.isDragging =
                true;

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

            state.dragElement =
                null;

            state.isDragging =
                false;

            requestSave();

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

            event.stopPropagation();

            if (
                !state.dragElement ||
                state.dragElement === element
            )
                return;


            const rect =
                element.getBoundingClientRect();

            const middle =
                rect.top +
                rect.height / 2;


            if (
                event.clientY <
                middle
            ) {

                designPage.insertBefore(
                    state.dragElement,
                    element
                );

            } else {

                designPage.insertBefore(
                    state.dragElement,
                    element.nextSibling
                );

            }


            pushHistory();

            requestSave();

        }
    );

}


/* Attach initial elements */

$$(
    ".page-element",
    designPage
).forEach(
    attachElement
);


/* =========================================================
   PAGE CLICK
   ========================================================= */

designPage.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            designPage
        ) {

            closeInspector();

            if (
                state.selectedElement
            ) {

                state.selectedElement
                    .classList.remove(
                        "selected"
                    );

                state.selectedElement =
                    null;

            }

        }

    }
);


/* =========================================================
   DOUBLE CLICK EDIT
   ========================================================= */

function makeEditable(element) {

    if (
        !element ||
        element.dataset.editing ===
        "true"
    )
        return;


    const original =
        element.textContent;


    element.dataset.editing =
        "true";

    element.contentEditable =
        "true";

    element.focus();


    const finish = () => {

        element.contentEditable =
            "false";

        element.dataset.editing =
            "false";

        element.removeEventListener(
            "blur",
            finish
        );

        element.removeEventListener(
            "keydown",
            keyHandler
        );

        if (
            element.textContent !==
            original
        ) {

            pushHistory();

            requestSave();

        }

    };


    const keyHandler =
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                element.blur();

            }

            if (
                event.key ===
                "Escape"
            ) {

                element.textContent =
                    original;

                element.blur();

            }

        };


    element.addEventListener(
        "blur",
        finish
    );

    element.addEventListener(
        "keydown",
        keyHandler
    );

}


/* =========================================================
   INSPECTOR
   ========================================================= */

function updateInspector() {

    const element =
        state.selectedElement;

    if (!element)
        return;


    const opacity =
        Math.round(
            parseFloat(
                getComputedStyle(
                    element
                ).opacity
            ) * 100
        );


    const opacityControl =
        $("#opacityControl");

    const opacityOutput =
        $("#opacityOutput");


    if (opacityControl) {

        opacityControl.value =
            opacity;

    }

    if (opacityOutput) {

        opacityOutput.textContent =
            `${opacity}%`;

    }


    const transform =
        element.dataset.scale
        || "100";


    const sizeControl =
        $("#sizeControl");

    const sizeOutput =
        $("#sizeOutput");


    if (sizeControl) {

        sizeControl.value =
            transform;

    }

    if (sizeOutput) {

        sizeOutput.textContent =
            `${transform}%`;

    }


    $$(".color-chip")
        .forEach(chip => {

            chip.classList.remove(
                "active"
            );

        });

}


const opacityControl =
    $("#opacityControl");

opacityControl?.addEventListener(
    "input",
    () => {

        if (
            !state.selectedElement
        )
            return;


        const value =
            Number(
                opacityControl.value
            );


        state.selectedElement.style.opacity =
            value / 100;


        $("#opacityOutput")
            .textContent =
            `${value}%`;


        requestSave();

    }
);


const sizeControl =
    $("#sizeControl");

sizeControl?.addEventListener(
    "input",
    () => {

        if (
            !state.selectedElement
        )
            return;


        const value =
            Number(
                sizeControl.value
            );


        state.selectedElement.dataset.scale =
            value;


        state.selectedElement.style.transform =
            `scale(${value / 100})`;


        $("#sizeOutput")
            .textContent =
            `${value}%`;


        requestSave();

    }
);


/* =========================================================
   COLOR CONTROL
   ========================================================= */

$$(".color-chip[data-color]")
    .forEach(chip => {

        chip.addEventListener(
            "click",
            () => {

                if (
                    !state.selectedElement
                )
                    return;


                const color =
                    chip.dataset.color;


                state.selectedElement.style.color =
                    color;


                $$(".color-chip")
                    .forEach(item =>
                        item.classList.remove(
                            "active"
                        )
                    );


                chip.classList.add(
                    "active"
                );


                requestSave();

            }
        );

    });


$("#customColorButton")
    ?.addEventListener(
        "click",
        () => {

            if (
                !state.selectedElement
            )
                return;


            const picker =
                document.createElement(
                    "input"
                );

            picker.type =
                "color";

            picker.value =
                "#ffffff";


            picker.addEventListener(
                "input",
                () => {

                    state.selectedElement
                        .style
                        .color =
                        picker.value;

                    requestSave();

                }
            );


            picker.click();

        }
    );


/* =========================================================
   ZOOM
   ========================================================= */

function updateZoom() {

    state.zoom =
        Math.max(
            .5,
            Math.min(
                1.5,
                state.zoom
            )
        );


    designPage.style
        .setProperty(
            "--page-scale",
            state.zoom
        );


    zoomValue.textContent =
        `${Math.round(
            state.zoom * 100
        )}%`;

}


$("#zoomIn")
    ?.addEventListener(
        "click",
        () => {

            state.zoom +=
                .1;

            updateZoom();

            requestSave();

        }
    );


$("#zoomOut")
    ?.addEventListener(
        "click",
        () => {

            state.zoom -=
                .1;

            updateZoom();

            requestSave();

        }
    );


/* =========================================================
   MOUSE WHEEL ZOOM
   ========================================================= */

canvasStage?.addEventListener(
    "wheel",
    event => {

        if (!event.ctrlKey)
            return;


        event.preventDefault();


        const direction =
            event.deltaY > 0
                ? -.05
                : .05;


        state.zoom +=
            direction;


        updateZoom();

    },
    { passive: false }
);


/* =========================================================
   UNDO / REDO
   ========================================================= */

function getSnapshot() {

    return {
        html:
            designPage.innerHTML
    };

}


function restoreSnapshot(snapshot) {

    if (!snapshot)
        return;


    designPage.innerHTML =
        snapshot.html;


    $$(".page-element", designPage)
        .forEach(
            attachElement
        );


    state.selectedElement =
        null;

    closeInspector();

    requestSave();

}


function pushHistory() {

    const snapshot =
        getSnapshot();


    state.history =
        state.history.slice(
            0,
            state.historyIndex + 1
        );


    state.history.push(
        snapshot
    );


    state.historyIndex =
        state.history.length - 1;


    if (
        state.history.length >
        50
    ) {

        state.history.shift();

        state.historyIndex--;

    }

}


function undo() {

    if (
        state.historyIndex <=
        0
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


    showToast(
        "Deshecho"
    );

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


    showToast(
        "Rehecho"
    );

}


$("#undoButton")
    ?.addEventListener(
        "click",
        undo
    );


$("#redoButton")
    ?.addEventListener(
        "click",
        redo
    );


/* =========================================================
   KEYBOARD
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        const target =
            event.target;


        const typing =
            target.tagName ===
                "INPUT"
            ||
            target.tagName ===
                "TEXTAREA"
            ||
            target.isContentEditable;


        if (
            (event.ctrlKey ||
             event.metaKey)
            &&
            event.key.toLowerCase() ===
            "z"
            &&
            !typing
        ) {

            event.preventDefault();

            undo();

        }


        if (
            (event.ctrlKey ||
             event.metaKey)
            &&
            event.key.toLowerCase() ===
            "y"
            &&
            !typing
        ) {

            event.preventDefault();

            redo();

        }


        if (
            (event.ctrlKey ||
             event.metaKey)
            &&
            event.key.toLowerCase() ===
            "s"
        ) {

            event.preventDefault();

            saveProject();

            showToast(
                "Proyecto guardado"
            );

        }


        if (
            event.key ===
            "Escape"
        ) {

            closeSheets();

            closeInspector();

        }

    }
);


/* =========================================================
   PREVIEW
   ========================================================= */

$("#previewButton")
    ?.addEventListener(
        "click",
        () => {

            document.body
                .classList.toggle(
                    "preview-mode"
                );


            const preview =
                document.body
                    .classList.contains(
                        "preview-mode"
                    );


            showToast(
                preview
                    ? "Vista previa"
                    : "Editor"
            );

        }
    );


/* =========================================================
   TOP NAVIGATION
   ========================================================= */

$$(".nav-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                $$(".nav-item")
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


/* =========================================================
   MOBILE DOCK
   ========================================================= */

$$(".mobile-dock-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                $$(".mobile-dock-item")
                    .forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                button.classList.add(
                    "active"
                );


                const action =
                    button.dataset.mobile;


                if (
                    action ===
                    "add"
                ) {

                    openSheet(
                        elementSheet
                    );

                }


                if (
                    action ===
                    "design"
                ) {

                    openSheet(
                        backgroundSheet
                    );

                }


                if (
                    action ===
                    "elements"
                ) {

                    openSheet(
                        elementSheet
                    );

                }


                if (
                    action ===
                    "code"
                ) {

                    showToast(
                        "Editor de código"
                    );

                }

            }
        );

    });


/* =========================================================
   SETTINGS
   ========================================================= */

$("#settingsButton")
    ?.addEventListener(
        "click",
        () => {

            showToast(
                "Configuración"
            );

        }
    );


$("#profileButton")
    ?.addEventListener(
        "click",
        () => {

            showToast(
                "Perfil"
            );

        }
    );


/* =========================================================
   RESPONSIVE BEHAVIOR
   ========================================================= */

let lastWidth =
    window.innerWidth;


window.addEventListener(
    "resize",
    () => {

        const width =
            window.innerWidth;


        if (
            Math.abs(
                width -
                lastWidth
            ) > 100
        ) {

            closeSheets();

            closeInspector();

        }


        lastWidth =
            width;

    }
);


/* =========================================================
   TOUCH —
