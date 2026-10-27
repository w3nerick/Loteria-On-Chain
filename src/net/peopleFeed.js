// Respaldo de lectura del Statement Store: suscripción directa a un nodo público de People.
//
// Polkadot Desktop 0.1.4 (medido el 27 oct 2026) publica por el Host, pero su suscripción no
// entrega ningún mensaje, ni los propios: el cantor no oye a los jugadores. Los mensajes son
// públicos y los nodos de People exponen `statement_subscribeStatement`, así que se leen de
// ahí. Publicar sigue yendo por el Host; HostTransport decide cuándo abrir este respaldo.
import { blake2b } from '@noble/hashes/blake2b';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';

const hex = (u8) => `0x${bytesToHex(u8)}`;

// Tema = blake2b-256 del nombre, igual que createTopic del SDK
export const topicHex = (name) => hex(blake2b(utf8ToBytes(name), { dkLen: 32 }));

function compact(b, i) {
  const mode = b[i] & 3;
  if (mode === 0) return [b[i] >> 2, i + 1];
  if (mode === 1) return [(b[i] | (b[i + 1] << 8)) >> 2, i + 2];
  if (mode === 2) return [(b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 2, i + 4];
  throw new Error('longitud demasiado grande');
}

const u64 = (b, i) => {
  let v = 0n;
  for (let k = 7; k >= 0; k--) v = (v << 8n) | BigInt(b[i + k]);
  return v;
};

// Statement en SCALE: Vec<campo>. 0 prueba · 1 llave de descifrado · 2 expiry u64 · 3 canal ·
// 4–7 temas · 8 datos. La prueba sr25519/ed25519 es firma (64) + firmante (32).
export function decodeStatement(hexStr) {
  const b = hexToBytes(hexStr.replace(/^0x/, ''));
  let [n, i] = compact(b, 0);
  const st = { signerHex: undefined, channelHex: undefined, topics: [], expiry: undefined, data: undefined };
  for (let k = 0; k < n; k++) {
    const tag = b[i++];
    if (tag === 0) {
      const kind = b[i++];
      if (kind === 0 || kind === 1) {
        st.signerHex = hex(b.subarray(i + 64, i + 96));
        i += 96;
      } else if (kind === 2) {
        st.signerHex = hex(b.subarray(i + 65, i + 98));
        i += 98;
      } else if (kind === 3) {
        i += 72; // prueba on-chain: quién (32) + bloque (32) + evento (8)
      } else throw new Error(`prueba desconocida ${kind}`);
    } else if (tag === 1) i += 32;
    else if (tag === 2) {
      st.expiry = u64(b, i);
      i += 8;
    } else if (tag === 3) {
      st.channelHex = hex(b.subarray(i, i + 32));
      i += 32;
    } else if (tag >= 4 && tag <= 7) {
      st.topics.push(hex(b.subarray(i, i + 32)));
      i += 32;
    } else if (tag === 8) {
      let len;
      [len, i] = compact(b, i);
      st.data = b.subarray(i, i + len);
      i += len;
    } else throw new Error(`campo desconocido ${tag}`);
  }
  return st;
}

// Abre la suscripción y se reconecta rotando nodos. Devuelve la función para cerrarla.
export function openPeopleFeed({ appName, urls, onStatement, onStatus = () => {}, WebSocketImpl = globalThis.WebSocket }) {
  const topic = topicHex(appName);
  let ws = null;
  let closed = false;
  let next = 0;
  let retry = null;

  const schedule = () => {
    clearTimeout(retry);
    retry = setTimeout(connect, 2000);
  };

  function connect() {
    if (closed) return;
    const url = urls[next++ % urls.length];
    try {
      ws = new WebSocketImpl(url);
    } catch (e) {
      onStatus({ state: 'error', url, error: String(e?.message || e) });
      schedule();
      return;
    }
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'statement_subscribeStatement', params: [{ matchAll: [topic] }] }));
    };
    ws.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.id === 1) {
        if (m.error) {
          onStatus({ state: 'error', url, error: m.error.message });
          ws.close();
        } else onStatus({ state: 'open', url });
        return;
      }
      const r = m.params?.result;
      if (r?.event !== 'newStatements') return;
      for (const h of r.data?.statements ?? []) {
        try {
          onStatement(decodeStatement(h));
        } catch {}
      }
    };
    ws.onclose = () => {
      if (closed) return;
      onStatus({ state: 'closed', url });
      schedule();
    };
    ws.onerror = () => {}; // después llega onclose y se reintenta
  }

  connect();
  return () => {
    closed = true;
    clearTimeout(retry);
    try {
      ws?.close();
    } catch {}
  };
}
