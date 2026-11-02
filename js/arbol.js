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
        this.subir(camino, visitados);
        return this.tomarPasos();
    }
    // regresa por el camino actualizando alturas, en avl ademas balancea
    subir(camino, _marcas) {
        for (let k = camino.length - 1; k >= 0; k--)
            this.actualizar(camino[k]);
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
    // arma el arbol sin pasos, para los ejemplos y para cambiar de modo
    construir(valores) {
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
