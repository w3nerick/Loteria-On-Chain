// Que el Host no conteste nunca deje la app colgada: los límites de tiempo del arranque.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.__PREVIEW__ = false;

const { withTimeout } = await import('../src/net/timeout.js');
const { step, diag, resetDiag } = await import('../src/net/diag.js');
const { HostTransport } = await import('../src/net/hostTransport.js');
const { createTransport } = await import('../src/net/transport.js');

const never = () => new Promise(() => {});

test('withTimeout rechaza si la promesa nunca se resuelve y deja pasar las rápidas', async () => {
  await assert.rejects(withTimeout(never(), 40, 'llamada'), /llamada: sin respuesta/);
  assert.equal(await withTimeout(Promise.resolve(7), 1000, 'x'), 7);
});

test('step registra tiempos y errores sin lanzar', async () => {
  resetDiag();
  const ok = await step('rápido', async () => 42, 500);
  const bad = await step('colgado', never, 40);
  assert.deepEqual([ok.ok, ok.value, bad.ok], [true, 42, false]);
  assert.match(bad.error, /colgado: sin respuesta/);
  assert.deepEqual(diag.steps.map((s) => [s.name, s.ok]), [['rápido', true], ['colgado', false]]);
});

test('publicar con un Host que no contesta devuelve error en vez de colgarse', async () => {
  const t = new HostTransport({ publishTimeoutMs: 50 });
  t.client = { publish: never };
  const t0 = Date.now();
  const r = await t.publish({ t: 'j' }, { channel: 'x' });
  assert.equal(r.ok, false);
  assert.match(r.error, /sin respuesta/);
  assert.ok(Date.now() - t0 < 1000);
});

test('fuera de un Host, createTransport cae al modo local y dice por qué', async () => {
  const t = await createTransport();
  assert.equal(t.kind, 'local');
  assert.match(t.fallbackReason || '', /Polkadot App|contenedor/);
  assert.equal(diag.mode, 'local');
  t.destroy();
});
