/*
  Funciones puras que comparten varias pestañas: numeros, fechas, partidos y
  porcentajes de cumplimiento. Copiadas del codigo original sin cambiar su
  logica.
*/
import {GOVS, PARTY, type Indicador, type Legislatura} from '../datos';

const nf: Record<number, Intl.NumberFormat> = {};
/** Numero en español. useGrouping 'always': es-ES no pone punto en los de 4 cifras («4346»); aqui siempre («4.346»). No usar para años. */
export function fmt(v: number, d: number) {
  (nf[d] ||= new Intl.NumberFormat('es-ES', {minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always'} as unknown as Intl.NumberFormatOptions));
  return nf[d].format(v);
}

export const sgn = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '±');

/** Valor de un indicador escrito con sus unidades: "12,3 %", "1.134 €"... */
export function formatoIndicador(m: Indicador, v: number) {
  const dec = m.decDesde1000 != null && v >= 1000 ? m.decDesde1000 : m.dec;
  return fmt(v, dec) + m.suf;
}
export const fv = (m: Indicador, v: number | null | undefined) => (v == null ? '—' : formatoIndicador(m, v));

/** Diferencia en valor absoluto con sus unidades: "2,1 puntos", "35 €"... */
export const dAbs = (m: Indicador, d: number) =>
  m.kind === 'pp' ? fmt(Math.abs(d), 1) + ' puntos'
  : m.kind === 'eur' ? fmt(Math.abs(d), 0) + ' €'
  : m.kind === 'bn' ? fmt(Math.abs(d), 1) + ' mil M€'
  : m.kind === 'eurm2' ? fmt(Math.abs(d), 0) + ' €/m²'
  : m.kind === 'anios' ? fmt(Math.abs(d), 1) + ' años'
  : fmt(Math.abs(d), 1) + ' M';

/** Fecha a año con decimales: 1 de julio de 2000 → 2000,5 */
export const toYear = (d: string) => {
  const t = new Date(d);
  return t.getFullYear() + (t.getTime() - new Date(t.getFullYear(), 0, 1).getTime()) / 31557600000;
};
export const yr = (d: string) => new Date(d).getFullYear();

export const mandatoTxt = (l: Legislatura) => l.mandato.map((p) => PARTY[p].n).join(' + ');
export const mandatoShort = (l: Legislatura) =>
  l.split ? 'PP → PSOE' : l.mandato.map((p) => (p === 'UP' ? 'UP' : PARTY[p].n)).join(' + ');

/** Partido que presidia el Gobierno en un año (con decimales) */
export const govAt = (y: number) => {
  const g = GOVS.find((g) => y >= toYear(g.a) && y < toYear(g.b));
  return g ? PARTY[g.p].n : '';
};

// Cumplidas cuentan 1, a medias 0,5; presentadas sin aprobar e incumplidas 0; en curso no cuentan.
export function rateOf(list: [string, ...unknown[]][]) {
  const c: Record<string, number> = {};
  list.forEach((p) => (c[p[0]] = (c[p[0]] || 0) + 1));
  const d = (c.c || 0) + (c.p || 0) + (c.n || 0) + (c.i || 0);
  return d ? ((c.c || 0) + (c.p || 0) * 0.5) / d * 100 : null;
}
export const rateColor = (r: number) => (r >= 66 ? 'var(--ok)' : r >= 40 ? 'var(--half-bar)' : 'var(--ko)');

/** Marcas "bonitas" para un eje: 0, 5, 10, 15... */
export function niceTicks(lo: number, hi: number, n = 4) {
  const s0 = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(s0));
  const st = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= s0)!;
  const t: number[] = [];
  for (let v = Math.floor(lo / st) * st; v <= Math.ceil(hi / st) * st + 1e-9; v += st) t.push(+v.toFixed(6));
  return t;
}

/** Nombre corto de la web de una fuente: "BOE", "INE", "elpais.com"... */
export function srcName(u: string, medio?: string) {
  if (medio) return medio;
  try {
    const h = new URL(u).hostname.replace(/^www\./, '');
    return ({'boe.es': 'BOE', 'ine.es': 'INE', 'congreso.es': 'Congreso', 'lamoncloa.gob.es': 'La Moncloa', 'jse.org': 'Programa (PDF)',
      'pp.es': 'PP (PDF)', 'bde.es': 'Banco de España', 'seg-social.es': 'Seguridad Social'} as Record<string, string>)[h] || h;
  } catch {
    return 'fuente';
  }
}

