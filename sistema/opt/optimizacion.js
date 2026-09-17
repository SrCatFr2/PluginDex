/* =========================================================
   PLUGINDEX
   SISTEMA DE OPTIMIZACIÓN
   GRÁFICOS AUTOMÁTICOS v1
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURACIÓN
    ===================================================== */

    const CONFIG = {

        sampleTime: 2200,

        evaluateEvery: 1800,

        recoverAfter: 5000,

        minFps: 28,

        targetFps: 60,

        warningFps: 45,

        criticalFps: 30,

        maxLevel: 10,

        minLevel: 0,

        pointerThrottle: 32,

        memoryWarning: 0.82

    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {

        initialized: false,

        level: 10,

        fps: 60,

        frameTime: 16.6,

        avgFrameTime: 16.6,

        worstFrameTime: 16.6,

        frames: 0,

        longFrames: 0,

        lastEvaluation: 0,

        goodSince: 0,

        badSince: 0,

        visible: true,

        interacting: false,

        lowEnd: false,

        touch: false,

        reducedMotion: false,

        automatic: true,

        pointerX: 50,

        pointerY: 50,

        raf: null,

        pointerTimer: null,

        lastPointerTime: 0

    };


    /* =====================================================
       REFERENCIAS
    ===================================================== */

    const root = document.documentElement;
    const body = document.body;


    /* =====================================================
       HARDWARE
    ===================================================== */

    function detectHardware() {

        const cores =
            navigator.hardwareConcurrency || 4;

        const memory =
            navigator.deviceMemory || 4;

        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;

        const slowConnection =
            connection &&
            (
                connection.saveData ||
                connection.effectiveType === "slow-2g" ||
                connection.effectiveType === "2g"
            );

        state.touch =
            window.matchMedia("(pointer: coarse)").matches;

        state.reducedMotion =
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

        /*
           No usamos solamente hardwareConcurrency.
           Es una pista, no una sentencia.
        */

        state.lowEnd =
            cores <= 2 ||
            memory <= 2 ||
            slowConnection === true;

        if (state.touch) {
            body.classList.add("touch-device");
        }

        if (state.lowEnd) {
            body.classList.add("low-end-device");
        }

        if (state.reducedMotion) {
            body.classList.add("reduced-motion");
        }

    }


    /* =====================================================
       NIVEL DE GRÁFICOS
    ===================================================== */

    /*
       10 = máxima calidad
       0  = mínimo

       IMPORTANTE:
       El nivel no significa "calidad general".
       Cada nivel elimina cosas concretas.
    */

    function applyGraphicsLevel(level) {

        level = Math.max(
            CONFIG.minLevel,
            Math.min(CONFIG.maxLevel, level)
        );

        state.level = level;

        body.dataset.graphics = String(level);

        /*
           Variables CSS.
           El CSS decide qué se modifica.
        */

        root.style.setProperty(
            "--auto-glass-blur",
            getGlassBlur(level)
        );

        root.style.setProperty(
            "--auto-glass-saturation",
            getGlassSaturation(level)
        );

        root.style.setProperty(
            "--auto-smoke-opacity",
            getSmokeOpacity(level)
        );

        root.style.setProperty(
            "--auto-carbon-opacity",
            getCarbonOpacity(level)
        );

        root.style.setProperty(
            "--auto-grain-opacity",
            getGrainOpacity(level)
        );

        root.style.setProperty(
            "--auto-shadow-strength",
            getShadowStrength(level)
        );

        updateClasses(level);
    }


    /* =====================================================
       CALIDAD — GLASS
    ===================================================== */

    function getGlassBlur(level) {

        if (level >= 9) return "28px";
        if (level >= 7) return "24px";
        if (level >= 5) return "21px";
        if (level >= 3) return "18px";

        return "15px";
    }


    function getGlassSaturation(level) {

        if (level >= 9) return "135%";
        if (level >= 7) return "130%";
        if (level >= 5) return "123%";
        if (level >= 3) return "118%";

        return "112%";
    }


    /* =====================================================
       CALIDAD — FONDO
    ===================================================== */

    function getSmokeOpacity(level) {

        if (level >= 9) return ".28";
        if (level >= 7) return ".25";
        if (level >= 5) return ".21";
        if (level >= 3) return ".16";
        if (level >= 1) return ".10";

        return "0";
    }


    function getCarbonOpacity(level) {

        if (level >= 8) return ".22";
        if (level >= 6) return ".18";
        if (level >= 4) return ".14";
        if (level >= 2) return ".08";

        return "0";
    }


    function getGrainOpacity(level) {

        if (level >= 8) return ".035";
        if (level >= 6) return ".025";
        if (level >= 4) return ".015";

        return "0";
    }


    function getShadowStrength(level) {

        if (level >= 8) return "1";
        if (level >= 6) return ".85";
        if (level >= 4) return ".65";
        if (level >= 2) return ".45";

        return ".3";
    }


    /* =====================================================
       CLASES ESPECÍFICAS
    ===================================================== */

    function updateClasses(level) {

        body.classList.toggle(
            "auto-no-grain",
            level <= 3
        );

        body.classList.toggle(
            "auto-no-carbon",
            level <= 1
        );

        body.classList.toggle(
            "auto-no-ambient",
            level <= 4
        );

        body.classList.toggle(
            "auto-no-wallpaper-motion",
            level <= 3
        );

        body.classList.toggle(
            "auto-no-smoke",
            level <= 1
        );

        body.classList.toggle(
            "auto-reduce-smoke",
            level <= 5
        );

        body.classList.toggle(
            "auto-reduce-shadows",
            level <= 5
        );

        body.classList.toggle(
            "auto-reduce-reflections",
            level <= 4
        );

        body.classList.toggle(
            "auto-reduce-animation",
            level <= 2
        );

        body.classList.toggle(
            "auto-critical",
            level <= 1
        );

    }


    /* =====================================================
       MEDIDOR DE FPS
    ===================================================== */

    let lastFrame = performance.now();

    function measureFrame(now) {

        if (!state.visible) {

            state.raf =
                requestAnimationFrame(measureFrame);

            return;
        }

        const delta =
            now - lastFrame;

        lastFrame = now;

        /*
           Ignoramos pausas enormes causadas por
           cambio de pestaña / suspensión.
        */

        if (delta > 100 && delta < 1000) {

            state.longFrames++;

        }

        if (delta >= 4 && delta < 100) {

            state.frames++;

            state.frameTime = delta;

            /*
               EMA:
               mucho más estable que simplemente
               coger el último frame.
            */

            state.avgFrameTime =
                state.avgFrameTime * .92 +
                delta * .08;

            state.worstFrameTime =
                Math.max(
                    state.worstFrameTime * .98,
                    delta
                );

        }

        state.fps =
            1000 /
            Math.max(state.avgFrameTime, 1);

        state.raf =
            requestAnimationFrame(measureFrame);
    }


    /* =====================================================
       EVALUACIÓN
    ===================================================== */

    function evaluatePerformance() {

        if (!state.automatic) {
            return;
        }

        if (!state.visible) {
            return;
        }

        const fps = state.fps;

        const now = performance.now();


        /* ================================================
           RENDIMIENTO CRÍTICO
        ================================================ */

        if (fps < CONFIG.criticalFps) {

            state.badSince ||= now;

            state.goodSince = 0;

            if (
                now - state.badSince >
                800
            ) {

                changeLevel(-2);

                state.badSince = now;
            }

            return;
        }


        /* ================================================
           RENDIMIENTO MALO
        ================================================ */

        if (fps < CONFIG.warningFps) {

            state.badSince ||= now;

            state.goodSince = 0;

            if (
                now - state.badSince >
                1200
            ) {

                changeLevel(-1);

                state.badSince = now;
            }

            return;
        }


        /* ================================================
           RENDIMIENTO BUENO
        ================================================ */

        if (fps >= 57) {

            state.goodSince ||= now;

            state.badSince = 0;

            if (
                now - state.goodSince >
                CONFIG.recoverAfter
            ) {

                changeLevel(+1);

                state.goodSince = now;
            }

            return;
        }


        state.goodSince = 0;
        state.badSince = 0;
    }


    /* =====================================================
       CAMBIO DE CALIDAD
    ===================================================== */

    function changeLevel(amount) {

        const oldLevel =
            state.level;

        const newLevel =
            Math.max(
                CONFIG.minLevel,
                Math.min(
                    CONFIG.maxLevel,
                    oldLevel + amount
                )
            );

        if (oldLevel === newLevel) {
            return;
        }

        applyGraphicsLevel(newLevel);

        state.lastEvaluation =
            performance.now();


        /*
           Evento para que otros sistemas puedan
           reaccionar sin depender de app.js.
        */

        window.dispatchEvent(
            new CustomEvent(
                "plugindex:graphicschange",
                {
                    detail: {
                        level: newLevel,
                        previous: oldLevel,
                        fps: Math.round(state.fps)
                    }
                }
            )
        );

    }


    /* =====================================================
       POINTER OPTIMIZADO
    ===================================================== */

    function setupPointer() {

        /*
           En touch NO hacemos parallax del fondo.
           El dedo debe utilizarse para interactuar,
           no para mantener una animación permanente.
        */

        if (state.touch) {
            return;
        }

        window.addEventListener(
            "pointermove",
            event => {

                const now =
                    performance.now();

                if (
                    now -
                    state.lastPointerTime <
                    CONFIG.pointerThrottle
                ) {
                    return;
                }

                state.lastPointerTime = now;

                state.pointerX =
                    (event.clientX /
                    window.innerWidth) *
                    100;

                state.pointerY =
                    (event.clientY /
                    window.innerHeight) *
                    100;

                /*
                   Solo escribimos variables.
                   No hacemos cálculos de layout.
                */

                root.style.setProperty(
                    "--light-x",
                    `${state.pointerX}%`
                );

                root.style.setProperty(
                    "--light-y",
                    `${state.pointerY}%`
                );

            },
            {
                passive: true
            }
        );

    }


    /* =====================================================
       VISIBILITY
    ===================================================== */

    function setupVisibility() {

        document.addEventListener(
            "visibilitychange",
            () => {

                state.visible =
                    !document.hidden;

                if (!state.visible) {

                    if (state.raf) {

                        cancelAnimationFrame(
                            state.raf
                        );

                        state.raf = null;
                    }

                    return;
                }

                lastFrame =
                    performance.now();

                if (!state.raf) {

                    state.raf =
                        requestAnimationFrame(
                            measureFrame
                        );
                }

            }
        );

    }


    /* =====================================================
       RESIZE
    ===================================================== */

    function setupResize() {

        let timer = null;

        window.addEventListener(
            "resize",
            () => {

                clearTimeout(timer);

                timer = setTimeout(
                    () => {

                        window.dispatchEvent(
                            new CustomEvent(
                                "plugindex:resize"
                            )
                        );

                    },
                    120
                );

            },
            {
                passive: true
            }
        );

    }


    /* =====================================================
       PERFORMANCE OBSERVER
    ===================================================== */

    function setupLongTaskMonitor() {

        if (
            !("PerformanceObserver" in window)
        ) {
            return;
        }

        try {

            const observer =
                new PerformanceObserver(
                    list => {

                        const entries =
                            list.getEntries();

                        /*
                           Un long task significa que
                           JavaScript bloqueó el hilo.
                        */

                        if (entries.length) {

                            state.longFrames +=
                                entries.length;
                        }

                    }
                );

            observer.observe({
                entryTypes: ["longtask"]
            });

        } catch {

            /*
               Algunos navegadores no soportan
               longtask.
            */

        }

    }


    /* =====================================================
       AUTO EVALUACIÓN
    ===================================================== */

    function setupEvaluation() {

        setInterval(
            evaluatePerformance,
            CONFIG.evaluateEvery
        );

    }


    /* =====================================================
       PERFIL INICIAL
    ===================================================== */

    function chooseInitialQuality() {

        /*
           No asumimos que un móvil es lento.

           Solamente damos una pequeña precarga
           conservadora a hardware claramente limitado.
        */

        if (state.reducedMotion) {

            applyGraphicsLevel(7);

            return;
        }

        if (state.lowEnd) {

            applyGraphicsLevel(6);

            return;
        }

        /*
           Calidad máxima inicialmente.
           El medidor decidirá después.
        */

        applyGraphicsLevel(10);

    }


    /* =====================================================
       API
    ===================================================== */

    const API = {

        init() {

            if (state.initialized) {
                return;
            }

            state.initialized = true;

            detectHardware();

            chooseInitialQuality();

            setupPointer();

            setupVisibility();

            setupResize();

            setupLongTaskMonitor();

            setupEvaluation();

            lastFrame =
                performance.now();

            state.raf =
                requestAnimationFrame(
                    measureFrame
                );

            window.PluginDexGraphics =
                API;

        },


        setAutomatic(value) {

            state.automatic =
                Boolean(value);

        },


        setLevel(level) {

            state.automatic = false;

            applyGraphicsLevel(
                Number(level)
            );

        },


        enableAutomatic() {

            state.automatic = true;

        },


        getState() {

            return {
                level: state.level,
                fps: Math.round(state.fps),
                frameTime:
                    Number(
                        state.avgFrameTime
                        .toFixed(2)
                    ),
                lowEnd: state.lowEnd,
                touch: state.touch,
                automatic: state.automatic
            };

        },


        isLowEnd() {
            return state.lowEnd;
        },


        getLevel() {
            return state.level;
        }

    };


    /* =====================================================
       INICIO
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            API.init,
            {
                once: true
            }
        );

    } else {

        API.init();

    }


})();
