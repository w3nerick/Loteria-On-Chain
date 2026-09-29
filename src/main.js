import './style.css';
import { loadFonts } from './fonts.js';
import { createTransport } from './net/transport.js';
import { createStorage } from './net/storage.js';
import { Stage, webglAvailable } from './three/stage.js';
import { App } from './ui/app.js';

async function boot() {
  const splash = document.getElementById('splash');
  const msg = document.getElementById('splash-msg');
  const slow = setTimeout(() => msg && (msg.textContent = 'Conectando con tu Polkadot App…'), 1200);
  const slower = setTimeout(() => msg && (msg.textContent = 'La Polkadot App tarda en contestar… si no responde entras en modo demostración'), 9000);
  const [, transport] = await Promise.all([loadFonts(), createTransport()]);
  clearTimeout(slow);
  clearTimeout(slower);
  const storage = await createStorage(transport.kind);
  let stage = null;
  if (webglAvailable()) {
    try {
      stage = new Stage(document.getElementById('gl'));
    } catch (e) {
      console.warn('WebGL no disponible, uso la versión 2D', e);
    }
  }
  const app = new App({ stage, transport, storage, ui: document.getElementById('ui') });
  await app.start();
  splash?.classList.add('out');
  setTimeout(() => splash?.remove(), 700);
  window.__loteria = app;
  window.__done = true;
}

boot().catch((e) => {
  console.error(e);
  const msg = document.getElementById('splash-msg');
  if (msg) msg.textContent = `No se pudo iniciar: ${e?.message || e}`;
});
