// el pseudocodigo de cada operacion, cada paso del arbol apunta a una de estas lineas
const PSEUDO: Record<string, string[]> = {
    insertar: [
        'insertar(nodo, v):',
        '  si nodo está vacío: poner v aquí',
        '  si v < nodo.valor: insertar(nodo.izq, v)',
        '  si v > nodo.valor: insertar(nodo.der, v)',
        '  si v = nodo.valor: ya existe',
        '  actualizar la altura de nodo',
        '  si |fb| > 1: rotar para balancear'
    ],
    eliminar: [
        'eliminar(v):',
        '  buscar el nodo que tiene v',
        '  si es hoja: se quita y ya',
        '  si tiene un hijo: el hijo sube a su lugar',
        '  si tiene dos hijos: buscar su sucesor,',
        '    el menor de su lado derecho',
        '  copiar el sucesor arriba y quitarlo de abajo',
        '  actualizar alturas y balancear hacia arriba'
    ],
    inorden: [
        'inorden(nodo):',
        '  si nodo está vacío: regresar',
        '  inorden(nodo.izq)',
        '  visitar(nodo)',
        '  inorden(nodo.der)'
    ],
    preorden: [
        'preorden(nodo):',
        '  si nodo está vacío: regresar',
        '  visitar(nodo)',
        '  preorden(nodo.izq)',
        '  preorden(nodo.der)'
    ],
    postorden: [
        'postorden(nodo):',
        '  si nodo está vacío: regresar',
        '  postorden(nodo.izq)',
        '  postorden(nodo.der)',
        '  visitar(nodo)'
    ],
    niveles: [
        'niveles(raíz):',
        '  cola ← [raíz]',
        '  mientras la cola tenga nodos:',
        '    nodo ← sacar el primero',
        '    visitar(nodo)',
        '    meter sus hijos a la cola'
    ],
    buscar: [
        'buscar(nodo, v):',
        '  si nodo está vacío: no está',
        '  si v = nodo.valor: encontrado',
        '  si v < nodo.valor: buscar(nodo.izq, v)',
        '  si v > nodo.valor: buscar(nodo.der, v)'
    ]
};
