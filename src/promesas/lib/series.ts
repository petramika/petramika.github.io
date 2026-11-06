/*
  Series temporales de los indicadores y las escalas de las graficas grandes.
  Copiado del codigo original sin cambiar la logica.
*/
import {ANNUAL, SNAP, SNAP_X, SPARSE, STEPS, type Indicador} from '../datos';
import {CH, INK} from './config';
import {niceTicks} from './formato';

export type Punto = {x: number; v: number; lab: string; key?: string};
export type Serie = {k: string; c: string; lab?: string; dash?: boolean; pts: Punto[]};

export function seriesOf(k: string, src: string, approxBefore?: number): Punto[] {
  if (src === 'step') {
    const s = STEPS[k];
    return [...s.map(([x, v, lab]) => ({x, v, lab: 'desde ' + lab})), {x: 2026.8, v: s.at(-1)![1], lab: 'hoy'}];
  }
  if (src === 'annual') return Object.entries(ANNUAL[k]).map(([y, v]) => ({x: +y + 0.5, v, lab: (approxBefore && +y < approxBefore ? '≈ ' : '') + y}));
  if (src === 'sparse') return Object.entries(SPARSE[k]).map(([y, v]) => ({x: +y + 0.5, v, lab: y}));
  return Object.entries(SNAP)
    .filter(([, s]) => s[k] != null)
    .map(([key, s]) => ({x: SNAP_X[key], v: s[k], lab: s.lab, key}))
    .sort((a, b) => a.x - b.x);
}
export const series = (m: Indicador) => seriesOf(m.k, m.src, m.approxBefore);
export const allSeries = (m: Indicador): Serie[] =>
  (m.multi || [{k: m.k, c: INK}]).map((sr) => ({...sr, pts: seriesOf(sr.k, m.src, m.approxBefore)}));

export function scales(vs: number[], m: Indicador) {
  const lo = Math.min(...vs);
  const tk = niceTicks(m.multi || m.k === 'esp' ? lo * 0.97 : lo * 0.95, Math.max(...vs) * 1.02), y0 = tk[0], y1 = tk.at(-1)!;
  return {
    tk,
    X: (x: number) => CH.L + (x - CH.x0) / (CH.x1 - CH.x0) * (CH.W - CH.L - CH.R),
    Y: (v: number) => CH.T + (1 - (v - y0) / (y1 - y0)) * (CH.H - CH.T - CH.B),
  };
}
