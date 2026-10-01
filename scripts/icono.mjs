// Genera icon.png (512×512) para el manifest de la Polkadot App con el arte real de las
// cartas: levanta Vite, abre scripts/icono/ en Chrome sin ventana y guarda la variante.
//   npm run icono                    → variante «corazon»
//   npm run icono -- --variante rosa → rosa | noche | cempasuchil | corazon
// Requiere Node 22+ (WebSocket global) y Google Chrome (o la ruta en CHROME).
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const arg = process.argv.indexOf('--variante');
const variante = arg > 0 ? process.argv[arg + 1] : 'corazon';
const salida = new URL('../icon.png', import.meta.url).pathname;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({ mode: 'preview', server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const url = `${server.resolvedUrls.local[0]}scripts/icono/`;
const perfil = mkdtempSync(join(tmpdir(), 'icono-'));
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${perfil}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });

try {
  let ws;
  for (let i = 0; i < 60 && !ws; i++) {
    try {
      const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
      if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
    } catch {}
    await sleep(250);
  }
  if (!ws) throw new Error(`No se pudo abrir Chrome en ${CHROME}`);
  if (ws.readyState !== 1) await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.navigate', { url });
  let iconos;
  for (let i = 0; i < 80 && !iconos; i++) {
    await sleep(250);
    iconos = (await send('Runtime.evaluate', { expression: 'window.__iconos', returnByValue: true })).result?.result?.value;
  }
  if (!iconos) throw new Error('La página del ícono no terminó de dibujar');
  if (!iconos[variante]) throw new Error(`Variante desconocida «${variante}»; hay: ${Object.keys(iconos).join(', ')}`);
  writeFileSync(salida, Buffer.from(iconos[variante].split(',')[1], 'base64'));
  // pngquant (opcional) lo deja en ~1/5 del peso sin que se note: es lo que baja cada teléfono
  const q = spawnSync('pngquant', ['--quality', '85-98', '--speed', '1', '--strip', '--force', '--output', salida, salida]);
  const kb = Math.round(statSync(salida).size / 1024);
  console.log(`✓ icon.png (${variante}, ${kb} KB${q.status === 0 ? '' : ', sin pngquant'})`);
  ws.close();
} finally {
  // Chrome sigue escribiendo en su perfil unos instantes después de matarlo
  const cerrado = new Promise((r) => chrome.once('exit', r));
  chrome.kill();
  await Promise.race([cerrado, sleep(3000)]);
  await server.close();
  rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
