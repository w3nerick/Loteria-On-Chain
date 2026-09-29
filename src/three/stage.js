// Escenario WebGL compartido: un renderer, un bucle y la escena activa.
import * as THREE from 'three';
import { setMaxAnisotropy } from './cards3d.js';

export const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor('#120a2c', 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.maxDpr = isTouch ? 2 : 1.75;
    setMaxAnisotropy(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()));
    this.active = null;
    this.clock = new THREE.Clock();
    this.t = 0;
    this.running = true;
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this._resize);
    document.addEventListener('visibilitychange', () => {
      this.running = !document.hidden;
      if (this.running) {
        this.clock.getDelta();
        this._loop();
      }
    });
    this.resize();
    this._loop = this._loop.bind(this);
    this._loop();
  }

  size() {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    return { w, h };
  }

  resize() {
    const { w, h } = this.size();
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.active?.resize(w, h, dpr);
  }

  setScene(scene) {
    if (this.active && this.active !== scene) this.active.dispose?.();
    this.active = scene;
    this.resize();
  }

  _loop() {
    if (!this.running) return;
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.1, this.clock.getDelta());
    this.t += dt;
    const a = this.active;
    if (!a) return;
    a.update(dt, this.t);
    this.renderer.render(a.scene, a.camera);
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// Utilidad: ancho/alto visibles a cierta distancia de la cámara
export function frustumAt(camera, distance) {
  const h = 2 * distance * Math.tan((camera.fov * Math.PI) / 360);
  return { w: h * camera.aspect, h };
}
