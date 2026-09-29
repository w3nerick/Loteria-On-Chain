// Registro del arranque contra el Host de Polkadot: qué se intentó, cuánto tardó y
// por qué se cayó al modo demostración. Lo lee la pantalla #diagnostico.
import { withTimeout } from './timeout.js';

export const diag = {
  steps: [], // { name, ok, ms, detail }
  mode: 'local', // 'host' | 'local'
  reason: null, // por qué no hay Host (texto para el jugador)
};

export function resetDiag() {
  diag.steps = [];
  diag.mode = 'local';
  diag.reason = null;
}

// Ejecuta un paso con límite de tiempo; nunca lanza: devuelve { ok, value, error }.
export async function step(name, fn, ms) {
  const t0 = performance.now();
  try {
    const value = await withTimeout(Promise.resolve().then(fn), ms, name);
    diag.steps.push({ name, ok: true, ms: Math.round(performance.now() - t0), detail: '' });
    return { ok: true, value };
  } catch (e) {
    const error = String(e?.message || e);
    diag.steps.push({ name, ok: false, ms: Math.round(performance.now() - t0), detail: error });
    return { ok: false, error };
  }
}
