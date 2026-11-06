import {LEGS} from '../../datos';
import {esProxima, GOVKEY, type EleccionPartido, type Partido} from './datos';

/** Papel del partido tras una eleccion: Gobierno, apoyo, oposicion... (proleOf) */
export function proleOf(P: Partido, e: EleccionPartido): {t: string; cls: string} {
  if (esProxima(e.e)) return {t: 'Se presenta · aún sin resultado', cls: 'info'};
  if (e.e === 'sin_generales') return {t: 'Sin elecciones generales', cls: 'wip'};
  if (!e.seats) return {t: 'Sin escaños', cls: 'wip'};
  const l = LEGS.find((x) => x.id === e.e);
  if (!l) return {t: 'Con escaños', cls: 'neutral'};
  if (l.failed) return {t: 'Oposición · sin Gobierno', cls: 'neutral'};
  const gk = GOVKEY[P.key] || [];
  if (l.split && P.key === 'PSOE') return {t: 'Gobierno desde 2018', cls: 'ok'};
  if (gk.some((k) => l.mandato.includes(k))) return {t: l.split ? 'Gobierno hasta 2018' : 'Gobierno', cls: 'ok'};
  if (l.apoyos && [P.key, P.n].some((x) => l.apoyos.includes(x))) return {t: 'Apoyó al Gobierno', cls: 'half'};
  return {t: 'Oposición', cls: 'neutral'};
}
