# Publicar

Destino: **Products Devnet** (Paseo Asset Hub) con `pad`, el mismo flujo con el que se publicaron otras
apps del piloto. Nombre: **`loteria-on-chain.dot`** →
[`https://loteria-on-chain.dev-dot.li`](https://loteria-on-chain.dev-dot.li) en cualquier navegador y
`loteria-on-chain.dot` dentro de Polkadot App / Desktop.

## Requisitos

- **Node 22 o más** (`.nvmrc`). Con Node 20 `pad` falla al arrancar sin decir por qué.
- `pad` 0.16.7 o más y `dotns` 0.9.5 o más:
  `npm i -g @polkadot-community-foundation/polkadot-app-deploy@latest @polkadot-community-foundation/dotns-cli@latest`
- Polkadot App en el celular (para `pad login`).
- Una **Terminal.app normal**: `pad` puede pedir confirmar con `Y`, y en terminales integradas de editores o
  asistentes el proceso corre en segundo plano y la tecla nunca llega.

## El nombre

Regla de DotNS v2: los dígitos finales deben ser 0 o 2 y la **base** (sin esos dígitos) decide qué pide.
`loteria-on-chain` tiene base de 16 caracteres y ningún dígito: **registro abierto**, sin proof of
personhood. Se comprueba con:

```bash
dotns lookup name loteria-on-chain --env devnet     # owner 0x000… = libre
```

## Pasos

```bash
pad login                    # QR con Polkadot App; el handshake puede tardar minutos en el devnet
pad whoami --env devnet      # ¿quedó la sesión?
npm ci && npm run check && npm test
npm run deploy               # = npm run build && PAD_ENV=devnet pad dist loteria-on-chain.dot
```

- `PAD_ENV=devnet` es **obligatorio**: sin él `pad` publica en otra red.
- En el modo por defecto (solo testnet) un worker local sube a Bulletin, registra el nombre y paga; al final
  **traspasa el nombre** a tu cuenta. El celular no firma nada.
- Tarda unos 3 minutos. Un `nonce contention (attempt 1/5)` en medio es un reintento automático.
- Tras `DEPLOYMENT COMPLETE!` puede salir `Manifest publish failed … setText`: es un problema conocido de
  `pad` 0.16.7 con `pad login`; **la app funciona igual** (solo falta la ficha en la galería).
- La primera vez no hace falta nada más; para una versión nueva repite `npm run deploy` (pedirá una firma en
  el celular porque el nombre ya es tuyo).

## Comprobar

```bash
dotns content view loteria-on-chain --env devnet     # debe mostrar el CID nuevo
```

1. Abre `https://loteria-on-chain.dev-dot.li` (tarda ~10 s: busca el nombre y abre la app en un iframe).
2. En la pantalla del cantor, el chip de conexión debe decir **Statement Store** en verde, no *Modo
   demostración*, y bajo el código debe leerse `loteria-on-chain.dot`.
3. Repite el piloto de [evento.md](evento.md) con teléfonos de otras personas.

## Caducidad

Bulletin borra el contenido a los ~14 días (201 600 bloques). **Vuelve a publicar la semana del evento** y
verifica la URL en un teléfono que no sea el tuyo; una publicación de hoy sirve para el piloto, no para el día.
