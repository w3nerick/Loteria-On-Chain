// Transportes: Statement Store (dentro de la Polkadot App / Desktop / Web)
// o un bus local (vista previa y práctica) que imita su semántica:
// canales último-escribe-gana, caducidad, repetición del estado vivo al
// suscribirse y el límite de 512 bytes.
import { APP_NAME } from './protocol.js';

const MAX_WIRE = 512;
const enc = new TextEncoder();

// ---------------------------------------------------------------------------
// Bus local
const pageTransports = new Set();
const liveStore = new Map(); // sender|channel → envelope
let bc = null;
let bcReady = false;

function ingest(env, relay) {
  if (!env || typeof env !== 'object' || env.exp < Date.now()) return;
  if (env.channel) {
    const key = `${env.sender}|${env.channel}`;
    const prev = liveStore.get(key);
    if (prev && prev.seq >= env.seq) return;
    liveStore.set(key, env);
  }
  for (const t of pageTransports) t._deliver(env);
  if (relay && bc) {
    try {
      bc.postMessage(env);
    } catch {}
  }
}

function ensureBroadcast() {
  if (bcReady) return;
  bcReady = true;
  try {
    bc = new BroadcastChannel(APP_NAME);
    bc.onmessage = (e) => {
      const d = e.data;
      if (d && d.__sync) {
        // Otra pestaña acaba de abrir: le reenviamos lo que sigue vivo
        const now = Date.now();
        for (const env of liveStore.values()) if (env.exp > now) bc.postMessage(env);
        return;
      }
      ingest(d, false);
    };
    bc.postMessage({ __sync: true });
  } catch {
    bc = null;
  }
}

export function closeLocalBus() {
  try {
    bc?.close();
  } catch {}
  bc = null;
  bcReady = false;
  liveStore.clear();
  pageTransports.clear();
}

function pruneStore() {
  const now = Date.now();
  for (const [k, env] of liveStore) if (env.exp < now) liveStore.delete(k);
}

let senderCounter = 0;

export class LocalTransport {
  constructor({ latency = [20, 160], drop = 0, name = '' } = {}) {
    this.kind = 'local';
    this.sender = `${name || 'p'}-${Date.now().toString(36)}-${(senderCounter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    this.latency = latency;
    this.drop = drop;
    this.subs = new Set();
    this.seq = 0;
    this.seen = new Map();
  }

  async connect() {
    ensureBroadcast();
    pageTransports.add(this);
  }

  _deliver(env) {
    // dedup como el SDK: por canal y remitente, solo lo más nuevo
    const key = env.channel ? `${env.sender}|${env.channel}` : env.id;
    const prev = this.seen.get(key);
    if (prev !== undefined && prev >= env.seq) return;
    this.seen.set(key, env.seq);
    if (this.seen.size > 4000) this.seen.clear();
    for (const cb of this.subs) {
      try {
        cb(env.data, { sender: env.sender, topic2: env.topic2 });
      } catch (e) {
        console.error(e);
      }
    }
  }

  async publish(data, { topic2, channel, ttlSeconds = 30 } = {}) {
    const bytes = enc.encode(JSON.stringify(data)).length;
    if (bytes > MAX_WIRE) return { ok: false, error: `Mensaje de ${bytes} bytes (máximo ${MAX_WIRE})` };
    const env = {
      id: `${this.sender}:${++this.seq}`,
      sender: this.sender,
      seq: Date.now() * 1000 + (this.seq % 1000),
      channel: channel || null,
      topic2: topic2 || null,
      exp: Date.now() + ttlSeconds * 1000,
      data,
    };
    if (this.drop && Math.random() < this.drop) return { ok: true };
    const [a, b] = this.latency;
    setTimeout(() => ingest(env, true), a + Math.random() * (b - a));
    return { ok: true };
  }

  subscribe(cb) {
    this.subs.add(cb);
    // Repetición del estado vivo (como la suscripción del Host)
    setTimeout(() => {
      pruneStore();
      for (const env of liveStore.values()) {
        const key = env.channel ? `${env.sender}|${env.channel}` : env.id;
        if (this.seen.get(key) === env.seq) continue;
        this.seen.set(key, env.seq);
        try {
          cb(env.data, { sender: env.sender, topic2: env.topic2 });
        } catch (e) {
          console.error(e);
        }
      }
    }, 0);
    return () => this.subs.delete(cb);
  }

  destroy() {
    pageTransports.delete(this);
    this.subs.clear();
  }
}

// ---------------------------------------------------------------------------
// Detección del Host y creación del transporte

export async function detectHost(timeoutMs = 10000) {
  if (__PREVIEW__) return false;
  try {
    const host = await import('@parity/product-sdk-host');
    // El Host puede inyectar su puerto un instante después de cargar
    let inside = host.isInsideContainerSync();
    for (let i = 0; !inside && i < 10; i++) {
      await new Promise((r) => setTimeout(r, 150));
      inside = host.isInsideContainerSync();
    }
    if (!inside) return false;
    return await new Promise((resolve) => {
      let settled = false;
      let unsub = null;
      const done = (v) => {
        if (settled) return;
        settled = true;
        resolve(v);
        setTimeout(() => {
          try {
            unsub && unsub();
          } catch {}
        }, 0);
      };
      unsub = host.subscribeConnectionStatus((s) => {
        if (s === 'connected') done(true);
      });
      setTimeout(() => done(false), timeoutMs);
    });
  } catch {
    return false;
  }
}

export async function createTransport({ forceLocal = false } = {}) {
  if (!forceLocal && !__PREVIEW__ && (await detectHost())) {
    try {
      const { HostTransport } = await import('./hostTransport.js');
      const t = new HostTransport();
      await t.connect();
      return t;
    } catch (e) {
      console.warn('No se pudo abrir el Statement Store, uso modo local', e);
    }
  }
  const t = new LocalTransport();
  await t.connect();
  return t;
}

export function localTransportFactory(opts) {
  return async (name) => {
    const t = new LocalTransport({ ...opts, name });
    await t.connect();
    return t;
  };
}
