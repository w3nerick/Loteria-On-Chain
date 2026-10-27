// Respaldo de lectura por RPC público (peopleFeed.js) y cuándo lo abre HostTransport.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.__PREVIEW__ = false;

const { decodeStatement, topicHex, openPeopleFeed } = await import('../src/net/peopleFeed.js');
const { HostTransport } = await import('../src/net/hostTransport.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fill = (n, v) => new Uint8Array(n).fill(v);
const hexOf = (u8) => `0x${Buffer.from(u8).toString('hex')}`;
const u64le = (v) => {
  const b = new Uint8Array(8);
  for (let i = 0; i < 8; i++) b[i] = Number((v >> BigInt(8 * i)) & 0xffn);
  return b;
};
const compact = (n) => (n < 64 ? [n << 2] : [((n << 2) | 1) & 0xff, (n << 2) >> 8]);

// Statement como lo manda el nodo: prueba sr25519, expiry, canal, dos temas y datos JSON
function encodeStatement({ signer = 0x22, expiry, channel = 0x33, topic2 = 0x44, data }) {
  const json = new TextEncoder().encode(JSON.stringify(data));
  const topic1 = Buffer.from(topicHex('loteria-en-cadena/v1').slice(2), 'hex');
  return hexOf(
    Uint8Array.from([
      ...compact(6),
      0, 0, ...fill(64, 0x11), ...fill(32, signer),
      2, ...u64le(expiry),
      3, ...fill(32, channel),
      4, ...topic1,
      5, ...fill(32, topic2),
      8, ...compact(json.length), ...json,
    ]),
  );
}

test('decodeStatement saca firmante, expiry, canal, temas y datos', () => {
  const expiry = (1793136000n << 32n) | 7n;
  const st = decodeStatement(encodeStatement({ expiry, data: { t: 'j', r: 'ABCD', n: 'Prueba' } }));
  assert.equal(st.signerHex, hexOf(fill(32, 0x22)));
  assert.equal(st.expiry, expiry);
  assert.equal(st.channelHex, hexOf(fill(32, 0x33)));
  assert.deepEqual(st.topics, [topicHex('loteria-en-cadena/v1'), hexOf(fill(32, 0x44))]);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(st.data)), { t: 'j', r: 'ABCD', n: 'Prueba' });
});

test('openPeopleFeed se suscribe al tema de la app y entrega lo que llega', async () => {
  const sockets = [];
  class FakeWS {
    constructor(url) {
      this.url = url;
      this.sent = [];
      sockets.push(this);
      setTimeout(() => this.onopen?.(), 0);
    }
    send(m) {
      this.sent.push(JSON.parse(m));
    }
    close() {}
  }
  const got = [];
  const statuses = [];
  const close = openPeopleFeed({ appName: 'loteria-en-cadena/v1', urls: ['wss://uno', 'wss://dos'], onStatement: (s) => got.push(s), onStatus: (s) => statuses.push(s), WebSocketImpl: FakeWS });
  await sleep(5);
  const ws = sockets[0];
  assert.equal(ws.sent[0].method, 'statement_subscribeStatement');
  assert.deepEqual(ws.sent[0].params, [{ matchAll: [topicHex('loteria-en-cadena/v1')] }]);
  ws.onmessage({ data: JSON.stringify({ jsonrpc: '2.0', id: 1, result: 'sub' }) });
  const h = encodeStatement({ expiry: 5n << 32n, data: { t: 's', r: 'ABCD' } });
  ws.onmessage({ data: JSON.stringify({ jsonrpc: '2.0', method: 'statement_statement', params: { subscription: 'sub', result: { event: 'newStatements', data: { statements: [h, '0xzz'] } } } }) });
  assert.equal(got.length, 1, 'el statement roto se ignora');
  assert.equal(statuses[0].state, 'open');
  close();
});

// Transporte que acepta publicaciones pero nunca entrega nada (lo que hace Desktop 0.1.4)
function silentTransport() {
  return { subscribe: () => ({ unsubscribe() {} }), signAndSubmit: async () => {}, destroy() {} };
}

test('si el Host no entrega nada, HostTransport abre el respaldo y deduplica', async () => {
  let feed = null;
  const t = new HostTransport({
    sdkTransport: silentTransport(),
    feedAfterMs: 30,
    openFeed: async (f) => {
      feed = f;
      return () => {};
    },
  });
  await t.connect();
  const got = [];
  t.subscribe((data, meta) => got.push({ data, meta }));
  await sleep(80);
  assert.ok(feed, 'abrió el respaldo');
  const bytes = (d) => new TextEncoder().encode(JSON.stringify(d));
  const st = (expiry, d) => ({ signerHex: '0xaa', channelHex: '0xcc', topics: [], expiry, data: bytes(d) });
  feed.onStatement(st(10n, { t: 'j', v: 1 }));
  feed.onStatement(st(10n, { t: 'j', v: 1 })); // repetido
  feed.onStatement(st(9n, { t: 'j', v: 0 })); // más viejo
  feed.onStatement(st(11n, { t: 'j', v: 2 })); // más nuevo
  assert.deepEqual(got.map((g) => g.data.v), [1, 2]);
  assert.equal(got[0].meta.signer, '0xaa');
  t.destroy();
});

test('si el Host sí entrega, no se abre el respaldo', async () => {
  const { createFakeStatementTransport } = await import('@parity/product-sdk-statement-store/testing');
  let opened = false;
  const t = new HostTransport({
    sdkTransport: createFakeStatementTransport(),
    feedAfterMs: 60,
    openFeed: async () => {
      opened = true;
      return () => {};
    },
  });
  await t.connect();
  await sleep(150);
  assert.equal(opened, false);
  t.destroy();
});
