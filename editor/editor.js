const Editor = {


    init() {

        this.setupComponents();

        this.setupPage();

        this.setupToolbar();

        this.renderProperties();

    },


    setupComponents() {

        document
            .querySelectorAll(
                "[data-component]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const type =
                            button.dataset.component;

                        this.addComponent(type);

                    }
                );

            });

    },


    setupPage() {

        const page =
            document.getElementById(
                "page"
            );


        page.addEventListener(
            "click",
            event => {

                if (
                    event.target === page
                ) {

                    Engine.deselect();

                }

            }
        );


        page
            .querySelectorAll(
                ".pd-element"
            )
            .forEach(element => {

                this.prepareElement(
                    element
                );

            });

    },


    prepareElement(element) {

        element.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                Engine.select(
                    element
                );

            }
        );

    },


    addComponent(type) {

        const page =
            document.getElementById(
                "page"
            );


        const element =
            ElementFactory.create(
                type
            );


        page.appendChild(
            element
        );


        Engine.select(
            element
        );


        Engine.sync();


        mostrarEstado(
            "+ ELEMENTO AÑADIDO"
        );

    },


    setupToolbar() {

        document
            .getElementById(
                "newProject"
            )
            .onclick =
                () => {

                    if (
                        !confirm(
                            "¿Crear un proyecto nuevo?"
                        )
                    ) return;


                    PluginDex.project = {

                        name:
                            "Mi proyecto",

                        page: {

                            background:
                                "#eeeeee",

                            glass:
                                false,

                            elements: []

                        },

                        settings: {

                            width: 850,

                            minHeight: 600

                        }

                    };


                    const page =
                        document.getElementById(
                            "page"
                        );


                    page.innerHTML = "";


                    const title =
                        ElementFactory.create(
                            "title"
                        );


                    const text =
                        ElementFactory.create(
                            "text"
                        );


                    page.appendChild(title);

                    page.appendChild(text);


                    Engine.deselect();

                    Engine.sync();


                    mostrarEstado(
                        "● NUEVO PROYECTO"
                    );

                };


        document
            .getElementById(
                "saveProject"
            )
            .onclick =
                () => {

                    Engine.sync();

                    guardarProyecto();

                };


        document
            .getElementById(
                "loadProject"
            )
            .onclick =
                () => {

                    if (
                        cargarProyecto()
                    ) {

                        Engine.rebuild();

                    }

                };


        document
            .getElementById(
                "runProject"
            )
            .onclick =
                () => {

                    Engine.sync();

                    Preview.open();

                };


        document
            .getElementById(
                "exportProject"
            )
            .onclick =
                () => {

                    Engine.sync();

                    Exporter.open();

                };


        document
            .getElementById(
                "closePreview"
            )
            .onclick =
                Preview.close;


        document
            .getElementById(
                "closeExport"
            )
            .onclick =
                Exporter.close;


        document
            .getElementById(
                "copyCode"
            )
            .onclick =
                Exporter.copy;

    },


    renderProperties() {

        const container =
            document.getElementById(
                "properties"
            );


        const selected =
            Engine.selected;


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


        container.innerHTML = `

            <div class="property">

                <label>
                    TEXTO
                </label>

                <input
                    id="propText"
                    value="${escapeHTML(
                        selected.innerText
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
                    value="${rgbToHex(
                        computed.color
                    )}"
                >

            </div>


            <div class="property">

                <label>
                    FONDO
                </label>

                <input
                    id="propBackground"
                    type="color"
                    value="${rgbToHex(
                        computed.backgroundColor
                    )}"
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
                        value="${parseInt(
                            computed.fontSize
                        )}"
                    >

                </div>


                <div class="property">

                    <label>
                        REDONDEO
                    </label>

                    <input
                        id="propRadius"
                        type="number"
                        value="${parseInt(
                            computed.borderRadius
                        ) || 0}"
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


            <button
                class="delete-element"
                id="deleteElement"
            >
                ELIMINAR ELEMENTO
            </button>

        `;


        document
            .getElementById(
                "propText"
            )
            .oninput =
                event => {

                    selected.innerText =
                        event.target.value;

                    Engine.sync();

                };


        document
            .getElementById(
                "propColor"
            )
            .oninput =
                event => {

                    selected.style.color =
                        event.target.value;

                    Engine.sync();

                };


        document
            .getElementById(
                "propBackground"
            )
            .oninput =
                event => {

                    selected.style.background =
                        event.target.value;

                    Engine.sync();

                };


        document
            .getElementById(
                "propSize"
            )
            .oninput =
                event => {

                    selected.style.fontSize =
                        event.target.value +
                        "px";

                    Engine.sync();

                };


        document
            .getElementById(
                "propRadius"
            )
            .oninput =
                event => {

                    selected.style.borderRadius =
                        event.target.value +
                        "px";

                    Engine.sync();

                };


        document
            .getElementById(
                "propBorder"
            )
            .onchange =
                event => {

                    selected.style.borderStyle =
                        event.target.value;

                    Engine.sync();

                };


        document
            .getElementById(
                "deleteElement"
            )
            .onclick =
                () => {

                    selected.remove();

                    Engine.deselect();

                    Engine.sync();

                    mostrarEstado(
                        "● ELEMENTO ELIMINADO"
                    );

                };

    }

};


document.addEventListener(
    "DOMContentLoaded",
    () => {

        Editor.init();

        Engine.sync();

    }
);
