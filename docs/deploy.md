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
- Tras `DEPLOYMENT COMPLETE!` sale `Manifest publish failed … setText`: es un problema conocido de `pad`
  0.16.7 con `pad login`; **la app funciona igual** (solo falta la ficha con ícono). Ver
  [Ícono y ficha en la Polkadot App](#ícono-y-ficha-en-la-polkadot-app).
- La primera vez no hace falta nada más; para una versión nueva repite `npm run deploy` (pedirá una firma en
  el celular porque el nombre ya es tuyo).

## Ícono y ficha en la Polkadot App

La Polkadot App muestra el nombre, la descripción y el ícono que lee del **manifest** de DotNS (el registro de
texto `manifest` de `loteria-on-chain.dot`). `npm run deploy` lo intenta escribir porque existe
[`polkadot-app-deploy.config.mjs`](../polkadot-app-deploy.config.mjs):

- `icon.png` (512×512) se genera con `npm run icono`: dibuja la variante «corazon» con el arte real de las
  cartas ([`scripts/icono/`](../scripts/icono/icono.js)); `npm run icono -- --variante rosa` cambia de variante.
  Necesita Chrome; si hay `pngquant` lo comprime (~56 KB).
- `pad` sube el ícono a Bulletin e imprime `Icon CID: …` **antes** de escribir el manifest.
- Con `pad login` la escritura falla siempre: en 0.16.7 el paso del manifest firma solo con `--mnemonic` o con la
  cuenta del worker, nunca con la sesión del celular, y el nombre ya es tuyo. Para escribirlo hace falta firmar
  como dueño del nombre (pendiente de probar con `dotns text set … --signer qr`).
- Comprobar: `dotns text view loteria-on-chain manifest --env devnet` (hoy: `(not set)`).

## Comprobar

```bash
dotns content view loteria-on-chain --env devnet     # debe mostrar el CID nuevo
```

1. Abre `https://loteria-on-chain.dev-dot.li` (tarda ~10 s: busca el nombre y abre la app en un iframe).
2. En la pantalla del cantor, el chip de conexión debe decir **Statement Store** en verde, no *Modo
   demostración*, y bajo el código debe leerse `loteria-on-chain.dot`.
3. Repite el piloto de [evento.md](evento.md) con teléfonos de otras personas.

## Compatibilidad con el Host

El SDK que lleva la app y la Polkadot App tienen que hablar el mismo **códec** del protocolo. Si no, el SDK
dice «connected» pero el Host no contesta nada y la app se queda en *«Conectando con tu Polkadot App»*.
Medido en un iPhone (Polkadot App iOS) y en Polkadot Desktop 0.1.3: hablan el **códec 1**.

| Paquete | Versión | Nota |
|---|---|---|
| `@parity/product-sdk-host` | `0.19.1` | fija el `truapi` 0.13.1 (códec 1) |
| `@parity/product-sdk-statement-store` | `0.6.9` | la que depende justo de host 0.19.1 |

- Se fijan **exactas** (sin `^`) y `npm run check` falla si no lo están o si el códec instalado no es el 1.
- La versión 0.23 del host (códec 3) **no** funciona con la Polkadot App actual.
- Subir de versión solo después de medir el códec del Host en un teléfono real. La pantalla
  `#diagnostico` de la app muestra la versión del SDK, el códec y qué paso del arranque falló.
- Tras conectar, la app pide el permiso de publicación y hace un primer envío mínimo **en segundo plano**;
  el chip muestra «activando…» hasta que queda lista (~10 s en un iPhone; en Desktop hay que aprobar un cuadro).
- Si el Host no contesta, la app ya no se queda cargando: a los pocos segundos entra en modo demostración
  y dice por qué.

## Caducidad

Bulletin borra el contenido a los ~14 días (201 600 bloques). **Vuelve a publicar la semana del evento** y
verifica la URL en un teléfono que no sea el tuyo; una publicación de hoy sirve para el piloto, no para el día.
