// Ficha de producto que muestra la Polkadot App: nombre, descripción, ícono y versión.
// pad 0.22.1 la publica en el mismo `npm run deploy` (manifest + app.<nombre> con su executable).
// El ícono debe ser PNG o JPEG; se genera con `npm run icono`.
export default {
  domain: 'loteria-mexicana-onchain.dot',
  displayName: 'Lotería en Cadena',
  description: 'Lotería mexicana para toda la sala: el cantor en la pantalla grande y cada quien con su tabla en el teléfono.',
  icon: { path: './icon.png', format: 'png' },
  executables: [{ kind: 'app', path: './dist', appVersion: [1, 0, 0] }],
};
