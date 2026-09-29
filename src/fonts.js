// Tipografías empaquetadas dentro del bundle (el Product no puede pedir
// recursos externos). Se cargan desde ArrayBuffer para no depender de la CSP.
import rye from '@fontsource/rye/files/rye-latin-400-normal.woff2?inline';
import oswald500 from '@fontsource/oswald/files/oswald-latin-500-normal.woff2?inline';
import oswald700 from '@fontsource/oswald/files/oswald-latin-700-normal.woff2?inline';
import alegreya400 from '@fontsource/alegreya/files/alegreya-latin-400-normal.woff2?inline';
import alegreyaIt from '@fontsource/alegreya/files/alegreya-latin-400-italic.woff2?inline';
import alegreya700 from '@fontsource/alegreya/files/alegreya-latin-700-normal.woff2?inline';

function toBuffer(dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

const FACES = [
  ['Rye', rye, { weight: '400' }],
  ['Oswald', oswald500, { weight: '500' }],
  ['Oswald', oswald700, { weight: '700' }],
  ['Alegreya', alegreya400, { weight: '400' }],
  ['Alegreya', alegreyaIt, { weight: '400', style: 'italic' }],
  ['Alegreya', alegreya700, { weight: '700' }],
];

let loading = null;

export function loadFonts() {
  if (loading) return loading;
  loading = Promise.all(
    FACES.map(async ([family, data, desc]) => {
      try {
        const face = new FontFace(family, toBuffer(data), desc);
        await face.load();
        document.fonts.add(face);
      } catch (e) {
        console.warn('fuente', family, e);
      }
    }),
  );
  return loading;
}
