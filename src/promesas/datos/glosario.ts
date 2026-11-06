import type {Diccionario} from '../../comun/Glosario';

/*
  Palabras dificiles de la web, un archivo por pestaña (glosario/*.json) con
  {clave: {t: 'Término', d: 'Definición fácil'}}. Se juntan aqui; si una clave
  se repite, gana la primera (comun.json va antes que el resto).
*/
const archivos = import.meta.glob<{default: Diccionario}>('./glosario/*.json', {eager: true});
const orden = Object.keys(archivos).sort((a, b) => (a.endsWith('comun.json') ? -1 : b.endsWith('comun.json') ? 1 : a.localeCompare(b)));
export const GLOSARIO: Diccionario = {};
for (const k of orden) for (const [clave, v] of Object.entries(archivos[k].default)) GLOSARIO[clave] ??= v;
