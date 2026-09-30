// Historial en la cadena: formato de los registros, firmas de los jugadores y
// el recorrido completo (termina la ronda → cada teléfono manda su resultado →
// algunos firman → el cantor arma lo que se sella en LoteriaRegistry).
// Ejecuta: npm test
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { secretFromSeed, getPublicKey, sign } from '@scure/sr25519';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

globalThis.__PREVIEW__ = true;

const { LocalTransport, closeLocalBus } = await import('../src/net/transport.js');
after(() => closeLocalBus());
const { CantorEngine } = await import('../src/game/cantor.js');
const { PlayerEngine } = await import('../src/game/player.js');
const { byteSize, buildState, parseState } = await import('../src/net/protocol.js');
const { randomSeed, commitOf, deckFromSeed, tablaFromCode, tablaHash } = await import('../src/game/crypto.js');
const R = await import('../src/chain/record.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 15000, step = 50) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fn()) return true;
    await sleep(step);
  }
  return false;
}
async function mk(name) {
  const t = new LocalTransport({ name, latency: [5, 40] });
  await t.connect();
  return t;
}

// Cuenta sr25519 de prueba; `wrap` imita al Host que firma <Bytes>…</Bytes>
function account(n, wrap = false) {
  const secret = secretFromSeed(new Uint8Array(32).fill(n));
  const pubkey = '0x' + bytesToHex(getPublicKey(secret));
  return {
    pubkey,
    sign: async (message) => {
      const bytes = wrap ? utf8ToBytes(`<Bytes>${message}</Bytes>`) : utf8ToBytes(message);
      return { pubkey, sig: '0x' + bytesToHex(sign(secret, bytes)) };
    },
  };
}

test('cabecera y registros ida y vuelta', () => {
  const seed = randomSeed();
  const header = {
    room: 'HDZT',
    g: 300,
    pattern: 'f',
    commit: commitOf(seed),
    seed,
    called: deckFromSeed(seed),
    winners: [
      { k: 'DAECF3', late: false },
      { k: 'C4WTTV', late: true },
      { k: 'K7P2QX', late: false },
    ],
    roomName: 'Ñoño Ñandú Ñapa Ñeque Ñu Ñ',
  };
  const hb = R.encodeHeader(header);
  assert.ok(hb.length <= 512, `cabecera de ${hb.length} bytes`);
  const back = R.decodeHeader(hb);
  assert.deepEqual({ ...back, version: undefined }, { ...header, version: undefined, roomName: back.roomName });
  assert.ok(header.roomName.startsWith(back.roomName), 'el nombre se recorta sin partir letras');

  const players = [
    { kind: R.KIND.SIGNED, late: false, name: 'Erick', pubkey: '0x' + 'ab'.repeat(32), sig: '0x' + 'cd'.repeat(64), code: 'DAECF3', mask: 0xffff },
    { kind: R.KIND.UNSIGNED, late: true, name: 'Áéíóú Ñandú', code: 'C4WTTV', mask: 0x0f01 },
    { kind: R.KIND.UNSIGNED, late: false, name: 'Ganó sin mandar', code: 'K7P2QX', mask: null },
    { kind: R.KIND.HIDDEN, late: false, name: 'Se fue', h: 'deadbeef' },
  ];
  assert.deepEqual(R.decodePlayers(R.encodePlayers(players)), players);
  assert.equal(R.encodePlayer({ ...players[0], name: '😀'.repeat(30) }).length, 2 + 96 + 8 + 1 + 64, 'apodo de 64 bytes como máximo');
  assert.throws(() => R.decodePlayers(R.encodePlayers(players).slice(0, 50)), /incompleto/);
});

test('100 jugadores se reparten en partes que caben en una transacción', () => {
  const list = Array.from({ length: 100 }, (_, i) => ({
    kind: R.KIND.SIGNED,
    late: false,
    name: `Jugador número ${i}`.slice(0, 16),
    pubkey: '0x' + '11'.repeat(32),
    sig: '0x' + '22'.repeat(64),
    code: 'DAECF3',
    mask: i,
  }));
  const parts = R.splitPlayers(list);
  assert.ok(parts.length >= 1 && parts.every((p) => p.bytes.length <= 12000 && p.count > 0));
  assert.equal(parts.reduce((n, p) => n + p.count, 0), 100);
  assert.deepEqual(parts.flatMap((p) => R.decodePlayers(p.bytes)), list);
});

test('la firma de un jugador se verifica, también envuelta en <Bytes>', async () => {
  const msg = R.resultMessage({ room: 'HDZT', g: 1, commit: '1aaf56f9e2c4d7b8', code: 'DAECF3', mask: 0xffff, name: 'Erick' });
  assert.match(msg, /Marqué 16 de 16 casillas \(ffff\)/);
  for (const wrap of [false, true]) {
    const a = account(7, wrap);
    const { pubkey, sig } = await a.sign(msg);
    assert.ok(R.verifySignature(msg, sig, pubkey), `firma ${wrap ? 'envuelta' : 'directa'}`);
    assert.equal(R.verifySignature(msg.replace('Erick', 'Otro'), sig, pubkey), false, 'otro apodo no valida');
    assert.equal(R.verifySignature(msg, sig, account(8).pubkey), false, 'otra llave no valida');
  }
  assert.equal(R.verifySignature(msg, '0x12', '0x34'), false);
});

test('la verificación detecta semilla falsa, casillas que no salieron y firmas malas', async () => {
  const seed = randomSeed();
  const called = deckFromSeed(seed).slice(0, 30);
  const header = { room: 'ABCD', g: 2, pattern: 'c', commit: commitOf(seed), seed, called, winners: [], roomName: 'x' };
  const code = 'DAECF3';
  const tabla = tablaFromCode(code);
  const calledCells = [...Array(16).keys()].filter((c) => called.includes(tabla[c]));
  const missing = [...Array(16).keys()].find((c) => !called.includes(tabla[c]));
  const mask = R.maskOf(calledCells.slice(0, 3));
  const a = account(3, true);
  const { pubkey, sig } = await a.sign(R.resultMessage({ room: 'ABCD', g: 2, commit: header.commit, code, mask, name: 'Ana' }));
  const good = { kind: R.KIND.SIGNED, late: false, name: 'Ana', pubkey, sig, code, mask };

  let v = R.verifyRound(header, [good, { ...good, name: 'Beto' }, { ...good, kind: R.KIND.UNSIGNED, mask: R.maskOf([missing]) }]);
  assert.equal(v.deck.ok, true);
  assert.equal(v.players[0].sigOk, true);
  assert.equal(v.players[0].marked, 3);
  assert.equal(v.players[0].came, calledCells.length);
  assert.equal(v.players[0].marksOk, true);
  assert.equal(v.players[1].sigOk, false, 'apodo cambiado: la firma ya no valida');
  assert.equal(v.players[2].marksOk, false, 'marcó una carta que no salió');

  v = R.verifyRound({ ...header, seed: randomSeed() }, [good]);
  assert.equal(v.deck.commitOk, false, 'semilla que no coincide con el compromiso');
  v = R.verifyRound({ ...header, called: [...called].reverse() }, []);
  assert.equal(v.deck.orderOk, false, 'cartas en otro orden');
});

test('en la victoria el filtro confirma resultados y el estado sigue cabiendo', () => {
  const seed = randomSeed();
  const s = {
    room: 'ABCD',
    roomName: 'Ñoño Ñandú Ñapa Ñeque Ñu Ñ',
    g: 999,
    phase: 'W',
    pattern: 'f',
    called: deckFromSeed(seed),
    speed: 30,
    paused: false,
    playerCount: 499,
    q: Date.now(),
    commit: commitOf(seed),
    deckSeed: seed,
    winners: [
      { n: 'Ñañañañañañañañañá', k: 'K7P2QX', late: true },
      { n: 'Áéíóúáéíóúáéíóú', k: 'K7P2QY', late: false },
      { n: 'Ürsula Güémez Ñ', k: 'K7P2QZ', late: false },
    ],
    acks: Array.from({ length: 300 }, (_, i) => (0x10000000 + i * 7919).toString(16).padStart(8, '0')),
  };
  const m = buildState(s);
  assert.ok(byteSize(m) <= 480, `tamaño ${byteSize(m)}`);
  assert.ok(parseState(m).bloom, 'lleva filtro de confirmaciones');
});

test('termina la ronda: todos mandan su resultado, algunos firman y el cantor arma el registro', { timeout: 90000 }, async () => {
  const cantor = new CantorEngine({ transport: await mk('cantor-h'), startDelay: 100, perPlayerDelay: 0 });
  const room = cantor.createRoom('Historial', { speed: 30, pattern: 'c' });
  const players = [];
  for (let i = 0; i < 6; i++) {
    const p = new PlayerEngine({ transport: await mk(`h${i}`) });
    await p.init();
    p.setName(`Jugador ${i}`);
    p.joinRoom(room);
    players.push(p);
  }
  assert.ok(await until(() => players.every((p) => p.acked), 15000), 'todos registrados');
  const leaver = players[5]; // se va antes de que termine la ronda

  cantor.startGame();
  assert.ok(await until(() => cantor.s.phase === 'P', 3000));
  cantor.pause();
  // Reparte hasta que alguien tenga chorro; cada quien marca lo que le salió
  let winner = null;
  for (let k = 0; k < 54 && !winner; k++) {
    cantor.next();
    await until(() => players.every((p) => p.state?.called.length === cantor.s.called.length), 3000);
    for (const p of players) for (let c = 0; c < 16; c++) if (p.isCalled(p.tabla[c])) p.mark(c);
    winner = players.slice(0, 5).find((p) => p.winningLine());
  }
  assert.ok(winner, 'alguien completó la figura');
  leaver.destroy();
  assert.ok(winner.claim().ok);
  assert.ok(await until(() => cantor.s.phase === 'W', 5000), 'hay ganador');

  // Sin hacer nada, cada teléfono manda su resultado y el cantor lo confirma
  const stay = players.slice(0, 5);
  assert.ok(await until(() => stay.every((p) => p.result.status === 'received'), 20000), 'resultados sin firma confirmados');
  assert.equal(cantor.resultCounts().results, 5);
  assert.equal(cantor.resultCounts().signed, 0);

  // Tres firman (uno con <Bytes>); otro rechaza la firma en su teléfono
  const signers = [stay[0], stay[1], stay[2]];
  await Promise.all(signers.map((p, i) => p.signResult(account(20 + i, i === 1).sign)));
  const refused = await stay[3].signResult(async () => {
    throw new Error('Firma rechazada');
  });
  assert.equal(refused.ok, false);
  assert.equal(stay[3].result.status, 'received', 'si no firma, se queda con el resultado sin firma');
  assert.ok(await until(() => signers.every((p) => p.result.status === 'signedReceived'), 20000), 'firmas confirmadas');
  assert.equal(cantor.resultCounts().signed, 3);
  assert.equal(stay[0].canSignResult(), false, 'no se firma dos veces');

  // Una firma falsificada no cuenta como firmada
  const { buildResult, topicFor, resultChannel } = await import('../src/net/protocol.js');
  const forger = await mk('falsificador');
  const fakeSig = (await account(99).sign('otra cosa')).sig;
  await forger.publish(buildResult(room, cantor.s.g, stay[4].code, R.maskOf(stay[4].marks), 'Falso', account(99).pubkey, fakeSig), {
    topic2: topicFor(room),
    channel: resultChannel(room, 'f0rg3d00'),
  });
  await sleep(400);
  assert.equal(cantor.resultCounts().signed, 3, 'la firma falsa se ignora');

  // Lo que se va a sellar: 6 jugadores, 3 firmados, 2 sin firma y 1 que se fue
  const rec = cantor.roundRecord();
  assert.equal(rec.id, R.roundId(room, cantor.s.g, cantor.s.commit));
  assert.equal(rec.players.length, 6);
  const byKind = (k) => rec.players.filter((p) => p.kind === k).length;
  assert.equal(byKind(R.KIND.SIGNED), 3);
  assert.equal(byKind(R.KIND.UNSIGNED), 2);
  assert.equal(byKind(R.KIND.HIDDEN), 1);
  assert.equal(rec.players.find((p) => p.kind === R.KIND.HIDDEN).h, tablaHash(leaver.code));

  // Ida y vuelta por los bytes que guarda el contrato, y verificación completa
  const header = R.decodeHeader(R.encodeHeader(rec.header));
  const decoded = R.splitPlayers(rec.players).flatMap((p) => R.decodePlayers(p.bytes));
  const v = R.verifyRound(header, decoded);
  assert.equal(v.deck.ok, true, 'baraja verificada');
  assert.ok(v.players.filter((p) => p.kind === R.KIND.SIGNED).every((p) => p.sigOk), 'todas las firmas validan');
  assert.ok(v.players.filter((p) => p.kind !== R.KIND.HIDDEN).every((p) => p.marksOk), 'todas las casillas salieron');
  const w = v.players.find((p) => p.code === winner.code);
  assert.ok(w.winner, 'el ganador queda marcado');
  assert.equal(w.marked, R.popcount(R.maskOf(winner.marks)));

  // Nueva ronda: se limpian resultados y sello
  cantor.markSealed({ id: rec.id, block: 1, keys: [] });
  cantor.newRound();
  assert.equal(cantor.s.results.size, 0);
  assert.equal(cantor.s.sealed, null);
  assert.ok(await until(() => stay.every((p) => p.state?.g === 2 && p.result.status === 'none'), 5000));

  cantor.destroy();
  stay.forEach((p) => p.destroy());
});
