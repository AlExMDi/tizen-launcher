import { defineConfig } from 'vite';

// Tizen 6.5 = Chromium M85. Compilamos a ES2019: así desaparecen `?.` y `??` (ES2020), que
// M85 sí entiende, pero dejamos margen por si instalas en una tele de 2020 (M69).
export default defineConfig({
  base: './', // rutas relativas: funciona desde file:// (wgt) y desde el proxy de TizenBrew
  server: { host: true, port: 5173 },
  build: {
    target: 'es2019',
    cssTarget: 'chrome85',
    outDir: 'dist',
    assetsInlineLimit: 0, // la fuente y las imágenes como ficheros, no en base64
    modulePreload: false, // el polyfill de modulepreload no aporta nada con un único bundle
    // Un .css real enlazado en el HTML; sin esto, con formato IIFE Vite inyecta el CSS desde JS
    // y se vería un destello de página sin estilos antes de ejecutar el script.
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Un único script clásico (IIFE) en vez de un módulo ES: en un .wgt la página se carga
        // desde file://, y Chromium bloquea por CORS los <script type="module"> con ese origen.
        format: 'iife',
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  plugins: [
    {
      name: 'classic-script',
      apply: 'build',
      // Vite inyecta <script type="module" crossorigin>; lo cambiamos por un script clásico
      // con defer (se ejecuta tras parsear el HTML, como haría un módulo). También quitamos
      // `crossorigin`: convierte la petición en CORS, y desde file:// fallaría.
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          return html
            .replace(/<script type="module" crossorigin src=/g, '<script defer src=')
            .replace(/ crossorigin/g, '');
        },
      },
    },
  ],
});
