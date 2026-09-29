import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

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
