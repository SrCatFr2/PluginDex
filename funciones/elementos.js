const ElementFactory = {


    create(type, data = {}) {

        let element;


        switch(type) {

            case "title":

                element =
                    document.createElement("div");

                element.className =
                    "pd-element pd-title";

                element.innerText =
                    data.text ||
                    "Nuevo título";

                break;


            case "text":

                element =
                    document.createElement("div");

                element.className =
                    "pd-element pd-text";

                element.innerText =
                    data.text ||
                    "Nuevo texto";

                break;


            case "button":

                element =
                    document.createElement("button");

                element.className =
                    "pd-element pd-button";

                element.innerText =
                    data.text ||
                    "Nuevo botón";

                break;


            case "box":

                element =
                    document.createElement("div");

                element.className =
                    "pd-element pd-box";

                element.innerText =
                    data.text ||
                    "Caja";

                break;


            case "image":

                element =
                    document.createElement("div");

                element.className =
                    "pd-element pd-image";

                element.innerText =
                    "IMAGEN";

                break;


            default:

                element =
                    document.createElement("div");

                element.className =
                    "pd-element pd-text";

                element.innerText =
                    "Elemento";

        }


        element.dataset.id =
            data.id ||
            generarId();


        element.dataset.type =
            type;


        if (data.style) {

            element.setAttribute(
                "style",
                data.style
            );

        }


        if (data.action) {

            element.dataset.action =
                data.action;

        }


        if (data.actionValue) {

            element.dataset.actionValue =
                data.actionValue;

        }


        element.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                Engine.select(element);

            }
        );


        return element;

    }

};
