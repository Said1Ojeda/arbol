// el arbol de verdad, cada operacion devuelve la lista de pasos para animarla
// los nodos se guardan por id, asi el dibujo sabe cual es cual aunque cambien de lugar

interface Nodo {
    id: number;
    valor: number;
    izq: Nodo | null;
    der: Nodo | null;
    altura: number;
}

class Arbol {
    raiz: Nodo | null = null;
    modo: ModoArbol = 'abb';
    private siguiente = 1;
    private pasos: Paso[] = [];

    // copia todo el arbol tal como esta ahorita
    foto(): Foto {
        const nodos: Record<number, NodoFoto> = {};
        const copiar = (n: Nodo | null) => {
            if (!n) return;
            nodos[n.id] = { id: n.id, valor: n.valor, izq: n.izq?.id ?? null, der: n.der?.id ?? null, altura: n.altura };
            copiar(n.izq);
            copiar(n.der);
        };
        copiar(this.raiz);
        return { raiz: this.raiz?.id ?? null, nodos };
    }

    private paso(codigo: string, linea: number, tono: Tono, mensaje: string, marcas: Record<number, Marca> = {}, extra: Partial<Paso> = {}) {
        this.pasos.push({ foto: this.foto(), mensaje, codigo, linea, tono, marcas, ...extra });
    }

    private tomarPasos(): Paso[] {
        const p = this.pasos;
        this.pasos = [];
        return p;
    }

    static altura(n: Nodo | null): number {
        return n ? n.altura : 0;
    }

    static fb(n: Nodo): number {
        return Arbol.altura(n.izq) - Arbol.altura(n.der);
    }

    protected actualizar(n: Nodo) {
        n.altura = 1 + Math.max(Arbol.altura(n.izq), Arbol.altura(n.der));
    }

    // pone nuevo donde estaba viejo, colgado del mismo padre
    protected reemplazar(padre: Nodo | null, viejo: Nodo, nuevo: Nodo | null) {
        if (!padre) this.raiz = nuevo;
        else if (padre.izq === viejo) padre.izq = nuevo;
        else padre.der = nuevo;
    }

    tiene(v: number): boolean {
        let n = this.raiz;
        while (n) {
            if (v === n.valor) return true;
            n = v < n.valor ? n.izq : n.der;
        }
        return false;
    }

    insertar(v: number): Paso[] {
        const camino: Nodo[] = [];
        let n = this.raiz;
        if (!n) {
            this.raiz = { id: this.siguiente++, valor: v, izq: null, der: null, altura: 1 };
            this.paso('insertar', 1, 'nuevo', 'El árbol estaba vacío, ' + v + ' queda como raíz.', { [this.raiz.id]: 'nuevo' });
            return this.tomarPasos();
        }
        this.paso('insertar', 0, 'info', 'Vamos a insertar ' + v + '. Siempre se empieza desde la raíz.', {}, { flotante: { valor: v, en: n.id } });

        const visitados: Record<number, Marca> = {};
        while (n) {
            camino.push(n);
            if (v === n.valor) {
                this.paso('insertar', 4, 'error', v + ' ya está en el árbol. En un árbol de búsqueda no se repiten valores.', { ...visitados, [n.id]: 'encontrado' });
                return this.tomarPasos();
            }
            const lado: Lado = v < n.valor ? 'izq' : 'der';
            const siguiente: Nodo | null = n[lado];
            this.paso('insertar', lado === 'izq' ? 2 : 3, 'compara',
                v + (lado === 'izq' ? ' es menor que ' : ' es mayor que ') + n.valor + ', me voy a la ' + (lado === 'izq' ? 'izquierda.' : 'derecha.'),
                { ...visitados, [n.id]: 'compara' },
                { flotante: { valor: v, en: n.id }, hueco: siguiente ? undefined : { padre: n.id, lado } });
            visitados[n.id] = 'camino';
            if (!siguiente) {
                const nuevo: Nodo = { id: this.siguiente++, valor: v, izq: null, der: null, altura: 1 };
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
    protected subir(camino: Nodo[], _marcas: Record<number, Marca>) {
        for (let k = camino.length - 1; k >= 0; k--) this.actualizar(camino[k]);
    }

    buscar(v: number): Paso[] {
        let n = this.raiz;
        const visitados: Record<number, Marca> = {};
        this.paso('buscar', 0, 'info', 'Buscamos ' + v + ' empezando por la raíz.', {}, { flotante: { valor: v, en: n?.id ?? null } });
        let comparaciones = 0;
        while (n) {
            comparaciones++;
            if (v === n.valor) {
                this.paso('buscar', 2, 'encontrado', '¡Ahí está! Se encontró ' + v + ' con ' + comparaciones + (comparaciones === 1 ? ' comparación.' : ' comparaciones.'), { ...visitados, [n.id]: 'encontrado' });
                return this.tomarPasos();
            }
            const lado: Lado = v < n.valor ? 'izq' : 'der';
            this.paso('buscar', lado === 'izq' ? 3 : 4, 'compara',
                v + (lado === 'izq' ? ' es menor que ' : ' es mayor que ') + n.valor + ', sigo por la ' + (lado === 'izq' ? 'izquierda.' : 'derecha.'),
                { ...visitados, [n.id]: 'compara' }, { flotante: { valor: v, en: n.id } });
            visitados[n.id] = 'camino';
            n = n[lado];
        }
        this.paso('buscar', 1, 'error', 'Se llegó a un lugar vacío, ' + v + ' no está en el árbol. Fueron ' + comparaciones + ' comparaciones.', visitados);
        return this.tomarPasos();
    }

    // arma el arbol sin pasos, para los ejemplos y para cambiar de modo
    construir(valores: number[]) {
        this.raiz = null;
        for (const v of valores) {
            if (!this.tiene(v)) this.insertar(v);
        }
        this.pasos = [];
    }

    valores(): number[] {
        const r: number[] = [];
        const nivel: (Nodo | null)[] = [this.raiz];
        // por niveles, asi al reconstruir sale el mismo arbol
        while (nivel.length) {
            const n = nivel.shift();
            if (!n) continue;
            r.push(n.valor);
            nivel.push(n.izq, n.der);
        }
        return r;
    }

    resumen(): Resumen {
        let nodos = 0, hojas = 0, balanceado = true;
        const ver = (n: Nodo | null): number => {
            if (!n) return 0;
            nodos++;
            if (!n.izq && !n.der) hojas++;
            const a = ver(n.izq), b = ver(n.der);
            if (Math.abs(a - b) > 1) balanceado = false;
            return 1 + Math.max(a, b);
        };
        const altura = ver(this.raiz);
        let min = this.raiz, max = this.raiz;
        while (min?.izq) min = min.izq;
        while (max?.der) max = max.der;
        return { nodos, altura, hojas, minimo: min?.valor ?? null, maximo: max?.valor ?? null, balanceado };
    }
}
