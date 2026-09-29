// Transporte real: Statement Store de Polkadot a través del Host.
// El Host firma cada mensaje con la cuenta de "allowance" del Product
// (camino patrocinado, RFC-10): no hay que pedir firmas en el teléfono.
//
// La primera vez, el Host tiene que asignar esa cuenta de publicación: en el
// celular tarda ~10 s; en Polkadot Desktop además muestra un cuadro de aprobación
// y consulta al celular emparejado. Por eso se «calienta» en segundo plano al
// abrir la app (sin trabar la pantalla) y el primer envío real tiene más margen.
import { StatementStoreClient } from '@parity/product-sdk-statement-store';
import { requestResourceAllocation } from '@parity/product-sdk-host';
import { APP_NAME } from './protocol.js';
import { diag, step } from './diag.js';
import { withTimeout } from './timeout.js';

export class HostTransport {
  // `sdkTransport` solo se usa en pruebas (transporte en memoria del SDK)
  constructor({
    sdkTransport = null,
    publishTimeoutMs = 20000,
    firstPublishTimeoutMs = 90000,
    warmUpTimeoutMs = 120000,
    requestAllocation = requestResourceAllocation,
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
    const conn = await step('Conectar el cliente del Statement Store', () => this.client.connect({ mode: 'host' }), 8000);
    if (!conn.ok) {
      try {
        this.client.destroy();
      } catch {}
      this.client = null;
      throw new Error(conn.error);
    }
    this.client.subscribe((st) => {
      const meta = { signer: st.signerHex, topics: st.topics };
      for (const cb of this.subs) {
        try {
          cb(st.data, meta);
        } catch (e) {
          console.error(e);
        }
      }
    });
    this.warmUp(); // en segundo plano: no se espera
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
    try {
      this.client?.destroy();
    } catch {}
  }
}
