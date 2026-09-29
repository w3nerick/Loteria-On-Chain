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
  const t = new HostTransport({ publishTimeoutMs: 50, firstPublishTimeoutMs: 50 });
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

// ---------------------------------------------------------------------------
// Calentamiento de la cuenta de publicación (permiso + primer envío)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mk = (opts = {}) => {
  const t = new HostTransport({ warmUpTimeoutMs: 80, firstPublishTimeoutMs: 400, publishTimeoutMs: 60, ...opts });
  t.client = { publish: async () => ({ ok: true }), destroy() {} };
  return t;
};

test('el permiso se lee del resultado: Allocated, Rejected, error y sin respuesta', async () => {
  const casos = [
    [async () => ({ ok: true, value: ['Allocated'] }), 'Allocated', true],
    [async () => ({ ok: true, value: ['Rejected'] }), 'Rejected', false],
    [async () => ({ ok: true, value: ['NotAvailable'] }), 'NotAvailable', false],
    [async () => ({ ok: false, error: { message: 'boom' } }), 'Error', false],
    [never, 'Sin respuesta', false],
  ];
  for (const [requestAllocation, esperado, ok] of casos) {
    resetDiag();
    const t = mk({ requestAllocation });
    await t._askAllowance();
    assert.equal(diag.allowance, esperado);
    assert.equal(diag.steps.at(-1).ok, ok, esperado);
  }
});

test('el calentamiento deja la cuenta «lista» cuando el primer envío llega y «con problema» si no', async () => {
  const bien = mk();
  const cambios = [];
  bien.onStatus((s) => cambios.push(s));
  assert.equal(bien.status, 'warming');
  await bien.warmUp();
  assert.equal(bien.status, 'ready');
  assert.deepEqual(cambios, ['ready']);

  const mal = mk({ firstPublishTimeoutMs: 60 });
  mal.client.publish = never;
  await mal.warmUp();
  assert.equal(mal.status, 'problem');
});

test('el primer envío tiene más margen que los siguientes', async () => {
  const t = mk({ firstPublishTimeoutMs: 500, publishTimeoutMs: 60 });
  t.client.publish = async () => {
    await sleep(150); // el Host tarda: asigna la cuenta de publicación
    return { ok: true };
  };
  const primero = await t.publish({ t: 'j' }, { channel: 'a' });
  assert.equal(primero.ok, true, 'el primero espera lo que haga falta');
  assert.equal(t.status, 'ready');
  const segundo = await t.publish({ t: 'j' }, { channel: 'a' });
  assert.equal(segundo.ok, false, 'los siguientes ya no esperan tanto');
  assert.match(segundo.error, /sin respuesta/);
});
