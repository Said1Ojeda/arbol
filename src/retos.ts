// modo juego, retos cortos con vidas, puntos y racha
// usa el mismo escenario que explorar pero con su propio arbol

type TipoReto = 'donde' | 'recorrido' | 'rotacion';

interface UiRetos {
    mensaje: (texto: string, tono: Tono) => void;
}

class Retos {
    private arbol = new Arbol();
    private vidas = 3;
    private puntos = 0;
    private racha = 0;
    private record = 0;
    private bloqueado = false;
    private tipo: TipoReto = 'donde';
    private resuelto = false;
    private foto: Foto = { raiz: null, nodos: {} };
    private marcas: Record<number, Marca> = {};
    private huecos: { padre: number; lado: Lado }[] = [];
    private fb = false;
    // datos del reto que va
    private valor = 0;
    private esperado: number[] = [];
    private tocados: number[] = [];
    private recorrido: Recorrido = 'inorden';
    private pasosRotacion: Paso[] = [];
    private casoBueno: Paso['caso'];

    constructor(private escena: Escenario, private ui: UiRetos) {
        try { this.record = Number(localStorage.getItem('arbol-record') || 0); } catch (e) {}
        this.$('reto-sig').addEventListener('click', () => this.nuevo());
        this.$('otra').addEventListener('click', () => this.empezar());
    }

    private $(id: string): HTMLElement {
        const el = document.getElementById(id);
        if (!el) throw new Error('falta #' + id);
        return el;
    }

    activar() {
        this.escena.alTocar = id => this.tocarNodo(id);
        this.escena.alHueco = (padre, lado) => this.tocarHueco(padre, lado);
        this.escena.elegido = null;
        if (this.vidas <= 0 || this.puntos === 0) this.empezar();
        else this.pintar();
    }

    private empezar() {
        this.vidas = 3;
        this.puntos = 0;
        this.racha = 0;
        this.$('fin-juego').hidden = true;
        this.$('tarjeta-reto').hidden = false;
        this.marcador();
        this.nuevo();
    }

    private marcador() {
        this.$('vidas').replaceChildren(...[0, 1, 2].map(i => {
            const s = document.createElement('span');
            s.className = 'vida' + (i < this.vidas ? '' : ' perdida');
            s.textContent = '♥';
            return s;
        }));
        this.$('vidas').setAttribute('aria-label', this.vidas + ' vidas');
        this.$('puntos').textContent = String(this.puntos);
        this.$('racha').textContent = String(this.racha);
        this.$('record').textContent = String(this.record);
    }

    // el tamano del arbol crece con los puntos, asi se pone mas dificil
    private tamano(): number {
        return 5 + Math.min(5, Math.floor(this.puntos / 50));
    }

    private aleatorios(n: number): number[] {
        const s = new Set<number>();
        while (s.size < n) s.add(1 + Math.floor(Math.random() * 99));
        return [...s];
    }

    private nuevo() {
        this.bloqueado = false;
        this.resuelto = false;
        this.marcas = {};
        this.huecos = [];
        this.tocados = [];
        this.$('reto-sig').hidden = true;
        this.$('reto-opciones').replaceChildren();
        this.$('reto-lista').replaceChildren();
        const r = Math.random();
        this.tipo = r < .45 ? 'donde' : r < .75 ? 'recorrido' : 'rotacion';
        if (this.tipo === 'donde') this.retoDonde();
        else if (this.tipo === 'recorrido') this.retoRecorrido();
        else this.retoRotacion();
        this.pintar();
    }

    private pintar(extra: Partial<Paso> = {}) {
        this.escena.pintar({ foto: this.foto, mensaje: '', codigo: '', linea: -1, tono: 'info', marcas: this.marcas, ...extra },
            { fb: this.fb, huecos: this.huecos.length ? this.huecos : undefined });
    }

    private textos(tipo: string, pregunta: string, ayuda: string) {
        this.$('reto-tipo').textContent = tipo;
        this.$('reto-pregunta').textContent = pregunta;
        this.$('reto-ayuda').textContent = ayuda;
    }

    // reto 1, tocar el hueco donde va a caer un numero
    private retoDonde() {
        this.fb = false;
        this.arbol.construir(this.aleatorios(this.tamano()), 'abb');
        do { this.valor = 1 + Math.floor(Math.random() * 99); } while (this.arbol.tiene(this.valor));
        this.foto = this.arbol.foto();
        for (const n of Object.values(this.foto.nodos)) {
            if (n.izq === null) this.huecos.push({ padre: n.id, lado: 'izq' });
            if (n.der === null) this.huecos.push({ padre: n.id, lado: 'der' });
        }
        this.textos('¿Dónde cae?', '¿Dónde va a quedar el ' + this.valor + '?', 'Toca el hueco punteado donde terminaría al insertarlo. Recuerda, menor a la izquierda y mayor a la derecha.');
        this.ui.mensaje('Toca el lugar vacío donde caería el ' + this.valor + '.', 'compara');
    }

    private tocarHueco(padre: number, lado: Lado) {
        if (this.tipo !== 'donde' || this.bloqueado || this.resuelto) return;
        this.bloqueado = true;
        // donde caeria de verdad
        let n = this.foto.raiz, bueno: { padre: number; lado: Lado } | null = null;
        while (n !== null) {
            const x = this.foto.nodos[n];
            const l: Lado = this.valor < x.valor ? 'izq' : 'der';
            const sig = l === 'izq' ? x.izq : x.der;
            if (sig === null) { bueno = { padre: n, lado: l }; break; }
            n = sig;
        }
        const acierto = !!bueno && bueno.padre === padre && bueno.lado === lado;
        this.huecos = [];
        const pasos = this.arbol.insertar(this.valor);
        this.reproducir(pasos, 420, () => this.resultado(acierto, acierto
            ? '¡Exacto! El ' + this.valor + ' cae ahí.'
            : 'No era ahí. Mira el camino que siguió el ' + this.valor + ' comparando en cada nodo.'));
    }

    // reto 2, tocar los nodos en el orden de un recorrido
    private retoRecorrido() {
        this.fb = false;
        this.arbol.construir(this.aleatorios(Math.max(5, this.tamano() - 1)), 'abb');
        this.foto = this.arbol.foto();
        const tipos: Recorrido[] = ['inorden', 'preorden', 'postorden', 'niveles'];
        this.recorrido = tipos[Math.floor(Math.random() * tipos.length)];
        const p = this.arbol.recorrido(this.recorrido);
        this.esperado = p[p.length - 1].lista ?? [];
        const ayuda: Record<Recorrido, string> = {
            inorden: 'Inorden es izquierda, nodo, derecha. En un árbol de búsqueda sale de menor a mayor.',
            preorden: 'Preorden es nodo, izquierda, derecha. Siempre empieza por la raíz.',
            postorden: 'Postorden es izquierda, derecha, nodo. La raíz va al final.',
            niveles: 'Por niveles es piso por piso, de izquierda a derecha.'
        };
        const nombre: Record<Recorrido, string> = { inorden: 'inorden', preorden: 'preorden', postorden: 'postorden', niveles: 'por niveles' };
        this.textos('Recorrido', 'Toca los nodos en ' + nombre[this.recorrido], ayuda[this.recorrido]);
        this.ui.mensaje('Toca los ' + this.esperado.length + ' nodos en ' + nombre[this.recorrido] + '.', 'visita');
    }

    private tocarNodo(id: number) {
        if (this.tipo !== 'recorrido' || this.bloqueado || this.resuelto) return;
        const n = this.foto.nodos[id];
        if (!n || this.marcas[id] === 'visitado') return;
        const toca = this.esperado[this.tocados.length];
        if (n.valor === toca) {
            this.tocados.push(n.valor);
            this.marcas = { ...this.marcas, [id]: 'visitado' };
            this.pintarLista(this.tocados);
            Sonido.sonar('visita', this.tocados.length * 3);
            this.pintar();
            if (this.tocados.length === this.esperado.length) this.resultado(true, '¡Todo en orden! ' + this.esperado.join(', ') + '.');
            return;
        }
        // se equivoco, se marca el que tocaba y se acaba el reto
        this.bloqueado = true;
        const bueno = Object.values(this.foto.nodos).find(x => x.valor === toca);
        this.marcas = { ...this.marcas, [id]: 'borrar', ...(bueno ? { [bueno.id]: 'encontrado' } : {}) };
        this.pintar();
        this.pintarLista(this.esperado, this.tocados.length);
        this.resultado(false, 'Tocaba el ' + toca + ', no el ' + n.valor + '. El orden completo es ' + this.esperado.join(', ') + '.');
    }

    private pintarLista(valores: number[], hasta = valores.length) {
        this.$('reto-lista').replaceChildren(...valores.map((v, i) => {
            const li = document.createElement('li');
            li.textContent = String(v);
            if (i >= hasta) li.classList.add('faltaba');
            return li;
        }));
    }

    // reto 3, adivinar la rotacion de un avl
    private retoRotacion() {
        this.fb = true;
        // se busca un numero que al insertarlo obligue a rotar
        for (let intento = 0; intento < 60; intento++) {
            this.arbol.construir(this.aleatorios(this.tamano()), 'avl');
            const base = this.arbol.valores();
            const candidatos = [...Array(99).keys()].map(i => i + 1).filter(v => !this.arbol.tiene(v)).sort(() => Math.random() - .5);
            for (const v of candidatos) {
                const prueba = new Arbol();
                prueba.construir(base, 'avl');
                const pasos = prueba.insertar(v);
                const k = pasos.findIndex(p => p.tono === 'rota');
                if (k < 0) continue;
                this.valor = v;
                this.pasosRotacion = pasos.slice(k);
                this.casoBueno = pasos[k].caso;
                this.foto = pasos[k].foto;
                this.marcas = pasos[k].marcas;
                this.arbol = prueba;
                const nodo = Object.keys(pasos[k].marcas).map(Number).find(id => pasos[k].marcas[id] === 'desbalance');
                const x = nodo !== undefined ? this.foto.nodos[nodo] : null;
                const alt = (id: number | null) => id === null ? 0 : this.foto.nodos[id].altura;
                const fb = x ? alt(x.izq) - alt(x.der) : 0;
                this.textos('Rotación', 'Entró el ' + v + ' y el ' + (x?.valor ?? '') + ' quedó desbalanceado. ¿Qué rotación necesita?', 'Fíjate de qué lado pesa y si el hijo se carga al mismo lado o en zigzag.');
                this.ui.mensaje('El ' + (x?.valor ?? '') + ' quedó con factor de balance ' + (fb > 0 ? '+' : '') + fb + '. ¿Cómo se arregla?', 'rota');
                this.opcionesRotacion();
                return;
            }
        }
        // si no salio ninguno se pone otro tipo de reto
        this.tipo = 'donde';
        this.retoDonde();
    }

    private opcionesRotacion() {
        const opciones: [NonNullable<Paso['caso']>, string][] = [
            ['II', 'Simple a la derecha'],
            ['DD', 'Simple a la izquierda'],
            ['ID', 'Doble, izquierda y luego derecha'],
            ['DI', 'Doble, derecha y luego izquierda']
        ];
        this.$('reto-opciones').replaceChildren(...opciones.map(([caso, texto]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'opcion-reto';
            b.textContent = texto;
            b.dataset.caso = caso;
            b.addEventListener('click', () => this.elegirRotacion(caso));
            return b;
        }));
    }

    private elegirRotacion(caso: NonNullable<Paso['caso']>) {
        if (this.bloqueado || this.resuelto) return;
        this.bloqueado = true;
        const acierto = caso === this.casoBueno;
        this.$('reto-opciones').querySelectorAll<HTMLButtonElement>('button').forEach(b => {
            b.disabled = true;
            if (b.dataset.caso === this.casoBueno) b.classList.add('bien');
            else if (b.dataset.caso === caso) b.classList.add('mal');
        });
        this.reproducir(this.pasosRotacion.slice(1), 900, () => this.resultado(acierto, acierto
            ? '¡Eso! Así quedó balanceado.'
            : 'Era otra. Mira cómo se hizo la rotación correcta.'));
    }

    // pasa los pasos uno por uno, con el mensaje de cada uno
    private reproducir(pasos: Paso[], ms: number, fin: () => void) {
        let i = 0;
        const uno = () => {
            const p = pasos[i];
            if (!p) return fin();
            this.foto = p.foto;
            this.marcas = p.marcas;
            this.pintar({ flotante: p.flotante, hueco: p.hueco });
            this.ui.mensaje(p.mensaje, p.tono);
            Sonido.sonar(p.tono, p.flotante?.valor ?? this.valor);
            i++;
            setTimeout(uno, ms);
        };
        uno();
    }

    private resultado(acierto: boolean, texto: string) {
        this.resuelto = true;
        this.bloqueado = true;
        if (acierto) {
            const gana = 10 + this.racha * 2;
            this.puntos += gana;
            this.racha++;
            this.ui.mensaje(texto + ' +' + gana + ' puntos.', 'encontrado');
            Sonido.sonar('encontrado', this.puntos);
            if (this.racha % 5 === 0) Confeti.lanzar();
        } else {
            this.vidas--;
            this.racha = 0;
            this.ui.mensaje(texto, 'error');
            Sonido.sonar('error');
        }
        if (this.puntos > this.record) {
            this.record = this.puntos;
            try { localStorage.setItem('arbol-record', String(this.record)); } catch (e) {}
        }
        this.marcador();
        if (this.vidas <= 0) return this.finDelJuego();
        const sig = this.$('reto-sig') as HTMLButtonElement;
        sig.hidden = false;
        sig.focus();
    }

    private finDelJuego() {
        this.$('tarjeta-reto').hidden = true;
        this.$('fin-juego').hidden = false;
        const nuevo = this.puntos > 0 && this.puntos >= this.record;
        this.$('fin-texto').textContent = 'Hiciste ' + this.puntos + ' puntos.' + (nuevo ? ' ¡Es tu nuevo récord!' : ' Tu récord es ' + this.record + '.');
        if (nuevo) Confeti.lanzar(160);
        (this.$('otra') as HTMLButtonElement).focus();
    }
}

// confeti de hojas y semillas para festejar
const Confeti = (() => {
    const COLORES = ['#3FA66B', '#F08A24', '#3D7DD8', '#F2C14E', '#B5487A', '#2C7F50'];
    function lanzar(cantidad = 110) {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const c = document.createElement('canvas');
        c.className = 'confeti';
        c.setAttribute('aria-hidden', 'true');
        document.body.appendChild(c);
        const ctx = c.getContext('2d');
        if (!ctx) return c.remove();
        const dpr = Math.min(devicePixelRatio || 1, 2), w = innerWidth, h = innerHeight;
        c.width = w * dpr;
        c.height = h * dpr;
        ctx.scale(dpr, dpr);
        const piezas = Array.from({ length: cantidad }, (_, i) => ({
            x: w / 2 + (Math.random() - .5) * 120, y: h * .55,
            vx: (Math.random() - .5) * 16, vy: -9 - Math.random() * 10,
            g: Math.random() * 6, vg: (Math.random() - .5) * .3,
            t: 6 + Math.random() * 7, color: COLORES[i % COLORES.length], vida: 1, hoja: i % 3 === 0
        }));
        let previo = performance.now();
        const cuadro = (ahora: number) => {
            const f = Math.min((ahora - previo) / 16.7, 3);
            previo = ahora;
            ctx.clearRect(0, 0, w, h);
            let vivos = 0;
            for (const p of piezas) {
                p.vy += .35 * f; p.vx *= Math.pow(.98, f);
                p.x += p.vx * f; p.y += p.vy * f; p.g += p.vg * f;
                if (p.vy > 0) p.vida -= .01 * f;
                if (p.vida <= 0 || p.y > h + 20) continue;
                vivos++;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.g);
                ctx.globalAlpha = Math.min(1, p.vida * 2);
                ctx.fillStyle = p.color;
                if (p.hoja) {
                    // una hojita en vez de papelito
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.t, p.t * .45, 0, 0, Math.PI * 2);
                    ctx.fill();
                } else ctx.fillRect(-p.t / 2, -p.t / 2, p.t, p.t * .6);
                ctx.restore();
            }
            if (vivos) requestAnimationFrame(cuadro);
            else c.remove();
        };
        requestAnimationFrame(cuadro);
    }
    return { lanzar };
})();
