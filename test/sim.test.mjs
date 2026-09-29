// Simulación de una partida completa con 1 cantor + 30 jugadores + casos raros.
// Ejecuta: npm test
import test, { after } from 'node:test';
import assert from 'node:assert/strict';

globalThis.__PREVIEW__ = true;

const { LocalTransport, closeLocalBus } = await import('../src/net/transport.js');
after(() => closeLocalBus());
const { CantorEngine } = await import('../src/game/cantor.js');
const { PlayerEngine } = await import('../src/game/player.js');
const { byteSize, buildClaim, topicFor, claimChannel, parseState, buildState } = await import('../src/net/protocol.js');
const { tablaFromCode, deckFromSeed, commitOf, randomCode, tablaHash, normalizeCode } = await import('../src/game/crypto.js');
const { checkWin, patternLines } = await import('../src/game/rules.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 15000, step = 50) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fn()) return true;
    await sleep(step);
  }
  return false;
}

let maxBytes = 0;
const sizes = { s: 0, j: 0, c: 0 };
async function mkTransport(name, opts = {}) {
  const t = new LocalTransport({ name, latency: [5, 40], ...opts });
  await t.connect();
  const pub = t.publish.bind(t);
  t.publish = (data, o) => {
    const b = byteSize(data);
    maxBytes = Math.max(maxBytes, b);
    sizes[data.t] = Math.max(sizes[data.t] || 0, b);
    return pub(data, o);
  };
  return t;
}

test('derivaciones deterministas y válidas', () => {
  const code = 'K7P2QX';
  const a = tablaFromCode(code);
  const b = tablaFromCode(code);
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, 16);
  assert.ok(a.every((c) => c >= 0 && c < 54));
  const seed = '00112233445566778899aabbccddeeff';
  const d = deckFromSeed(seed);
  assert.equal(new Set(d).size, 54);
  assert.equal(commitOf(seed).length, 16);
  assert.equal(normalizeCode(' k7p-2qo '), 'K7P2QQ');
  assert.equal(patternLines('c').length, 10);
  // Distribución razonable: cada carta aparece en tablas con frecuencia parecida
  const freq = new Array(54).fill(0);
  for (let i = 0; i < 3000; i++) for (const c of tablaFromCode(randomCode())) freq[c]++;
  const avg = (3000 * 16) / 54;
  assert.ok(Math.min(...freq) > avg * 0.75 && Math.max(...freq) < avg * 1.25, 'distribución uniforme');
});

test('el estado más grande cabe en 512 bytes', () => {
  const s = {
    room: 'ABCD',
    roomName: 'Ñoño Ñandú Ñapa Ñeque Ñu Ñ', // acentos = 2 bytes
    g: 999,
    phase: 'W',
    pattern: 'f',
    called: deckFromSeed('ff'.repeat(16)),
    speed: 30,
    paused: true,
    playerCount: 499,
    q: Date.now(),
    commit: 'a'.repeat(16),
    deckSeed: 'b'.repeat(32),
    winners: [
      { n: 'Ñañañañañañañañañá', k: 'K7P2QX', late: true },
      { n: 'Áéíóúáéíóúáéíóú', k: 'K7P2QY', late: false },
      { n: 'Ürsula Güémez Ñ', k: 'K7P2QZ', late: false },
    ],
    pending: { n: 'Pendiente Ñandú', k: 'AAAAAA' },
    rejected: ['BBBBBB', 'CCCCCC', 'DDDDDD'],
    acks: Array.from({ length: 300 }, (_, i) => (0x10000000 + i * 7919).toString(16).padStart(8, '0')),
  };
  const m = buildState(s);
  assert.ok(byteSize(m) <= 480, `tamaño ${byteSize(m)}`);
  const back = parseState(m);
  assert.equal(back.called.length, 54);
  assert.equal(back.winners.length, 3);
});

test('partida completa con 30 jugadores', { timeout: 120000 }, async () => {
  const cantorT = await mkTransport('cantor');
  const cantor = new CantorEngine({ transport: cantorT, startDelay: 100, perPlayerDelay: 0 });
  const room = cantor.createRoom('Prueba Villahermosa', { speed: 30 });

  const players = [];
  for (let i = 0; i < 30; i++) {
    const t = await mkTransport(`p${i}`);
    const p = new PlayerEngine({ transport: t });
    await p.init();
    p.setName(`Jugador ${i}`);
    players.push(p);
  }
  // Descubren la sala en la lista
  assert.ok(await until(() => players.every((p) => p.listRooms().some((r) => r.room === room))), 'descubren la sala');
  players.forEach((p) => p.joinRoom(room));
  assert.ok(await until(() => players.every((p) => p.acked), 20000), 'todos confirmados');
  assert.equal(cantor.players().length, 30);
  assert.ok(cantor.players().every((x) => !x.late));

  // Un jugador llega tarde (después de la primera carta)
  const lateT = await mkTransport('tarde');
  const late = new PlayerEngine({ transport: lateT });
  await late.init();

  let winEvent = null;
  cantor.on('win', (e) => {
    if (e.first) winEvent = e;
  });
  cantor.startGame();
  await until(() => cantor.s.called.length === 0 && cantor.s.phase === 'P', 2000);
  cantor.pause();
  cantor.next();
  late.joinRoom(room);
  assert.ok(await until(() => late.acked, 10000), 'el tardío también queda registrado');
  assert.ok(cantor.players().find((x) => x.h === late.h)?.late, 'marcado como tardío');

  // Reparto manual rápido; cada jugador canta en cuanto tiene figura
  let claimed = new Set();
  for (let k = 0; k < 54 && cantor.s.phase === 'P'; k++) {
    await sleep(60);
    for (const p of players) {
      if (!claimed.has(p) && p.state?.phase === 'P' && p.winningLine()) {
        claimed.add(p);
        const r = p.claim();
        assert.ok(r.ok);
      }
    }
    if (claimed.size) {
      await until(() => cantor.s.phase === 'W', 2000);
      break;
    }
    cantor.next();
  }
  assert.equal(cantor.s.phase, 'W', 'hay ganador');
  assert.ok(winEvent, 'evento de victoria');
  const winnerTabla = tablaFromCode(winEvent.winner.k);
  assert.ok(checkWin(winnerTabla, new Set(cantor.s.called), cantor.s.pattern), 'la tabla ganadora es válida');

  // Todos reciben el resultado y verifican la baraja revelada
  assert.ok(await until(() => players.every((p) => p.state?.phase === 'W' && p.verified === true), 10000), 'todos verifican la baraja');
  const winnersSeen = players.filter((p) => p.state.winners.some((w) => w.k === p.code));
  assert.ok(winnersSeen.length >= 1);

  // Reclamo falso con código aleatorio
  let falseClaims = 0;
  cantor.on('falseClaim', () => falseClaims++);
  cantor.newRound();
  assert.ok(await until(() => players.every((p) => p.state?.g === 2 && p.acked), 20000), 'se registran en la ronda 2');
  cantor.startGame();
  await sleep(300);
  cantor.pause();
  for (let i = 0; i < 3; i++) cantor.next();
  const fakeCode = randomCode();
  const fakeT = await mkTransport('tramposo');
  await fakeT.publish(buildClaim(room, 2, fakeCode, 'Tramposo'), { topic2: topicFor(room), channel: claimChannel(room, tablaHash(fakeCode)) });
  assert.ok(await until(() => falseClaims === 1, 3000), 'reclamo falso rechazado');
  assert.equal(cantor.s.phase, 'P');

  // Reclamo tardío pasa a revisión del cantor
  const lateP = players[0];
  let pending = null;
  cantor.on('pending', (p) => (pending = p));
  // Forzamos un tardío registrando una tabla después de la primera carta
  const t2 = await mkTransport('tardio2');
  const p2 = new PlayerEngine({ transport: t2 });
  await p2.init();
  p2.joinRoom(room);
  assert.ok(await until(() => p2.acked, 10000));
  for (let k = 0; k < 54 && !p2.winningLine(); k++) {
    // Evita que otros ganen primero: solo repartimos
    cantor.next();
    await sleep(15);
  }
  await until(() => p2.state?.called.length === cantor.s.called.length, 3000);
  if (cantor.s.phase === 'P') {
    assert.ok(p2.claim().ok);
    assert.ok(await until(() => pending !== null, 3000), 'queda pendiente');
    cantor.approvePending();
    assert.equal(cantor.s.phase, 'W');
    assert.ok(cantor.s.winners[0].late);
  }

  console.log('Máximo tamaño de mensaje:', maxBytes, 'bytes', sizes);
  assert.ok(maxBytes <= 480);

  cantor.destroy();
  [...players, late, p2].forEach((p) => p.destroy());
  lateP;
});

test('el cantor puede retomar su sala guardada tras recargar la pantalla', async () => {
  const mem = new Map();
  const storage = { get: async (k) => mem.get(k) ?? null, set: async (k, v) => mem.set(k, v) };
  const t1 = await mkTransport('cantor-a');
  const a = new CantorEngine({ transport: t1, storage, startDelay: 50, perPlayerDelay: 0 });
  const room = a.createRoom('Retomar', { speed: 30, pattern: 'e' });
  const p = new PlayerEngine({ transport: await mkTransport('jugador-r') });
  await p.init();
  p.joinRoom(room);
  assert.ok(await until(() => p.acked, 10000), 'jugador registrado');
  a.startGame();
  await until(() => a.s.phase === 'P', 2000);
  a.pause();
  a.next();
  a.next();
  await sleep(500); // el guardado se difiere 300 ms
  const seed = a.s.deckSeed;
  const called = [...a.s.called];
  a.destroy();

  const t2 = await mkTransport('cantor-b');
  const b = new CantorEngine({ transport: t2, storage, startDelay: 50, perPlayerDelay: 0 });
  const saved = await b.loadSaved();
  assert.ok(saved, 'hay sala guardada');
  b.restore(saved);
  assert.equal(b.s.room, room);
  assert.equal(b.s.phase, 'P');
  assert.equal(b.s.deckSeed, seed);
  assert.deepEqual(b.s.called, called);
  assert.equal(b.players().length, 1, 'conserva las tablas registradas');
  b.resume(); // quitar la pausa sigue funcionando
  assert.equal(b.s.paused, false);
  b.pause();
  const before = b.s.called.length;
  b.next();
  assert.equal(b.s.called.length, before + 1, 'sigue cantando desde donde iba');
  assert.equal(b.deck[before], b.s.called[before], 'con la misma baraja sellada');
  b.destroy();
  p.destroy();
});
