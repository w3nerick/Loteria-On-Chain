// Pantalla #diagnostico: qué versión del SDK lleva la app, qué pasó al conectar con la
// Polkadot App y una prueba de ida y vuelta por el Statement Store. Pensada para
// mirar desde el celular cuando "no entra" y poder mandar el texto sin adivinar.
import { h, toast, icon, copyText } from './dom.js';
import { diag, onDiag } from '../net/diag.js';

const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : {};

export function whyLocal(t) {
  const r = t?.fallbackReason;
  if (!r) return 'fuera de la Polkadot App';
  if (/compilación de demostración/.test(r)) return 'compilación de demostración';
  if (/dentro de Polkadot App/.test(r)) return 'abriste la app fuera de la Polkadot App';
  if (/sin respuesta/.test(r)) return 'la Polkadot App no contestó';
  return 'no se pudo abrir el Statement Store';
}

const STATUS = { warming: 'activando…', ready: 'lista', problem: 'con problema' };

function stepLine(s) {
  if (s.state === 'pending') return `  … ${s.name} — esperando ${Math.round((performance.now() - s.t0) / 1000)} s`;
  return `  ${s.ok ? '✓' : '✗'} ${s.name}${s.ms ? ` (${s.ms} ms)` : ''}${s.detail ? ` — ${s.detail}` : ''}`;
}

function report(app, extra = []) {
  const host = app.mode === 'host';
  const waiting = diag.steps.some((s) => s.state === 'pending' && performance.now() - s.t0 > 4000);
  const lines = [
    `App ${BUILD.app ?? '?'} · SDK Host ${BUILD.host ?? '?'} · Statement Store ${BUILD.statementStore ?? '?'} · códec ${BUILD.codec ?? '?'}`,
    `Modo: ${host ? 'Statement Store (Host)' : `demostración — ${whyLocal(app.t)}`}`,
    ...(host ? [`Cuenta de publicación: ${STATUS[app.t.status] ?? '?'} · permiso: ${diag.allowance ?? 'pendiente'}`] : []),
    ...(diag.reason ? [`Motivo: ${diag.reason}`] : []),
    'Arranque:',
    ...diag.steps.map(stepLine),
    ...(host && waiting
      ? [
          '',
          'El Host tarda en preparar tu cuenta de publicación.',
          '  · En el celular la primera vez tarda ~10 s.',
          '  · En Polkadot Desktop aparece un cuadro pidiendo permiso: apruébalo',
          '    (puede pedir confirmar también en el celular emparejado).',
        ]
      : []),
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
  // Se repinta sola mientras hay pasos pendientes y cuando el estado de la cuenta cambia
  const offDiag = onDiag(paint);
  const offStatus = app.t.onStatus?.(paint);
  const tick = setInterval(paint, 1000);
  app._offDiag = () => {
    offDiag();
    offStatus?.();
    clearInterval(tick);
  };

  const testBtn = h('button', { class: 'btn btn-gold', onclick: () => runTest() }, icon('bolt', 18), 'Probar el Statement Store');
  async function runTest() {
    testBtn.disabled = true;
    extra.length = 0;
    extra.push('Prueba de ida y vuelta:', '  … enviando (la primera vez puede tardar más de 10 s)');
    paint();
    const t = app.t;
    const id = Math.random().toString(36).slice(2, 8);
    let off = () => {};
    let gotAt = null;
    off = t.subscribe((data) => {
      if (data && data.t === 'd' && data.i === id && gotAt === null) gotAt = performance.now();
    });
    const t0 = performance.now();
    const r = await t.publish({ t: 'd', i: id }, { topic2: 'diag', channel: `d/${id}`, ttlSeconds: 30 });
    const tPub = Math.round(performance.now() - t0);
    extra.length = 1;
    extra.push(r.ok ? `  ✓ publicado en ${tPub} ms` : `  ✗ no se pudo publicar (${tPub} ms): ${r.error || 'error'}`);
    paint();
    if (r.ok) {
      // El mensaje suele volver casi al instante; se le da hasta 15 s
      for (let i = 0; i < 150 && gotAt === null; i++) await new Promise((res) => setTimeout(res, 100));
      extra.push(gotAt !== null ? `  ✓ recibido de vuelta a los ${Math.round(gotAt - t0)} ms` : '  ✗ no volvió en 15 s (el Host no entrega mensajes o no te reenvía los tuyos)');
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
