const Exporter = {


    generate() {

        const page =
            document
                .getElementById("page")
                .cloneNode(true);


        page
            .querySelectorAll(".selected")
            .forEach(element => {

                element.classList.remove(
                    "selected"
                );

            });


        const elements =
            page.querySelectorAll(
                ".pd-element"
            );


        elements.forEach(element => {

            element
                .classList
                .remove("pd-element");


            element.removeAttribute(
                "data-id"
            );


            element.removeAttribute(
                "data-type"
            );

        });


        return `<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1.0"
>

<title>Mi página</title>

<style>

* {
    box-sizing: border-box;
}

body {

    margin: 0;

    min-height: 100vh;

    display: flex;

    justify-content: center;

    align-items: flex-start;

    padding: 30px;

    background: #969696;

    font-family:
        Arial,
        sans-serif;
}

.page {

    width: 850px;

    max-width: 100%;

    min-height: 600px;

    padding: 30px;

    background: #eeeeee;
}

.pd-title {

    font-size: 36px;

    font-weight: bold;
}

.pd-text {

    font-size: 18px;
}

.pd-button {

    padding: 10px 18px;

    background: #315ca8;

    color: white;

    border: none;

    cursor: pointer;
}

.pd-box {

    min-height: 120px;

    border: 2px dashed #666;
}

.pd-image {

    width: 260px;

    height: 160px;

    display: flex;

    align-items: center;

    justify-content: center;

    background: #ccc;
}

</style>

</head>

<body>

${page.outerHTML}

<script>

document
.querySelectorAll("[data-action]")
.forEach(element => {

    element.addEventListener(
        "click",
        () => {

            const action =
                element.dataset.action;

            const value =
                element.dataset.actionValue;


            if (action === "alert") {

                alert(value);

            }


            if (action === "text") {

                element.innerText =
                    value;

            }


            if (action === "color") {

                element.style.color =
                    value;

            }


            if (action === "toggle") {

                element.style.display =
                    element.style.display ===
                    "none"
                    ? ""
                    : "none";

            }

        }
    );

});

<\/script>

</body>

</html>`;

    },


    open() {

        const code =
            this.generate();


        document
            .getElementById(
                "exportCode"
            )
            .value = code;


        document
            .getElementById(
                "exportModal"
            )
            .classList
            .remove("hidden");

    },


    close() {

        document
            .getElementById(
                "exportModal"
            )
            .classList
            .add("hidden");

    },


    copy() {

        const textarea =
            document.getElementById(
                "exportCode"
            );


        textarea.select();

        navigator.clipboard
            .writeText(
                textarea.value
            );


        mostrarEstado(
            "● CÓDIGO COPIADO"
        );

    }

};


const Preview = {


    open() {

        const code =
            Exporter.generate();


        document
            .getElementById(
                "previewFrame"
            )
            .srcdoc = code;


        document
            .getElementById(
                "previewModal"
            )
            .classList
            .remove("hidden");

    },


    close() {

        document
            .getElementById(
                "previewModal"
            )
            .classList
            .add("hidden");

    }

};
