function generarId() {

    return (
        "element-" +
        Date.now() +
        "-" +
        Math.floor(
            Math.random() * 9999
        )
    );

}


function mostrarEstado(texto) {

    const status =
        document.getElementById(
            "status"
        );

    if (!status) return;

    status.textContent = texto;


    clearTimeout(
        mostrarEstado.timeout
    );


    mostrarEstado.timeout =
        setTimeout(() => {

            status.textContent =
                "● LISTO";

        }, 2500);

}


function escapeHTML(texto) {

    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function rgbToHex(rgb) {

    if (!rgb) {
        return "#ffffff";
    }


    const values =
        rgb.match(/\d+/g);


    if (!values) {
        return "#ffffff";
    }


    return "#" +

        values
            .slice(0,3)
            .map(value =>
                Number(value)
                    .toString(16)
                    .padStart(2,"0")
            )
            .join("");

}
