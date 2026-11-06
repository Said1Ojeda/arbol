"use strict";
// la pantalla, el reproductor de pasos y los botones
(() => {
    function $(id) {
        const el = document.getElementById(id);
        if (!el)
            throw new Error('falta #' + id + ' en el html');
        return el;
    }
    const arbol = new Arbol();
    const escena = new Escenario($('lienzo'));
    // reproductor
    let pasos = [];
    let actual = 0;
    let tocando = false;
    let reloj = 0;
    const BASE = 1100;
    const btnPlay = $('play');
    const btnAnt = $('ant');
    const btnSig = $('sig');
    const velocidad = $('velocidad');
    function cargar(nuevos, arrancar = true) {
        pasos = nuevos;
        actual = 0;
        mostrar();
        if (arrancar && pasos.length > 1)
            tocar(true);
        else
            tocar(false);
    }
    function mostrar() {
        const p = pasos[actual];
        if (!p)
            return;
        escena.pintar(p, { fb: arbol.modo === 'avl' });
        if (actual > 0 || pasos.length === 1) {
            const quien = Object.keys(p.marcas).map(Number).find(id => p.marcas[id] === 'compara' || p.marcas[id] === 'nuevo' || p.marcas[id] === 'encontrado' || p.marcas[id] === 'rota');
            const valor = p.flotante?.valor ?? (quien !== undefined ? p.foto.nodos[quien]?.valor : p.lista?.[p.lista.length - 1]) ?? 0;
            if (pasos.length > 1)
                Sonido.sonar(p.tono, valor);
        }
        if (fichaDe !== null && !p.foto.nodos[fichaDe])
            cerrarFicha();
        else if (fichaDe !== null)
            pintarFicha(fichaDe, p.foto);
        const m = $('mensaje');
        m.textContent = p.mensaje;
        m.className = 'mensaje ' + p.tono;
        $('vacio').hidden = p.foto.raiz !== null;
        $('contador').textContent = pasos.length > 1 ? 'Paso ' + (actual + 1) + ' de ' + pasos.length : '';
        btnAnt.disabled = actual === 0;
        btnSig.disabled = actual >= pasos.length - 1;
        pintarDatos(p.foto);
        pintarLista(p);
        pintarCodigo(p);
    }
    // el pseudocodigo con la linea del paso encendida
    // las lineas de altura y rotar solo aplican en avl, en el otro modo se ven apagadas
    let codigoPintado = '';
    function pintarCodigo(p) {
        const lista = $('pseudo');
        const lineas = PSEUDO[p.codigo];
        lista.parentElement.hidden = !lineas;
        if (!lineas)
            return;
        const clave = p.codigo + arbol.modo;
        if (clave !== codigoPintado) {
            codigoPintado = clave;
            lista.replaceChildren(...lineas.map((t, i) => {
                const li = document.createElement('li');
                li.textContent = t;
                const soloAvl = (p.codigo === 'insertar' && i >= 5) || (p.codigo === 'eliminar' && i === 7);
                if (soloAvl && arbol.modo !== 'avl') {
                    li.classList.add('apagada');
                    li.title = 'Solo en AVL';
                }
                return li;
            }));
        }
        [...lista.children].forEach((li, i) => li.classList.toggle('activa', i === p.linea));
    }
    // la lista del recorrido y la cola, se van llenando con cada paso
    function pintarLista(p) {
        const lista = $('lista');
        const antes = lista.children.length;
        lista.replaceChildren(...(p.lista ?? []).map((v, i) => {
            const li = document.createElement('li');
            li.textContent = String(v);
            if (i >= antes)
                li.classList.add('entra');
            return li;
        }));
        const cola = $('cola');
        cola.hidden = !p.cola;
        $('cola-lista').replaceChildren(...(p.cola ?? []).map(v => {
            const li = document.createElement('li');
            li.textContent = String(v);
            return li;
        }));
        document.querySelectorAll('[data-recorrido]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.recorrido === p.codigo)));
    }
    function tocar(si) {
        tocando = si && actual < pasos.length - 1;
        btnPlay.classList.toggle('pausado', !tocando);
        btnPlay.setAttribute('aria-label', tocando ? 'Pausar' : 'Reproducir');
        btnPlay.title = btnPlay.getAttribute('aria-label') || '';
        clearTimeout(reloj);
        const siguiente = pasos[actual + 1];
        if (tocando)
            reloj = window.setTimeout(avanzar, BASE * (siguiente?.rapido ? .55 : 1) / Number(velocidad.value));
    }
    function avanzar() {
        if (actual >= pasos.length - 1)
            return tocar(false);
        actual++;
        mostrar();
        tocar(tocando);
    }
    function ir(d) {
        actual = Math.max(0, Math.min(pasos.length - 1, actual + d));
        tocar(false);
        mostrar();
    }
    btnPlay.addEventListener('click', () => {
        // si ya termino, darle play la vuelve a pasar desde el inicio
        if (!tocando && actual >= pasos.length - 1) {
            actual = 0;
            mostrar();
        }
        tocar(!tocando);
    });
    btnAnt.addEventListener('click', () => ir(-1));
    btnSig.addEventListener('click', () => ir(1));
    velocidad.addEventListener('input', () => tocar(tocando));
    // datos del arbol, se sacan de la foto del paso para que cuadren con lo que se ve
    function resumenDe(f) {
        let hojas = 0, balanceado = true;
        const alto = (id) => {
            if (id === null)
                return 0;
            const n = f.nodos[id];
            if (n.izq === null && n.der === null)
                hojas++;
            const a = alto(n.izq), b = alto(n.der);
            if (Math.abs(a - b) > 1)
                balanceado = false;
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
    function pintarDatos(f) {
        const r = resumenDe(f);
        const dato = (t, v) => {
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
        $('datos').replaceChildren(dato('Nodos', String(r.nodos)), dato('Altura', String(r.altura)), dato('Hojas', String(r.hojas)), dato('Mínimo', r.minimo === null ? '-' : String(r.minimo)), dato('Máximo', r.maximo === null ? '-' : String(r.maximo)), dato('Balanceado', r.nodos ? (r.balanceado ? 'Sí' : 'No') : '-'), nota);
    }
    // un paso solo, para cuando se arma el arbol de golpe
    function pasoQuieto(mensaje, tono = 'info') {
        return { foto: arbol.foto(), mensaje, codigo: '', linea: -1, tono, marcas: {} };
    }
    // operaciones
    const entrada = $('valor');
    const aviso = $('aviso');
    const MAX = 40;
    function leer() {
        const v = Number(entrada.value);
        if (entrada.value.trim() === '' || !Number.isInteger(v) || v < -999 || v > 999) {
            aviso.textContent = 'Escribe un número entero entre -999 y 999.';
            entrada.focus();
            return null;
        }
        aviso.textContent = '';
        return v;
    }
    function hacer(accion) {
        const v = leer();
        if (v === null)
            return;
        if (accion === 'insertar') {
            if (arbol.resumen().nodos >= MAX && !arbol.tiene(v)) {
                aviso.textContent = 'Con ' + MAX + ' nodos ya no se alcanza a ver bien. Vacía el árbol o elimina alguno.';
                return;
            }
            cargar(arbol.insertar(v));
        }
        else if (accion === 'buscar') {
            cargar(arbol.buscar(v));
        }
        else if (accion === 'eliminar') {
            cargar(arbol.eliminar(v));
        }
        entrada.select();
    }
    $('form').addEventListener('submit', ev => {
        ev.preventDefault();
        hacer('insertar');
    });
    document.querySelectorAll('[data-accion]').forEach(b => {
        if (b.type === 'button')
            b.addEventListener('click', () => hacer(b.dataset.accion || ''));
    });
    const EJEMPLOS = {
        balanceado: { valores: [50, 30, 70, 20, 40, 60, 80], mensaje: 'Un árbol bien parejo, cada búsqueda toca 3 nodos como mucho.' },
        escalera: { valores: [10, 20, 30, 40, 50, 60], mensaje: 'Si los números entran ordenados el árbol se vuelve una escalera, casi una lista. Para eso existe el AVL.' },
        zigzag: { valores: [50, 20, 70, 10, 40], mensaje: 'Inserta 30 o 45 en modo AVL. El peso queda en zigzag y vas a ver una rotación doble.' }
    };
    // en avl la escalera sale balanceada, el mensaje tiene que decirlo
    const MENSAJE_AVL = {
        escalera: 'Mismos números ordenados que hacen la escalera, pero el AVL fue rotando en cada paso y quedó parejo.'
    };
    document.querySelectorAll('[data-ejemplo]').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.ejemplo || '';
        const e = EJEMPLOS[id];
        arbol.construir(e.valores);
        cargar([pasoQuieto(arbol.modo === 'avl' && MENSAJE_AVL[id] ? MENSAJE_AVL[id] : e.mensaje)], false);
    }));
    document.querySelectorAll('[data-recorrido]').forEach(b => b.addEventListener('click', () => {
        cargar(arbol.recorrido(b.dataset.recorrido));
    }));
    // tocar un nodo abre su ficha y pone su numero en la caja
    let fichaDe = null;
    const tocarNodo = (id) => {
        const f = pasos[actual]?.foto;
        const n = f?.nodos[id];
        if (!f || !n)
            return;
        entrada.value = String(n.valor);
        aviso.textContent = '';
        fichaDe = id;
        escena.elegido = id;
        mostrar();
        Sonido.sonar('compara', n.valor);
    };
    function pintarFicha(id, f) {
        const n = f.nodos[id];
        // camino desde la raiz, de paso sale el nivel
        const camino = [];
        let cur = f.raiz;
        while (cur !== null) {
            const c = f.nodos[cur];
            camino.push(c.valor);
            if (c.id === id)
                break;
            cur = n.valor < c.valor ? c.izq : c.der;
        }
        const tam = (x) => x === null ? 0 : 1 + tam(f.nodos[x].izq) + tam(f.nodos[x].der);
        const alt = (x) => x === null ? 0 : f.nodos[x].altura;
        const hijos = [n.izq, n.der].filter((h) => h !== null).map(h => f.nodos[h].valor);
        const fb = alt(n.izq) - alt(n.der);
        const filas = [
            ['Nivel', String(camino.length - 1)],
            ['Altura', String(n.altura)],
            ['Factor de balance', (fb > 0 ? '+' : '') + fb],
            ['Hijos', hijos.length ? hijos.join(' y ') : 'Ninguno, es hoja'],
            ['Nodos en su subárbol', String(tam(id))]
        ];
        $('ficha-titulo').textContent = id === f.raiz ? 'Nodo ' + n.valor + ', la raíz' : 'Nodo ' + n.valor;
        $('ficha-datos').replaceChildren(...filas.map(([t, v]) => {
            const d = document.createElement('div');
            const dt = document.createElement('dt');
            dt.textContent = t;
            const dd = document.createElement('dd');
            dd.textContent = v;
            d.append(dt, dd);
            return d;
        }));
        $('ficha-camino').textContent = camino.length > 1 ? 'Para llegar: ' + camino.join(', ') : 'Aquí empieza toda búsqueda.';
        const ficha = $('ficha');
        ficha.hidden = false;
        // la ficha se va al lado contrario del nodo para no taparlo
        const donde = escena.posicion(id);
        const caja = ficha.parentElement.getBoundingClientRect();
        if (donde)
            ficha.classList.toggle('derecha', donde.x - caja.left < caja.width / 2);
    }
    function cerrarFicha() {
        fichaDe = null;
        escena.elegido = null;
        $('ficha').hidden = true;
        const p = pasos[actual];
        if (p)
            escena.pintar(p, { fb: arbol.modo === 'avl' });
    }
    escena.alTocar = tocarNodo;
    $('cerrar-ficha').addEventListener('click', cerrarFicha);
    $('ficha-buscar').addEventListener('click', () => { cerrarFicha(); hacer('buscar'); });
    $('ficha-eliminar').addEventListener('click', () => { cerrarFicha(); hacer('eliminar'); });
    const botonSonido = $('sonido');
    const pintarSonido = () => {
        const si = Sonido.estaPrendido();
        botonSonido.textContent = si ? '🔊' : '🔇';
        botonSonido.setAttribute('aria-pressed', String(si));
    };
    botonSonido.addEventListener('click', () => { Sonido.alternar(); pintarSonido(); });
    pintarSonido();
    // el enlace lleva los numeros por niveles y el modo, al abrirlo sale el mismo arbol
    $('compartir').addEventListener('click', async () => {
        const url = new URL(location.href);
        url.search = '';
        url.searchParams.set('a', arbol.valores().join(','));
        url.searchParams.set('m', arbol.modo);
        const texto = url.toString();
        try {
            if (navigator.share && matchMedia('(pointer: coarse)').matches)
                await navigator.share({ title: 'Mi árbol', url: texto });
            else {
                await navigator.clipboard.writeText(texto);
                aviso.textContent = 'Enlace copiado, al abrirlo sale este mismo árbol.';
            }
        }
        catch (e) {
            aviso.textContent = texto;
        }
    });
    function leerEnlace() {
        const q = new URLSearchParams(location.search);
        const a = q.get('a');
        if (!a)
            return false;
        const valores = a.split(',').map(Number).filter(v => Number.isInteger(v) && Math.abs(v) <= 999).slice(0, MAX);
        if (!valores.length)
            return false;
        ponerModo(q.get('m') === 'avl' ? 'avl' : 'abb', false);
        arbol.construir(valores);
        cargar([pasoQuieto('Este es el árbol que te compartieron. Inserta, busca o toca un nodo para ver sus datos.')], false);
        return true;
    }
    $('aleatorio').addEventListener('click', () => {
        const cuantos = 7 + Math.floor(Math.random() * 5);
        const usados = new Set();
        while (usados.size < cuantos)
            usados.add(1 + Math.floor(Math.random() * 99));
        arbol.construir([...usados]);
        cargar([pasoQuieto('Árbol aleatorio con ' + cuantos + ' nodos. Inserta, busca o toca un nodo.')], false);
    });
    $('vaciar').addEventListener('click', () => {
        arbol.construir([]);
        cargar([pasoQuieto('Árbol vacío. El primer número que insertes será la raíz.')], false);
    });
    // cambiar de modo rearma el arbol con los mismos numeros, por niveles para que salga parecido
    function ponerModo(modo, avisar = true) {
        document.querySelectorAll('[data-modo]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.modo === modo)));
        document.body.dataset.modo = modo;
        if (modo === arbol.modo && avisar)
            return;
        const antes = arbol.resumen().altura;
        arbol.construir(arbol.valores(), modo);
        const despues = arbol.resumen().altura;
        if (!avisar)
            return;
        cargar([pasoQuieto(modo === 'avl'
                ? 'Modo AVL. Cada nodo muestra su factor de balance, y si llega a +2 o -2 el árbol rota.' + (despues < antes ? ' Al rearmarlo bajó de ' + antes + ' a ' + despues + ' de altura.' : '')
                : 'Árbol de búsqueda normal. No se balancea solo, depende del orden en que entren los números.')], false);
    }
    document.querySelectorAll('[data-modo]').forEach(b => b.addEventListener('click', () => ponerModo(b.dataset.modo)));
    // pestanas, explorar y retos comparten el escenario
    const retos = new Retos(escena, {
        mensaje: (texto, tono) => {
            const m = $('mensaje');
            m.textContent = texto;
            m.className = 'mensaje ' + tono;
        }
    });
    let vista = 'explorar';
    function ponerVista(v) {
        vista = v;
        document.body.dataset.vista = v;
        document.querySelectorAll('[data-vista]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.vista === v)));
        $('panel-retos').hidden = v !== 'retos';
        document.querySelector('.panel-explorar').hidden = v !== 'explorar';
        cerrarFicha();
        tocar(false);
        if (v === 'retos') {
            $('vacio').hidden = true;
            $('contador').textContent = '';
            retos.activar();
        }
        else {
            escena.alTocar = tocarNodo;
            escena.alHueco = null;
            mostrar();
        }
    }
    document.querySelectorAll('[data-vista]').forEach(b => b.addEventListener('click', () => ponerVista(b.dataset.vista)));
    // atajos, espacio pausa, las flechas mueven los pasos y la n o la diagonal van al numero
    // escape cierra la ficha del nodo aunque estes escribiendo
    document.addEventListener('keydown', ev => {
        if (ev.key === 'Escape' && fichaDe !== null) {
            cerrarFicha();
            return;
        }
        if (ev.target instanceof HTMLInputElement || vista === 'retos')
            return;
        if (ev.key === ' ') {
            ev.preventDefault();
            btnPlay.click();
        }
        else if (ev.key === 'ArrowRight')
            ir(1);
        else if (ev.key === 'ArrowLeft')
            ir(-1);
        else if (ev.key === '/' || ev.key === 'n') {
            ev.preventDefault();
            entrada.focus();
            entrada.select();
        }
        else if (ev.key === '+' || ev.key === '-') {
            // mas y menos mueven la velocidad un paso del slider
            const paso = Number(velocidad.step) * (ev.key === '+' ? 1 : -1);
            velocidad.value = String(Math.min(Number(velocidad.max), Math.max(Number(velocidad.min), Number(velocidad.value) + paso)));
            velocidad.dispatchEvent(new Event('input'));
        }
    });
    if (!leerEnlace()) {
        arbol.construir(EJEMPLOS.balanceado.valores);
        cargar([pasoQuieto('Escribe un número y dale a Insertar para ver por dónde baja. Toca un nodo para ver sus datos.')], false);
    }
})();
