// Prueba de carga del motor: 1 cantor + N jugadores sobre el bus local con latencia y pérdida.
//   N=100 DROP=0.08 node scripts/carga.mjs
// Variables: N (jugadores), LAT="30,450" (ms mín,máx), DROP (0..1), START (ms de espera del cantor),
//            ROOT (carpeta del proyecto a medir; por defecto esta).
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

globalThis.__PREVIEW__ = true;
const ROOT = process.env.ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = +process.env.N || 100;
const LAT = (process.env.LAT || '30,450').split(',').map(Number);
const DROP = +(process.env.DROP ?? 0.08);
const START = +process.env.START || 3800;
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);

const { LocalTransport, closeLocalBus } = await imp('src/net/transport.js');
const { CantorEngine } = await imp('src/game/cantor.js');
const { PlayerEngine } = await imp('src/game/player.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.now();

const pubs = { s: 0, j: 0, c: 0 };
let joinLog = [];
async function mk(name) {
  const t = new LocalTransport({ name, latency: LAT, drop: DROP });
  await t.connect();
  const pub = t.publish.bind(t);
  t.publish = (data, o) => {
    pubs[data.t] = (pubs[data.t] || 0) + 1;
    if (data.t === 'j') joinLog.push(now());
    return pub(data, o);
  };
  return t;
}
async function waitFor(fn, ms = 90000) {
  const s = now();
  while (now() - s < ms) {
    if (fn()) return Math.round(now() - s);
    await sleep(25);
  }
  return null;
}
function peak(log, win = 200) {
  let best = 0;
  for (let i = 0, j = 0; i < log.length; i++) {
    while (log[j] < log[i] - win) j++;
    best = Math.max(best, i - j + 1);
  }
  return best;
}
const fmt = (ms) => (ms === null ? '> 90 s' : `${(ms / 1000).toFixed(1)} s`);

const cantor = new CantorEngine({ transport: await mk('cantor'), startDelay: START });
const room = cantor.createRoom('Carga', { speed: 30 });
const players = [];
for (let i = 0; i < N; i++) {
  const p = new PlayerEngine({ transport: await mk(`p${i}`) });
  await p.init();
  p.setName(`J${i}`);
  players.push(p);
}
cantor.publishState();
await waitFor(() => players.every((p) => p.listRooms().length === 1), 20000);

console.log(`\n=== ${N} jugadores · latencia ${LAT.join('–')} ms · ${(DROP * 100).toFixed(0)} % de mensajes perdidos ===`);

// A) todos entran a la vez
pubs.j = 0;
joinLog = [];
players.forEach((p) => p.joinRoom(room));
const tReg = await waitFor(() => cantor.players().length === N);
const tAck = await waitFor(() => players.every((p) => p.acked));
console.log(`Entrada simultánea  · registradas ${fmt(tReg)} · confirmadas ${fmt(tAck)} · ${(pubs.j / N).toFixed(2)} registros/jugador · pico ${peak(joinLog)} en 200 ms`);

// B) nueva ronda: todos se vuelven a registrar
cantor.startGame();
await sleep(400);
cantor.pause();
cantor.newRound();
pubs.j = 0;
joinLog = [];
const tReg2 = await waitFor(() => cantor.players().length === N);
const tAck2 = await waitFor(() => players.every((p) => p.acked));
console.log(`Nueva ronda         · registradas ${fmt(tReg2)} · confirmadas ${fmt(tAck2)} · ${(pubs.j / N).toFixed(2)} registros/jugador · pico ${peak(joinLog)} en 200 ms`);

// C) cantor impaciente: arranca a los 0.5 s de abrir la ronda
cantor.newRound();
await sleep(500);
cantor.startGame();
await waitFor(() => cantor.s.called.length >= 1, 40000);
await sleep(1500);
const late = cantor.players().filter((x) => x.late).length;
console.log(`Arranque a los 0.5 s · registradas ${cantor.players().length}/${N} al cantar la 1.ª carta · tablas tardías: ${late}`);

cantor.destroy();
players.forEach((p) => p.destroy());
closeLocalBus();
process.exit(0);
