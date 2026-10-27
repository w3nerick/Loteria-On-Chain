// Guarda la ronda terminada en LoteriaRegistry desde la pantalla del cantor.
//
// 1. Lee si la ronda ya está en la cadena (una recarga o un intento que sí
//    entró): lo que ya está no se vuelve a mandar.
// 2. Pide el permiso de gas (PGAS): el Host paga las comisiones de la cuenta de
//    la app, como en polka-man.dot. El depósito de almacenamiento sale de PAS.
//    Paga la cuenta de la app si tiene PAS para el depósito; si no, la identidad
//    (solo entonces se pide). Si la ronda ya existe, paga la misma cuenta que la
//    guardó (el contrato solo le deja agregar jugadores a ella).
// 3. Registra la cuenta en pallet-revive si hace falta (una sola vez).
// 4. `sellar` con la cabecera y la primera parte de jugadores; `agregar` con el
//    resto. Cada parte se simula antes de firmar; si no cabe, se parte a la mitad.
import { encodeHeader, splitPlayers, decodePlayers, KIND } from './record.js';
import * as reg from './registry.js';
import { getClient } from './client.js';
import { appPayer, identityPayer, requestGas, askChainSubmit, describeError, walletInfo } from './wallet.js';
import { FAUCET_URL, ETH_RPC_URL, PGAS_PRECOMPILE } from './network.js';

// 0.1 PAS: el depósito de una ronda va de ~0.04 PAS (sin jugadores) a ~0.5 PAS (50 firmados)
const MIN_BALANCE = 10n ** 9n;

// Llave de un registro: si ya está en la cadena igual, no se vuelve a mandar
export const recordKey = (p) => `${p.kind}:${p.kind === KIND.HIDDEN ? p.h : p.code}:${p.mask ?? '-'}`;

export function pendingPlayers(record, sealedKeys) {
  const done = new Set(sealedKeys);
  return record.players.filter((p) => !done.has(recordKey(p)));
}

async function withBalance(client, p) {
  p.balance = await reg.freeBalance(client, p.address);
  p.h160 = await reg.h160Of(client, p.address);
  return p;
}

// Paga la cuenta de la app si tiene PAS para el depósito (la comisión va con PGAS si el Host la da);
// si no, la identidad .dot. Si la ronda ya existe, paga la misma cuenta que la guardó.
async function choosePayer(client, onChain, onStep) {
  const app = await withBalance(client, await appPayer());
  if (onChain && app.h160 === onChain.cantor.toLowerCase()) return app;
  if (!onChain && app.balance >= MIN_BALANCE) return app;
  onStep('Pidiendo tu identidad .dot (aprueba el cuadro si aparece)…');
  const id = await identityPayer();
  if (id) await withBalance(client, id);
  if (onChain) {
    if (id && id.h160 === onChain.cantor.toLowerCase()) return id;
    throw new Error('Esta ronda la guardó otra cuenta: solo ella puede agregarle jugadores.');
  }
  if (id && id.balance >= MIN_BALANCE) return id;
  const who = [app, id].filter(Boolean).map((p) => `${p.kind === 'app' ? 'cuenta de la app' : 'tu identidad'} (${reg.pas(p.balance)})`).join(' · ');
  const note = id ? '' : ` No se usó tu identidad .dot: ${walletInfo().identityNote || 'no disponible'}.`;
  const err = new Error(`Sin PAS para el depósito de la ronda: ${who}. Manda unos PAS a la cuenta de la app (botón Copiar) o pídelos en ${FAUCET_URL} (Asset Hub).${note}`);
  err.noFunds = true;
  err.appAddress = app.address;
  throw err;
}

// La cuenta de la app que paga el historial, con su saldo: para fondearla antes de que falte.
// Conecta la cuenta si hace falta (llamar desde un toque).
export async function appAccountInfo() {
  const app = await appPayer();
  const client = await getClient();
  const [pas, h160] = await Promise.all([reg.freeBalance(client, app.address), reg.h160Of(client, app.address)]);
  let pgas = null;
  try {
    const { createPublicClient, http, erc20Abi } = await import('viem');
    const eth = createPublicClient({ transport: http(ETH_RPC_URL, { timeout: 10000, retryCount: 1 }) });
    pgas = await eth.readContract({ address: PGAS_PRECOMPILE, abi: erc20Abi, functionName: 'balanceOf', args: [h160] });
  } catch {}
  return { address: app.address, pas, pgas };
}

export async function sealRound(engine, onStep = () => {}) {
  const record = engine.roundRecord();
  if (!record) throw new Error('La ronda todavía no termina.');
  if (!reg.registryDeployed()) throw new Error('El contrato del historial todavía no está desplegado.');
  onStep('Conectando con Asset Hub…');
  const client = await getClient();
  let onChain = await reg.readRound(client, record.id);
  const sealedKeys = onChain ? onChain.parts.flatMap((part) => decodePlayers(part).map(recordKey)) : [];
  let pending = pendingPlayers(record, sealedKeys);
  if (onChain && !pending.length) {
    engine.markSealed({ id: record.id, block: Number(onChain.bloque), keys: sealedKeys });
    return { already: true, block: Number(onChain.bloque) };
  }

  onStep('Pidiendo el permiso de gas (PGAS)…');
  await requestGas();
  onStep('Abriendo tu cuenta…');
  const payer = await choosePayer(client, onChain, onStep);
  onStep('Pidiendo permiso para enviar transacciones…');
  await askChainSubmit();
  if (!(await reg.isMapped(client, payer.address))) {
    onStep('Registrando tu cuenta en Asset Hub (una sola vez): aprueba la firma…');
    await reg.mapAccount(client, payer.signer, () => onStep('Firma recibida · esperando el bloque…'));
  }

  const header = encodeHeader(record.header);
  let maxBytes = 6000; // ~50 jugadores firmados: 2.2 MB de proof_size (tope 3 MB)
  let lastBlock = 0;
  const keys = [...sealedKeys];
  let txs = 0;
  while (!onChain || pending.length) {
    const parts = splitPlayers(pending, maxBytes);
    const part = parts[0] || { players: [], bytes: new Uint8Array(), count: 0 };
    const data = onChain ? reg.appendData(record.id, part.bytes, part.count) : reg.sealData(record.id, header, part.bytes, part.count);
    const sim = await reg.simulate(client, payer.address, data);
    if (!sim.ok || sim.tooHeavy) {
      if ((sim.tooHeavy || /peso/.test(sim.why)) && part.count > 1 && maxBytes > 1500) {
        maxBytes = Math.floor(maxBytes / 2); // no cabe en una transacción: partes más chicas
        continue;
      }
      throw new Error(`La simulación falló: ${sim.why || 'demasiado pesado'}`);
    }
    if (payer.balance < (sim.deposit * 3n) / 2n + MIN_BALANCE) throw new Error(`Saldo insuficiente: hacen falta ~${reg.pas(sim.deposit + MIN_BALANCE)} y hay ${reg.pas(payer.balance)}.`);
    const n = onChain ? `${part.count} jugadores más` : `la ronda con ${part.count} jugadores`;
    onStep(`Aprueba la firma para guardar ${n} (depósito ~${reg.pas(sim.deposit)})…`);
    const res = await reg.send(client, payer.signer, data, sim, () => onStep('Firma recibida · esperando que el bloque sea final…'));
    txs += 1;
    lastBlock = res.block;
    payer.balance -= sim.deposit;
    keys.push(...part.players.map(recordKey));
    pending = pending.slice(part.count);
    onChain ??= { cantor: payer.h160, bloque: BigInt(res.block), parts: [] };
    engine.markSealed({ id: record.id, block: res.block, keys: [...keys], payer: payer.kind });
  }
  return { block: lastBlock, txs, payer: payer.kind };
}

export { describeError };
