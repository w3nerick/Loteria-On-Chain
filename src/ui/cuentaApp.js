// Ventana «Cuenta que paga el historial»: la dirección de la cuenta de la app (para mandarle PAS
// antes de que falte), su saldo de PAS (depósitos) y de PGAS (comisiones, las pone el Host).
import { h, toast, modal, copyText } from './dom.js';
import { appAccountInfo } from '../chain/seal.js';
import { pas } from '../chain/registry.js';
import { FAUCET_URL } from '../chain/network.js';

export async function showAppAccount() {
  toast('Consultando la cuenta de la app…', 'info', 2500);
  let info;
  try {
    info = await appAccountInfo();
  } catch (e) {
    toast(`No se pudo abrir la cuenta: ${e?.message || e}`, 'bad', 5000);
    return;
  }
  const copy = () => {
    toast(copyText(info.address) ? 'Dirección copiada' : 'No se pudo copiar: selecciónala a mano', 'good', 3000);
    return true; // la ventana sigue abierta
  };
  modal({
    title: 'Cuenta que paga el historial',
    body: h(
      'div',
      { class: 'verify-out' },
      h('p', {}, 'Es la cuenta de la app en este dominio. Guardar una ronda deja un depósito en PAS (~0.04 PAS una ronda chica, ~0.5 PAS con 50 jugadores firmados); las comisiones las paga el Host con PGAS.'),
      h('p', { class: 'num', style: { userSelect: 'all', wordBreak: 'break-all', fontWeight: '700' } }, info.address),
      h('p', {}, `PAS: ${pas(info.pas)} · PGAS: ${info.pgas === null ? 'sin leer' : pas(info.pgas).replace('PAS', 'PGAS')}`),
      h('p', { class: 'note' }, `Para fondearla: copia la dirección y manda PAS desde otra cuenta, o pídelos en ${FAUCET_URL} (red Paseo, Asset Hub).`),
    ),
    actions: [
      { label: 'Copiar dirección', kind: 'primary', onClick: copy },
      { label: 'Cerrar' },
    ],
  });
}
