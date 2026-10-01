// Ficha de producto que muestra la Polkadot App: nombre, descripción, ícono y versión.
// La publica `npm run manifest` (scripts/manifest.mjs), que `npm run deploy` llama al final;
// `pad` corre con --no-manifest porque su propio paso falla con `pad login` (docs/deploy.md).
// El ícono debe ser PNG o JPEG; se genera con `npm run icono`.
export default {
  domain: 'loteria-on-chain.dot',
  displayName: 'Lotería en Cadena',
  description: 'Lotería mexicana para toda la sala: el cantor en la pantalla grande y cada quien con su tabla en el teléfono.',
  icon: { path: './icon.png', format: 'png' },
  executables: [{ kind: 'app', path: './dist', appVersion: [1, 0, 0] }],
};
