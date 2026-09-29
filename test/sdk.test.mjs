// La misma partida, pero pasando por el cliente real del SDK de Polkadot
// (StatementStoreClient) sobre su transporte en memoria de pruebas.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.__PREVIEW__ = false;

const { createFakeStatementTransport } = await import('@parity/product-sdk-statement-store/testing');
const { HostTransport } = await import('../src/net/hostTransport.js');
const { CantorEngine } = await import('../src/game/cantor.js');
const { PlayerEngine } = await import('../src/game/player.js');
const { tablaFromCode } = await import('../src/game/crypto.js');
const { checkWin } = await import('../src/game/rules.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fn()) return true;
    await sleep(20);
  }
  return false;
}

test('cantor y 8 jugadores sobre el StatementStoreClient del SDK', { timeout: 60000 }, async () => {
  const wire = createFakeStatementTransport();
  const mk = async () => {
    const t = new HostTransport({ sdkTransport: wire });
    await t.connect();
    return t;
  };
  const cantor = new CantorEngine({ transport: await mk(), startDelay: 50 });
  const room = cantor.createRoom('SDK', { speed: 30 });
  const players = [];
  for (let i = 0; i < 8; i++) {
    const p = new PlayerEngine({ transport: await mk() });
    await p.init();
    p.setName(`SDK ${i}`);
    players.push(p);
  }
  // El estado se vuelve a publicar cada 5 s; lo forzamos para no esperar
  cantor.publishState();
  assert.ok(await until(() => players.every((p) => p.listRooms().length === 1)), 'ven la sala');
  players.forEach((p) => p.joinRoom(room));
  cantor.publishState();
  assert.ok(await until(() => players.every((p) => p.acked), 15000), 'registrados vía SDK');
  assert.equal(cantor.players().length, 8);

  cantor.startGame();
  await sleep(120);
  cantor.pause();
  let winner = null;
  for (let k = 0; k < 54 && cantor.s.phase === 'P'; k++) {
    cantor.next();
    await sleep(30);
    const w = players.find((p) => p.state?.phase === 'P' && p.winningLine());
    if (w) {
      winner = w;
      w.claim();
      await until(() => cantor.s.phase === 'W', 3000);
    }
  }
  assert.equal(cantor.s.phase, 'W');
  assert.ok(winner);
  assert.ok(checkWin(tablaFromCode(cantor.s.winners[0].k), new Set(cantor.s.called), cantor.s.pattern));
  assert.ok(await until(() => players.every((p) => p.verified === true), 8000), 'verifican la baraja');
  // Todos los mensajes publicados pasaron por el SDK y son pequeños
  const biggest = Math.max(...wire.published.map((s) => s.data?.length || 0));
  console.log('Statements publicados:', wire.published.length, '· mayor:', biggest, 'bytes');
  assert.ok(biggest <= 512);
  cantor.destroy();
  players.forEach((p) => p.destroy());
});
