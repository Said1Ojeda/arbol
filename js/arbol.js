"use strict";
// el arbol de verdad, cada operacion devuelve la lista de pasos para animarla
// los nodos se guardan por id, asi el dibujo sabe cual es cual aunque cambien de lugar
class Arbol {
    constructor() {
        this.raiz = null;
        this.modo = 'abb';
        this.siguiente = 1;
        this.pasos = [];
    }
    // copia todo el arbol tal como esta ahorita
    foto() {
        const nodos = {};
        const copiar = (n) => {
            if (!n)
                return;
            nodos[n.id] = { id: n.id, valor: n.valor, izq: n.izq?.id ?? null, der: n.der?.id ?? null, altura: n.altura };
            copiar(n.izq);
            copiar(n.der);
        };
        copiar(this.raiz);
        return { raiz: this.raiz?.id ?? null, nodos };
    }
    paso(codigo, linea, tono, mensaje, marcas = {}, extra = {}) {
        this.pasos.push({ foto: this.foto(), mensaje, codigo, linea, tono, marcas, ...extra });
    }
    tomarPasos() {
        const p = this.pasos;
        this.pasos = [];
        return p;
    }
    static altura(n) {
        return n ? n.altura : 0;
    }
    static fb(n) {
        return Arbol.altura(n.izq) - Arbol.altura(n.der);
    }
    actualizar(n) {
        n.altura = 1 + Math.max(Arbol.altura(n.izq), Arbol.altura(n.der));
    }
    // pone nuevo donde estaba viejo, colgado del mismo padre
    reemplazar(padre, viejo, nuevo) {
        if (!padre)
            this.raiz = nuevo;
        else if (padre.izq === viejo)
            padre.izq = nuevo;
        else
            padre.der = nuevo;
    }
    tiene(v) {
        let n = this.raiz;
        while (n) {
            if (v === n.valor)
                return true;
            n = v < n.valor ? n.izq : n.der;
        }
        return false;
    }
    insertar(v) {
        const camino = [];
        let n = this.raiz;
        if (!n) {
            this.raiz = { id: this.siguiente++, valor: v, izq: null, der: null, altura: 1 };
            this.paso('insertar', 1, 'nuevo', 'El árbol estaba vacío, ' + v + ' queda como raíz.', { [this.raiz.id]: 'nuevo' });
            return this.tomarPasos();
        }
        this.paso('insertar', 0, 'info', 'Vamos a insertar ' + v + '. Siempre se empieza desde la raíz.', {}, { flotante: { valor: v, en: n.id } });
        const visitados = {};
        while (n) {
            camino.push(n);
            if (v === n.valor) {
                this.paso('insertar', 4, 'error', v + ' ya está en el árbol. En un árbol de búsqueda no se repiten valores.', { ...visitados, [n.id]: 'encontrado' });
                return this.tomarPasos();
            }
            const lado = v < n.valor ? 'izq' : 'der';
            const siguiente = n[lado];
            this.paso('insertar', lado === 'izq' ? 2 : 3, 'compara', v + (lado === 'izq' ? ' es menor que ' : ' es mayor que ') + n.valor + ', me voy a la ' + (lado === 'izq' ? 'izquierda.' : 'derecha.'), { ...visitados, [n.id]: 'compara' }, { flotante: { valor: v, en: n.id }, hueco: siguiente ? undefined : { padre: n.id, lado } });
            visitados[n.id] = 'camino';
            if (!siguiente) {
                const nuevo = { id: this.siguiente++, valor: v, izq: null, der: null, altura: 1 };
                n[lado] = nuevo;
                this.paso('insertar', 1, 'nuevo', 'Aquí está vacío, ' + v + ' se queda como hijo ' + (lado === 'izq' ? 'izquierdo' : 'derecho') + ' de ' + n.valor + '.', { ...visitados, [nuevo.id]: 'nuevo' });
                break;
            }
            n = siguiente;
        }
        this.subir(camino, 'insertar');
        return this.tomarPasos();
    }
    // regresa por el camino actualizando alturas, en avl ademas balancea
    subir(camino, codigo) {
        const linea = codigo === 'insertar' ? 6 : 7;
        for (let k = camino.length - 1; k >= 0; k--) {
            const n = camino[k];
            this.actualizar(n);
            if (this.modo !== 'avl')
                continue;
            const fb = Arbol.fb(n);
            if (Math.abs(fb) <= 1)
                continue;
            this.balancear(n, camino[k - 1] ?? null, fb, codigo, linea);
        }
    }
    rotarDer(y) {
        const x = y.izq;
        y.izq = x.der;
        x.der = y;
        this.actualizar(y);
        this.actualizar(x);
        return x;
    }
    rotarIzq(x) {
        const y = x.der;
        x.der = y.izq;
        y.izq = x;
        this.actualizar(x);
        this.actualizar(y);
        return y;
    }
    // los cuatro casos, si el hijo se carga al mismo lado basta una rotacion, si no son dos
    balancear(n, padre, fb, codigo, linea) {
        const izqPesa = fb > 1;
        const hijo = (izqPesa ? n.izq : n.der);
        const fbHijo = Arbol.fb(hijo);
        const doble = izqPesa ? fbHijo < 0 : fbHijo > 0;
        const ladoAlto = izqPesa ? 'izquierdo' : 'derecho';
        this.paso(codigo, linea, 'rota', n.valor + ' quedó desbalanceado. Su lado ' + ladoAlto + ' mide ' + Math.max(Arbol.altura(n.izq), Arbol.altura(n.der)) + ' y el otro ' + Math.min(Arbol.altura(n.izq), Arbol.altura(n.der)) + ', el factor de balance es ' + (fb > 0 ? '+' : '') + fb + '.', { [n.id]: 'desbalance', [hijo.id]: 'camino' });
        const caso = izqPesa ? (doble ? 'izquierda-derecha' : 'izquierda-izquierda') : (doble ? 'derecha-izquierda' : 'derecha-derecha');
        const clave = (izqPesa ? 'I' : 'D') + (doble ? (izqPesa ? 'D' : 'I') : (izqPesa ? 'I' : 'D'));
        this.pasos[this.pasos.length - 1].caso = clave;
        if (doble) {
            const nieto = (izqPesa ? hijo.der : hijo.izq);
            this.paso(codigo, linea, 'rota', 'Caso ' + caso + ', el peso está en zigzag. Hace falta una rotación doble. Primero se rota ' + hijo.valor + ' a la ' + (izqPesa ? 'izquierda' : 'derecha') + ' para enderezarlo.', { [n.id]: 'desbalance', [hijo.id]: 'rota', [nieto.id]: 'rota' });
            if (izqPesa)
                n.izq = this.rotarIzq(hijo);
            else
                n.der = this.rotarDer(hijo);
            this.paso(codigo, linea, 'rota', 'Ya quedó en línea recta, ' + nieto.valor + ' subió. Ahora la segunda rotación, en ' + n.valor + '.', { [n.id]: 'desbalance', [nieto.id]: 'rota', [hijo.id]: 'rota' });
        }
        else {
            this.paso(codigo, linea, 'rota', 'Caso ' + caso + ', el peso está en línea recta. Basta una rotación simple a la ' + (izqPesa ? 'derecha' : 'izquierda') + ' en ' + n.valor + '.', { [n.id]: 'desbalance', [hijo.id]: 'rota' });
        }
        const nueva = izqPesa ? this.rotarDer(n) : this.rotarIzq(n);
        this.reemplazar(padre, n, nueva);
        this.paso(codigo, linea, 'rota', nueva.valor + ' subió y ' + n.valor + ' bajó a la ' + (izqPesa ? 'derecha' : 'izquierda') + '. Quedó balanceado y sigue ordenado.', { [nueva.id]: 'rota', [n.id]: 'rota' });
    }
    eliminar(v) {
        const camino = [];
        const visitados = {};
        let n = this.raiz;
        this.paso('eliminar', 1, 'info', 'Para eliminar ' + v + ' primero hay que encontrarlo.', {}, { flotante: { valor: v, en: n?.id ?? null } });
        while (n && n.valor !== v) {
            const lado = v < n.valor ? 'izq' : 'der';
            this.paso('eliminar', 1, 'compara', v + (lado === 'izq' ? ' es menor que ' : ' es mayor que ') + n.valor + ', sigo por la ' + (lado === 'izq' ? 'izquierda.' : 'derecha.'), { ...visitados, [n.id]: 'compara' }, { flotante: { valor: v, en: n.id } });
            visitados[n.id] = 'camino';
            camino.push(n);
            n = n[lado];
        }
        if (!n) {
            this.paso('eliminar', 1, 'error', v + ' no está en el árbol, no hay nada que eliminar.', visitados);
            return this.tomarPasos();
        }
        const padre = camino[camino.length - 1] ?? null;
        const objetivo = n;
        if (!n.izq && !n.der) {
            this.paso('eliminar', 2, 'borrar', v + ' es hoja, no tiene hijos. Se quita sin mover nada más.', { ...visitados, [n.id]: 'borrar' });
            this.reemplazar(padre, n, null);
            this.paso('eliminar', 2, 'borrar', 'Listo, ' + v + ' ya no está.', visitados);
            this.subir(camino, 'eliminar');
            return this.tomarPasos();
        }
        if (!n.izq || !n.der) {
            const hijo = (n.izq ?? n.der);
            this.paso('eliminar', 3, 'borrar', v + ' tiene un solo hijo, ' + hijo.valor + '. Ese hijo sube a ocupar su lugar con todo lo que cuelga de él.', { ...visitados, [n.id]: 'borrar', [hijo.id]: 'camino' });
            this.reemplazar(padre, n, hijo);
            this.paso('eliminar', 3, 'nuevo', hijo.valor + ' subió al lugar de ' + v + '.', { ...visitados, [hijo.id]: 'nuevo' });
            this.subir(camino, 'eliminar');
            return this.tomarPasos();
        }
        // dos hijos, el sucesor es el menor de la derecha y nunca tiene hijo izquierdo
        this.paso('eliminar', 4, 'borrar', v + ' tiene dos hijos. No se puede quitar así nomás, lo vamos a cambiar por su sucesor.', { ...visitados, [n.id]: 'borrar' });
        const bajada = [n];
        let suc = n.der;
        let padreSuc = n;
        this.paso('eliminar', 5, 'compara', 'El sucesor es el menor de su lado derecho. Bajo una vez a la derecha, a ' + suc.valor + '.', { ...visitados, [n.id]: 'borrar', [suc.id]: 'sucesor' });
        while (suc.izq) {
            bajada.push(suc);
            padreSuc = suc;
            suc = suc.izq;
            this.paso('eliminar', 5, 'compara', 'Y luego todo a la izquierda que se pueda, a ' + suc.valor + '.', { ...visitados, [n.id]: 'borrar', [suc.id]: 'sucesor' });
        }
        this.paso('eliminar', 5, 'info', suc.valor + ' es el sucesor, el número que sigue después de ' + v + '. Con él arriba todo sigue en orden.', { ...visitados, [n.id]: 'borrar', [suc.id]: 'sucesor' });
        objetivo.valor = suc.valor;
        this.reemplazar(padreSuc, suc, suc.der);
        this.paso('eliminar', 6, 'nuevo', 'Se copió ' + objetivo.valor + ' al lugar de ' + v + ' y se quitó el ' + objetivo.valor + ' de abajo.', { ...visitados, [objetivo.id]: 'nuevo' });
        this.subir([...camino, ...bajada], 'eliminar');
        return this.tomarPasos();
    }
    buscar(v) {
        let n = this.raiz;
        const visitados = {};
        this.paso('buscar', 0, 'info', 'Buscamos ' + v + ' empezando por la raíz.', {}, { flotante: { valor: v, en: n?.id ?? null } });
        let comparaciones = 0;
        while (n) {
            comparaciones++;
            if (v === n.valor) {
                this.paso('buscar', 2, 'encontrado', '¡Ahí está! Se encontró ' + v + ' con ' + comparaciones + (comparaciones === 1 ? ' comparación.' : ' comparaciones.'), { ...visitados, [n.id]: 'encontrado' });
                return this.tomarPasos();
            }
            const lado = v < n.valor ? 'izq' : 'der';
            this.paso('buscar', lado === 'izq' ? 3 : 4, 'compara', v + (lado === 'izq' ? ' es menor que ' : ' es mayor que ') + n.valor + ', sigo por la ' + (lado === 'izq' ? 'izquierda.' : 'derecha.'), { ...visitados, [n.id]: 'compara' }, { flotante: { valor: v, en: n.id } });
            visitados[n.id] = 'camino';
            n = n[lado];
        }
        this.paso('buscar', 1, 'error', 'Se llegó a un lugar vacío, ' + v + ' no está en el árbol. Fueron ' + comparaciones + ' comparaciones.', visitados);
        return this.tomarPasos();
    }
    recorrido(tipo) {
        const lista = [];
        const visitados = {};
        if (!this.raiz) {
            this.paso(tipo, 1, 'error', 'El árbol está vacío, no hay nada que recorrer.', {}, { lista: [] });
            return this.tomarPasos();
        }
        const lineas = {
            inorden: { izq: 2, visita: 3, der: 4 },
            preorden: { visita: 2, izq: 3, der: 4 },
            postorden: { izq: 2, der: 3, visita: 4 }
        };
        const visitar = (n, linea) => {
            lista.push(n.valor);
            visitados[n.id] = 'visitado';
            this.paso(tipo, linea, 'visita', 'Visito ' + n.valor + '.', { ...visitados }, { lista: [...lista] });
        };
        const bajar = (n, hijo, lado, linea) => {
            this.paso(tipo, linea, 'info', 'Desde ' + n.valor + ' bajo por la ' + (lado === 'izq' ? 'izquierda' : 'derecha') + ' a ' + hijo.valor + '.', { ...visitados, [hijo.id]: 'compara' }, { lista: [...lista], rapido: true });
        };
        if (tipo === 'niveles') {
            const cola = [this.raiz];
            this.paso(tipo, 1, 'info', 'La cola empieza con la raíz.', { [this.raiz.id]: 'compara' }, { lista: [], cola: [this.raiz.valor] });
            while (cola.length) {
                const n = cola.shift();
                lista.push(n.valor);
                visitados[n.id] = 'visitado';
                const hijos = [n.izq, n.der].filter((h) => h !== null);
                cola.push(...hijos);
                this.paso(tipo, 4, 'visita', 'Saco ' + n.valor + ' de la cola y lo visito.' + (hijos.length ? ' Entran sus hijos: ' + hijos.map(h => h.valor).join(' y ') + '.' : ''), { ...visitados, ...Object.fromEntries(cola.map(c => [c.id, 'camino'])) }, { lista: [...lista], cola: cola.map(c => c.valor) });
            }
        }
        else {
            const l = lineas[tipo];
            const ir = (n) => {
                if (tipo === 'preorden')
                    visitar(n, l.visita);
                if (n.izq) {
                    bajar(n, n.izq, 'izq', l.izq);
                    ir(n.izq);
                }
                if (tipo === 'inorden')
                    visitar(n, l.visita);
                if (n.der) {
                    bajar(n, n.der, 'der', l.der);
                    ir(n.der);
                }
                if (tipo === 'postorden')
                    visitar(n, l.visita);
            };
            ir(this.raiz);
        }
        const cierre = {
            inorden: 'Quedó de menor a mayor. En un árbol de búsqueda el inorden siempre sale ordenado.',
            preorden: 'Primero el papá y después los hijos. Si insertas en este orden en un árbol vacío, sale el mismo árbol.',
            postorden: 'Los hijos antes que el papá. Así se borra un árbol entero sin dejar nodos colgando.',
            niveles: 'Piso por piso, de izquierda a derecha. La cola es la que hace que salga por niveles.'
        };
        this.paso(tipo, 0, 'encontrado', cierre[tipo], { ...visitados }, { lista: [...lista], cola: tipo === 'niveles' ? [] : undefined });
        return this.tomarPasos();
    }
    // arma el arbol sin pasos, para los ejemplos y para cambiar de modo
    construir(valores, modo = this.modo) {
        this.modo = modo;
        this.raiz = null;
        for (const v of valores) {
            if (!this.tiene(v))
                this.insertar(v);
        }
        this.pasos = [];
    }
    valores() {
        const r = [];
        const nivel = [this.raiz];
        // por niveles, asi al reconstruir sale el mismo arbol
        while (nivel.length) {
            const n = nivel.shift();
            if (!n)
                continue;
            r.push(n.valor);
            nivel.push(n.izq, n.der);
        }
        return r;
    }
    resumen() {
        let nodos = 0, hojas = 0, balanceado = true;
        const ver = (n) => {
            if (!n)
                return 0;
            nodos++;
            if (!n.izq && !n.der)
                hojas++;
            const a = ver(n.izq), b = ver(n.der);
            if (Math.abs(a - b) > 1)
                balanceado = false;
            return 1 + Math.max(a, b);
        };
        const altura = ver(this.raiz);
        let min = this.raiz, max = this.raiz;
        while (min?.izq)
            min = min.izq;
        while (max?.der)
            max = max.der;
        return { nodos, altura, hojas, minimo: min?.valor ?? null, maximo: max?.valor ?? null, balanceado };
    }
}
