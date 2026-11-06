/*
  Avatar para las webs que no tienen icono propio: un circulo de color con
  sus iniciales en blanco, como los de Google. Como mucho dos letras, en
  mayusculas: la primera y la ultima palabra que cuentan del nombre
  ("Cuarenta años de promesas" → CP). El color sale del nombre, asi que
  cada web tiene siempre el mismo.

    node scripts/avatar.mjs "Cuarenta años de promesas" promesas
    node scripts/avatar.mjs P indice --color "#6A1B9A"

  En webs de politica, mejor fijar un color que no sea el de ningun partido
  (promesas usa --color "#455A64", gris azulado).

  Escribe public/avatares/<fichero>.svg; luego se enlaza en el <head> de la
  pagina con <link rel="icon" type="image/svg+xml" href="/avatares/<fichero>.svg">.
*/
import {mkdirSync, writeFileSync} from 'node:fs';

const [nombre, fichero, ...resto] = process.argv.slice(2);
if (!nombre || !fichero) {
  console.error('Uso: node scripts/avatar.mjs "<nombre>" <fichero> [--color "#RRGGBB"]');
  process.exit(1);
}

const SIN_PESO = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'a', 'un', 'una', 'the', 'of', 'and']);
const palabras = nombre.split(/\s+/).filter((p) => p && !SIN_PESO.has(p.toLowerCase()));
const iniciales = (palabras.length > 1 ? palabras[0][0] + palabras.at(-1)[0] : palabras[0][0]).toUpperCase();

// Colores de los avatares de Google (Material, tonos 700-800)
const COLORES = ['#6A1B9A', '#1565C0', '#00838F', '#2E7D32', '#EF6C00', '#C62828', '#AD1457', '#4527A0', '#00695C', '#5D4037'];
const i = resto.indexOf('--color');
const hash = [...nombre].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);
const color = i >= 0 ? resto[i + 1] : COLORES[hash % COLORES.length];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="32" fill="${color}"/>
  <text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="${iniciales.length > 1 ? 28 : 36}" fill="#fff">${iniciales}</text>
</svg>
`;
mkdirSync('public/avatares', {recursive: true});
writeFileSync(`public/avatares/${fichero}.svg`, svg);
console.log(`public/avatares/${fichero}.svg → ${iniciales} sobre ${color}`);
