import {Fragment} from 'react';
import {T} from '../../../comun/Glosario';
import Anillo from '../../componentes/Anillo';
import Info from '../../componentes/Info';
import {L} from '../../componentes/enlace';
import {DECRETOS, LEGS, METRICS, PARTY, SNAP, type Indicador, type Legislatura} from '../../datos';
import {useEstado} from '../../estado';
import {GLANCE} from '../../lib/config';
import {TERMINO_INDICADOR} from './terminos';
import {dAbs, fmt, rateColor, rateOf, sgn, yr} from '../../lib/formato';

/* Tabla "De un vistazo": una fila por legislatura (renderGlance en el original). */

function CeldaFlecha({m, a, b}: {m: Indicador; a: number | null | undefined; b: number | null | undefined}) {
  if (a == null || b == null)
    return (
      <td>
        <span className="note" style={{margin: 0}}>sin dato</span>
      </td>
    );
  // Años (de sueldo o de edad) con un decimal: si el cambio no llega a 0,05, «Igual» en vez de «+0,0 años Peor»
  const d = b - a, up = d > 0, flat = Math.abs(d) < (m.kind === 'anios' ? 0.05 : 1e-9);
  let col = 'var(--wip)', word = flat ? 'Igual' : up ? 'Sube' : 'Baja';
  if (m.dir && !flat) {
    const good = (m.dir === 'up') === up;
    col = good ? 'var(--ok)' : 'var(--ko)';
    word = good ? 'Mejor' : 'Peor';
  }
  return (
    <td>
      <span className="arr" style={{color: col}} title={`${m.t}: ${word}`}>
        <b aria-hidden="true">{flat ? '=' : up ? '▲' : '▼'}</b>
        <span className="num">{flat ? '' : sgn(d) + dAbs(m, d)}</span>
      </span>
      <span className="w" style={{color: col}}>{word}</span>
    </td>
  );
}

/* Subida de precios: % entre el IPC del mes de una eleccion y el de la siguiente, en gris (sin juicio) */
function CeldaPrecios({a, b, de, a2}: {a: number | null | undefined; b: number | null | undefined; de: string; a2: string}) {
  if (a == null || b == null)
    return (
      <td>
        <span className="note" style={{margin: 0}}>sin dato</span>
      </td>
    );
  const g = (b / a - 1) * 100;
  return (
    <td>
      <span className="arr" style={{color: 'var(--wip)'}} title={`Los precios subieron un ${fmt(g, 1)} % (IPC de ${de} a ${a2})`}>
        <b aria-hidden="true">{g > 0 ? '▲' : g < 0 ? '▼' : '='}</b>
        <span className="num">
          {sgn(g)}
          {fmt(Math.abs(g), Math.abs(g) >= 10 ? 0 : 1)} %
        </span>
      </span>
    </td>
  );
}

/* Decretos-ley: un punto por cada uno (20 por fila), el total y cuantos salen por año */
const DPR = 20, DPASO = 5, DR = 1.6;
const PRES: Record<string, string> = {PP: 'Rajoy', PSOE: 'Sánchez'};
function CeldaDecretos({l}: {l: Legislatura}) {
  const e = DECRETOS.porLegislatura[l.id];
  if (!e)
    return (
      <td>
        <span className="note" style={{margin: 0}}>sin dato</span>
      </td>
    );
  const anios = (new Date(e.hasta).getTime() - new Date(e.desde).getTime()) / 31557600000;
  const porAnio = e.n / anios, filas = Math.ceil(e.n / DPR);
  const rango = e.n ? ` (del ${e.primero} al ${e.ultimo})` : '';
  const hasta = l.current ? `, hasta el ${e.hasta.split('-').map(Number).reverse().join('-')}` : '';
  return (
    <td className="rdl" title={`${e.n} decretos-ley${rango}${hasta}: ${fmt(porAnio, 1)} al año`}>
      {e.n > 0 && (
        <svg width={DPR * DPASO} height={filas * DPASO} viewBox={`0 0 ${DPR * DPASO} ${filas * DPASO}`} aria-hidden="true">
          {Array.from({length: e.n}, (_, i) => (
            <circle key={i} cx={(i % DPR) * DPASO + DPASO / 2} cy={Math.floor(i / DPR) * DPASO + DPASO / 2} r={DR} />
          ))}
        </svg>
      )}
      <span className="rdl-n">
        <b>{e.n}</b> · {fmt(porAnio, 1)} al año
      </span>
      {e.tramos && <span className="rdl-t">{e.tramos.map((t) => `${PRES[t.p] ?? t.p} ${t.n}`).join(' · ')}</span>}
    </td>
  );
}

const indicador = (k: string) => METRICS.find((m) => m.k === k)!;

// Cifras del texto de la (i), sacadas de los datos (sin la legislatura en curso ni las de menos de un año para el minimo y el maximo)
const RDL_RITMO = LEGS.map((l) => {
  const e = DECRETOS.porLegislatura[l.id];
  return {l, r: e ? e.n / ((new Date(e.hasta).getTime() - new Date(e.desde).getTime()) / 31557600000) : 0, n: e?.n ?? 0};
});
const RDL_TOTAL = RDL_RITMO.reduce((t, x) => t + x.n, 0);
const RDL_COMPLETAS = RDL_RITMO.filter((x) => !x.l.failed && !x.l.current);
const RDL_MIN = RDL_COMPLETAS.reduce((a, b) => (b.r < a.r ? b : a));
const RDL_MAX = RDL_COMPLETAS.reduce((a, b) => (b.r > a.r ? b : a));
const RDL_ANIO = Object.entries(DECRETOS.porAnio).reduce((a, b) => (b[1] > a[1] ? b : a));
const Etiqueta = ({p}: {p: string}) => (
  <span className="mini" style={{background: PARTY[p].c}}>{PARTY[p].n}</span>
);

export default function Vistazo() {
  const {current, select} = useEstado();
  return (
    <section style={{borderTop: 0, paddingTop: 8}}>
      <h2>
        De un vistazo{' '}
        <Info>
          <p>
            Cada fila es una <T k="legislatura">legislatura</T>. El círculo dice qué parte de lo prometido se consiguió. Las flechas dicen cómo cambió cada indicador entre una
            elección y la siguiente: <span style={{color: 'var(--ok)', fontWeight: 600}}>verde si mejoró</span>,{' '}
            <span style={{color: 'var(--ko)', fontWeight: 600}}>rojo si empeoró</span>, gris si solo subió o bajó. La subida de precios va siempre en gris: que suban
            no es bueno ni malo por sí solo (depende, por ejemplo, de cuánto suban los sueldos). Pulsa una fila para ver el detalle.
          </p>
          <p>
            <b>Decretos-ley.</b> Cada punto es un <T k="real-decreto-ley">real decreto-ley</T> publicado en el BOE en esa legislatura; debajo, cuántos son y cuántos salen por año, para
            comparar legislaturas cortas y largas. Es una norma con la misma fuerza que una ley, pero la aprueba el Gobierno solo, sin pasar antes por el Congreso.
            La Constitución (artículo 86) lo permite en casos de «extraordinaria y urgente necesidad». Vale desde que se publica, y el Congreso tiene 30 días
            para aceptarlo o tumbarlo entero, sin poder cambiarlo (si quiere cambiarlo, tiene que tramitarlo después como ley).
          </p>
          <p>
            Se discute su uso porque es un atajo: el Gobierno legisla sin el debate ni las enmiendas de una ley normal, a veces la urgencia es dudosa (el Tribunal Constitucional ha anulado alguno por no justificarla, como el 5/2002 sobre el paro) y a veces se juntan
            en un mismo decreto temas que no tienen nada que ver (los llamados decretos «ómnibus»). Desde las elecciones de {yr(LEGS[0].a)} se han publicado {fmt(RDL_TOTAL, 0)}: de{' '}
            {fmt(RDL_MIN.r, 1)} al año en la {RDL_MIN.l.num} legislatura a {fmt(RDL_MAX.r, 1)} al año en la {RDL_MAX.l.num} ({yr(RDL_MAX.l.a)}–{yr(RDL_MAX.l.b)}). El año
            con más fue {RDL_ANIO[0]}, con {RDL_ANIO[1]}. También un Gobierno <T k="en-funciones">en funciones</T> puede aprobarlos: se cuentan en la legislatura en que se
            publicaron.
          </p>
          <p className="srcl">
            Fuentes: {L('BOE, buscador de legislación (rango «Real Decreto-ley»)', DECRETOS.fuente.url)}, consultado el{' '}
            {DECRETOS.fuente.consulta.split('-').map(Number).reverse().join('-')}; {L('INE, IPC (tabla 24077 y 76134)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=76134')};{' '}
            {L('Banco de España, indicadores de vivienda (si_1_5)', 'https://www.bde.es/webbe/es/estadisticas/compartido/datos/csv/si_1_5.csv')};{' '}
            {L('Eurostat, edad de emancipación (yth_demo_030)', 'https://ec.europa.eu/eurostat/databrowser/view/yth_demo_030/default/table')}.
          </p>
        </Info>
      </h2>
      {/* Scroll propio: la cabecera y las dos primeras columnas se quedan fijas */}
      <div className="tbl-wrap fija">
        <table className="glance" id="glance">
          <thead>
            <tr>
              <th>Legislatura</th>
              <th>Gobierno</th>
              <th>
                <T k="promesas-cumplidas">Promesas cumplidas</T>
              </th>
              {GLANCE.map((k) =>
                k === 'rdl' ? (
                  <th key={k}>
                    <T k="real-decreto-ley">Decretos-ley</T>
                  </th>
                ) : (
                  <th key={k}>{TERMINO_INDICADOR[k] ? <T k={TERMINO_INDICADOR[k]}>{indicador(k).t}</T> : indicador(k).t}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {LEGS.map((l) => {
              const S = SNAP[l.s], E = SNAP[l.e], r = l.failed ? null : rateOf(l.prom);
              const gov = l.failed ? (
                <>
                  <Etiqueta p={l.gov} /> <span className="note" style={{margin: 0}}><T k="en-funciones">en funciones</T> · sin <T k="investidura">investidura</T></span>
                </>
              ) : (
                (l.split ? [['PP'], ['PSOE']] : [l.mandato]).map((g, i) => (
                  <Fragment key={i}>
                    {i ? ' → ' : ''}
                    {g.map((p, j) => (
                      <Fragment key={p}>
                        {j ? ' + ' : ''}
                        <Etiqueta p={p} />
                      </Fragment>
                    ))}
                  </Fragment>
                ))
              );
              return (
                <tr
                  key={l.id}
                  data-id={l.id}
                  className={l.id === current ? 'sel' : ''}
                  tabIndex={0}
                  onClick={() => select(l.id, true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      select(l.id, true);
                    }
                  }}
                >
                  {/* Numero romano arriba y años debajo, sin partir (la tabla hace scroll si no cabe) */}
                  <td className="leg-celda">
                    <strong>{l.num}</strong>
                    <span className="num" style={{color: 'var(--muted)', display: 'block', whiteSpace: 'nowrap'}}>
                      {/* La legislatura en curso lleva el año entero (llega hasta hoy) */}
                      {yr(l.a)}–{l.current ? yr(l.b) : String(yr(l.b)).slice(2)}
                    </span>
                  </td>
                  <td>{gov}</td>
                  <td>
                    <div className="rate">
                      <Anillo r={r} size={38} />
                      <div className="rbar">
                        <span style={{width: `${r ?? 0}%`, background: r == null ? 'transparent' : rateColor(r)}} />
                      </div>
                    </div>
                  </td>
                  {GLANCE.map((k) =>
                    k === 'rdl' ? (
                      <CeldaDecretos key={k} l={l} />
                    ) : k === 'ipc' ? (
                      <CeldaPrecios key={k} a={S[k]} b={E[k]} de={S.lab} a2={l.current ? 'hoy (último dato)' : E.lab} />
                    ) : (
                      <CeldaFlecha key={k} m={indicador(k)} a={S[k]} b={E[k]} />
                    ),
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
