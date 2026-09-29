// El verificador del repositorio (scripts/check.mjs) solo sirve si de verdad falla.
// Copia el proyecto a una carpeta temporal, le mete un defecto a la vez y comprueba
// que `check` termina con error y dice qué pasa; y que la copia intacta pasa.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = path.join(ROOT, 'scripts/check.mjs');

function projectFiles() {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: ROOT });
  return out.toString('utf8').split('\0').filter((f) => f && fs.existsSync(path.join(ROOT, f)));
}
const FILES = projectFiles();

function freshCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loteria-check-'));
  for (const f of FILES) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  }
  return dir;
}
const run = (dir) => {
  const r = spawnSync(process.execPath, [CHECK, dir], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};
const edit = (dir, file, fn) => {
  const p = path.join(dir, file);
  fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8')));
};
const add = (dir, file, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), text);
};

test('el repositorio intacto pasa la verificación', () => {
  const dir = freshCopy();
  const r = run(dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Todo en orden/);
});

const BAD = [
  ['falta un archivo obligatorio', (d) => fs.rmSync(path.join(d, 'LICENSE')), /falta LICENSE/],
  ['enlace roto en el README', (d) => edit(d, 'README.md', (s) => `${s}\n[roto](docs/no-existe.md)\n`), /enlace roto → docs\/no-existe\.md/],
  ['imagen rota en la documentación', (d) => edit(d, 'docs/deploy.md', (s) => `${s}\n![x](img/no-existe.png)\n`), /enlace roto → img\/no-existe\.png/],
  ['ancla que no existe', (d) => edit(d, 'README.md', (s) => `${s}\n[x](#seccion-fantasma)\n`), /ancla «#seccion-fantasma»/],
  ['import relativo roto', (d) => edit(d, 'src/main.js', (s) => `import './no-existe.js';\n${s}`), /no se encuentra «\.\/no-existe\.js»/],
  ['carta con nombre repetido', (d) => edit(d, 'src/cards/deck.js', (s) => s.replace("['El Diablito', 'morado'", "['El Gallo', 'morado'")), /nombre repetido: El Gallo/],
  ['carta sin verso', (d) => edit(d, 'src/cards/deck.js', (s) => s.replace('Cuernitos y cola de flecha, siempre con una maldad hecha.', '')), /sin verso/],
  ['ruta local de macOS', (d) => add(d, 'src/notas.js', '// /Users/alguien/proyecto\n'), /ruta local de macOS/],
  ['correo personal', (d) => add(d, 'docs/contacto.md', '# Contacto\n\nEscríbeme a alguien@empresa.mx\n'), /correo alguien@empresa\.mx/],
  ['token de GitHub', (d) => add(d, 'src/secreto.js', `export const t = 'ghp_${'a1B2c3D4e5'.repeat(3)}';\n`), /token de GitHub/],
  ['llave privada', (d) => add(d, 'docs/llave.md', '-----BEGIN PRIVATE KEY-----\nabc\n'), /llave privada/],
  ['nombre de archivo con espacios', (d) => add(d, 'docs/img/Captura Final.png', 'x'), /espacios o caracteres no ASCII/],
  ['imagen con mayúsculas', (d) => add(d, 'docs/img/Captura.png', 'x'), /minúsculas/],
  ['package.json sin licencia', (d) => edit(d, 'package.json', (s) => s.replace('"license": "MIT"', '"license": "ISC"')), /license debe ser MIT/],
  ['el CI llama a un script inexistente', (d) => edit(d, '.github/workflows/ci.yml', (s) => `${s}      - run: npm run inexistente\n`), /npm run inexistente/],
  ['dotName con formato inválido', (d) => edit(d, 'src/config.js', (s) => s.replace(/dotName: '[^']*'/, "dotName: 'corto.dot'")), /dotName inválido/],
];

for (const [name, mutate, expected] of BAD) {
  test(`falla: ${name}`, () => {
    const dir = freshCopy();
    mutate(dir);
    const r = run(dir);
    assert.equal(r.code, 1, `debía fallar y salió con ${r.code}:\n${r.out}`);
    assert.match(r.out, expected);
  });
}
