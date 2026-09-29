# Guía para una sala grande (25 o más jugadores)

Lo que está probado y lo que **no** se puede probar sin teléfonos de verdad.

## Qué sí está medido

Simulación de 1 cantor + N jugadores con latencia de 30–450 ms y 8 % de mensajes perdidos
(`npm run test:scale` y `scripts/carga.mjs`). Es el mismo motor del juego sobre un bus en
memoria; el Statement Store real no interviene.

Lo que garantiza el código:

- Cada mensaje pesa menos de 480 bytes y cada cuenta tiene uno o dos vivos (el estado del cantor, o
  registro + reclamo del jugador), muy por debajo del límite de ~1 KB por cuenta del SDK.
- Las confirmaciones de registro caben en un solo estado, así que no crecen con la sala.
- Los teléfonos escalonan sus registros y reintentan rápido al principio, para no depender de un
  solo mensaje.
- El cantor espera a que vuelva casi toda la sala antes de cantar la primera carta.

## Qué NO está medido

- **La red real.** Hay que confirmar con teléfonos de verdad que el Host acepta ~100 cuentas
  publicando en el Statement Store a la vez y que cada una recibe su `StatementStoreAllowance`.
- **El Wi-Fi del recinto.** 100 teléfonos con un WebSocket abierto cada uno es lo que más suele fallar
  en un evento.
- **Teléfonos viejos.** La tabla 3D exige WebGL; si no hay, se cae a la versión 2D.

## Piloto recomendado (una semana antes)

1. **5 teléfonos**, mezcla de iPhone y Android: una ronda completa. Comprueba que el chip de conexión
   del cantor siga verde y que «Tabla … registrada con el cantor» aparezca en segundos.
2. **15–20 personas** en el mismo Wi-Fi que usará el evento. Mide cuántas quedan «registradas» antes de
   la primera carta (el cantor lo muestra: *Registrando tablas… 17 de 20*).
3. **30+** si se puede. Si algún teléfono se queda en «registrando…» más de 15 s, anota modelo y red.

## La noche

- El cantor en **red cableada** o con su propio hotspot, no en el mismo Wi-Fi saturado que el público.
- Abre la sala y pide que entren **cuando ya esté proyectado el código**, no antes: así no hay dos salas.
- Figuras para muchos jugadores: **chorro** cae hacia la carta 12 (~1.5 min a 8 s) con un empate de dos
  en 1 de cada 5 rondas; **tabla llena** hacia la 43 (~6 min). Hasta 3 empates se reconocen solos.
- **Nueva ronda** hace que todos los teléfonos se vuelvan a registrar solos; el cantor espera a que vuelva casi toda la sala.
- Si un teléfono muestra «sin conexión», al ganar enseña el código de la tabla y el cantor lo
  verifica con **Verificar tabla** (tecla `V`).
- Si se recarga la pantalla del cantor, **Ser el cantor → Retomar sala** conserva baraja, cartas y
  tablas registradas.

## Si publicas en devnet

Las publicaciones en devnet/Bulletin caducan a los pocos días (en otros proyectos ha sido ~14):
vuelve a publicar la semana del evento y comprueba la URL final en un teléfono que no sea el tuyo.
