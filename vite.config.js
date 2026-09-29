import { defineConfig } from 'vite';
import fs from 'node:fs';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Versiones que se muestran en la pantalla #diagnostico (y el códec del protocolo con el Host)
const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
function hostCodec() {
  try {
    const src = fs.readFileSync(new URL('./node_modules/@parity/truapi/dist/generated/client.js', import.meta.url), 'utf8');
    return Number(src.match(/TRUAPI_CODEC_VERSION\s*=\s*(\d+)/)[1]);
  } catch {
    return null;
  }
}
const BUILD = {
  app: pkg.version,
  host: pkg.dependencies['@parity/product-sdk-host'],
  statementStore: pkg.dependencies['@parity/product-sdk-statement-store'],
  codec: hostCodec(),
};

// `npm run build`         → dist/ para `pg deploy` (incluye el SDK de Polkadot)
// `npm run build:preview` → dist-preview/ sin SDK, solo modo demostración
export default defineConfig(({ mode }) => {
  const preview = mode === 'preview';
  return {
    base: './',
    plugins: [
      viteSingleFile({ removeViteModuleLoader: true }),
      {
        name: 'host-webview-mark',
        transformIndexHtml(html) {
          // Los Hosts webview (Polkadot App / Desktop) inyectan su puerto al cargar;
          // la marca hace que el SDK lo espere en vez de descartar el Host.
          const mark = preview ? '' : '<script>window.__HOST_WEBVIEW_MARK__=true;</script>';
          return html.replace('<!--HOST_MARK-->', mark);
        },
      },
    ],
    define: {
      __PREVIEW__: JSON.stringify(preview),
      __BUILD__: JSON.stringify(BUILD),
    },
    build: {
      outDir: preview ? 'dist-preview' : 'dist',
      target: 'es2020',
      assetsInlineLimit: 100000000,
      chunkSizeWarningLimit: 5000,
      cssCodeSplit: false,
      emptyOutDir: true,
    },
    server: { host: '127.0.0.1', port: 5174, strictPort: true },
  };
});
