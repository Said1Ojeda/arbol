// tipos que comparten el modelo, el dibujo y la pantalla

type ModoArbol = 'abb' | 'avl';
type Recorrido = 'inorden' | 'preorden' | 'postorden' | 'niveles';
type Lado = 'izq' | 'der';

// como se ve cada nodo en un paso, compara es el que se esta revisando
type Marca = 'compara' | 'camino' | 'encontrado' | 'nuevo' | 'borrar' | 'visitado' | 'desbalance' | 'sucesor' | 'rota';

// sirve para el color del mensaje y despues para el sonido
type Tono = 'info' | 'compara' | 'nuevo' | 'encontrado' | 'borrar' | 'rota' | 'visita' | 'error';

interface NodoFoto {
    id: number;
    valor: number;
    izq: number | null;
    der: number | null;
    altura: number;
}

// copia del arbol en un momento, asi se puede ir para atras y para adelante
interface Foto {
    raiz: number | null;
    nodos: Record<number, NodoFoto>;
}

interface Paso {
    foto: Foto;
    mensaje: string;
    codigo: string;
    linea: number;
    tono: Tono;
    marcas: Record<number, Marca>;
    // el numero que va bajando junto al nodo mientras se busca su lugar
    flotante?: { valor: number; en: number | null };
    // el lugar vacio donde va a caer el nuevo
    hueco?: { padre: number; lado: Lado };
    lista?: number[];
    cola?: number[];
    // los pasos de solo bajar duran menos, si no los recorridos se hacen eternos
    rapido?: boolean;
    // en avl dice cual de los cuatro casos de rotacion fue, lo usan los retos
    caso?: 'II' | 'DD' | 'ID' | 'DI';
}

interface Resumen {
    nodos: number;
    altura: number;
    hojas: number;
    minimo: number | null;
    maximo: number | null;
    balanceado: boolean;
}
