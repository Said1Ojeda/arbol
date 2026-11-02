// dibuja el arbol en svg y lo anima entre un paso y otro
// cada nodo tiene una posicion actual y una a la que va, en cada cuadro se acerca un poco
// asi una rotacion se ve como los nodos se acomodan solos

const SVGNS = 'http://www.w3.org/2000/svg';
const R = 24;
const SEP = 62;
const NIVEL = 92;

interface Elem {
    g: SVGGElement;
    texto: SVGTextElement;
    insignia: SVGGElement;
    insigniaTexto: SVGTextElement;
    x: number; y: number; tx: number; ty: number;
    op: number; top: number;
    esc: number; tesc: number;
    valor: number;
    saliendo: boolean;
}

interface Rama {
    path: SVGPathElement;
    padre: number;
    hijo: number;
    op: number;
    top: number;
}

interface OpcionesDibujo {
    fb: boolean;
    // lugares vacios donde se puede tocar, se usan en los retos
    huecos?: { padre: number; lado: Lado }[];
}

class Escenario {
    private ramas = new Map<number, Rama>();
    private nodos = new Map<number, Elem>();
    private capaRamas: SVGGElement;
    private capaHuecos: SVGGElement;
    private capaNodos: SVGGElement;
    private flotante: SVGGElement;
    private flotanteTexto: SVGTextElement;
    private flo = { x: 0, y: 0, tx: 0, ty: 0, op: 0, top: 0 };
    private vista = { x: -200, y: -80, w: 400, h: 300, tx: -200, ty: -80, tw: 400, th: 300 };
    private previo = 0;
    private sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;

    alTocar: ((id: number) => void) | null = null;
    alHueco: ((padre: number, lado: Lado) => void) | null = null;

    constructor(private svg: SVGSVGElement) {
        this.capaRamas = this.crear('g', 'capa-ramas') as SVGGElement;
        this.capaHuecos = this.crear('g', 'capa-huecos') as SVGGElement;
        this.capaNodos = this.crear('g', 'capa-nodos') as SVGGElement;
        this.flotante = this.crear('g', 'flotante') as SVGGElement;
        const pastilla = this.crear('rect', '', this.flotante);
        pastilla.setAttribute('x', '-22');
        pastilla.setAttribute('y', '-16');
        pastilla.setAttribute('width', '44');
        pastilla.setAttribute('height', '32');
        pastilla.setAttribute('rx', '16');
        this.flotanteTexto = this.crear('text', '', this.flotante) as SVGTextElement;
        this.flotanteTexto.setAttribute('dy', '.35em');
        requestAnimationFrame(t => this.cuadro(t));
    }

    private crear(tag: string, clase: string, padre: Element = this.svg): SVGElement {
        const el = document.createElementNS(SVGNS, tag) as SVGElement;
        if (clase) el.setAttribute('class', clase);
        padre.appendChild(el);
        return el;
    }

    // el acomodo, x por el orden inorden y y por la profundidad, asi nunca se enciman
    private acomodar(foto: Foto): Map<number, { x: number; y: number }> {
        const pos = new Map<number, { x: number; y: number }>();
        let i = 0;
        const ir = (id: number | null, prof: number) => {
            if (id === null) return;
            const n = foto.nodos[id];
            ir(n.izq, prof + 1);
            pos.set(id, { x: i++ * SEP, y: prof * NIVEL });
            ir(n.der, prof + 1);
        };
        ir(foto.raiz, 0);
        // se centra en la raiz, asi el arbol no brinca de lado cuando crece
        const raiz = foto.raiz !== null ? pos.get(foto.raiz) : null;
        if (raiz) {
            const dx = raiz.x;
            pos.forEach(p => { p.x -= dx; });
        }
        return pos;
    }

    private nuevoNodo(id: number, valor: number, x: number, y: number): Elem {
        const g = this.crear('g', 'nodo', this.capaNodos) as SVGGElement;
        g.setAttribute('tabindex', '-1');
        // dos hojitas que solo se ven cuando el nodo es hoja
        const hojas = this.crear('g', 'hojitas', g);
        // cuelgan para abajo porque en computacion los arboles crecen de cabeza
        for (const [dx, giro] of [[-4, 128], [4, 52]]) {
            const h = this.crear('path', 'hojita', hojas);
            h.setAttribute('d', 'M0 0 C 6 -8, 16 -8, 20 0 C 16 6, 6 6, 0 0 Z');
            h.setAttribute('transform', 'translate(' + dx + ' ' + (R - 4) + ') rotate(' + giro + ')');
        }
        const c = this.crear('circle', 'bola', g);
        c.setAttribute('r', String(R));
        const brillo = this.crear('circle', 'brillo', g);
        brillo.setAttribute('r', String(R - 7));
        brillo.setAttribute('cx', '-5');
        brillo.setAttribute('cy', '-6');
        const texto = this.crear('text', 'valor', g) as SVGTextElement;
        texto.setAttribute('dy', '.36em');
        texto.textContent = String(valor);
        const insignia = this.crear('g', 'insignia', g) as SVGGElement;
        const fondo = this.crear('rect', '', insignia);
        fondo.setAttribute('x', '-17');
        fondo.setAttribute('y', String(-R - 22));
        fondo.setAttribute('width', '34');
        fondo.setAttribute('height', '18');
        fondo.setAttribute('rx', '9');
        const it = this.crear('text', '', insignia) as SVGTextElement;
        it.setAttribute('y', String(-R - 13));
        it.setAttribute('dy', '.35em');
        g.addEventListener('click', () => this.alTocar?.(id));
        return { g, texto, insignia, insigniaTexto: it, x, y, tx: x, ty: y, op: 0, top: 1, esc: .2, tesc: 1, valor, saliendo: false };
    }

    pintar(paso: Paso, op: OpcionesDibujo) {
        const { foto, marcas } = paso;
        const pos = this.acomodar(foto);

        // de donde salen los nodos nuevos, del numero que venia bajando o de su papa
        const origen = paso.flotante?.en !== undefined && paso.flotante.en !== null ? this.nodos.get(paso.flotante.en) : null;

        for (const id of Object.keys(foto.nodos).map(Number)) {
            const n = foto.nodos[id];
            const p = pos.get(id)!;
            let e = this.nodos.get(id);
            if (!e || e.saliendo) {
                if (e) e.g.remove();
                const padreId = Object.values(foto.nodos).find(m => m.izq === id || m.der === id)?.id;
                const desde = (padreId !== undefined && this.nodos.get(padreId)) || origen;
                e = this.nuevoNodo(id, n.valor, desde ? desde.x : p.x, desde ? desde.y : p.y - 40);
                this.nodos.set(id, e);
            }
            e.tx = p.x; e.ty = p.y; e.top = 1; e.tesc = 1;
            if (e.valor !== n.valor) {
                // el valor cambio, pasa al eliminar con sucesor
                e.valor = n.valor;
                e.texto.textContent = String(n.valor);
                e.g.classList.remove('cambia');
                void e.g.getBoundingClientRect();
                e.g.classList.add('cambia');
            }
            const marca = marcas[id];
            e.g.setAttribute('class', 'nodo' + (marca ? ' ' + marca : '') + (n.izq === null && n.der === null ? ' es-hoja' : ''));
            e.g.setAttribute('aria-label', 'Nodo ' + n.valor);
            const fb = (n.izq !== null ? foto.nodos[n.izq].altura : 0) - (n.der !== null ? foto.nodos[n.der].altura : 0);
            e.insigniaTexto.textContent = (fb > 0 ? '+' : '') + fb;
            e.insignia.setAttribute('class', 'insignia' + (op.fb ? ' visible' : '') + (Math.abs(fb) > 1 ? ' mal' : ''));
        }
        this.nodos.forEach((e, id) => {
            if (!foto.nodos[id] && !e.saliendo) {
                e.saliendo = true;
                e.top = 0;
                e.tesc = .2;
            }
        });

        // ramas, una por cada hijo
        const vivas = new Set<number>();
        for (const n of Object.values(foto.nodos)) {
            for (const hijo of [n.izq, n.der]) {
                if (hijo === null) continue;
                vivas.add(hijo);
                let r = this.ramas.get(hijo);
                if (!r) {
                    const path = this.crear('path', 'rama', this.capaRamas) as SVGPathElement;
                    r = { path, padre: n.id, hijo, op: 0, top: 1 };
                    this.ramas.set(hijo, r);
                }
                r.padre = n.id;
                r.top = 1;
                const m = marcas[hijo];
                r.path.setAttribute('class', 'rama' + (m === 'compara' || m === 'camino' || m === 'encontrado' || m === 'nuevo' || m === 'sucesor' ? ' encendida' : ''));
            }
        }
        this.ramas.forEach((r, hijo) => { if (!vivas.has(hijo)) r.top = 0; });

        // el hueco punteado donde va a caer el nuevo, o todos los huecos en los retos
        this.capaHuecos.replaceChildren();
        const huecos = op.huecos ?? (paso.hueco ? [paso.hueco] : []);
        const extra: { x: number; y: number }[] = [];
        for (const h of huecos) {
            const pp = pos.get(h.padre);
            if (!pp) continue;
            const x = pp.x + (h.lado === 'izq' ? -SEP * .55 : SEP * .55);
            const y = pp.y + NIVEL * .8;
            extra.push({ x, y });
            const g = this.crear('g', 'hueco' + (op.huecos ? ' tocable' : ''), this.capaHuecos);
            g.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
            const c = this.crear('circle', '', g);
            c.setAttribute('r', String(R - 4));
            if (op.huecos) {
                g.setAttribute('role', 'button');
                g.setAttribute('tabindex', '0');
                g.setAttribute('aria-label', 'Lado ' + (h.lado === 'izq' ? 'izquierdo' : 'derecho') + ' de ' + foto.nodos[h.padre].valor);
                const elegir = () => this.alHueco?.(h.padre, h.lado);
                g.addEventListener('click', elegir);
                g.addEventListener('keydown', ev => { if ((ev as KeyboardEvent).key === 'Enter') elegir(); });
            }
        }

        // el numero que baja buscando su lugar
        const f = paso.flotante;
        if (f) {
            const en = f.en !== null ? pos.get(f.en) : { x: 0, y: 0 };
            this.flotanteTexto.textContent = String(f.valor);
            this.flo.tx = (en?.x ?? 0) - R - 26;
            this.flo.ty = (en?.y ?? 0) - R - 4;
            if (this.flo.op < .05) { this.flo.x = this.flo.tx; this.flo.y = this.flo.ty - 30; }
            this.flo.top = 1;
        } else {
            this.flo.top = 0;
        }

        // la camara, encuadra todo el arbol con un margen
        const xs = [...pos.values(), ...extra].map(p => p.x), ys = [...pos.values(), ...extra].map(p => p.y);
        if (f) { xs.push(this.flo.tx - 24); ys.push(this.flo.ty - 20); }
        if (!xs.length) { xs.push(0); ys.push(0); }
        const minX = Math.min(...xs) - R * 2.4, maxX = Math.max(...xs) + R * 2.4;
        const minY = Math.min(...ys) - R * 2.8, maxY = Math.max(...ys) + R * 2.6;
        // nunca tan de cerca que un arbol chiquito se vea enorme
        const caja = this.svg.getBoundingClientRect();
        const angosto = caja.width > 0 && caja.width < 520;
        const w = Math.max(maxX - minX, angosto ? 300 : 420), h = Math.max(maxY - minY, 300);
        this.vista.tx = (minX + maxX) / 2 - w / 2;
        this.vista.ty = minY - (h - (maxY - minY)) * .25;
        this.vista.tw = w;
        this.vista.th = h;
    }

    // devuelve donde esta un nodo en pantalla, sirve para poner cosas encima
    posicion(id: number): { x: number; y: number } | null {
        const e = this.nodos.get(id);
        if (!e) return null;
        const caja = this.svg.getBoundingClientRect();
        const escala = Math.min(caja.width / this.vista.w, caja.height / this.vista.h);
        const ox = caja.left + (caja.width - this.vista.w * escala) / 2;
        const oy = caja.top + (caja.height - this.vista.h * escala) / 2;
        return { x: ox + (e.x - this.vista.x) * escala, y: oy + (e.y - this.vista.y) * escala };
    }

    private cuadro(t: number) {
        const dt = Math.min((t - (this.previo || t)) / 1000, .05);
        this.previo = t;
        const k = this.sinMovimiento ? 1 : 1 - Math.exp(-dt * 9);
        const acercar = (a: number, b: number) => a + (b - a) * k;

        const v = this.vista;
        v.x = acercar(v.x, v.tx); v.y = acercar(v.y, v.ty); v.w = acercar(v.w, v.tw); v.h = acercar(v.h, v.th);
        this.svg.setAttribute('viewBox', v.x.toFixed(1) + ' ' + v.y.toFixed(1) + ' ' + v.w.toFixed(1) + ' ' + v.h.toFixed(1));

        this.nodos.forEach((e, id) => {
            e.x = acercar(e.x, e.tx); e.y = acercar(e.y, e.ty);
            e.op = acercar(e.op, e.top); e.esc = acercar(e.esc, e.tesc);
            e.g.setAttribute('transform', 'translate(' + e.x.toFixed(2) + ' ' + e.y.toFixed(2) + ') scale(' + e.esc.toFixed(3) + ')');
            e.g.style.opacity = e.op.toFixed(3);
            if (e.saliendo && e.op < .02) {
                e.g.remove();
                this.nodos.delete(id);
            }
        });

        // la rama es una curva que sale de abajo del papa y llega arriba del hijo
        this.ramas.forEach((r, hijo) => {
            r.op = acercar(r.op, r.top);
            const a = this.nodos.get(r.padre), b = this.nodos.get(hijo);
            if (!a || !b || (r.top === 0 && r.op < .02)) {
                r.path.remove();
                this.ramas.delete(hijo);
                return;
            }
            const y1 = a.y + R * .7, y2 = b.y - R * .8, ym = (y1 + y2) / 2;
            r.path.setAttribute('d', 'M' + a.x.toFixed(1) + ' ' + y1.toFixed(1) + ' C' + a.x.toFixed(1) + ' ' + ym.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + ym.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + y2.toFixed(1));
            r.path.style.opacity = (r.op * Math.min(a.op, b.op)).toFixed(3);
        });

        const f = this.flo;
        f.x = acercar(f.x, f.tx); f.y = acercar(f.y, f.ty); f.op = acercar(f.op, f.top);
        this.flotante.setAttribute('transform', 'translate(' + f.x.toFixed(1) + ' ' + f.y.toFixed(1) + ')');
        this.flotante.style.opacity = f.op.toFixed(3);

        requestAnimationFrame(tt => this.cuadro(tt));
    }
}
