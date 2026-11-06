import {fmt} from '../../lib/formato';

/*
  Ayudas para que los textos de la pestaña lean siempre el último dato de los
  JSON (que se actualizan solos) en lugar de un año escrito a mano.
*/
type Serie<T = number> = Record<string, T>;

/** Claves de una serie ordenadas: '2002' < '2010', '2024-12' < '2026-09' */
export const claves = (s: Serie<unknown>) => Object.keys(s).sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));

/** Última clave de la serie y su valor */
export function ultimo<T>(s: Serie<T>): [string, T] {
  const k = claves(s).at(-1)!;
  return [k, s[k]];
}

/** Penúltima clave de la serie y su valor */
export function penultimo<T>(s: Serie<T>): [string, T] {
  const k = claves(s).at(-2)!;
  return [k, s[k]];
}

/** Clave y valor del máximo (o del mínimo) de una serie */
export function extremo(s: Serie, min = false): [string, number] {
  let mejor = claves(s)[0];
  for (const k of claves(s)) if (min ? s[k] < s[mejor] : s[k] > s[mejor]) mejor = k;
  return [mejor, s[mejor]];
}

/** Entrada de un objeto cuya clave empieza por un prefijo (claves con el año dentro, p. ej. «remesasPorDestino2025MEur_BdE») */
export function porPrefijo<T>(o: Record<string, T>, prefijo: string): [string, T] {
  const k = Object.keys(o).find((x) => x.startsWith(prefijo))!;
  return [k, o[k]];
}

/** Primer año (cuatro cifras) que aparece en un texto: «extranjerosPctPoblacion_1ene2026» → '2026' */
export const anioDe = (s: string) => s.match(/(19|20)\d\d/)![0];

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** Nombre del mes de una fecha '2026-09' o '2026-07-01' */
export const nombreMes = (f: string) => MESES[+f.slice(5, 7) - 1];
/** '2026-09' o '2026-07-01' → «septiembre de 2026» */
export const mesAnio = (f: string) => `${nombreMes(f)} de ${f.slice(0, 4)}`;

/** Un decimal sin «,0» al final: 18,0 → «18»; 27,57 → «27,6» */
export const dec1 = (v: number) => fmt(v, 1).replace(/,0$/, '');
/** Redondeo a centenas, millares…: red(411584, 100) → 411600 */
export const red = (v: number, a: number) => Math.round(v / a) * a;
