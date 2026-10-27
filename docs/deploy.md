# Publicar

Destino: **Products Devnet** (Paseo Asset Hub) con `pad`. Nombre: **`loteria-mexicana-on-chain.dot`** →
[`https://loteria-mexicana-on-chain.dev-dot.li`](https://loteria-mexicana-on-chain.dev-dot.li) en cualquier navegador y
`loteria-mexicana-on-chain.dot` dentro de Polkadot App / Desktop.

> Hasta el 27 oct 2026 la app vivía en `loteria-on-chain.dot`. Ese nombre es de la cuenta de `pad login` de
> pad 0.16.x, que ya no puede firmar con la Polkadot App de TrUAPI 0.25 («no allowance set for account»), así
> que se cambió de nombre. `loteria-on-chain.dot` se queda con la versión anterior.

## Requisitos

- **Node 22 o más** (`.nvmrc`). Con Node 20 `pad` falla al arrancar sin decir por qué.
- `pad` **0.22.1** (`npm i -g @polkadot-community-foundation/polkadot-app-deploy@0.22.1`). No aceptes la oferta
  de actualizar a `@parity/polkadot-app-deploy`: es otro paquete.
- Polkadot App del devnet de octubre 2026 en el celular (para `pad login`).
- Una **Terminal.app normal**: `pad` puede pedir confirmar con `Y`, y en terminales integradas de editores o
  asistentes el proceso corre en segundo plano y la tecla nunca llega.

## El nombre

Regla de DotNS v2: los dígitos finales deben ser 0 o 2 y la **base** (sin esos dígitos) decide qué pide.
`loteria-mexicana-on-chain` tiene base de 24 caracteres y ningún dígito: **registro abierto**, sin proof of
personhood. Se comprueba con:

```bash
dotns lookup owner-of loteria-mexicana-on-chain --env devnet     # Registered: false = libre
```

## Dueño del nombre

pad 0.22.1 firma la ficha (manifest, ícono y `app.<nombre>`) **con su worker** (`5DfhGy…`, la cuenta pública de
desarrollo), nunca con la sesión de `pad login`. Si el nombre ya es de tu sesión, la ficha revierte y `app.` (lo que
abre Polkadot Desktop) se queda con la versión anterior. Por eso `npm run deploy` corre pad con
`HOME=~/.pad-worker`: pad no ve tu sesión, el worker registra y sigue siendo dueño, y cada deploy actualiza contenido,
ficha y `app.` sin firmas en el teléfono.

- Precio: mientras el nombre sea del worker, cualquiera que use a propósito esa cuenta pública podría cambiarlo.
- Para pasarlo a tu sesión (después del evento): `pad transfer app.loteria-mexicana-on-chain.dot --env devnet` y luego
  `pad transfer loteria-mexicana-on-chain.dot --env devnet` (lo firma el worker). Desde ahí ya no se puede actualizar la ficha.
- `loteria-mexicana-onchain.dot` (27 oct) quedó a nombre de la sesión y sin ficha: por eso la app pasó a este nombre.

## Pasos

```bash
npm ci && npm run check && npm test
npm run deploy               # = build + HOME=~/.pad-worker PAD_ENV=devnet pad dist loteria-mexicana-on-chain.dot --env devnet --js-merkle
```

- `PAD_ENV=devnet` / `--env devnet` es **obligatorio**: sin él `pad` publica en otra red.
- El worker de pad registra el nombre y paga; el contenido sube con el pool compartido de Bulletin. Con
  `polkadot-app-deploy.config.mjs` presente, pad 0.22.1 también escribe la ficha (ícono, nombre, descripción) y
  `app.loteria-mexicana-on-chain.dot` con su `executable` en la misma corrida. No pide `pad login` ni firmas.
- Tarda unos 4–5 minutos. `nonce contention (attempt N/5)` y el aviso «devnet declares DotNS 1.0.0» son
  inofensivos.
- Para una versión nueva repite `npm run deploy`.

## Ícono y ficha en la Polkadot App

La Polkadot App y Polkadot Desktop muestran el nombre, la descripción y el ícono que leen del **manifest** de
DotNS (el registro de texto `manifest` de `loteria-mexicana-on-chain.dot`). Los datos salen de
[`polkadot-app-deploy.config.mjs`](../polkadot-app-deploy.config.mjs) y los publica pad 0.22.1 en el deploy.

- **Con manifest, la app ya no abre el contenido del nombre:** abre el de `app.loteria-mexicana-on-chain.dot`, y solo si
  tiene su registro `executable` (así lo resuelve Polkadot Desktop). pad 0.22.1 escribe el contenido y el
  `executable` de `app.` en una sola transacción.
- [`scripts/manifest.mjs`](../scripts/manifest.mjs) (`npm run manifest`) era el paso equivalente con pad 0.16.x y
  la sesión del celular; ya no hace falta con pad 0.22.1.
- `icon.png` (512×512) se genera con `npm run icono` con el arte real de las cartas
  ([`scripts/icono/`](../scripts/icono/icono.js)).
- Comprobar: `dotns text view loteria-mexicana-on-chain manifest --env devnet` y
  `dotns content view app.loteria-mexicana-on-chain --env devnet`.

## Comprobar

```bash
dotns content view loteria-mexicana-on-chain --env devnet     # debe mostrar el CID nuevo
```

1. Abre `https://loteria-mexicana-on-chain.dev-dot.li` (tarda ~10 s: busca el nombre y abre la app en un iframe).
2. En la pantalla del cantor, el chip de conexión debe decir **Statement Store** en verde, no *Modo
   demostración*, y bajo el código debe leerse `loteria-mexicana-on-chain.dot`.
3. Repite el piloto de [evento.md](evento.md) con teléfonos de otras personas.

## Compatibilidad con el Host

El SDK que lleva la app y la Polkadot App tienen que hablar el mismo **códec** del protocolo (TrUAPI). Si no, el SDK
dice «connected» pero el Host no contesta nada y la app se queda en *«Conectando con tu Polkadot App»*.
Desde el update del devnet del 22–23 oct 2026, Android e iOS (`devnet/2026-10-22.1`), Polkadot Desktop 0.1.4 y
dev-dot.li hablan **TrUAPI 0.25 (códec 3)**; las apps con el códec anterior ya no conectan.

| Paquete | Versión | Nota |
|---|---|---|
| `@parity/product-sdk-host` | `0.28.0` | fija el `truapi` 0.25.0 (códec 3), la de `@parity/product-sdk` 0.39.0 |
| `@parity/product-sdk-signer` | `0.17.3` | firmantes `TxCreator` de polkadot-api 3 |
| `@parity/product-sdk-statement-store` | `0.7.3` | la que depende justo de host 0.28.0 |
| `polkadot-api` | `3.2.1` | `createSubmitAndWatch` (eventos `created` → `inBestBlock` → `finalized`) |

- Se fijan **exactas** (sin `^`) y `npm run check` falla si no lo están o si el códec instalado no es el 3.
- El SDK 0.40 en adelante (TrUAPI 0.26) **no** funciona con los Hosts del devnet de octubre 2026.
- Subir de versión solo después de medir el códec del Host en un teléfono real. La pantalla
  `#diagnostico` de la app muestra la versión del SDK, el códec y qué paso del arranque falló.
- Tras conectar, la app pide el permiso de publicación y hace un primer envío mínimo **en segundo plano**;
  el chip muestra «activando…» hasta que queda lista (~10 s en un iPhone; en Desktop hay que aprobar un cuadro).
- Si el Host no contesta, la app ya no se queda cargando: a los pocos segundos entra en modo demostración
  y dice por qué.

## Caducidad

Bulletin borra el contenido a los ~14 días (201 600 bloques). **Vuelve a publicar la semana del evento** y
verifica la URL en un teléfono que no sea el tuyo; una publicación de hoy sirve para el piloto, no para el día.
