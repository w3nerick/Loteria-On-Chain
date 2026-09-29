// Transporte real: Statement Store de Polkadot a través del Host.
// El Host firma cada mensaje con la cuenta de "allowance" del Product
// (camino patrocinado, RFC-10): no hay que pedir firmas en el teléfono.
import { StatementStoreClient } from '@parity/product-sdk-statement-store';
import { requestResourceAllocation } from '@parity/product-sdk-host';
import { APP_NAME } from './protocol.js';

export class HostTransport {
  // `sdkTransport` solo se usa en pruebas (transporte en memoria del SDK)
  constructor({ sdkTransport = null } = {}) {
    this.kind = 'host';
    this.subs = new Set();
    this.client = null;
    this.lastError = null;
    this.sdkTransport = sdkTransport;
  }

  async connect() {
    if (!this.sdkTransport) {
      try {
        // Pre-asignación oportunista; el Host también puede hacerlo al primer envío
        await requestResourceAllocation([{ tag: 'StatementStoreAllowance' }]);
      } catch {}
    }
    this.client = new StatementStoreClient(
      this.sdkTransport ? { appName: APP_NAME, transport: this.sdkTransport } : { appName: APP_NAME },
    );
    await this.client.connect({ mode: 'host' });
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
  }

  async publish(data, { topic2, channel, ttlSeconds } = {}) {
    if (!this.client) return { ok: false, error: 'Sin conexión' };
    try {
      const opts = {};
      if (topic2) opts.topic2 = topic2;
      if (channel) opts.channel = channel;
      if (ttlSeconds) opts.ttlSeconds = ttlSeconds;
      const r = await this.client.publish(data, opts);
      if (r.ok) {
        this.lastError = null;
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
    try {
      this.client?.destroy();
    } catch {}
  }
}
