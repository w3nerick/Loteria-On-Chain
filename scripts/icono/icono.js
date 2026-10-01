// Ícono de producto (512×512, a sangre): se dibuja con el mismo arte de las cartas del juego.
// La app recorta el cuadro a su gusto (esquinas redondas o círculo), así que todo lo
// importante queda dentro de un círculo de ~230 px de radio.
import { loadFonts } from '../../src/fonts.js';
import { renderCard, renderBack } from '../../src/cards/deck.js';

const S = 512;
const CORAZON = 26;
const ESTRELLA = 34;
const SOL = 45;

function mulberry(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function radial(g, stops, cx = S / 2, cy = S / 2, r = S * 0.75) {
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
  stops.forEach(([at, c]) => gr.addColorStop(at, c));
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
}

// Rayos de sol desde un punto, como el destello del cantor
function sunburst(g, cx, cy, n, color) {
  g.save();
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = a0 + Math.PI / n;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a0) * S, cy + Math.sin(a0) * S);
    g.lineTo(cx + Math.cos(a1) * S, cy + Math.sin(a1) * S);
    g.closePath();
    g.fill();
  }
  g.restore();
}

// Una carta con sombra, centrada en (x, y), de alto h y girada `rot` radianes.
// `encima(g, w, h)` dibuja en las coordenadas de la carta (el frijol cae sobre el dibujo).
function card(g, cv, x, y, h, rot, shadow = 'rgba(60, 0, 32, 0.5)', encima = null) {
  const w = (h * cv.width) / cv.height;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.save();
  g.shadowColor = shadow;
  g.shadowBlur = h * 0.08;
  g.shadowOffsetY = h * 0.035;
  g.drawImage(cv, -w / 2, -h / 2, w, h);
  g.restore();
  encima?.(g, w, h);
  g.restore();
}

// Frijol pinto: forma de riñón, pintas cafés y un brillo
function bean(g, x, y, w, rot, seed = 7) {
  const h = w * 0.62;
  const rnd = mulberry(seed);
  const shape = () => {
    g.beginPath();
    g.moveTo(-w / 2, 0);
    g.bezierCurveTo(-w / 2, -h * 0.64, -w * 0.2, -h * 0.6, 0, -h * 0.47);
    g.bezierCurveTo(w * 0.2, -h * 0.6, w / 2, -h * 0.64, w / 2, 0);
    g.bezierCurveTo(w / 2, h * 0.66, -w / 2, h * 0.66, -w / 2, 0);
    g.closePath();
  };
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.save();
  g.shadowColor = 'rgba(40, 10, 20, 0.5)';
  g.shadowBlur = w * 0.22;
  g.shadowOffsetY = w * 0.1;
  shape();
  const base = g.createLinearGradient(0, -h / 2, 0, h / 2);
  base.addColorStop(0, '#f6e6c4');
  base.addColorStop(1, '#d9b98a');
  g.fillStyle = base;
  g.fill();
  g.restore();
  g.save();
  shape();
  g.clip();
  for (let i = 0; i < 22; i++) {
    g.fillStyle = rnd() > 0.4 ? 'rgba(139, 58, 42, 0.88)' : 'rgba(170, 82, 54, 0.78)';
    g.beginPath();
    g.ellipse((rnd() - 0.5) * w, (rnd() - 0.5) * h, w * (0.03 + rnd() * 0.08), h * (0.03 + rnd() * 0.07), rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  const hi = g.createRadialGradient(-w * 0.18, -h * 0.2, 0, -w * 0.18, -h * 0.2, w * 0.32);
  hi.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
  hi.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = hi;
  g.fillRect(-w / 2, -h / 2, w, h);
  g.restore();
  shape();
  g.lineWidth = w * 0.035;
  g.strokeStyle = 'rgba(42, 26, 18, 0.6)';
  g.stroke();
  g.restore();
}

// Banderita de papel picado con orilla en zigzag y unos huecos
function flag(g, x, y, w, h, color, rot) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  g.moveTo(-w / 2, 0);
  g.lineTo(w / 2, 0);
  g.lineTo(w / 2, h);
  const teeth = 5;
  for (let i = teeth; i > 0; i--) {
    const x1 = -w / 2 + ((i - 0.5) / teeth) * w;
    const x0 = -w / 2 + ((i - 1) / teeth) * w;
    g.lineTo(x1, h - h * 0.12);
    g.lineTo(x0, h);
  }
  g.closePath();
  g.fillStyle = color;
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.arc(0, h * 0.45, w * 0.16, 0, Math.PI * 2);
  for (const [dx, dy] of [[-0.3, 0.2], [0.3, 0.2], [-0.3, 0.68], [0.3, 0.68]]) {
    g.moveTo(dx * w + w * 0.06, dy * h);
    g.arc(dx * w, dy * h, w * 0.06, 0, Math.PI * 2);
  }
  g.fill();
  g.restore();
}

const VARIANTS = {
  // 1. Rosa mexicano con rayos: El Corazón al frente, La Estrella detrás, un frijol
  rosa(g) {
    radial(g, [[0, '#ff5bb5'], [0.55, '#e4007c'], [1, '#8d004d']], S / 2, S * 0.45);
    sunburst(g, S / 2, S * 0.45, 16, 'rgba(255, 236, 246, 0.11)');
    card(g, renderCard(ESTRELLA, 420), 300, 228, 290, 0.22);
    card(g, renderCard(CORAZON, 420), 222, 274, 316, -0.13, undefined, (g, w, h) => bean(g, w * 0.17, h * 0.16, h * 0.2, -0.35));
  },
  // 2. Noche de kermés: papel picado y foquitos sobre el morado del juego
  noche(g) {
    const gr = g.createLinearGradient(0, 0, 0, S);
    gr.addColorStop(0, '#120a2c');
    gr.addColorStop(0.6, '#3b0f4f');
    gr.addColorStop(1, '#5a1a3c');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    radial(g, [[0, 'rgba(255, 176, 0, 0.28)'], [1, 'rgba(255, 176, 0, 0)']], S / 2, S * 0.6, S * 0.45);
    g.strokeStyle = '#f4e6c8';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-10, 58);
    g.quadraticCurveTo(S / 2, 108, S + 10, 58);
    g.stroke();
    const colors = ['#ff7a00', '#e4007c', '#ffc72c', '#10b5ae', '#7b3fe4', '#2fbf5b'];
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6;
      const x = t * S;
      const y = 58 + Math.sin(t * Math.PI) * 25 * 2 * (1 - Math.abs(0.5 - t)) - 6;
      flag(g, x, y, 78, 92, colors[i], (t - 0.5) * 0.25);
    }
    const bulbs = ['#ff5bb5', '#7ff0ff', '#ffd35c', '#9cff8a', '#fff4dc', '#ffb000', '#ff5bb5'];
    bulbs.forEach((c, i) => {
      const t = (i + 0.5) / bulbs.length;
      const x = t * S;
      const y = 186 + Math.sin(t * Math.PI) * 22;
      g.save();
      g.shadowColor = c;
      g.shadowBlur = 14;
      g.fillStyle = c;
      g.beginPath();
      g.arc(x, y, 8, 0, Math.PI * 2);
      g.fill();
      g.restore();
    });
    card(g, renderCard(CORAZON, 420), 250, 330, 262, -0.08, 'rgba(0, 0, 0, 0.55)', (g, w, h) => bean(g, w * 0.17, h * 0.16, h * 0.21, -0.35));
  },
  // 3. Cempasúchil: el reverso rosa de la carta («¡Lotería! en cadena») y El Sol asomándose
  cempasuchil(g) {
    radial(g, [[0, '#ffe08a'], [0.55, '#ffb000'], [1, '#d97700']], S / 2, S * 0.45);
    sunburst(g, S / 2, S * 0.45, 16, 'rgba(255, 255, 255, 0.16)');
    card(g, renderCard(SOL, 420), 304, 230, 290, 0.22, 'rgba(110, 50, 0, 0.45)');
    card(g, renderBack(420), 222, 274, 316, -0.13, 'rgba(110, 50, 0, 0.5)', (g, w, h) => bean(g, w * 0.2, h * 0.3, h * 0.2, -0.35));
  },
  // 4. Cempasúchil con El Corazón: resalta en la Polkadot App (que ya es rosa) y conserva la carta más tierna
  corazon(g) {
    radial(g, [[0, '#ffe08a'], [0.55, '#ffb000'], [1, '#d97700']], S / 2, S * 0.45);
    sunburst(g, S / 2, S * 0.45, 16, 'rgba(255, 255, 255, 0.16)');
    card(g, renderBack(420), 300, 228, 290, 0.22, 'rgba(110, 50, 0, 0.45)');
    card(g, renderCard(CORAZON, 420), 222, 274, 316, -0.13, 'rgba(110, 50, 0, 0.5)', (g, w, h) => bean(g, w * 0.17, h * 0.16, h * 0.2, -0.35));
  },
};

async function draw(name) {
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  VARIANTS[name](cv.getContext('2d'));
  return cv;
}

await loadFonts();
await document.fonts.ready;
const out = {};
for (const name of Object.keys(VARIANTS)) {
  const cv = await draw(name);
  cv.title = name;
  document.body.append(cv);
  out[name] = cv.toDataURL('image/png');
}
window.__iconos = out;
