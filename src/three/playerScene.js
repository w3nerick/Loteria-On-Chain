// Escena del teléfono: la tabla 4×4 sobre un sarape y los frijolitos que caen.
import * as THREE from 'three';
import { makeCard, setCardFace } from './cards3d.js';
import { canvasTexture, sarapeTexture, blobShadow, blobTexture, Confetti, Tweens, ease } from './fx.js';

const CW = 1;
const CH = 1.5;
const GAP = 0.09;
const BW = 4 * CW + 3 * GAP + 0.46;
const BH = 4 * CH + 3 * GAP + 0.62 + 0.5;
const TILT = (13 * Math.PI) / 180;
const FOV = 30;

export function cellCenter(cell) {
  const col = cell % 4;
  const row = Math.floor(cell / 4);
  return new THREE.Vector3((col - 1.5) * (CW + GAP), -0.06 - (row - 1.5) * (CH + GAP), 0);
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
}

function boardTexture(code) {
  const S = 200;
  return canvasTexture(Math.round(BW * S), Math.round(BH * S), (g, W, H) => {
    rr(g, 0, 0, W, H, 36);
    g.fillStyle = '#e4007c';
    g.fill();
    g.fillStyle = 'rgba(255,243,214,0.4)';
    for (let x = 22; x < W - 10; x += 22) {
      g.beginPath();
      g.arc(x, 11, 3, 0, Math.PI * 2);
      g.arc(x, H - 11, 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let y = 33; y < H - 20; y += 22) {
      g.beginPath();
      g.arc(11, y, 3, 0, Math.PI * 2);
      g.arc(W - 11, y, 3, 0, Math.PI * 2);
      g.fill();
    }
    rr(g, 22, 22, W - 44, H - 44, 22);
    g.fillStyle = '#fff3d6';
    g.fill();
    g.fillStyle = '#2a1a12';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = "400 78px Rye, Georgia, serif";
    g.fillText('¡LOTERÍA!', W / 2, 78);
    g.font = "700 40px Oswald, 'Arial Narrow', sans-serif";
    g.fillStyle = '#e4007c';
    g.fillText(`TABLA  ${code}`, W / 2, H - 62);
  });
}

function beanTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#ecd6ab';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = Math.random() > 0.4 ? 'rgba(139,58,42,0.85)' : 'rgba(170,80,54,0.75)';
      g.beginPath();
      g.ellipse(Math.random() * w, Math.random() * h, 4 + Math.random() * 16, 2 + Math.random() * 7, Math.random() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#f7ecd6';
    g.beginPath();
    g.ellipse(w * 0.5, h * 0.52, 10, 5, 0, 0, Math.PI * 2);
    g.fill();
  });
}

function capTexture() {
  return canvasTexture(128, 128, (g, w) => {
    g.fillStyle = '#d7263d';
    g.beginPath();
    g.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fff3d6';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(w / 2, w / 2, w * 0.36, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#fff3d6';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? w * 0.12 : w * 0.28;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  });
}

function bounceOut(t) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

export class PlayerScene {
  constructor({ onTap, reducedMotion = false } = {}) {
    this.onTap = onTap;
    this.reduced = reducedMotion;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 0.5, 0.1, 100);
    this.tweens = new Tweens();
    this.insets = { top: 0, bottom: 0, left: 0, right: 0 };
    this.w = 400;
    this.h = 800;

    this.scene.add(new THREE.HemisphereLight('#fff6e6', '#5a2a55', 1.5));
    const sun = new THREE.DirectionalLight('#ffffff', 1.9);
    sun.position.set(2.5, 3, 7);
    this.scene.add(sun);

    const cloth = sarapeTexture();
    cloth.repeat.set(3, 3);
    cloth.rotation = Math.PI / 2;
    const table = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: cloth, color: '#b7a3c2' }));
    table.position.z = -0.06;
    this.scene.add(table);
    const shadow = blobShadow(BW * 1.35, BH * 1.2, 0.9);
    shadow.position.set(0.12, -0.18, -0.04);
    this.scene.add(shadow);

    this.board = new THREE.Group();
    this.scene.add(this.board);
    this.boardMesh = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 0.05), new THREE.MeshBasicMaterial({ color: '#b8005f' }));
    this.boardMesh.position.z = -0.025;
    this.board.add(this.boardMesh);
    this.boardTop = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.1 }));
    this.boardTop.position.z = 0.002;
    this.board.add(this.boardTop);

    this.cards = [];
    this.glows = [];
    for (let cell = 0; cell < 16; cell++) {
      const c = cellCenter(cell);
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(CW * 1.14, CH * 1.1),
        new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0, depthWrite: false }),
      );
      glow.position.set(c.x, c.y, 0.006);
      this.board.add(glow);
      this.glows.push({ mesh: glow, level: 0, target: 0, pulse: false, color: new THREE.Color('#ffd23f') });
    }
    this.markers = new Map();
    this.markerKind = 'frijol';
    this.beanGeo = new THREE.SphereGeometry(0.2, 22, 14);
    this.beanGeo.scale(1.3, 0.82, 0.55);
    this.beanMat = new THREE.MeshStandardMaterial({ map: beanTexture(), roughness: 0.35, metalness: 0 });
    this.capGeo = new THREE.CylinderGeometry(0.25, 0.27, 0.08, 26, 1);
    this.capGeo.rotateX(Math.PI / 2);
    const capSide = new THREE.MeshStandardMaterial({ color: '#c7cad6', metalness: 0.75, roughness: 0.3 });
    this.capMats = [capSide, new THREE.MeshStandardMaterial({ map: capTexture(), metalness: 0.25, roughness: 0.4 }), capSide];
    this.shadowMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false });

    this.confetti = new Confetti(360);
    this.confetti.floor = -9;
    this.scene.add(this.confetti.mesh);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.celebrating = false;
    this.time = 0;
  }

  bindPointer(el) {
    this.el = el;
    let down = null;
    this._down = (e) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    this._up = (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 18) return;
      const cell = this.pick(e.clientX, e.clientY);
      if (cell !== null) this.onTap?.(cell);
    };
    el.addEventListener('pointerdown', this._down);
    el.addEventListener('pointerup', this._up);
  }

  pick(clientX, clientY) {
    const r = this.el.getBoundingClientRect();
    this.pointer.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.cards, false);
    if (!hits.length) return null;
    return hits[0].object.userData.cell;
  }

  setTabla(tabla, code, animate = true) {
    this.boardTop.material.map?.dispose();
    this.boardTop.material.map = boardTexture(code);
    this.boardTop.material.needsUpdate = true;
    this.clearMarkers();
    this.clearHighlights();
    tabla.forEach((id, cell) => {
      let m = this.cards[cell];
      if (!m) {
        m = makeCard(id, { px: 320 });
        m.userData.cell = cell;
        this.cards[cell] = m;
        this.board.add(m);
      } else {
        setCardFace(m, id, 320);
        m.userData.cell = cell;
      }
      const c = cellCenter(cell);
      const endZ = 0.018;
      if (animate && !this.reduced) {
        const z0 = 3.2 + Math.random();
        const rz0 = (Math.random() - 0.5) * 1.2;
        m.position.set(c.x, c.y + 0.6, z0);
        m.rotation.set(0.4, 0, rz0);
        this.tweens.add(0.55, (e) => {
          m.position.set(c.x, c.y + 0.6 * (1 - e), z0 + (endZ - z0) * e);
          m.rotation.set(0.4 * (1 - e), 0, rz0 * (1 - e));
        }, { delay: cell * 0.045, easing: ease.outCubic });
      } else {
        m.position.set(c.x, c.y, endZ);
        m.rotation.set(0, 0, 0);
      }
      m.userData.home = new THREE.Vector3(c.x, c.y, endZ);
    });
  }

  setMarkerKind(kind) {
    this.markerKind = kind === 'corcholata' ? 'corcholata' : 'frijol';
    const cells = [...this.markers.keys()];
    this.clearMarkers();
    cells.forEach((cell) => this.dropMarker(cell, false));
  }

  _makeMarker() {
    if (this.markerKind === 'corcholata') return new THREE.Mesh(this.capGeo, this.capMats);
    return new THREE.Mesh(this.beanGeo, this.beanMat);
  }

  dropMarker(cell, animate = true) {
    if (this.markers.has(cell)) return;
    const c = cellCenter(cell);
    const rnd = Math.sin(cell * 12.9898 + (this.cards[cell]?.userData.id || 0) * 78.233) * 43758.5453;
    const jx = ((rnd % 1) - 0.5) * 0.18;
    const jy = (((rnd * 7) % 1) - 0.5) * 0.24;
    const mesh = this._makeMarker();
    const restZ = this.markerKind === 'corcholata' ? 0.075 : 0.085;
    const rot = ((rnd * 3) % 1) * Math.PI * 2;
    mesh.rotation.z = rot;
    mesh.position.set(c.x + jx, c.y + jy, restZ);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.5), this.shadowMat);
    shadow.position.set(c.x + jx + 0.05, c.y + jy - 0.06, 0.03);
    this.board.add(shadow, mesh);
    this.markers.set(cell, { mesh, shadow, restZ });
    if (animate && !this.reduced) {
      const z0 = 2.8;
      mesh.position.z = z0;
      shadow.scale.setScalar(0.3);
      shadow.material.opacity = 1;
      this.tweens.add(0.7, (e, k) => {
        const z = z0 + (restZ - z0) * bounceOut(k);
        mesh.position.z = z;
        mesh.rotation.x = Math.sin(k * 12) * 0.25 * (1 - k);
        mesh.rotation.y = Math.cos(k * 10) * 0.2 * (1 - k);
        const hgt = Math.min(1, (z - restZ) / z0);
        shadow.scale.setScalar(1 - hgt * 0.6);
      }, { easing: (t) => t });
    }
  }

  setMarks(cells) {
    for (const cell of cells) this.dropMarker(cell, false);
  }

  clearMarkers() {
    for (const { mesh, shadow } of this.markers.values()) this.board.remove(mesh, shadow);
    this.markers.clear();
  }

  bumpMarker(cell) {
    const m = this.markers.get(cell);
    if (!m) return;
    this.tweens.add(0.4, (e, k) => (m.mesh.position.z = m.restZ + Math.sin(k * Math.PI) * 0.35), { easing: (t) => t });
  }

  shake(cell) {
    const m = this.cards[cell];
    if (!m) return;
    this.tweens.add(0.45, (e, k) => (m.rotation.z = Math.sin(k * Math.PI * 6) * 0.09 * (1 - k)), { easing: (t) => t, onDone: () => (m.rotation.z = 0) });
    this.flash(cell, '#ff4d5e', 0.5);
  }

  flash(cell, color = '#ffd23f', dur = 0.9) {
    const gl = this.glows[cell];
    gl.mesh.material.color.set(color);
    this.tweens.add(dur, (e, k) => {
      if (!gl.pulse) gl.mesh.material.opacity = Math.sin(k * Math.PI) * 0.95;
    }, { easing: (t) => t });
  }

  hint(cell) {
    const m = this.cards[cell];
    this.flash(cell, '#ffd23f', 1.4);
    if (!m || this.reduced) return;
    const home = m.userData.home;
    this.tweens.add(0.6, (e, k) => (m.position.z = home.z + Math.sin(k * Math.PI) * 0.25), { easing: (t) => t });
  }

  showPattern(cells) {
    this.clearHighlights();
    for (const cell of cells) {
      const gl = this.glows[cell];
      gl.pulse = true;
      gl.mesh.material.color.set('#ffd23f');
    }
  }

  clearHighlights() {
    this.glows.forEach((g) => {
      g.pulse = false;
      g.mesh.material.opacity = 0;
    });
  }

  celebrate(cells = []) {
    this.celebrating = true;
    this.showPattern(cells);
    const top = 5;
    this.confetti.rain(8, top, 1.5, this.reduced ? 80 : 260);
    if (!this.reduced) {
      this.confetti.burst(-1.5, -2, 1, 90, 5.5);
      this.confetti.burst(1.5, -2, 1, 90, 5.5);
    }
    this._celebrateCells = cells;
  }

  stopCelebrate() {
    this.celebrating = false;
    this._celebrateCells = [];
    this.clearHighlights();
    for (const m of this.markers.values()) m.mesh.position.z = m.restZ;
  }

  setInsets(top, bottom, left = 0, right = 0) {
    this.insets = { top, bottom, left, right };
    this.fit();
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.camera.aspect = w / h;
    this.fit();
  }

  fit() {
    const { w: W, h: H } = this;
    const { top: T, bottom: B, left: L = 0, right: R = 0 } = this.insets;
    const avail = Math.max(120, H - T - B);
    const availW = Math.max(120, W - L - R);
    const margin = Math.min(8, availW * 0.02);
    const tan = Math.tan((FOV * Math.PI) / 360);
    const bh = BH * Math.cos(TILT) * (L + R > 0 ? 1.1 : 1.03); // holgura por la perspectiva (más en modo ancho)
    const d1 = (BW * H) / ((availW - 2 * margin) * 2 * tan);
    const d2 = (bh * H) / ((avail - 2 * margin) * 2 * tan);
    const D = Math.max(d1, d2);
    this.camera.position.set(0, -Math.sin(TILT) * D, Math.cos(TILT) * D);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.setViewOffset(W, H, -(L - R) / 2, -(T - B) / 2, W, H);
    this.camera.updateProjectionMatrix();
  }

  update(dt, t) {
    this.time = t;
    this.tweens.update(dt);
    this.confetti.update(dt, t);
    const pulse = 0.45 + 0.4 * Math.sin(t * 5);
    this.glows.forEach((g) => {
      if (g.pulse) g.mesh.material.opacity = pulse;
    });
    if (this.celebrating && this._celebrateCells) {
      this._celebrateCells.forEach((cell, i) => {
        const m = this.markers.get(cell);
        if (m) m.mesh.position.z = m.restZ + Math.abs(Math.sin(t * 5 + i * 0.6)) * 0.4;
      });
    }
  }

  dispose() {
    if (this.el) {
      this.el.removeEventListener('pointerdown', this._down);
      this.el.removeEventListener('pointerup', this._up);
    }
  }
}
