// Publica la ficha de la Polkadot App (nombre, descripción e ícono) firmando con tu sesión de
// `pad login`. pad 0.16.7 lo intenta con la cuenta del worker y se revierte porque el nombre ya
// es tuyo (docs/deploy.md); aquí se usan las mismas piezas con las que pad firma en tu celular.
//
//   npm run manifest                (después de `pad … --no-manifest`; lo llama `npm run deploy`)
//   npm run manifest -- --revisar   (no escribe: muestra qué haría, la cuenta y el saldo)
//   npm run manifest -- --quitar    (borra el manifest: la app vuelve a abrir el contenido del nombre)
//
// Con manifest, Desktop y la app ya no abren el contenido del nombre: abren el de
// app.<nombre> si tiene su registro `executable` (así lo resuelve Polkadot Desktop). Por eso el
// orden es: subir el ícono → app.<nombre> con el mismo contenido → `executable` → manifest.
// Si algo falla a la mitad, el manifest no se escribe y la app sigue abriendo como antes.
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { blake2b } from '@noble/hashes/blake2b';
import config from '../polkadot-app-deploy.config.mjs';

const ENV = 'devnet';
const revisar = process.argv.includes('--revisar');
const quitar = process.argv.includes('--quitar');

// CID del ícono igual que pad: versión 1 · códec raw (0x55) · blake2b-256 (0xb220 = a0 e4 02) · 32 bytes
function iconCid(bytes) {
  const digest = blake2b(bytes, { dkLen: 32 });
  const cid = Uint8Array.from([0x01, 0x55, 0xa0, 0xe4, 0x02, 0x20, ...digest]);
  const A = 'abcdefghijklmnopqrstuvwxyz234567';
  let bits = 0;
  let val = 0;
  let out = 'b';
  for (const b of cid) {
    val = (val << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += A[(val >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += A[(val << (5 - bits)) & 31];
  return out;
}

const root = new URL('..', import.meta.url).pathname;
const iconBytes = readFileSync(join(root, config.icon.path));
const cid = iconCid(iconBytes);
const manifest = JSON.stringify({ $v: 1, displayName: config.displayName, description: config.description, icon: { cid, format: config.icon.format } });
const app = config.executables.find((e) => e.kind === 'app');
const executable = JSON.stringify({ $v: 1, kind: 'app', appVersion: app.appVersion });
const label = config.domain.replace(/\.dot$/, '');
const APP = `app.${label}`;

// Las piezas de pad que ya firman con tu celular (instalación global de pad)
const padBin = realpathSync(execFileSync('sh', ['-c', 'command -v pad']).toString().trim());
const PAD = join(dirname(dirname(padBin)), 'dist');
const { DotNS } = await import(join(PAD, 'index.js'));
const { resolveDotnsConnectOptions, storeFile, setBulletinEndpoints, resolveBulletinEndpoints, BLAKE2B_256_MULTIHASH_CODE } = await import(join(PAD, 'deploy.js'));
const { getAuthClient } = await import(join(PAD, 'auth-config.js'));
const { resolveSigner } = await import(join(PAD, 'auth/index.js'));
const { loadEnvironments, resolveEndpoints, getPopSelfServeConfig } = await import(join(PAD, 'environments.js'));

const { doc } = await loadEnvironments();
const env = resolveEndpoints(doc, ENV);
const owner = await resolveSigner(await getAuthClient(ENV), {});
const dotns = new DotNS();
const fmt = (x) => `${(Number(x) / 1e10).toFixed(4)} PAS`;
try {
  await dotns.connect({
    ...resolveDotnsConnectOptions(
      { signer: owner.signer, signerAddress: owner.address },
      env.assetHub,
      env.autoAccountMapping,
      env.contracts,
      env.nativeToEthRatio,
      ENV,
      getPopSelfServeConfig(doc, ENV),
      env.registerStorageDeposit,
      env.tld,
    ),
    phoneSigner: true,
  });

  const text = (name, key) => dotns.getTextRecord(name, key).catch(() => null);
  const rootHash = await dotns.getContenthash(label);
  const sub = await dotns.checkSubdomainOwnership('app', label);
  const appHash = sub.owned ? await dotns.getContenthash(APP).catch(() => '0x') : null;
  const execNow = sub.owned ? await text(APP, 'executable') : null;
  const manifestNow = await text(label, 'manifest');
  const free = await dotns.readFreeBalance(owner.address).catch(() => null);

  console.log(`\nFicha de ${config.domain} · firma ${owner.address}${free === null ? '' : ` · saldo ${fmt(free)}`}`);
  console.log(`  contenido del nombre:  ${rootHash}`);
  console.log(`  ${APP}.dot:  ${sub.owned ? `tuyo · contenido ${appHash === rootHash ? 'igual ✓' : appHash}` : sub.owner ? `de otra cuenta (${sub.owner})` : 'no existe'}`);
  console.log(`  executable:  ${execNow === executable ? 'igual ✓' : execNow || '(vacío)'}`);
  console.log(`  manifest:    ${manifestNow === manifest ? 'igual ✓' : manifestNow || '(vacío)'}\n`);

  if (quitar) {
    if (!manifestNow) console.log('✓ No hay manifest: nada que quitar.');
    else {
      dotns.setPhoneSignatureTotal?.(1);
      await dotns.setTextRecord(label, 'manifest', '');
      console.log(`✓ Manifest quitado: la app vuelve a abrir el contenido de ${config.domain}`);
    }
  } else {
    if (!rootHash || rootHash === '0x') throw new Error(`${config.domain} no tiene contenido: primero npm run deploy`);
    if (sub.owner && !sub.owned) throw new Error(`${APP}.dot es de ${sub.owner}, no de la cuenta que firma`);
    const pasos = [
      !sub.owned && 'crear el subnombre app.',
      appHash !== rootHash && 'apuntar app. al contenido publicado',
      execNow !== executable && 'escribir el registro executable',
      manifestNow !== manifest && 'escribir el manifest (nombre, descripción e ícono)',
    ].filter(Boolean);
    console.log(pasos.length ? `Firmas en el celular (${pasos.length}):\n${pasos.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}\n` : '✓ Todo está al día.');
    if (revisar) {
      console.log(pasos.length ? '(--revisar: no se escribió nada)' : '');
    } else {
      // El ícono vive en Bulletin y caduca como la app. Si sigue ahí, storeFile no lo vuelve a subir
      // (conserva su caducidad original); si ya caducó, lo sube de nuevo con el mismo CID.
      setBulletinEndpoints(resolveBulletinEndpoints(env.bulletin));
      console.log(`Subiendo icon.png (${iconBytes.length} B) a Bulletin…`);
      const subido = await storeFile(iconBytes, { hashCode: BLAKE2B_256_MULTIHASH_CODE });
      if (subido !== cid) throw new Error(`Bulletin devolvió ${subido} y el manifest espera ${cid}`);
      if (pasos.length) {
        dotns.setPhoneSignatureTotal?.(pasos.length);
        if (!sub.owned) await dotns.registerSubdomain('app', label);
        if (appHash !== rootHash) await dotns.setContenthash(APP, rootHash, { feeAsset: 'pgas' });
        await dotns.setTextRecord(APP, 'executable', executable);
        await dotns.setTextRecord(label, 'manifest', manifest);
      }
      console.log(`✓ Ficha publicada: ${config.displayName} con su ícono (${cid})`);
    }
  }
} finally {
  try { dotns.disconnect(); } catch {}
  try { owner.destroy(); } catch {}
}
process.exit(0);
