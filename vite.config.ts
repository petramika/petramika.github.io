import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/*
  Cada pagina de la web es una carpeta, como en un servidor de los de antes:
  la raiz es el indice y cada proyecto vive en la suya. Vite construye todas a
  la vez y las deja en dist/ con la misma estructura. Un proyecto nuevo es una
  carpeta con su index.html, una linea aqui y otra en src/indice/proyectos.ts.
*/
const paginas = {
  indice: 'index.html',
  rota: 'rota/index.html',
  politica: 'espana-politica-datos/index.html',
  politicaFuentes: 'espana-politica-datos/fuentes.html',
  politicaAutora: 'espana-politica-datos/sobre-la-autora.html',
  // Antes se llamaba «promesas»: estas solo redirigen a la nueva direccion
  promesas: 'promesas/index.html',
  promesasFuentes: 'promesas/fuentes.html',
  promesasAutora: 'promesas/sobre-la-autora.html',
  filosofia: 'historia-filosofia-tldr/index.html',
};

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
    /*
      Varias paginas y no una sola app: en desarrollo, /rota/ sirve
      rota/index.html, y una ruta que no existe da 404 en vez de caer en el
      indice sin avisar.
    */
    /*
      Los datos (filosofos, historia, indicadores…) como JSON.parse('…') en vez
      de objetos de JavaScript: el navegador los lee bastante mas rapido.
    */
    json: {stringify: true},
    appType: 'mpa' as const,
    // Fecha de la ultima actualizacion, para el pie de todas las paginas
    define: {__ACTUALIZADO__: JSON.stringify(new Date().toISOString())},
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Los programas de los partidos (pestanas/partidos) pesan ~550 kB: son
      // datos, van en su propio trozo y solo se descargan al abrir esa pestaña.
      // Igual las fichas de filosofia (~660 kB, ~195 kB comprimidas): se piden
      // al abrir el primer filosofo, no al cargar la pagina.
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        input: Object.fromEntries(
          Object.entries(paginas).map(([nombre, archivo]) => [nombre, path.resolve(__dirname, archivo)]),
        ),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify; file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
