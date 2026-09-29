// Ilustraciones originales, cartas 1–18. Espacio de dibujo: 200 × 260.
import { C } from './painter.js';

const D = Math.PI / 180;

export const ART1 = [
  // 1 · El Gallo
  (p) => {
    p.rays(112, 118, 18, '#ffd75e', '#ffc83a');
    p.path('M-10 226 Q100 210 210 226 L210 270 L-10 270 Z', C.verde, 2.5);
    p.grass(230, C.verdeD, 6);
    // cola
    p.path('M84 140 C50 118 42 70 66 36 C68 74 78 104 98 124 Z', C.marino);
    p.path('M80 150 C40 146 18 108 26 66 C42 100 60 122 94 134 Z', C.verde);
    p.path('M84 160 C50 176 20 162 10 130 C36 146 60 150 94 148 Z', C.turquesa);
    // patas
    p.oline([100, 186, 96, 226], 5, C.oro);
    p.oline([120, 186, 124, 226], 5, C.oro);
    p.oline([96, 226, 84, 231], 4, C.oro);
    p.oline([96, 226, 106, 231], 4, C.oro);
    p.oline([124, 226, 114, 231], 4, C.oro);
    p.oline([124, 226, 136, 231], 4, C.oro);
    // cuerpo
    p.ellipse(110, 156, 50, 38, -12, C.rojo);
    p.path('M86 150 C100 132 132 134 142 154 C132 178 104 184 88 170 C96 164 96 158 86 150 Z', C.rojoD);
    p.curve('M100 162 Q112 172 126 166', 2, C.rojo);
    p.curve('M96 152 Q110 160 128 155', 2, C.rojo);
    // cuello
    p.path('M128 136 C124 116 130 98 142 90 L166 98 C164 116 158 134 152 150 Z', C.naranja);
    p.curve('M136 112 Q146 120 158 113', 2, C.amarillo);
    p.curve('M134 126 Q145 134 156 127', 2, C.amarillo);
    // cresta
    p.circle(141, 67, 8, C.rojo);
    p.circle(152, 61, 9, C.rojo);
    p.circle(164, 67, 8, C.rojo);
    // cabeza
    p.circle(154, 85, 19, C.naranja);
    p.poly([171, 80, 191, 87, 171, 94], C.amarillo);
    p.path('M168 95 C176 103 173 115 164 115 C158 111 160 101 168 95 Z', C.rojo);
    p.eye(159, 80, 5, 0.6, 0);
  },

  // 2 · El Diablito
  (p) => {
    p.rays(100, 110, 16, '#ffc06a', '#ffac48');
    const flame = (x, h, c) =>
      p.path(`M${x - 16} 264 C${x - 18} ${264 - h * 0.5} ${x - 4} ${264 - h * 0.6} ${x} ${264 - h} C${x + 6} ${264 - h * 0.6} ${x + 18} ${264 - h * 0.5} ${x + 16} 264 Z`, c, 2);
    [[8, 62, C.rojo], [38, 84, C.naranja], [68, 56, C.rojo], [132, 60, C.rojo], [162, 86, C.naranja], [192, 60, C.rojo]].forEach(([x, h, c]) => flame(x, h, c));
    [[24, 36], [84, 30], [146, 38], [178, 34]].forEach(([x, h]) => flame(x, h, C.amarillo));
    // cola
    p.ocurve('M118 196 C150 206 176 176 160 150 C152 138 162 126 170 130', 5, C.rojoD);
    p.poly([164, 122, 184, 126, 172, 142], C.rojoD);
    // trinche
    p.oline([152, 60, 152, 238], 5, C.oroD);
    p.ocurve('M138 66 Q152 76 166 66', 4, C.oro);
    p.oline([138, 67, 138, 46], 4, C.oro);
    p.oline([152, 72, 152, 40], 4, C.oro);
    p.oline([166, 67, 166, 46], 4, C.oro);
    p.poly([133, 48, 138, 36, 143, 48], C.oro, 2);
    p.poly([147, 42, 152, 30, 157, 42], C.oro, 2);
    p.poly([161, 48, 166, 36, 171, 48], C.oro, 2);
    // piernas
    p.rect(80, 196, 14, 30, C.rojo, true, 6);
    p.rect(106, 196, 14, 30, C.rojo, true, 6);
    p.ellipse(85, 228, 12, 6, 0, C.negro);
    p.ellipse(115, 228, 12, 6, 0, C.negro);
    // cuerpo
    p.path('M70 150 C68 124 132 124 130 150 L134 202 C120 212 80 212 66 202 Z', C.rojo);
    p.ellipse(100, 172, 16, 20, 0, '#ff6b6b', false);
    p.ocurve('M73 150 C57 164 59 180 73 184', 9, C.rojo);
    p.ocurve('M128 148 C140 140 146 128 150 120', 9, C.rojo);
    p.circle(151, 118, 7, C.rojo);
    // cuernos y orejas
    p.path('M76 70 C66 52 70 38 80 32 C80 46 86 58 94 64 Z', C.crema);
    p.path('M124 70 C134 52 130 38 120 32 C120 46 114 58 106 64 Z', C.crema);
    p.poly([67, 84, 52, 74, 69, 97], C.rojo);
    p.poly([133, 84, 148, 74, 131, 97], C.rojo);
    // cabeza
    p.circle(100, 88, 34, C.rojo);
    p.line([80, 73, 94, 80], 4);
    p.line([120, 73, 106, 80], 4);
    p.eye(88, 88, 7, 0.8, 0.2);
    p.eye(112, 88, 7, 0.8, 0.2);
    p.path('M80 102 Q100 124 120 102 Q100 110 80 102 Z', C.rojoD, 2.5);
    p.poly([109, 106, 114, 106, 111.5, 113], C.white, 1.5);
    p.poly([94, 120, 106, 120, 100, 134], C.rojoD, 2);
  },

  // 3 · La Dama
  (p) => {
    p.bg('#f9cfe4');
    p.dots('#f4b3d3', 22, 3.2);
    // vestido
    p.path('M100 120 C84 122 80 150 74 178 C66 208 50 234 38 256 L162 256 C150 234 134 208 126 178 C120 150 116 122 100 120 Z', C.turquesa);
    p.curve('M90 152 Q82 200 70 250', 2, C.turquesaL);
    p.curve('M110 152 Q118 200 130 250', 2, C.turquesaL);
    p.curve('M100 152 L100 252', 2, C.turquesaL);
    let d = 'M40 248';
    for (let x = 40; x < 160; x += 15) d += ' q7.5 10 15 0';
    p.path(d + ' L160 264 L40 264 Z', C.white, 2);
    p.path('M82 142 Q100 150 118 142 L120 154 Q100 162 80 154 Z', C.rosa);
    // torso y brazos
    p.path('M86 112 C86 100 114 100 114 112 L118 146 Q100 152 82 146 Z', C.turquesa);
    p.ocurve('M86 118 C74 132 76 146 86 150', 8, C.piel2);
    p.ocurve('M114 118 C128 124 132 132 134 140', 8, C.piel2);
    // abanico
    p.sector(136, 146, 46, -100, -18, C.rosa);
    for (let a = -100; a <= -18; a += 16.4) {
      p.line([136, 146, 136 + Math.cos(a * D) * 44, 146 + Math.sin(a * D) * 44], 1.5, C.rosaL);
    }
    p.arc(136, 146, 40, -100, -18, 2, C.rosaP);
    p.circle(136, 146, 4, C.oro, 1.5);
    // cabeza
    p.rect(94, 92, 12, 16, C.piel2, 2);
    p.circle(100, 76, 26, C.cafe);
    p.circle(100, 46, 14, C.cafe);
    p.circle(100, 80, 21, C.piel2);
    p.path('M79 77 C80 58 120 58 121 77 C112 66 90 66 79 77 Z', C.cafe, 2);
    p.flower(121, 58, 12, C.rosa, C.amarillo, 6, 1.5);
    p.happyEye(92, 82, 5);
    p.happyEye(108, 82, 5);
    p.cheeks(89, 90, 111, 90, 4);
    p.path('M96 93 Q100 98 104 93 Q100 95 96 93 Z', C.rojo, 1.5);
    p.circle(79, 93, 4, null, { w: 2, c: C.oro });
    p.circle(121, 93, 4, null, { w: 2, c: C.oro });
  },

  // 4 · El Catrín
  (p) => {
    p.rays(100, 70, 20, '#ffe39a', '#ffd46a');
    p.ellipse(100, 238, 50, 8, 0, 'rgba(0,0,0,0.15)', false);
    p.path('M84 168 L82 234 L97 234 L100 178 L103 234 L118 234 L116 168 Z', C.negro);
    p.ellipse(86, 236, 12, 5, 0, C.negro);
    p.ellipse(114, 236, 12, 5, 0, C.negro);
    // bastón
    p.oline([146, 128, 152, 236], 4, C.madera);
    // frac
    p.path('M72 112 C70 150 66 176 62 192 L86 186 L100 134 L114 186 L138 192 C134 176 130 150 128 112 Z', C.marino);
    p.path('M74 108 C80 98 120 98 126 108 L128 150 L100 156 L72 150 Z', C.marino);
    p.poly([88, 102, 112, 102, 100, 148], C.white);
    p.circle(100, 124, 2, C.ink, false);
    p.circle(100, 134, 2, C.ink, false);
    p.poly([84, 104, 100, 146, 91, 110], C.nocheL, 2);
    p.poly([116, 104, 100, 146, 109, 110], C.nocheL, 2);
    p.poly([100, 106, 86, 99, 86, 113], C.rojo, 2);
    p.poly([100, 106, 114, 99, 114, 113], C.rojo, 2);
    p.circle(100, 106, 3.5, C.rojo, 2);
    p.ocurve('M124 112 C136 116 142 120 145 126', 10, C.marino);
    p.circle(146, 126, 6, C.white);
    p.circle(146, 118, 6, C.oro, 2);
    p.ocurve('M76 112 C62 124 64 138 78 142', 10, C.marino);
    // cabeza
    p.rect(94, 86, 12, 14, C.piel1, 2);
    p.circle(100, 76, 19, C.piel1);
    p.path('M100 86 C94 80 84 82 81 89 C86 86 90 91 100 88 C110 91 114 86 119 89 C116 82 106 80 100 86 Z', C.cafe, 2);
    p.circle(92, 72, 2.4, C.ink, false);
    p.circle(108, 72, 6, 'rgba(200,240,255,0.55)', { w: 2.2, c: C.oro });
    p.circle(108, 72, 2.4, C.ink, false);
    p.curve('M113 76 Q121 92 117 104', 1.4, C.oro);
    p.line([87, 66, 96, 65], 2.4);
    p.line([104, 64, 113, 66], 2.4);
    // sombrero de copa
    p.ellipse(100, 58, 30, 6, 0, C.negro);
    p.rect(84, 18, 32, 40, C.negro, true, 2);
    p.rect(84, 47, 32, 7, C.rojo, 2);
    p.ellipse(100, 18, 16, 3, 0, '#3d3946', 2);
  },

  // 5 · El Paraguas
  (p) => {
    p.vgrad('#bde8ff', '#e6f6ff');
    const drop = (x, y) => p.path(`M${x} ${y - 8} C${x + 5} ${y - 1} ${x + 5} ${y + 4} ${x} ${y + 5} C${x - 5} ${y + 4} ${x - 5} ${y - 1} ${x} ${y - 8} Z`, C.azul, 1.5);
    [[20, 30], [46, 16], [170, 24], [186, 62], [14, 82], [30, 200], [176, 190], [160, 238], [40, 242], [190, 130], [12, 152], [60, 222], [150, 214]].forEach(([x, y]) => drop(x, y));
    p.ocurve('M100 118 L100 206 C100 226 126 226 126 206', 6, C.madera);
    p.path('M30 120 C30 70 60 42 100 42 Q80 70 65 120 Q47 104 30 120 Z', C.rosa);
    p.path('M100 42 Q80 70 65 120 Q83 104 100 120 Z', C.amarillo);
    p.path('M100 42 L100 120 Q117 104 135 120 Q120 70 100 42 Z', C.turquesa);
    p.path('M100 42 Q120 70 135 120 Q152 104 170 120 C170 70 140 42 100 42 Z', C.morado);
    [[50, 92], [83, 88], [117, 88], [150, 92]].forEach(([x, y]) => p.circle(x, y, 4, C.white, 1.5));
    p.oline([100, 42, 100, 28], 3, C.madera);
    p.circle(100, 27, 4, C.oro, 2);
    [30, 65, 100, 135, 170].forEach((x) => p.circle(x, 120, 2.5, C.ink, false));
  },

  // 6 · La Sirena
  (p) => {
    p.vgrad('#58cadb', '#1e7fb8');
    p.alpha(0.14, () => {
      p.poly([40, -10, 70, -10, 20, 270, -10, 270], C.white, false);
      p.poly([120, -10, 140, -10, 110, 270, 80, 270], C.white, false);
    });
    p.bubbles([[30, 40, 6], [42, 62, 4], [168, 48, 7], [160, 80, 4], [182, 110, 3]]);
    p.path('M58 206 C62 176 150 170 178 196 C190 210 196 240 196 264 L50 264 C48 240 52 220 58 206 Z', C.gris);
    p.curve('M90 190 Q110 184 130 192', 2);
    p.curve('M140 214 Q160 208 172 220', 2);
    const tail = 'M84 152 C122 158 130 190 106 212 C88 228 64 230 50 236 C62 224 74 216 84 202 C94 188 84 174 74 164 Z';
    p.path(tail, C.verde);
    p.clipPath(tail, () => {
      for (let y = 150, row = 0; y < 240; y += 8, row++) {
        for (let x = 40 + (row % 2) * 5; x < 140; x += 10) p.arc(x, y, 5, 20, 160, 1.5, C.verdeD);
      }
    });
    p.path(tail, null);
    p.path('M54 234 C40 226 24 232 16 246 C30 244 40 246 48 252 C44 244 50 238 54 234 Z', C.turquesa);
    p.path('M54 234 C54 248 46 258 34 262 C44 254 46 246 48 240 Z', C.turquesa);
    p.path('M86 104 C80 120 80 140 86 158 L110 156 C116 138 114 118 110 104 Z', C.piel3);
    p.ocurve('M110 126 C124 140 132 150 140 170', 8, C.piel3);
    p.path('M78 76 C70 52 124 44 122 78 C128 104 126 134 134 158 C118 150 112 132 110 114 L90 110 C84 124 76 136 66 144 C74 124 76 98 78 76 Z', C.rojo);
    p.sector(92, 128, 9, 180, 360, C.rosaL, 2);
    p.sector(106, 128, 9, 180, 360, C.rosaL, 2);
    p.circle(98, 82, 17, C.piel3);
    p.path('M80 81 C82 62 116 60 116 81 C108 71 92 71 80 81 Z', C.rojo, 2);
    p.ocurve('M88 110 C74 102 72 90 80 82', 7, C.piel3);
    p.happyEye(92, 85, 4);
    p.happyEye(106, 85, 4);
    p.curve('M95 93 Q99 97 103 93', 2);
    p.cheeks(89, 91, 109, 91, 3.5);
    p.star(160, 204, 11, 5, 5, C.naranja, 2);
  },

  // 7 · La Escalera
  (p) => {
    p.vgrad('#ff9e6b', '#ffe09a');
    p.cloud(40, 60, 1.1);
    p.cloud(160, 36, 0.9);
    p.cloud(158, 130, 0.7);
    p.cloud(30, 160, 0.6);
    p.sparkle(172, 176, 6);
    p.sparkle(24, 110, 5);
    p.sparkle(120, 16, 5);
    for (let i = 0; i < 9; i++) {
      const t = i / 9 + 0.05;
      const y = 262 - t * 242;
      const xl = 54 + (88 - 54) * t;
      const xr = 146 + (116 - 146) * t;
      p.oline([xl, y, xr, y], 5 - t * 1.8, C.maderaL);
    }
    p.oline([54, 264, 88, 20], 8 - 1, C.madera);
    p.oline([146, 264, 116, 20], 8 - 1, C.madera);
  },

  // 8 · La Botella
  (p) => {
    p.rays(100, 130, 16, '#a3e5de', '#80d7cf');
    p.ellipse(100, 240, 46, 8, 0, 'rgba(0,0,0,0.18)', false);
    const d = 'M86 38 L114 38 L114 60 C114 82 140 92 142 124 L142 224 C142 234 134 238 124 238 L76 238 C66 238 58 234 58 224 L58 124 C60 92 86 82 86 60 Z';
    p.path(d, C.verde);
    p.rect(64, 140, 72, 58, C.crema, 2.5, 4);
    p.star(100, 162, 12, 5, 5, C.rojo, 2);
    p.rect(76, 182, 48, 7, C.rojo, false, 2);
    p.rect(84, 58, 32, 7, C.verdeD, 2, 2);
    p.rect(88, 18, 24, 22, C.maderaL, 2.5, 4);
    p.line([93, 24, 93, 34], 1.5);
    p.line([100, 22, 100, 36], 1.5);
    p.line([107, 24, 107, 34], 1.5);
    p.alpha(0.45, () => p.path('M68 118 C70 100 82 92 86 84 L90 86 C86 96 78 104 76 120 L76 222 L68 222 Z', C.white, false));
  },

  // 9 · El Barril
  (p) => {
    p.bg('#ffcf7a');
    p.dots('#ffc25c', 24, 5);
    p.ellipse(100, 238, 62, 10, 0, 'rgba(0,0,0,0.18)', false);
    const body = 'M50 60 C40 110 40 180 50 230 C80 238 120 238 150 230 C160 180 160 110 150 60 Z';
    p.path(body, C.madera);
    p.clipPath(body, () => {
      [66, 83, 100, 117, 134].forEach((x) => p.curve(`M${x} 50 C${x + (x - 100) * 0.3} 145 ${x + (x - 100) * 0.3} 145 ${x} 240`, 2, C.cafe));
      p.alpha(0.22, () => p.rect(58, 50, 14, 190, C.white, false));
    });
    p.path(body, null);
    p.ellipse(100, 60, 50, 12, 0, C.maderaL);
    p.ellipse(100, 60, 40, 8, 0, C.madera, 2);
    p.path('M46 86 C80 96 120 96 154 86 L155 98 C120 108 80 108 45 98 Z', C.grisD, 2.5);
    p.path('M43 168 C80 178 120 178 157 168 L156 180 C120 190 80 190 44 180 Z', C.grisD, 2.5);
    p.path('M48 212 C80 220 120 220 152 212 L151 224 C120 232 80 232 49 224 Z', C.grisD, 2.5);
    [60, 100, 140].forEach((x) => p.circle(x, 100 - Math.abs(x - 100) * 0.1, 1.8, C.grisL, false));
    p.rect(92, 128, 16, 14, C.oro, 2.5, 3);
    p.rect(96, 142, 8, 12, C.oro, 2.5, 2);
  },

  // 10 · El Árbol
  (p) => {
    p.vgrad('#aee4ff', '#e3f7ff');
    p.path('M-10 220 Q100 204 210 220 L210 270 L-10 270 Z', C.lima, 2.5);
    p.path('M88 232 C92 200 92 170 86 140 L114 140 C108 170 108 200 112 232 C120 237 130 239 136 243 L64 243 C70 239 80 237 88 232 Z', C.madera);
    p.curve('M96 150 Q98 180 96 212', 2, C.cafe);
    p.curve('M106 160 Q104 186 107 222', 2, C.cafe);
    p.ocurve('M92 150 C80 136 70 130 60 128', 6, C.madera);
    p.ocurve('M108 146 C122 132 134 128 144 126', 6, C.madera);
    const blobs = [[100, 70, 48], [58, 100, 32], [142, 100, 32], [70, 60, 28], [132, 62, 30], [100, 112, 34], [40, 132, 20], [160, 130, 20]];
    blobs.forEach(([x, y, r]) => p.circle(x, y, r, C.verde));
    blobs.forEach(([x, y, r]) => p.circle(x, y, r - 1.6, C.verde, false));
    p.alpha(0.35, () => {
      p.circle(84, 52, 14, C.lima, false);
      p.circle(130, 50, 10, C.lima, false);
      p.circle(56, 92, 9, C.lima, false);
      p.circle(146, 94, 8, C.lima, false);
    });
    [[70, 82], [122, 90], [96, 56], [146, 112], [56, 118], [108, 122], [152, 72], [40, 132]].forEach(([x, y]) => {
      p.circle(x, y, 6, C.rojo, 2);
      p.circle(x - 2, y - 2, 1.6, C.white, false);
    });
  },

  // 11 · El Melón
  (p) => {
    p.rays(100, 140, 16, '#fff1a8', '#ffe57a');
    p.ellipse(96, 240, 70, 9, 0, 'rgba(0,0,0,0.15)', false);
    p.circle(90, 128, 62, '#d3dc9e');
    p.clip((g) => g.arc(90, 128, 60, 0, Math.PI * 2), () => {
      for (let i = -8; i <= 8; i++) {
        p.line([90 + i * 14 - 70, 60, 90 + i * 14 + 70, 200], 1.6, '#9ba767');
        p.line([90 + i * 14 + 70, 60, 90 + i * 14 - 70, 200], 1.6, '#9ba767');
      }
      p.alpha(0.3, () => p.circle(68, 100, 26, C.white, false));
      p.alpha(0.2, () => p.circle(120, 160, 50, '#6b7a30', false));
    });
    p.ocurve('M90 66 C84 58 86 50 94 44', 3, C.verdeD);
    p.path('M100 202 Q148 268 198 202 Z', '#bccc72');
    p.path('M106 204 Q148 258 192 204 Z', C.naranjaL, 2);
    p.path('M112 204 L186 204 Q176 216 148 218 Q120 216 112 204 Z', '#ffc98a', false);
    [[124, 208], [136, 211], [148, 212], [160, 211], [172, 208]].forEach(([x, y]) => p.ellipse(x, y, 3, 1.7, 10, C.crema, 1));
  },

  // 12 · El Valiente (luchador)
  (p) => {
    p.rays(100, 110, 20, '#ffd23f', '#ffa21f');
    p.path('M64 96 C40 140 34 200 30 252 L170 252 C166 200 160 140 136 96 Z', C.rojo);
    p.curve('M60 150 Q56 200 50 248', 2, C.rojoD);
    p.curve('M140 150 Q144 200 150 248', 2, C.rojoD);
    p.line([-10, 212, 210, 206], 7, C.ink);
    p.line([-10, 212, 210, 206], 4, C.white);
    p.path('M78 190 L74 240 L96 240 L100 200 L104 240 L126 240 L122 190 Z', C.piel3);
    p.path('M72 222 L98 222 L98 250 L66 250 C64 240 66 230 72 222 Z', C.azul);
    p.path('M102 222 L128 222 C134 230 136 240 134 250 L102 250 Z', C.azul);
    p.line([74, 230, 96, 230], 1.5, C.white);
    p.line([104, 230, 126, 230], 1.5, C.white);
    p.path('M76 168 L124 168 L126 198 L104 204 L100 196 L96 204 L74 198 Z', C.oro);
    p.star(100, 182, 7, 3, 5, C.rojo, 1.5);
    p.path('M72 110 C70 94 130 94 128 110 L126 170 L74 170 Z', C.piel3);
    p.curve('M100 118 L100 160', 2, C.piel4);
    p.curve('M86 128 Q93 134 100 128', 2, C.piel4);
    p.curve('M100 128 Q107 134 114 128', 2, C.piel4);
    p.curve('M88 146 L112 146', 1.8, C.piel4);
    p.curve('M89 156 L111 156', 1.8, C.piel4);
    // brazos flexionados
    p.ocurve('M74 104 C58 104 48 96 46 80', 14, C.piel3);
    p.ocurve('M46 82 C44 68 50 58 58 54', 12, C.piel3);
    p.circle(60, 50, 9, C.piel3);
    p.ellipse(55, 90, 10, 8, -30, C.piel3, 2);
    p.ocurve('M126 104 C142 104 152 96 154 80', 14, C.piel3);
    p.ocurve('M154 82 C156 68 150 58 142 54', 12, C.piel3);
    p.circle(140, 50, 9, C.piel3);
    p.ellipse(145, 90, 10, 8, 30, C.piel3, 2);
    // máscara
    p.circle(100, 74, 22, C.azul);
    p.path('M100 52 C95 58 89 58 87 65 C93 63 97 65 100 69 C103 65 107 63 113 65 C111 58 105 58 100 52 Z', C.oro, 1.8);
    p.path('M84 72 C88 63 96 65 97 73 C94 79 86 79 84 72 Z', C.white, 2);
    p.path('M116 72 C112 63 104 65 103 73 C106 79 114 79 116 72 Z', C.white, 2);
    p.circle(91, 72.5, 2.4, C.ink, false);
    p.circle(109, 72.5, 2.4, C.ink, false);
    p.path('M92 85 Q100 93 108 85 Q100 89 92 85 Z', C.piel3, 2);
  },

  // 13 · El Gorrito
  (p) => {
    p.bg('#d9f4f1');
    p.dots('#bfe9e4', 22, 4);
    [[30, 40], [170, 60], [24, 210], [176, 220], [150, 30]].forEach(([x, y]) => p.star(x, y, 7, 2, 6, C.white, false, 0));
    const dome = 'M40 170 C40 100 70 64 100 64 C130 64 160 100 160 170 Z';
    p.path(dome, C.rosa);
    p.clipPath(dome, () => {
      p.rect(30, 100, 140, 16, C.white, false);
      p.rect(30, 136, 140, 16, C.turquesa, false);
      for (let y = 74; y < 170; y += 9) for (let x = 38; x < 164; x += 9) p.curve(`M${x} ${y} l3 4 l3 -4`, 1.1, 'rgba(0,0,0,0.16)');
    });
    p.path(dome, null);
    p.rect(34, 164, 132, 30, C.rosaL, 2.5, 10);
    for (let x = 42; x < 162; x += 8) p.line([x, 169, x, 189], 1.6, C.rosa);
    p.circle(100, 58, 20, C.white);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      p.line([100 + Math.cos(a) * 9, 58 + Math.sin(a) * 9, 100 + Math.cos(a) * 18, 58 + Math.sin(a) * 18], 1.6, C.grisL);
    }
    p.ellipse(100, 214, 58, 7, 0, 'rgba(0,0,0,0.12)', false);
  },

  // 14 · La Muerte
  (p) => {
    p.vgrad('#241a5c', '#6b2f8f');
    p.circle(158, 44, 20, C.crema, 2.5);
    p.circle(152, 40, 4, 'rgba(0,0,0,0.12)', false);
    p.circle(164, 52, 3, 'rgba(0,0,0,0.12)', false);
    [[30, 30, 4], [60, 60, 3], [180, 100, 4], [20, 130, 3], [120, 20, 3]].forEach(([x, y, s]) => p.sparkle(x, y, s, C.amarilloL));
    p.oline([141, 40, 133, 242], 5, C.madera);
    p.path('M141 40 C112 18 70 24 50 48 C80 40 108 44 137 58 Z', C.grisL);
    p.path('M84 168 C84 158 116 158 116 168 C116 180 104 184 100 184 C96 184 84 180 84 168 Z', C.white);
    p.oline([92, 182, 88, 236], 5, C.white);
    p.oline([108, 182, 112, 236], 5, C.white);
    p.ellipse(86, 238, 9, 4, 0, C.white, 2);
    p.ellipse(114, 238, 9, 4, 0, C.white, 2);
    p.oline([100, 104, 100, 160], 4, C.white);
    for (let i = 0; i < 4; i++) {
      const y = 114 + i * 11;
      const w = 20 - i * 2;
      p.ocurve(`M${100 - w} ${y + 4} Q100 ${y - 6} ${100 + w} ${y + 4}`, 3, C.white);
    }
    p.oline([86, 108, 74, 136, 88, 158], 4, C.white);
    p.oline([114, 108, 128, 122, 137, 128], 4, C.white);
    p.circle(137, 128, 5, C.white, 2);
    p.path('M80 78 C78 52 122 52 120 78 C120 90 112 96 110 104 L90 104 C88 96 80 90 80 78 Z', C.white);
    p.ellipse(91, 80, 7, 8, 0, C.ink, false);
    p.ellipse(109, 80, 7, 8, 0, C.ink, false);
    p.poly([100, 88, 96, 96, 104, 96], C.ink, false);
    for (let x = 92; x <= 108; x += 4) p.line([x, 98, x, 104], 1.5);
    p.marigold(24, 246, 12);
    p.marigold(52, 252, 10);
    p.marigold(152, 250, 11);
    p.marigold(180, 242, 13);
  },

  // 15 · La Pera
  (p) => {
    p.rays(100, 140, 16, '#ebf8c4', '#d8f19e');
    p.ellipse(104, 238, 50, 8, 0, 'rgba(0,0,0,0.15)', false);
    p.path('M100 50 C84 50 80 74 82 96 C84 112 56 126 52 164 C48 206 76 236 104 236 C132 236 158 206 152 164 C148 128 122 112 120 94 C120 72 116 50 100 50 Z', '#cadb4c');
    p.alpha(0.35, () => p.path('M76 150 C74 130 88 120 92 110 C88 132 86 150 90 180 C84 176 78 166 76 150 Z', C.white, false));
    p.alpha(0.22, () => p.path('M140 170 C140 200 124 224 104 228 C126 214 136 196 140 170 Z', C.rojo, false));
    [[110, 130], [124, 160], [96, 190], [130, 196], [84, 176], [114, 210], [104, 150]].forEach(([x, y]) => p.circle(x, y, 1.6, '#8a8f2a', false));
    p.ocurve('M100 52 C100 40 104 32 110 26', 4, C.cafe);
    p.path('M106 34 C120 20 144 22 150 30 C140 44 118 46 106 34 Z', C.verde);
    p.curve('M108 34 Q128 32 146 30', 1.5, C.verdeD);
  },

  // 16 · La Bandera
  (p) => {
    p.vgrad('#9fd8ff', '#e0f4ff');
    p.cloud(150, 214, 1);
    p.cloud(60, 236, 0.8);
    p.oline([36, 24, 36, 258], 5, C.madera);
    p.circle(36, 22, 6, C.oro, 2.5);
    const yTop = (x) => 44 + Math.sin((x - 40) / 24) * 8;
    const yBot = (x) => 150 + Math.sin((x - 40) / 24) * 8;
    const band = (x0, x1, color) => {
      p.shape((g) => {
        g.moveTo(x0, yTop(x0));
        for (let x = x0; x <= x1; x += 2) g.lineTo(x, yTop(x));
        for (let x = x1; x >= x0; x -= 2) g.lineTo(x, yBot(x));
        g.closePath();
      }, color, 2.5);
    };
    band(40, 92, '#1f8a4c');
    band(92, 144, C.white);
    band(144, 196, '#ce1126');
    const cy = (yTop(118) + yBot(118)) / 2;
    p.arc(118, cy, 15, 20, 160, 2.4, '#4f7d2a');
    p.ellipse(118, cy + 5, 7, 4.5, 0, '#4a7a2a', 1.5);
    p.path(`M109 ${cy - 1} Q116 ${cy - 16} 127 ${cy - 5} Q121 ${cy - 7} 119 ${cy + 1} Z`, '#8b5a2b', 1.5);
  },

  // 17 · El Bandolón
  (p) => {
    p.rays(100, 160, 18, '#ffe7a8', '#ffd67a');
    p.path('M88 8 L112 8 L110 32 L90 32 Z', C.cafe);
    [[85, 14], [85, 25], [115, 14], [115, 25]].forEach(([x, y]) => p.circle(x, y, 3.5, C.oro, 1.5));
    p.rect(92, 30, 16, 110, C.cafe, 2.5, 2);
    for (let y = 44; y < 138; y += 13) p.line([92, y, 108, y], 1.5, C.oro);
    const body = 'M100 118 C74 118 60 140 62 160 C46 172 42 196 50 216 C60 242 84 250 100 250 C116 250 140 242 150 216 C158 196 154 172 138 160 C140 140 126 118 100 118 Z';
    p.path(body, C.maderaL);
    p.alpha(0.25, () => p.path('M70 170 C60 190 64 220 84 238 C70 214 68 190 76 172 Z', C.white, false));
    p.circle(100, 176, 19, null, { w: 3, c: C.rojo });
    p.circle(100, 176, 16, C.cafe, 2.5);
    p.circle(100, 176, 12, C.ink, false);
    p.flower(70, 206, 7, C.rosa, C.amarillo, 5, 1.2);
    p.flower(130, 206, 7, C.turquesa, C.amarillo, 5, 1.2);
    p.rect(84, 214, 32, 6, C.cafe, 2, 2);
    [95, 98, 102, 105].forEach((x) => p.line([x, 30, x, 216], 1, '#f5f5f5'));
  },

  // 18 · El Violoncello
  (p) => {
    p.bg('#7a1f3d');
    p.dots('#8e2848', 22, 4);
    p.oline([30, 64, 176, 214], 3, C.cafe);
    p.line([34, 64, 178, 209], 1, C.crema);
    const body = 'M100 88 C78 88 66 100 68 118 C70 132 78 136 76 146 C74 156 58 164 58 190 C58 222 80 240 100 240 C120 240 142 222 142 190 C142 164 126 156 124 146 C122 136 130 132 132 118 C134 100 122 88 100 88 Z';
    p.path(body, '#c86a2a');
    p.alpha(0.3, () => p.path('M72 170 C66 190 70 216 88 232 C76 212 74 190 80 172 Z', C.white, false));
    p.curve('M84 160 C80 170 88 178 84 190', 2.5);
    p.curve('M116 160 C120 170 112 178 116 190', 2.5);
    p.path('M95 22 L105 22 L108 190 L92 190 Z', C.negro, 2);
    p.circle(100, 16, 8, '#c86a2a', 2.5);
    p.circle(100, 16, 3, C.ink, false);
    p.line([89, 28, 111, 28], 3, C.negro);
    p.line([89, 36, 111, 36], 3, C.negro);
    p.path('M86 200 L114 200 L112 208 L88 208 Z', C.crema, 2);
    [97, 99.5, 102, 104.5].forEach((x) => p.line([x, 26, x + (x - 100) * 0.3, 222], 1, '#eee'));
    p.path('M94 208 L106 208 L104 228 L96 228 Z', C.negro, 2);
    p.line([100, 240, 100, 256], 3, C.gris);
    p.rect(166, 202, 12, 9, C.negro, 2, 2);
  },
];
