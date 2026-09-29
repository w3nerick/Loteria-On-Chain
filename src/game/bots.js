// Jugadores simulados para la vista previa y el modo práctica.
// Hablan por el mismo bus local que el resto: se registran, siguen las
// cartas y cantan ¡Lotería! con cierto tiempo de reacción.
import { parseState, buildJoin, buildClaim, topicFor, joinChannel, claimChannel } from '../net/protocol.js';
import { AckWatcher } from '../net/bloom.js';
import { randomCode, tablaFromCode, tablaHash } from './crypto.js';
import { checkWin } from './rules.js';
import { CantorEngine } from './cantor.js';
import { LocalTransport } from '../net/transport.js';

export const BOT_NAMES = [
  'Tía Lupe', 'Don Chuy', 'Paty', 'El Güero', 'Doña Mary', 'Toño', 'Memo', 'Karla', 'Beto', 'Rosita',
  'Checo', 'La Chiquis', 'Nacho', 'Fer', 'Lalo', 'Susy', 'Pepe', 'Cande', 'Iván', 'Marisol',
  'Rigo', 'Yoli', 'Tere', 'Poncho', 'Vero', 'Chabelo', 'Moni', 'Quique', 'Gaby', 'Ramiro',
  'Abue Chayo', 'Dani', 'Mayra', 'Oscarín', 'Luz', 'Tavo',
];

export class Bot {
  constructor({ transport, room, name, reaction = [1800, 9000], lateChance = 0.08 }) {
    this.t = transport;
    this.room = room;
    this.name = name;
    this.reaction = reaction;
    this.lateChance = lateChance;
    this.g = 0;
    this.state = null;
    this.claimed = false;
    this.acked = false;
    this.sent = 0;
    this.timers = new Set();
    this.newTabla();
    this.unsub = this.t.subscribe((d) => this._on(d));
  }

  newTabla() {
    this.code = randomCode();
    this.tabla = tablaFromCode(this.code);
    this.h = tablaHash(this.code);
    this._ack = new AckWatcher(this.h);
  }

  _later(fn, ms) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }

  _on(d) {
    if (!d || d.t !== 's') return;
    const st = parseState(d);
    if (!st || st.room !== this.room) return;
    if (this.state && st.q <= this.state.q) return;
    const newGame = !this.state || st.g !== this.state.g;
    this.state = st;
    if (newGame) {
      this.claimed = false;
      this.acked = false;
      this.sent = 0;
      this._ack.reset();
      if (Math.random() < 0.3) this.newTabla();
      const late = st.phase === 'L' && Math.random() < this.lateChance;
      const delay = late ? 20000 + Math.random() * 15000 : 400 + Math.random() * 7000;
      this._later(() => this._join(), delay);
    }
    if (!this.acked && this.sent && this._ack.feed(st.bloom)) this.acked = true;
    if (st.phase === 'P' && !this.claimed && checkWin(this.tabla, new Set(st.called), st.pattern)) {
      this.claimed = true;
      const [a, b] = this.reaction;
      this._later(() => this._claim(), a + Math.random() * (b - a));
    }
  }

  _join(attempt = 0) {
    if (!this.state || this.state.phase === 'W' || this.acked) return;
    this.sent += 1;
    this.t.publish(buildJoin(this.room, this.state.g, this.h, this.name), {
      topic2: topicFor(this.room),
      channel: joinChannel(this.room, this.h),
    });
    if (attempt < 6) this._later(() => this._join(attempt + 1), [1800, 3200, 5000, 7000, 9000][Math.min(attempt, 4)]);
  }

  _claim() {
    if (!this.state || this.state.phase !== 'P') return;
    this.t.publish(buildClaim(this.room, this.state.g, this.code, this.name), {
      topic2: topicFor(this.room),
      channel: claimChannel(this.room, this.h),
    });
  }

  destroy() {
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    this.unsub?.();
    this.t.destroy?.();
  }
}

export async function spawnBots(room, count, { stagger = 350, names = BOT_NAMES, ...opts } = {}) {
  const bots = [];
  const shuffled = [...names].sort(() => Math.random() - 0.5);
  for (let i = 0; i < count; i++) {
    const t = new LocalTransport({ name: `bot${i}` });
    await t.connect();
    const name = shuffled[i % shuffled.length] + (i >= shuffled.length ? ` ${Math.floor(i / shuffled.length) + 1}` : '');
    await new Promise((r) => setTimeout(r, stagger * Math.random()));
    bots.push(new Bot({ transport: t, room, name, ...opts }));
  }
  return bots;
}

// Sesión de práctica: un cantor sin pantalla y unos cuantos rivales en el mismo dispositivo
export class PracticeSession {
  constructor({ speed = 5, rivals = 7 } = {}) {
    this.speed = speed;
    this.rivals = rivals;
    this.bots = [];
    this.cantor = null;
    this.timers = [];
  }

  async start() {
    const t = new LocalTransport({ name: 'cantor-practica', latency: [10, 60] });
    await t.connect();
    this.cantor = new CantorEngine({ transport: t, startDelay: 2500 });
    this.room = this.cantor.createRoom('Práctica', { speed: this.speed });
    this.bots = await spawnBots(this.room, this.rivals, { reaction: [2500, 12000], lateChance: 0 });
    this.cantor.on('win', (e) => {
      if (!e.first) return;
      this.timers.push(setTimeout(() => this.cantor.newRound(), 11000));
    });
    this.cantor.on('lobby', () => {
      this.timers.push(setTimeout(() => this.cantor.startGame(), 9000));
    });
    this.cantor.on('deckEmpty', () => {
      this.timers.push(setTimeout(() => this.cantor.newRound(), 6000));
    });
    this.timers.push(setTimeout(() => this.cantor.startGame(), 9000));
    return this.room;
  }

  stop() {
    this.timers.forEach(clearTimeout);
    this.bots.forEach((b) => b.destroy());
    this.cantor?.destroy();
  }
}
