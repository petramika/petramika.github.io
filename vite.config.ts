import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    /*
      La web vive en petramika.github.io/thoughts/, no en la raiz del dominio,
      asi que todo lo construido tiene que apuntar ahi. Sin esto los assets se
      piden a /assets/... y la pagina publicada sale en blanco.

      Con dominio propio, o si el repositorio se llamara petramika.github.io,
      esto pasaria a ser '/'.
    */
    base: '/thoughts/',
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
