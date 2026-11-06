import FuenteDot from '../../componentes/FuenteDot';
import Icono from '../../componentes/Icono';
import {AREA_ICON} from '../../componentes/iconos';
import {STATUS} from '../../datos';
import {SORDER} from '../../lib/config';
import {srcName} from '../../lib/formato';

/*
  Bloques de promesas del detalle: recuento por estado (tally), resumen por
  area (areaSummary) y lista de promesas (promList).
  Una promesa es [estado, area, titulo, que es, resultado, meta?, fuente?].
*/
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Promesa = [string, string, string, string, string, any?, any?];

export function Recuento({list}: {list: Promesa[]}) {
  const c: Record<string, number> = {};
  list.forEach((p) => (c[p[0]] = (c[p[0]] || 0) + 1));
  return (
    <div className="pbar">
      {SORDER.filter((k) => c[k]).map((k) => (
        <span key={k} className={`chip ${STATUS[k].cls}`}>
          {STATUS[k].ic} {c[k]} · {STATUS[k].lab}
        </span>
      ))}
    </div>
  );
}

export function ResumenAreas({list, elegir}: {list: Promesa[]; elegir: (a: string) => void}) {
  const areas = [...new Set(list.map((p) => p[1]))].map((a) => ({a, l: list.filter((p) => p[1] === a)})).sort((x, y) => y.l.length - x.l.length);
  return (
    <div className="asum">
      {areas.map(({a, l}) => {
        const c = l.filter((p) => p[0] === 'c').length, sorted = [...l].sort((x, y) => SORDER.indexOf(x[0]) - SORDER.indexOf(y[0]));
        return (
          <button key={a} type="button" className="arow" data-cat={a} onClick={() => elegir(a)}>
            <span className="blab">
              <Icono k={AREA_ICON[a] || 'inst'} size={15} />
              {a}
            </span>
            <span className="bseg">
              {sorted.map((p, i) => (
                <i key={i} className="sq" style={{background: STATUS[p[0]].bar}} title={`${STATUS[p[0]].lab}: ${p[2]}`} />
              ))}
            </span>
            <span className="acount">
              {c} de {l.length} cumplida{l.length > 1 ? 's' : ''}
            </span>
            <span className="ago">Ver ›</span>
          </button>
        );
      })}
    </div>
  );
}

/** Promesas de un bloque, por area. titulos=false: sin el nombre del area encima (en el panel lateral ya va de titulo) */
export function ListaPromesas({list, filtro, titulos = true}: {list: Promesa[]; filtro: string; titulos?: boolean}) {
  const cats = [...new Set(list.map((p) => p[1]))].filter((c) => filtro === 'Todas' || c === filtro);
  if (!cats.length) return <p className="note">No hay promesas de esta área en este bloque.</p>;
  return (
    <>
      {cats.map((cat) => (
        <div key={cat} className="cat">
          {titulos && <h4>{cat}</h4>}
          {list
            .filter((p) => p[1] === cat)
            .map(([s, , t, what, res, meta, src], i) => {
              const S = STATUS[s];
              const goal = meta ? (
                <div className="goal">
                  <div className="goal-top">
                    <span>Prometido <strong>{meta.m}</strong></span>
                    <span>Logrado <strong>{meta.g}</strong></span>
                    {meta.pct != null && <strong className="num">{meta.pct} %</strong>}
                  </div>
                  {meta.pct != null && (
                    <div className="track">
                      <span style={{width: `${Math.max(meta.pct, 1)}%`, background: S.bar}} />
                    </div>
                  )}
                </div>
              ) : null;
              return (
                <div key={i} className="prom">
                  <span className="stripe" style={{background: S.bar}} />
                  <div>
                    <div className="top">
                      <h5>
                        {src ? <FuenteDot src={src} /> : null}
                        {t}
                      </h5>
                      <span className={`chip ${S.cls}`}>
                        {S.ic} {S.lab}
                      </span>
                    </div>
                    <dl>
                      <dt>Qué es</dt>
                      <dd>{what}</dd>
                      <dt>Resultado</dt>
                      <dd>
                        {res}
                        {src && src.rurl ? (
                          <>
                            {' '}
                            <a className="rsrc" href={src.rurl} target="_blank" rel="noopener">
                              {srcName(src.rurl, src.rmedio)} ↗
                            </a>
                          </>
                        ) : null}
                      </dd>
                    </dl>
                    {goal}
                  </div>
                </div>
              );
            })}
        </div>
      ))}
    </>
  );
}
