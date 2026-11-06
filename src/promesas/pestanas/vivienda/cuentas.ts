import {ANNUAL, HAY_CASAS, SPARSE, TENENCIA, VIV} from '../../datos';
import {fmt} from '../../lib/formato';

/*
  Cuentas de la pestaña de vivienda: leen el ultimo dato de cada serie para
  que los textos sigan siendo ciertos cuando lleguen años nuevos.
*/
export type Serie = Record<string, number>;

/** Años de una serie, ordenados */
export const anios = (s: Serie) => Object.keys(s).sort((a, b) => +a - +b);
/** [año, valor] del ultimo dato */
export const ultimo = (s: Serie): [string, number] => {
  const k = anios(s).at(-1)!;
  return [k, s[k]];
};
/** [año, valor] del primer dato */
export const primero = (s: Serie): [string, number] => {
  const k = anios(s)[0];
  return [k, s[k]];
};
/** [año, valor] del dato `n` puestos antes del ultimo (1 = el penultimo) */
export const antes = (s: Serie, n: number): [string, number] => {
  const k = anios(s).at(-1 - n)!;
  return [k, s[k]];
};
/** [año, valor] del maximo (o del minimo) de la serie, desde el año `desde` si se da */
export const maximo = (s: Serie, desde?: string): [string, number] => extremo(s, 1, desde);
export const minimo = (s: Serie, desde?: string): [string, number] => extremo(s, -1, desde);
function extremo(s: Serie, signo: 1 | -1, desde?: string): [string, number] {
  const ks = anios(s).filter((k) => desde == null || +k >= +desde);
  const k = ks.reduce((a, b) => (signo * s[b] > signo * s[a] ? b : a));
  return [k, s[k]];
}

/** Enteros con punto de miles tambien en las de 4 cifras: 4.346 (fmt da 4346) */
export const mil = (v: number) => fmt(Math.round(v), 0).replace(/^(-?\d)(\d{3})$/, '$1.$2');
/** Redondeo a decenas de miles, para cuentas orientativas: 483.000 → 480.000 */
export const decenasDeMil = (v: number) => mil(Math.round(v / 1e4) * 1e4);
/** Variacion en %: (b / a − 1) × 100 */
export const variacion = (a: number, b: number) => (b / a - 1) * 100;
/** «casi un 10 %» si el redondeo sube, «un 11 %» si no */
export const unPct = (v: number) => `${Math.round(v) > v ? 'casi ' : ''}un ${fmt(Math.round(v), 0)} %`;
/**
  Cuantas veces es una cifra otra (r = grande / pequeña), en palabras:
  «casi el doble», «casi el triple», «unas 5 veces más», «casi 9 veces menos»
*/
export function veces(r: number, cmp: 'más' | 'menos') {
  const n = Math.round(r), casi = n > r ? 'casi ' : '';
  if (n <= 1) return 'más o menos lo mismo';
  if (cmp === 'más' && n === 2) return casi + 'el doble';
  if (cmp === 'más' && n === 3) return casi + 'el triple';
  return `${casi || 'unas '}${n} veces ${cmp}`;
}
/** Una parte de un todo en palabras: «algo más de un tercio», «menos de una quinta parte» */
export function parte(r: number) {
  const partes: [number, string][] = [[1 / 2, 'la mitad'], [1 / 3, 'un tercio'], [1 / 4, 'una cuarta parte'], [1 / 5, 'una quinta parte'], [1 / 10, 'una décima parte']];
  // La fraccion mas cercana; «algo más de» o «menos de» segun el lado
  const [f, lab] = partes.reduce((a, b) => (Math.abs(b[0] - r) < Math.abs(a[0] - r) ? b : a));
  if (Math.abs(r - f) / f < 0.03) return lab;
  return r > f ? `algo más de ${lab}` : `menos de ${lab}`;
}
/** «3 de cada 4», «2 de cada 3»… la fraccion sencilla mas cercana */
export function deCada(r: number) {
  const fr: [number, number][] = [[1, 2], [2, 3], [3, 4], [4, 5], [9, 10], [1, 3], [1, 4], [1, 5], [1, 10]];
  const [a, b] = fr.reduce((x, y) => (Math.abs(y[0] / y[1] - r) < Math.abs(x[0] / x[1] - r) ? y : x));
  return `${a} de cada ${b}`;
}

/* ---- Series que se usan en varias graficas y preguntas ---- */

/** Fecha del dato de hogares «hoy» en años con decimales: «1 de julio de 2026» → 2026,5 */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function fechaHoy() {
  const m = HAY_CASAS.hoy.fecha.match(/(\d+) de (\w+) de (\d{4})/);
  if (!m) return {anio: HAY_CASAS.hoy.fecha.slice(-4), x: +HAY_CASAS.hoy.fecha.slice(-4)};
  return {anio: m[3], x: +m[3] + (MESES.indexOf(m[2]) + (+m[1] - 1) / 30) / 12, julio: m[1] === '1' && m[2] === 'julio'};
}

/** Hogares nuevos desde el censo de 2021 (1 de enero) hasta el dato de hoy, y al año */
export function hogaresNuevos() {
  const C = HAY_CASAS.censo2021, H = HAY_CASAS.hoy;
  const total = H.hogares - C.hogares;
  return {total, alAnio: total / (fechaHoy().x - 2021)};
}

/** Hogares de alquiler en el censo de 2021 (hogares × % de alquiler del censo) */
export const alquilerCenso2021 = () => (HAY_CASAS.censo2021.hogares * TENENCIA.censoAlquiler['2021']) / 100;

/**
  Alquiler: indice del INE con los contratos (IPVA) frente al IPC de alquiler,
  de 2015 al ultimo año que tienen los dos.
*/
export function alquilerDosIndices() {
  const comun = Math.min(+ultimo(VIV.idxAlq)[0], +ultimo(VIV.idxAlqIpc)[0]);
  return {anio: String(comun), ipva: VIV.idxAlq[comun] - 100, ipc: VIV.idxAlqIpc[comun] - 100};
}

/** Alquiler medio del Ministerio (SERPAVI): primer y ultimo año publicado */
export function serpavi() {
  const [a0, v0] = primero(VIV.serpavi), [a, v] = ultimo(VIV.serpavi);
  return {a0, v0, a, v, subida: variacion(v0, v)};
}

/** Precio de compra del m² (valor tasado, €/m²) */
export const PRECIO: Serie = ANNUAL.precio;
/** Parque de viviendas, millones a final de año */
export const PARQUE: Serie = SPARSE.viv;

/*
  Datos que no estan en los JSON y que solo valen para un año concreto. Se
  enseñan solo mientras ese año sea el ultimo de su serie; cuando llegue un
  dato nuevo dejan de salir en vez de quedarse viejos. Revisar al actualizar.
*/
/** El ultimo año del precio de compra es media de los trimestres publicados */
export const PRECIO_PARCIAL = {anio: '2026', meses: 'hasta junio', periodo: 'primer semestre'};
/** SERPAVI: alquiler medio por piso en euros (de la publicacion, no del JSON) */
export const SERPAVI_PISO = {anio: '2023', euros: 590, edicion: 'edición de octubre de 2025'};
/** Desahucios del año en curso (CGPJ, avance), aun no en la serie anual */
export const DESAHUCIOS_AVANCE = {anio: '2026', periodo: 'el primer semestre', n: 8485};
