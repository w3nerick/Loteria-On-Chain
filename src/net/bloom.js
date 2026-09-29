// Filtro de Bloom compacto para confirmar registros.
// El cantor mete en el estado los hashes de las tablas que acaba de oír; cada
// teléfono pregunta «¿estoy yo?». Así una sola copia del estado (≤512 bytes)
// confirma a ~100 jugadores a la vez, en vez de a los últimos 24.
//
// Formato: 1 carácter con k (base 36) + 1 carácter de sal + N caracteres base64url
// (6 bits c/u). Los falsos positivos son posibles (un teléfono cree estar registrado
// sin estarlo; ronda el 0.3 % con 12 bits por jugador); los falsos negativos no.
// Cada publicación del cantor usa una sal distinta y el teléfono exige verse en dos
// publicaciones con sal distinta (`AckWatcher`): el falso positivo baja a ~1e-5.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const K36 = '0123456789abcdefghijklmnopqrstuvwxyz';

export const BITS_PER_ITEM = 12;

// Posiciones de un hash de 8 hex (mulberry32 sembrado con el hash)
function positions(h, k, m, salt = 0) {
  let a = (parseInt(h, 16) ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  const out = [];
  for (let i = 0; i < k; i++) {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    out.push(((t ^ (t >>> 14)) >>> 0) % m);
  }
  return out;
}

// Cuántos hashes caben con `chars` caracteres
export const bloomCapacity = (chars) => Math.floor((chars * 6) / BITS_PER_ITEM);

// Caracteres necesarios para `n` hashes (mínimo 4)
export const bloomCharsFor = (n) => Math.max(4, Math.ceil((n * BITS_PER_ITEM) / 6));

// `chars`: caracteres de bits (sin contar k ni la sal); `salt`: 0..63
export function bloomEncode(hashes, chars, salt = 0) {
  const m = chars * 6;
  const n = Math.max(1, hashes.length);
  const k = Math.max(2, Math.min(16, Math.round((m / n) * Math.LN2)));
  const sal = salt & 63;
  const bits = new Uint8Array(chars);
  for (const h of hashes) {
    for (const p of positions(h, k, m, sal)) bits[(p / 6) | 0] |= 1 << p % 6;
  }
  let s = K36[k] + B64[sal];
  for (let i = 0; i < chars; i++) s += B64[bits[i]];
  return s;
}

export function bloomSalt(str) {
  return typeof str === 'string' && str.length > 1 ? B64.indexOf(str[1]) : -1;
}

export function bloomHas(str, h) {
  if (typeof str !== 'string' || str.length < 6 || !/^[0-9a-f]{8}$/.test(h)) return false;
  const k = K36.indexOf(str[0]);
  const salt = B64.indexOf(str[1]);
  if (k < 1 || salt < 0) return false;
  const chars = str.length - 2;
  const m = chars * 6;
  for (const p of positions(h, k, m, salt)) {
    const v = B64.indexOf(str[2 + ((p / 6) | 0)]);
    if (v < 0 || !(v & (1 << p % 6))) return false;
  }
  return true;
}

export function bloomValid(str) {
  if (typeof str !== 'string' || str.length < 6 || str.length > 400) return false;
  if (K36.indexOf(str[0]) < 1) return false;
  for (let i = 1; i < str.length; i++) if (B64.indexOf(str[i]) < 0) return false;
  return true;
}

// Confirma un registro solo tras verse en dos publicaciones con sal distinta;
// si en algún estado ya no aparece, empieza de cero.
export class AckWatcher {
  constructor(hash) {
    this.hash = hash;
    this.first = -1;
  }

  reset(hash = this.hash) {
    this.hash = hash;
    this.first = -1;
  }

  feed(bloom) {
    if (!bloom) return false;
    if (!bloomHas(bloom, this.hash)) {
      this.first = -1;
      return false;
    }
    const salt = bloomSalt(bloom);
    if (this.first < 0) {
      this.first = salt;
      return false;
    }
    return salt !== this.first;
  }
}
