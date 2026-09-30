// Aleatoriedad verificable y derivaciones deterministas.
// - La baraja del cantor se deriva de una semilla secreta; al empezar se publica
//   solo su compromiso (hash) y al terminar se revela la semilla.
// - Cada tabla se deriva de un código corto (6 caracteres). El jugador registra
//   el hash del código antes de empezar y lo revela al cantar ¡Lotería!.
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

export const CODE_ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 símbolos, sin 0/O/1/I
export const ROOM_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 24 letras

export function sha256hex(str) {
  return bytesToHex(sha256(utf8ToBytes(str)));
}

function randBytes(n) {
  const out = new Uint8Array(n);
  try {
    crypto.getRandomValues(out);
  } catch {
    for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

function randomFrom(alpha, len) {
  const bytes = randBytes(len * 2);
  let s = '';
  for (let i = 0; i < len; i++) {
    // alpha.length divide 256 para 32; para 24 usamos rechazo simple
    let v = bytes[i * 2];
    const lim = 256 - (256 % alpha.length);
    if (v >= lim) v = bytes[i * 2 + 1] % alpha.length;
    s += alpha[v % alpha.length];
  }
  return s;
}

export const randomCode = () => randomFrom(CODE_ALPHA, 6);
export const randomRoom = () => randomFrom(ROOM_ALPHA, 4);
export const randomSeed = () => bytesToHex(randBytes(16));
export const randomPlayerId = () => bytesToHex(randBytes(4));
export const isValidPlayerId = (s) => typeof s === 'string' && /^[0-9a-f]{8}$/.test(s);

export function isValidCode(code) {
  return typeof code === 'string' && code.length === 6 && [...code].every((ch) => CODE_ALPHA.includes(ch));
}

export function isValidRoom(room) {
  return typeof room === 'string' && room.length === 4 && [...room].every((ch) => ROOM_ALPHA.includes(ch));
}

// El alfabeto no tiene O/0/I/1: si alguien los teclea, los tomamos por Q y L.
export function normalizeCode(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/[O0]/g, 'Q')
    .replace(/[I1]/g, 'L')
    .replace(/[^2-9A-Z]/g, '')
    .slice(0, 6);
}

// Flujo pseudoaleatorio determinista basado en SHA-256 (modo contador)
function hashStream(label, seed) {
  let block = 0;
  let words = [];
  return () => {
    if (words.length === 0) {
      const h = sha256(utf8ToBytes(`${label}:${seed}:${block++}`));
      for (let i = 0; i < 32; i += 4) words.push(((h[i] << 24) | (h[i + 1] << 16) | (h[i + 2] << 8) | h[i + 3]) >>> 0);
    }
    return words.shift();
  };
}

function randInt(next, n) {
  const lim = Math.floor(0x100000000 / n) * n;
  let v;
  do v = next();
  while (v >= lim);
  return v % n;
}

export function deriveOrder(label, seed, n) {
  const next = hashStream(label, seed);
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = randInt(next, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const deckFromSeed = (seed) => deriveOrder('baraja', seed, 54);
export const tablaFromCode = (code) => deriveOrder('tabla', code, 54).slice(0, 16);
export const commitOf = (seed) => sha256hex(`compromiso:${seed}`).slice(0, 16);
export const tablaHash = (code) => sha256hex(`registro:${code}`).slice(0, 8);
