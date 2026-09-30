# Historial en la cadena

Cada ronda puede quedar guardada para siempre en **Asset Hub** (Products Devnet): quién jugó, con qué tabla,
cuántas casillas marcó, quién ganó y, de quien firmó, su firma. Lo guarda el contrato
[`LoteriaRegistry`](../contract/contracts/LoteriaRegistry.sol) (pallet-revive, PolkaVM) y cualquiera lo puede
verificar desde la pantalla **Historial** de la app.

## Cómo funciona

1. **Termina la ronda.** Cada teléfono manda solo al cantor, por el Statement Store, su resultado: el código
   de su tabla y las casillas que marcó. No hace falta tocar nada.
2. **El jugador firma (opcional, gratis).** En la tarjeta de fin de ronda aparece **Firmar mi resultado**. La
   Polkadot App firma con la cuenta de la app (no es una transacción: no cuesta nada ni pide saldo) este texto:

   ```
   Lotería en Cadena
   Sala HDZT · ronda 1
   Baraja 1aaf56f9e2c4d7b8
   Tabla DAECF3
   Marqué 16 de 16 casillas (ffff)
   Apodo: Erick
   ```

   La firma reemplaza al resultado sin firma. El cantor la verifica antes de aceptarla.
3. **El cantor guarda la ronda.** El panel **Historial en la cadena** de la pantalla grande cuenta cuántos
   resultados llegaron y cuántos vienen firmados. **Guardar en la cadena** manda una transacción (o varias,
   con unos 90 jugadores por transacción) desde Polkadot Desktop. Lo que llegue después se agrega con
   **Agregar N más**. Si el cantor empieza otra ronda sin guardar, la app le avisa.

Quién paga: la cuenta de la app si tiene saldo; si no, la identidad `.dot` del cantor. Los jugadores nunca pagan.

## Qué se guarda

Por ronda (la **cabecera**, hasta ~210 bytes): sala, número de ronda, figura, compromiso de la baraja, la semilla
revelada, las cartas cantadas en orden, los ganadores y el nombre de la sala.

Por jugador (un **registro**, ~110 bytes firmado):

| Tipo | Cuándo | Qué lleva |
|---|---|---|
| Firmado | mandó su resultado y lo firmó | llave pública, firma sr25519, tabla, casillas marcadas, apodo |
| Sin firma | mandó su resultado pero no firmó (o ganó y no mandó nada: su tabla ya se conocía) | tabla, casillas marcadas (o «desconocidas»), apodo |
| Sin revelar | se fue antes de terminar la ronda | huella de su tabla (8 hex) y apodo |

Los **apodos quedan públicos para siempre** (decisión del evento). Las casillas marcadas son un número de 16
bits: el bit `i` es la casilla `i` de la tabla (por filas).

El formato exacto está en [`src/chain/record.js`](../src/chain/record.js) y el id de cada ronda es
`sha256("loteria-en-cadena/v1|<sala>|<ronda>|<compromiso>")`.

## Qué verifica la pantalla Historial

Todo se comprueba en el teléfono con los bytes de la cadena, sin confiar en quien los guardó:

- la semilla coincide con el compromiso y las cartas salieron en el orden de esa baraja;
- la firma de cada jugador es de su llave y cubre exactamente su tabla, sus casillas y su apodo;
- cada casilla marcada corresponde a una carta que sí salió;
- cuántas cartas de cada tabla salieron y si completó la figura.

Si el cantor agrega la firma de alguien después de guardar la ronda, el jugador aparece una sola vez: con su
mejor registro.

## El contrato

`LoteriaRegistry` solo guarda bytes: no verifica firmas (eso cuesta peso y se hace mejor fuera de la cadena).
Lo primero que se guarda gana y nada se sobrescribe; solo la cuenta que guardó una ronda puede agregarle
jugadores. Tope: 1000 jugadores por ronda, 16 KB por transacción.

```bash
cd contract
npm install
npm run build        # resolc (PolkaVM) + solc (ABI y pruebas)
npm test             # lógica del contrato en una EVM local
npm run simulate     # instanciación con el bytecode real contra el devnet; no pide semilla ni gasta
npm run deploy       # en Terminal.app: pide la frase semilla sin eco, simula y solo firma si escribes DESPLEGAR
```

Después de desplegar: poner la dirección de `contract/deployments.json` en `REGISTRY_ADDRESS`
([`src/chain/network.js`](../src/chain/network.js)) y republicar la app. El ABI de la app
([`src/chain/LoteriaRegistry.abi.json`](../src/chain/LoteriaRegistry.abi.json)) debe ser el del contrato: el CI
lo compara.

Depósito medido con la simulación (30 sep 2026): **1.36 PAS** por desplegar el contrato.

## Límites conocidos

- Sin probar todavía en la cadena real: el sello desde Polkadot Desktop, el costo por ronda (depósito por
  byte) y la firma de 100 teléfonos a la vez.
- Un jugador que no toca **Firmar** queda «sin firma»: su resultado lo afirma el cantor, no él.
- Si el cantor recarga la pantalla después de la victoria, la sala se retoma desde **Ser el cantor** mientras
  falte guardarla; los resultados que ya habían llegado se conservan.
