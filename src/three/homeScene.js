// Portada: un abanico de cartas bajo papel picado y foquitos.
import * as THREE from 'three';
import { makeCard } from './cards3d.js';
import { nightBackdrop, PapelPicado, StringLights, Bokeh, ease } from './fx.js';
import { frustumAt } from './stage.js';

export class HomeScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.camera.position.set(0, 0, 10);
    this.scene.add(nightBackdrop(80, 50));
    this.scene.children[0].position.z = -12;
    this.bokeh = new Bokeh(50, [22, 12, 6], [0, 0, -7]);
    this.scene.add(this.bokeh.points);
    this.decor = new THREE.Group();
    this.scene.add(this.decor);

    this.fan = new THREE.Group();
    this.scene.add(this.fan);
    const ids = [];
    while (ids.length < 7) {
      const i = Math.floor(Math.random() * 54);
      if (!ids.includes(i)) ids.push(i);
    }
    this.cards = ids.map((id, k) => {
      const pivot = new THREE.Group();
      const card = makeCard(id, { px: 384 });
      card.position.set(0, 3.1, k * 0.02);
      pivot.add(card);
      pivot.position.y = -3.1;
      pivot.userData.base = (k - 3) * 0.2;
      pivot.rotation.z = pivot.userData.base;
      this.fan.add(pivot);
      return { pivot, card };
    });
    this.popIndex = 0;
    this.popT = 0;
    this.lastAspect = 0;
  }

  _decorate() {
    this.decor.clear();
    const at = (z) => frustumAt(this.camera, 10 - z);
    const v1 = at(-1.5);
    const v2 = at(-3.2);
    const v3 = at(-2.2);
    const size1 = Math.max(0.42, Math.min(0.62, v1.h * 0.075));
    const size2 = size1 * 0.95;
    const p1 = new PapelPicado({ from: [-v1.w / 2 - 0.6, v1.h / 2 + 0.04, -1.5], to: [v1.w / 2 + 0.6, v1.h / 2 + 0.04, -1.5], count: Math.max(6, Math.round((v1.w + 1.2) / (size1 * 1.12))), sag: 0.16, size: size1 });
    const p2 = new PapelPicado({ from: [-v2.w / 2 - 0.6, v2.h / 2 - 0.1, -3.2], to: [v2.w / 2 + 0.6, v2.h / 2 - 0.1, -3.2], count: Math.max(6, Math.round((v2.w + 1.2) / (size2 * 1.12))), sag: 0.3, size: size2, seed: 3 });
    const ly = v3.h / 2 - size1 * 1.25 - 0.18;
    const lights = new StringLights({ from: [-v3.w / 2 - 0.4, ly, -2.2], to: [v3.w / 2 + 0.4, ly, -2.2], count: Math.max(10, Math.round(v3.w * 1.8)), sag: 0.32 });
    this.papel = [p1, p2];
    this.lights = lights;
    this.decor.add(p2.group, lights.group, p1.group);
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (Math.abs(this.camera.aspect - this.lastAspect) > 0.02) {
      this._decorate();
      this.lastAspect = this.camera.aspect;
    }
    this._fitFan();
  }

  // Hueco libre (en px) entre el título y los botones, medido por la interfaz
  setFrame(topPx, bottomPx) {
    this.frame = { top: topPx, bottom: bottomPx };
    this._fitFan();
  }

  _fitFan() {
    const vis = frustumAt(this.camera, 10);
    const H = this.h || 800;
    const fr = this.frame || { top: H * 0.3, bottom: H * 0.7 };
    const gapH = Math.max(40, fr.bottom - fr.top);
    const centerPx = (fr.top + fr.bottom) / 2;
    const FAN_W = 5.3;
    const FAN_H = 2.85;
    const s = Math.min(1.3, (vis.w * 0.9) / FAN_W, ((gapH / H) * vis.h * 0.92) / FAN_H);
    this.fan.scale.setScalar(s);
    this.fan.position.y = (0.5 - centerPx / H) * vis.h + 0.07 * s;
  }

  update(dt, t) {
    this.bokeh.update(t);
    this.papel?.forEach((p) => p.update(t));
    this.lights?.update(t);
    this.fan.rotation.y = Math.sin(t * 0.35) * 0.18;
    this.fan.rotation.x = Math.sin(t * 0.27) * 0.05;
    this.popT += dt;
    const cycle = 2.6;
    if (this.popT > cycle) {
      this.popT = 0;
      this.popIndex = (this.popIndex + 1 + Math.floor(Math.random() * 3)) % this.cards.length;
    }
    this.cards.forEach(({ pivot, card }, k) => {
      const sway = Math.sin(t * 0.8 + k) * 0.015;
      pivot.rotation.z = pivot.userData.base + sway;
      let lift = 0;
      let spin = 0;
      if (k === this.popIndex) {
        const u = this.popT / cycle;
        const up = u < 0.5 ? ease.outCubic(u / 0.5) : 1 - ease.inOutCubic((u - 0.5) / 0.5);
        lift = up * 0.55;
        spin = ease.inOutCubic(Math.min(1, u / 0.6)) * Math.PI * 2;
      }
      card.position.y = 3.1 + lift;
      card.position.z = k * 0.02 + lift * 0.6;
      card.rotation.y = spin;
    });
  }

  dispose() {}
}
