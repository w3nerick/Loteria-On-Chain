// Pantalla #diagnostico: qué versión del SDK lleva la app, qué pasó al conectar con la
// Polkadot App y una prueba de ida y vuelta por el Statement Store. Pensada para
// mirar desde el celular cuando "no entra" y poder mandar el texto sin adivinar.
import { h, toast, icon, copyText } from './dom.js';
import { diag } from '../net/diag.js';

const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : {};

export function whyLocal(t) {
  const r = t?.fallbackReason;
  if (!r) return 'fuera de la Polkadot App';
  if (/compilación de demostración/.test(r)) return 'compilación de demostración';
  if (/dentro de Polkadot App/.test(r)) return 'abriste la app fuera de la Polkadot App';
  if (/sin respuesta/.test(r)) return 'la Polkadot App no contestó';
  return 'no se pudo abrir el Statement Store';
}

function report(app, extra = []) {
  const lines = [
    `App ${BUILD.app ?? '?'} · SDK Host ${BUILD.host ?? '?'} · Statement Store ${BUILD.statementStore ?? '?'} · códec ${BUILD.codec ?? '?'}`,
    `Modo: ${app.mode === 'host' ? 'Statement Store (Host)' : `demostración — ${whyLocal(app.t)}`}`,
    ...(diag.reason ? [`Motivo: ${diag.reason}`] : []),
    'Arranque:',
    ...diag.steps.map((s) => `  ${s.ok ? '✓' : '✗'} ${s.name}${s.ms ? ` (${s.ms} ms)` : ''}${s.detail ? ` — ${s.detail}` : ''}`),
    ...extra,
  ];
  return lines.join('\n');
}

export function showDiagnostics(app) {
  app.clear();
  app.useHomeScene();
  const out = h('pre', { class: 'diag-out' });
  const extra = [];
  const paint = () => {
    out.textContent = report(app, extra);
  };
  paint();

  const testBtn = h('button', { class: 'btn btn-gold', onclick: () => runTest() }, icon('bolt', 18), 'Probar el Statement Store');
  async function runTest() {
    testBtn.disabled = true;
    extra.length = 0;
    extra.push('Prueba de ida y vuelta:');
    paint();
    const t = app.t;
    const id = Math.random().toString(36).slice(2, 8);
    let off = () => {};
    const back = new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 15000);
      off = t.subscribe((data) => {
        if (data && data.t === 'd' && data.i === id) {
          clearTimeout(timer);
          resolve(performance.now());
        }
      });
    });
    const t0 = performance.now();
    const r = await t.publish({ t: 'd', i: id }, { topic2: 'diag', channel: `d/${id}`, ttlSeconds: 30 });
    const tPub = Math.round(performance.now() - t0);
    extra.push(r.ok ? `  ✓ publicado en ${tPub} ms` : `  ✗ no se pudo publicar (${tPub} ms): ${r.error || 'error'}`);
    paint();
    if (r.ok) {
      const got = await back;
      extra.push(got ? `  ✓ recibido de vuelta a los ${Math.round(got - t0)} ms` : '  ✗ no volvió en 15 s (el Host no entrega mensajes o no te reenvía los tuyos)');
    }
    off();
    if (app.mode !== 'host') extra.push('  (modo demostración: esta prueba solo recorre el bus local del navegador)');
    paint();
    testBtn.disabled = false;
  }

  const panel = h(
    'div',
    { class: 'panel ticket' },
    h('div', { class: 'eyebrow', style: { color: 'var(--rosa)' } }, 'Diagnóstico'),
    h('h2', {}, 'Conexión con la Polkadot App'),
    h('p', { class: 'note' }, 'Sin datos personales. Si algo no entra, copia este texto y mándalo.'),
    out,
    h(
      'div',
      { class: 'row-end' },
      h('button', { class: 'btn btn-ghost', onclick: () => app.showHome() }, '‹ Volver'),
      h('button', { class: 'btn btn-ghost', onclick: () => toast(copyText(report(app, extra)) ? 'Diagnóstico copiado' : 'No se pudo copiar', 'info') }, 'Copiar'),
      testBtn,
    ),
  );
  app.ui.append(h('div', { class: 'screen' }, panel));
}
