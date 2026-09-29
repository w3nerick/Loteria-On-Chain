# Sistema de diseño

«Kermés nocturna»: un escenario 3D a sangre (papel picado, foquitos, mesa de lotería) con dos materiales
flotando encima. Todo el CSS vive en `src/style.css`; los tokens están en `:root`.

## Materiales

| Material | Clase | Para qué | Aspecto |
|---|---|---|---|
| **Vidrio ahumado** | `.glass` | Información en vivo que se lee de reojo: panel del cantor, cabecera del jugador, barra de controles, chips | fondo violeta translúcido, borde `--glass-line`, desenfoque, texto crema |
| **Boleto de papel** | `.ticket` | Lo que se lee con calma o se toca con intención: formularios, hojas emergentes, modales, avisos | crema con borde punteado, sombra dura |

Regla: lo que cambia cada pocos segundos (cartas, contadores) va en vidrio; lo que pide una decisión
(entrar, reclamar, aprobar) va en papel.

## Tokens

| Grupo | Tokens |
|---|---|
| Color base | `--noche` `#140b2e`, `--noche-2` `#231046`, `--papel` `#fff3d6`, `--papel-2` `#f6e3b8`, `--tinta` `#2a1a12` |
| Acentos | `--rosa` `#e4007c` (acción principal), `--cempasuchil` `#ffb000` (avance, ganador), `--turquesa`, `--verde` (ok), `--rojo` (error), `--morado`, `--azul` |
| Vidrio | `--glass`, `--glass-2`, `--glass-line` |
| Tipografía | `--display` Rye (títulos y números grandes) · `--ui` Oswald (botones, etiquetas, chips) · `--texto` Alegreya (versos y párrafos) · `--mono` (hashes) |
| Radios | `--r-sm` 10 · `--r-md` 14 · `--r-lg` 22 · `--radio` 16 |
| Espacio (rejilla de 4/8) | `--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 24 · `--s6` 32 |
| Movimiento | `--pop` (rebote) para entradas; el resto usa `ease` |
| Zonas seguras | `--safe-t`, `--safe-b` (notch y barra inferior) |

Las tres tipografías van empaquetadas en el bundle (`src/fonts.js`): el Product no puede pedir recursos
externos. Licencia SIL OFL.

## Componentes

- **Botones** (`.btn`): chunky en 3D con sombra dura. `.btn-primary` rosa (una por pantalla), `.btn-gold`,
  `.btn-ghost`, `.btn-dock` (barra del cantor, con ícono + etiqueta que se oculta en pantallas chicas).
  Alto mínimo 46 px (44 px en la barra).
- **Chips** (`.chip`): estado compacto (sala, figura, conexión). Punto verde/ámbar/rojo para la red.
- **Íconos:** trazo de 2.2 px en rejilla de 24, definidos en `src/ui/dom.js` (`icon(nombre)`); usan
  `currentColor`.
- **Hoja emergente del jugador** (`.sheet`): sube desde abajo, deja ver la tabla; la tabla se reencuadra
  con `scene.setInsets()` para no quedar tapada.
- **Frijolitos** (`.bean`): un punto de color por jugador en la pantalla del cantor.

## Layouts

**Cantor** (`.cantor`, cuadrícula de 3 columnas: 25 % · centro · 31 %). El 3D depende de estas fracciones:
la carta destacada se centra en `x = 0.465` y el tablero en `x = 0.835` (`CantorScene.layout()`), así que
cambiar el ancho de las columnas obliga a tocar ese método.

| Zona | Contenido |
|---|---|
| Izquierda | código de sala en fichas · jugadores (número, frijolitos, últimas llegadas) · figura · «Juego limpio» al ganar |
| Centro | carta que vuela, nombre y verso; al ganar, banner y tabla ganadora |
| Derecha | tablero «Ya salieron» (3D) |
| Abajo | barra de controles; se oculta a los 4.5 s sin mover el ratón durante la partida |

En vertical (`max-width: 820px` o alto > ancho) todo se apila y la barra desliza en horizontal.

**Jugador** (`.player`). Vertical: cabecera de vidrio arriba (chips + anillo de avance + carta actual),
tabla 3D al centro, estado + puntitos + botón ¡Lotería! abajo. Ancho u horizontal
(`min-aspect-ratio: 6/5` y ≥ 640 px): la cabecera y el botón pasan a una **columna lateral** y la tabla
ocupa el resto. Pantallas bajas (`max-height: 700px` / `520px`) compactan la carta y las hojas.

## Movimiento y accesibilidad

- `prefers-reduced-motion` apaga animaciones CSS y acorta las de la escena 3D.
- Regiones vivas (`aria-live`) en la carta cantada y en la lista de llegadas.
- Botones de 44 px o más (el de salir del jugador mide 40 px), foco visible (`:focus-visible`) y texto crema
  sobre vidrio oscuro; no hay una medición formal de contraste.
- Vibración y sonido son opcionales; la voz del cantor solo aparece si el equipo tiene voces en español.

## Al cambiar la interfaz

1. Revisa en móvil (390 × 844 y 360 × 640), horizontal (844 × 390), tableta y proyector (1920 × 1080).
2. Con `npm run dev`, el botón «+100 (carga)» del cantor llena la sala para ver cómo se comporta.
3. Actualiza las capturas de `docs/img/` si cambia algo visible.
