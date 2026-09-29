// Escena de la pantalla grande: mazo, carta cantada que vuela y gira,
// tablero de "ya salieron", papel picado, foquitos y celebración.
import * as THREE from 'three';
import { makeCard, makeBackCard, preloadCards, setCardFace } from './cards3d.js';
import {
  nightBackdrop, PapelPicado, StringLights, Bokeh, Confetti, Fireworks, sunburst, sarapeTexture,
  canvasTexture, blobShadow, Tweens, ease, PALETTE,
} from './fx.js';
import { frustumAt } from './stage.js';

const SL = { cols: 9, rows: 6, wpx: 100, hpx: 150, gap: 10, left: 22, top: 108, W: 1024, H: 1094 };
const BOARD_W = 3.7;
const PXS = BOARD_W / SL.W;

function rr(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
}

function tableroTexture() {
  return canvasTexture(SL.W, SL.H, (g, W, H) => {
    rr(g, 0, 0, W, H, 40);
    g.fillStyle = '#5a2c12';
    g.fill();
    g.save();
    g.clip();
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(${Math.random() > 0.5 ? '30,12,4' : '120,60,24'},0.25)`;
      g.lineWidth = 1 + Math.random() * 3;
      g.beginPath();
      const y = Math.random() * H;
      g.moveTo(0, y);
      g.bezierCurveTo(W * 0.3, y + (Math.random() - 0.5) * 30, W * 0.6, y + (Math.random() - 0.5) * 30, W, y + (Math.random() - 0.5) * 20);
      g.stroke();
    }
    g.restore();
    rr(g, 14, 14, W - 28, H - 28, 28);
    g.fillStyle = '#1d1248';
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.035)';
    for (let y = 30; y < H; y += 26) for (let x = 30 + ((y / 26) % 2) * 13; x < W; x += 26) {
      g.beginPath();
      g.arc(x, y, 3, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#fff3d6';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = "400 50px Rye, Georgia, serif";
    g.fillText('YA SALIERON', W / 2, 62);
    for (let id = 0; id < 54; id++) {
      const col = id % SL.cols;
      const row = Math.floor(id / SL.cols);
      const x = SL.left + col * (SL.wpx + SL.gap);
      const y = SL.top + row * (SL.hpx + SL.gap);
      g.setLineDash([10, 8]);
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(255,243,214,0.3)';
      rr(g, x + 3, y + 3, SL.wpx - 6, SL.hpx - 6, 10);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = 'rgba(255,243,214,0.32)';
      g.font = "700 40px Oswald, 'Arial Narrow', sans-serif";
      g.fillText(String(id + 1), x + SL.wpx / 2, y + SL.hpx / 2 + 2);
    }
  });
}

const WIN_W = 4.8;
const WIN_H = 7.6;

function winnerBoardTexture(name) {
  return canvasTexture(640, Math.round((640 * WIN_H) / WIN_W), (g, W, H) => {
    rr(g, 0, 0, W, H, 34);
    g.fillStyle = '#e4007c';
    g.fill();
    g.fillStyle = 'rgba(255,243,214,0.35)';
    for (let x = 18; x < W; x += 20) {
      g.beginPath();
      g.arc(x, 9, 2.5, 0, Math.PI * 2);
      g.arc(x, H - 9, 2.5, 0, Math.PI * 2);
      g.fill();
    }
    rr(g, 18, 18, W - 36, H - 36, 22);
    g.fillStyle = '#fff3d6';
    g.fill();
    g.fillStyle = '#2a1a12';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = "400 40px Rye, Georgia, serif";
    g.fillText('TABLA GANADORA', W / 2, 58);
    g.font = "700 32px Oswald, 'Arial Narrow', sans-serif";
    g.fillStyle = '#e4007c';
    g.fillText(String(name || '').toUpperCase(), W / 2, H - 42);
  });
}

export class CantorScene {
  constructor({ reducedMotion = false } = {}) {
    this.reduced = reducedMotion;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 120);
    this.camera.position.set(0, 1.1, 12);
    this.camera.lookAt(0, 0.1, 0);
    this.tweens = new Tweens();

    const back = nightBackdrop(90, 56);
    back.position.z = -14;
    back.material.fog = false;
    this.scene.add(back);
    this.scene.fog = new THREE.Fog('#2d0e47', 13, 36);
    this.bokeh = new Bokeh(70, [30, 14, 8], [0, 1, -9]);
    this.scene.add(this.bokeh.points);
    this.decor = new THREE.Group();
    this.scene.add(this.decor);

    // Mesa con sarape
    const tex = sarapeTexture();
    tex.repeat.set(6, 3);
    tex.repeat.set(10, 12);
    this.table = new THREE.Mesh(new THREE.PlaneGeometry(90, 120), new THREE.MeshBasicMaterial({ map: tex, color: '#5a4870' }));
    this.table.rotation.x = -Math.PI / 2;
    this.scene.add(this.table);

    // Tablero
    this.tablero = new THREE.Group();
    const boardH = (SL.H / SL.W) * BOARD_W;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(BOARD_W, boardH), new THREE.MeshBasicMaterial({ map: tableroTexture(), transparent: true, alphaTest: 0.1 }));
    this.tablero.add(board);
    const boardBack = new THREE.Mesh(new THREE.BoxGeometry(BOARD_W * 0.985, boardH * 0.985, 0.08), new THREE.MeshBasicMaterial({ color: '#2e1508' }));
    boardBack.position.z = -0.045;
    this.tablero.add(boardBack);
    this.scene.add(this.tablero);
    this.slotScale = SL.wpx * PXS * 0.94;
    this.slotCards = new Map();

    // Mazo
    this.deck = new THREE.Group();
    const sideTex = canvasTexture(64, 64, (g, w, h) => {
      g.fillStyle = '#f3e3bf';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(120,70,30,0.35)';
      for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    }, { repeat: true });
    this.deckStack = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1.5), [
      new THREE.MeshBasicMaterial({ map: sideTex }),
      new THREE.MeshBasicMaterial({ map: sideTex }),
      makeBackCard({ px: 256 }).material[4],
      new THREE.MeshBasicMaterial({ color: '#d9c49a' }),
      new THREE.MeshBasicMaterial({ map: sideTex }),
      new THREE.MeshBasicMaterial({ map: sideTex }),
    ]);
    this.deckStack.geometry.translate(0, 0.5, 0);
    this.deck.add(this.deckStack);
    this.deckShadow = blobShadow(1.8, 2.4, 0.9);
    this.deckShadow.rotation.x = -Math.PI / 2;
    this.deckShadow.position.y = 0.005;
    this.deck.add(this.deckShadow);
    this.scene.add(this.deck);
    this.remaining = 54;

    // Destello y carta cantada
    this.burst = sunburst(6);
    this.scene.add(this.burst);
    this.featured = null;
    this.featPos = new THREE.Vector3();
    this.featScale = 2;

    this.confetti = new Confetti(800);
    this.scene.add(this.confetti.mesh);
    this.fireworks = new Fireworks(1000);
    this.scene.add(this.fireworks.points);

    this.carousel = [];
    this.transient = new Set();
    this.winner = null;
    this.fwTimer = 0;
    this.fwUntil = 0;
    this.lastAspect = 0;
    this.time = 0;
    this.onLand = null;

    preloadCards([...Array(54).keys()], 256);
    this.startLobby();
  }

  // Una sola animación de movimiento por carta: la nueva cancela la anterior
  _anim(mesh, dur, fn, opts = {}) {
    if (mesh.userData.tw) mesh.userData.tw.dead = true;
    const tw = this.tweens.add(dur, fn, opts);
    mesh.userData.tw = tw;
    return tw;
  }

  // --- geometría de pantalla ------------------------------------------------
  worldAt(fx, fy, z) {
    const v = new THREE.Vector3(fx * 2 - 1, -(fy * 2 - 1), 0.5).unproject(this.camera);
    const dir = v.sub(this.camera.position).normalize();
    const t = (z - this.camera.position.z) / dir.z;
    return this.camera.position.clone().add(dir.multiplyScalar(t));
  }

  visAt(z) {
    return frustumAt(this.camera, this.camera.position.z - z);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.portrait = this.camera.aspect < 1.15;
    this.layout();
  }

  layout() {
    this.camera.updateMatrixWorld(true);
    const P = this.portrait;
    const featZ = 1.6;
    const vf = this.visAt(featZ);
    if (P) {
      this.featPos.copy(this.worldAt(0.5, 0.33, featZ));
      this.featScale = (vf.h * 0.25) / 1.5;
    } else {
      this.featPos.copy(this.worldAt(0.465, 0.4, featZ));
      this.featScale = (vf.h * 0.5) / 1.5;
    }
    this.burst.position.copy(this.featPos).add(new THREE.Vector3(0, 0, -0.6));
    this.burst.scale.setScalar((this.featScale * 1.5 * 1.9) / 6);

    // Tablero
    const v0 = this.visAt(0);
    const boardH = (SL.H / SL.W) * BOARD_W;
    let s;
    if (P) {
      this.tablero.position.copy(this.worldAt(0.5, 0.755, 0));
      s = Math.min((v0.w * 0.92) / BOARD_W, (v0.h * 0.27) / boardH);
      this.tablero.rotation.set(0, 0, 0);
    } else {
      this.tablero.position.copy(this.worldAt(0.835, 0.47, 0));
      s = Math.min((v0.w * 0.28) / BOARD_W, (v0.h * 0.8) / boardH);
      this.tablero.rotation.set(0, -0.16, 0);
    }
    this.tablero.scale.setScalar(s);

    // Mesa y mazo
    const deckZ = 2.4;
    const vd = this.visAt(deckZ);
    const deckPos = P ? this.worldAt(0.87, 0.37, deckZ) : this.worldAt(0.765, 0.84, deckZ);
    this.deckScale = (vd.h * (P ? 0.075 : 0.15)) / 1.5;
    const tableY = deckPos.y - this.deckScale * 0.25;
    this.table.position.set(0, tableY, 2);
    this.table.visible = !P; // en vertical la mesa taparía el tablero
    this.deck.position.set(deckPos.x, tableY + 0.002, deckPos.z);
    this.deck.scale.setScalar(this.deckScale);
    this._setStack();

    // Decoración superior
    if (Math.abs(this.camera.aspect - this.lastAspect) > 0.05) {
      this.lastAspect = this.camera.aspect;
      this.decor.clear();
      const vz = this.visAt(-2);
      const size1 = Math.max(0.42, Math.min(0.66, this.visAt(-1.5).h * 0.07));
      const topL = this.worldAt(-0.05, -0.01, -1.5);
      const topR = this.worldAt(1.05, -0.01, -1.5);
      const p1 = new PapelPicado({ from: [topL.x, topL.y, -1.5], to: [topR.x, topR.y, -1.5], count: Math.round((topR.x - topL.x) / (size1 * 1.12)), sag: 0.2, size: size1 });
      const l2 = this.worldAt(-0.05, 0.02, -3.4);
      const r2 = this.worldAt(1.05, 0.02, -3.4);
      const p2 = new PapelPicado({ from: [l2.x, l2.y, -3.4], to: [r2.x, r2.y, -3.4], count: Math.round((r2.x - l2.x) / (size1 * 1.05)), sag: 0.35, size: size1 * 0.95, seed: 3 });
      const l3 = this.worldAt(-0.05, 0.115, -2.4);
      const r3 = this.worldAt(1.05, 0.115, -2.4);
      this.lights = new StringLights({ from: [l3.x, l3.y, -2.4], to: [r3.x, r3.y, -2.4], count: Math.round(vz.w * 2.2), sag: 0.35 });
      this.papel = [p1, p2];
      this.decor.add(p2.group, this.lights.group, p1.group);
    }

    // Recolocar lo que ya está en pantalla
    for (const [id, m] of this.slotCards) {
      m.position.copy(this.slotLocal(id));
      m.scale.setScalar(this.slotScale);
    }
    if (this.featured?.userData.settled) {
      this.featured.position.copy(this.featPos);
      this.featured.scale.setScalar(this.featScale);
    }
    if (this.winner?.userData.settled) this._placeWinner(this.winner);
  }

  slotLocal(id) {
    const col = id % SL.cols;
    const row = Math.floor(id / SL.cols);
    const cx = SL.left + col * (SL.wpx + SL.gap) + SL.wpx / 2;
    const cy = SL.top + row * (SL.hpx + SL.gap) + SL.hpx / 2;
    return new THREE.Vector3((cx - SL.W / 2) * PXS, (SL.H / 2 - cy) * PXS, 0.014);
  }

  _setStack() {
    const h = Math.max(0.02, (this.remaining / 54) * 0.55);
    this.deckStack.scale.set(1, h, 1);
    this.deckStack.visible = this.remaining > 0;
  }

  deckTopWorld() {
    const local = new THREE.Vector3(0, Math.max(0.02, (this.remaining / 54) * 0.55) + 0.02, 0);
    return this.deck.localToWorld(local);
  }

  setRemaining(n) {
    this.remaining = n;
    this._setStack();
  }

  // --- estados --------------------------------------------------------------
  startLobby() {
    this._clearCarousel();
    const ids = [];
    while (ids.length < 6) {
      const i = Math.floor(Math.random() * 54);
      if (!ids.includes(i)) ids.push(i);
    }
    this.carousel = ids.map((id, k) => {
      const m = makeCard(id, { px: 384 });
      m.userData.k = k;
      m.scale.setScalar(0.001);
      this.scene.add(m);
      this.tweens.add(0.8, (e) => m.scale.setScalar(Math.max(0.001, e * this.featScale * 0.4)), { delay: k * 0.12, easing: ease.outBack });
      return m;
    });
    this.burst.material.opacity = 0;
  }

  _clearCarousel() {
    for (const m of this.carousel) {
      this.scene.remove(m);
      m.userData.front?.dispose();
    }
    this.carousel = [];
  }

  // Al empezar: las cartas del carrusel vuelven al mazo y se barajea
  playShuffle() {
    const deckTop = this.deckTopWorld();
    this.carousel.forEach((m, k) => {
      m.userData.leaving = true;
      const p0 = m.position.clone();
      const s0 = m.scale.x;
      const r0 = m.rotation.clone();
      this.tweens.add(0.7, (e) => {
        m.position.lerpVectors(p0, deckTop, e);
        m.position.y += Math.sin(e * Math.PI) * 0.8;
        m.scale.setScalar(s0 + (this.deckScale - s0) * e);
        m.rotation.set(r0.x + (Math.PI / 2 - r0.x) * e, r0.y + Math.PI * e, 0);
      }, { delay: k * 0.07, onDone: () => this.scene.remove(m) });
    });
    this.carousel = [];
    if (this.reduced) return;
    const n = 16;
    for (let i = 0; i < n; i++) {
      const c = makeBackCard({ px: 256 });
      c.scale.setScalar(this.deckScale);
      c.position.copy(deckTop);
      c.rotation.x = Math.PI / 2;
      this.scene.add(c);
      this.transient.add(c);
      const a0 = (i / n) * Math.PI * 2;
      this.tweens.add(2.3, (e, u) => {
        const R = Math.sin(Math.PI * u) * this.deckScale * 3.2;
        const a = a0 + u * Math.PI * 4;
        c.position.set(deckTop.x + Math.cos(a) * R, deckTop.y + Math.sin(Math.PI * u) * this.deckScale * 3.5, deckTop.z + Math.sin(a) * R * 0.6);
        c.rotation.set(Math.PI / 2 + Math.sin(u * Math.PI * 2) * 0.6, a, u * Math.PI * 2);
      }, {
        delay: 0.6 + i * 0.03,
        easing: (t) => t,
        onDone: () => {
          this.scene.remove(c);
          this.transient.delete(c);
        },
      });
    }
  }

  dealCard(id) {
    if (this.featured) this._toTablero(this.featured);
    this.burst.material.opacity = 0;
    const mesh = makeCard(id, { px: 512 });
    const start = this.deckTopWorld();
    mesh.position.copy(start);
    mesh.rotation.set(Math.PI / 2, 0, 0);
    mesh.scale.setScalar(this.deckScale);
    mesh.userData.settled = false;
    this.scene.add(mesh);
    this.featured = mesh;
    const p0 = start.clone();
    const p2 = this.featPos.clone();
    const p1 = p0.clone().lerp(p2, 0.5);
    p1.y += this.portrait ? 1.2 : 2.4;
    p1.z += 1.2;
    const s0 = this.deckScale;
    const dur = this.reduced ? 0.5 : 1.25;
    this._anim(mesh, dur, (e) => {
      const a = (1 - e) * (1 - e);
      const b = 2 * (1 - e) * e;
      const c = e * e;
      mesh.position.set(a * p0.x + b * p1.x + c * this.featPos.x, a * p0.y + b * p1.y + c * this.featPos.y, a * p0.z + b * p1.z + c * this.featPos.z);
      mesh.rotation.x = (Math.PI / 2) * (1 - e);
      mesh.rotation.y = this.reduced ? 0 : e * Math.PI * 2;
      mesh.rotation.z = Math.sin(e * Math.PI) * 0.22;
      mesh.scale.setScalar(s0 + (this.featScale - s0) * e);
    }, { easing: ease.inOutCubic, onDone: () => this._landed(mesh, id) });
    return dur;
  }

  _landed(mesh, id) {
    if (mesh !== this.featured) return;
    mesh.userData.settled = true;
    mesh.userData.landT = this.time;
    this.tweens.add(0.5, (e) => {
      this.burst.material.opacity = e < 0.4 ? (e / 0.4) * 1.0 : 1.0 - ((e - 0.4) / 0.6) * 0.45;
    });
    this._anim(mesh, 0.45, (e) => mesh.scale.setScalar(this.featScale * (1.08 - 0.08 * e)), { easing: ease.outBack });
    if (!this.reduced) this.confetti.burst(this.featPos.x, this.featPos.y - this.featScale * 0.2, this.featPos.z - 0.3, 46, 4.2);
    this.onLand?.(id);
  }

  _toTablero(mesh) {
    const id = mesh.userData.id;
    mesh.userData.settled = false;
    const slot = this.slotLocal(id);
    this.tablero.updateMatrixWorld(true);
    const target = this.tablero.localToWorld(slot.clone());
    const qT = this.tablero.getWorldQuaternion(new THREE.Quaternion());
    const sT = this.tablero.scale.x * this.slotScale;
    const p0 = mesh.position.clone();
    const q0 = mesh.quaternion.clone();
    const s0 = mesh.scale.x;
    const p1 = p0.clone().lerp(target, 0.5);
    p1.y += 1.0;
    p1.z += 0.8;
    this._anim(mesh, this.reduced ? 0.4 : 0.85, (e) => {
      const a = (1 - e) * (1 - e);
      const b = 2 * (1 - e) * e;
      const c = e * e;
      mesh.position.set(a * p0.x + b * p1.x + c * target.x, a * p0.y + b * p1.y + c * target.y, a * p0.z + b * p1.z + c * target.z);
      mesh.quaternion.slerpQuaternions(q0, qT, e);
      mesh.scale.setScalar(s0 + (sT - s0) * e);
    }, {
      onDone: () => {
        this.tablero.attach(mesh);
        mesh.position.copy(slot);
        mesh.quaternion.identity();
        mesh.scale.setScalar(this.slotScale);
        setCardFace(mesh, id, 256);
        const prev = this.slotCards.get(id);
        if (prev && prev !== mesh) this.tablero.remove(prev);
        this.slotCards.set(id, mesh);
        this._anim(mesh, 0.35, (e) => mesh.scale.setScalar(this.slotScale * (1.3 - 0.3 * e)), { easing: ease.outBack });
      },
    });
  }

  // Coloca de golpe las cartas ya cantadas (al retomar una sala)
  restore(called) {
    for (const id of called.slice(0, -1)) {
      const m = makeCard(id, { px: 256 });
      m.position.copy(this.slotLocal(id));
      m.scale.setScalar(this.slotScale);
      this.tablero.add(m);
      this.slotCards.set(id, m);
    }
    this.setRemaining(54 - called.length);
    this._clearCarousel();
    const last = called[called.length - 1];
    if (last !== undefined) {
      const m = makeCard(last, { px: 512 });
      m.position.copy(this.featPos);
      m.scale.setScalar(this.featScale);
      m.userData.settled = true;
      this.scene.add(m);
      this.featured = m;
      this.burst.material.opacity = 0.55;
    }
  }

  // --- ganador --------------------------------------------------------------
  showWinner({ tabla, line, name }) {
    if (this.featured) {
      this._toTablero(this.featured);
      this.featured = null;
    }
    this.burst.material.opacity = 0;
    this.clearWinner(true);
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.PlaneGeometry(WIN_W, WIN_H), new THREE.MeshBasicMaterial({ map: winnerBoardTexture(name), transparent: true, alphaTest: 0.1 }));
    g.add(board);
    const cw = 0.98;
    const ch = cw * 1.5;
    const gx = 0.1;
    const lineSet = new Set(line || []);
    g.userData.glows = [];
    tabla.forEach((id, cell) => {
      const col = cell % 4;
      const row = Math.floor(cell / 4);
      const x = (col - 1.5) * (cw + gx);
      const y = -0.07 - (row - 1.5) * (ch + gx);
      const m = makeCard(id, { px: 256 });
      m.scale.setScalar(cw);
      m.position.set(x, y, 0.03);
      g.add(m);
      if (lineSet.has(cell)) {
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(cw * 1.22, ch * 1.16), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.position.set(x, y, 0.012);
        g.add(glow);
        g.userData.glows.push(glow);
        m.position.z = 0.12;
        m.userData.pulse = true;
      }
    });
    this.winner = g;
    this.scene.add(g);
    const start = this.worldAt(0.47, 1.6, 1.2);
    g.position.copy(start);
    g.rotation.set(-1.1, 0.3, 0.2);
    g.scale.setScalar(0.2);
    g.userData.settled = false;
    const target = this._winnerTarget();
    this.tweens.add(this.reduced ? 0.4 : 1.3, (e) => {
      g.position.lerpVectors(start, target.pos, e);
      g.rotation.set(-1.1 * (1 - e), 0.3 * (1 - e), 0.2 * (1 - e));
      g.scale.setScalar(0.2 + (target.scale - 0.2) * e);
    }, { easing: ease.outBack, onDone: () => (g.userData.settled = true) });
    // Fiesta
    const v = this.visAt(1);
    const top = this.worldAt(0.5, -0.05, 1).y;
    this.confetti.floor = this.worldAt(0.5, 1.1, 1).y;
    this.confetti.rain(v.w * 1.1, top, 1, this.reduced ? 120 : 420);
    if (!this.reduced) {
      this.confetti.burst(target.pos.x - 2, target.pos.y - 1, 1.5, 120, 6);
      this.confetti.burst(target.pos.x + 2, target.pos.y - 1, 1.5, 120, 6);
      this.fwUntil = this.time + 8;
    }
  }

  _winnerTarget() {
    const z = 1.2;
    const v = this.visAt(z);
    const pos = this.portrait ? this.worldAt(0.5, 0.56, z) : this.worldAt(0.465, 0.55, z);
    const scale = Math.min((v.h * (this.portrait ? 0.42 : 0.5)) / WIN_H, (v.w * (this.portrait ? 0.9 : 0.4)) / WIN_W);
    return { pos, scale };
  }

  _placeWinner(g) {
    const t = this._winnerTarget();
    g.position.copy(t.pos);
    g.scale.setScalar(t.scale);
  }

  clearWinner(instant = false) {
    const g = this.winner;
    if (!g) return;
    this.winner = null;
    if (instant) {
      this.scene.remove(g);
      return;
    }
    const p0 = g.position.clone();
    this.tweens.add(0.7, (e) => {
      g.position.y = p0.y - e * 10;
      g.rotation.x = e * 0.8;
    }, { onDone: () => this.scene.remove(g) });
  }

  // Nueva ronda: las cartas del tablero regresan al mazo
  resetRound() {
    this.clearWinner();
    this.fwUntil = 0;
    if (this.featured) {
      this.scene.remove(this.featured);
      this.featured = null;
    }
    this.burst.material.opacity = 0;
    const deckTop = () => this.deckTopWorld();
    let k = 0;
    for (const [id, m] of this.slotCards) {
      this.scene.attach(m);
      const p0 = m.position.clone();
      const q0 = m.quaternion.clone();
      const s0 = m.scale.x;
      const qT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      this.tweens.add(this.reduced ? 0.3 : 0.6, (e) => {
        const tgt = deckTop();
        m.position.lerpVectors(p0, tgt, e);
        m.position.y += Math.sin(e * Math.PI) * 0.9;
        m.quaternion.slerpQuaternions(q0, qT, e);
        m.scale.setScalar(s0 + (this.deckScale - s0) * e);
      }, {
        delay: this.reduced ? 0 : k * 0.03,
        onDone: () => {
          this.scene.remove(m);
          this.setRemaining(Math.min(54, this.remaining + 1));
        },
      });
      k++;
      void id;
    }
    this.slotCards.clear();
    setTimeout(() => {
      this.setRemaining(54);
      this.startLobby();
    }, this.reduced ? 300 : 900 + k * 30);
  }

  // --- bucle ------------------------------------------------------------------
  update(dt, t) {
    this.time = t;
    this.tweens.update(dt);
    this.bokeh.update(t);
    this.papel?.forEach((p) => p.update(t));
    this.lights?.update(t);
    this.confetti.update(dt, t);
    this.fireworks.update(dt, t);
    this.burst.rotation.z = t * 0.12;

    const f = this.featured;
    if (f && f.userData.settled) {
      const since = t - (f.userData.landT || 0);
      if (since > 0.5) {
        f.position.y = this.featPos.y + Math.sin(t * 1.3) * 0.05;
        f.rotation.y = Math.sin(t * 0.6) * 0.09;
        f.rotation.x = Math.sin(t * 0.45) * 0.035;
      }
    }
    // Carrusel en la sala de espera
    const n = this.carousel.length;
    this.carousel.forEach((m, k) => {
      if (m.userData.leaving) return;
      const a = t * 0.32 + (k / n) * Math.PI * 2;
      const R = this.featScale * (this.portrait ? 0.85 : 0.8);
      m.position.set(this.featPos.x + Math.cos(a) * R, this.featPos.y - this.featScale * 0.1 + Math.sin(a * 2 + k) * 0.08 * this.featScale, this.featPos.z + Math.sin(a) * 0.9 - 0.6);
      m.rotation.set(0, Math.cos(a) * -0.45, Math.sin(t + k) * 0.05);
    });
    // Ganador
    if (this.winner) {
      const pulse = 0.55 + 0.45 * Math.sin(t * 5);
      this.winner.userData.glows.forEach((gl) => (gl.material.opacity = pulse));
      if (this.winner.userData.settled) this.winner.rotation.y = Math.sin(t * 0.7) * 0.08;
    }
    if (this.fwUntil > t) {
      this.fwTimer -= dt;
      if (this.fwTimer <= 0) {
        this.fwTimer = 0.35 + Math.random() * 0.35;
        const p = this.worldAt(0.1 + Math.random() * 0.8, 0.12 + Math.random() * 0.3, -4);
        this.fireworks.burst(p.x, p.y, p.z);
      }
    }
  }

  dispose() {}
}

export { PALETTE };
