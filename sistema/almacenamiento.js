const STORAGE_KEY = "plugindex_project";


function guardarProyecto() {

    const project =
        PluginDex.project;

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(project)
    );

    mostrarEstado(
        "● PROYECTO GUARDADO"
    );
}


function cargarProyecto() {

    const data =
        localStorage.getItem(
            STORAGE_KEY
        );

    if (!data) {

        mostrarEstado(
            "● NO HAY PROYECTO GUARDADO"
        );

        return false;
    }

    try {

        PluginDex.project =
            JSON.parse(data);

        mostrarEstado(
            "● PROYECTO CARGADO"
        );

        return true;

    } catch {

        mostrarEstado(
            "● ERROR AL CARGAR"
        );

        return false;
    }

}


function eliminarProyectoGuardado() {

    localStorage.removeItem(
        STORAGE_KEY
    );

}
