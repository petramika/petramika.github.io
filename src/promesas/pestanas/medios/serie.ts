import {MEDIA} from '../../datos';
import {fmt} from '../../lib/formato';

/*
  Ayudas para que los textos de la pestaña lean siempre el ultimo dato de
  medios.json y no un año escrito a mano. Las series son {año: valor}.
*/
export type Serie = Record<string, number>;
type Par = [anio: string, valor: number];

/** Pares [año, valor] ordenados por año */
export const pares = (s: Serie): Par[] => Object.entries(s).sort(([a], [b]) => Number(a) - Number(b));

/** Ultimo dato de la serie */
export const ultimo = (s: Serie): Par => pares(s).at(-1)!;
/** Primer dato de la serie */
export const primero = (s: Serie): Par => pares(s)[0];
/** Dato justo anterior al ultimo */
export const penultimo = (s: Serie): Par => pares(s).at(-2)!;

/** Maximo (o minimo) de la serie; si se repite, el primer año en que se alcanza */
export const maximo = (s: Serie): Par => pares(s).reduce((m, p) => (p[1] > m[1] ? p : m));
export const minimo = (s: Serie): Par => pares(s).reduce((m, p) => (p[1] < m[1] ? p : m));

/** La serie desde un año (incluido) */
export const desde = (s: Serie, anio: number): Serie => Object.fromEntries(pares(s).filter(([a]) => Number(a) >= anio));

/** Primer año en que la serie a supera a la b (null si nunca) */
export const primerAnioPorEncima = (a: Serie, b: Serie): string | null =>
  pares(a).find(([y, v]) => b[y] != null && v > b[y])?.[0] ?? null;

/** Entero con punto de miles también en cifras de 4 dígitos ("2.810", no "2810") */
export const ent = (v: number) => fmt(v, 0).replace(/^(-?\d)(\d{3})$/, '$1.$2');

/** Cifra sin decimal si es entera ("34") y con uno si no ("30,5") */
export const num1 = (v: number) => fmt(v, Number.isInteger(v) ? 0 : 1);

const NUMEROS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince'];
/** Numero pequeño en palabras ("seis"); a partir de 16, en cifra */
export const enLetra = (n: number) => NUMEROS[n] ?? fmt(n, 0);

/** "cinco veces menos", "tres veces más"... a partir del cociente entre dos cifras */
export function veces(mayor: number, menor: number, sentido: 'más' | 'menos') {
  const n = Math.round(mayor / menor);
  return n >= 2 ? `${enLetra(n)} veces ${sentido}` : sentido;
}

/** "más del doble", "más del triple"... o "más" si no llega al doble */
export function comparaVeces(a: number, b: number) {
  const r = a / b;
  return r >= 3 ? 'más del triple' : r >= 2 ? 'más del doble' : r > 1 ? 'más' : r === 1 ? 'lo mismo' : 'menos';
}

/** Un porcentaje dicho como en la calle: "casi la mitad", "uno de cada tres"... */
export function proporcion(pct: number) {
  if (pct >= 64 && pct <= 69) return 'dos de cada tres';
  if (pct >= 50 && pct < 53) return 'la mitad';
  if (pct >= 45 && pct < 50) return 'casi la mitad';
  if (pct >= 31 && pct <= 35) return 'uno de cada tres';
  return `${fmt(Math.round(pct), 0)} de cada 100`;
}

/** Primera letra en mayuscula */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "más que", "menos que" o "igual que" */
export const masMenos = (a: number, b: number) => (a > b ? 'más que' : a < b ? 'menos que' : 'igual que');

/** Años en que la serie toma el valor v, unidos con "y" ("2012 y 2013") */
export function aniosCon(s: Serie, v: number) {
  const ys = pares(s).filter(([, x]) => x === v).map(([y]) => y);
  return ys.length > 1 ? ys.slice(0, -1).join(', ') + ' y ' + ys.at(-1) : ys[0];
}

/*
  Medios nativos digitales por año, a partir del recuento de cada estudio
  ("≈116" → 116)
*/
export const NATIVOS: Serie = Object.fromEntries(
  (MEDIA.nativos as [string, string, string][]).map(([y, v]) => [y, Number(v.replace(/[^0-9]/g, ''))]),
);
