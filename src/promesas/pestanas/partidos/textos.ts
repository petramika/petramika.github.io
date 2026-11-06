import {fmt} from '../../lib/formato';
import {CIS_CUANDO, esProxima, PEL, type EleccionPartido} from './datos';

const MESES: Record<string, string> = {
  ene: 'enero', feb: 'febrero', mar: 'marzo', abr: 'abril', may: 'mayo', jun: 'junio',
  jul: 'julio', ago: 'agosto', sep: 'septiembre', oct: 'octubre', nov: 'noviembre', dic: 'diciembre',
};
/** "29 nov 2026" → "29 de noviembre de 2026" */
const fechaLarga = (f: string) => {
  const [d, m, a] = f.split(' ');
  return `${d} de ${MESES[m] ?? m} de ${a}`;
};

/** Titulo de una eleccion: "XV Legislatura · elecciones de jul 2023", la proxima o "Fuera de las elecciones generales" */
export function tituloEleccion(id: string) {
  const pe = PEL.find((x) => x[0] === id);
  return id === 'sin_generales' ? 'Fuera de las elecciones generales'
    : esProxima(id) && pe ? `Elecciones del ${fechaLarga(pe[2])}`
    : `${pe ? pe[1] + ' Legislatura · ' : ''}elecciones de ${pe ? pe[2] : id}`;
}

/** Escaños y voto (o el CIS en la proxima eleccion); vacio si no aplica */
export function escanosTxt(e: EleccionPartido) {
  return esProxima(e.e)
    ? e.cis != null ? `CIS ${CIS_CUANDO.corto}: ${fmt(e.cis, 1)} %` : ''
    : e.e === 'sin_generales' ? ''
    : `${e.seats ?? 0} escaños${e.vote != null ? ' · ' + fmt(e.vote, 1) + ' %' : ''}`;
}
