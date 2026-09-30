// Formato del historial en la cadena (LoteriaRegistry) y su verificación.
//
// El contrato solo guarda bytes. Aquí se define qué significan:
// - la CABECERA de la ronda: sala, ronda, figura, compromiso, semilla revelada,
//   cartas cantadas en orden, ganadores y nombre de la sala;
// - un REGISTRO por jugador: apodo, tabla, casillas que marcó y, si firmó, su
//   llave pública y la firma sr25519 sobre `resultMessage(...)`.
//
// Cualquiera puede verificar una ronda con estos bytes y nada más: la semilla
// contra el compromiso, que las cartas salieron en el orden de la baraja, la
// firma de cada jugador y que sus casillas marcadas sí salieron.
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';
import { verify as sr25519Verify } from '@scure/sr25519';
import { commitOf, deckFromSeed, tablaFromCode, tablaHash, isValidCode, isValidRoom } from '../game/crypto.js';
import { checkWin } from '../game/rules.js';

export const FORMAT = 1;
export const KIND = { SIGNED: 1, UNSIGNED: 2, HIDDEN: 3 };
const FLAG_LATE = 1;
const FLAG_MARKS_UNKNOWN = 2;
export const MAX_NAME_BYTES = 64;

const dec = new TextDecoder();
const isHex = (s, n) => typeof s === 'string' && s.length === n && /^[0-9a-f]+$/.test(s);
const strip0x = (s) => (typeof s === 'string' && s.startsWith('0x') ? s.slice(2) : s);

// Recorta un texto a `max` bytes UTF-8 sin partir un carácter
function nameBytes(name, max = MAX_NAME_BYTES) {
  let out = utf8ToBytes(String(name ?? ''));
  if (out.length <= max) return out;
  let s = [...String(name)];
  while (utf8ToBytes(s.join('')).length > max) s.pop();
  return utf8ToBytes(s.join(''));
}

// --- máscara de casillas -------------------------------------------------------
export const maskOf = (cells) => [...cells].reduce((m, c) => (c >= 0 && c < 16 ? m | (1 << c) : m), 0);
export const cellsOf = (mask) => [...Array(16).keys()].filter((c) => mask & (1 << c));
export const popcount = (mask) => cellsOf(mask).length;
export const maskHex = (mask) => mask.toString(16).padStart(4, '0');

// --- identidad de la ronda y mensaje que firma cada jugador -------------------------
export function roundId(room, g, commit) {
  return '0x' + bytesToHex(sha256(utf8ToBytes(`loteria-en-cadena/v1|${room}|${g}|${commit}`)));
}

// Texto legible: es lo que el jugador ve en su teléfono al firmar
export function resultMessage({ room, g, commit, code, mask, name }) {
  return [
    'Lotería en Cadena',
    `Sala ${room} · ronda ${g}`,
    `Baraja ${commit}`,
    `Tabla ${code}`,
    `Marqué ${popcount(mask)} de 16 casillas (${maskHex(mask)})`,
    `Apodo: ${name}`,
  ].join('\n');
}

// La Polkadot App puede firmar el mensaje tal cual o envuelto en <Bytes>…</Bytes>
export function verifySignature(message, sigHex, pubkeyHex) {
  try {
    const sig = hexToBytes(strip0x(sigHex));
    const pub = hexToBytes(strip0x(pubkeyHex));
    if (sig.length !== 64 || pub.length !== 32) return false;
    const msg = typeof message === 'string' ? utf8ToBytes(message) : message;
    if (sr25519Verify(msg, sig, pub)) return true;
    const wrapped = new Uint8Array([...utf8ToBytes('<Bytes>'), ...msg, ...utf8ToBytes('</Bytes>')]);
    return sr25519Verify(wrapped, sig, pub);
  } catch {
    return false;
  }
}

// --- cabecera --------------------------------------------------------------------
export function encodeHeader({ room, g, pattern, commit, seed, called, winners = [], roomName = '' }) {
  if (!isValidRoom(room)) throw new Error('sala inválida');
  if (!isHex(commit, 16) || !isHex(seed, 32)) throw new Error('compromiso o semilla inválidos');
  const nm = nameBytes(roomName, 96);
  const ws = winners.filter((w) => isValidCode(w.k)).slice(0, 3);
  const out = [FORMAT, ...utf8ToBytes(room), (g >> 8) & 0xff, g & 0xff, pattern.charCodeAt(0), ...hexToBytes(commit), ...hexToBytes(seed)];
  out.push(called.length, ...called);
  out.push(ws.length);
  for (const w of ws) out.push(...utf8ToBytes(w.k), w.late ? FLAG_LATE : 0);
  out.push(nm.length, ...nm);
  return new Uint8Array(out);
}

export function decodeHeader(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : hexToBytes(strip0x(bytes));
  let i = 0;
  const need = (n) => {
    if (i + n > b.length) throw new Error('cabecera incompleta');
  };
  need(32);
  const version = b[i++];
  if (version !== FORMAT) throw new Error(`formato ${version} desconocido`);
  const room = dec.decode(b.subarray(i, i + 4));
  i += 4;
  const g = (b[i] << 8) | b[i + 1];
  i += 2;
  const pattern = String.fromCharCode(b[i++]);
  const commit = bytesToHex(b.subarray(i, i + 8));
  i += 8;
  const seed = bytesToHex(b.subarray(i, i + 16));
  i += 16;
  need(1);
  const nc = b[i++];
  need(nc);
  const called = [...b.subarray(i, i + nc)];
  i += nc;
  need(1);
  const nw = b[i++];
  const winners = [];
  for (let k = 0; k < nw; k++) {
    need(7);
    winners.push({ k: dec.decode(b.subarray(i, i + 6)), late: !!(b[i + 6] & FLAG_LATE) });
    i += 7;
  }
  need(1);
  const nl = b[i++];
  need(nl);
  const roomName = dec.decode(b.subarray(i, i + nl));
  return { version, room, g, pattern, commit, seed, called, winners, roomName };
}

// --- registros de jugadores ------------------------------------------------------------
// { kind, late, name, pubkey?, sig?, code?, mask?, h? }
export function encodePlayer(p) {
  const out = [p.kind, (p.late ? FLAG_LATE : 0) | (p.mask == null && p.kind !== KIND.HIDDEN ? FLAG_MARKS_UNKNOWN : 0)];
  if (p.kind === KIND.SIGNED) out.push(...hexToBytes(strip0x(p.pubkey)), ...hexToBytes(strip0x(p.sig)));
  if (p.kind === KIND.SIGNED || p.kind === KIND.UNSIGNED) {
    const m = p.mask ?? 0;
    out.push(...utf8ToBytes(p.code), (m >> 8) & 0xff, m & 0xff);
  } else if (p.kind === KIND.HIDDEN) {
    out.push(...hexToBytes(p.h));
  } else throw new Error('tipo de registro desconocido');
  const nm = nameBytes(p.name);
  out.push(nm.length, ...nm);
  return new Uint8Array(out);
}

export function encodePlayers(list) {
  const parts = list.map(encodePlayer);
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

export function decodePlayers(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : hexToBytes(strip0x(bytes));
  const out = [];
  let i = 0;
  const need = (n) => {
    if (i + n > b.length) throw new Error('registro incompleto');
  };
  while (i < b.length) {
    need(2);
    const kind = b[i++];
    const flags = b[i++];
    const p = { kind, late: !!(flags & FLAG_LATE) };
    if (kind === KIND.SIGNED) {
      need(96);
      p.pubkey = '0x' + bytesToHex(b.subarray(i, i + 32));
      p.sig = '0x' + bytesToHex(b.subarray(i + 32, i + 96));
      i += 96;
    }
    if (kind === KIND.SIGNED || kind === KIND.UNSIGNED) {
      need(8);
      p.code = dec.decode(b.subarray(i, i + 6));
      p.mask = flags & FLAG_MARKS_UNKNOWN ? null : (b[i + 6] << 8) | b[i + 7];
      i += 8;
    } else if (kind === KIND.HIDDEN) {
      need(4);
      p.h = bytesToHex(b.subarray(i, i + 4));
      i += 4;
    } else throw new Error(`tipo de registro ${kind} desconocido`);
    need(1);
    const nl = b[i++];
    need(nl);
    p.name = dec.decode(b.subarray(i, i + nl));
    i += nl;
    out.push(p);
  }
  return out;
}

// Reparte los registros en partes que quepan en una transacción
export function splitPlayers(list, maxBytes = 12000) {
  const parts = [];
  let cur = [];
  let size = 0;
  for (const p of list) {
    const n = encodePlayer(p).length;
    if (cur.length && size + n > maxBytes) {
      parts.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(p);
    size += n;
  }
  if (cur.length) parts.push(cur);
  return parts.map((ps) => ({ players: ps, bytes: encodePlayers(ps), count: ps.length }));
}

// --- verificación ----------------------------------------------------------------------
// Devuelve qué se pudo comprobar de la ronda y de cada jugador
export function verifyRound(header, players) {
  const called = new Set(header.called);
  const order = deckFromSeed(header.seed);
  const deck = {
    commitOk: commitOf(header.seed) === header.commit,
    orderOk: header.called.every((c, i) => order[i] === c),
  };
  deck.ok = deck.commitOk && deck.orderOk;
  const winnerCodes = new Set(header.winners.map((w) => w.k));
  const rows = players.map((p) => {
    const r = { ...p, winner: false, sigOk: null, marksOk: null, marked: null, came: null, full: false };
    if (p.kind === KIND.HIDDEN) return r;
    if (!isValidCode(p.code)) return { ...r, invalid: true };
    const tabla = tablaFromCode(p.code);
    r.h = tablaHash(p.code);
    r.came = tabla.filter((c) => called.has(c)).length;
    r.full = !!checkWin(tabla, called, header.pattern);
    r.winner = winnerCodes.has(p.code);
    if (p.mask != null) {
      r.marked = popcount(p.mask);
      r.marksOk = cellsOf(p.mask).every((cell) => called.has(tabla[cell]));
    }
    if (p.kind === KIND.SIGNED) {
      const msg = resultMessage({ room: header.room, g: header.g, commit: header.commit, code: p.code, mask: p.mask ?? 0, name: p.name });
      r.sigOk = verifySignature(msg, p.sig, p.pubkey);
    }
    return r;
  });
  return { deck, players: rows };
}
