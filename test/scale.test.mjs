// Salas grandes: 100 teléfonos entrando a la vez con latencia y pérdida de mensajes.
// Mide lo que le importa a la noche del evento: que todos queden registrados y
// confirmados rápido, sin avalanchas de mensajes y sin tablas «tardías».
import test, { after } from 'node:test';
import assert from 'node:assert/strict';

globalThis.__PREVIEW__ = true;

const { LocalTransport, closeLocalBus } = await import('../src/net/transport.js');
after(() => closeLocalBus());
const { CantorEngine } = await import('../src/game/cantor.js');
const { PlayerEngine } = await import('../src/game/player.js');
const { buildState, parseState, byteSize } = await import('../src/net/protocol.js');
const { bloomEncode, bloomHas, bloomCapacity, bloomCharsFor, AckWatcher } = await import('../src/net/bloom.js');
const { tablaFromCode, tablaHash, randomCode, deckFromSeed } = await import('../src/game/crypto.js');
const { checkWin } = await import('../src/game/rules.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Devuelve los ms que tardó (mínimo 1) o null si se acabó el tiempo
async function until(fn, ms = 30000, step = 25) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fn()) return Math.max(1, Date.now() - t0);
    await sleep(step);
  }
  return null;
}
const hex8 = (i) => ((i * 2654435761) >>> 0).toString(16).padStart(8, '0');

test('filtro de confirmaciones: sin falsos negativos y pocos falsos positivos', () => {
  for (const [n, maxFp] of [[24, 0.01], [100, 0.01], [150, 0.03]]) {
    const inSet = Array.from({ length: n }, (_, i) => hex8(i + 1));
    const chars = bloomCharsFor(n);
    const f = bloomEncode(inSet, chars);
    assert.ok(inSet.every((h) => bloomHas(f, h)), `n=${n}: sin falsos negativos`);
    let fp = 0;
    const probes = 20000;
    for (let i = 0; i < probes; i++) if (bloomHas(f, hex8(1_000_000 + i))) fp++;
    const rate = fp / probes;
    console.log(`  Bloom n=${n}: ${chars + 1} caracteres · falsos positivos ${(rate * 100).toFixed(2)} %`);
    assert.ok(rate <= maxFp, `n=${n}: falsos positivos ${rate}`);
  }
  assert.equal(bloomHas('', hex8(1)), false);
  assert.equal(bloomHas('!!!!!!', hex8(1)), false);
});

test('un falso positivo no basta: hacen falta dos estados con sal distinta', () => {
  const n = 150;
  const inSet = Array.from({ length: n }, (_, i) => hex8(i + 1));
  const chars = bloomCharsFor(n);
  // Cada estado usa otra sal: las coincidencias falsas dejan de repetirse
  let single = 0;
  let double = 0;
  const probes = 30000;
  for (let i = 0; i < probes; i++) {
    const h = hex8(2_000_000 + i);
    const w = new AckWatcher(h);
    const a = w.feed(bloomEncode(inSet, chars, 3));
    const b = w.feed(bloomEncode(inSet, chars, 4));
    if (bloomHas(bloomEncode(inSet, chars, 3), h)) single++;
    if (a || b) double++;
  }
  console.log(`  Falsos positivos: uno solo ${(single / probes * 100).toFixed(2)} % · exigiendo dos estados ${(double / probes * 100).toFixed(3)} %`);
  assert.ok(double / probes < 0.0005);
  // Quien sí está se confirma en el segundo estado; la misma sal repetida no cuenta
  const w = new AckWatcher(inSet[10]);
  assert.equal(w.feed(bloomEncode(inSet, chars, 7)), false);
  assert.equal(w.feed(bloomEncode(inSet, chars, 7)), false);
  assert.equal(w.feed(bloomEncode(inSet, chars, 8)), true);
});

test('el estado nunca pasa de 480 bytes, aun con 500 jugadores y nombres con acentos', () => {
  const base = {
    room: 'ABCD',
    roomName: 'Ñoño Ñandú Ñapa Ñeque Ñu Ñ',
    g: 99,
    phase: 'P',
    pattern: 'f',
    called: deckFromSeed('aa'.repeat(16)),
    speed: 20,
    paused: true,
    playerCount: 500,
    q: Date.now(),
    commit: 'a'.repeat(16),
    pending: { n: 'Pendiente Ñandú', k: 'AAAAAA' },
    rejected: ['BBBBBB', 'CCCCCC', 'DDDDDD'],
    winners: [],
    acks: Array.from({ length: 500 }, (_, i) => hex8(i + 7)),
  };
  for (const called of [0, 20, 54]) {
    const m = buildState({ ...base, called: base.called.slice(0, called) });
    assert.ok(byteSize(m) <= 480, `${called} cartas: ${byteSize(m)} bytes`);
    const back = parseState(m);
    assert.ok(back, 'el estado se puede leer de vuelta');
    // lo que sí cupo se confirma
    const cap = bloomCapacity(m.k.length - 2);
    const listed = base.acks.slice(0, cap);
    assert.ok(listed.every((h) => bloomHas(back.bloom, h)));
  }
});

async function makeCrowd(N, opts = {}) {
  const LAT = [20, 320];
  const DROP = opts.drop ?? 0.05;
  const stats = { joins: 0, log: [] };
  const mk = async (name) => {
    const t = new LocalTransport({ name, latency: LAT, drop: DROP });
    await t.connect();
    const pub = t.publish.bind(t);
    t.publish = (data, o) => {
      if (data.t === 'j') {
        stats.joins++;
        stats.log.push(Date.now());
      }
      return pub(data, o);
    };
    return t;
  };
  const cantor = new CantorEngine({ transport: await mk('cantor'), startDelay: 200, ...opts.cantor });
  const room = cantor.createRoom('Carga', { speed: 30, pattern: opts.pattern || 'c' });
  const players = [];
  for (let i = 0; i < N; i++) {
    const p = new PlayerEngine({ transport: await mk(`p${i}`) });
    await p.init();
    p.setName(`J${i}`);
    players.push(p);
  }
  cantor.publishState();
  assert.ok(await until(() => players.every((p) => p.listRooms().some((r) => r.room === room)), 20000), 'todos ven la sala');
  return { cantor, room, players, stats, mk };
}
const peak = (log, win = 200) => {
  let best = 0;
  for (let i = 0, j = 0; i < log.length; i++) {
    while (log[j] < log[i] - win) j++;
    best = Math.max(best, i - j + 1);
  }
  return best;
};

test('100 jugadores entran a la vez, en dos rondas seguidas', { timeout: 120000 }, async () => {
  const N = 100;
  const { cantor, room, players, stats } = await makeCrowd(N);

  stats.joins = 0;
  stats.log = [];
  players.forEach((p) => p.joinRoom(room));
  const tReg = await until(() => cantor.players().length === N, 30000);
  const tAck = await until(() => players.every((p) => p.acked), 30000);
  console.log(`  Ronda 1: registradas en ${tReg} ms · confirmadas en ${tAck} ms · ${(stats.joins / N).toFixed(2)} registros/jugador · pico ${peak(stats.log)} en 200 ms`);
  assert.ok(tReg !== null && tAck !== null, 'todos registrados y confirmados');
  assert.ok(tAck < 15000, `confirmación lenta: ${tAck} ms`);
  assert.ok(stats.joins / N < 1.6, `demasiados reintentos: ${stats.joins / N}`);
  assert.ok(peak(stats.log) < N * 0.5, `avalancha: ${peak(stats.log)} registros en 200 ms`);

  // Nueva ronda: los 100 teléfonos se vuelven a registrar solos
  stats.joins = 0;
  stats.log = [];
  cantor.startGame();
  await sleep(150);
  cantor.pause();
  cantor.newRound();
  const tReg2 = await until(() => cantor.players().length === N, 30000);
  const tAck2 = await until(() => players.every((p) => p.acked), 30000);
  console.log(`  Ronda 2: registradas en ${tReg2} ms · confirmadas en ${tAck2} ms · ${(stats.joins / N).toFixed(2)} registros/jugador · pico ${peak(stats.log)} en 200 ms`);
  assert.ok(tReg2 !== null && tAck2 !== null);
  assert.ok(tAck2 < 15000, `confirmación lenta: ${tAck2} ms`);
  assert.ok(peak(stats.log) < N * 0.35, `avalancha en la ronda 2: ${peak(stats.log)}`);

  cantor.destroy();
  players.forEach((p) => p.destroy());
});

test('un cantor impaciente no deja tablas «tardías» (espera a que se registre la sala)', { timeout: 120000 }, async () => {
  const N = 60;
  const { cantor, room, players } = await makeCrowd(N, { drop: 0.08 });
  players.forEach((p) => p.joinRoom(room));
  assert.ok(await until(() => players.every((p) => p.acked), 30000), 'ronda 1 registrada');

  // Ronda 2: el cantor arranca casi de inmediato. Con la compuerta de registro
  // espera a que vuelva casi toda la sala antes de cantar la primera carta.
  cantor.newRound();
  await sleep(300);
  cantor.startGame();
  await until(() => cantor.s.called.length >= 1, 30000, 50);
  const atFirstCard = cantor.players().length;
  console.log(`  Arranque a los 0.3 s: al cantar la 1.ª carta ya había ${atFirstCard}/${N} tablas registradas`);
  assert.ok(atFirstCard >= Math.floor(N * 0.85), `solo ${atFirstCard} registradas al cantar la primera carta`);
  // Los rezagados (mensajes perdidos) terminan entrando; pocos deben quedar como «tardíos»
  await until(() => cantor.players().length === N, 20000, 100);
  const late = cantor.players().filter((x) => x.late).length;
  console.log(`  Al final: ${cantor.players().length}/${N} registradas, ${late} tardías`);
  assert.equal(cantor.players().length, N);
  assert.ok(late <= Math.ceil(N * 0.05), `${late} tablas tardías`);

  cantor.destroy();
  players.forEach((p) => p.destroy());
});

test('empate de varios jugadores: gana el primero y se reconocen hasta 3', { timeout: 60000 }, async () => {
  const { cantor, room, players, mk } = await makeCrowd(8, { pattern: 'e', drop: 0, cantor: { perPlayerDelay: 0 } });
  players.forEach((p) => p.joinRoom(room));
  assert.ok(await until(() => players.every((p) => p.acked), 15000));
  cantor.startGame();
  await until(() => cantor.s.phase === 'P' && cantor.deck, 3000);
  cantor.pause();
  const deck = cantor.deck;
  const K = 30;

  // 5 tablas cuyas esquinas se completan exactamente en la carta K
  const winners = [];
  while (winners.length < 5) {
    const code = randomCode();
    const t = tablaFromCode(code);
    const corners = [t[0], t[3], t[12], t[15]];
    const idx = corners.map((c) => deck.indexOf(c));
    if (Math.max(...idx) === K - 1) winners.push(code);
  }
  const claimants = [];
  for (const code of winners) {
    const p = new PlayerEngine({ transport: await mk(`w${claimants.length}`) });
    await p.init();
    p._setCode(code);
    cantor.s.registered.set(tablaHash(code), { n: `Empate ${claimants.length + 1}`, late: false, t: Date.now(), seen: Date.now() });
    p.joinRoom(room);
    claimants.push(p);
  }
  for (let i = 0; i < K; i++) cantor.next();
  await until(() => claimants.every((p) => p.state?.called.length === K), 8000);
  assert.ok(claimants.every((p) => checkWin(p.tabla, new Set(deck.slice(0, K)), 'e')), 'todas completan la figura en la carta 30');
  claimants.forEach((p) => p.claim());
  await until(() => cantor.s.phase === 'W', 8000);
  await sleep(2500);
  console.log(`  Empate de 5 → ganadores reconocidos: ${cantor.s.winners.length} (tope 3)`);
  assert.equal(cantor.s.phase, 'W');
  assert.equal(cantor.s.winners.length, 3);
  assert.ok(await until(() => claimants.every((p) => p.state?.phase === 'W'), 8000), 'todos ven el final');

  cantor.destroy();
  [...players, ...claimants].forEach((p) => p.destroy());
});
