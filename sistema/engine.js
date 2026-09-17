const Engine = {

    selected: null,


    select(element) {

        if (
            this.selected &&
            this.selected !== element
        ) {

            this.selected.classList
                .remove("selected");

        }


        this.selected = element;


        if (element) {

            element.classList
                .add("selected");

        }


        Editor.renderProperties();

    },


    deselect() {

        if (this.selected) {

            this.selected.classList
                .remove("selected");

        }

        this.selected = null;

        Editor.renderProperties();

    },


    getElementId(element) {

        return element.dataset.id;

    },


    getSelectedId() {

        if (!this.selected) {
            return null;
        }

        return this.selected.dataset.id;

    },


    sync() {

        const page =
            document.getElementById("page");


        const elements =
            [...page.children];


        PluginDex.project.page.elements =
            elements.map(element => {

                return {

                    id:
                        element.dataset.id,

                    type:
                        element.dataset.type,

                    html:
                        element.innerHTML,

                    text:
                        element.innerText,

                    style:
                        element.getAttribute(
                            "style"
                        ) || "",

                    className:
                        element.className,

                    action:
                        element.dataset.action || null,

                    actionValue:
                        element.dataset.actionValue || null

                };

            });


        PluginDex.project.page.background =
            getComputedStyle(page)
                .backgroundColor;


        PluginDex.project.page.glass =
            page.classList.contains("glass");

    },


    rebuild() {

        const page =
            document.getElementById("page");


        page.innerHTML = "";


        const elements =
            PluginDex.project.page.elements;


        elements.forEach(data => {

            const element =
                ElementFactory.create(
                    data.type,
                    data
                );

            page.appendChild(element);

        });


        page.style.background =
            PluginDex.project.page.background;


        page.classList.toggle(
            "glass",
            PluginDex.project.page.glass
        );


        this.deselect();

    }

};
