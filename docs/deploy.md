# Publicar

Estado: **sin publicar**. Esta guía recoge el flujo del proyecto original (CLI de Playground); revisa
cada comando con `pg --help` antes del evento, porque no se ha ejecutado desde este repositorio.

## Requisitos

- Node 20 o más reciente (`.nvmrc` fija 22).
- El CLI de Playground ([guía oficial](https://docs.polkadot.com/apps/quick-start/)) y una Polkadot App
  para iniciar sesión.

## Pasos

```bash
npm ci
npm run check && npm test          # el CI hace lo mismo
pg login                           # escanea el QR con tu Polkadot App (interactivo)
pg deploy --domain loteriamexicana --playground --tag gaming
```

- El nombre necesita **9 caracteres o más** para quedar abierto a cualquiera (de 6 a 8 piden Proof of
  Personhood).
- En TestNet el dominio queda como `loteriamexicana.paseo`.
- `npm run build` genera `dist/index.html` (un solo archivo, ~1 MB, ~380 KB comprimido) con el SDK de
  Polkadot incluido; `npm run build:preview` genera la variante sin SDK (solo modo demostración).

## Después de publicar

1. Escribe el nombre en `src/config.js` (`dotName`, p. ej. `loteriamexicana.dot`) y vuelve a publicar: la
   pantalla del cantor lo muestra para que la gente sepa dónde entrar. `npm run check` valida el formato.
2. Abre la app **desde un teléfono que no sea el tuyo** y repite el piloto de [evento.md](evento.md).
3. Comprueba el chip de conexión del cantor: debe decir *Statement Store* en verde, no *Modo demostración*.

## Caducidad

Las publicaciones en devnet/Bulletin caducan a los pocos días (en otros proyectos ha sido ~14). Vuelve a
publicar la semana del evento y anota la fecha en el issue del evento.
