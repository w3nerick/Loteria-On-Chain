// Escribe el manifest de la Polkadot App (nombre, descripción e ícono) en DotNS firmando con tu
// sesión de `pad login`. En pad 0.16.7 el paso del manifest firma con la cuenta del worker y se
// revierte porque el nombre ya es tuyo (docs/deploy.md); aquí se usa el mismo camino con el que
// pad firma en tu celular el contenido del nombre.
//
//   npm run manifest                (en Terminal.app, después de `npm run deploy`; pide una firma en el celular)
//   npm run manifest -- --revisar   (no escribe: muestra la cuenta que firmaría y el manifest actual)
//
// El CID del ícono se calcula de icon.png igual que pad (CIDv1 raw + blake2b-256): si coincide con el
// que subió el deploy, la app lo encuentra en Bulletin.
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { blake2b } from '@noble/hashes/blake2b';
import config from '../polkadot-app-deploy.config.mjs';

const ENV = 'devnet';

function iconCid(bytes) {
  const digest = blake2b(bytes, { dkLen: 32 });
  // versión 1 · códec raw (0x55) · multihash blake2b-256 (0xb220, varint a0 e4 02) · 32 bytes
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
const cid = iconCid(readFileSync(join(root, config.icon.path)));
const manifest = JSON.stringify({ $v: 1, displayName: config.displayName, description: config.description, icon: { cid, format: config.icon.format } });
const label = config.domain.replace(/\.dot$/, '');

// Las piezas de pad que ya firman con tu celular (instalación global de pad)
const padBin = realpathSync(execFileSync('sh', ['-c', 'command -v pad']).toString().trim());
const PAD = join(dirname(dirname(padBin)), 'dist');
const { DotNS } = await import(join(PAD, 'index.js'));
const { resolveDotnsConnectOptions } = await import(join(PAD, 'deploy.js'));
const { getAuthClient } = await import(join(PAD, 'auth-config.js'));
const { resolveSigner } = await import(join(PAD, 'auth/index.js'));
const { loadEnvironments, resolveEndpoints, getPopSelfServeConfig } = await import(join(PAD, 'environments.js'));

console.log(`Manifest de ${config.domain}\n  ${manifest}\n`);
const { doc } = await loadEnvironments();
const env = resolveEndpoints(doc, ENV);
const owner = await resolveSigner(await getAuthClient(ENV), {});
const dotns = new DotNS();
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
  const actual = await dotns.getTextRecord(label, 'manifest').catch(() => null);
  console.log(`  firma: ${owner.address}\n  hoy:   ${actual || '(vacío)'}\n`);
  if (process.argv.includes('--revisar')) {
    console.log(actual === manifest ? '✓ Ya está escrito.' : 'Falta escribirlo: npm run manifest');
  } else {
    dotns.setPhoneSignatureTotal?.(1);
    const res = await dotns.setTextRecord(label, 'manifest', manifest);
    console.log(res.txHash === 'skipped' ? '✓ El manifest ya estaba así: no hizo falta firmar.' : '✓ Manifest escrito y verificado en la cadena.');
  }
} finally {
  try { dotns.disconnect(); } catch {}
  try { owner.destroy(); } catch {}
}
process.exit(0);
