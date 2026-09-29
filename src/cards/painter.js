// Pequeño "pincel" sobre Canvas 2D para dibujar las cartas con trazos de tinta.
// Todas las ilustraciones se dibujan en un espacio de 200 × 260 unidades.

export const C = {
  ink: '#2a1a12', paper: '#fff4dc', white: '#ffffff', crema: '#fbe9c4',
  rosa: '#e4007c', rosaL: '#ff8cc6', rosaP: '#ffd0e6',
  rojo: '#d7263d', rojoD: '#9e1b2c', naranja: '#ff7a00', naranjaL: '#ffab4f',
  amarillo: '#ffc72c', amarilloL: '#ffe28a', oro: '#e0a526', oroD: '#b07a12',
  verde: '#2ba84a', verdeD: '#17753a', lima: '#a4d65e', menta: '#bff0c8',
  turquesa: '#10b5ae', turquesaL: '#8ee3dc', azul: '#2f6bd8', marino: '#1e2a78', cielo: '#a8e0ff',
  morado: '#7b2cbf', lila: '#c9a7ff', lilaP: '#eadcff',
  cafe: '#7a4222', cafeL: '#c9844f', madera: '#b5652b', maderaL: '#dc8f4f',
  piel1: '#f7cfae', piel2: '#e0a577', piel3: '#b8764a', piel4: '#83502f',
  gris: '#a7abb8', grisL: '#d6d9e2', grisD: '#5c6070', negro: '#231f29',
  arena: '#f4d58d', cobre: '#c8692c', noche: '#1b1650', nocheL: '#2e2a7a',
};

const rad = (d) => (d * Math.PI) / 180;

export class Painter {
  constructor(ctx) {
    this.ctx = ctx;
    this.ink = C.ink;
    this.lw = 3;
    this.W = 200;
    this.H = 260;
  }

  // ---- núcleo -------------------------------------------------------------
  _finish(fill, stroke) {
    const g = this.ctx;
    if (fill) {
      g.fillStyle = fill;
      g.fill();
    }
    if (stroke !== false && stroke !== null) {
      let w = this.lw;
      let c = this.ink;
      if (typeof stroke === 'number') w = stroke;
      else if (typeof stroke === 'string') c = stroke;
      else if (stroke && typeof stroke === 'object') {
        w = stroke.w ?? w;
        c = stroke.c ?? c;
      }
      g.lineWidth = w;
      g.strokeStyle = c;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.stroke();
    }
  }

  shape(build, fill, stroke = true) {
    const g = this.ctx;
    g.beginPath();
    build(g);
    this._finish(fill, stroke);
  }

  path(d, fill, stroke = true) {
    const g = this.ctx;
    const p = new Path2D(d);
    if (fill) {
      g.fillStyle = fill;
      g.fill(p);
    }
    if (stroke !== false && stroke !== null) {
      let w = this.lw;
      let c = this.ink;
      if (typeof stroke === 'number') w = stroke;
      else if (typeof stroke === 'string') c = stroke;
      else if (stroke && typeof stroke === 'object') {
        w = stroke.w ?? w;
        c = stroke.c ?? c;
      }
      g.lineWidth = w;
      g.strokeStyle = c;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.stroke(p);
    }
  }

  // Trazo sin relleno (string de path SVG)
  curve(d, w = this.lw, color = this.ink) {
    this.path(d, null, { w, c: color });
  }

  // Trazo con contorno de tinta: primero tinta gruesa, luego color
  ocurve(d, w, color) {
    this.path(d, null, { w: w + 3, c: this.ink });
    this.path(d, null, { w, c: color });
  }

  circle(x, y, r, fill, stroke = true) {
    this.shape((g) => g.arc(x, y, r, 0, Math.PI * 2), fill, stroke);
  }

  ellipse(x, y, rx, ry, rot, fill, stroke = true) {
    this.shape((g) => g.ellipse(x, y, rx, ry, rad(rot || 0), 0, Math.PI * 2), fill, stroke);
  }

  rect(x, y, w, h, fill, stroke = true, r = 0) {
    this.shape((g) => {
      if (r > 0 && g.roundRect) g.roundRect(x, y, w, h, r);
      else g.rect(x, y, w, h);
    }, fill, stroke);
  }

  poly(pts, fill, stroke = true) {
    this.shape((g) => {
      g.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      g.closePath();
    }, fill, stroke);
  }

  line(pts, w = this.lw, color = this.ink) {
    const g = this.ctx;
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.lineWidth = w;
    g.strokeStyle = color;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke();
  }

  // Línea con contorno de tinta
  oline(pts, w, color) {
    this.line(pts, w + 3, this.ink);
    this.line(pts, w, color);
  }

  sector(cx, cy, r, a0, a1, fill, stroke = true) {
    this.shape((g) => {
      g.moveTo(cx, cy);
      g.arc(cx, cy, r, rad(a0), rad(a1));
      g.closePath();
    }, fill, stroke);
  }

  arc(cx, cy, r, a0, a1, w = this.lw, color = this.ink) {
    const g = this.ctx;
    g.beginPath();
    g.arc(cx, cy, r, rad(a0), rad(a1));
    g.lineWidth = w;
    g.strokeStyle = color;
    g.lineCap = 'round';
    g.stroke();
  }

  star(x, y, r1, r2, n, fill, stroke = true, rot = -90) {
    this.shape((g) => {
      for (let i = 0; i < n * 2; i++) {
        const r = i % 2 === 0 ? r1 : r2;
        const a = rad(rot + (i * 180) / n);
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
    }, fill, stroke);
  }

  // ---- fondos ------------------------------------------------------------
  bg(color) {
    const g = this.ctx;
    g.fillStyle = color;
    g.fillRect(-10, -10, this.W + 20, this.H + 20);
  }

  rays(cx, cy, n, c1, c2) {
    const g = this.ctx;
    g.fillStyle = c1;
    g.fillRect(-10, -10, this.W + 20, this.H + 20);
    g.fillStyle = c2;
    const R = 400;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = a0 + Math.PI / n;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
      g.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
      g.closePath();
      g.fill();
    }
  }

  dots(color, step = 20, r = 3, offset = 0) {
    const g = this.ctx;
    g.fillStyle = color;
    let row = 0;
    for (let y = offset; y < this.H + step; y += step, row++) {
      for (let x = (row % 2) * (step / 2) + offset; x < this.W + step; x += step) {
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  stripes(colors, h = 20, y0 = 0) {
    const g = this.ctx;
    let i = 0;
    for (let y = y0; y < this.H + h; y += h, i++) {
      g.fillStyle = colors[i % colors.length];
      g.fillRect(-10, y, this.W + 20, h);
    }
  }

  vgrad(c1, c2, y0 = 0, y1 = 260) {
    const g = this.ctx;
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, c1);
    gr.addColorStop(1, c2);
    g.fillStyle = gr;
    g.fillRect(-10, -10, this.W + 20, this.H + 20);
  }

  lin(x0, y0, x1, y1, stops) {
    const gr = this.ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    return gr;
  }

  rad(x, y, r0, r1, stops) {
    const gr = this.ctx.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    return gr;
  }

  clip(build, fn) {
    const g = this.ctx;
    g.save();
    g.beginPath();
    build(g);
    g.clip();
    fn();
    g.restore();
  }

  clipPath(d, fn) {
    const g = this.ctx;
    g.save();
    g.clip(new Path2D(d));
    fn();
    g.restore();
  }

  alpha(a, fn) {
    const g = this.ctx;
    const prev = g.globalAlpha;
    g.globalAlpha = prev * a;
    fn();
    g.globalAlpha = prev;
  }

  // ---- motivos reutilizables --------------------------------------------
  sparkle(x, y, s = 8, color = C.white) {
    this.star(x, y, s, s * 0.28, 4, color, false, 0);
  }

  cloud(x, y, s = 1, color = C.white) {
    this.shape((g) => {
      g.moveTo(x - 30 * s, y + 10 * s);
      g.arc(x - 18 * s, y + 2 * s, 13 * s, rad(150), rad(290));
      g.arc(x + 2 * s, y - 6 * s, 18 * s, rad(200), rad(340));
      g.arc(x + 22 * s, y + 3 * s, 12 * s, rad(250), rad(40));
      g.closePath();
    }, color, 2.5);
  }

  bubbles(list, color = 'rgba(255,255,255,0.75)') {
    for (const [x, y, r] of list) {
      this.circle(x, y, r, null, { w: 2, c: color });
      this.circle(x - r * 0.35, y - r * 0.35, r * 0.22, color, false);
    }
  }

  note(x, y, s = 1, color = C.ink) {
    this.ellipse(x, y, 5 * s, 3.6 * s, -20, color, false);
    this.line([x + 4.5 * s, y - 1 * s, x + 4.5 * s, y - 20 * s], 2.2 * s, color);
    this.path(`M${x + 4.5 * s} ${y - 20 * s} q ${6 * s} ${3 * s} ${7 * s} ${9 * s}`, null, { w: 2.2 * s, c: color });
  }

  flower(x, y, r, petal, center = C.amarillo, n = 6, stroke = 2.2) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 360;
      const px = x + Math.cos(rad(a)) * r * 0.62;
      const py = y + Math.sin(rad(a)) * r * 0.62;
      this.ellipse(px, py, r * 0.52, r * 0.34, a, petal, stroke);
    }
    this.circle(x, y, r * 0.34, center, stroke);
  }

  marigold(x, y, r) {
    this.circle(x, y, r, C.naranja, 2.2);
    for (let i = 0; i < 10; i++) {
      const a = rad(i * 36);
      this.circle(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.36, C.naranjaL, false);
    }
    this.circle(x, y, r * 0.42, C.amarillo, 1.8);
  }

  grass(y, color = C.verde, n = 9) {
    const step = 200 / n;
    for (let i = 0; i < n; i++) {
      const x = i * step + step / 2;
      this.path(`M${x - 8} ${y} Q${x - 6} ${y - 14} ${x - 10} ${y - 20} Q${x - 1} ${y - 10} ${x} ${y} Q${x + 3} ${y - 16} ${x + 7} ${y - 22} Q${x + 7} ${y - 8} ${x + 8} ${y} Z`, color, 2);
    }
  }

  waves(y, c1, c2, amp = 6) {
    const build = (yy, color) => {
      let d = `M-10 ${yy}`;
      for (let x = -10; x <= 210; x += 20) d += ` q10 ${-amp} 20 0`;
      d += ` L210 270 L-10 270 Z`;
      this.path(d, color, 2.2);
    };
    build(y, c1);
    build(y + 14, c2);
  }

  eye(x, y, r, lookX = 0, lookY = 0) {
    this.circle(x, y, r, C.white, 2);
    this.circle(x + lookX * r * 0.35, y + lookY * r * 0.35, r * 0.52, C.ink, false);
    this.circle(x + lookX * r * 0.35 - r * 0.18, y + lookY * r * 0.35 - r * 0.2, r * 0.16, C.white, false);
  }

  happyEye(x, y, w = 7) {
    this.curve(`M${x - w} ${y + 1} Q${x} ${y - w * 0.9} ${x + w} ${y + 1}`, 2.6);
  }

  cheeks(x1, y1, x2, y2, r = 5, color = 'rgba(255,90,120,0.45)') {
    this.circle(x1, y1, r, color, false);
    this.circle(x2, y2, r, color, false);
  }

  text(str, x, y, size, color, align = 'center', strokeColor = null, family = 'Oswald', weight = 700) {
    const g = this.ctx;
    g.font = `${weight} ${size}px ${family}, 'Arial Narrow', sans-serif`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    if (strokeColor) {
      g.lineWidth = size * 0.2;
      g.strokeStyle = strokeColor;
      g.lineJoin = 'round';
      g.strokeText(str, x, y);
    }
    g.fillStyle = color;
    g.fillText(str, x, y);
  }

  rot(x, y, deg, fn) {
    const g = this.ctx;
    g.save();
    g.translate(x, y);
    g.rotate(rad(deg));
    fn();
    g.restore();
  }

  // Anillo (dona) con hueco real
  ring(x, y, R, r, fill, stroke = true) {
    this.shape((g) => {
      g.arc(x, y, R, 0, Math.PI * 2, false);
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, Math.PI * 2, true);
    }, fill, stroke);
  }

  // Cubo isométrico (para "La Cadena")
  cube(x, y, s, top, left, right) {
    const h = s * 0.58;
    this.poly([x, y - h, x + s, y - h * 0.42, x, y + h * 0.16, x - s, y - h * 0.42], top);
    this.poly([x - s, y - h * 0.42, x, y + h * 0.16, x, y + h * 1.3, x - s, y + h * 0.72], left);
    this.poly([x + s, y - h * 0.42, x, y + h * 0.16, x, y + h * 1.3, x + s, y + h * 0.72], right);
  }
}
