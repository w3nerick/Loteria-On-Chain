// Motor del cantor: reparte la baraja comprometida, registra tablas,
// verifica cada ¡Lotería! y publica el estado en el Statement Store.
import { Emitter } from './emitter.js';
import { buildState, parseJoin, parseClaim, parseResult, topicFor, stateChannel, clip } from '../net/protocol.js';
import { randomRoom, randomSeed, deckFromSeed, commitOf, tablaFromCode, tablaHash, signedHash, isValidCode } from './crypto.js';
import { checkWin } from './rules.js';
import { KIND, roundId, resultMessage, verifySignature, cellsOf } from '../chain/record.js';

const HEARTBEAT_MS = 5000;
const START_DELAY_MS = 3800;
const START_PER_PLAYER_MS = 40; // más sala = más margen para registrar antes de la primera carta
const START_EXTRA_MAX_MS = 5000;
const GATE_FULL_RATIO = 0.97; // la primera carta espera a que vuelva el 97 % de la ronda anterior…
const GATE_QUIET_RATIO = 0.85; // …o el 85 % si ya nadie más llega desde hace GATE_QUIET_MS (quien se fue no vuelve)…
const GATE_QUIET_MS = 3000;
const GATE_MAX_MS = 8000; // …y nunca más de esto
const COWIN_WINDOW_MS = 6000;
const ACK_RECENT_MS = 30000; // solo se confirma a quien se oyó hace poco; quien ya se enteró no reintenta

export class CantorEngine extends Emitter {
  constructor({ transport, storage = null, storageKey = 'loteria.cantor.v1', startDelay = START_DELAY_MS, perPlayerDelay = START_PER_PLAYER_MS }) {
    super();
    this.t = transport;
    this.storage = storage;
    this.storageKey = storageKey;
    this.startDelay = startDelay;
    this.perPlayerDelay = perPlayerDelay;
    this.expected = 0; // tablas de la ronda anterior: cuántas esperamos que vuelvan
    this._lastNewJoin = 0;
    this._salt = 0;
    this.deck = null;
    this.s = null;
    this._timer = null;
    this._hb = null;
    this._pubTimer = null;
    this._saveTimer = null;
    this.netOk = true;
    this.unsub = null;
  }

  // --- ciclo de vida -------------------------------------------------------
  async loadSaved() {
    if (!this.storage) return null;
    const saved = await this.storage.get(this.storageKey);
    if (!saved || saved.v !== 1 || !saved.room) return null;
    return saved;
  }

  createRoom(roomName = 'Noche de Lotería', opts = {}) {
    this.s = {
      room: opts.room || randomRoom(),
      roomName: clip(roomName, 24) || 'Noche de Lotería',
      g: 1,
      phase: 'L',
      pattern: opts.pattern || 'c',
      speed: opts.speed || 8,
      paused: false,
      deckSeed: null,
      commit: null,
      called: [],
      registered: new Map(),
      owners: new Map(),
      results: new Map(),
      sealed: null,
      winners: [],
      rejected: [],
      pending: null,
      wonAt: 0,
      q: 0,
    };
    this._start();
    this.emit('lobby', this.snapshot());
    this.publishState();
    this._save();
    return this.s.room;
  }

  // Retoma una sala guardada en este dispositivo (recarga de la pantalla, cierre accidental…)
  restore(saved) {
    this.s = {
      room: saved.room,
      roomName: saved.roomName,
      g: saved.g,
      phase: saved.phase,
      pattern: saved.pattern,
      speed: saved.speed,
      paused: saved.phase === 'P',
      deckSeed: saved.deckSeed,
      commit: saved.deckSeed ? commitOf(saved.deckSeed) : null,
      called: saved.called || [],
      registered: new Map(saved.registered || []),
      owners: new Map(),
      results: new Map(saved.results || []),
      sealed: saved.sealed || null,
      winners: saved.winners || [],
      rejected: saved.rejected || [],
      pending: null,
      wonAt: 0,
      q: 0,
    };
    for (const [h, v] of this.s.registered) this.s.owners.set(v.id || h, h);
    this.deck = this.s.deckSeed ? deckFromSeed(this.s.deckSeed) : null;
    this.expected = this.s.registered.size;
    this._start();
    this.emit('resumed', this.snapshot());
    this.publishState();
  }

  _start() {
    if (!this.unsub) this.unsub = this.t.subscribe((data, meta) => this._onMessage(data, meta));
    clearInterval(this._hb);
    this._hb = setInterval(() => this.publishState(), HEARTBEAT_MS);
  }

  destroy() {
    clearInterval(this._hb);
    clearTimeout(this._timer);
    clearTimeout(this._pubTimer);
    this.unsub?.();
    this.unsub = null;
  }

  snapshot() {
    const s = this.s;
    return {
      room: s.room,
      roomName: s.roomName,
      g: s.g,
      phase: s.phase,
      pattern: s.pattern,
      speed: s.speed,
      paused: s.paused,
      commit: s.commit,
      deckSeed: s.phase === 'W' ? s.deckSeed : null,
      called: [...s.called],
      players: this.players(),
      winners: [...s.winners],
      pending: s.pending ? { ...s.pending } : null,
    };
  }

  players() {
    return [...this.s.registered.entries()].map(([h, v]) => ({ id: v.id || h, h, n: v.n, late: v.late, t: v.t }));
  }

  // --- mensajes entrantes --------------------------------------------------
  _onMessage(data, meta) {
    if (!data || typeof data !== 'object' || !this.s) return;
    if (data.t === 'j') {
      const j = parseJoin(data);
      if (j && j.room === this.s.room) this._onJoin(j, meta);
    } else if (data.t === 'c') {
      const c = parseClaim(data);
      if (c && c.room === this.s.room) this._onClaim(c);
    } else if (data.t === 'f') {
      const f = parseResult(data);
      if (f && f.room === this.s.room) this._onResult(f);
    }
  }

  _onJoin(j, meta) {
    const s = this.s;
    if (j.g !== s.g || s.phase === 'W') return;
    const onTime = s.phase === 'L' || (s.phase === 'P' && s.called.length === 0);
    const now = Date.now();
    // Cuenta que firmó el mensaje (Host) o remitente (bus local)
    const sg = meta?.signer || meta?.sender || null;
    let id = j.p || j.h;
    const existing = s.registered.get(j.h);
    const ownH = s.owners.get(id);
    const prev = !existing && ownH && ownH !== j.h ? s.registered.get(ownH) : null;
    if (prev) {
      if (prev.sg && sg && prev.sg !== sg) {
        // Otra cuenta con el mismo identificador: no puede cambiarle la tabla a nadie
        id = j.h;
      } else {
        if (j.v < (prev.v || 0)) return; // registro viejo que llegó tarde
        // Cambió de tabla: la nueva reemplaza a la anterior (sigue siendo un jugador).
        // Si ya salió la primera carta, la tabla nueva cuenta como tardía.
        s.registered.delete(ownH);
        s.registered.set(j.h, { ...prev, n: j.n, v: j.v, late: prev.late || !onTime, seen: now });
        s.owners.set(id, j.h);
        this.emit('join', { id, h: j.h, n: j.n, late: prev.late || !onTime, count: s.registered.size, swap: true });
        this._schedulePublish(600);
        this._save();
        return;
      }
    }
    if (!existing) {
      if (s.registered.size >= 500) return;
      s.registered.set(j.h, { id, sg, v: j.v, n: j.n, late: !onTime, t: now, seen: now });
      s.owners.set(id, j.h);
      this._lastNewJoin = now;
      this.emit('join', { id, h: j.h, n: j.n, late: !onTime, count: s.registered.size });
    } else {
      existing.seen = now;
      if (j.v > (existing.v || 0)) existing.v = j.v;
      if (existing.n !== j.n) {
        existing.n = j.n;
        this.emit('join', { id: existing.id || j.h, h: j.h, n: j.n, late: existing.late, count: s.registered.size, rename: true });
      }
    }
    // Se responde con el filtro de confirmaciones del siguiente estado
    this._schedulePublish(600);
    this._save();
  }

  // Tablas oídas hace poco, las más recientes primero (alimentan el filtro de confirmaciones).
  // En la victoria se confirman los resultados que ya llegaron.
  ackList() {
    const cutoff = Date.now() - ACK_RECENT_MS;
    if (this.s.phase === 'W') {
      return [...this.s.results.values()]
        .filter((r) => r.seen >= cutoff)
        .sort((a, b) => b.seen - a.seen)
        .map((r) => (r.kind === KIND.SIGNED ? signedHash(r.code) : tablaHash(r.code)));
    }
    return [...this.s.registered.entries()]
      .filter(([, v]) => (v.seen || v.t) >= cutoff)
      .sort((a, b) => (b[1].seen || b[1].t) - (a[1].seen || a[1].t))
      .map(([h]) => h);
  }

  _onClaim(c) {
    const s = this.s;
    if (c.g !== s.g || s.phase === 'L') return;
    if (s.winners.some((w) => w.k === c.k) || s.rejected.includes(c.k) || s.pending?.k === c.k) {
      this._schedulePublish(300);
      return;
    }
    const res = this.verify(c.k);
    if (!res.win) {
      s.rejected = [...s.rejected.filter((x) => x !== c.k), c.k].slice(-6);
      this.emit('falseClaim', { n: c.n, k: c.k, res });
      this.publishState();
      return;
    }
    const name = res.name || c.n;
    if (s.phase === 'W') {
      if (Date.now() - s.wonAt <= COWIN_WINDOW_MS && res.registered && !res.late && s.winners.length < 3) {
        const w = { n: name, k: c.k, late: false };
        s.winners.push(w);
        this.emit('win', { winner: w, res, first: false, winners: [...s.winners] });
        this.publishState();
        this._save();
      }
      return;
    }
    if (res.registered && !res.late) {
      this._declare({ n: name, k: c.k, late: false }, res);
    } else if (!s.pending) {
      s.pending = { n: name, k: c.k, res };
      this._stopTimer();
      s.paused = true;
      this.emit('pending', { ...s.pending });
      this.publishState();
    }
  }

  // Resultado de un jugador al terminar la ronda: su tabla, lo que marcó y su firma
  _onResult(f) {
    const s = this.s;
    if (f.g !== s.g || s.phase !== 'W' || !s.commit) return;
    const h = tablaHash(f.k);
    const reg = s.registered.get(h);
    if (!reg) return; // esa tabla no jugó esta ronda
    const tabla = tablaFromCode(f.k);
    const called = new Set(s.called);
    if (cellsOf(f.mask).some((cell) => !called.has(tabla[cell]))) return; // marcó cartas que no salieron
    let kind = KIND.UNSIGNED;
    if (f.sig) {
      const msg = resultMessage({ room: s.room, g: s.g, commit: s.commit, code: f.k, mask: f.mask, name: f.n });
      if (verifySignature(msg, f.sig, f.pubkey)) kind = KIND.SIGNED;
    }
    const now = Date.now();
    const prev = s.results.get(h);
    // Lo firmado no se reemplaza; lo que no trae nada nuevo solo se vuelve a confirmar
    if (prev && (prev.kind === KIND.SIGNED || (kind === KIND.UNSIGNED && prev.mask === f.mask))) {
      prev.seen = now;
      this._schedulePublish(600);
      return;
    }
    const r = { kind, code: f.k, mask: f.mask, name: kind === KIND.SIGNED ? f.n : reg.n, late: !!reg.late, seen: now };
    if (kind === KIND.SIGNED) {
      r.pubkey = f.pubkey;
      r.sig = f.sig;
    }
    s.results.set(h, r);
    this.emit('result', { h, ...r, count: this.resultCounts() });
    this._schedulePublish(600);
    this._save();
  }

  resultCounts() {
    let signed = 0;
    for (const r of this.s.results.values()) if (r.kind === KIND.SIGNED) signed++;
    return { players: this.s.registered.size, results: this.s.results.size, signed };
  }

  // Lo que se guarda en la cadena al cerrar la ronda: todos los que jugaron.
  // Quien no mandó resultado queda con su apodo y la huella de su tabla; si
  // ganó, su tabla ya se conoce (la reveló al cantar).
  roundRecord() {
    const s = this.s;
    if (s.phase !== 'W' || !s.deckSeed) return null;
    const winnerCodes = new Map(s.winners.map((w) => [tablaHash(w.k), w.k]));
    const players = [...s.registered.entries()].map(([h, reg]) => {
      const r = s.results.get(h);
      if (r?.kind === KIND.SIGNED) return { kind: KIND.SIGNED, late: r.late, name: r.name, pubkey: r.pubkey, sig: r.sig, code: r.code, mask: r.mask };
      if (r) return { kind: KIND.UNSIGNED, late: r.late, name: r.name, code: r.code, mask: r.mask };
      if (winnerCodes.has(h)) return { kind: KIND.UNSIGNED, late: !!reg.late, name: reg.n, code: winnerCodes.get(h), mask: null };
      return { kind: KIND.HIDDEN, late: !!reg.late, name: reg.n, h };
    });
    // Tablas ganadoras que el cantor aprobó sin registro (verificación en persona)
    for (const w of s.winners) {
      if (!s.registered.has(tablaHash(w.k))) players.push({ kind: KIND.UNSIGNED, late: true, name: w.n, code: w.k, mask: null });
    }
    return {
      id: roundId(s.room, s.g, s.commit),
      header: { room: s.room, g: s.g, pattern: s.pattern, commit: s.commit, seed: s.deckSeed, called: [...s.called], winners: s.winners, roomName: s.roomName },
      players,
    };
  }

  // Lo que ya quedó guardado de esta ronda: { id, block, keys: [llave de cada registro sellado] }
  markSealed(info) {
    this.s.sealed = info;
    this.emit('sealed', info);
    this._save();
  }

  verify(code) {
    const s = this.s;
    if (!isValidCode(code)) return { valid: false, win: false };
    const tabla = tablaFromCode(code);
    const calledSet = new Set(s.called);
    const line = checkWin(tabla, calledSet, s.pattern);
    const reg = s.registered.get(tablaHash(code));
    return {
      valid: true,
      code,
      tabla,
      line,
      win: !!line,
      registered: !!reg,
      late: reg ? reg.late : true,
      name: reg?.n || null,
      calledCount: s.called.length,
    };
  }

  _declare(w, res) {
    const s = this.s;
    this._stopTimer();
    s.phase = 'W';
    s.wonAt = Date.now();
    s.winners = [w];
    s.pending = null;
    s.paused = false;
    this.emit('win', { winner: w, res, first: true, winners: [...s.winners], deckSeed: s.deckSeed });
    this.publishState();
    this._save();
  }

  approvePending() {
    const s = this.s;
    if (!s.pending) return;
    const p = s.pending;
    s.pending = null;
    if (s.phase === 'W') {
      s.winners.push({ n: p.n, k: p.k, late: true });
      this.publishState();
    } else {
      this._declare({ n: p.n, k: p.k, late: true }, p.res);
    }
  }

  rejectPending() {
    const s = this.s;
    if (!s.pending) return;
    s.rejected = [...s.rejected, s.pending.k].slice(-6);
    s.pending = null;
    this.emit('pendingResolved', {});
    this.publishState();
  }

  // Verificación en persona: el cantor teclea el código de la tabla
  declareManual(code, name) {
    const res = this.verify(code);
    if (!res.win) return res;
    const w = { n: clip(name || res.name || 'Jugador', 14), k: code, late: !res.registered || res.late };
    if (this.s.phase === 'W') {
      if (!this.s.winners.some((x) => x.k === code)) this.s.winners.push(w);
      this.publishState();
    } else {
      this._declare(w, res);
    }
    return res;
  }

  // --- control de la partida ----------------------------------------------
  startGame() {
    const s = this.s;
    if (s.phase !== 'L') return;
    s.deckSeed = randomSeed();
    s.commit = commitOf(s.deckSeed);
    this.deck = deckFromSeed(s.deckSeed);
    s.phase = 'P';
    s.called = [];
    s.winners = [];
    s.rejected = [];
    s.pending = null;
    s.paused = false;
    this.emit('start', this.snapshot());
    this.publishState();
    this._save();
    this._stopTimer();
    // Registro antes de la primera carta: el retraso crece con la sala y, si es una
    // ronda nueva, espera a que vuelva casi toda la anterior (un cantor con prisa no
    // deja a nadie con la tabla «tardía»).
    const expected = this.expected || 0;
    const base = this.startDelay + Math.min(START_EXTRA_MAX_MS, Math.max(s.registered.size, expected) * this.perPlayerDelay);
    const t0 = Date.now();
    const wait = () => {
      if (s.phase !== 'P' || s.paused || s.called.length) return;
      const waited = Date.now() - t0;
      const have = s.registered.size;
      const quiet = Date.now() - this._lastNewJoin > GATE_QUIET_MS;
      const ready = expected < 8 || have >= Math.ceil(expected * GATE_FULL_RATIO) || (quiet && have >= Math.floor(expected * GATE_QUIET_RATIO));
      if (!ready) this.emit('gate', { have, need: expected });
      if (waited >= base && (ready || waited >= base + GATE_MAX_MS)) {
        this._tick();
        return;
      }
      this._timer = setTimeout(wait, 300);
    };
    this._timer = setTimeout(wait, Math.min(300, base));
  }

  _tick() {
    const s = this.s;
    if (s.phase !== 'P' || s.paused || s.pending) return;
    this.callNext();
    if (s.phase === 'P' && s.called.length < 54) this._timer = setTimeout(() => this._tick(), s.speed * 1000);
  }

  _stopTimer() {
    clearTimeout(this._timer);
    this._timer = null;
  }

  callNext() {
    const s = this.s;
    if (s.phase !== 'P' || !this.deck) return null;
    if (s.called.length >= 54) {
      this.emit('deckEmpty', {});
      return null;
    }
    const card = this.deck[s.called.length];
    s.called.push(card);
    this.emit('call', { card, index: s.called.length - 1, total: s.called.length });
    this.publishState();
    this._save();
    return card;
  }

  pause() {
    const s = this.s;
    if (s.phase !== 'P') return;
    s.paused = true;
    this._stopTimer();
    this.emit('paused', true);
    this.publishState();
  }

  resume() {
    const s = this.s;
    if (s.phase !== 'P' || s.pending) return;
    s.paused = false;
    this.emit('paused', false);
    this.publishState();
    this._stopTimer();
    this._timer = setTimeout(() => this._tick(), 1500);
  }

  next() {
    const s = this.s;
    if (s.phase !== 'P' || s.pending) return;
    this._stopTimer();
    this.callNext();
    if (!s.paused && s.phase === 'P') this._timer = setTimeout(() => this._tick(), s.speed * 1000);
  }

  newRound() {
    const s = this.s;
    this._stopTimer();
    this.expected = s.registered.size || this.expected;
    s.g += 1;
    s.phase = 'L';
    s.called = [];
    s.commit = null;
    s.deckSeed = null;
    s.winners = [];
    s.rejected = [];
    s.pending = null;
    s.paused = false;
    s.registered = new Map();
    s.owners = new Map();
    s.results = new Map();
    s.sealed = null;
    this.deck = null;
    this.emit('lobby', this.snapshot());
    this.publishState();
    this._save();
  }

  setPattern(pt) {
    if (this.s.phase !== 'L' || !['c', 'e', 'm', 'f'].includes(pt)) return;
    this.s.pattern = pt;
    this.emit('config', this.snapshot());
    this.publishState();
    this._save();
  }

  setSpeed(sec) {
    this.s.speed = Math.max(3, Math.min(30, Math.round(sec)));
    this.emit('config', this.snapshot());
    this.publishState();
    this._save();
  }

  setRoomName(nm) {
    this.s.roomName = clip(nm, 24) || this.s.roomName;
    this.emit('config', this.snapshot());
    this.publishState();
    this._save();
  }

  // --- red y persistencia --------------------------------------------------
  publishState() {
    const s = this.s;
    if (!s) return;
    s.q = Date.now();
    this._salt = (this._salt + 1) & 63;
    const msg = buildState({ ...s, playerCount: s.registered.size, acks: this.ackList(), salt: this._salt });
    this.t
      .publish(msg, { topic2: topicFor(s.room), channel: stateChannel(s.room) })
      .then((r) => {
        if (r.ok !== this.netOk) {
          this.netOk = r.ok;
          this.emit('net', { ok: r.ok, error: r.error });
        }
      })
      .catch(() => {});
  }

  _schedulePublish(ms) {
    if (this._pubTimer) return;
    this._pubTimer = setTimeout(() => {
      this._pubTimer = null;
      this.publishState();
    }, ms);
  }

  _save() {
    if (!this.storage) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      const s = this.s;
      this.storage.set(this.storageKey, {
        v: 1,
        room: s.room,
        roomName: s.roomName,
        g: s.g,
        phase: s.phase,
        pattern: s.pattern,
        speed: s.speed,
        deckSeed: s.deckSeed,
        called: s.called,
        registered: [...s.registered.entries()],
        results: [...s.results.entries()],
        sealed: s.sealed,
        winners: s.winners,
        rejected: s.rejected,
        savedAt: Date.now(),
      });
    }, 300);
  }

  async forget() {
    if (this.storage) await this.storage.set(this.storageKey, null);
  }
}
