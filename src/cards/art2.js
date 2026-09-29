// Ilustraciones originales, cartas 19–36. Espacio de dibujo: 200 × 260.
import { C } from './painter.js';

const D = Math.PI / 180;

export const ART2 = [
  // 19 · La Garza
  (p) => {
    p.vgrad('#c4f0f2', '#7fd1d8');
    p.waves(198, '#5cbcd0', '#3fa3c2', 5);
    [[18, 112], [32, 92], [172, 102], [186, 124]].forEach(([x, top]) => {
      p.oline([x, 264, x + 4, top], 3, C.verde);
      p.ellipse(x + 4, top + 12, 5, 14, 0, C.cafe, 2);
    });
    p.oline([100, 150, 102, 216], 3, C.oro);
    p.oline([108, 152, 120, 170, 106, 178], 3, C.oro);
    p.ellipse(102, 216, 16, 3.5, 0, null, { w: 1.5, c: C.white });
    p.path('M60 120 C70 100 120 98 138 118 C150 132 140 156 112 158 C90 160 70 150 56 140 C44 132 36 130 28 133 C38 122 50 122 60 120 Z', C.white);
    p.path('M80 118 C100 108 126 112 136 124 C124 140 100 144 82 138 C76 134 76 124 80 118 Z', '#cfe2ec', 2.2);
    p.curve('M92 126 Q108 134 126 128', 1.5, '#9fb9c8');
    p.ocurve('M126 114 C140 94 118 80 124 60 C128 46 140 42 146 44', 7, C.white);
    p.ellipse(150, 44, 10, 8, 0, C.white);
    p.poly([158, 41, 191, 48, 158, 50], C.amarillo, 2);
    p.circle(151, 42, 2, C.ink, false);
    p.curve('M144 38 C136 30 128 30 118 34', 2);
    p.curve('M146 37 C140 26 130 22 122 24', 2);
  },

  // 20 · El Pájaro
  (p) => {
    p.rays(100, 110, 18, '#ffdaed', '#ffc4df');
    p.ocurve('M-10 192 C40 182 120 198 210 172', 8, C.madera);
    p.path('M60 188 C70 172 86 170 96 174 C86 182 72 188 60 188 Z', C.verde, 2);
    p.path('M150 182 C160 198 176 200 186 194 C176 186 162 182 150 182 Z', C.verde, 2);
    p.flower(172, 164, 11, C.rosa, C.amarillo, 5, 1.8);
    p.path('M60 150 C40 160 24 176 18 196 C34 188 44 178 58 170 Z', C.marino);
    p.path('M62 156 C48 172 42 192 42 206 C54 192 60 178 68 166 Z', C.azul);
    p.oline([96, 170, 94, 186], 2.5, C.oro);
    p.oline([108, 168, 108, 184], 2.5, C.oro);
    p.ellipse(92, 140, 40, 32, -20, C.azul);
    p.ellipse(104, 152, 22, 17, -20, C.naranjaL, 2);
    p.path('M64 132 C80 118 110 122 116 138 C104 156 80 158 66 150 C72 144 70 138 64 132 Z', C.marino);
    p.curve('M78 140 Q92 148 106 142', 1.8, C.turquesaL);
    p.curve('M74 132 Q90 138 104 132', 1.8, C.turquesaL);
    p.circle(124, 110, 20, C.azul);
    p.poly([140, 105, 157, 110, 140, 116], C.amarillo);
    p.eye(128, 106, 5, 0.6, 0);
    p.note(160, 72, 1.1);
    p.note(178, 46, 0.9);
    p.note(144, 40, 0.8);
  },

  // 21 · La Mano
  (p) => {
    p.rays(100, 130, 20, '#ffe066', '#ffd23d');
    p.curve('M30 80 Q24 100 30 120', 3);
    p.curve('M18 68 Q10 100 18 132', 3);
    p.curve('M170 80 Q176 100 170 120', 3);
    p.curve('M182 68 Q190 100 182 132', 3);
    const hand = 'M70 252 L72 196 C60 180 50 160 44 140 C40 128 52 122 60 132 L72 150 L70 76 C70 64 86 64 86 76 L88 130 L90 58 C90 46 106 46 106 58 L108 128 L112 64 C112 52 128 52 128 64 L126 134 L132 86 C132 74 148 76 146 88 L140 164 C138 188 130 200 128 214 L128 252 Z';
    p.path(hand, C.piel2);
    p.curve('M82 176 Q100 168 122 178', 2, C.piel3);
    p.curve('M86 190 Q102 184 118 190', 2, C.piel3);
    p.curve('M96 150 Q92 170 96 200', 1.8, C.piel3);
    p.ellipse(78, 72, 5, 3, 0, 'rgba(255,255,255,0.5)', false);
    p.ellipse(98, 54, 5, 3, 0, 'rgba(255,255,255,0.5)', false);
    p.ellipse(120, 60, 5, 3, 0, 'rgba(255,255,255,0.5)', false);
    p.ellipse(139, 84, 5, 3, 0, 'rgba(255,255,255,0.5)', false);
    p.rect(64, 226, 70, 36, C.turquesa, 2.5, 4);
    p.line([64, 238, 134, 238], 2, C.turquesaL);
  },

  // 22 · La Bota
  (p) => {
    p.bg('#ffcc80');
    p.dots('#ffbf66', 24, 4);
    p.ellipse(110, 238, 76, 9, 0, 'rgba(0,0,0,0.15)', false);
    const boot = 'M72 36 L128 36 C130 70 126 110 128 150 C140 168 170 176 184 196 C192 208 190 224 176 228 L100 232 L96 214 L80 214 L78 232 L60 232 C60 200 62 170 66 150 C64 110 66 70 72 36 Z';
    p.path(boot, C.madera);
    p.path('M70 36 L130 36 L131 56 L69 56 Z', C.cafe, 2.5);
    p.curve('M84 72 C92 92 108 92 116 72', 2, C.oro);
    p.curve('M86 98 C94 118 106 118 114 98', 2, C.oro);
    p.flower(100, 136, 9, C.oro, C.rojo, 5, 1.2);
    p.curve('M134 172 C150 180 164 188 176 202', 2, C.oro);
    p.path('M78 214 L98 214 L100 232 L76 232 Z', C.negro, 2.5);
    p.path('M100 228 L176 224 C186 222 190 216 190 208 C190 222 182 230 170 231 L100 235 Z', C.negro, 2);
    p.oline([76, 198, 52, 202], 3, C.gris);
    p.star(44, 202, 11, 4, 8, C.grisL, 2);
    p.circle(44, 202, 3, C.grisD, 1.5);
  },

  // 23 · La Luna
  (p) => {
    p.vgrad('#141049', '#302b88');
    [[34, 30, 5], [172, 38, 6], [44, 222, 4], [160, 226, 5], [150, 110, 3], [182, 150, 4], [120, 22, 3], [128, 196, 3]].forEach(([x, y, s]) => p.sparkle(x, y, s, C.amarilloL));
    const moon = 'M112 52 A76 76 0 1 0 112 208 A96 96 0 0 1 112 52 Z';
    p.path(moon, C.amarilloL);
    p.clipPath(moon, () => {
      p.alpha(0.18, () => {
        p.circle(46, 100, 8, C.oroD, false);
        p.circle(36, 150, 6, C.oroD, false);
        p.circle(58, 186, 7, C.oroD, false);
      });
      p.alpha(0.35, () => p.path('M40 70 C30 100 30 150 44 180 C40 150 40 110 52 76 Z', C.white, false));
    });
    p.path(moon, null);
    p.happyEye(66, 116, 7);
    p.curve('M58 104 Q66 99 74 103', 2);
    p.curve('M62 150 Q72 158 80 150', 2.5);
    p.circle(58, 134, 6, 'rgba(255,120,120,0.35)', false);
    p.cloud(150, 190, 0.8, '#d7d3ff');
  },

  // 24 · El Cotorro
  (p) => {
    p.bg('#fff3b0');
    p.path('M-10 60 C30 40 70 60 80 90 C50 90 20 80 -10 60 Z', C.verde, 2);
    p.path('M210 40 C170 30 140 60 136 90 C160 84 190 70 210 40 Z', C.verdeD, 2);
    p.path('M-10 200 C30 190 60 210 70 240 C40 240 10 226 -10 200 Z', C.verdeD, 2);
    p.path('M210 190 C176 186 150 206 144 236 C170 232 196 216 210 190 Z', C.verde, 2);
    p.path('M84 170 C80 200 76 230 70 258 L90 258 C94 230 98 200 100 172 Z', C.azul);
    p.path('M96 172 C100 200 104 228 108 258 L124 258 C118 228 112 200 108 170 Z', C.rojo);
    p.ocurve('M20 204 C80 194 130 202 190 194', 8, C.madera);
    p.path('M72 110 C66 140 72 172 96 182 C120 186 130 160 128 132 C126 108 110 92 96 92 C84 92 76 100 72 110 Z', C.verde);
    p.path('M78 122 C72 150 80 172 100 178 C92 160 92 140 96 120 Z', C.verdeD);
    p.path('M80 140 C80 150 84 158 90 162 C88 152 88 146 90 138 Z', C.amarillo, 2);
    p.path('M84 160 C86 170 92 176 100 178 C96 170 94 164 94 156 Z', C.azul, 2);
    p.oline([92, 186, 90, 198], 3, C.grisD);
    p.oline([106, 186, 108, 198], 3, C.grisD);
    p.circle(106, 80, 26, C.rojo);
    p.ellipse(116, 80, 10, 12, 0, C.white, 2);
    p.eye(116, 78, 4.5, 0.4, 0);
    p.path('M128 76 C142 76 146 90 138 100 C136 92 132 88 126 88 Z', C.crema);
    p.path('M126 88 C132 88 134 94 132 98 C128 96 126 94 124 92 Z', C.negro, 2);
    p.curve('M84 66 Q92 60 100 60', 2, C.amarillo);
  },

  // 25 · El Borracho
  (p) => {
    p.bg('#e6d4ff');
    p.dots('#d8c0ff', 20, 3);
    p.alpha(0.35, () => p.circle(150, 44, 34, C.amarilloL, false));
    p.oline([150, 40, 150, 252], 6, C.negro);
    p.path('M136 40 L164 40 L158 20 L142 20 Z', C.amarillo);
    p.rect(139, 40, 22, 6, C.negro, 2);
    p.oline([90, 180, 104, 236], 8, C.azul);
    p.oline([106, 180, 86, 236], 8, C.azul);
    p.ellipse(107, 238, 11, 5, 0, C.negro);
    p.ellipse(82, 238, 11, 5, 0, C.negro);
    p.path('M80 110 C84 100 120 98 128 106 L118 184 L82 184 Z', C.white);
    p.path('M80 110 L96 110 L100 184 L82 184 Z', C.rojo, 2);
    p.path('M112 106 L128 106 L118 184 L102 184 Z', C.rojo, 2);
    p.ocurve('M124 112 C136 116 144 112 150 106', 8, C.white);
    p.circle(150, 104, 5, C.piel2);
    p.ocurve('M82 114 C68 124 64 140 70 150', 8, C.white);
    p.path('M62 150 L76 150 L76 178 C76 182 62 182 62 178 Z', C.verde);
    p.rect(66, 140, 6, 12, C.verde, 2);
    p.circle(69, 152, 5, C.piel2);
    p.circle(104, 80, 20, C.piel2);
    p.ellipse(100, 62, 36, 8, -15, C.amarilloL);
    p.path('M84 66 C82 44 110 36 116 56 Z', C.amarilloL);
    p.line([86, 61, 115, 53], 3, C.rojo);
    p.curve('M94 80 L102 80', 2.5);
    p.curve('M108 78 L116 78', 2.5);
    p.cheeks(92, 90, 116, 88, 5, 'rgba(255,60,80,0.5)');
    p.circle(106, 88, 5, C.rojo, 2);
    p.curve('M96 97 Q104 101 112 95', 2);
    p.bubbles([[58, 66, 6], [46, 48, 4], [38, 34, 3]], 'rgba(90,60,140,0.85)');
    p.text('¡hic!', 36, 96, 17, C.morado, 'center', C.white);
    p.star(128, 64, 5, 2, 5, C.amarillo, 1.5);
    p.star(80, 50, 4, 1.6, 5, C.amarillo, 1.5);
  },

  // 26 · La Cadena (bloques encadenados)
  (p) => {
    p.bg(C.rosa);
    p.dots('rgba(255,255,255,0.16)', 24, 5);
    const link = (x, y, rot, edge) => {
      if (edge) {
        p.ellipse(x, y, 17, 5, rot, null, { w: 8, c: C.ink });
        p.ellipse(x, y, 17, 5, rot, null, { w: 4.5, c: C.grisL });
      } else {
        p.ellipse(x, y, 17, 9, rot, null, { w: 9, c: C.ink });
        p.ellipse(x, y, 17, 9, rot, null, { w: 5.5, c: C.grisL });
      }
    };
    link(72, 100, 58, false);
    link(82, 116, 58, true);
    link(122, 166, 58, false);
    link(132, 182, 58, true);
    p.cube(56, 70, 34, C.turquesaL, C.turquesa, '#0b8e88');
    p.cube(104, 140, 34, C.amarilloL, C.amarillo, C.oro);
    p.cube(152, 210, 34, C.white, C.lilaP, C.lila);
    p.sparkle(150, 60, 9);
    p.sparkle(40, 190, 7);
    p.sparkle(176, 120, 6);
    p.sparkle(26, 30, 5);
  },

  // 27 · El Corazón
  (p) => {
    p.rays(100, 130, 20, '#ffd1e3', '#ffb3cf');
    p.oline([26, 200, 174, 66], 4, C.madera);
    const fl = (x, y) => {
      p.poly([x, y, x - 12, y - 2, x - 6, y - 12], C.turquesa, 2);
      p.poly([x, y, x + 2, y + 12, x + 12, y + 6], C.turquesa, 2);
    };
    fl(30, 196);
    fl(40, 187);
    const heart = 'M100 214 C60 184 30 156 30 118 C30 90 50 72 72 72 C86 72 96 80 100 92 C104 80 114 72 128 72 C150 72 170 90 170 118 C170 156 140 184 100 214 Z';
    p.path(heart, C.rojo);
    const g = p.ctx;
    g.save();
    g.translate(100, 140);
    g.scale(0.76, 0.76);
    g.translate(-100, -140);
    g.setLineDash([2, 9]);
    p.path(heart, null, { w: 5, c: C.amarilloL });
    g.setLineDash([]);
    g.restore();
    p.alpha(0.35, () => p.path('M52 110 C52 96 62 88 72 88 C64 94 60 104 62 118 Z', C.white, false));
    p.oline([142, 95, 170, 70], 4, C.madera);
    p.poly([182, 58, 162, 64, 176, 78], C.grisL);
    [[30, 50], [176, 186], [20, 150], [160, 30]].forEach(([x, y]) => p.path(`M${x} ${y + 8} C${x - 8} ${y + 2} ${x - 8} ${y - 6} ${x} ${y - 2} C${x + 8} ${y - 6} ${x + 8} ${y + 2} ${x} ${y + 8} Z`, C.rosa, 1.5));
  },

  // 28 · La Sandía
  (p) => {
    p.bg('#fff0a8');
    p.dots('#ffe680', 22, 4);
    p.ellipse(112, 108, 66, 50, -10, C.verde);
    p.clip((g) => g.ellipse(112, 108, 64, 48, -10 * D, 0, Math.PI * 2), () => {
      for (let i = -5; i <= 5; i++) p.curve(`M${112 + i * 14} 56 C${112 + i * 19} 90 ${112 + i * 19} 128 ${112 + i * 14} 162`, 5, C.verdeD);
      p.alpha(0.25, () => p.ellipse(90, 86, 24, 14, -20, C.white, false));
    });
    p.ellipse(112, 108, 66, 50, -10, null);
    p.path('M28 170 L172 170 A72 72 0 0 1 28 170 Z', C.verde);
    p.path('M35 170 L165 170 A65 65 0 0 1 35 170 Z', C.white, 2);
    p.path('M42 170 L158 170 A58 58 0 0 1 42 170 Z', C.rojo, 2);
    p.alpha(0.2, () => p.path('M50 172 L150 172 A50 50 0 0 1 50 172 Z', C.white, false));
    [[70, 184], [92, 196], [114, 194], [132, 184], [84, 210], [104, 214], [124, 206], [100, 180], [62, 176], [140, 175]].forEach(([x, y]) => p.ellipse(x, y, 2.6, 4.2, 20, C.negro, false));
  },

  // 29 · El Tambor
  (p) => {
    p.rays(100, 130, 18, '#c2e2ff', '#a6d2ff');
    p.oline([40, 30, 112, 108], 5, C.maderaL);
    p.circle(40, 30, 7, C.crema, 2.5);
    p.oline([160, 30, 88, 108], 5, C.maderaL);
    p.circle(160, 30, 7, C.crema, 2.5);
    p.path('M40 122 L40 208 C40 230 160 230 160 208 L160 122 Z', C.rojo);
    p.line([46, 138, 64, 204, 82, 138, 100, 206, 118, 138, 136, 204, 154, 140], 2.5, C.white);
    [[64, 204], [100, 206], [136, 204]].forEach(([x, y]) => p.rect(x - 4, y - 6, 8, 8, C.oro, 1.5, 2));
    p.path('M38 200 C38 216 162 216 162 200 L162 210 C162 230 38 230 38 210 Z', C.oro);
    p.path('M38 118 C38 102 162 102 162 118 L162 130 C162 146 38 146 38 130 Z', C.oro);
    p.ellipse(100, 118, 62, 15, 0, C.crema);
    p.alpha(0.3, () => p.ellipse(84, 116, 30, 6, 0, C.white, false));
  },

  // 30 · El Camarón
  (p) => {
    p.vgrad('#86e3e8', '#3db4c8');
    p.bubbles([[30, 40, 6], [44, 64, 4], [170, 220, 6], [182, 196, 4], [26, 210, 5]]);
    const cx = 100;
    const cy = 136;
    const R = 50;
    const angs = [-40, -8, 24, 56, 88, 118];
    // cola (abanico)
    const ta = 146 * D;
    const tx = cx + Math.cos(ta) * R;
    const ty = cy + Math.sin(ta) * R;
    p.rot(tx, ty, 146 + 90, () => {
      p.path('M0 0 C-12 10 -22 26 -18 34 C-8 30 -2 20 0 8 Z', '#ff9a70', 2.2);
      p.path('M0 0 C12 10 22 26 18 34 C8 30 2 20 0 8 Z', '#ff9a70', 2.2);
      p.path('M0 0 C-5 14 -5 28 0 38 C5 28 5 14 0 0 Z', '#ff7a4f', 2.2);
    });
    for (let i = angs.length - 1; i >= 0; i--) {
      const a = angs[i] * D;
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R;
      const s = 25 - i * 2.4;
      // patitas hacia el centro
      const ix = cx + Math.cos(a) * (R - s * 0.9);
      const iy = cy + Math.sin(a) * (R - s * 0.9);
      p.line([ix, iy, ix - Math.cos(a) * 10 + Math.sin(a) * 3, iy - Math.sin(a) * 10], 2, C.rojoD);
      p.ellipse(x, y, s, s * 0.78, angs[i], i % 2 ? '#ff8a5c' : '#ff7043');
      p.curve(`M${x + Math.cos(a) * s * 0.6} ${y + Math.sin(a) * s * 0.6} Q${x + Math.sin(a) * 6} ${y - Math.cos(a) * 6} ${x - Math.cos(a) * s * 0.6} ${y - Math.sin(a) * s * 0.6}`, 1.5, '#ffb08c');
    }
    // cabeza
    const ha = -72 * D;
    const hx = cx + Math.cos(ha) * (R + 2);
    const hy = cy + Math.sin(ha) * (R + 2);
    p.ocurve(`M${hx - 10} ${hy - 12} C${hx - 50} ${hy - 50} ${hx - 90} ${hy - 30} ${hx - 96} ${hy + 10}`, 1.8, '#ff9a70');
    p.ocurve(`M${hx - 6} ${hy - 14} C${hx - 30} ${hy - 70} ${hx - 70} ${hy - 70} ${hx - 90} ${hy - 50}`, 1.8, '#ff9a70');
    p.ellipse(hx, hy, 28, 21, -12, '#ff6b3d');
    p.poly([hx - 22, hy - 6, hx - 48, hy - 14, hx - 24, hy + 4], '#ff6b3d', 2.2);
    p.oline([hx - 10, hy - 12, hx - 14, hy - 22], 2.5, C.rojoD);
    p.circle(hx - 15, hy - 24, 5, C.negro, 2);
    p.circle(hx - 16.5, hy - 25.5, 1.5, C.white, false);
    p.curve(`M${hx - 4} ${hy + 4} Q${hx + 8} ${hy + 10} ${hx + 18} ${hy + 4}`, 1.5, '#ffb08c');
  },

  // 31 · Las Jaras
  (p) => {
    p.bg('#f6d9a5');
    p.dots('#f0c985', 22, 4);
    const arrow = (x0, y0, x1, y1, c) => {
      const a = Math.atan2(y1 - y0, x1 - x0);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const nx = -sa;
      const ny = ca;
      p.oline([x0, y0, x1, y1], 4, C.maderaL);
      const tip = [x1 + ca * 18, y1 + sa * 18];
      p.poly([tip[0], tip[1], x1 + nx * 9, y1 + ny * 9, x1 - ca * 3, y1 - sa * 3, x1 - nx * 9, y1 - ny * 9], C.grisD);
      for (const s of [1, -1]) {
        p.poly([
          x0 + ca * 2, y0 + sa * 2,
          x0 + ca * 26, y0 + sa * 26,
          x0 + ca * 20 + nx * 10 * s, y0 + sa * 20 + ny * 10 * s,
          x0 - ca * 4 + nx * 10 * s, y0 - sa * 4 + ny * 10 * s,
        ], c, 2);
      }
    };
    arrow(42, 232, 146, 50, C.rojo);
    arrow(100, 244, 100, 40, C.turquesa);
    arrow(158, 232, 54, 50, C.amarillo);
    p.ellipse(100, 150, 20, 8, 0, C.rojo, 2.5);
    p.curve('M92 156 Q86 172 80 180', 2.5, C.rojo);
    p.curve('M108 156 Q114 172 120 180', 2.5, C.rojo);
  },

  // 32 · El Músico (mariachi)
  (p) => {
    p.rays(100, 90, 20, '#ffcf5a', '#ffbe30');
    p.path('M64 130 C64 116 136 116 136 130 L140 258 L60 258 Z', C.negro);
    [[78, 152], [78, 172], [78, 192], [78, 212], [122, 152], [122, 172], [122, 192], [122, 212]].forEach(([x, y]) => p.circle(x, y, 3, C.grisL, 1.5));
    p.curve('M68 136 C78 146 78 172 72 204', 2, C.grisL);
    p.curve('M132 136 C122 146 122 172 128 204', 2, C.grisL);
    p.poly([88, 122, 112, 122, 100, 150], C.white);
    p.poly([100, 131, 84, 123, 84, 140], C.rojo, 2);
    p.poly([100, 131, 116, 123, 116, 140], C.rojo, 2);
    p.circle(100, 131, 3.5, C.rojo, 2);
    p.rect(86, 104, 12, 14, C.piel3, 2);
    p.circle(92, 94, 19, C.piel3);
    p.happyEye(84, 92, 4);
    p.happyEye(100, 92, 4);
    p.cheeks(80, 99, 104, 99, 3.5);
    p.path('M93 103 C87 98 77 100 75 106 C81 104 85 108 93 106 C101 108 105 104 111 106 C109 100 99 98 93 103 Z', C.negro, 2);
    p.ellipse(92, 72, 64, 12, -6, C.negro);
    p.ellipse(92, 72, 57, 9, -6, null, { w: 2, c: C.oro });
    p.path('M72 70 C70 42 84 30 94 30 C106 30 116 42 112 68 Z', C.negro);
    p.curve('M74 62 C84 66 102 66 112 60', 3, C.oro);
    // trompeta
    p.oline([106, 106, 158, 102], 5, C.oro);
    p.path('M156 90 L188 76 L188 126 L156 112 Z', C.oro);
    p.ellipse(188, 101, 5, 25, 0, C.oroD, 2);
    [[126, 95], [134, 94], [142, 93]].forEach(([x, y]) => p.rect(x - 2.5, y - 8, 5, 10, C.oro, 1.5, 1));
    p.ocurve('M70 136 C64 160 100 152 124 114', 10, C.negro);
    p.ocurve('M130 134 C142 130 144 120 140 112', 10, C.negro);
    p.circle(124, 111, 5.5, C.piel3, 2);
    p.circle(140, 109, 5.5, C.piel3, 2);
    p.note(40, 60, 1.1, C.negro);
    p.note(26, 100, 0.9, C.negro);
    p.note(170, 40, 0.9, C.negro);
  },

  // 33 · La Araña
  (p) => {
    p.bg('#d9dcec');
    const wx = 204;
    const wy = -4;
    const spokes = [];
    for (let i = 0; i <= 8; i++) spokes.push((92 + i * 11) * D);
    spokes.forEach((a) => p.line([wx, wy, wx + Math.cos(a) * 320, wy + Math.sin(a) * 320], 1.3, C.white));
    for (let r = 28; r < 300; r += 24) {
      for (let i = 0; i < spokes.length - 1; i++) {
        const a0 = spokes[i];
        const a1 = spokes[i + 1];
        const x0 = wx + Math.cos(a0) * r;
        const y0 = wy + Math.sin(a0) * r;
        const x1 = wx + Math.cos(a1) * r;
        const y1 = wy + Math.sin(a1) * r;
        const am = (a0 + a1) / 2;
        p.curve(`M${x0} ${y0} Q${wx + Math.cos(am) * (r - 5)} ${wy + Math.sin(am) * (r - 5)} ${x1} ${y1}`, 1.2, C.white);
      }
    }
    p.line([88, -5, 88, 104], 1.6, C.ink);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const bx = 88 + s * 12;
        const by = 130 + i * 8;
        p.curve(`M${bx} ${by} Q${bx + s * 30} ${by - 34 + i * 10} ${bx + s * 46} ${by + 6 + i * 12}`, 4);
      }
    }
    p.circle(88, 150, 26, C.negro);
    p.circle(88, 116, 15, C.negro);
    p.path('M88 138 L96 150 L88 162 L80 150 Z', C.rojo, false);
    p.eye(82, 112, 5.5, 0, 0.3);
    p.eye(94, 112, 5.5, 0, 0.3);
    p.curve('M82 123 Q88 128 94 123', 2, C.white);
    p.cheeks(76, 120, 100, 120, 3, 'rgba(255,110,150,0.6)');
  },

  // 34 · El Soldado (de juguete)
  (p) => {
    p.bg('#c9ecc0');
    p.dots('#b5e2aa', 22, 4);
    p.rect(82, 180, 16, 50, C.white, 2.5, 3);
    p.rect(102, 180, 16, 50, C.white, 2.5, 3);
    p.rect(79, 214, 21, 22, C.negro, 2.5, 3);
    p.rect(100, 214, 21, 22, C.negro, 2.5, 3);
    p.path('M72 120 C72 108 128 108 128 120 L130 186 L70 186 Z', C.rojo);
    p.line([76, 118, 124, 182], 7, C.ink);
    p.line([76, 118, 124, 182], 4.5, C.white);
    p.line([124, 118, 76, 182], 7, C.ink);
    p.line([124, 118, 76, 182], 4.5, C.white);
    p.circle(100, 150, 4, C.oro, 1.5);
    p.rect(70, 178, 60, 10, C.negro, 2.5);
    p.rect(94, 177, 12, 12, C.oro, 2);
    p.ocurve('M74 122 C66 140 66 160 70 176', 10, C.rojo);
    p.circle(70, 180, 6, C.piel1);
    p.ellipse(72, 118, 10, 5, 0, C.oro, 2);
    p.ellipse(128, 118, 10, 5, 0, C.oro, 2);
    p.circle(100, 90, 18, C.piel1);
    p.circle(93, 90, 2.2, C.ink, false);
    p.circle(107, 90, 2.2, C.ink, false);
    p.cheeks(88, 97, 112, 97, 4.5);
    p.curve('M95 100 Q100 104 105 100', 2);
    p.path('M80 78 L82 36 C82 30 118 30 118 36 L120 78 Z', C.negro);
    p.rect(78, 74, 44, 8, C.negro, 2.5, 2);
    p.circle(100, 52, 6, C.oro, 2);
    p.path('M100 34 C96 20 104 12 108 8 C110 18 106 26 104 34 Z', C.rojo, 2);
    p.ocurve('M126 122 C142 112 142 96 126 84', 10, C.rojo);
    p.circle(122, 80, 6, C.piel1);
  },

  // 35 · La Estrella (piñata)
  (p) => {
    p.vgrad('#2b2472', '#5a2d91');
    [[24, 30, 5], [178, 28, 6], [20, 230, 4], [184, 236, 5], [40, 120, 3], [170, 150, 3]].forEach(([x, y, s]) => p.sparkle(x, y, s, C.amarilloL));
    p.line([100, -5, 100, 44], 2, C.crema);
    const cx = 100;
    const cy = 118;
    const cols = [C.rosa, C.amarillo, C.turquesa, C.naranja, C.verde, C.morado, C.rojo];
    for (let i = 0; i < 7; i++) {
      const a = (-90 + (i * 360) / 7) * D;
      const tip = [cx + Math.cos(a) * 90, cy + Math.sin(a) * 90];
      for (let k = -1; k <= 1; k++) {
        p.oline([tip[0], tip[1], tip[0] + Math.cos(a + k * 0.35) * 16, tip[1] + Math.sin(a + k * 0.35) * 16], 2, cols[(i + 3 + k + 7) % 7]);
      }
      const b1 = [cx + Math.cos(a + 0.34) * 34, cy + Math.sin(a + 0.34) * 34];
      const b2 = [cx + Math.cos(a - 0.34) * 34, cy + Math.sin(a - 0.34) * 34];
      p.poly([b1[0], b1[1], tip[0], tip[1], b2[0], b2[1]], cols[i]);
      const m1 = [b1[0] + (tip[0] - b1[0]) * 0.45, b1[1] + (tip[1] - b1[1]) * 0.45];
      const m2 = [b2[0] + (tip[0] - b2[0]) * 0.45, b2[1] + (tip[1] - b2[1]) * 0.45];
      const n1 = [b1[0] + (tip[0] - b1[0]) * 0.6, b1[1] + (tip[1] - b1[1]) * 0.6];
      const n2 = [b2[0] + (tip[0] - b2[0]) * 0.6, b2[1] + (tip[1] - b2[1]) * 0.6];
      p.poly([m1[0], m1[1], n1[0], n1[1], n2[0], n2[1], m2[0], m2[1]], C.white, 1.8);
    }
    p.circle(cx, cy, 38, C.rosaL);
    const ringCols = [C.amarillo, C.turquesa, C.rosa, C.naranja];
    [32, 23, 14].forEach((r, j) => {
      const n = Math.round(r * 0.8);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + j * 0.3;
        p.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 5.2 - j * 0.8, ringCols[(k + j) % 4], 1.2);
      }
    });
    p.circle(cx, cy, 7, C.amarillo, 2);
  },

  // 36 · El Cazo
  (p) => {
    p.rays(100, 150, 16, '#ffdcae', '#ffca8c');
    p.curve('M78 72 C68 58 88 48 78 30', 4, C.white);
    p.curve('M100 66 C90 50 110 40 100 18', 4, C.white);
    p.curve('M122 72 C112 58 132 48 122 30', 4, C.white);
    p.path('M56 224 L144 224 L154 252 L46 252 Z', C.negro);
    [[78, 222], [100, 220], [122, 222]].forEach(([x, y]) => p.path(`M${x - 8} ${y} C${x - 8} ${y - 10} ${x} ${y - 16} ${x} ${y - 22} C${x + 4} ${y - 14} ${x + 8} ${y - 10} ${x + 8} ${y} Z`, C.naranja, 1.8));
    p.ocurve('M40 118 C16 116 16 148 40 148', 7, C.cobre);
    p.ocurve('M160 118 C184 116 184 148 160 148', 7, C.cobre);
    const bowl = 'M34 108 L166 108 C166 170 136 214 100 214 C64 214 34 170 34 108 Z';
    p.path(bowl, C.cobre);
    p.clipPath(bowl, () => {
      for (let y = 118, row = 0; y < 216; y += 11, row++) {
        for (let x = 38 + (row % 2) * 6; x < 170; x += 12) p.circle(x, y, 2.6, 'rgba(255,220,180,0.35)', false);
      }
      p.alpha(0.3, () => p.path('M46 116 C48 150 62 180 80 196 C66 170 58 146 58 116 Z', C.white, false));
    });
    p.path(bowl, null);
    p.ellipse(100, 108, 68, 12, 0, '#e8925a');
    p.ellipse(100, 108, 60, 8, 0, '#7a3510', 2);
    p.ellipse(100, 109, 50, 5, 0, '#a0521e', false);
  },
];
