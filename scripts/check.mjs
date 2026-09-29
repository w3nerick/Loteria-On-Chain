// Verificación del repositorio, sin dependencias: node scripts/check.mjs [carpeta]
//
// Revisa lo que las pruebas de juego no ven y que suele romperse en silencio:
// archivos obligatorios, enlaces e imágenes de la documentación, imports relativos,
// integridad de la baraja, datos personales o secretos, nombres de archivo,
// metadatos de package.json y que el CI llame a scripts que existen.
// Termina con código 1 si algo falla (lo usa el CI y `npm run check`).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

globalThis.__PREVIEW__ = true;

// Códec del protocolo Host↔app que hablan hoy la Polkadot App (iOS) y Polkadot Desktop 0.1.3.
// Súbelo solo después de medirlo en un teléfono real (docs/deploy.md).
const HOST_CODEC = 1;

const ROOT = path.resolve(process.argv[2] || process.env.ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(ROOT, f));

// --- archivos del repo (git si hay; si no, recorrido del directorio) ---------------
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-preview', '.git']);
function listFiles() {
  try {
    const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] });
    const files = out.toString('utf8').split('\0').filter(Boolean);
    if (files.length) return files.filter((f) => exists(f));
  } catch {}
  const acc = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue;
      const p = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) walk(p);
      else acc.push(p);
    }
  };
  walk('');
  return acc;
}
const FILES = listFiles();
const isText = (f) => /\.(m?js|json|md|css|html|ya?ml|txt|svg|gitignore|editorconfig)$/.test(f) || !path.extname(f);

// --- infraestructura de reporte ---------------------------------------------------
const groups = [];
function check(name, fn) {
  const errors = [];
  const note = [];
  const fail = (m) => errors.push(m);
  return Promise.resolve(fn({ fail, note: (m) => note.push(m) })).then(
    () => groups.push({ name, errors, note }),
    (e) => groups.push({ name, errors: [...errors, `error inesperado: ${e?.message || e}`], note }),
  );
}

// --- 1. archivos obligatorios ------------------------------------------------------
await check('Estructura', ({ fail }) => {
  const required = [
    'README.md', 'LICENSE', 'package.json', 'package-lock.json', 'index.html', 'vite.config.js', '.gitignore',
    'src/main.js', 'src/config.js', 'src/cards/deck.js',
    'docs/arquitectura.md', 'docs/diseno.md', 'docs/deploy.md', 'docs/evento.md', 'docs/img/logo.png',
    '.github/workflows/ci.yml',
  ];
  for (const f of required) if (!exists(f)) fail(`falta ${f}`);
});

// --- 2. enlaces e imágenes de la documentación ---------------------------------------
const slug = (h) =>
  h.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/g, '-');
await check('Enlaces de la documentación', ({ fail, note }) => {
  const docs = FILES.filter((f) => f.endsWith('.md') && !f.startsWith('node_modules/'));
  let n = 0;
  for (const doc of docs) {
    const src = read(doc).replace(/```[\s\S]*?```/g, '');
    const anchors = new Set([...src.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((m) => slug(m[1])));
    const refs = [...src.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]);
    refs.push(...[...src.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]));
    for (const ref of refs) {
      if (/^(https?:|mailto:|data:)/.test(ref)) continue;
      n++;
      const [file, frag] = ref.split('#');
      if (!file) {
        if (frag && !anchors.has(frag)) fail(`${doc}: ancla «#${frag}» no existe en el propio documento`);
        continue;
      }
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(doc), decodeURI(file)));
      if (!exists(target)) fail(`${doc}: enlace roto → ${ref}`);
      else if (frag && target.endsWith('.md')) {
        const heads = new Set([...read(target).replace(/```[\s\S]*?```/g, '').matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((m) => slug(m[1])));
        if (!heads.has(frag)) fail(`${doc}: ancla «#${frag}» no existe en ${target}`);
      }
    }
  }
  note(`${n} enlaces revisados en ${docs.length} documentos`);
});

// --- 3. imports relativos ---------------------------------------------------------------
await check('Imports relativos', ({ fail, note }) => {
  // test/check.test.mjs contiene imports rotos a propósito (son sus casos malos)
  const codeFiles = FILES.filter((f) => /\.(m?js)$/.test(f) && /^(src|test|scripts)\//.test(f) && f !== 'test/check.test.mjs');
  const re = /(?:import\s+(?:[^'"()]*?\s+from\s+)?|import\s*\(\s*|export\s+[^'"]*?\s+from\s+)(['"])(\.{1,2}\/[^'"]+)\1/g;
  let n = 0;
  for (const f of codeFiles) {
    for (const m of read(f).matchAll(re)) {
      n++;
      const spec = m[2].split('?')[0];
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(f), spec));
      if (!exists(base) && !exists(`${base}.js`) && !exists(`${base}/index.js`)) fail(`${f}: no se encuentra «${m[2]}»`);
    }
  }
  note(`${n} imports en ${codeFiles.length} archivos`);
});

// --- 4. la baraja -----------------------------------------------------------------------
await check('Baraja', async ({ fail, note }) => {
  if (!exists('src/cards/deck.js')) return fail('falta src/cards/deck.js');
  const { DECK, DECK_SIZE } = await import(`${pathToFileURL(path.join(ROOT, 'src/cards/deck.js')).href}?t=${Date.now()}`);
  if (DECK.length !== 54 || DECK_SIZE !== 54) fail(`la baraja tiene ${DECK.length} cartas (deben ser 54)`);
  const ids = new Set();
  const nums = new Set();
  const names = new Set();
  for (const c of DECK) {
    if (ids.has(c.id)) fail(`id repetido: ${c.id}`);
    if (nums.has(c.n)) fail(`número repetido: ${c.n}`);
    if (names.has(c.name)) fail(`nombre repetido: ${c.name}`);
    ids.add(c.id);
    nums.add(c.n);
    names.add(c.name);
    if (!c.name?.trim()) fail(`carta ${c.id} sin nombre`);
    if (!c.verse?.trim()) fail(`carta ${c.id} (${c.name}) sin verso`);
    if (!/^#[0-9a-f]{6}$/i.test(c.color || '')) fail(`carta ${c.id} (${c.name}) con color inválido`);
    if (typeof c.draw !== 'function') fail(`carta ${c.id} (${c.name}) sin ilustración`);
  }
  for (let i = 0; i < 54; i++) if (!ids.has(i)) fail(`falta el id ${i}`);
  for (let i = 1; i <= 54; i++) if (!nums.has(i)) fail(`falta el número ${i}`);
  note(`${DECK.length} cartas, ${names.size} nombres distintos`);
});

// --- 5. datos personales y secretos ----------------------------------------------------------
await check('Privacidad y secretos', ({ fail, note }) => {
  const rules = [
    [/\/Users\/[A-Za-z0-9._-]+/, 'ruta local de macOS'],
    [/\/home\/[A-Za-z0-9._-]+/, 'ruta local de Linux'],
    [/[A-Za-z]:\\Users\\/, 'ruta local de Windows'],
    [/\bgh[pousr]_[A-Za-z0-9]{20,}/, 'token de GitHub'],
    [/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, 'llave privada'],
    [/\b0x[0-9a-fA-F]{64}\b/, 'posible llave privada (0x + 64 hex)'],
    [/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/, 'llave de API'],
  ];
  const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
  let scanned = 0;
  for (const f of FILES) {
    if (f === 'package-lock.json' || f === 'scripts/check.mjs' || f === 'test/check.test.mjs' || !isText(f)) continue;
    scanned++;
    const text = read(f);
    for (const [re, what] of rules) if (re.test(text)) fail(`${f}: ${what}`);
    for (const m of text.matchAll(email)) {
      if (/noreply|example\.(com|org)|@\d+\.\d+/.test(m[0])) continue;
      if (/^[^@]+@\d/.test(m[0])) continue; // versiones tipo paquete@1.2.3
      fail(`${f}: correo ${m[0]}`);
    }
  }
  note(`${scanned} archivos de texto revisados`);
});

// --- 6. nombres de archivo ---------------------------------------------------------------------
await check('Nombres de archivo', ({ fail }) => {
  for (const f of FILES) {
    if (/[^\x21-\x7e]/.test(f)) fail(`${f}: espacios o caracteres no ASCII`);
    if (/^docs\/img\//.test(f) && /[A-Z]/.test(f)) fail(`${f}: las imágenes van en minúsculas`);
  }
});

// --- 7. package.json y CI --------------------------------------------------------------------------
await check('package.json y CI', ({ fail }) => {
  if (!exists('package.json')) return fail('falta package.json');
  const pkg = JSON.parse(read('package.json'));
  if (pkg.license !== 'MIT') fail('license debe ser MIT');
  if (!pkg.engines?.node) fail('falta engines.node');
  if (!pkg.repository) fail('falta repository');
  for (const s of ['dev', 'build', 'test', 'check']) if (!pkg.scripts?.[s]) fail(`falta el script «${s}»`);
  if (exists('LICENSE') && !/^MIT License/.test(read('LICENSE'))) fail('LICENSE no es MIT');
  // El SDK del Host debe hablar el mismo códec que la Polkadot App: con otro, el Host «conecta» pero
  // no contesta y la app se queda cargando. Por eso se fija exacto (sin ^) y se comprueba el códec instalado.
  for (const name of ['@parity/product-sdk-host', '@parity/product-sdk-statement-store']) {
    const v = pkg.dependencies?.[name];
    if (!v || !/^\d+\.\d+\.\d+$/.test(v)) fail(`${name} debe fijarse en una versión exacta (sin ^ ni ~); ver docs/deploy.md#compatibilidad-con-el-host`);
  }
  if (exists('node_modules/@parity/truapi/dist/generated/client.js')) {
    const m = read('node_modules/@parity/truapi/dist/generated/client.js').match(/TRUAPI_CODEC_VERSION\s*=\s*(\d+)/);
    if (m && Number(m[1]) !== HOST_CODEC) fail(`el SDK instalado habla el códec ${m[1]} y la Polkadot App el ${HOST_CODEC}; ver docs/deploy.md#compatibilidad-con-el-host`);
  }
  if (exists('.github/workflows/ci.yml')) {
    for (const m of read('.github/workflows/ci.yml').matchAll(/npm (?:run )?([\w:-]+)/g)) {
      const s = m[1];
      if (['ci', 'install', 'i'].includes(s)) continue;
      if (!pkg.scripts?.[s]) fail(`ci.yml llama a «npm run ${s}», que no existe en package.json`);
    }
  }
});

// --- 8. configuración del evento ----------------------------------------------------------------------
await check('Configuración', async ({ fail }) => {
  if (!exists('src/config.js')) return fail('falta src/config.js');
  const { CONFIG } = await import(`${pathToFileURL(path.join(ROOT, 'src/config.js')).href}?t=${Date.now()}`);
  if (typeof CONFIG.dotName !== 'string' || (CONFIG.dotName && !/^[a-z0-9-]{9,}\.(dot|paseo)$/.test(CONFIG.dotName))) {
    fail(`CONFIG.dotName inválido: «${CONFIG.dotName}» (vacío o algo como loteriamexicana.dot, mínimo 9 caracteres)`);
  }
  if (!(CONFIG.defaultSpeed >= 3 && CONFIG.defaultSpeed <= 30)) fail('CONFIG.defaultSpeed fuera de 3–30 s');
  if (!['c', 'e', 'm', 'f'].includes(CONFIG.defaultPattern)) fail(`CONFIG.defaultPattern inválido: «${CONFIG.defaultPattern}» (c, e, m o f)`);
});

// --- informe ------------------------------------------------------------------------------------------------
let bad = 0;
const tty = process.stdout.isTTY;
const c = (n, s) => (tty ? `\x1b[${n}m${s}\x1b[0m` : s);
console.log(`Verificando ${rel(ROOT) || path.basename(ROOT)} (${FILES.length} archivos)\n`);
for (const g of groups) {
  const ok = g.errors.length === 0;
  console.log(`${ok ? c(32, '✔') : c(31, '✖')} ${g.name}${g.note.length ? c(2, ` · ${g.note.join(' · ')}`) : ''}`);
  for (const e of g.errors) console.log(`    ${c(31, '•')} ${e}`);
  bad += g.errors.length;
}
console.log(bad ? `\n${c(31, `${bad} problema(s)`)}` : `\n${c(32, 'Todo en orden')}`);
process.exit(bad ? 1 : 0);
