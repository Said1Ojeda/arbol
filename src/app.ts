// la pantalla, el reproductor de pasos y los botones
(() => {
    function $<T extends HTMLElement = HTMLElement>(id: string): T {
        const el = document.getElementById(id);
        if (!el) throw new Error('falta #' + id + ' en el html');
        return el as T;
    }

    const arbol = new Arbol();
    const escena = new Escenario($<HTMLElement>('lienzo') as unknown as SVGSVGElement);

    // reproductor

    let pasos: Paso[] = [];
    let actual = 0;
    let tocando = false;
    let reloj = 0;
    const BASE = 1100;

    const btnPlay = $<HTMLButtonElement>('play');
    const btnAnt = $<HTMLButtonElement>('ant');
    const btnSig = $<HTMLButtonElement>('sig');
    const velocidad = $<HTMLInputElement>('velocidad');

    function cargar(nuevos: Paso[], arrancar = true) {
        pasos = nuevos;
        actual = 0;
        mostrar();
        if (arrancar && pasos.length > 1) tocar(true);
        else tocar(false);
    }

    function mostrar() {
        const p = pasos[actual];
        if (!p) return;
        escena.pintar(p, { fb: arbol.modo === 'avl' });
        const m = $('mensaje');
        m.textContent = p.mensaje;
        m.className = 'mensaje ' + p.tono;
        $('vacio').hidden = p.foto.raiz !== null;
        $('contador').textContent = pasos.length > 1 ? 'Paso ' + (actual + 1) + ' de ' + pasos.length : '';
        btnAnt.disabled = actual === 0;
        btnSig.disabled = actual >= pasos.length - 1;
        pintarDatos(p.foto);
    }

    function tocar(si: boolean) {
        tocando = si && actual < pasos.length - 1;
        btnPlay.classList.toggle('pausado', !tocando);
        btnPlay.setAttribute('aria-label', tocando ? 'Pausar' : 'Reproducir');
        btnPlay.title = btnPlay.getAttribute('aria-label') || '';
        clearTimeout(reloj);
        if (tocando) reloj = window.setTimeout(avanzar, BASE / Number(velocidad.value));
    }

    function avanzar() {
        if (actual >= pasos.length - 1) return tocar(false);
        actual++;
        mostrar();
        tocar(tocando);
    }

    function ir(d: number) {
        actual = Math.max(0, Math.min(pasos.length - 1, actual + d));
        tocar(false);
        mostrar();
    }

    btnPlay.addEventListener('click', () => {
        // si ya termino, darle play la vuelve a pasar desde el inicio
        if (!tocando && actual >= pasos.length - 1) { actual = 0; mostrar(); }
        tocar(!tocando);
    });
    btnAnt.addEventListener('click', () => ir(-1));
    btnSig.addEventListener('click', () => ir(1));
    velocidad.addEventListener('input', () => tocar(tocando));

    // datos del arbol, se sacan de la foto del paso para que cuadren con lo que se ve

    function resumenDe(f: Foto): Resumen {
        let hojas = 0, balanceado = true;
        const alto = (id: number | null): number => {
            if (id === null) return 0;
            const n = f.nodos[id];
            if (n.izq === null && n.der === null) hojas++;
            const a = alto(n.izq), b = alto(n.der);
            if (Math.abs(a - b) > 1) balanceado = false;
            return 1 + Math.max(a, b);
        };
        const altura = alto(f.raiz);
        const valores = Object.values(f.nodos).map(n => n.valor);
        return {
            nodos: valores.length, altura, hojas, balanceado,
            minimo: valores.length ? Math.min(...valores) : null,
            maximo: valores.length ? Math.max(...valores) : null
        };
    }

    function pintarDatos(f: Foto) {
        const r = resumenDe(f);
        const dato = (t: string, v: string) => {
            const d = document.createElement('div');
            const dt = document.createElement('dt');
            dt.textContent = t;
            const dd = document.createElement('dd');
            dd.textContent = v;
            d.append(dt, dd);
            return d;
        };
        // con n nodos la altura minima posible es log2 de n mas uno, redondeado para arriba
        const ideal = r.nodos ? Math.ceil(Math.log2(r.nodos + 1)) : 0;
        const nota = document.createElement('div');
        nota.className = 'nota-datos';
        nota.textContent = !r.nodos ? ''
            : r.altura === ideal ? 'Tiene la altura más baja posible para ' + r.nodos + ' nodos.'
            : 'Con ' + r.nodos + ' nodos podría medir ' + ideal + ' de alto, mide ' + r.altura + '.' + (r.altura > ideal + 1 ? ' Buscar aquí cuesta más.' : '');
        $('datos').replaceChildren(
            dato('Nodos', String(r.nodos)),
            dato('Altura', String(r.altura)),
            dato('Hojas', String(r.hojas)),
            dato('Mínimo', r.minimo === null ? '-' : String(r.minimo)),
            dato('Máximo', r.maximo === null ? '-' : String(r.maximo)),
            dato('Balanceado', r.nodos ? (r.balanceado ? 'Sí' : 'No') : '-'),
            nota
        );
    }

    // un paso solo, para cuando se arma el arbol de golpe
    function pasoQuieto(mensaje: string, tono: Tono = 'info'): Paso {
        return { foto: arbol.foto(), mensaje, codigo: '', linea: -1, tono, marcas: {} };
    }

    // operaciones

    const entrada = $<HTMLInputElement>('valor');
    const aviso = $('aviso');
    const MAX = 40;

    function leer(): number | null {
        const v = Number(entrada.value);
        if (entrada.value.trim() === '' || !Number.isInteger(v) || v < -999 || v > 999) {
            aviso.textContent = 'Escribe un número entero entre -999 y 999.';
            entrada.focus();
            return null;
        }
        aviso.textContent = '';
        return v;
    }

    function hacer(accion: string) {
        const v = leer();
        if (v === null) return;
        if (accion === 'insertar') {
            if (arbol.resumen().nodos >= MAX && !arbol.tiene(v)) {
                aviso.textContent = 'Con ' + MAX + ' nodos ya no se alcanza a ver bien. Vacía el árbol o elimina alguno.';
                return;
            }
            cargar(arbol.insertar(v));
        } else if (accion === 'buscar') {
            cargar(arbol.buscar(v));
        }
        entrada.select();
    }

    $('form').addEventListener('submit', ev => {
        ev.preventDefault();
        hacer('insertar');
    });
    document.querySelectorAll<HTMLButtonElement>('[data-accion]').forEach(b => {
        if (b.type === 'button') b.addEventListener('click', () => hacer(b.dataset.accion || ''));
    });

    const EJEMPLOS: Record<string, { valores: number[]; mensaje: string }> = {
        balanceado: { valores: [50, 30, 70, 20, 40, 60, 80], mensaje: 'Un árbol bien parejo, cada búsqueda toca 3 nodos como mucho.' },
        escalera: { valores: [10, 20, 30, 40, 50, 60], mensaje: 'Si los números entran ordenados el árbol se vuelve una escalera, casi una lista. Para eso existe el AVL.' }
    };

    document.querySelectorAll<HTMLButtonElement>('[data-ejemplo]').forEach(b => b.addEventListener('click', () => {
        const e = EJEMPLOS[b.dataset.ejemplo || ''];
        arbol.construir(e.valores);
        cargar([pasoQuieto(e.mensaje)], false);
    }));

    $('aleatorio').addEventListener('click', () => {
        const cuantos = 7 + Math.floor(Math.random() * 5);
        const usados = new Set<number>();
        while (usados.size < cuantos) usados.add(1 + Math.floor(Math.random() * 99));
        arbol.construir([...usados]);
        cargar([pasoQuieto('Árbol aleatorio con ' + cuantos + ' nodos. Inserta, busca o toca un nodo.')], false);
    });

    $('vaciar').addEventListener('click', () => {
        arbol.construir([]);
        cargar([pasoQuieto('Árbol vacío. El primer número que insertes será la raíz.')], false);
    });

    // atajos, espacio pausa y las flechas mueven los pasos, si no estas escribiendo
    document.addEventListener('keydown', ev => {
        if (ev.target instanceof HTMLInputElement) return;
        if (ev.key === ' ') { ev.preventDefault(); btnPlay.click(); }
        else if (ev.key === 'ArrowRight') ir(1);
        else if (ev.key === 'ArrowLeft') ir(-1);
    });

    arbol.construir(EJEMPLOS.balanceado.valores);
    cargar([pasoQuieto('Escribe un número y dale a Insertar para ver por dónde baja.')], false);
})();
