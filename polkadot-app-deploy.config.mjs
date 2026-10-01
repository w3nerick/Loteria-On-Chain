// Manifest de producto para `pad`: con este archivo, `npm run deploy` también escribe en
// DotNS el nombre, la descripción y el ícono que muestra la Polkadot App (y registra
// app.loteria-on-chain.dot). El ícono debe ser PNG o JPEG; se genera con `npm run icono`.
export default {
  domain: 'loteria-on-chain.dot',
  displayName: 'Lotería en Cadena',
  description: 'Lotería mexicana para toda la sala: el cantor en la pantalla grande y cada quien con su tabla en el teléfono.',
  icon: { path: './icon.png', format: 'png' },
  executables: [{ kind: 'app', path: './dist', appVersion: [1, 0, 0] }],
};
