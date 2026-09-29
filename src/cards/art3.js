// Ilustraciones originales, cartas 37–54. Espacio de dibujo: 200 × 260.
import { C } from './painter.js';

const D = Math.PI / 180;

export const ART3 = [
  // 37 · El Mundo
  (p) => {
    p.vgrad('#16124a', '#2b3a8f');
    [[24, 30, 4], [178, 26, 5], [20, 200, 3], [180, 210, 4], [160, 70, 3], [34, 90, 3]].forEach(([x, y, s]) => p.sparkle(x, y, s, C.amarilloL));
    p.path('M68 240 L132 240 L122 224 L78 224 Z', C.oro);
    p.oline([100, 224, 100, 202], 5, C.oroD);
    p.circle(100, 118, 70, '#3f8ee6');
    p.clip((g) => g.arc(100, 118, 68, 0, Math.PI * 2), () => {
      p.path('M50 70 C66 58 90 62 96 76 C100 88 88 96 90 108 C92 122 80 132 70 128 C58 124 60 110 52 100 C44 92 40 80 50 70 Z', C.verde, 2);
      p.path('M112 130 C126 124 144 132 146 148 C148 164 136 176 124 172 C114 168 118 156 110 148 C104 140 104 134 112 130 Z', C.verde, 2);
      p.path('M120 64 C132 60 150 68 156 82 C150 90 138 86 130 92 C122 96 114 88 116 78 C117 72 116 66 120 64 Z', C.lima, 2);
      p.path('M60 150 C70 146 82 156 80 170 C78 180 66 182 60 174 C54 166 54 156 60 150 Z', C.lima, 2);
      p.ellipse(100, 118, 70, 22, 0, null, { w: 1.2, c: 'rgba(255,255,255,0.5)' });
      p.ellipse(100, 118, 26, 70, 0, null, { w: 1.2, c: 'rgba(255,255,255,0.5)' });
      p.alpha(0.25, () => p.circle(142, 152, 70, C.marino, false));
      p.alpha(0.3, () => p.circle(72, 84, 18, C.white, false));
    });
    p.circle(100, 118, 70, null);
    p.arc(100, 118, 80, -95, 95, 9, C.ink);
    p.arc(100, 118, 80, -95, 95, 5.5, C.oro);
    p.circle(100, 38, 5, C.oro, 2);
    p.circle(100, 198, 5, C.oro, 2);
  },

  // 38 · La Llave
  (p) => {
    p.bg('#5b2a9c');
    p.dots('rgba(255,255,255,0.12)', 22, 4);
    [[160, 40, 9], [40, 210, 7], [176, 200, 5], [30, 50, 5]].forEach(([x, y, s]) => p.sparkle(x, y, s, C.amarilloL));
    p.rot(100, 132, -38, () => {
      [[-50, -32], [-50, 32], [-82, 0], [-18, 0]].forEach(([x, y]) => p.circle(x, y, 11, C.oro));
      p.ring(-50, 0, 31, 15, C.oro);
      p.circle(-50, 0, 6, C.rosa, 2);
      p.rect(-20, -7, 108, 14, C.oro, 3, 4);
      p.rect(-24, -11, 8, 22, C.oroD, 2.5, 2);
      p.rect(-10, -11, 6, 22, C.oroD, 2.5, 2);
      p.path('M60 7 L60 34 L70 34 L70 26 L78 26 L78 34 L88 34 L88 7 Z', C.oro);
      p.line([-14, -3, 84, -3], 2, C.amarilloL);
    });
  },

  // 39 · El Nopal
  (p) => {
    p.rays(100, 180, 16, '#ffda92', '#ffc970');
    p.path('M-10 228 Q100 214 210 228 L210 270 L-10 270 Z', C.arena, 2.5);
    [[30, 238], [170, 244], [60, 250]].forEach(([x, y]) => p.ellipse(x, y, 6, 3, 0, '#d9b566', 1.5));
    const pad = (x, y, rx, ry, rot) => {
      p.ellipse(x, y, rx, ry, rot, C.verde);
      p.alpha(0.25, () => p.ellipse(x - rx * 0.25, y - ry * 0.25, rx * 0.4, ry * 0.5, rot, C.lima, false));
      for (let k = 0; k < 6; k++) {
        const a = k * 1.05 + 0.4;
        const sx = x + Math.cos(a) * rx * 0.55;
        const sy = y + Math.sin(a) * ry * 0.55;
        p.line([sx - 2.2, sy - 2.2, sx + 2.2, sy + 2.2], 1.2);
        p.line([sx + 2.2, sy - 2.2, sx - 2.2, sy + 2.2], 1.2);
      }
    };
    pad(100, 196, 30, 36, 0);
    pad(66, 144, 24, 30, -25);
    pad(136, 140, 24, 30, 25);
    pad(100, 112, 22, 28, 0);
    pad(48, 94, 17, 22, -30);
    pad(152, 90, 18, 22, 30);
    pad(100, 70, 16, 20, 0);
    [[42, 70, -20], [158, 66, 20], [100, 46, 0], [120, 54, 15], [80, 52, -15]].forEach(([x, y, r]) => {
      p.ellipse(x, y, 7, 9, r, C.rojo, 2);
      p.circle(x - 2, y - 2, 1.4, C.rosaP, false);
    });
  },

  // 40 · El Alacrán
  (p) => {
    p.bg('#f6d78a');
    p.dots('#efc96a', 20, 2.5);
    for (let i = 0; i < 4; i++) {
      const y = 150 + i * 12;
      p.ocurve(`M88 ${y} Q66 ${y - 10} 54 ${y + 14}`, 3, C.cafe);
      p.ocurve(`M112 ${y} Q134 ${y - 10} 146 ${y + 14}`, 3, C.cafe);
    }
    p.ocurve('M88 198 C74 208 62 214 54 222', 5, C.cafe);
    p.ocurve('M112 198 C126 208 138 214 146 222', 5, C.cafe);
    p.path('M54 222 C40 222 34 236 42 246 C46 238 52 234 60 234 Z', C.cafeL);
    p.path('M54 222 C60 232 58 244 46 250 C52 240 52 232 50 228 Z', C.cafeL);
    p.path('M146 222 C160 222 166 236 158 246 C154 238 148 234 140 234 Z', C.cafeL);
    p.path('M146 222 C140 232 142 244 154 250 C148 240 148 232 150 228 Z', C.cafeL);
    for (let i = 3; i >= 0; i--) p.ellipse(100, 166 - i * 15, 20 - i, 10, 0, C.cafeL);
    p.ellipse(100, 188, 18, 15, 0, C.cafeL);
    p.circle(94, 196, 2, C.ink, false);
    p.circle(106, 196, 2, C.ink, false);
    const tail = [[100, 108], [104, 88], [114, 70], [128, 58], [144, 56], [156, 66]];
    for (let i = 0; i < tail.length; i++) p.ellipse(tail[i][0], tail[i][1], 10 - i * 0.6, 8 - i * 0.4, 0, C.cafeL);
    p.path('M158 70 C168 74 170 90 160 96 C162 88 158 82 152 80 Z', C.cafe);
  },

  // 41 · La Rosa
  (p) => {
    p.bg('#ffe1ea');
    p.dots('#ffd0dd', 22, 4);
    p.ocurve('M100 130 C96 170 104 200 98 258', 5, C.verde);
    [[98, 160, -1], [101, 190, 1], [99, 222, -1]].forEach(([x, y, s]) => p.poly([x, y - 4, x + s * 9, y - 8, x, y + 4], C.verdeD, 1.5));
    p.path('M100 196 C80 182 56 184 46 196 C62 208 86 208 100 196 Z', C.verde);
    p.curve('M98 196 Q72 194 50 196', 1.5, C.verdeD);
    p.path('M100 170 C120 156 146 158 154 170 C138 182 114 182 100 170 Z', C.verde);
    p.curve('M102 170 Q128 168 150 170', 1.5, C.verdeD);
    p.path('M84 128 C88 140 96 142 100 136 C104 142 112 140 116 128 Z', C.verde, 2);
    p.path('M60 96 C56 60 84 44 100 48 C118 44 146 60 140 96 C136 126 116 136 100 136 C84 136 64 126 60 96 Z', C.rojo);
    p.path('M72 100 C70 76 90 68 100 72 C112 68 130 78 128 100 C120 118 80 118 72 100 Z', '#e8384f', 2.5);
    p.path('M82 92 C84 78 96 74 104 78 C114 76 122 86 118 96 C110 104 90 104 82 92 Z', C.rojo, 2.5);
    p.curve('M96 86 C92 80 104 76 108 84 C110 92 98 94 96 88', 2.5);
    p.curve('M60 96 C66 118 84 128 100 128', 2.5);
    p.curve('M140 96 C134 118 116 128 100 128', 2.5);
    p.curve('M66 70 C76 60 88 58 96 62', 2.5);
    p.curve('M134 70 C124 60 112 58 104 62', 2.5);
    p.alpha(0.3, () => p.path('M68 84 C70 70 78 62 86 60 C80 68 76 78 76 90 Z', C.white, false));
  },

  // 42 · La Calavera (de azúcar)
  (p) => {
    p.bg('#241b3e');
    p.marigold(20, 24, 12);
    p.marigold(182, 30, 11);
    p.marigold(18, 238, 13);
    p.marigold(184, 240, 12);
    const skull = 'M100 40 C150 40 170 76 166 116 C164 138 150 150 146 164 L144 196 C144 212 128 222 100 222 C72 222 56 212 56 196 L54 164 C50 150 36 138 34 116 C30 76 50 40 100 40 Z';
    p.path(skull, C.white);
    for (const [ex, col] of [[74, C.turquesa], [126, C.rosa]]) {
      for (let k = 0; k < 8; k++) {
        const a = k * 45 * D;
        p.ellipse(ex + Math.cos(a) * 19, 124 + Math.sin(a) * 19, 8, 5, k * 45, col, 1.8);
      }
      p.circle(ex, 124, 15, C.negro, 2.2);
      p.circle(ex - 4, 119, 3.5, C.white, false);
    }
    p.path('M100 162 C96 152 86 152 88 146 C90 140 98 142 100 148 C102 142 110 140 112 146 C114 152 104 152 100 162 Z', C.rojo, 2);
    p.flower(100, 72, 12, C.amarillo, C.rosa, 6, 1.8);
    p.curve('M70 82 C64 72 72 62 80 68', 2.5, C.rosa);
    p.curve('M130 82 C136 72 128 62 120 68', 2.5, C.rosa);
    [[62, 60], [138, 60], [52, 90], [148, 90], [84, 52], [116, 52]].forEach(([x, y], i) => p.circle(x, y, 3.2, [C.turquesa, C.naranja, C.morado][i % 3], 1.2));
    p.curve('M62 188 Q100 206 138 188', 2.5);
    for (let x = 70; x <= 130; x += 8) {
      const y = 188 + (1 - Math.pow((x - 100) / 38, 2)) * 9;
      p.line([x, y - 6, x, y + 6], 2);
    }
    p.curve('M56 160 C50 152 58 144 64 150', 2.5, C.turquesa);
    p.curve('M144 160 C150 152 142 144 136 150', 2.5, C.turquesa);
  },

  // 43 · La Campana
  (p) => {
    p.vgrad('#9ee8ff', '#e8fbff');
    p.rect(20, 20, 160, 16, C.madera, 2.5, 3);
    p.line([28, 28, 172, 28], 1.5, C.cafe);
    p.oline([100, 36, 100, 56], 4, C.cafe);
    const bell = 'M100 52 C76 52 66 72 64 100 C62 132 58 158 40 178 L160 178 C142 158 138 132 136 100 C134 72 124 52 100 52 Z';
    p.path(bell, C.oro);
    p.alpha(0.35, () => p.path('M78 80 C74 110 72 140 60 170 L70 170 C80 140 84 110 86 80 Z', C.white, false));
    p.curve('M67 120 Q100 128 133 120', 3, C.oroD);
    p.curve('M65 132 Q100 140 135 132', 2, C.oroD);
    p.oline([100, 180, 104, 200], 3, C.grisD);
    p.circle(104, 206, 9, C.grisD);
    p.rect(36, 172, 128, 12, C.oroD, 2.5, 6);
    p.curve('M30 108 Q20 128 30 148', 3);
    p.curve('M18 100 Q6 128 18 156', 3);
    p.curve('M170 108 Q180 128 170 148', 3);
    p.curve('M182 100 Q194 128 182 156', 3);
    p.text('¡din!', 46, 232, 24, C.rosa, 'center', C.white);
    p.text('¡don!', 150, 232, 24, C.turquesa, 'center', C.white);
  },

  // 44 · El Cantarito
  (p) => {
    p.rays(100, 140, 18, '#ffe8a6', '#ffdb7c');
    p.ellipse(100, 240, 56, 8, 0, 'rgba(0,0,0,0.15)', false);
    p.ocurve('M134 90 C168 90 170 150 140 160', 8, '#c0602a');
    const jug = 'M86 44 L114 44 L112 64 C140 74 156 110 152 150 C148 196 126 236 100 236 C74 236 52 196 48 150 C44 110 60 74 88 64 Z';
    p.path(jug, '#d8763a');
    p.clipPath(jug, () => {
      p.rect(30, 120, 140, 34, C.crema, false);
      for (let x = 38; x < 170; x += 22) p.flower(x, 137, 8, C.rojo, C.amarillo, 5, 1.2);
      p.line([30, 120, 170, 120], 2.5);
      p.line([30, 154, 170, 154], 2.5);
      for (let x = 50; x < 160; x += 12) p.circle(x, 176, 2.5, C.crema, false);
      for (let x = 56; x < 150; x += 12) p.circle(x, 98, 2.5, C.crema, false);
      p.alpha(0.22, () => p.path('M62 96 C54 130 56 170 70 206 L78 204 C66 170 64 130 72 98 Z', C.white, false));
    });
    p.path(jug, null);
    p.ellipse(100, 44, 18, 5, 0, '#e8925a');
    p.ellipse(100, 44, 12, 3, 0, '#7a3510', false);
  },

  // 45 · El Venado
  (p) => {
    p.vgrad('#c8f0d0', '#8fd6a0');
    p.path('M-10 172 L40 112 L80 160 L130 98 L210 172 L210 270 L-10 270 Z', '#7cc7a0', 2);
    p.path('M40 112 L52 128 L44 126 L36 132 L30 124 Z', C.white, 1.5);
    p.path('M130 98 L144 114 L136 112 L128 120 L120 110 Z', C.white, 1.5);
    p.path('M-10 212 Q100 192 210 212 L210 270 L-10 270 Z', C.verde, 2.5);
    [[74, 170, 70, 236], [88, 172, 90, 238], [122, 170, 120, 238], [136, 168, 142, 236]].forEach(([a, b, c, d]) => {
      p.oline([a, b, c, d], 5, C.cafeL);
      p.ellipse(c, d + 2, 4, 3, 0, C.negro, 1.5);
    });
    p.ellipse(104, 150, 46, 28, 0, C.cafeL);
    p.ellipse(104, 163, 30, 11, 0, C.crema, false);
    [[86, 138], [100, 132], [114, 136], [94, 146]].forEach(([x, y]) => p.circle(x, y, 2.6, C.crema, false));
    p.ellipse(57, 137, 7, 11, -30, C.white);
    p.path('M130 140 C136 120 136 100 132 84 L152 82 C156 100 154 124 146 146 Z', C.cafeL);
    p.ellipse(130, 66, 11, 5, -30, C.cafeL);
    p.ellipse(162, 62, 11, 5, 30, C.cafeL);
    p.ellipse(146, 78, 16, 14, 0, C.cafeL);
    p.ellipse(158, 87, 9, 6.5, 0, C.cafeL);
    p.circle(165, 85, 3, C.negro, false);
    p.eye(146, 76, 3.8, 0.6, 0);
    p.ocurve('M138 64 C130 44 120 36 108 30', 4, C.crema);
    p.ocurve('M126 45 C120 38 118 30 120 22', 3.5, C.crema);
    p.ocurve('M116 35 C108 30 102 22 102 14', 3.5, C.crema);
    p.ocurve('M154 62 C162 42 172 34 184 30', 4, C.crema);
    p.ocurve('M166 43 C172 36 174 28 172 20', 3.5, C.crema);
    p.ocurve('M176 34 C184 30 190 22 190 14', 3.5, C.crema);
  },

  // 46 · El Sol
  (p) => {
    p.vgrad('#7fd0ff', '#caedff');
    const cx = 100;
    const cy = 130;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const long = i % 2 === 0;
      const r1 = 56;
      const r2 = long ? 98 : 80;
      const w = long ? 0.16 : 0.13;
      p.poly([
        cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1,
        cx + Math.cos(a) * r2, cy + Math.sin(a) * r2,
        cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1,
      ], long ? C.naranja : C.amarillo, 2.5);
    }
    p.circle(cx, cy, 62, C.amarillo);
    p.circle(cx, cy, 54, null, { w: 2, c: C.naranjaL });
    p.happyEye(80, 124, 9);
    p.happyEye(120, 124, 9);
    p.curve('M71 110 Q80 104 89 110', 2.5);
    p.curve('M111 110 Q120 104 129 110', 2.5);
    p.curve('M100 126 C95 136 97 142 104 142', 2.5);
    p.path('M80 152 Q100 172 120 152 Q100 160 80 152 Z', C.rojo, 2.5);
    p.cheeks(70, 144, 130, 144, 8, 'rgba(255,90,60,0.45)');
  },

  // 47 · La Corona
  (p) => {
    p.rays(100, 120, 20, '#6c31b3', '#5a2398');
    [[30, 40, 8], [170, 46, 9], [26, 206, 6], [176, 220, 7], [100, 22, 6]].forEach(([x, y, s]) => p.sparkle(x, y, s, C.amarilloL));
    p.path('M58 132 C58 80 142 80 142 132 Z', C.rojo);
    const crown = 'M40 180 L40 110 L64 140 L82 92 L100 128 L118 92 L136 140 L160 110 L160 180 Z';
    p.path(crown, C.oro);
    p.alpha(0.3, () => p.path('M46 170 L46 124 L60 142 L60 170 Z', C.white, false));
    p.circle(100, 156, 9, C.turquesa, 2);
    p.circle(70, 160, 6, C.rosa, 2);
    p.circle(130, 160, 6, C.rosa, 2);
    p.rect(36, 172, 128, 26, C.oro, 3, 4);
    p.ellipse(100, 185, 10, 8, 0, C.rojo, 2);
    p.ellipse(68, 185, 7, 6, 0, C.azul, 2);
    p.ellipse(132, 185, 7, 6, 0, C.verde, 2);
    [[40, 104], [82, 86], [118, 86], [160, 104], [100, 122]].forEach(([x, y]) => p.circle(x, y, 6, C.white, 2));
  },

  // 48 · La Chalupa
  (p) => {
    p.vgrad('#aee9f0', '#62c6d6');
    p.oline([42, 118, 46, 170], 4, C.amarillo);
    p.oline([158, 118, 154, 170], 4, C.amarillo);
    p.path('M34 122 C34 70 166 70 166 122 L152 122 C152 88 48 88 48 122 Z', C.rosa);
    p.text('LUPITA', 100, 86, 16, C.white, 'center', C.ink);
    [[40, 116, C.amarillo], [100, 70, C.turquesa], [160, 116, C.amarillo], [66, 82, C.naranja], [134, 82, C.naranja]].forEach(([x, y, c]) => p.flower(x, y, 8, c, C.rojo, 5, 1.5));
    p.ellipse(70, 156, 7, 16, 18, C.amarillo);
    p.ellipse(84, 154, 7, 16, -8, C.amarillo);
    p.path('M66 170 C62 156 64 146 70 140 C70 152 72 160 76 168 Z', C.verde, 1.8);
    p.poly([112, 170, 124, 138, 130, 170], C.naranja, 2);
    p.poly([126, 170, 136, 142, 142, 170], C.naranja, 2);
    p.curve('M124 138 L120 128 M124 138 L126 126 M136 142 L134 132 M136 142 L140 132', 2, C.verde);
    p.flower(100, 150, 10, C.rosa, C.amarillo, 6, 1.6);
    p.flower(150, 156, 8, C.morado, C.amarillo, 6, 1.4);
    p.path('M14 170 L186 170 C178 196 150 210 100 210 C50 210 22 196 14 170 Z', C.verde);
    p.rect(14, 164, 172, 10, C.amarillo, 2.5, 3);
    p.flower(60, 190, 8, C.rojo, C.amarillo, 5, 1.2);
    p.flower(100, 194, 8, C.azul, C.amarillo, 5, 1.2);
    p.flower(140, 190, 8, C.morado, C.amarillo, 5, 1.2);
    p.waves(210, '#4bb7cf', '#2f9fbf', 5);
  },

  // 49 · El Pino
  (p) => {
    p.vgrad('#cfe9ff', '#f5fbff');
    p.path('M-10 192 L50 112 L100 172 L150 102 L210 182 L210 270 L-10 270 Z', '#b8c8e6', 2);
    p.path('M50 112 L62 128 L54 126 L46 134 L40 126 Z', C.white, 1.5);
    p.path('M150 102 L164 120 L156 118 L148 126 L140 116 Z', C.white, 1.5);
    p.path('M-10 228 Q100 214 210 228 L210 270 L-10 270 Z', C.white, 2.5);
    const layer = (x, y, w, h, c) => p.path(`M${x} ${y - h} L${x + w} ${y} L${x + w * 0.5} ${y - 6} L${x + w * 0.25} ${y + 4} L${x} ${y - 4} L${x - w * 0.25} ${y + 4} L${x - w * 0.5} ${y - 6} L${x - w} ${y} Z`, c);
    p.rect(30, 206, 8, 20, C.madera, 2);
    layer(34, 210, 20, 30, C.verde);
    layer(34, 188, 15, 26, C.verde);
    p.rect(162, 206, 8, 20, C.madera, 2);
    layer(166, 210, 20, 30, C.verde);
    layer(166, 188, 15, 26, C.verde);
    p.rect(92, 198, 16, 36, C.madera, 2.5);
    layer(100, 208, 62, 60, C.verdeD);
    layer(100, 168, 52, 56, C.verdeD);
    layer(100, 130, 42, 50, C.verdeD);
    layer(100, 94, 30, 44, C.verdeD);
    p.alpha(0.3, () => {
      p.poly([100, 52, 84, 90, 96, 86], C.lima, false);
      p.poly([100, 84, 70, 126, 92, 122], C.lima, false);
      p.poly([100, 120, 62, 164, 90, 160], C.lima, false);
    });
    [[20, 40], [60, 20], [140, 30], [180, 60], [30, 100], [170, 140]].forEach(([x, y]) => p.star(x, y, 5, 1.6, 6, C.white, false, 0));
  },

  // 50 · El Pescado
  (p) => {
    p.vgrad('#52b6ff', '#1e6fc4');
    p.bubbles([[176, 60, 6], [186, 40, 4], [168, 28, 3], [30, 210, 5]]);
    [[20, 262, 200], [40, 262, 214], [170, 262, 206]].forEach(([x, y, top]) => p.ocurve(`M${x} ${y} C${x - 10} ${y - 20} ${x + 10} ${top + 20} ${x} ${top}`, 5, C.verde));
    p.path('M42 130 L10 94 C8 116 8 144 10 166 Z', C.naranja);
    const body = 'M36 130 C60 86 130 76 168 118 C176 126 176 134 168 142 C130 184 60 174 36 130 Z';
    p.path(body, C.amarillo);
    p.clipPath(body, () => {
      p.path('M78 70 C68 110 68 150 78 190 L94 190 C84 150 84 110 94 70 Z', C.naranja, false);
      p.path('M112 70 C102 110 102 150 112 190 L126 190 C116 150 116 110 126 70 Z', C.naranja, false);
      for (let y = 96, row = 0; y < 170; y += 9, row++) {
        for (let x = 50 + (row % 2) * 5; x < 140; x += 10) p.arc(x, y, 5, 20, 160, 1.3, 'rgba(160,80,0,0.45)');
      }
    });
    p.path(body, null);
    p.path('M90 96 C100 70 122 70 130 92 Z', C.naranja);
    p.path('M96 162 C104 184 120 184 126 164 Z', C.naranja);
    p.curve('M132 104 Q124 130 132 156', 2.5);
    p.eye(148, 118, 8, 0.4, 0);
    p.curve('M172 134 Q166 139 160 136', 2.2);
  },

  // 51 · La Palma
  (p) => {
    p.vgrad('#ff8a5b', '#ffd27a');
    p.circle(144, 150, 34, '#fff0a0', false);
    p.rect(-10, 168, 220, 110, '#2f86c8', false);
    p.line([-10, 168, 210, 168], 2.5);
    [[30, 186], [120, 196], [170, 184], [70, 204]].forEach(([x, y]) => p.curve(`M${x - 12} ${y} q6 -4 12 0 q6 4 12 0`, 2, C.white));
    p.path('M16 264 C36 214 150 208 184 264 Z', C.arena, 2.5);
    const pts = [];
    for (let i = 0; i <= 9; i++) {
      const t = i / 9;
      pts.push([108 - t * 36 + Math.sin(t * 3) * 14, 240 - t * 170]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const w0 = 11 - i * 0.5;
      const w1 = 11 - (i + 1) * 0.5;
      p.poly([x0 - w0, y0, x0 + w0, y0, x1 + w1, y1, x1 - w1, y1], i % 2 ? C.madera : C.maderaL, 2);
    }
    const [topX, topY] = pts[pts.length - 1];
    const frond = (ang, len, c) => {
      const a = ang * D;
      const ex = topX + Math.cos(a) * len;
      const ey = topY + Math.sin(a) * len + len * 0.35;
      const mx = topX + Math.cos(a) * len * 0.5;
      const my = topY + Math.sin(a) * len * 0.5;
      p.path(`M${topX} ${topY} Q${mx} ${my - 22} ${ex} ${ey} Q${mx} ${my - 4} ${topX} ${topY} Z`, c, 2.2);
    };
    frond(200, 70, C.verdeD);
    frond(340, 70, C.verdeD);
    frond(160, 62, C.verde);
    frond(20, 62, C.verde);
    frond(250, 52, C.verde);
    frond(295, 56, C.verdeD);
    p.circle(topX - 6, topY + 10, 7, C.cafe);
    p.circle(topX + 7, topY + 11, 7, C.cafe);
    p.circle(topX, topY + 20, 7, C.cafe);
  },

  // 52 · La Maceta
  (p) => {
    p.bg('#ffd6e8');
    p.dots('#ffc2dc', 22, 4);
    [[100, 150, 70, 76], [100, 150, 120, 58], [100, 150, 150, 98], [100, 150, 54, 120], [100, 150, 100, 102]].forEach(([x0, y0, x1, y1]) =>
      p.ocurve(`M${x0} ${y0} Q${(x0 + x1) / 2 + (x1 > x0 ? -10 : 10)} ${(y0 + y1) / 2} ${x1} ${y1}`, 3, C.verde));
    [[82, 124, -40], [118, 120, 40], [70, 104, -20], [134, 110, 30], [96, 90, 10]].forEach(([x, y, r]) => p.ellipse(x, y, 13, 6, r, C.verde, 2));
    p.flower(70, 74, 16, C.rojo, C.amarillo);
    p.flower(120, 56, 18, C.naranja, C.amarillo);
    p.flower(151, 98, 14, C.morado, C.amarillo);
    p.flower(52, 120, 13, C.rosaL, C.amarillo);
    p.flower(100, 102, 12, C.amarillo, C.naranja);
    p.path('M52 150 L148 150 L136 238 L64 238 Z', '#d8763a');
    p.line([60, 196, 76, 184, 92, 196, 108, 184, 124, 196, 140, 184], 3, C.crema);
    [[70, 214], [90, 218], [110, 218], [130, 214]].forEach(([x, y]) => p.circle(x, y, 3, C.crema, false));
    p.rect(46, 140, 108, 20, '#e8925a', 2.5, 4);
    p.ellipse(100, 242, 50, 6, 0, 'rgba(0,0,0,0.15)', false);
  },

  // 53 · El Arpa
  (p) => {
    p.rays(100, 130, 20, '#ffe4a3', '#ffd479');
    const topY = (x) => 44 + Math.sin(((x - 48) / 110) * Math.PI) * 10;
    const botY = (x) => 236 - (x - 44) * 1.586;
    for (let x = 58; x <= 150; x += 8) {
      p.line([x, topY(x) + 4, x, botY(x) - 6], 2.2, 'rgba(90,50,10,0.55)');
      p.line([x, topY(x) + 4, x, botY(x) - 6], 1, '#fff7e0');
    }
    p.path('M44 238 L160 54 L174 62 L62 244 Z', C.maderaL);
    p.curve('M58 232 L164 64', 1.5, C.cafe);
    p.oline([48, 44, 48, 238], 8, C.madera);
    p.ocurve('M48 44 C80 26 110 60 150 42 C162 36 168 46 162 56', 8, C.madera);
    p.circle(48, 40, 9, C.oro, 2.5);
    p.circle(48, 40, 3.5, C.oroD, false);
    p.rect(34, 234, 44, 10, C.madera, 2.5, 3);
    [[48, 100], [48, 150], [48, 200]].forEach(([x, y]) => p.circle(x, y, 3.5, C.oro, 1.5));
  },

  // 54 · La Rana
  (p) => {
    p.vgrad('#a4e2b4', '#4fb38a');
    [[40, 90, 30], [160, 60, 24]].forEach(([x, y, r]) => {
      p.ellipse(x, y, r, r * 0.3, 0, null, { w: 1.5, c: 'rgba(255,255,255,0.6)' });
      p.ellipse(x, y, r * 0.6, r * 0.18, 0, null, { w: 1.5, c: 'rgba(255,255,255,0.6)' });
    });
    p.shape((g) => {
      g.ellipse(100, 206, 84, 30, 0, -1.35, 4.5);
      g.lineTo(100, 206);
      g.closePath();
    }, C.verde);
    p.curve('M100 206 L40 196 M100 206 L160 198 M100 206 L70 226 M100 206 L136 226', 1.5, C.verdeD);
    p.ellipse(60, 188, 22, 12, -20, C.lima);
    p.ellipse(140, 188, 22, 12, 20, C.lima);
    [[42, 198], [50, 202], [58, 204], [158, 198], [150, 202], [142, 204]].forEach(([x, y]) => p.circle(x, y, 4, C.lima, 2));
    p.ellipse(100, 168, 44, 34, 0, C.lima);
    p.ellipse(100, 182, 26, 17, 0, C.menta, 2);
    [[76, 156], [124, 158], [90, 146], [114, 146]].forEach(([x, y]) => p.circle(x, y, 3.5, C.verde, false));
    p.oline([84, 186, 80, 202], 5, C.lima);
    p.oline([116, 186, 120, 202], 5, C.lima);
    p.circle(76, 126, 16, C.lima);
    p.circle(124, 126, 16, C.lima);
    p.eye(76, 124, 10, 0, 0.2);
    p.eye(124, 124, 10, 0, 0.2);
    p.curve('M72 158 Q100 176 128 158', 3);
    p.cheeks(70, 150, 130, 150, 5);
    p.flower(170, 166, 12, C.rosaL, C.amarillo, 8, 1.8);
    p.ellipse(40, 40, 5, 3.5, 0, C.negro, false);
    p.ellipse(37, 36, 4, 2.4, -30, 'rgba(255,255,255,0.8)', 1);
    p.ellipse(44, 36, 4, 2.4, 30, 'rgba(255,255,255,0.8)', 1);
    p.curve('M48 44 q10 6 20 0 q10 -6 20 2', 1.5, 'rgba(0,0,0,0.3)');
  },
];
