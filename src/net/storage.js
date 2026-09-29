// Almacenamiento local por dispositivo: el del Host dentro de la Polkadot App,
// localStorage en el navegador y, si nada funciona, memoria.
import { step } from './diag.js';

export async function createStorage(kind) {
  if (kind === 'host' && !__PREVIEW__) {
    try {
      const host = await import('@parity/product-sdk-host');
      const got = await step('Abrir el almacenamiento del Host', () => host.getHostLocalStorage(), 5000);
      const ls = got.ok ? got.value : null;
      if (ls) {
        return {
          kind: 'host',
          async get(k) {
            try {
              return await ls.readJSON(k);
            } catch {
              return null;
            }
          },
          async set(k, v) {
            try {
              await ls.writeJSON(k, v);
            } catch {}
          },
        };
      }
    } catch {}
  }
  try {
    const probe = '__loteria_probe';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return {
      kind: 'browser',
      async get(k) {
        try {
          const s = window.localStorage.getItem(k);
          return s ? JSON.parse(s) : null;
        } catch {
          return null;
        }
      },
      async set(k, v) {
        try {
          window.localStorage.setItem(k, JSON.stringify(v));
        } catch {}
      },
    };
  } catch {}
  const mem = new Map();
  return {
    kind: 'memory',
    async get(k) {
      return mem.has(k) ? mem.get(k) : null;
    },
    async set(k, v) {
      mem.set(k, v);
    },
  };
}
