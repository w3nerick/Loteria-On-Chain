// Escenario WebGL compartido: un renderer, un bucle y la escena activa.
import * as THREE from 'three';
import { setMaxAnisotropy } from './cards3d.js';

export const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.maxDpr = isTouch ? 2 : 1.75;
    this.renderer = this._makeRenderer(canvas);
    this.active = null;
    this.clock = new THREE.Clock();
    this.t = 0;
    this.running = true;
    // Estado para la pantalla #diagnostico: el 3D es lo primero que se ve mal en un Host raro
    this.stats = { frames: 0, lastFrameAt: performance.now(), lost: 0, restored: 0, restarts: 0, timerFrames: 0, rebuilds: 0, error: '' };
    this._raf = 0;
    this._lostTimer = 0;
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this._resize);
    // Si el Host pausa la página o cambia el tamaño sin avisar, se retoma el dibujo
    document.addEventListener('visibilitychange', () => {
      this.running = true;
      this.clock.getDelta();
      this._kick();
    });
    this._bindCanvas(canvas);
    this._frame = this._frame.bind(this);
    this.resize();
    this._kick();
    // Vigilante: si rAF no dibuja en 1.5 s (página «oculta» a medias, cola parada…), dibuja desde un
    // temporizador y reinicia la cadena. Si el contexto sigue perdido, reconstruye el lienzo.
    this._watch = setInterval(() => {
      if (this.renderer.getContext()?.isContextLost?.()) {
        this._scheduleRebuild();
        return;
      }
      if (performance.now() - this.stats.lastFrameAt < 1500) return;
      this.stats.restarts += 1;
      this.resize();
      this._frame(true);
      this._kick();
    }, 1000);
  }

  _makeRenderer(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    r.setClearColor('#120a2c', 1);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    setMaxAnisotropy(Math.min(8, r.capabilities.getMaxAnisotropy()));
    return r;
  }

  // El navegador de la Polkadot App puede soltar el contexto WebGL (memoria, avisos nativos)
  _bindCanvas(canvas) {
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.stats.lost += 1;
      this._scheduleRebuild();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.stats.restored += 1;
      clearTimeout(this._lostTimer);
      this._lostTimer = 0;
      this.resize();
      this._kick();
    });
  }

  // Si tras 2.5 s el navegador no restauró el contexto, se cambia el lienzo por uno nuevo
  _scheduleRebuild() {
    if (this._lostTimer) return;
    this._lostTimer = setTimeout(() => {
      this._lostTimer = 0;
      if (this.renderer.getContext()?.isContextLost?.()) this._rebuild();
    }, 2500);
  }

  _rebuild() {
    try {
      const old = this.canvas;
      const fresh = document.createElement('canvas');
      fresh.id = old.id;
      fresh.setAttribute('aria-hidden', 'true');
      old.replaceWith(fresh);
      try {
        this.renderer.dispose();
      } catch {}
      this.canvas = fresh;
      this.renderer = this._makeRenderer(fresh);
      this._bindCanvas(fresh);
      // La tabla del jugador escucha los toques en el lienzo: hay que volver a engancharla
      if (this.active?.bindPointer) {
        this.active.dispose?.();
        this.active.bindPointer(fresh);
      }
      this.stats.rebuilds += 1;
      this.resize();
      this._kick();
    } catch (e) {
      this.stats.error = `reconstruir: ${String(e?.message || e).slice(0, 120)}`;
    }
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

  // Reinicia la cadena de requestAnimationFrame sin duplicarla
  _kick() {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(this._frame);
  }

  _frame(fromTimer = false) {
    if (fromTimer !== true) this._raf = requestAnimationFrame(this._frame);
    else this.stats.timerFrames += 1;
    const dt = Math.min(0.1, this.clock.getDelta());
    this.t += dt;
    const a = this.active;
    if (!a) return;
    try {
      a.update(dt, this.t);
    } catch (e) {
      // Un fallo al animar no debe dejar la pantalla vacía: se sigue dibujando
      this.stats.error = String(e?.message || e).slice(0, 160);
    }
    try {
      this.renderer.render(a.scene, a.camera);
      this.stats.frames += 1;
      this.stats.lastFrameAt = performance.now();
    } catch (e) {
      this.stats.error = String(e?.message || e).slice(0, 160);
    }
  }

  report() {
    const s = this.stats;
    const gl = this.renderer.getContext();
    const lostNow = gl?.isContextLost?.() ? 'sí' : 'no';
    return `3D: ${s.frames} cuadros · último hace ${Math.round((performance.now() - s.lastFrameAt) / 1000)} s · lienzo ${this.canvas.width}×${this.canvas.height} · contexto perdido ahora: ${lostNow} (${s.lost} veces, ${s.restored} restaurado) · reinicios del vigilante: ${s.restarts} (${s.timerFrames} cuadros por temporizador) · lienzo reconstruido: ${s.rebuilds} · página oculta: ${document.hidden ? 'sí' : 'no'}${s.error ? ` · último error: ${s.error}` : ''}`;
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
