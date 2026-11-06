import {useState, type ReactNode} from 'react';
import Info from '../Info';

/*
  Barras horizontales agrupadas: una fila por categoria (sector, indicador…)
  y una barra por serie (españoles, extranjeros…). Para comparar grupos en
  un mismo momento, cuando no hay serie temporal.
*/
type Props = {
  id?: string;
  title: string;
  sub: string;
  series: {lab: string; c: string}[];
  filas: {lab: string; vals: (number | null)[]}[];
  f: (v: number) => string;
  note?: ReactNode;
  src?: ReactNode;
  /** Maximo del eje (si no, el mayor valor) */
  max?: number;
  /** Ocupa toda la fila de la rejilla */
  ancha?: boolean;
};

export default function Barras({id, title, sub, series, filas, f, note, src, max, ancha}: Props) {
  const [act, setAct] = useState<number | null>(null);
  const tope = max ?? Math.max(...filas.flatMap((r) => r.vals.filter((v): v is number => v != null)));
  return (
    <div id={id} className={`chart barras${ancha ? ' ancha' : ''}`}>
      <div className="chead">
        <h3>
          {title}{' '}
          {note && (
            <Info titulo={title}>
              {typeof note === 'string' ? <p>{note}</p> : note}
              {src && <p className="srcl">Fuente: {src}</p>}
            </Info>
          )}
        </h3>
      </div>
      <div className="sub">{sub}</div>
      {series.length > 1 && (
        <div className="mleg">
          {series.map((s, i) => (
            <span key={i} className={act == null ? undefined : act === i ? 'act' : 'off'} onPointerEnter={() => setAct(i)} onPointerLeave={() => setAct(null)}>
              <i className="sw" style={{background: s.c}} />
              {s.lab}
            </span>
          ))}
        </div>
      )}
      <div className="barras-filas">
        {filas.map((r) => (
          <div key={r.lab} className="barras-fila">
            <div className="barras-lab">{r.lab}</div>
            <div className="barras-grupo">
              {r.vals.map((v, i) =>
                v == null ? null : (
                  <div key={i} className={`barras-b${act != null && act !== i ? ' off' : ''}`} title={`${series[i].lab}: ${f(v)}`}>
                    <span style={{width: `${Math.max(0.5, (v / tope) * 100)}%`, background: series[i].c}} />
                    <b className="num">{f(v)}</b>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
