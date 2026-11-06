/*
  Ayudas para leer las series por año sin escribir años fijos: asi la pestaña
  sigue diciendo cosas ciertas cuando el script de datos añade años nuevos.
  Una serie es {año: valor}; las claves se ordenan como numeros.
*/
type Serie<V> = Record<string, V>;

export const anios = <V>(s: Serie<V>) => Object.keys(s).sort((a, b) => +a - +b);

/** Ultimo dato de la serie: [año, valor] */
export function ultimo<V>(s: Serie<V>): [string, V] {
  const k = anios(s).at(-1)!;
  return [k, s[k]];
}

/** Dato anterior a un año (por defecto, el penultimo de la serie): [año, valor] */
export function anterior<V>(s: Serie<V>, a = ultimo(s)[0]): [string, V] {
  const ks = anios(s), k = ks[ks.indexOf(a) - 1];
  return [k, s[k]];
}

/** Maximo de la serie (el primer año en que se alcanza): [año, valor] */
export function maximo(s: Serie<number>): [string, number] {
  return anios(s).reduce<[string, number]>((m, k) => (s[k] > m[1] ? [k, s[k]] : m), ['', -Infinity]);
}

/** Minimo de la serie (el primer año en que se alcanza): [año, valor] */
export function minimo(s: Serie<number>): [string, number] {
  return anios(s).reduce<[string, number]>((m, k) => (s[k] < m[1] ? [k, s[k]] : m), ['', Infinity]);
}

/** Años sin dato entre el primero y el ultimo de la serie */
export function huecos<V>(s: Serie<V>): number[] {
  const ks = anios(s), r: number[] = [];
  for (let y = +ks[0]; y <= +ks.at(-1)!; y++) if (s[y] == null) r.push(y);
  return r;
}

/** «2022», «2022 y 2023», «2005, 2012 y 2022» */
export const lista = (xs: (string | number)[]) => (xs.length < 2 ? String(xs[0] ?? '') : xs.slice(0, -1).join(', ') + ' y ' + xs.at(-1));

/** Entero con punto de miles siempre (fmt no lo pone en numeros de 4 cifras): 6000 → «6.000» */
export const miles = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** «tres», «cuatro»… para contar pocas cosas en un texto */
export const enLetra = (n: number) => ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'][n] ?? String(n);
