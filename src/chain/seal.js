// Guarda la ronda terminada en LoteriaRegistry desde la pantalla del cantor.
//
// 1. Lee si la ronda ya está en la cadena (una recarga o un intento que sí
//    entró): lo que ya está no se vuelve a mandar.
// 2. Elige quién paga: la cuenta de la app si tiene saldo, si no la identidad.
//    Si la ronda ya existe, paga la misma cuenta que la guardó (el contrato
//    solo le deja agregar jugadores a ella).
// 3. Registra la cuenta en pallet-revive si hace falta (una sola vez).
// 4. `sellar` con la cabecera y la primera parte de jugadores; `agregar` con el
//    resto. Cada parte se simula antes de firmar; si no cabe, se parte a la mitad.
import { encodeHeader, splitPlayers, decodePlayers, KIND } from './record.js';
import * as reg from './registry.js';
import { getClient } from './client.js';
import { payers, askChainSubmit, describeError } from './wallet.js';
import { FAUCET_URL } from './network.js';

const MIN_BALANCE = 10n ** 9n; // 0.1 PAS: menos que esto no alcanza ni para registrar la cuenta
const PREFERRED = 10n ** 10n; // con 1 PAS se guardan varias rondas grandes

// Llave de un registro: si ya está en la cadena igual, no se vuelve a mandar
export const recordKey = (p) => `${p.kind}:${p.kind === KIND.HIDDEN ? p.h : p.code}:${p.mask ?? '-'}`;

export function pendingPlayers(record, sealedKeys) {
  const done = new Set(sealedKeys);
  return record.players.filter((p) => !done.has(recordKey(p)));
}

async function choosePayer(client, onChain) {
  const list = await payers();
  for (const p of list) {
    p.balance = await reg.freeBalance(client, p.address);
    p.h160 = await reg.h160Of(client, p.address);
  }
  if (onChain) {
    const same = list.find((p) => p.h160 === onChain.cantor.toLowerCase());
    if (!same) throw new Error('Esta ronda la guardó otra cuenta: solo ella puede agregarle jugadores.');
    return same;
  }
  const pick = list.find((p) => p.balance >= PREFERRED) || [...list].sort((a, b) => (b.balance > a.balance ? 1 : -1))[0];
  if (!pick || pick.balance < MIN_BALANCE) {
    const who = list.map((p) => `${p.kind === 'app' ? 'cuenta de la app' : 'tu identidad'} ${p.address} (${reg.pas(p.balance)})`).join(' · ');
    const err = new Error(`Sin saldo para guardar en la cadena. Pide PAS en ${FAUCET_URL} para: ${who}`);
    err.noFunds = true;
    throw err;
  }
  return pick;
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

  onStep('Abriendo tu cuenta…');
  const payer = await choosePayer(client, onChain);
  onStep('Pidiendo permiso para enviar transacciones…');
  await askChainSubmit();
  if (!(await reg.isMapped(client, payer.address))) {
    onStep('Registrando tu cuenta en Asset Hub (una sola vez): aprueba la firma…');
    await reg.mapAccount(client, payer.signer, () => onStep('Firma recibida · esperando el bloque…'));
  }

  const header = encodeHeader(record.header);
  let maxBytes = 12000;
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
