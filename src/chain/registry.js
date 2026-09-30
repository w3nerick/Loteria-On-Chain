// LoteriaRegistry en pallet-revive: leer sin firmar (simulación con la runtime
// API ReviveApi.call), simular una escritura y enviarla. Misma receta probada en
// testalk y Proof of Cam: la cuenta se mapea una vez, se simula, se manda con
// el doble del peso simulado y se espera a `finalized`.
import { Binary } from 'polkadot-api';
import { decodeErrorResult, decodeFunctionResult, encodeFunctionData } from 'viem';
import abi from './LoteriaRegistry.abi.json' with { type: 'json' };
import { REGISTRY_ADDRESS } from './network.js';

// Cualquier cuenta sirve de origen para leer; esta es la pública de desarrollo
const READ_ORIGIN = '5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV';
// Techos medidos en testalk: por encima de ~900 G el extrínseco vuelve inválido
export const WEIGHT_CAP = { ref_time: 900_000_000_000n, proof_size: 3_000_000n };

export const registryDeployed = () => /^0x[0-9a-f]{40}$/i.test(REGISTRY_ADDRESS);
export const pas = (planck) => `${(Number(planck) / 1e10).toFixed(4)} PAS`;

function address() {
  if (!registryDeployed()) throw new Error('el contrato del historial todavía no está desplegado');
  return REGISTRY_ADDRESS;
}

// En polkadot-api 2.2 los Vec<u8> llegan como Uint8Array y los [u8; N] como texto hex
const toHex = (d) => (typeof d === 'string' ? d : Binary.toHex(d));

async function dryRun(client, origin, data) {
  return client.getUnsafeApi().apis.ReviveApi.call(origin, address(), 0n, undefined, undefined, Binary.fromHex(data));
}

async function read(client, functionName, args) {
  const r = await dryRun(client, READ_ORIGIN, encodeFunctionData({ abi, functionName, args }));
  const v = r?.result?.success ? r.result.value : null;
  if (!v || v.flags) throw new Error('el contrato del historial no respondió');
  return decodeFunctionResult({ abi, functionName, data: toHex(v.data) });
}

export async function totalRounds(client) {
  return Number(await read(client, 'total', []));
}

// Rondas [desde, desde + cuantas) en orden de sellado, sin registros de jugadores
export async function roundsPage(client, desde, cuantas) {
  const [ids, rondas] = await read(client, 'pagina', [BigInt(desde), BigInt(cuantas)]);
  return ids.map((id, i) => ({ id, ...rondas[i] }));
}

// Ronda completa o null si no existe
export async function readRound(client, id) {
  const [r, parts] = await read(client, 'ronda', [id]);
  if (/^0x0{40}$/i.test(r.cantor)) return null;
  return { id, ...r, parts };
}

export async function freeBalance(client, ss58) {
  const acc = await client.getUnsafeApi().query.System.Account.getValue(ss58);
  return BigInt(acc?.data?.free ?? 0n);
}

// pallet-revive solo acepta llamadas de cuentas mapeadas (Revive.map_account, una sola vez)
export async function h160Of(client, ss58) {
  return toHex(await client.getUnsafeApi().apis.ReviveApi.address(ss58)).toLowerCase();
}

export async function isMapped(client, ss58) {
  const key = await h160Of(client, ss58);
  return (await client.getUnsafeApi().query.Revive.OriginalAccount.getValue(key)) != null;
}

export const sealData = (id, header, players, count) => encodeFunctionData({ abi, functionName: 'sellar', args: [id, toHex(header), toHex(players), count] });
export const appendData = (id, players, count) => encodeFunctionData({ abi, functionName: 'agregar', args: [id, toHex(players), count] });

const ERRORS_ES = {
  YaSellada: 'esa ronda ya está guardada',
  NoExiste: 'esa ronda no está guardada',
  SoloElCantor: 'solo la cuenta que guardó la ronda puede agregarle jugadores',
  CabeceraInvalida: 'la cabecera de la ronda es inválida',
  ParteInvalida: 'los registros de jugadores son inválidos',
  DemasiadosJugadores: 'la ronda pasa de 1000 jugadores',
};

const DISPATCH_ES = {
  'Revive.AccountUnmapped': 'la cuenta no está registrada en pallet-revive',
  'Revive.StorageDepositNotEnoughFunds': 'el saldo no alcanza para el depósito',
  'Revive.StorageDepositLimitExhausted': 'el depósito superó el límite',
  'Revive.OutOfGas': 'se quedó sin peso',
};

function describeDispatch(e) {
  if (e?.type === 'Module' && e.value?.type) {
    const name = `${e.value.type}.${e.value.value?.type ?? '?'}`;
    return DISPATCH_ES[name] ?? name;
  }
  return e?.type ?? 'la simulación falló';
}

// Simula una escritura desde `origin`, sin firmar ni gastar
export async function simulate(client, origin, data) {
  const r = await dryRun(client, origin, data);
  const res = r?.result;
  if (!res?.success) return { ok: false, why: describeDispatch(res?.value) };
  const v = res.value;
  if (v.flags) {
    try {
      const e = decodeErrorResult({ abi, data: toHex(v.data) });
      return { ok: false, why: ERRORS_ES[e.errorName] ?? `el contrato rechazó: ${e.errorName}` };
    } catch {
      return { ok: false, why: 'el contrato rechazó la escritura' };
    }
  }
  const deposit = r.storage_deposit?.type === 'Charge' ? BigInt(r.storage_deposit.value) : 0n;
  const tooHeavy = r.weight_required.ref_time > WEIGHT_CAP.ref_time || r.weight_required.proof_size > WEIGHT_CAP.proof_size;
  return { ok: true, weight: r.weight_required, deposit, tooHeavy };
}

function submit(tx, signer, onSigned) {
  return new Promise((resolve, reject) => {
    const sub = tx.signSubmitAndWatch(signer).subscribe({
      next: (e) => {
        if (e.type === 'signed') onSigned?.();
        if (e.type === 'txBestBlocksState' && e.found && e.ok === false) {
          sub.unsubscribe();
          reject(new Error(describeDispatch(e.dispatchError)));
        }
        if (e.type === 'finalized') {
          sub.unsubscribe();
          if (e.ok) resolve({ block: e.block?.number ?? 0, txHash: e.txHash ?? '' });
          else reject(new Error(describeDispatch(e.dispatchError)));
        }
      },
      error: (err) => reject(err instanceof Error ? err : new Error(String(err))),
    });
  });
}

export function mapAccount(client, signer, onSigned) {
  return submit(client.getUnsafeApi().tx.Revive.map_account(), signer, onSigned);
}

// Envía la escritura con peso y depósito de la simulación, con margen (lo que sobra se devuelve)
export function send(client, signer, data, sim, onSigned) {
  const cap = (x, max) => (x * 2n < max ? x * 2n : max);
  const tx = client.getUnsafeApi().tx.Revive.call({
    dest: address(),
    value: 0n,
    weight_limit: { ref_time: cap(sim.weight.ref_time, WEIGHT_CAP.ref_time), proof_size: cap(sim.weight.proof_size, WEIGHT_CAP.proof_size) },
    storage_deposit_limit: (sim.deposit * 3n) / 2n + 10n ** 9n,
    data: Binary.fromHex(data),
  });
  return submit(tx, signer, onSigned);
}
