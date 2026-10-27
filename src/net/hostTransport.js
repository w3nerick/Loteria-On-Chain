// Transporte real: Statement Store de Polkadot a través del Host.
// El Host firma cada mensaje con la cuenta de "allowance" del Product
// (camino patrocinado, RFC-10): no hay que pedir firmas en el teléfono.
//
// La primera vez, el Host tiene que asignar esa cuenta de publicación: en el
// celular tarda ~10 s; en Polkadot Desktop además muestra un cuadro de aprobación
// y consulta al celular emparejado. Por eso se «calienta» en segundo plano al
// abrir la app (sin trabar la pantalla) y el primer envío real tiene más margen.
//
// Si el Host publica pero no entrega nada (Polkadot Desktop 0.1.4, oct 2026), se lee también
// de un nodo público de People (peopleFeed.js). Los mensajes de las dos vías se deduplican.
import { StatementStoreClient, decodeData } from '@parity/product-sdk-statement-store';
import { requestResourceAllocation } from '@parity/product-sdk-host';
import { APP_NAME } from './protocol.js';
import { diag, noteDiag, step } from './diag.js';
import { withTimeout } from './timeout.js';
import { openPeopleFeed } from './peopleFeed.js';
import { PEOPLE_WS } from '../chain/network.js';

export class HostTransport {
  // `sdkTransport` solo se usa en pruebas (transporte en memoria del SDK)
  constructor({
    sdkTransport = null,
    publishTimeoutMs = 20000,
    firstPublishTimeoutMs = 90000,
    warmUpTimeoutMs = 120000,
    requestAllocation = requestResourceAllocation,
    // Sin nada del Host este tiempo después del primer envío, se abre el respaldo de lectura
    feedAfterMs = 12000,
    openFeed = null,
  } = {}) {
    this.kind = 'host';
    this.publishTimeoutMs = publishTimeoutMs;
    this.firstPublishTimeoutMs = firstPublishTimeoutMs;
    this.warmUpTimeoutMs = warmUpTimeoutMs;
    this.requestAllocation = requestAllocation;
    this.subs = new Set();
    this.client = null;
    this.lastError = null;
    this.sdkTransport = sdkTransport;
    // 'warming' (asignando la cuenta de publicación) · 'ready' · 'problem'
    this.status = 'warming';
    this.everPublished = false;
    this._statusSubs = new Set();
    this._warm = null;
    this.feedAfterMs = feedAfterMs;
    this.openFeed = openFeed ?? (sdkTransport ? null : defaultFeed);
    this.hostDelivered = 0;
    this._feedTimer = null;
    this._closeFeed = null;
    this._seen = new Map(); // firmante|canal → expiry más nuevo entregado
  }

  onStatus(cb) {
    this._statusSubs.add(cb);
    return () => this._statusSubs.delete(cb);
  }

  _setStatus(s) {
    if (this.status === s) return;
    this.status = s;
    for (const cb of this._statusSubs) {
      try {
        cb(s);
      } catch (e) {
        console.error(e);
      }
    }
  }

  async connect() {
    this.client = new StatementStoreClient(
      this.sdkTransport ? { appName: APP_NAME, transport: this.sdkTransport } : { appName: APP_NAME },
    );
    // Desde el SDK 0.7 `connect` no devuelve un resultado: lanza si no puede abrir el transporte
    const conn = await step('Conectar el cliente del Statement Store', () => this.client.connect({ mode: 'host' }), 8000);
    if (!conn.ok) {
      try {
        this.client.destroy();
      } catch {}
      this.client = null;
      throw new Error(conn.error);
    }
    this.client.subscribe((st) => {
      this.hostDelivered += 1;
      this._deliver(st.data, st.signerHex, st.topics, st.channelHex, st.expiry);
    });
    this.warmUp(); // en segundo plano: no se espera
  }

  // Misma regla que el SDK: por firmante y canal solo pasa lo más nuevo (llega por el Host,
  // por el respaldo o por los dos)
  _deliver(data, signer, topics, channel, expiry) {
    if (expiry !== undefined) {
      const key = `${signer ?? ''}|${channel ?? JSON.stringify(data)}`;
      const prev = this._seen.get(key);
      if (prev !== undefined && expiry <= prev) return;
      this._seen.set(key, expiry);
      if (this._seen.size > 4000) this._pruneSeen();
    }
    const meta = { signer, topics };
    for (const cb of this.subs) {
      try {
        cb(data, meta);
      } catch (e) {
        console.error(e);
      }
    }
  }

  _pruneSeen() {
    const now = BigInt(Math.floor(Date.now() / 1000));
    for (const [k, exp] of this._seen) if (exp >> 32n < now) this._seen.delete(k);
  }

  // Tras el primer envío que sí entró: si el Host no entregó nada a tiempo, se abre el respaldo
  _armFeed() {
    if (this._feedTimer || this._closeFeed || !this.openFeed) return;
    this._feedTimer = setTimeout(() => {
      if (this.hostDelivered > 0 || this._closeFeed) return;
      noteDiag({ feed: { state: 'abriendo', why: `el Host no entregó mensajes en ${Math.round(this.feedAfterMs / 1000)} s` } });
      Promise.resolve(
        this.openFeed({
          onStatement: (st) => {
            let data;
            try {
              data = decodeData(st.data);
            } catch {
              return;
            }
            this._deliver(data, st.signerHex, st.topics, st.channelHex, st.expiry);
          },
          onStatus: (s) => noteDiag({ feed: { ...diag.feed, ...s } }),
        }),
      )
        .then((close) => {
          this._closeFeed = close;
        })
        .catch((e) => noteDiag({ feed: { state: 'error', error: String(e?.message || e) } }));
    }, this.feedAfterMs);
  }

  // Pide el permiso y hace un primer envío mínimo para que el Host deje lista la cuenta de
  // publicación. Las dos cosas van en paralelo: lo que importa es que el envío funcione.
  warmUp() {
    if (this._warm) return this._warm;
    this._warm = (async () => {
      const jobs = [this._firstPublish()];
      if (!this.sdkTransport) jobs.push(this._askAllowance());
      await Promise.all(jobs);
      if (this.status !== 'ready') this._setStatus('problem');
    })();
    return this._warm;
  }

  async _askAllowance() {
    const r = await step(
      'Permiso de publicación (allowance)',
      async () => {
        const res = await this.requestAllocation([{ tag: 'StatementStoreAllowance', value: undefined }]);
        // La llamada no lanza: devuelve un resultado que hay que leer
        if (!res?.ok) throw new Error(String(res?.error?.message || res?.error || 'el Host respondió con un error'));
        const outcome = res.value?.[0];
        diag.allowance = outcome || null;
        if (outcome !== 'Allocated') throw new Error(`el Host respondió «${outcome}»`);
        return outcome;
      },
      this.warmUpTimeoutMs,
    );
    if (!r.ok && !diag.allowance) diag.allowance = /sin respuesta/.test(r.error) ? 'Sin respuesta' : 'Error';
  }

  async _firstPublish() {
    const id = Math.random().toString(36).slice(2, 8);
    const r = await step(
      'Primer envío (activa la cuenta de publicación)',
      async () => {
        const res = await this.client.publish({ t: 'w', i: id }, { topic2: 'calentar', channel: `w/${id}`, ttlSeconds: 30 });
        if (!res?.ok) throw new Error(String(res?.error?.message || 'el Statement Store lo rechazó'));
      },
      this.firstPublishTimeoutMs,
    );
    if (r.ok) {
      this.everPublished = true;
      this._setStatus('ready');
      this._armFeed();
    }
  }

  async publish(data, { topic2, channel, ttlSeconds } = {}) {
    if (!this.client) return { ok: false, error: 'Sin conexión' };
    try {
      const opts = {};
      if (topic2) opts.topic2 = topic2;
      if (channel) opts.channel = channel;
      if (ttlSeconds) opts.ttlSeconds = ttlSeconds;
      // Sin límite, un Host que no contesta dejaría colgado el reintento de registro.
      // El primer envío tiene más margen: el Host asigna la cuenta de publicación.
      const limit = this.everPublished ? this.publishTimeoutMs : this.firstPublishTimeoutMs;
      const r = await withTimeout(this.client.publish(data, opts), limit, 'publicar en el Statement Store');
      if (r.ok) {
        this.lastError = null;
        this.everPublished = true;
        this._setStatus('ready');
        this._armFeed();
        return { ok: true };
      }
      this.lastError = r.error?.message || 'El Statement Store rechazó el mensaje';
      return { ok: false, error: this.lastError };
    } catch (e) {
      this.lastError = String(e?.message || e);
      return { ok: false, error: this.lastError };
    }
  }

  subscribe(cb) {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }

  destroy() {
    this.subs.clear();
    this._statusSubs.clear();
    clearTimeout(this._feedTimer);
    try {
      this._closeFeed?.();
    } catch {}
    try {
      this.client?.destroy();
    } catch {}
  }
}

// Respaldo real: pide el permiso de red para los nodos de People y abre la suscripción
async function defaultFeed({ onStatement, onStatus }) {
  const { askRemote } = await import('../chain/client.js');
  await askRemote();
  return openPeopleFeed({ appName: APP_NAME, urls: PEOPLE_WS, onStatement, onStatus });
}
