// Cuentas para firmar dentro de la Polkadot App / Desktop.
//
// - Cuenta de la app (`SignerManager`): la que el Host deriva para
//   loteria-on-chain.dot. Con ella cada jugador firma su resultado: no gasta
//   nada y no hace falta saldo.
// - Identidad .dot: la dueña del username en People chain. El cantor puede
//   pagar el sello con ella si la cuenta de la app no tiene saldo.
//
// Fuera del contenedor (navegador) se usa una cuenta de desarrollo: sirve para
// ensayar la firma, pero nada se sella en la cadena.
// SDK 0.39 (TrUAPI 0.25): los firmantes son TxCreator de polkadot-api 3.
import { createClient, AccountId } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';
import { withTimeout } from '../net/timeout.js';
import { CONFIG } from '../config.js';
import { PEOPLE_GENESIS, PEOPLE_WS } from './network.js';
import { askRemote } from './client.js';

const SUBMIT_MS = 90000; // la persona tiene que ir a su teléfono y aprobar
const QUERY_MS = 15000;

let manager = null;
let appKey = null;
let identity = null;
let identityNote = null;
let username = null;
let connecting = null;
let inside = false;

const hex = (u8) => `0x${bytesToHex(u8)}`;

// Los errores del Host son uniones etiquetadas; se extrae algo legible
export function describeError(e) {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object') {
    if (e instanceof Error) return e.message;
    const reason = e.value && typeof e.value === 'object' ? e.value.reason : undefined;
    if (typeof e.tag === 'string') return reason ? `${e.tag}: ${reason}` : e.tag;
    try {
      return JSON.stringify(e);
    } catch {}
  }
  return String(e);
}

async function hostSdk() {
  if (__PREVIEW__) return null;
  const sdk = await import('@parity/product-sdk-host');
  return sdk.isInsideContainerSync() ? sdk : null;
}

export const walletInfo = () => ({ connected: !!appKey, inside, app: appKey, identity: identity && { address: identity.address, pubkey: identity.pubkey }, username, identityNote });

// Abre el diálogo de la cuenta: llamar desde un toque de la persona, nunca al cargar
export function connectWallet() {
  connecting ??= (async () => {
    const host = await hostSdk();
    inside = !!host;
    const { SignerManager } = await import('@parity/product-sdk-signer');
    manager ??= new SignerManager({ dappName: CONFIG.dotName });
    const r = await withTimeout(manager.connect(inside ? 'host' : 'dev'), SUBMIT_MS, 'conectar tu cuenta');
    if (!r.ok) throw new Error(describeError(r.error));
    const acc = r.value[0];
    if (!acc) throw new Error(inside ? 'La Polkadot App no entregó ninguna cuenta.' : 'No hay cuenta de ensayo.');
    manager.selectAccount(acc.address);
    appKey = { address: acc.address, pubkey: hex(acc.publicKey) };
    return appKey;
  })();
  connecting.catch(() => (connecting = null));
  return connecting;
}

// Firma un texto con la cuenta de la app. Devuelve { pubkey, sig } en hex.
export async function signText(text) {
  const key = await connectWallet();
  const r = await withTimeout(manager.signRaw(utf8ToBytes(text)), SUBMIT_MS, 'la firma');
  if (!r.ok) throw new Error(`Firma rechazada: ${describeError(r.error)}`);
  return { pubkey: key.pubkey, sig: hex(r.value) };
}

// --- identidad .dot (solo para pagar el sello) ---------------------------------------------
async function usernameOwner(name) {
  const host = await hostSdk();
  const query = async (client) => {
    const q = client.getUnsafeApi().query.Resources.UsernameOwnerOf.getValue(utf8ToBytes(name));
    const ss58 = await withTimeout(q, QUERY_MS, 'People chain');
    return ss58 ? hex(AccountId().enc(ss58)) : null;
  };
  if (host) {
    try {
      const p = await withTimeout(host.getHostProvider(PEOPLE_GENESIS), 8000, 'People chain desde el Host');
      if (p) return await query(createClient(p));
    } catch {}
    await askRemote();
  }
  return query(createClient(getWsProvider(PEOPLE_WS)));
}

export async function loadIdentity() {
  if (identity) return identity;
  await connectWallet();
  const host = await hostSdk();
  if (!host) {
    identityNote = 'fuera de la Polkadot App';
    return null;
  }
  // El Host puede mostrar un cuadro para compartir la identidad (SDK 0.39): tiempo de diálogo, no de consulta
  let why = 'tu cuenta no tiene username';
  try {
    const u = await withTimeout(manager.getUserId(), SUBMIT_MS, 'tu username');
    username = u?.ok ? u.value.primaryUsername || null : null;
    if (!u?.ok) why = `la Polkadot App no entregó tu username: ${describeError(u?.error)}`;
  } catch (e) {
    username = null;
    why = `la Polkadot App no entregó tu username (${describeError(e)}); ¿aprobaste compartir tu identidad?`;
  }
  if (!username) {
    identityNote = why;
    return null;
  }
  try {
    const owner = await usernameOwner(username);
    if (!owner) {
      identityNote = `${username} no aparece en People chain`;
      return null;
    }
    const ap = await withTimeout(host.getAccountsProvider(), 8000, 'proveedor de cuentas');
    const publicKey = hexToBytes(owner.slice(2));
    identity = { address: AccountId().dec(publicKey), pubkey: owner, signer: ap.getLegacyAccountSigner({ publicKey, name: username }) };
    return identity;
  } catch (e) {
    identityNote = `no se pudo consultar People chain (${describeError(e)})`;
    return null;
  }
}

// La cuenta de la app paga primero (como polka-man.dot): no pide tu identidad
export async function appPayer() {
  await connectWallet();
  return { kind: 'app', address: appKey.address, signer: manager.getSigner() };
}

// La identidad solo se pide si la cuenta de la app no alcanza (el Host muestra un cuadro)
export async function identityPayer() {
  const id = await loadIdentity();
  return id ? { kind: 'identity', address: id.address, signer: id.signer } : null;
}

// Permiso de gas (PGAS) para la cuenta de la app: el Host paga las comisiones con PGAS y la recarga.
// El depósito de almacenamiento del contrato sigue saliendo de PAS. Nunca lanza.
export async function requestGas() {
  const host = await hostSdk();
  if (!host) return 'fuera de la Polkadot App';
  try {
    const r = await withTimeout(host.requestResourceAllocation([{ tag: 'SmartContractAllowance', value: { tag: 'Index', value: 0 } }]), SUBMIT_MS, 'permiso de gas');
    return r?.ok ? r.value?.[0] ?? 'sin respuesta' : describeError(r?.error);
  } catch (e) {
    return describeError(e);
  }
}

// Permiso para mandar transacciones: sin él la hoja de firma no aparece
export async function askChainSubmit() {
  const host = await hostSdk();
  if (!host) return;
  const perm = await withTimeout(host.requestPermission({ tag: 'ChainSubmit', value: undefined }), SUBMIT_MS, 'permiso para enviar transacciones');
  if (!perm.ok || !perm.value) throw new Error('permiso para enviar transacciones denegado');
}
