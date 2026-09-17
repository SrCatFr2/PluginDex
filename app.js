/* =========================================================
   PLUGINDEX ENGINE
========================================================= */

"use strict";


/* =========================================================
   STATE
========================================================= */

const state = {

    project: {

        name: "MiProyecto",

        background: {

            type: "solid",

            color1: "#c0c0c0",

            color2: "#808080",

            intensity: 35

        },

        glass: {

            enabled: true,

            opacity: 72,

            blur: 8

        },

        font: "pixel",

        maxWidth: "1024px"

    },

    selected: {

        type: "page",

        element: null

    }

};


/* =========================================================
   DOM
========================================================= */

const $ = selector =>
    document.querySelector(selector);


const $$ = selector =>
    document.querySelectorAll(selector);


/* =========================================================
   PDL EDITOR
========================================================= */

const pdlEditor =
    $("#pdlEditor");

const lineNumbers =
    $("#lineNumbers");


function updateLineNumbers() {

    const lines =
        pdlEditor.value.split("\n").length;

    let html = "";

    for (
        let i = 1;
        i <= lines;
        i++
    ) {

        html += i;

        if (i < lines) {
            html += "<br>";
        }
    }

    lineNumbers.innerHTML =
        html;
}


pdlEditor.addEventListener(
    "input",
    () => {

        updateLineNumbers();

        debounceCompile();

    }
);


pdlEditor.addEventListener(
    "scroll",
    () => {

        lineNumbers.scrollTop =
            pdlEditor.scrollTop;

    }
);


updateLineNumbers();


/* =========================================================
   SIMPLE PDL COMPILER
========================================================= */

function compilePDL(source) {

    const lines =
        source
            .split("\n")
            .map(line =>
                line.trim()
            )
            .filter(Boolean);


    const result = {

        title:
            "PluginDex",

        text:
            "Crea páginas web fácilmente.",

        button:
            "Comenzar"

    };


    for (const line of lines) {

        let match;


        match =
            line.match(
                /^title\s+"(.+)"$/i
            );

        if (match) {

            result.title =
                match[1];

            continue;
        }


        match =
            line.match(
                /^text\s+"(.+)"$/i
            );

        if (match) {

            result.text =
                match[1];

            continue;
        }


        match =
            line.match(
                /^button\s+"(.+)"$/i
            );

        if (match) {

            result.button =
                match[1];

            continue;
        }

    }


    return result;
}


/* =========================================================
   RENDER PDL
========================================================= */

function renderPDL() {

    const result =
        compilePDL(
            pdlEditor.value
        );


    const title =
        $(".hero h1");

    const text =
        $(".hero p");

    const button =
        $(".hero-button");


    if (title) {

        title.innerHTML =
            escapeHTML(
                result.title
            );
    }


    if (text) {

        text.textContent =
            result.text;
    }


    if (button) {

        button.textContent =
            result.button;
    }


    log(
        "[PluginDex] Página actualizada."
    );
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   DEBOUNCE
========================================================= */

let compileTimer = null;


function debounceCompile() {

    clearTimeout(
        compileTimer
    );


    compileTimer =
        setTimeout(
            renderPDL,
            250
        );
}


/* =========================================================
   CONSOLE
========================================================= */

function log(message) {

    const consoleElement =
        $("#console");


    if (!consoleElement) {
        return;
    }


    const line =
        document.createElement("div");


    line.textContent =
        message;


    consoleElement.appendChild(
        line
    );


    consoleElement.scrollTop =
        consoleElement.scrollHeight;
}


/* =========================================================
   GLASS
========================================================= */

function updateGlass() {

    const website =
        $("#website");


    const enabled =
        $("#glassToggle").checked;


    const opacity =
        Number(
            $("#glassOpacity").value
        );


    const blur =
        Number(
            $("#glassBlur").value
        );


    state.project.glass.enabled =
        enabled;


    state.project.glass.opacity =
        opacity;


    state.project.glass.blur =
        blur;


    const glassValue =
        enabled
            ? `rgba(255,255,255,${opacity / 100})`
            : "rgba(255,255,255,0)";


    website.style.setProperty(
        "--custom-glass",
        glassValue
    );


    website.querySelectorAll(
        ".hero, .site-card, .site-header"
    ).forEach(
        element => {

            if (enabled) {

                element.style.background =
                    glassValue;

                element.style.backdropFilter =
                    `blur(${blur}px)`;

                element.style.webkitBackdropFilter =
                    `blur(${blur}px)`;

            } else {

                element.style.background =
                    "#d0d0d0";

                element.style.backdropFilter =
                    "none";

                element.style.webkitBackdropFilter =
                    "none";
            }

        }
    );
}


/* =========================================================
   BACKGROUND
========================================================= */

function updateBackground() {

    const website =
        $("#website");


    const type =
        $("#backgroundType").value;


    const c1 =
        $("#bgColor1").value;


    const c2 =
        $("#bgColor2").value;


    const intensity =
        Number(
            $("#bgIntensity").value
        );


    state.project.background = {

        type,

        color1: c1,

        color2: c2,

        intensity

    };


    applyBackground(
        website,
        type,
        c1,
        c2,
        intensity
    );
}


function applyBackground(
    element,
    type,
    c1,
    c2,
    intensity
) {

    const opacity =
        intensity / 100;


    element.style.background =
        "";


    element.style.backgroundImage =
        "none";


    if (type === "solid") {

        element.style.background =
            c1;

        return;
    }


    if (type === "gradient") {

        element.style.background =
            `linear-gradient(
                135deg,
                ${c1},
                ${c2}
            )`;

        return;
    }


    if (type === "grid") {

        element.style.backgroundColor =
            c1;

        element.style.backgroundImage =
            `
            linear-gradient(
                rgba(0,0,0,${opacity * .18}) 1px,
                transparent 1px
            ),
            linear-gradient(
                90deg,
                rgba(0,0,0,${opacity * .18}) 1px,
                transparent 1px
            )
            `;

        element.style.backgroundSize =
            "12px 12px";

        return;
    }


    if (type === "dots") {

        element.style.backgroundColor =
            c1;

        element.style.backgroundImage =
            `
            radial-gradient(
                ${c2} 1px,
                transparent 1px
            )
            `;

        element.style.backgroundSize =
            "10px 10px";

    }
}


/* =========================================================
   PROPERTY EVENTS
========================================================= */

const propertyInputs = [

    "#glassToggle",
    "#glassOpacity",
    "#glassBlur",
    "#backgroundType",
    "#bgColor1",
    "#bgColor2",
    "#bgIntensity",
    "#fontSelect",
    "#maxWidth"

];


propertyInputs.forEach(
    selector => {

        const element =
            $(selector);


        if (!element) {
            return;
        }


        element.addEventListener(
            "input",
            applyProperties
        );


        element.addEventListener(
            "change",
            applyProperties
        );

    }
);


function applyProperties() {

    updateGlass();

    updateBackground();


    const website =
        $("#website");


    const font =
        $("#fontSelect").value;


    const maxWidth =
        $("#maxWidth").value;


    state.project.font =
        font;


    state.project.maxWidth =
        maxWidth;


    website.style.maxWidth =
        maxWidth;


    if (font === "pixel") {

        website.style.fontFamily =
            '"Courier New", monospace';

    } else if (font === "system") {

        website.style.fontFamily =
            'Arial, Helvetica, sans-serif';

    } else {

        website.style.fontFamily =
            '"Courier New", monospace';
    }


    const color =
        $("#propColor").value;


    const colorText =
        $("#propColorText");


    if (colorText) {

        colorText.value =
            color.toUpperCase();
    }


    const size =
        $("#propSize").value;


    website.style.setProperty(
        "--project-size",
        `${size}px`
    );


    const radius =
        $("#propRadius").value;


    website.querySelectorAll(
        ".site-header, .hero, .site-card"
    ).forEach(
        element => {

            element.style.borderRadius =
                `${radius}px`;

        }
    );
}


/* =========================================================
   COLOR TEXT
========================================================= */

$("#propColor")
    .addEventListener(
        "input",
        event => {

            $("#propColorText").value =
                event.target.value
                    .toUpperCase();

        }
    );


$("#propColorText")
    .addEventListener(
        "change",
        event => {

            const value =
                event.target.value;


            if (
                /^#[0-9A-Fa-f]{6}$/
                .test(value)
            ) {

                $("#propColor").value =
                    value;

            }

        }
    );


/* =========================================================
   COMPONENTS
========================================================= */

$$(".component").forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                addComponent(
                    button.dataset.component
                );

            }
        );

    }
);


function addComponent(type) {

    const website =
        $("#website");


    let element;


    switch (type) {

        case "text":

            element =
                document.createElement("p");

            element.textContent =
                "Nuevo texto";

            break;


        case "title":

            element =
                document.createElement("h2");

            element.textContent =
                "Nuevo título";

            break;


        case "button":

            element =
                document.createElement("button");

            element.textContent =
                "Nuevo botón";

            break;


        case "image":

            element =
                document.createElement("div");

            element.textContent =
                "[ IMAGEN ]";

            element.style.height =
                "100px";

            element.style.display =
                "grid";

            element.style.placeItems =
                "center";

            element.style.background =
                "#999";

            break;


        case "container":

            element =
                document.createElement("section");

            element.textContent =
                "Nuevo contenedor";

            element.style.padding =
                "30px";

            element.style.border =
                "2px dashed #666";

            break;


        case "divider":

            element =
                document.createElement("hr");

            break;


        case "card":

            element =
                document.createElement("div");

            element.innerHTML =
                "<strong>Nueva tarjeta</strong><p>Contenido</p>";

            element.style.padding =
                "20px";

            element.style.border =
                "2px solid #777";

            break;


        case "navbar":

            element =
                document.createElement("nav");

            element.innerHTML =
                "<a>Inicio</a> · <a>Sobre</a> · <a>Contacto</a>";

            element.style.padding =
                "15px";

            break;


        case "input":

            element =
                document.createElement("input");

            element.placeholder =
                "Escribe aquí...";

            break;


        case "badge":

            element =
                document.createElement("span");

            element.textContent =
                "NUEVO";

            element.style.padding =
                "5px 8px";

            element.style.background =
                "#000080";

            element.style.color =
                "white";

            break;


        case "grid":

            element =
                document.createElement("div");

            element.textContent =
                "GRID";

            element.style.display =
                "grid";

            element.style.gridTemplateColumns =
                "repeat(3, 1fr)";

            element.style.gap =
                "10px";

            element.style.padding =
                "20px";

            break;


        case "columns":

            element =
                document.createElement("div");

            element.textContent =
                "COLUMNAS";

            element.style.display =
                "flex";

            element.style.gap =
                "20px";

            element.style.padding =
                "20px";

            break;


        default:

            return;
    }


    element.classList.add(
        "plugin-element"
    );


    element.style.margin =
        "10px 0";


    element.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            selectElement(
                element,
                type
            );

        }
    );


    website.appendChild(
        element
    );


    selectElement(
        element,
        type
    );


    log(
        `[PluginDex] Componente "${type}" añadido.`
    );
}


/* =========================================================
   SELECT ELEMENT
========================================================= */

function selectElement(
    element,
    type
) {

    $$(".plugin-selected")
        .forEach(
            el =>
                el.classList.remove(
                    "plugin-selected"
                )
        );


    element.classList.add(
        "plugin-selected"
    );


    state.selected.element =
        element;

    state.selected.type =
        type;


    $("#selectedName").textContent =
        type;
}


/* =========================================================
   SEARCH
========================================================= */

$("#componentSearch")
    .addEventListener(
        "input",
        event => {

            const query =
                event.target.value
                    .toLowerCase()
                    .trim();


            $$(".component")
                .forEach(
                    element => {

                        const text =
                            element.textContent
                                .toLowerCase();


                        element.style.display =
                            text.includes(query)
                                ? "flex"
                                : "none";

                    }
                );

        }
    );


/* =========================================================
   BOTTOM TABS
========================================================= */

const bottomTabs =
    $$(".bottom-tab");


bottomTabs.forEach(
    tab => {

        tab.addEventListener(
            "click",
            () => {

                bottomTabs.forEach(
                    t =>
                        t.classList.remove(
                            "active"
                        )
                );


                tab.classList.add(
                    "active"
                );


                const text =
                    tab.textContent
                        .trim()
                        .toLowerCase();


                $(".code-editor").style.display =
                    text === "código pdl"
                        ? "flex"
                        : "none";


                $(".blocks-editor").style.display =
                    text === "bloques"
                        ? "flex"
                        : "none";


                $(".console").style.display =
                    text === "consola"
                        ? "block"
                        : "none";

            }
        );

    }
);


/* =========================================================
   COMPILE
========================================================= */

$("#compileButton")
    .addEventListener(
        "click",
        () => {

            log(
                "[PluginDex] Compilando PDL..."
            );


            const result =
                compilePDL(
                    pdlEditor.value
                );


            renderPDL();


            log(
                `[PluginDex] Título: ${result.title}`
            );

            log(
                "[PluginDex] HTML generado."
            );

            log(
                "[PluginDex] CSS generado."
            );

            log(
                "[PluginDex] Proyecto compilado correctamente."
            );

        }
    );


/* =========================================================
   SAVE LOCAL
========================================================= */

function saveProject() {

    const data = {

        pdl:
            pdlEditor.value,

        settings:
            state.project

    };


    localStorage.setItem(
        "plugindex-project",
        JSON.stringify(data)
    );


    log(
        "[PluginDex] Proyecto guardado localmente."
    );
}


$("#saveProject")
    .addEventListener(
        "click",
        saveProject
    );


/* =========================================================
   LOAD LOCAL
========================================================= */

function loadProject() {

    const raw =
        localStorage.getItem(
            "plugindex-project"
        );


    if (!raw) {
        return;
    }


    try {

        const data =
            JSON.parse(raw);


        if (data.pdl) {

            pdlEditor.value =
                data.pdl;

        }


        if (data.settings) {

            Object.assign(
                state.project,
                data.settings
            );

        }


        updateLineNumbers();

        renderPDL();

        log(
            "[PluginDex] Proyecto local cargado."
        );

    } catch {

        log(
            "[PluginDex] No se pudo cargar el proyecto."
        );

    }
}


/* =========================================================
   NEW PROJECT
========================================================= */

$("#newProject")
    .addEventListener(
        "click",
        () => {

            const confirmed =
                confirm(
                    "¿Crear un proyecto nuevo?"
                );


            if (!confirmed) {
                return;
            }


            pdlEditor.value =
`page "NuevoProyecto" {

    title "Mi nueva página"

    text "Creada con PluginDex."

    button "Comenzar"
}`;


            updateLineNumbers();

            renderPDL();

            log(
                "[PluginDex] Nuevo proyecto creado."
            );

        }
    );


/* =========================================================
   EXPORT HTML
========================================================= */

$("#exportProject")
    .addEventListener(
        "click",
        exportHTML
    );


function exportHTML() {

    const result =
        compilePDL(
            pdlEditor.value
        );


    const website =
        $("#website")
            .cloneNode(true);


    website
        .querySelectorAll(
            ".plugin-selected"
        )
        .forEach(
            element =>
                element.classList.remove(
                    "plugin-selected"
                )
        );


    const html =
`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(result.title)}</title>
<style>
${getExportCSS()}
</style>
</head>
<body>
${website.outerHTML}
</body>
</html>`;


    const blob =
        new Blob(
            [html],
            {
                type:
                    "text/html"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const a =
        document.createElement("a");


    a.href =
        url;

    a.download =
        "index.html";


    a.click();


    URL.revokeObjectURL(
        url
    );


    log(
        "[PluginDex] HTML exportado."
    );
}


/* =========================================================
   EXPORT CSS
========================================================= */

function getExportCSS() {

    return `
* {
    box-sizing: border-box;
}

body {
    margin: 0;
    background: #c0c0c0;
    font-family: "Courier New", monospace;
}

.website {
    width: min(100%, 1024px);
    min-height: 100vh;
    margin: auto;
    padding: 22px;
    color: #111;
}

.site-header {
    display: flex;
    justify-content: space-between;
    padding: 14px;
    border: 2px solid #777;
    background: rgba(255,255,255,.4);
}

.hero {
    margin-top: 16px;
    padding: 35px;
    border: 2px solid #777;
    background: rgba(255,255,255,.4);
    backdrop-filter: blur(8px);
}

.hero-button {
    padding: 10px 20px;
    border: 3px outset #eee;
    background: #c0c0c0;
}

.site-grid {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    gap: 12px;
    margin-top: 14px;
}

.site-card {
    padding: 16px;
    border: 2px solid #777;
    background: rgba(255,255,255,.4);
}

@media(max-width:700px) {
    .site-grid {
        grid-template-columns: 1fr;
    }

    .site-header {
        flex-direction: column;
    }
}
`;

}


/* =========================================================
   BACKGROUND MODAL
========================================================= */

const backgroundModal =
    $("#backgroundModal");


$("#backgroundButton")
    .addEventListener(
        "click",
        () => {

            $("#modalBg1").value =
                $("#bgColor1").value;

            $("#modalBg2").value =
                $("#bgColor2").value;

            $("#modalBgType").value =
                $("#backgroundType").value;


            backgroundModal
                .classList
                .remove("hidden");

        }
    );


$("#closeBackground")
    .addEventListener(
        "click",
        () => {

            backgroundModal
                .classList
                .add("hidden");

        }
    );


$("#applyBackground")
    .addEventListener(
        "click",
        () => {

            $("#bgColor1").value =
                $("#modalBg1").value;

            $("#bgColor2").value =
                $("#modalBg2").value;

            $("#backgroundType").value =
                $("#modalBgType").value;


            updateBackground();


            backgroundModal
                .classList
                .add("hidden");


            log(
                "[PluginDex] Fondo personalizado aplicado."
            );

        }
    );


/* =========================================================
   PREVIEW CONTROLS
========================================================= */

$("#refreshPreview")
    .addEventListener(
        "click",
        () => {

            renderPDL();

            updateGlass();

            updateBackground();

            log(
                "[PluginDex] Vista previa actualizada."
            );

        }
    );


$("#deviceMobile")
    .addEventListener(
        "click",
        () => {

            $("#website").style.width =
                "390px";

        }
    );


$("#deviceDesktop")
    .addEventListener(
        "click",
        () => {

            $("#website").style.width =
                "min(100%, 1024px)";

        }
    );


/* =========================================================
   HERO BUTTON
========================================================= */

document.addEventListener(
    "click",
    event => {

        if (
            event.target.classList
                .contains("hero-button")
        ) {

            log(
                "[PluginDex] Evento CLICK ejecutado."
            );

        }

    }
);


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "s"
        ) {

            event.preventDefault();

            saveProject();

        }


        if (
            event.ctrlKey &&
            event.key === "Enter"
        ) {

            event.preventDefault();

            renderPDL();

        }

    }
);


/* =========================================================
   PWA
========================================================= */

if (
    "serviceWorker" in navigator
) {

    navigator.serviceWorker
        .register("sw.js")
        .then(
            () => {

                log(
                    "[PluginDex] Modo offline disponible."
                );

            }
        )
        .catch(
            () => {

                log(
                    "[PluginDex] PWA no disponible."
                );

            }
        );

}


/* =========================================================
   INITIALIZE
========================================================= */

loadProject();

updateLineNumbers();

renderPDL();

updateGlass();

updateBackground();

log(
    "[PluginDex] Engine iniciado correctamente."
);
