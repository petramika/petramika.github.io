import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    /*
      La web vive en la raiz del dominio: el repositorio se llama
      petramika.github.io, que es como GitHub reconoce la pagina personal de
      una cuenta. Si algun dia pasara a ser un repositorio con otro nombre,
      esto tendria que volver a ser '/nombre-del-repo/' o la pagina saldria
      en blanco, buscando sus archivos donde no estan.
    */
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
