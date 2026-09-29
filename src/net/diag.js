// Registro del arranque contra el Host de Polkadot: qué se intentó, cuánto tardó y
// por qué se cayó al modo demostración. Lo lee la pantalla #diagnostico.
import { withTimeout } from './timeout.js';

export const diag = {
  steps: [], // { name, state: 'pending' | 'ok' | 'fail', ok: null | true | false, ms, detail }
  mode: 'local', // 'host' | 'local'
  reason: null, // por qué no hay Host (texto para el jugador)
  allowance: null, // 'Allocated' | 'Rejected' | 'NotAvailable' | 'Sin respuesta' | 'Error'
  listeners: new Set(),
};

const notify = () => {
  for (const fn of diag.listeners) {
    try {
      fn();
    } catch {}
  }
};

// Avisa cada vez que un paso empieza o termina (la pantalla #diagnostico se repinta sola)
export function onDiag(fn) {
  diag.listeners.add(fn);
  return () => diag.listeners.delete(fn);
}

export function resetDiag() {
  diag.steps = [];
  diag.mode = 'local';
  diag.reason = null;
  diag.allowance = null;
  notify();
}

// Ejecuta un paso con límite de tiempo; nunca lanza: devuelve { ok, value, error }.
// El paso aparece como «pendiente» desde que empieza, no solo cuando termina.
export async function step(name, fn, ms) {
  const entry = { name, state: 'pending', ok: null, ms: 0, detail: '', t0: performance.now() };
  diag.steps.push(entry);
  notify();
  try {
    const value = await withTimeout(Promise.resolve().then(fn), ms, name);
    entry.state = 'ok';
    entry.ok = true;
    entry.ms = Math.round(performance.now() - entry.t0);
    notify();
    return { ok: true, value };
  } catch (e) {
    const error = String(e?.message || e);
    entry.state = 'fail';
    entry.ok = false;
    entry.detail = error;
    entry.ms = Math.round(performance.now() - entry.t0);
    notify();
    return { ok: false, error };
  }
}
