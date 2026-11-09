/*
  Busqueda aproximada («fuzzy»): perdona tildes, mayusculas y erratas
  («nietzche», «espinoza», «estoisismo»). Cada palabra que se escribe tiene
  que parecerse a alguna palabra del filosofo (nombre, corriente, lugar,
  temas o «conocido por»): igual, empezando igual, conteniendola o con una o
  dos letras cambiadas segun lo larga que sea.
*/
export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();

// Palabras que no ayudan a buscar
const VACIAS = new Set('de del la las el los y e o u a en un una por con al lo que su sus se'.split(' '));
export const palabras = (s: string) => norm(s).split(' ').filter((w) => w && !VACIAS.has(w));

/** Distancia de edicion con trasposiciones (Damerau, version corta); corta en cuanto pasa de `max` */
function distancia(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let minFila = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      minFila = Math.min(minFila, d[i][j]);
    }
    if (minFila > max) return max + 1;
  }
  return d[a.length][b.length];
}

const tolerancia = (n: number) => (n <= 3 ? 0 : n <= 5 ? 1 : 2);

/** Cuanto se parece una palabra escrita a una palabra del texto (0 = nada) */
function parecido(t: string, w: string) {
  if (w === t) return 4;
  if (w.startsWith(t)) return 3;
  if (t.length >= 3 && w.includes(t)) return 2;
  const tol = tolerancia(t.length);
  if (!tol) return 0;
  // Errata en la palabra entera («nietzche») o en el principio («estois…»)
  if (distancia(t, w, tol) <= tol) return 1.6;
  if (w.length > t.length && distancia(t, w.slice(0, t.length), tol) <= tol) return 1.2;
  return 0;
}

/** Puntuacion de una busqueda contra un texto ya partido en palabras. 0 si alguna palabra no encaja. */
export function puntuar(consulta: string[], texto: string[]) {
  if (!consulta.length) return 1;
  let total = 0;
  for (const t of consulta) {
    let mejor = 0;
    for (const w of texto) {
      const p = parecido(t, w);
      if (p > mejor) mejor = p;
      if (mejor === 4) break;
    }
    if (!mejor) return 0;
    total += mejor;
  }
  return total / consulta.length;
}

export type Sugerencia = {texto: string; tipo: string; peso: number; clave: string; palabras: string[]; detalle?: string;
  /** Palabras relacionadas (corriente, lugar, «conocido por»): cuentan menos, rellenan la lista */
  extra?: string[]};

/** Las mejores `n` sugerencias: primero las que mas se parecen, y a igualdad, las mas importantes */
export function sugerir(q: string, todas: Sugerencia[], n = 7) {
  const consulta = palabras(q);
  if (!consulta.length) return [];
  const entera = norm(q);
  return todas
    .map((s) => {
      let p = puntuar(consulta, s.palabras);
      if (p && norm(s.texto).startsWith(entera)) p += 2;
      if (!p && s.extra) p = puntuar(consulta, s.extra) * 0.3;
      return {s, p};
    })
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || b.s.peso - a.s.peso)
    .slice(0, n)
    .map((x) => x.s);
}
