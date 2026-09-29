// Toda llamada al Host necesita un límite de tiempo: una promesa que el Host nunca
// contesta no rechaza, se queda pendiente para siempre y la pantalla gira sin error.
export function withTimeout(promise, ms, what = 'operación') {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what}: sin respuesta en ${Math.round(ms / 1000)} s`)), ms);
  });
  return Promise.race([Promise.resolve(promise), limit]).finally(() => clearTimeout(timer));
}
