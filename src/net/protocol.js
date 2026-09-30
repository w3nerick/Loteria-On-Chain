// Protocolo sobre el Statement Store de Polkadot.
// Límite duro: 512 bytes por mensaje (JSON en UTF-8). Usamos canales
// (último-escribe-gana) para que cada cuenta tenga pocos mensajes vivos:
// el SDK limita a ~1 KB en total por usuario.
import { isValidCode, isValidRoom } from '../game/crypto.js';
import { bloomEncode, bloomCapacity, bloomCharsFor, bloomValid } from './bloom.js';

export const APP_NAME = 'loteria-en-cadena/v1';
export const MAX_BYTES = 480; // margen bajo los 512 del protocolo
const CARD_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const enc = new TextEncoder();
export const byteSize = (obj) => enc.encode(JSON.stringify(obj)).length;

export const topicFor = (room) => `sala/${room}`;
export const stateChannel = (room) => `st/${room}`;
// El registro va en el canal del jugador (no de su tabla): si cambia de tabla,
// el mensaje nuevo reemplaza al anterior en vez de sumar otro.
export const joinChannel = (room, id) => `j/${room}/${id}`;
export const claimChannel = (room, h) => `c/${room}/${h}`;
export const resultChannel = (room, id) => `f/${room}/${id}`;

export function encodeCalled(ids) {
  return ids.map((i) => CARD_ALPHA[i]).join('');
}

export function decodeCalled(str) {
  if (typeof str !== 'string' || str.length > 54) return null;
  const out = [];
  const seen = new Set();
  for (const ch of str) {
    const i = CARD_ALPHA.indexOf(ch);
    if (i < 0 || i > 53 || seen.has(i)) return null;
    seen.add(i);
    out.push(i);
  }
  return out;
}

export function clip(str, max) {
  const s = String(str ?? '').replace(/[\u0000-\u001f]/g, '').trim();
  return [...s].slice(0, max).join('');
}

const isHex = (s, n) => typeof s === 'string' && s.length === n && /^[0-9a-f]+$/.test(s);

// ---------------------------------------------------------------------------
// Estado del cantor (lo publica el cantor en su canal, una sola copia viva)
export function buildState(s) {
  const m = {
    t: 's',
    r: s.room,
    nm: clip(s.roomName, 24),
    g: s.g,
    ph: s.phase,
    pt: s.pattern,
    c: encodeCalled(s.called),
    sp: s.speed,
    pa: s.paused ? 1 : 0,
    np: s.playerCount,
    q: s.q,
  };
  if (s.commit) m.h = s.commit;
  if (s.phase === 'W') {
    m.w = s.winners.slice(0, 3).map((w) => [clip(w.n, 14), w.k, w.late ? 1 : 0]);
    if (s.deckSeed) m.ds = s.deckSeed;
  }
  if (s.pending) m.pd = [clip(s.pending.n, 14), s.pending.k];
  if (s.rejected?.length) m.rj = s.rejected.slice(-3).join(',');
  // Lo prescindible se recorta primero…
  if (byteSize(m) > MAX_BYTES) delete m.rj;
  if (byteSize(m) > MAX_BYTES) m.nm = clip(m.nm, 10);
  // …y con lo que sobra se arma el filtro de confirmaciones (`s.acks`, los más
  // recientes primero): antes de la victoria, las tablas registradas; en la
  // victoria, los resultados que ya llegaron (con o sin firma).
  if (s.acks?.length) {
    const room = MAX_BYTES - byteSize(m) - 9; // `,"k":""` + margen
    const avail = room - 2; // 1 carácter para k y 1 para la sal
    if (avail >= 4) {
      const n = Math.min(s.acks.length, bloomCapacity(avail));
      const chars = Math.min(avail, bloomCharsFor(n));
      m.k = bloomEncode(s.acks.slice(0, n), chars, s.salt || 0);
    }
  }
  return m;
}

export function parseState(m) {
  if (!m || m.t !== 's' || !isValidRoom(m.r)) return null;
  if (!Number.isInteger(m.g) || m.g < 1) return null;
  if (!['L', 'P', 'W'].includes(m.ph)) return null;
  if (!['c', 'e', 'm', 'f'].includes(m.pt)) return null;
  const called = decodeCalled(m.c ?? '');
  if (!called) return null;
  const out = {
    room: m.r,
    roomName: clip(m.nm, 24) || `Sala ${m.r}`,
    g: m.g,
    phase: m.ph,
    pattern: m.pt,
    called,
    speed: Number(m.sp) || 8,
    paused: m.pa === 1,
    playerCount: Number.isInteger(m.np) ? m.np : 0,
    q: Number(m.q) || 0,
    commit: isHex(m.h, 16) ? m.h : null,
    winners: [],
    deckSeed: isHex(m.ds, 32) ? m.ds : null,
    pending: null,
    rejected: [],
    bloom: bloomValid(m.k) ? m.k : null,
  };
  if (Array.isArray(m.w)) {
    out.winners = m.w
      .filter((w) => Array.isArray(w) && isValidCode(w[1]))
      .map((w) => ({ n: clip(w[0], 14) || 'Jugador', k: w[1], late: w[2] === 1 }));
  }
  if (Array.isArray(m.pd) && isValidCode(m.pd[1])) out.pending = { n: clip(m.pd[0], 14), k: m.pd[1] };
  if (typeof m.rj === 'string') out.rejected = m.rj.split(',').filter(isValidCode);
  return out;
}

// ---------------------------------------------------------------------------
// Registro de tabla (jugador → cantor): solo el hash del código.
// `p` identifica al jugador (no a la tabla) y `v` es la hora en que eligió esa
// tabla: con los dos, el cantor sabe que una tabla nueva reemplaza a la anterior.
export function buildJoin(room, g, h, name, pid = null, v = 0) {
  const m = { t: 'j', r: room, g, h, n: clip(name, 16) };
  if (pid) {
    m.p = pid;
    m.v = v;
  }
  return m;
}

export function parseJoin(m) {
  if (!m || m.t !== 'j' || !isValidRoom(m.r) || !Number.isInteger(m.g) || !isHex(m.h, 8)) return null;
  return {
    room: m.r,
    g: m.g,
    h: m.h,
    n: clip(m.n, 16) || 'Jugador',
    p: isHex(m.p, 8) ? m.p : null,
    v: Number.isSafeInteger(m.v) && m.v > 0 ? m.v : 0,
  };
}

// Resultado al terminar la ronda (jugador → cantor): su tabla, las casillas que
// marcó y, si firmó, su llave pública y la firma sr25519 de `resultMessage`.
export function buildResult(room, g, code, mask, name, pubkey = null, sig = null) {
  const m = { t: 'f', r: room, g, k: code, m: (mask & 0xffff).toString(16).padStart(4, '0'), n: clip(name, 16) };
  if (pubkey && sig) {
    m.a = String(pubkey).replace(/^0x/, '');
    m.s = String(sig).replace(/^0x/, '');
  }
  return m;
}

export function parseResult(m) {
  if (!m || m.t !== 'f' || !isValidRoom(m.r) || !Number.isInteger(m.g) || !isValidCode(m.k) || !isHex(m.m, 4)) return null;
  const out = { room: m.r, g: m.g, k: m.k, mask: parseInt(m.m, 16), n: clip(m.n, 16) || 'Jugador', pubkey: null, sig: null };
  if (isHex(m.a, 64) && isHex(m.s, 128)) {
    out.pubkey = `0x${m.a}`;
    out.sig = `0x${m.s}`;
  }
  return out;
}

// ¡Lotería! (jugador → cantor): revela el código de su tabla
export function buildClaim(room, g, code, name) {
  return { t: 'c', r: room, g, k: code, n: clip(name, 16) };
}

export function parseClaim(m) {
  if (!m || m.t !== 'c' || !isValidRoom(m.r) || !Number.isInteger(m.g) || !isValidCode(m.k)) return null;
  return { room: m.r, g: m.g, k: m.k, n: clip(m.n, 16) || 'Jugador' };
}
