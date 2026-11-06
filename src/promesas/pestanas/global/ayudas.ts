/*
  Ayudas para que los textos de la pestaña lean el ultimo dato de cada serie
  en vez de un año escrito a mano. Una serie es {año: valor}.
*/
type Serie = Record<string, number>;

/** Entero con punto de miles también en cifras de 4 dígitos (fmt escribe «1342»; en un texto queda mejor «1.342») */
export const entero = (v: number) => (v < 0 ? '−' : '') + String(Math.round(Math.abs(v))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Años de la serie, ordenados de menor a mayor */
export const anios = (s: Serie) => Object.keys(s).sort((a, b) => +a - +b);

/** [año, valor] del ultimo dato */
export function ultimo(s: Serie): [string, number] {
  const k = anios(s).at(-1)!;
  return [k, s[k]];
}

/** [año, valor] del maximo de la serie */
export function maximo(s: Serie): [string, number] {
  const k = anios(s).reduce((a, b) => (s[b] > s[a] ? b : a));
  return [k, s[k]];
}

export const suma = (s: Serie) => Object.values(s).reduce((a, b) => a + b, 0);

/** «2024», «2024 y 2025», «2023, 2024 y 2025» */
export const lista = (xs: string[]) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs.at(-1));

/** 8,7 → «casi 9»; 2,2 → «más de 2»; 3 → «3» */
export function aproximado(v: number) {
  const n = Math.round(v);
  return (v < n - 0.05 ? 'casi ' : v > n + 0.05 ? 'más de ' : '') + n;
}
