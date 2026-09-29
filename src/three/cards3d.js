// Cartas como mallas 3D delgadas (frente ilustrado, reverso rosa y canto de papel).
import * as THREE from 'three';
import { renderCard, renderBack } from '../cards/deck.js';

let maxAniso = 4;
export function setMaxAnisotropy(n) {
  maxAniso = n;
}

const texCache = new Map();

function toTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

export function cardTexture(id, px = 384) {
  const key = `${id}@${px}`;
  if (!texCache.has(key)) texCache.set(key, toTexture(renderCard(id, px)));
  return texCache.get(key);
}

export function backTexture(px = 384) {
  const key = `back@${px}`;
  if (!texCache.has(key)) texCache.set(key, toTexture(renderBack(px)));
  return texCache.get(key);
}

const geoCache = new Map();
function cardGeometry(w, h, d) {
  const key = `${w}x${h}x${d}`;
  if (!geoCache.has(key)) geoCache.set(key, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(key);
}

const edgeMat = new THREE.MeshBasicMaterial({ color: '#efe0bf' });
const backMats = new Map();

export function makeCard(id, { px = 384, w = 1, h = 1.5, d = 0.016 } = {}) {
  const front = new THREE.MeshBasicMaterial({ map: cardTexture(id, px), alphaTest: 0.5 });
  if (!backMats.has(px)) backMats.set(px, new THREE.MeshBasicMaterial({ map: backTexture(px), alphaTest: 0.5 }));
  const mesh = new THREE.Mesh(cardGeometry(w, h, d), [edgeMat, edgeMat, edgeMat, edgeMat, front, backMats.get(px)]);
  mesh.userData.id = id;
  mesh.userData.front = front;
  return mesh;
}

export function setCardFace(mesh, id, px = 384) {
  mesh.userData.id = id;
  mesh.userData.front.map = cardTexture(id, px);
  mesh.userData.front.needsUpdate = true;
}

export function makeBackCard({ px = 256, w = 1, h = 1.5, d = 0.016 } = {}) {
  if (!backMats.has(px)) backMats.set(px, new THREE.MeshBasicMaterial({ map: backTexture(px), alphaTest: 0.5 }));
  const b = backMats.get(px);
  return new THREE.Mesh(cardGeometry(w, h, d), [edgeMat, edgeMat, edgeMat, edgeMat, b, b]);
}

// Precarga progresiva de texturas para no congelar la pantalla
export function preloadCards(ids, px, onEach) {
  let i = 0;
  const step = () => {
    const t0 = performance.now();
    while (i < ids.length && performance.now() - t0 < 10) {
      cardTexture(ids[i], px);
      onEach?.(ids[i]);
      i++;
    }
    if (i < ids.length) setTimeout(step, 0);
  };
  step();
}
