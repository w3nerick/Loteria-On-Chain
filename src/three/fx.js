// Efectos compartidos: papel picado, foquitos, confeti, chispas, fuegos
// artificiales, destello de sol y texturas generadas en canvas.
import * as THREE from 'three';

export const PALETTE = ['#e4007c', '#ffc72c', '#10b5ae', '#ff7a00', '#7b2cbf', '#2ba84a', '#2f6bd8', '#d7263d'];

export function canvasTexture(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

let _glowTex = null;
export function glowTexture() {
  if (_glowTex) return _glowTex;
  _glowTex = canvasTexture(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, w);
  });
  return _glowTex;
}

let _blobTex = null;
export function blobTexture() {
  if (_blobTex) return _blobTex;
  _blobTex = canvasTexture(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(20,8,30,0.55)');
    gr.addColorStop(0.6, 'rgba(20,8,30,0.2)');
    gr.addColorStop(1, 'rgba(20,8,30,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, w);
  });
  return _blobTex;
}

export function blobShadow(w, h, opacity = 1) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity }),
  );
  return m;
}

// Luz de lámpara sobre la mesa: penumbra con un hueco suave del tamaño de la tabla
// (w×h), para que el sarape se vea junto a ella y se apague hacia las orillas.
export function tableVignette(w, h, { spread = 8, soft = 0.5, opacity = 0.8, color = '#120a2c' } = {}) {
  const S = 512;
  const tex = canvasTexture(S, S, (g) => {
    g.globalAlpha = opacity;
    g.fillStyle = color;
    g.fillRect(0, 0, S, S);
    g.globalAlpha = 1;
    // El hueco se corta con su propia sombra difusa: el borde queda suave
    const hw = S / spread;
    const blur = (soft / w) * hw;
    g.globalCompositeOperation = 'destination-out';
    g.shadowColor = '#000';
    g.shadowBlur = blur * 2;
    g.shadowOffsetX = S * 4;
    g.fillStyle = '#000';
    g.beginPath();
    if (g.roundRect) g.roundRect(S / 2 - hw / 2 - S * 4, S / 2 - hw / 2, hw, hw, hw * 0.06);
    else g.rect(S / 2 - hw / 2 - S * 4, S / 2 - hw / 2, hw, hw);
    g.fill();
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w * spread, h * spread), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
}

// Fondo de noche con degradado
export function nightBackdrop(width = 60, height = 34, top = '#0c0826', bottom = '#3b0f4f') {
  const tex = canvasTexture(16, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, top);
    gr.addColorStop(0.62, bottom);
    gr.addColorStop(1, '#5a1a3c');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tex, depthWrite: false }));
  m.renderOrder = -10;
  return m;
}

// Sarape (mantel de rayas) para la mesa
export function sarapeTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    const bands = [
      ['#1b1450', 34], ['#e4007c', 18], ['#ffc72c', 6], ['#e4007c', 18], ['#10b5ae', 10], ['#fff4dc', 4], ['#ff7a00', 22],
      ['#2a1a12', 4], ['#ffc72c', 12], ['#2ba84a', 16], ['#fff4dc', 4], ['#7b2cbf', 26], ['#e4007c', 8], ['#ff7a00', 12],
    ];
    const total = bands.reduce((a, b) => a + b[1], 0);
    let y = 0;
    while (y < h) {
      for (const [c, bh] of bands) {
        const hh = (bh / total) * h;
        g.fillStyle = c;
        g.fillRect(0, y, w, hh + 0.5);
        y += hh;
      }
    }
    // Hilo tejido
    g.globalAlpha = 0.08;
    for (let x = 0; x < w; x += 3) {
      g.fillStyle = x % 6 ? '#000' : '#fff';
      g.fillRect(x, 0, 1, h);
    }
    g.globalAlpha = 1;
  }, { repeat: true });
}

// ---------------------------------------------------------------------------
// Papel picado
function papelDesign(g, w, h, color, kind) {
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  // Borde inferior en picos
  const n = 8;
  g.beginPath();
  g.moveTo(0, h);
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w;
    g.lineTo(x, h - (i % 2 ? 0 : 22));
  }
  g.lineTo(w, h);
  g.closePath();
  g.fill();
  // Fila de rombos arriba y abajo
  for (let x = 20; x < w; x += 28) {
    for (const y of [26, h - 56]) {
      g.beginPath();
      g.moveTo(x, y - 7);
      g.lineTo(x + 6, y);
      g.lineTo(x, y + 7);
      g.lineTo(x - 6, y);
      g.closePath();
      g.fill();
    }
  }
  const cx = w / 2;
  const cy = h * 0.47;
  if (kind === 0) {
    // Flor
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.ellipse(cx + Math.cos(a) * 42, cy + Math.sin(a) * 42, 22, 11, a, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    g.arc(cx, cy, 16, 0, Math.PI * 2);
    g.fill();
  } else if (kind === 1) {
    // Estrella
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? 26 : 70;
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  } else if (kind === 2) {
    // Corazón con puntos
    g.beginPath();
    g.moveTo(cx, cy + 50);
    g.bezierCurveTo(cx - 70, cy, cx - 50, cy - 60, cx, cy - 26);
    g.bezierCurveTo(cx + 50, cy - 60, cx + 70, cy, cx, cy + 50);
    g.fill();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = color;
    g.beginPath();
    g.arc(cx, cy - 2, 12, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
  } else {
    // Sol con lunares
    g.beginPath();
    g.arc(cx, cy, 34, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.arc(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58, 8, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Lunares sueltos
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.beginPath();
    g.arc(cx + Math.cos(a) * 96, cy + Math.sin(a) * 86, 5, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
}

const papelTextures = [];
function papelTexture(i) {
  if (!papelTextures[i]) {
    papelTextures[i] = canvasTexture(256, 320, (g, w, h) => papelDesign(g, w, h, PALETTE[i % PALETTE.length], i % 4));
  }
  return papelTextures[i];
}

export class PapelPicado {
  constructor({ from, to, count = 12, sag = 0.5, size = 0.9, seed = 0 }) {
    this.group = new THREE.Group();
    this.uTime = { value: 0 };
    const mats = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.MeshBasicMaterial({ map: papelTexture(i), side: THREE.DoubleSide, alphaTest: 0.5, transparent: false, fog: false });
      m.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = this.uTime;
        shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float amp = 1.0 - uv.y;
          float ph = modelMatrix[3][0] * 1.9 + modelMatrix[3][2] * 2.3;
          transformed.z += sin(uTime * 2.1 + ph + position.x * 2.4) * 0.12 * amp * ${size.toFixed(2)};
          transformed.x += sin(uTime * 1.3 + ph) * 0.035 * amp;`,
        );
      };
      m.customProgramCacheKey = () => 'papel-picado';
      mats.push(m);
    }
    const geo = new THREE.PlaneGeometry(size, size * 1.25, 6, 6);
    geo.translate(0, -size * 0.625, 0);
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    // Cordel
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * Math.PI) * sag;
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    this.group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.012, 5), new THREE.MeshBasicMaterial({ color: '#f4e6c8', fog: false })));
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const p = curve.getPoint(t);
      const flag = new THREE.Mesh(geo, mats[(i + seed) % mats.length]);
      flag.position.copy(p);
      flag.rotation.z = (Math.random() - 0.5) * 0.12;
      this.group.add(flag);
    }
  }
  update(t) {
    this.uTime.value = t;
  }
}

// ---------------------------------------------------------------------------
// Puntos luminosos (foquitos, bokeh, chispas)
const glowVS = `
attribute float aSize; attribute vec3 aColor; attribute float aPhase;
uniform float uTime; uniform float uScale; uniform float uTwinkle;
varying vec3 vColor; varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 1.0 - uTwinkle + uTwinkle * (0.5 + 0.5 * sin(uTime * 2.3 + aPhase));
  gl_PointSize = aSize * uScale * tw / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
  vColor = aColor; vAlpha = tw;
}`;
const glowFS = `
uniform sampler2D uMap; uniform float uOpacity;
varying vec3 vColor; varying float vAlpha;
void main(){
  vec4 t = texture2D(uMap, gl_PointCoord);
  float a = t.a * vAlpha * uOpacity;
  gl_FragColor = vec4(vColor * a, a);
}`;

export class GlowPoints {
  constructor(n, { twinkle = 0.5, opacity = 1, scale = 300 } = {}) {
    this.n = n;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3);
    this.size = new Float32Array(n);
    this.color = new Float32Array(n * 3);
    this.phase = new Float32Array(n);
    for (let i = 0; i < n; i++) this.phase[i] = Math.random() * 10;
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3));
    this.geo.setAttribute('aPhase', new THREE.BufferAttribute(this.phase, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: scale },
        uTwinkle: { value: twinkle },
        uOpacity: { value: opacity },
        uMap: { value: glowTexture() },
      },
      vertexShader: glowVS,
      fragmentShader: glowFS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
  }
  set(i, x, y, z, size, hex) {
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.size[i] = size;
    const c = new THREE.Color(hex);
    this.color[i * 3] = c.r;
    this.color[i * 3 + 1] = c.g;
    this.color[i * 3 + 2] = c.b;
  }
  commit() {
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
  }
  update(t) {
    this.mat.uniforms.uTime.value = t;
  }
  setPixelScale(px) {
    this.mat.uniforms.uScale.value = px;
  }
}

// Foquitos colgados en catenaria
export class StringLights {
  constructor({ from, to, count = 22, sag = 0.7 }) {
    this.group = new THREE.Group();
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const q = a.clone().lerp(b, t);
      q.y -= (1 - Math.pow(2 * t - 1, 2)) * sag; // más bajo al centro
      pts.push(q);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    this.group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.01, 4), new THREE.MeshBasicMaterial({ color: '#1a1022', fog: false })));
    this.bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }), count);
    this.glow = new GlowPoints(count, { twinkle: 0.35, scale: 420 });
    const colors = ['#ffd36b', '#ff6fb1', '#7fe6ff', '#ffb347', '#b7ff7a', '#ffffff'];
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const p = curve.getPoint(t);
      p.y -= 0.06;
      m.makeTranslation(p.x, p.y, p.z);
      this.bulbs.setMatrixAt(i, m);
      const col = colors[i % colors.length];
      this.bulbs.setColorAt(i, new THREE.Color(col));
      this.glow.set(i, p.x, p.y, p.z, 1.6, col);
    }
    this.glow.commit();
    this.group.add(this.bulbs, this.glow.points);
  }
  update(t) {
    this.glow.update(t);
  }
}

// Bokeh de fondo
export class Bokeh {
  constructor(n = 60, box = [16, 9, 6], center = [0, 0, -5]) {
    this.gp = new GlowPoints(n, { twinkle: 0.6, opacity: 0.55, scale: 380 });
    this.base = [];
    for (let i = 0; i < n; i++) {
      const x = center[0] + (Math.random() - 0.5) * box[0];
      const y = center[1] + (Math.random() - 0.5) * box[1];
      const z = center[2] + (Math.random() - 0.5) * box[2];
      this.base.push([x, y, z, Math.random() * 6]);
      this.gp.set(i, x, y, z, 1.2 + Math.random() * 3.5, PALETTE[i % PALETTE.length]);
    }
    this.gp.commit();
    this.points = this.gp.points;
  }
  update(t) {
    this.gp.update(t);
    for (let i = 0; i < this.base.length; i++) {
      const [x, y, z, ph] = this.base[i];
      this.gp.pos[i * 3] = x + Math.sin(t * 0.2 + ph) * 0.3;
      this.gp.pos[i * 3 + 1] = y + Math.cos(t * 0.17 + ph) * 0.25;
      this.gp.pos[i * 3 + 2] = z;
    }
    this.gp.geo.attributes.position.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Confeti
export class Confetti {
  constructor(max = 700) {
    this.max = max;
    const geo = new THREE.PlaneGeometry(0.07, 0.12);
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.p = [];
    const col = new THREE.Color();
    for (let i = 0; i < max; i++) {
      col.set(PALETTE[i % PALETTE.length]);
      this.mesh.setColorAt(i, col);
      this.p.push({ alive: false, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, ax: 0, ay: 0, az: 0, ph: Math.random() * 6, life: 0 });
    }
    this.mesh.instanceColor.needsUpdate = true;
    this.cursor = 0;
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
    this.s = new THREE.Vector3(1, 1, 1);
    this.v = new THREE.Vector3();
    this.floor = -6;
    this.hideAll();
  }
  hideAll() {
    for (let i = 0; i < this.max; i++) {
      this.m.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  burst(x, y, z, n = 150, power = 5, spread = Math.PI * 2) {
    for (let k = 0; k < n; k++) {
      const p = this.p[this.cursor];
      this.cursor = (this.cursor + 1) % this.max;
      const a = Math.random() * spread - spread / 2 + Math.PI / 2;
      const sp = power * (0.4 + Math.random() * 0.8);
      Object.assign(p, {
        alive: true,
        x, y, z,
        vx: Math.cos(a) * sp * (0.6 + Math.random() * 0.6),
        vy: Math.sin(a) * sp,
        vz: (Math.random() - 0.5) * sp * 0.8,
        rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
        ax: (Math.random() - 0.5) * 14, ay: (Math.random() - 0.5) * 14, az: (Math.random() - 0.5) * 8,
        life: 0,
      });
    }
  }
  rain(width, top, z, n = 300) {
    for (let k = 0; k < n; k++) {
      const p = this.p[this.cursor];
      this.cursor = (this.cursor + 1) % this.max;
      Object.assign(p, {
        alive: true,
        x: (Math.random() - 0.5) * width,
        y: top + Math.random() * 6,
        z: z + (Math.random() - 0.5) * 3,
        vx: (Math.random() - 0.5) * 0.6, vy: -0.6 - Math.random() * 0.8, vz: 0,
        rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
        ax: (Math.random() - 0.5) * 10, ay: (Math.random() - 0.5) * 10, az: (Math.random() - 0.5) * 6,
        life: 0,
      });
    }
  }
  update(dt, t) {
    let any = false;
    for (let i = 0; i < this.max; i++) {
      const p = this.p[i];
      if (!p.alive) continue;
      any = true;
      p.life += dt;
      p.vy -= 3.2 * dt;
      const drag = Math.pow(0.35, dt);
      p.vx *= drag;
      p.vz *= drag;
      p.vy = Math.max(p.vy * Math.pow(0.6, dt), -1.6);
      p.x += (p.vx + Math.sin(t * 3 + p.ph) * 0.35) * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rx += p.ax * dt;
      p.ry += p.ay * dt;
      p.rz += p.az * dt;
      if (p.y < this.floor || p.life > 14) {
        p.alive = false;
        this.m.makeScale(0, 0, 0);
      } else {
        this.e.set(p.rx, p.ry, p.rz);
        this.q.setFromEuler(this.e);
        this.v.set(p.x, p.y, p.z);
        this.m.compose(this.v, this.q, this.s);
      }
      this.mesh.setMatrixAt(i, this.m);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// Fuegos artificiales con puntos luminosos
export class Fireworks {
  constructor(max = 900) {
    this.gp = new GlowPoints(max, { twinkle: 0.2, scale: 360 });
    this.max = max;
    this.parts = Array.from({ length: max }, () => ({ alive: false }));
    this.cursor = 0;
    for (let i = 0; i < max; i++) this.gp.set(i, 0, -99, 0, 0, '#ffffff');
    this.gp.commit();
    this.points = this.gp.points;
  }
  burst(x, y, z, color = null, n = 90) {
    const col = color || PALETTE[Math.floor(Math.random() * PALETTE.length)];
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const sp = 1.6 + Math.random() * 1.4;
      this.parts[i] = {
        alive: true, x, y, z,
        vx: Math.sin(ph) * Math.cos(th) * sp,
        vy: Math.sin(ph) * Math.sin(th) * sp,
        vz: Math.cos(ph) * sp * 0.5,
        life: 0, max: 1.4 + Math.random() * 0.6, col,
      };
      this.gp.set(i, x, y, z, 1.4, col);
    }
  }
  update(dt, t) {
    this.gp.update(t);
    let dirty = false;
    for (let i = 0; i < this.max; i++) {
      const p = this.parts[i];
      if (!p.alive) continue;
      dirty = true;
      p.life += dt;
      p.vy -= 1.2 * dt;
      const drag = Math.pow(0.4, dt);
      p.vx *= drag;
      p.vy *= drag;
      p.vz *= drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const k = 1 - p.life / p.max;
      if (k <= 0) {
        p.alive = false;
        this.gp.size[i] = 0;
      } else {
        this.gp.pos[i * 3] = p.x;
        this.gp.pos[i * 3 + 1] = p.y;
        this.gp.pos[i * 3 + 2] = p.z;
        this.gp.size[i] = 1.8 * k;
      }
    }
    if (dirty) {
      this.gp.geo.attributes.position.needsUpdate = true;
      this.gp.geo.attributes.aSize.needsUpdate = true;
      this.gp.geo.attributes.aColor.needsUpdate = true;
    }
  }
}

// Destello de sol (rayos) detrás de la carta cantada
export function sunburst(size = 6) {
  const tex = canvasTexture(512, 512, (g, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const n = 24;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = a0 + Math.PI / n;
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, w / 2, a0, a1);
      g.closePath();
      g.fillStyle = i % 2 ? 'rgba(255,199,44,0.9)' : 'rgba(255,122,0,0.9)';
      g.fill();
    }
    g.globalCompositeOperation = 'destination-in';
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.35, 'rgba(0,0,0,0.75)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.0, blending: THREE.AdditiveBlending }),
  );
  return m;
}

// Suavizados
export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

// Pequeño gestor de animaciones por tiempo
export class Tweens {
  constructor() {
    this.list = [];
  }
  add(duration, onUpdate, { delay = 0, onDone = null, easing = ease.inOutCubic } = {}) {
    const tw = { t: -delay, d: duration, onUpdate, onDone, easing, dead: false };
    this.list.push(tw);
    return tw;
  }
  update(dt) {
    for (const tw of this.list) {
      if (tw.dead) continue;
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.d);
      tw.onUpdate(tw.easing(k), k);
      if (k >= 1) {
        tw.dead = true;
        tw.onDone?.();
      }
    }
    if (this.list.length > 64) this.list = this.list.filter((t) => !t.dead);
  }
  clear() {
    this.list = [];
  }
}
