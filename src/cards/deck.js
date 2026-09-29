// Baraja de "Lotería en Cadena": 54 cartas con arte y versos originales.
// La Cadena (26) y La Llave (38) sustituyen a dos cartas tradicionales
// que hoy se consideran estereotipos.
import { Painter, C } from './painter.js';
import { ART1 } from './art1.js';
import { ART2 } from './art2.js';
import { ART3 } from './art3.js';

const F = {
  rosa: '#e4007c', turquesa: '#0e9f9f', naranja: '#f26a00', verde: '#1f9a48',
  morado: '#6f2cb3', azul: '#2856c7', rojo: '#c81e3a', oro: '#d49a12',
};

const RAW = [
  ['El Gallo', 'turquesa', 'Madruga y canta sin reloj: es el primer bloque del sol.'],
  ['El Diablito', 'morado', 'Cuernitos y cola de flecha, siempre con una maldad hecha.'],
  ['La Dama', 'morado', 'Flor en el pelo y abanico en mano, luce su vestido de verano.'],
  ['El Catrín', 'rojo', 'Bigote peinado y bastón: el más catrín del salón.'],
  ['El Paraguas', 'naranja', 'Cuando llueve sobre el techo, él te cubre muy derecho.'],
  ['La Sirena', 'rosa', 'Peina su pelo en la roca y con su canto al mar provoca.'],
  ['La Escalera', 'azul', 'Peldaño a peldaño se sube, hasta tocar una nube.'],
  ['La Botella', 'rosa', 'Con corcho y de vidrio verde: el que la destapa no pierde.'],
  ['El Barril', 'azul', 'Redondo, panzón y de roble, guarda lo que es más noble.'],
  ['El Árbol', 'naranja', 'Raíces hondas, copa verde: quien lo cuida no lo pierde.'],
  ['El Melón', 'verde', 'Por fuera tiene su red, y por dentro, pura miel.'],
  ['El Valiente', 'azul', 'Máscara, capa y valor: ¡a dos de tres caídas, el mejor!'],
  ['El Gorrito', 'morado', 'Tejido por la abuela, te lo pones cuando hiela.'],
  ['La Muerte', 'naranja', 'Flaca, calva y muy puntual, a todos nos trata igual.'],
  ['La Pera', 'rojo', 'Cintura de guitarra y colita: la fruta más señorita.'],
  ['La Bandera', 'turquesa', 'Verde, blanco y colorado, ondea con el viento a su lado.'],
  ['El Bandolón', 'rojo', 'Cuerdas, trastes y un buen son: así suena el bandolón.'],
  ['El Violoncello', 'oro', 'Voz grave y muy elegante, con su arco va por delante.'],
  ['La Garza', 'rosa', 'En una pata se queda quieta, la garza más coqueta.'],
  ['El Pájaro', 'verde', 'Pío, pío, en la rama, canta y despierta a la dama.'],
  ['La Mano', 'azul', 'Cinco dedos y una palma: con ella saluda el alma.'],
  ['La Bota', 'turquesa', 'Bota de cuero y espuela: pisa fuerte y se va que vuela.'],
  ['La Luna', 'rosa', 'Redonda o en rebanada, ilumina la madrugada.'],
  ['El Cotorro', 'morado', 'Verde y muy parlanchín, repite todo sin fin.'],
  ['El Borracho', 'verde', '¡Hip, hip, qué mareo! Se le cayó hasta el sombrero.'],
  ['La Cadena', 'turquesa', 'Eslabón tras eslabón, bloque a bloque y sin patrón.'],
  ['El Corazón', 'azul', 'Late fuerte y sin permiso cuando pasa de improviso.'],
  ['La Sandía', 'rojo', 'Verde por fuera, roja por dentro, y con semillas en el centro.'],
  ['El Tambor', 'naranja', 'Tan, tan, tan, suena el tambor, marcando el paso con valor.'],
  ['El Camarón', 'morado', 'Doblado y colorado, sale del mar bien bronceado.'],
  ['Las Jaras', 'verde', 'Tres flechas van por el aire, derechito y con donaire.'],
  ['El Músico', 'rosa', 'Trompeta, sombrero y guitarrón: ¡que no pare el mariachi, patrón!'],
  ['La Araña', 'naranja', 'Ocho patas y mucha paciencia: teje su red con experiencia.'],
  ['El Soldado', 'rojo', 'Uno, dos, uno, dos: marcha el soldado a toda voz.'],
  ['La Estrella', 'oro', 'Siete picos de papel: ¡rómpela y llueven dulces a granel!'],
  ['El Cazo', 'turquesa', 'De cobre y bien martillado, prepara el dulce más preciado.'],
  ['El Mundo', 'naranja', 'Redondito y dando vueltas, con mares y tierras sueltas.'],
  ['La Llave', 'oro', 'Tu llave es tu tesoro: guárdala mejor que el oro.'],
  ['El Nopal', 'rosa', 'Pencas verdes, tunas rojas: ¡cuidado con sus espinas flojas!'],
  ['El Alacrán', 'azul', 'Con la cola en alto va; el que lo pisa lo sabrá.'],
  ['La Rosa', 'verde', 'Roja, fragante y con espinas, perfuma todas las esquinas.'],
  ['La Calavera', 'rosa', 'De azúcar y bien pintada, en la ofrenda es la invitada.'],
  ['La Campana', 'morado', 'Din, don, dan, desde el campanario, llama a todo el vecindario.'],
  ['El Cantarito', 'azul', 'De barro y bien fresquito, qué rico sabe en el cantarito.'],
  ['El Venado', 'naranja', 'Con sus cuernos de ramaje, corre libre por el paisaje.'],
  ['El Sol', 'rojo', 'Sale temprano y sin paga; calienta y nunca se apaga.'],
  ['La Corona', 'turquesa', 'Oro, perlas y rubí: la corona es para ti.'],
  ['La Chalupa', 'rosa', 'Por el canal va remando, flores y elotes llevando.'],
  ['El Pino', 'rojo', 'Alto, verde y puntiagudo, en el bosque es el más rudo.'],
  ['El Pescado', 'oro', 'Nada y nada sin parar, y nunca se cansa en el mar.'],
  ['La Palma', 'turquesa', 'Mece sus hojas en la playa, y de cocos nunca falla.'],
  ['La Maceta', 'verde', 'De barro y llena de flores, alegra todos los rincones.'],
  ['El Arpa', 'morado', 'Cuerdas de oro y de ilusión, suena el arpa en el salón.'],
  ['La Rana', 'rosa', 'Croac, croac, salta la rana desde la charca hasta mañana.'],
];

const ART = [...ART1, ...ART2, ...ART3];

export const DECK = RAW.map(([name, color, verse], i) => ({
  id: i,
  n: i + 1,
  name,
  color: F[color],
  verse,
  draw: ART[i],
}));

export const DECK_SIZE = DECK.length; // 54

// ---------------------------------------------------------------------------
// Render de cartas a canvas (con caché)

const BASE_W = 300;
const BASE_H = 450;
const cache = new Map();

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + amt * 255)));
  g = Math.max(0, Math.min(255, Math.round(g + amt * 255)));
  b = Math.max(0, Math.min(255, Math.round(b + amt * 255)));
  return `rgb(${r},${g},${b})`;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = Math.round(h);
  return c;
}

function paperTexture(g, x, y, w, h, rnd) {
  g.save();
  for (let i = 0; i < 260; i++) {
    const px = x + rnd() * w;
    const py = y + rnd() * h;
    g.fillStyle = rnd() > 0.5 ? 'rgba(120,80,30,0.07)' : 'rgba(255,255,255,0.35)';
    g.fillRect(px, py, 1.2 + rnd() * 1.6, 1.2 + rnd() * 1.6);
  }
  g.restore();
}

function fitText(g, text, maxW, size, family, weight = 700) {
  let s = size;
  do {
    g.font = `${weight} ${s}px ${family}`;
    if (g.measureText(text).width <= maxW) break;
    s -= 1;
  } while (s > 10);
  return s;
}

export function renderCard(index, width = 300) {
  const key = `${index}@${width}`;
  if (cache.has(key)) return cache.get(key);
  const card = DECK[index];
  const k = width / BASE_W;
  const cv = makeCanvas(BASE_W * k, BASE_H * k);
  const g = cv.getContext('2d');
  g.scale(k, k);
  const rnd = mulberry(1234 + index * 97);

  // Borde de color con lunares
  roundRect(g, 0, 0, BASE_W, BASE_H, 18);
  g.fillStyle = card.color;
  g.fill();
  g.fillStyle = 'rgba(255,244,220,0.55)';
  for (let x = 14; x < BASE_W - 8; x += 15) {
    g.beginPath();
    g.arc(x, 6, 1.9, 0, Math.PI * 2);
    g.arc(x, BASE_H - 6, 1.9, 0, Math.PI * 2);
    g.fill();
  }
  for (let y = 21; y < BASE_H - 12; y += 15) {
    g.beginPath();
    g.arc(6, y, 1.9, 0, Math.PI * 2);
    g.arc(BASE_W - 6, y, 1.9, 0, Math.PI * 2);
    g.fill();
  }

  // Papel
  roundRect(g, 12, 12, BASE_W - 24, BASE_H - 24, 10);
  g.fillStyle = C.paper;
  g.fill();
  paperTexture(g, 12, 12, BASE_W - 24, BASE_H - 24, rnd);

  // Ilustración
  const AX = 22;
  const AY = 22;
  const AW = 256;
  const AH = 333;
  g.save();
  roundRect(g, AX, AY, AW, AH, 6);
  g.clip();
  g.translate(AX, AY);
  g.scale(AW / 200, AW / 200);
  const p = new Painter(g);
  try {
    card.draw(p);
  } catch (e) {
    console.warn('arte', card.name, e);
  }
  g.restore();
  roundRect(g, AX, AY, AW, AH, 6);
  g.lineWidth = 3;
  g.strokeStyle = C.ink;
  g.stroke();

  // Número
  g.beginPath();
  g.arc(46, 46, 21, 0, Math.PI * 2);
  g.fillStyle = C.paper;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = C.ink;
  g.stroke();
  g.beginPath();
  g.arc(46, 46, 16.5, 0, Math.PI * 2);
  g.lineWidth = 2;
  g.strokeStyle = card.color;
  g.stroke();
  g.fillStyle = C.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${card.n > 9 ? 20 : 22}px Oswald, 'Arial Narrow', sans-serif`;
  g.fillText(String(card.n), 46, 47);

  // Listón con el nombre
  const dark = shade(card.color, -0.18);
  const ribbonY = 372;
  const ribbonH = 50;
  const tail = (dir) => {
    const x0 = dir < 0 ? 16 : BASE_W - 16;
    const x1 = dir < 0 ? 48 : BASE_W - 48;
    g.beginPath();
    g.moveTo(x1, ribbonY + 10);
    g.lineTo(x0, ribbonY + 10);
    g.lineTo(x0 + dir * -10, ribbonY + 10 + (ribbonH) / 2);
    g.lineTo(x0, ribbonY + 10 + ribbonH);
    g.lineTo(x1, ribbonY + 10 + ribbonH);
    g.closePath();
    g.fillStyle = dark;
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = C.ink;
    g.lineJoin = 'round';
    g.stroke();
  };
  tail(-1);
  tail(1);
  g.beginPath();
  g.moveTo(38, ribbonY);
  g.quadraticCurveTo(150, ribbonY - 7, BASE_W - 38, ribbonY);
  g.lineTo(BASE_W - 38, ribbonY + ribbonH);
  g.quadraticCurveTo(150, ribbonY + ribbonH - 7, 38, ribbonY + ribbonH);
  g.closePath();
  g.fillStyle = card.color;
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = C.ink;
  g.stroke();
  const label = card.name.toUpperCase();
  const fam = "Oswald, 'Arial Narrow', sans-serif";
  const size = fitText(g, label, 206, 33, fam);
  g.font = `700 ${size}px ${fam}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = size * 0.22;
  g.strokeStyle = C.ink;
  g.lineJoin = 'round';
  g.strokeText(label, 150, ribbonY + ribbonH / 2 - 2);
  g.fillStyle = '#ffffff';
  g.fillText(label, 150, ribbonY + ribbonH / 2 - 2);

  cache.set(key, cv);
  return cv;
}

export function renderBack(width = 300) {
  const key = `back@${width}`;
  if (cache.has(key)) return cache.get(key);
  const k = width / BASE_W;
  const cv = makeCanvas(BASE_W * k, BASE_H * k);
  const g = cv.getContext('2d');
  g.scale(k, k);
  roundRect(g, 0, 0, BASE_W, BASE_H, 18);
  g.fillStyle = '#c4006b';
  g.fill();
  roundRect(g, 12, 12, BASE_W - 24, BASE_H - 24, 10);
  g.fillStyle = F.rosa;
  g.fill();
  g.save();
  g.clip();
  g.fillStyle = 'rgba(255,244,220,0.22)';
  for (let y = 12, row = 0; y < BASE_H; y += 22, row++) {
    for (let x = 12 + (row % 2) * 11; x < BASE_W; x += 22) {
      g.beginPath();
      g.arc(x, y, 4, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
  roundRect(g, 20, 20, BASE_W - 40, BASE_H - 40, 8);
  g.lineWidth = 3;
  g.strokeStyle = C.paper;
  g.stroke();
  // Medallón de sol
  const cx = 150;
  const cy = 225;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r2 = i % 2 ? 118 : 132;
    g.beginPath();
    g.moveTo(cx + Math.cos(a - 0.09) * 94, cy + Math.sin(a - 0.09) * 94);
    g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    g.lineTo(cx + Math.cos(a + 0.09) * 94, cy + Math.sin(a + 0.09) * 94);
    g.closePath();
    g.fillStyle = i % 2 ? C.amarillo : C.naranja;
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = C.ink;
    g.stroke();
  }
  g.beginPath();
  g.arc(cx, cy, 98, 0, Math.PI * 2);
  g.fillStyle = C.paper;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = C.ink;
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, 88, 0, Math.PI * 2);
  g.lineWidth = 3;
  g.strokeStyle = F.turquesa;
  g.stroke();
  g.fillStyle = C.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const bs = fitText(g, '¡LOTERÍA!', 150, 34, 'Rye, Georgia, serif', 400);
  g.font = `400 ${bs}px Rye, Georgia, serif`;
  g.fillText('¡LOTERÍA!', cx, cy - 8);
  g.font = "italic 400 24px Alegreya, Georgia, serif";
  g.fillStyle = F.rosa;
  g.fillText('en cadena', cx, cy + 28);
  // Cuatro lunares en las esquinas
  [[48, 48], [252, 48], [48, 402], [252, 402]].forEach(([x, y]) => {
    g.beginPath();
    g.arc(x, y, 10, 0, Math.PI * 2);
    g.fillStyle = C.paper;
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = C.ink;
    g.stroke();
  });
  cache.set(key, cv);
  return cv;
}

export function clearCardCache() {
  cache.clear();
}
