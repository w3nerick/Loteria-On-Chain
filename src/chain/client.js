// Conexión a Asset Hub para el historial.
//
// Dentro de la Polkadot App / Desktop se pide al Host (`getHostProvider`); si no
// la entrega a tiempo se usa un RPC público (misma cadena, mismos datos), con el
// permiso «Remote» pedido antes. Fuera del contenedor, RPC público directo.
import { createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws';
import { withTimeout } from '../net/timeout.js';
import { ASSET_HUB_GENESIS, PUBLIC_WS, PEOPLE_WS } from './network.js';

const HOST_CONNECT_MS = 12000;

let clientPromise = null;
let publicClient = null;
export const chainInfo = { source: null, hostProblem: null };

async function host() {
  if (__PREVIEW__) return null;
  const sdk = await import('@parity/product-sdk-host');
  return sdk.isInsideContainerSync() ? sdk : null;
}

// Permiso para hablar con los RPC públicos de respaldo (una vez por sesión)
let remoteAsked = null;
export function askRemote() {
  remoteAsked ??= (async () => {
    const sdk = await host();
    if (!sdk) return;
    const domains = [...PUBLIC_WS, ...PEOPLE_WS].map((u) => new URL(u).hostname);
    await withTimeout(sdk.requestPermission({ tag: 'Remote', value: { domains } }), 6000, 'permiso de red').catch(() => {});
  })();
  return remoteAsked;
}

function publicFor() {
  chainInfo.source = 'public';
  publicClient ??= createClient(getWsProvider(PUBLIC_WS));
  return publicClient;
}

export function getClient() {
  clientPromise ??= (async () => {
    const sdk = await host();
    if (!sdk) return publicFor();
    try {
      const p = await withTimeout(sdk.getHostProvider(ASSET_HUB_GENESIS), HOST_CONNECT_MS, 'Asset Hub desde el Host');
      if (!p) throw new Error('el Host no entregó Asset Hub');
      chainInfo.source = 'host';
      return createClient(p);
    } catch (e) {
      chainInfo.hostProblem = String(e?.message || e);
      await askRemote();
      return publicFor();
    }
  })();
  clientPromise.catch(() => (clientPromise = null));
  return clientPromise;
}

// Lectura con el cliente principal; si falla dentro del contenedor, se repite por RPC público
export async function withReadClient(fn) {
  try {
    return await fn(await getClient());
  } catch (e) {
    if (chainInfo.source === 'public') throw e;
    await askRemote();
    return fn(publicFor());
  }
}
