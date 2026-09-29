// Figuras para ganar y verificación de tablas (4 × 4, celdas 0..15 por filas).

export const PATTERNS = {
  c: { key: 'c', name: 'Chorro', desc: 'Una fila, columna o diagonal completa' },
  e: { key: 'e', name: 'Cuatro esquinas', desc: 'Las cuatro cartas de las esquinas' },
  m: { key: 'm', name: 'Centrito', desc: 'Las cuatro cartas del centro' },
  f: { key: 'f', name: 'Tabla llena', desc: 'Las dieciséis cartas' },
};

const ROWS = [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => r * 4 + c));
const COLS = [0, 1, 2, 3].map((c) => [0, 1, 2, 3].map((r) => r * 4 + c));
const DIAG = [
  [0, 5, 10, 15],
  [3, 6, 9, 12],
];

export function patternLines(pt) {
  switch (pt) {
    case 'e':
      return [[0, 3, 12, 15]];
    case 'm':
      return [[5, 6, 9, 10]];
    case 'f':
      return [[...Array(16).keys()]];
    case 'c':
    default:
      return [...ROWS, ...COLS, ...DIAG];
  }
}

// Celdas que ilustran la figura en el mini-diagrama (para chorro: la primera fila)
export function patternPreviewCells(pt) {
  if (pt === 'c') return [4, 5, 6, 7];
  return patternLines(pt)[0];
}

// Devuelve las celdas de la figura ganadora o null.
export function checkWin(tabla, calledSet, pt) {
  for (const line of patternLines(pt)) {
    if (line.every((cell) => calledSet.has(tabla[cell]))) return line;
  }
  return null;
}

// Mejor avance hacia la figura: { line, have, need }
export function bestProgress(tabla, calledSet, pt) {
  let best = null;
  for (const line of patternLines(pt)) {
    const have = line.filter((cell) => calledSet.has(tabla[cell])).length;
    if (!best || have > best.have) best = { line, have, need: line.length };
  }
  return best;
}
