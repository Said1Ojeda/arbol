"use strict";
// sonidos chiquitos hechos con web audio, la nota depende del numero del nodo
const Sonido = (() => {
    let ctx = null;
    let prendido = true;
    try {
        prendido = localStorage.getItem('arbol-sonido') !== 'no';
    }
    catch (e) { }
    // pentatonica, cualquier combinacion de notas suena bien
    const ESCALA = [0, 2, 4, 7, 9];
    const nota = (valor) => {
        const k = Math.abs(Math.round(valor)) % 15;
        return 60 + ESCALA[k % 5] + 12 * Math.floor(k / 5);
    };
    const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
    function asegurar() {
        if (!prendido)
            return null;
        if (!ctx) {
            const Clase = window.AudioContext || window.webkitAudioContext;
            if (!Clase)
                return null;
            ctx = new Clase();
        }
        if (ctx.state === 'suspended')
            ctx.resume();
        return ctx;
    }
    function tono(midi, cuando, dur, tipo, vol) {
        const a = ctx;
        const o = a.createOscillator(), g = a.createGain();
        o.type = tipo;
        o.frequency.value = hz(midi);
        g.gain.setValueAtTime(.0001, cuando);
        g.gain.linearRampToValueAtTime(vol, cuando + .01);
        g.gain.exponentialRampToValueAtTime(.0001, cuando + dur);
        o.connect(g).connect(a.destination);
        o.start(cuando);
        o.stop(cuando + dur + .05);
    }
    function sonar(t, valor = 0) {
        const a = asegurar();
        if (!a)
            return;
        const ya = a.currentTime;
        const m = nota(valor);
        switch (t) {
            case 'compara':
                tono(m, ya, .14, 'triangle', .12);
                break;
            case 'visita':
                tono(m + 12, ya, .3, 'sine', .14);
                break;
            case 'nuevo':
                tono(m, ya, .2, 'triangle', .12);
                tono(m + 7, ya + .08, .35, 'triangle', .1);
                break;
            case 'encontrado':
                [0, 4, 7, 12].forEach((s, i) => tono(m + s, ya + i * .07, .4, 'sine', .1));
                break;
            case 'borrar':
                tono(m, ya, .18, 'square', .05);
                tono(m - 5, ya + .1, .3, 'square', .04);
                break;
            case 'rota':
                tono(m - 12, ya, .35, 'sawtooth', .04);
                tono(m - 5, ya + .12, .35, 'triangle', .08);
                break;
            case 'error':
                tono(48, ya, .25, 'square', .05);
                tono(47, ya + .12, .3, 'square', .05);
                break;
            default: tono(m, ya, .1, 'sine', .06);
        }
    }
    function alternar() {
        prendido = !prendido;
        try {
            localStorage.setItem('arbol-sonido', prendido ? 'si' : 'no');
        }
        catch (e) { }
        return prendido;
    }
    return { sonar, alternar, estaPrendido: () => prendido };
})();
