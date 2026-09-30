// Motor del jugador: descubre salas, registra su tabla, sigue las cartas,
// verifica localmente su figura y canta ¡Lotería!.
import { Emitter } from './emitter.js';
import { parseState, buildJoin, buildClaim, buildResult, topicFor, joinChannel, claimChannel, resultChannel, clip } from '../net/protocol.js';
import { AckWatcher } from '../net/bloom.js';
import { randomCode, randomPlayerId, isValidPlayerId, tablaFromCode, tablaHash, signedHash, commitOf, deckFromSeed, isValidCode } from './crypto.js';
import { checkWin, bestProgress } from './rules.js';
import { maskOf, resultMessage } from '../chain/record.js';

// Reintentos de registro: rápidos al principio (un mensaje perdido no debe costarte
// llegar «tarde») y cada vez más espaciados para no saturar la red.
const JOIN_RETRY_MS = [1800, 3200, 5000, 7000, 9000];
const CLAIM_RETRY_MS = 3000;
// Resultado al terminar la ronda: se reintenta hasta que el cantor lo confirma
const RESULT_RETRY_MS = [2000, 3500, 5000, 7000, 9000];
const RESULT_MAX_TRIES = 14;
const ROOM_STALE_MS = 25000;

const FUN_NAMES = ['Frijolito', 'Tamalito', 'Chapulín', 'Nopalito', 'Piloncillo', 'Cocada', 'Churro', 'Elotito', 'Mazapán', 'Chilito', 'Pozolito', 'Jicamita'];

export function funName() {
  return `${FUN_NAMES[Math.floor(Math.random() * FUN_NAMES.length)]} ${10 + Math.floor(Math.random() * 90)}`;
}

export class PlayerEngine extends Emitter {
  constructor({ transport, storage = null, storageKey = 'loteria.jugador.v1' }) {
    super();
    this.t = transport;
    this.storage = storage;
    this.storageKey = storageKey;
    this.name = funName();
    this.pid = randomPlayerId(); // quién eres en la sala, aunque cambies de tabla
    this.code = randomCode();
    this.tabla = tablaFromCode(this.code);
    this.h = tablaHash(this.code);
    this.tablaV = Date.now(); // cuándo elegiste esta tabla: la más nueva reemplaza a la anterior
    this._ack = new AckWatcher(this.h);
    this.room = null;
    this.state = null;
    this.marks = new Set();
    this.acked = false;
    this.claimed = false;
    this.verified = null;
    this.netOk = true;
    this.peakCount = 0; // la sala más grande que has visto: dimensiona la dispersión de registros
    this._joinSent = 0;
    this._joinTry = 0;
    this.rooms = new Map();
    this.prefs = { marker: 'frijol', hints: true, sound: true };
    this._joinTimer = null;
    this._claimTimer = null;
    // Resultado de la ronda: 'none' · 'sending' · 'received' · 'signing' ·
    // 'signedSending' · 'signedReceived' · 'lost' (el cantor nunca lo confirmó)
    this.result = { status: 'none', error: null };
    this._signed = null;
    this._resultAck = null;
    this._resultSent = 0;
    this._resultTimer = null;
    this.unsub = null;
  }

  async init() {
    if (this.storage) {
      const saved = await this.storage.get(this.storageKey);
      if (saved && saved.v === 1) {
        if (saved.name) this.name = clip(saved.name, 16);
        if (isValidPlayerId(saved.pid)) this.pid = saved.pid;
        if (isValidCode(saved.code)) this._setCode(saved.code);
        if (saved.prefs) this.prefs = { ...this.prefs, ...saved.prefs };
        this._savedMarks = saved.marks || null;
        this.lastRoom = saved.lastRoom || null;
      }
    }
    this.unsub = this.t.subscribe((data) => this._onMessage(data));
    this._roomsTicker = setInterval(() => this._pruneRooms(), 5000);
    this._save();
  }

  destroy() {
    clearTimeout(this._joinTimer);
    clearTimeout(this._claimTimer);
    clearTimeout(this._resultTimer);
    clearTimeout(this._resultUpd);
    clearInterval(this._roomsTicker);
    this.unsub?.();
  }

  _setCode(code) {
    this.code = code;
    this.tabla = tablaFromCode(code);
    this.h = tablaHash(code);
    this.tablaV = Math.max(Date.now(), this.tablaV + 1);
    this._ack.reset(this.h);
  }

  setName(n) {
    const v = clip(n, 16);
    if (!v) return;
    this.name = v;
    this._save();
    if (this.room && this.state && this.state.phase !== 'W') this._sendJoin(true);
  }

  setPref(k, v) {
    this.prefs[k] = v;
    this._save();
  }

  // Solo se puede cambiar de tabla antes de que empiece la ronda
  canChangeTabla() {
    return !this.state || this.state.phase === 'L' || this.state.phase === 'W';
  }

  newTabla() {
    if (!this.canChangeTabla()) return false;
    this._setCode(randomCode());
    this.marks = new Set();
    this.acked = false;
    this.claimed = false;
    this._joinSent = 0;
    this._save();
    this.emit('tabla', { code: this.code, tabla: this.tabla });
    if (this.room && this.state?.phase === 'L') this._sendJoin(true);
    return true;
  }

  // --- salas ----------------------------------------------------------------
  listRooms() {
    const now = Date.now();
    return [...this.rooms.values()]
      .filter((r) => now - r.seen < ROOM_STALE_MS)
      .sort((a, b) => b.playerCount - a.playerCount);
  }

  _pruneRooms() {
    const before = this.rooms.size;
    const now = Date.now();
    for (const [k, r] of this.rooms) if (now - r.seen > ROOM_STALE_MS * 2) this.rooms.delete(k);
    if (this.rooms.size !== before) this.emit('rooms', this.listRooms());
  }

  joinRoom(room) {
    this.room = room;
    this.state = null;
    this.acked = false;
    this.claimed = false;
    this.lastRoom = room;
    this.peakCount = 0;
    this._save();
    const known = this.rooms.get(room);
    if (known) this._onState(known.state);
    this.emit('joined', { room });
  }

  leaveRoom() {
    this.room = null;
    this.state = null;
    clearTimeout(this._joinTimer);
    clearTimeout(this._claimTimer);
    clearTimeout(this._resultTimer);
    this.emit('left', {});
  }

  // --- mensajes ---------------------------------------------------------------
  _onMessage(data) {
    if (!data || data.t !== 's') return;
    const st = parseState(data);
    if (!st) return;
    const prevRoom = this.rooms.get(st.room);
    if (prevRoom && prevRoom.state.q > st.q) return;
    this.rooms.set(st.room, {
      room: st.room,
      roomName: st.roomName,
      playerCount: st.playerCount,
      phase: st.phase,
      g: st.g,
      seen: Date.now(),
      state: st,
    });
    if (!prevRoom) this.emit('rooms', this.listRooms());
    if (st.room === this.room) this._onState(st);
  }

  _onState(st) {
    const prev = this.state;
    if (prev && st.q <= prev.q) return;
    this.state = st;
    const newGame = !prev || st.g !== prev.g;
    this.peakCount = Math.max(this.peakCount, st.playerCount);
    if (newGame) {
      this.claimed = false;
      this.acked = false;
      this.verified = null;
      this._joinSent = 0;
      this._joinTry = 0;
      this._ack.reset();
      clearTimeout(this._joinTimer);
      this._joinTimer = null;
      clearTimeout(this._claimTimer);
      clearTimeout(this._resultTimer);
      this._signed = null;
      this._resultAck = null;
      this._setResult('none');
      // ¿Recuperamos frijoles guardados de esta misma ronda?
      const sm = this._savedMarks;
      if (sm && sm.room === st.room && sm.g === st.g && sm.code === this.code) this.marks = new Set(sm.cells);
      else this.marks = new Set();
      this._savedMarks = null;
      this.emit('newGame', st);
    }
    if (!prev || prev.phase !== st.phase || newGame) this.emit('phase', st);

    // Solo se cree la confirmación tras haber enviado el registro y verse en dos estados distintos
    if (!this.acked && this._joinSent > 0 && st.phase !== 'W' && this._ack.feed(st.bloom)) {
      this.acked = true;
      clearTimeout(this._joinTimer);
      this._joinTimer = null;
      this.emit('acked', {});
    }
    if (st.phase !== 'W' && !this.acked) this._sendJoin(false);

    const prevCount = prev && !newGame ? prev.called.length : 0;
    if (st.called.length > prevCount) {
      const fresh = st.called.slice(prevCount);
      this.emit('calls', { fresh, all: st.called, catchUp: fresh.length > 1 });
    }

    if (st.phase === 'W' && (newGame || prev?.phase !== 'W')) {
      clearTimeout(this._claimTimer);
      const mine = st.winners.some((w) => w.k === this.code);
      this._verifyDeck(st);
      this.emit('win', { winners: st.winners, mine, verified: this.verified });
      // Terminó la ronda: el teléfono manda solo su resultado (sin firma) para el historial
      if (this.acked && this.result.status === 'none') this._sendResult(true);
    } else if (st.phase === 'W' && prev && prev.winners.length !== st.winners.length) {
      const mine = st.winners.some((w) => w.k === this.code);
      this.emit('win', { winners: st.winners, mine, verified: this.verified, update: true });
    }

    if (st.phase === 'W' && this._resultAck && this._resultSent > 0 && this._resultAck.feed(st.bloom)) {
      this._resultAck = null;
      clearTimeout(this._resultTimer);
      this._setResult(this._signed ? 'signedReceived' : 'received');
    }
    if (st.pending?.k === this.code && prev?.pending?.k !== this.code) this.emit('pendingMine', {});
    if (this.claimed && st.rejected.includes(this.code)) {
      this.claimed = false;
      clearTimeout(this._claimTimer);
      this.emit('rejectedMine', {});
    }
    this.emit('state', st);
  }

  // Todos los teléfonos reciben el estado casi al mismo tiempo (al abrir la ronda,
  // al entrar a la sala…). Para no publicar 100 registros en el mismo instante,
  // cada quien espera un rato al azar; la ventana crece con el tamaño de la sala.
  _spread() {
    const n = Math.max(this.state?.playerCount || 0, this.peakCount || 0);
    const win = Math.min(4500, 1200 + n * 30);
    return 80 + Math.random() * win;
  }

  _sendJoin(force = false) {
    if (!this.room || !this.state) return;
    if (this._joinTimer && !force) return;
    clearTimeout(this._joinTimer);
    // Con `force` y ya confirmada (p. ej. cambio de nombre) se manda una sola vez
    const oneShot = force && this.acked;
    const send = async () => {
      this._joinTimer = null;
      if (!this.room || !this.state || this.state.phase === 'W' || (this.acked && !oneShot)) return;
      this._joinSent += 1;
      const r = await this.t.publish(buildJoin(this.room, this.state.g, this.h, this.name, this.pid, this.tablaV), {
        topic2: topicFor(this.room),
        channel: joinChannel(this.room, this.pid),
      });
      this._net(r);
      if (!this.acked && !oneShot && !this._joinTimer) {
        const base = JOIN_RETRY_MS[Math.min(this._joinTry, JOIN_RETRY_MS.length - 1)];
        this._joinTry += 1;
        this._joinTimer = setTimeout(send, base * (0.85 + Math.random() * 0.3));
      }
    };
    if (force) this._joinTry = 0;
    this._joinTimer = setTimeout(send, force ? 50 : this._spread());
  }

  _net(r) {
    if (r.ok !== this.netOk) {
      this.netOk = r.ok;
      this.emit('net', { ok: r.ok, error: r.error });
    }
  }

  // --- juego ------------------------------------------------------------------
  calledSet() {
    return new Set(this.state?.called || []);
  }

  isCalled(card) {
    return !!this.state?.called.includes(card);
  }

  mark(cell) {
    const card = this.tabla[cell];
    if (!this.state || this.state.phase === 'L') return 'noGame';
    if (!this.isCalled(card)) return 'notCalled';
    if (this.marks.has(cell)) return 'already';
    this.marks.add(cell);
    this._save();
    // Si ya terminó la ronda y no ha firmado, se actualiza el resultado que tiene el cantor
    if (this.state.phase === 'W' && this.acked && !this._signed && this.result.status !== 'none') {
      clearTimeout(this._resultUpd);
      this._resultUpd = setTimeout(() => this._sendResult(false), 1500);
    }
    return 'ok';
  }

  // --- resultado de la ronda (historial en la cadena) -----------------------------
  _setResult(status, error = null) {
    if (this.result.status === status && this.result.error === error) return;
    this.result = { status, error };
    this.emit('result', this.result);
  }

  _resultPayload() {
    const s = this._signed;
    return s
      ? buildResult(this.room, this.state.g, this.code, s.mask, s.name, s.pubkey, s.sig)
      : buildResult(this.room, this.state.g, this.code, maskOf(this.marks), this.name);
  }

  _sendResult(spread) {
    if (!this.room || this.state?.phase !== 'W') return;
    clearTimeout(this._resultTimer);
    const g = this.state.g;
    this._resultAck = new AckWatcher(this._signed ? signedHash(this.code) : this.h);
    this._resultSent = 0;
    this._setResult(this._signed ? 'signedSending' : 'sending');
    const gen = (this._resultGen = (this._resultGen || 0) + 1); // un envío nuevo detiene al anterior
    let tries = 0;
    const send = async () => {
      this._resultTimer = null;
      if (gen !== this._resultGen || !this.room || this.state?.phase !== 'W' || this.state.g !== g || !this._resultAck) return;
      tries += 1;
      this._resultSent += 1;
      const r = await this.t.publish(this._resultPayload(), {
        topic2: topicFor(this.room),
        channel: resultChannel(this.room, this.pid),
      });
      this._net(r);
      if (gen !== this._resultGen || !this._resultAck) return;
      if (tries >= RESULT_MAX_TRIES) {
        this._setResult('lost');
        return;
      }
      const base = RESULT_RETRY_MS[Math.min(tries - 1, RESULT_RETRY_MS.length - 1)];
      this._resultTimer = setTimeout(send, base * (0.85 + Math.random() * 0.3));
    };
    this._resultTimer = setTimeout(send, spread ? this._spread() : 50);
  }

  // El cantor nunca confirmó el resultado: se vuelve a intentar
  retryResult() {
    if (this.state?.phase === 'W' && this.acked) this._sendResult(false);
  }

  // ¿Puede firmar su resultado? Solo quien jugó la ronda y mientras no empiece otra
  canSignResult() {
    return !!(this.room && this.state?.phase === 'W' && this.state.commit && this.acked && !this._signed && this.result.status !== 'signing');
  }

  resultMessage() {
    if (!this.state) return null;
    return resultMessage({ room: this.room, g: this.state.g, commit: this.state.commit, code: this.code, mask: maskOf(this.marks), name: clip(this.name, 16) });
  }

  // `sign(texto)` firma con la cuenta del jugador y devuelve { pubkey, sig } en hex
  async signResult(sign) {
    if (!this.canSignResult()) return { ok: false, reason: 'cannot' };
    const st = this.state;
    const mask = maskOf(this.marks);
    const name = clip(this.name, 16);
    const message = resultMessage({ room: this.room, g: st.g, commit: st.commit, code: this.code, mask, name });
    const before = this.result.status;
    this._setResult('signing');
    let signed;
    try {
      signed = await sign(message);
    } catch (e) {
      this._setResult(before, String(e?.message || e));
      return { ok: false, reason: 'sign', error: String(e?.message || e) };
    }
    if (this.state?.g !== st.g || this.state.phase !== 'W') {
      this._setResult('none');
      return { ok: false, reason: 'over' };
    }
    this._signed = { pubkey: signed.pubkey, sig: signed.sig, mask, name };
    this._sendResult(false);
    return { ok: true };
  }

  progress() {
    if (!this.state) return null;
    return bestProgress(this.tabla, this.calledSet(), this.state.pattern);
  }

  winningLine() {
    if (!this.state) return null;
    return checkWin(this.tabla, this.calledSet(), this.state.pattern);
  }

  claim() {
    const st = this.state;
    if (!st || st.phase !== 'P') return { ok: false, reason: st?.phase === 'W' ? 'over' : 'noGame' };
    const line = this.winningLine();
    if (!line) return { ok: false, reason: 'notYet', progress: this.progress() };
    this.claimed = true;
    let tries = 0;
    const send = async () => {
      if (!this.claimed || !this.state || this.state.phase === 'L') return;
      const s = this.state;
      const done = s.winners.some((w) => w.k === this.code) || s.pending?.k === this.code || s.rejected.includes(this.code);
      if (done && tries > 0) return;
      const r = await this.t.publish(buildClaim(this.room, s.g, this.code, this.name), {
        topic2: topicFor(this.room),
        channel: claimChannel(this.room, this.h),
      });
      this._net(r);
      tries += 1;
      if (tries < 12 && this.state?.phase === 'P') this._claimTimer = setTimeout(send, CLAIM_RETRY_MS);
    };
    clearTimeout(this._claimTimer);
    send();
    return { ok: true, line };
  }

  _verifyDeck(st) {
    if (!st.deckSeed || !st.commit) {
      this.verified = null;
      return;
    }
    const order = deckFromSeed(st.deckSeed);
    this.verified = commitOf(st.deckSeed) === st.commit && st.called.every((c, i) => order[i] === c);
    this.emit('verified', { ok: this.verified });
  }

  _save() {
    if (!this.storage) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this.storage.set(this.storageKey, {
        v: 1,
        name: this.name,
        pid: this.pid,
        code: this.code,
        prefs: this.prefs,
        lastRoom: this.lastRoom || null,
        marks: this.state ? { room: this.room, g: this.state.g, code: this.code, cells: [...this.marks] } : null,
      });
    }, 250);
  }
}
