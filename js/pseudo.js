"use strict";
// el pseudocodigo de cada operacion, cada paso del arbol apunta a una de estas lineas
const PSEUDO = {
    insertar: [
        'insertar(nodo, v):',
        '  si nodo está vacío: poner v aquí',
        '  si v < nodo.valor: insertar(nodo.izq, v)',
        '  si v > nodo.valor: insertar(nodo.der, v)',
        '  si v = nodo.valor: ya existe',
        '  actualizar la altura de nodo',
        '  si |fb| > 1: rotar para balancear'
    ],
    buscar: [
        'buscar(nodo, v):',
        '  si nodo está vacío: no está',
        '  si v = nodo.valor: encontrado',
        '  si v < nodo.valor: buscar(nodo.izq, v)',
        '  si v > nodo.valor: buscar(nodo.der, v)'
    ]
};
