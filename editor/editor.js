(() => {
    "use strict";

    /*
     * PluginDex — Editor
     * ------------------
     *
     * Este archivo NO controla:
     *  - movimiento
     *  - resize
     *  - rotación
     *
     * Eso pertenece exclusivamente a:
     *
     *     editor/manipulador.js
     *
     * Aquí controlamos:
     *  - añadir elementos
     *  - selección
     *  - propiedades
     *  - guardar
     *  - cargar
     *  - nuevo proyecto
     *  - preview
     *  - exportación
     */

    const Editor = {

        initialized: false,

        // --------------------------------------------------
        // INIT
        // --------------------------------------------------

        init() {
            if (this.initialized) return;

            this.initialized = true;

            this.setupComponents();
            this.setupPage();
            this.setupToolbar();

            this.bindSelectionEvents();

            this.renderProperties();

            this.normalizePage();

            this.refreshManipulator();
        },

        // --------------------------------------------------
        // CANVAS
        // --------------------------------------------------

        getPage() {
            return (
                document.querySelector(
                    ".design-page"
                ) ||
                document.getElementById(
                    "page"
                )
            );
        },

        getElements() {
            const page =
                this.getPage();

            if (!page) return [];

            return [
                ...page.querySelectorAll(
                    ".page-element, .pd-element"
                )
            ];
        },

        // --------------------------------------------------
        // COMPONENTES
        // --------------------------------------------------

        setupComponents() {
            document.addEventListener(
                "click",
                event => {

                    const button =
                        event.target.closest(
                            "[data-component]"
                        );

                    if (!button) return;

                    /*
                     * No queremos que un botón del editor
                     * dispare esta lógica dos veces.
                     */

                    if (
                        button.dataset.editorBound ===
                        "true"
                    ) {
                        return;
                    }

                    button.dataset.editorBound =
                        "true";

                    const type =
                        button.dataset.component;

                    this.addComponent(type);
                }
            );
        },

        addComponent(type) {
            const page =
                this.getPage();

            if (!page) return;

            let element = null;

            /*
             * Usamos la fábrica existente si está disponible.
             */

            if (
                window.ElementFactory?.create
            ) {
                try {
                    element =
                        window.ElementFactory.create(
                            type
                        );
                } catch (error) {
                    console.error(
                        "PluginDex: ElementFactory falló",
                        error
                    );
                }
            }

            /*
             * Fallback para que el editor no muera si
             * ElementFactory todavía no está disponible.
             */

            if (!element) {
                element =
                    this.createFallbackElement(
                        type
                    );
            }

            if (!element) return;

            /*
             * Aseguramos que el nuevo objeto pertenezca
             * al sistema actual.
             */

            element.classList.add(
                "page-element"
            );

            this.prepareElement(
                element
            );

            /*
             * Posición inicial limpia.
             */

            const index =
                this.getElements().length;

            const x =
                60 +
                (index % 5) * 30;

            const y =
                60 +
                (index % 5) * 30;

            if (
                !element.style.width
            ) {
                element.style.width =
                    "240px";
            }

            if (
                !element.style.height
            ) {
                element.style.height =
                    "80px";
            }

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

            element.style.setProperty(
                "--editor-rotation",
                "0deg"
            );

            page.appendChild(
                element
            );

            /*
             * Selección.
             */

            if (
                window.PluginDexSelection?.select
            ) {
                window.PluginDexSelection.select(
                    element
                );
            } else {
                this.selectFallback(
                    element
                );
            }

            this.refreshManipulator();

            this.sync();

            this.showStatus(
                "+ ELEMENTO AÑADIDO"
            );
        },

        createFallbackElement(type) {
            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "page-element";

            element.dataset.type =
                type || "text";

            switch (type) {

                case "button":

                    element.innerHTML = `
                        <button
                            type="button"
                            tabindex="-1"
                        >
                            Botón
                        </button>
                    `;

                    break;

                case "title":

                    element.textContent =
                        "Título";

                    break;

                case "text":

                    element.textContent =
                        "Texto";

                    break;

                case "image":

                    element.innerHTML = `
                        <div
                            style="
                                width:100%;
                                height:100%;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                            "
                        >
                            Imagen
                        </div>
                    `;

                    break;

                default:

                    element.textContent =
                        type ||
                        "Elemento";

                    break;
            }

            return element;
        },

        // --------------------------------------------------
        // PREPARAR ELEMENTOS
        // --------------------------------------------------

        setupPage() {
            const page =
                this.getPage();

            if (!page) return;

            this.getElements()
                .forEach(
                    element =>
                        this.prepareElement(
                            element
                        )
                );

            /*
             * Click sobre el fondo.
             */

            page.addEventListener(
                "click",
                event => {

                    if (
                        event.target !==
                        page
                    ) {
                        return;
                    }

                    this.deselect();
                }
            );

            /*
             * Evitar que botones reales del contenido
             * ejecuten acciones durante el modo editor.
             */

            this.disableElementInteraction(
                page
            );
        },

        prepareElement(element) {
            if (!element) return;

            if (
                element.dataset.pluginDexPrepared ===
                "true"
            ) {
                return;
            }

            element.dataset.pluginDexPrepared =
                "true";

            element.classList.add(
                "page-element"
            );

            /*
             * Los elementos se seleccionan por el
             * manipulador/selection manager.
             *
             * No ponemos aquí otro pointerdown.
             * Eso era parte del conflicto anterior.
             */

            element.addEventListener(
                "dblclick",
                event => {

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

                    this.editElementText(
                        element
                    );

                    event.preventDefault();
                }
            );
        },

        disableElementInteraction(root) {
            root.querySelectorAll(
                ".page-element button, .pd-element button"
            ).forEach(button => {
                button.setAttribute(
                    "tabindex",
                    "-1"
                );

                button.dataset.editorDisabled =
                    "true";
            });
        },

        enableElementInteraction(root) {
            root.querySelectorAll(
                "[data-editor-disabled='true']"
            ).forEach(element => {
                element.removeAttribute(
                    "tabindex"
                );

                delete element.dataset.editorDisabled;
            });
        },

        // --------------------------------------------------
        // SELECCIÓN
        // --------------------------------------------------

        bindSelectionEvents() {

            document.addEventListener(
                "plugindex:selectionchange",
                event => {

                    const elements =
                        event.detail?.elements ||
                        [];

                    elements.forEach(
                        element => {
                            this.prepareElement(
                                element
                            );
                        }
                    );

                    this.renderProperties();

                    this.refreshManipulator();
                }
            );

            document.addEventListener(
                "plugindex:elementchange",
                () => {

                    this.renderProperties();

                    this.sync();

                    this.refreshManipulator();
                }
            );
        },

        getSelected() {

            if (
                window.PluginDexSelection?.getSelected
            ) {
                const selected =
                    window.PluginDexSelection.getSelected();

                if (
                    Array.isArray(
                        selected
                    )
                ) {
                    return (
                        selected[0] ||
                        null
                    );
                }

                return selected || null;
            }

            return (
                document.querySelector(
                    ".editor-selected, .selected"
                ) ||
                null
            );
        },

        getSelectedElements() {

            if (
                window.PluginDexSelection?.getSelected
            ) {
                const selected =
                    window.PluginDexSelection.getSelected();

                if (
                    Array.isArray(
                        selected
                    )
                ) {
                    return selected;
                }

                return selected
                    ? [selected]
                    : [];
            }

            return [
                ...document.querySelectorAll(
                    ".editor-selected, .selected"
                )
            ];
        },

        selectFallback(element) {

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
                            elements: [
                                element
                            ],
                            element
                        }
                    }
                )
            );
        },

        deselect() {

            if (
                window.PluginDexSelection?.clear
            ) {
                window.PluginDexSelection.clear();
            } else {

                document
                    .querySelectorAll(
                        ".editor-selected, .selected"
                    )
                    .forEach(
                        element => {

                            element.classList.remove(
                                "editor-selected",
                                "selected"
                            );

                        }
                    );

                document.dispatchEvent(
                    new CustomEvent(
                        "plugindex:selectionchange",
                        {
                            detail: {
                                elements: []
                            }
                        }
                    )
                );
            }

            this.renderProperties();

            this.refreshManipulator();
        },

        // --------------------------------------------------
        // TEXTO
        // --------------------------------------------------

        editElementText(element) {

            if (!element) return;

            /*
             * No editar elementos que contienen controles.
             */

            if (
                element.querySelector(
                    "input, textarea, select"
                )
            ) {
                return;
            }

            const oldText =
                element.innerText.trim();

            const text =
                window.prompt(
                    "Editar texto",
                    oldText
                );

            if (
                text === null
            ) {
                return;
            }

            element.innerText =
                text;

            this.sync();

            this.renderProperties();

            this.refreshManipulator();
        },

        // --------------------------------------------------
        // PROPIEDADES
        // --------------------------------------------------

        renderProperties() {

            const container =
                document.getElementById(
                    "properties"
                );

            if (!container) return;

            const selected =
                this.getSelected();

            if (!selected) {

                container.innerHTML = `
                    <div class="empty-properties">
                        <div class="empty-icon">
                            ◈
                        </div>

                        <strong>
                            Ningún elemento
                        </strong>

                        <span>
                            Selecciona algo en la página.
                        </span>
                    </div>
                `;

                return;
            }

            const computed =
                getComputedStyle(
                    selected
                );

            const fontSize =
                parseFloat(
                    computed.fontSize
                ) || 16;

            const radius =
                parseFloat(
                    computed.borderRadius
                ) || 0;

            const color =
                this.rgbToHex(
                    computed.color
                );

            const background =
                this.rgbToHex(
                    computed.backgroundColor
                );

            const text =
                selected.innerText
                    .replace(/\n/g, " ")
                    .trim();

            container.innerHTML = `

                <div class="property">

                    <label>
                        TEXTO
                    </label>

                    <input
                        id="propText"
                        type="text"
                        value="${this.escapeAttribute(
                            text
                        )}"
                    >

                </div>


                <div class="property">

                    <label>
                        COLOR
                    </label>

                    <input
                        id="propColor"
                        type="color"
                        value="${color}"
                    >

                </div>


                <div class="property">

                    <label>
                        FONDO
                    </label>

                    <input
                        id="propBackground"
                        type="color"
                        value="${background}"
                    >

                </div>


                <div class="property-row">

                    <div class="property">

                        <label>
                            TAMAÑO
                        </label>

                        <input
                            id="propSize"
                            type="number"
                            min="1"
                            max="500"
                            value="${fontSize}"
                        >

                    </div>


                    <div class="property">

                        <label>
                            REDONDEO
                        </label>

                        <input
                            id="propRadius"
                            type="number"
                            min="0"
                            max="500"
                            value="${radius}"
                        >

                    </div>

                </div>


                <div class="property">

                    <label>
                        BORDE
                    </label>

                    <select id="propBorder">

                        <option value="none">
                            Ninguno
                        </option>

                        <option value="solid">
                            Sólido
                        </option>

                        <option value="dashed">
                            Discontinuo
                        </option>

                    </select>

                </div>


                <div class="property">

                    <label>
                        ANCHO
                    </label>

                    <input
                        id="propWidth"
                        type="number"
                        min="30"
                        value="${this.getWidth(
                            selected
                        )}"
                    >

                </div>


                <div class="property">

                    <label>
                        ALTO
                    </label>

                    <input
                        id="propHeight"
                        type="number"
                        min="30"
                        value="${this.getHeight(
                            selected
                        )}"
                    >

                </div>


                <button
                    class="delete-element"
                    id="deleteElement"
                    type="button"
                >
                    ELIMINAR ELEMENTO
                </button>

            `;

            const border =
                computed.borderStyle;

            const borderSelect =
                document.getElementById(
                    "propBorder"
                );

            if (borderSelect) {

                borderSelect.value =
                    [
                        "none",
                        "solid",
                        "dashed"
                    ].includes(
                        border
                    )
                        ? border
                        : "none";
            }

            // --------------------------------------------------
            // TEXTO
            // --------------------------------------------------

            const propText =
                document.getElementById(
                    "propText"
                );

            propText?.addEventListener(
                "input",
                event => {

                    /*
                     * No usamos innerHTML.
                     * Esto evita que escribir propiedades
                     * pueda introducir HTML accidental.
                     */

                    selected.innerText =
                        event.target.value;

                    this.sync();
                }
            );

            // --------------------------------------------------
            // COLOR
            // --------------------------------------------------

            document
                .getElementById(
                    "propColor"
                )
                ?.addEventListener(
                    "input",
                    event => {

                        selected.style.color =
                            event.target.value;

                        this.sync();
                    }
                );

            // --------------------------------------------------
            // BACKGROUND
            // --------------------------------------------------

            document
                .getElementById(
                    "propBackground"
                )
                ?.addEventListener(
                    "input",
                    event => {

                        selected.style.backgroundColor =
                            event.target.value;

                        this.sync();
                    }
                );

            // --------------------------------------------------
            // FONT SIZE
            // --------------------------------------------------

            document
                .getElementById(
                    "propSize"
                )
                ?.addEventListener(
                    "input",
                    event => {

                        const value =
                            Math.max(
                                1,
                                Number(
                                    event.target.value
                                ) || 1
                            );

                        selected.style.fontSize =
                            `${value}px`;

                        this.sync();

                        this.refreshManipulator();
                    }
                );

            // --------------------------------------------------
            // RADIUS
            // --------------------------------------------------

            document
                .getElementById(
                    "propRadius"
                )
                ?.addEventListener(
                    "input",
                    event => {

                        const value =
                            Math.max(
                                0,
                                Number(
                                    event.target.value
                                ) || 0
                            );

                        selected.style.borderRadius =
                            `${value}px`;

                        this.sync();
                    }
                );

            // --------------------------------------------------
            // BORDER
            // --------------------------------------------------

            borderSelect?.addEventListener(
                "change",
                event => {

                    selected.style.borderStyle =
                        event.target.value;

                    if (
                        event.target.value ===
                        "none"
                    ) {
                        selected.style.borderWidth =
                            "0px";
                    } else {
                        selected.style.borderWidth =
                            "1px";
                    }

                    this.sync();
                }
            );

            // --------------------------------------------------
            // WIDTH
            // --------------------------------------------------

            document
                .getElementById(
                    "propWidth"
                )
                ?.addEventListener(
                    "input",
                    event => {

                        const value =
                            Math.max(
                                30,
                                Number(
                                    event.target.value
                                ) || 30
                            );

                        if (
                            window.PluginDexManipulator
                                ?.getGeometry
                        ) {

                            const geometry =
                                window.PluginDexManipulator
                                    .getGeometry(
                                        selected
                                    );

                            if (geometry) {

                                window.PluginDexManipulator
                                    .applyGeometry(
                                        selected,
                                        geometry.x,
                                        geometry.y,
                                        value,
                                        geometry.height,
                                        geometry.rotation
                                    );
                            }

                        } else {

                            selected.style.width =
                                `${value}px`;

                        }

                        this.sync();
                    }
                );

            // --------------------------------------------------
            // HEIGHT
            // --------------------------------------------------

            document
                .getElementById(
                    "propHeight"
                )
                ?.addEventListener(
                    "input",
                    event => {

                        const value =
                            Math.max(
                                30,
                                Number(
                                    event.target.value
                                ) || 30
                            );

                        if (
                            window.PluginDexManipulator
                                ?.getGeometry
                        ) {

                            const geometry =
                                window.PluginDexManipulator
                                    .getGeometry(
                                        selected
                                    );

                            if (geometry) {

                                window.PluginDexManipulator
                                    .applyGeometry(
                                        selected,
                                        geometry.x,
                                        geometry.y,
                                        geometry.width,
                                        value,
                                        geometry.rotation
                                    );
                            }

                        } else {

                            selected.style.height =
                                `${value}px`;

                        }

                        this.sync();
                    }
                );

            // --------------------------------------------------
            // DELETE
            // --------------------------------------------------

            document
                .getElementById(
                    "deleteElement"
                )
                ?.addEventListener(
                    "click",
                    () => {

                        selected.remove();

                        this.deselect();

                        this.sync();

                        this.showStatus(
                            "ELEMENTO ELIMINADO"
                        );
                    }
                );
        },

        // --------------------------------------------------
        // GEOMETRÍA PARA PROPIEDADES
        // --------------------------------------------------

        getWidth(element) {

            if (
                window.PluginDexManipulator
                    ?.getGeometry
            ) {

                const geometry =
                    window.PluginDexManipulator
                        .getGeometry(
                            element
                        );

                if (geometry) {
                    return Math.round(
                        geometry.width
                    );
                }
            }

            return Math.round(
                element.offsetWidth ||
                parseFloat(
                    getComputedStyle(
                        element
                    ).width
                ) ||
                30
            );
        },

        getHeight(element) {

            if (
                window.PluginDexManipulator
                    ?.getGeometry
            ) {

                const geometry =
                    window.PluginDexManipulator
                        .getGeometry(
                            element
                        );

                if (geometry) {
                    return Math.round(
                        geometry.height
                    );
                }
            }

            return Math.round(
                element.offsetHeight ||
                parseFloat(
                    getComputedStyle(
                        element
                    ).height
                ) ||
                30
            );
        },

        // --------------------------------------------------
        // NUEVO PROYECTO
        // --------------------------------------------------

        createNewProject() {

            const confirmed =
                window.confirm(
                    "¿Crear un proyecto nuevo?"
                );

            if (!confirmed) return;

            /*
             * Si existe el sistema principal de PluginDex,
             * dejamos que él maneje el estado.
             */

            if (
                window.PluginDex?.project
            ) {

                window.PluginDex.project = {

                    name:
                        "Mi proyecto",

                    page: {

                        background:
                            "#eeeeee",

                        glass:
                            false,

                        elements:
                            []

                    },

                    settings: {

                        width:
                            850,

                        minHeight:
                            600

                    }

                };
            }

            const page =
                this.getPage();

            if (!page) return;

            page.innerHTML = "";

            /*
             * Creamos un layout inicial limpio.
             */

            const title =
                this.createElementSafe(
                    "title"
                );

            const text =
                this.createElementSafe(
                    "text"
                );

            if (title) {

                title.style.left =
                    "80px";

                title.style.top =
                    "80px";

                title.style.width =
                    "500px";

                title.style.height =
                    "100px";

                page.appendChild(
                    title
                );

                this.prepareElement(
                    title
                );
            }

            if (text) {

                text.style.left =
                    "80px";

                text.style.top =
                    "210px";

                text.style.width =
                    "500px";

                text.style.height =
                    "100px";

                page.appendChild(
                    text
                );

                this.prepareElement(
                    text
                );
            }

            this.deselect();

            this.sync();

            this.refreshManipulator();

            this.showStatus(
                "NUEVO PROYECTO"
            );
        },

        createElementSafe(type) {

            if (
                window.ElementFactory?.create
            ) {

                try {

                    const element =
                        window.ElementFactory.create(
                            type
                        );

                    if (element) {

                        element.classList.add(
                            "page-element"
                        );

                        return element;
                    }

                } catch (error) {

                    console.error(
                        "PluginDex ElementFactory:",
                        error
                    );

                }
            }

            return this.createFallbackElement(
                type
            );
        },

        // --------------------------------------------------
        // TOOLBAR
        // --------------------------------------------------

        setupToolbar() {

            this.bindButton(
                "newProject",
                () =>
                    this.createNewProject()
            );

            this.bindButton(
                "saveProject",
                () => {

                    this.sync();

                    if (
                        typeof window.guardarProyecto ===
                        "function"
                    ) {

                        window.guardarProyecto();

                    } else {

                        this.saveLocalFallback();

                    }

                }
            );

            this.bindButton(
                "loadProject",
                () => {

                    if (
                        typeof window.cargarProyecto ===
                        "function"
                    ) {

                        if (
                            window.cargarProyecto()
                        ) {

                            if (
                                window.Engine?.rebuild
                            ) {
                                window.Engine.rebuild();
                            }

                            this.normalizePage();
                            this.refreshManipulator();

                        }

                    } else {

                        this.loadLocalFallback();

                    }

                }
            );

            this.bindButton(
                "runProject",
                () => {

                    this.sync();

                    if (
                        window.Preview?.open
                    ) {

                        window.Preview.open();

                    }

                }
            );

            this.bindButton(
                "exportProject",
                () => {

                    this.sync();

                    if (
                        window.Exporter?.open
                    ) {

                        window.Exporter.open();

                    }

                }
            );

            this.bindButton(
                "closePreview",
                () => {

                    window.Preview?.close?.();

                }
            );

            this.bindButton(
                "closeExport",
                () => {

                    window.Exporter?.close?.();

                }
            );

            this.bindButton(
                "copyCode",
                () => {

                    window.Exporter?.copy?.();

                }
            );
        },

        bindButton(id, callback) {

            const button =
                document.getElementById(id);

            if (!button) return;

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    callback();

                }
            );
        },

        // --------------------------------------------------
        // NORMALIZAR
        // --------------------------------------------------

        normalizePage() {

            const page =
                this.getPage();

            if (!page) return;

            this.getElements()
                .forEach(
                    element => {

                        this.prepareElement(
                            element
                        );

                    }
                );

            if (
                window.PluginDexManipulator
                    ?.normalizeAll
            ) {

                window.PluginDexManipulator
                    .normalizeAll();

            }
        },

        refreshManipulator() {

            if (
                window.PluginDexManipulator
                    ?.refreshAllHandles
            ) {

                window.PluginDexManipulator
                    .refreshAllHandles();

            }
        },

        // --------------------------------------------------
        // SYNC
        // --------------------------------------------------

        sync() {

            /*
             * Primero damos prioridad al Engine existente
             * si todavía forma parte de otro módulo.
             */

            if (
                window.Engine?.sync &&
                window.Engine.sync !==
                    this.sync
            ) {

                try {
                    window.Engine.sync();
                } catch (error) {
                    console.warn(
                        "PluginDex Engine.sync:",
                        error
                    );
                }

            }

            /*
             * También notificamos al sistema principal.
             */

            document.dispatchEvent(
                new CustomEvent(
                    "plugindex:editorchange",
                    {
                        detail: {
                            elements:
                                this.getElements()
                        }
                    }
                )
            );
        },

        // --------------------------------------------------
        // STORAGE FALLBACK
        // --------------------------------------------------

        saveLocalFallback() {

            const page =
                this.getPage();

            if (!page) return;

            const data = {

                version: 2,

                elements:
                    this.getElements()
                        .map(
                            element =>
                                this.serializeElement(
                                    element
                                )
                        )

            };

            try {

                localStorage.setItem(
                    "plugindex-editor-fallback",
                    JSON.stringify(
                        data
                    )
                );

                this.showStatus(
                    "PROYECTO GUARDADO"
                );

            } catch (error) {

                console.error(
                    error
                );

            }
        },

        loadLocalFallback() {

            const raw =
                localStorage.getItem(
                    "plugindex-editor-fallback"
                );

            if (!raw) {

                this.showStatus(
                    "NO HAY PROYECTO GUARDADO"
                );

                return;

            }

            try {

                const data =
                    JSON.parse(raw);

                const page =
                    this.getPage();

                if (!page) return;

                page.innerHTML = "";

                (
                    data.elements ||
                    []
                ).forEach(
                    item => {

                        const element =
                            this.deserializeElement(
                                item
                            );

                        if (
                            element
                        ) {

                            page.appendChild(
                                element
                            );

                            this.prepareElement(
                                element
                            );

                        }

                    }
                );

                this.deselect();

                this.normalizePage();

                this.refreshManipulator();

                this.showStatus(
                    "PROYECTO CARGADO"
                );

            } catch (error) {

                console.error(
                    "PluginDex load:",
                    error
                );

                this.showStatus(
                    "ERROR AL CARGAR"
                );
            }
        },

        serializeElement(element) {

            const geometry =
                window.PluginDexManipulator
                    ?.getGeometry
                    ? window.PluginDexManipulator
                        .getGeometry(
                            element
                        )
                    : null;

            const computed =
                getComputedStyle(
                    element
                );

            return {

                type:
                    element.dataset.type ||
                    "element",

                text:
                    element.innerText ||
                    "",

                x:
                    geometry?.x ||
                    parseFloat(
                        element.style.left
                    ) ||
                    0,

                y:
                    geometry?.y ||
                    parseFloat(
                        element.style.top
                    ) ||
                    0,

                width:
                    geometry?.width ||
                    element.offsetWidth,

                height:
                    geometry?.height ||
                    element.offsetHeight,

                rotation:
                    geometry?.rotation ||
                    0,

                color:
                    computed.color,

                background:
                    computed.backgroundColor,

                fontSize:
                    computed.fontSize,

                borderRadius:
                    computed.borderRadius,

                borderStyle:
                    computed.borderStyle,

                borderWidth:
                    computed.borderWidth
            };
        },

        deserializeElement(data) {

            const element =
                this.createElementSafe(
                    data.type
                );

            if (!element) return null;

            element.dataset.type =
                data.type;

            /*
             * Restauramos texto solo cuando no
             * parece contener controles.
             */

            if (
                data.text &&
                !element.querySelector(
                    "button, input, textarea, select"
                )
            ) {

                element.innerText =
                    data.text;

            }

            element.style.left =
                `${Number(data.x) || 0}px`;

            element.style.top =
                `${Number(data.y) || 0}px`;

            element.style.width =
                `${Math.max(
                    30,
                    Number(data.width) || 30
                )}px`;

            element.style.height =
                `${Math.max(
                    30,
                    Number(data.height) || 30
                )}px`;

            element.style.setProperty(
                "--editor-rotation",
                `${Number(
                    data.rotation
                ) || 0}deg`
            );

            if (
                data.color
            ) {
                element.style.color =
                    data.color;
            }

            if (
                data.background
            ) {
                element.style.backgroundColor =
                    data.background;
            }

            if (
                data.fontSize
            ) {
                element.style.fontSize =
                    data.fontSize;
            }

            if (
                data.borderRadius
            ) {
                element.style.borderRadius =
                    data.borderRadius;
            }

            if (
                data.borderStyle
            ) {
                element.style.borderStyle =
                    data.borderStyle;
            }

            if (
                data.borderWidth
            ) {
                element.style.borderWidth =
                    data.borderWidth;
            }

            return element;
        },

        // --------------------------------------------------
        // HELPERS
        // --------------------------------------------------

        escapeAttribute(value) {

            return String(
                value ?? ""
            )
                .replace(
                    /&/g,
                    "&amp;"
                )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /</g,
                    "&lt;"
                )
                .replace(
                    />/g,
                    "&gt;"
                );
        },

        rgbToHex(value) {

            if (!value) {
                return "#000000";
            }

            if (
                value.startsWith("#")
            ) {
                return value;
            }

            const match =
                value.match(
                    /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/
                );

            if (!match) {
                return "#000000";
            }

            return (
                "#" +
                [1, 2, 3]
                    .map(
                        index =>
                            Number(
                                match[index]
                            )
                                .toString(16)
                                .padStart(
                                    2,
                                    "0"
                                )
                    )
                    .join("")
            );
        },

        showStatus(message) {

            if (
                typeof window.mostrarEstado ===
                "function"
            ) {

                window.mostrarEstado(
                    message
                );

                return;
            }

            const status =
                document.querySelector(
                    "[data-status]"
                );

            if (!status) return;

            status.textContent =
                message;

            clearTimeout(
                this.statusTimer
            );

            this.statusTimer =
                setTimeout(
                    () => {

                        status.textContent =
                            "";

                    },
                    1800
                );
        }
    };

    // --------------------------------------------------
    // EXPONER
    // --------------------------------------------------

    window.PluginDexEditor =
        Editor;

    /*
     * Compatibilidad con código que ya esperaba:
     *
     * window.Editor
     */

    window.Editor =
        Editor;

    // --------------------------------------------------
    // INIT
    // --------------------------------------------------

    function boot() {

        Editor.init();

    }

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            boot,
            {
                once: true
            }
        );

    } else {

        boot();

    }

})();
