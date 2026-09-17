const Blocks = {


    init() {

        document
            .querySelectorAll(
                "[data-block]"
            )
            .forEach(block => {

                block.addEventListener(
                    "click",
                    () => {

                        this.add(
                            block.dataset.block
                        );

                    }
                );

            });

    },


    add(type) {

        const element =
            Engine.selected;


        if (!element) {

            mostrarEstado(
                "● SELECCIONA UN ELEMENTO"
            );

            return;

        }


        switch(type) {


            case "click":

                element.dataset.action =
                    "alert";

                element.dataset.actionValue =
                    "Hola desde PluginDex";


                mostrarEstado(
                    "⚡ BLOQUE: CLIC"
                );

                break;


            case "text":

                element.dataset.action =
                    "text";

                element.dataset.actionValue =
                    "Texto cambiado";


                mostrarEstado(
                    "T BLOQUE: CAMBIAR TEXTO"
                );

                break;


            case "color":

                element.dataset.action =
                    "color";

                element.dataset.actionValue =
                    "#ff3333";


                mostrarEstado(
                    "● BLOQUE: CAMBIAR COLOR"
                );

                break;


            case "hide":

                element.dataset.action =
                    "toggle";


                mostrarEstado(
                    "◐ BLOQUE: MOSTRAR / OCULTAR"
                );

                break;

        }


        Engine.sync();

    }

};


document.addEventListener(
    "DOMContentLoaded",
    () => Blocks.init()
);
