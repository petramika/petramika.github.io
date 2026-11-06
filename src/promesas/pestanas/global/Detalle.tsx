import {Fragment, useCallback, useState} from 'react';
import Anillo from '../../componentes/Anillo';
import Lateral from '../../componentes/Lateral';
import Pista from '../../componentes/Pista';
import {LEGS, PARTY, type Legislatura} from '../../datos';
import {useEstado} from '../../estado';
import {fmt, mandatoTxt, rateOf, yr} from '../../lib/formato';
import EnFunciones from './EnFunciones';
import Hemiciclo from './Hemiciclo';
import {conTerminos} from './terminos';
import {ListaPromesas, Recuento, ResumenAreas, type Promesa} from './Promesas';

/*
  Detalle de la legislatura elegida: gobierno, a la izquierda el Congreso
  (hemiciclo, escaños y % de voto) y a la derecha sus promesas por area. Las
  cifras de como cambio España ya estan en «De un vistazo» y en las graficas,
  asi que aqui no se repiten. Pulsar un area abre un panel lateral con cada
  promesa de esa area y que paso, con flechas para ir a la siguiente area.
*/
function Contenido({l, pista, quitarPista}: {l: Legislatura; pista: boolean; quitarPista: () => void}) {
  const [area, setAreaBase] = useState<string | null>(null);
  const setArea = (a: string | null) => {
    if (a) quitarPista();
    setAreaBase(a);
  };
  const cerrar = useCallback(() => setAreaBase(null), []);
  const all: Promesa[] = [...l.prom, ...(l.prom2 ? l.prom2.l : [])];
  // Areas en el orden del resumen: las que mas promesas tienen, primero
  const areas = [...new Set(all.map((p) => p[1]))].sort((a, b) => all.filter((p) => p[1] === b).length - all.filter((p) => p[1] === a).length);
  const pos = area ? areas.indexOf(area) : -1;

  const govTags = l.failed ? (
    <span className="tag">Sin Gobierno nuevo · {l.pres}</span>
  ) : (
    <>
      {l.mandato.map((p, i) => (
        <Fragment key={p}>
          {i ? <span aria-hidden="true">+</span> : null}
          <span className="tag gov" style={{background: PARTY[p].c}}>{PARTY[p].n}</span>
        </Fragment>
      ))}
      <span className="tag">{l.pres}</span>
      <span className="tag">{conTerminos(l.form)}</span>
      {l.apoyos ? <span className="tag">Apoyos: {l.apoyos}</span> : null}
      {l.ended ? <span className="tag" style={{borderColor: 'var(--sent)', color: 'var(--sent)'}}>{l.ended}</span> : null}
    </>
  );

  const r = rateOf(l.prom);
  const promBlock = l.prom.length ? (
    <>
      <div className="phead">
        <Anillo r={r} size={64} />
        <div>
          <h2>Promesas del Gobierno {mandatoTxt(l)}</h2>
          <p className="note" style={{margin: '2px 0 0'}}>
            {/* r puede ser null: Intl lo escribe como 0, igual que el original */}
            {fmt(r as number, 0)} % de lo prometido conseguido · {l.prom.length} promesas
          </p>
          {l.prog ? (
            <p className="note" style={{margin: '2px 0 0'}}>
              {l.prog.estado === 'disponible' && l.prog.url ? (
                <>
                  Programa:{' '}
                  <a href={l.prog.url} target="_blank" rel="noopener">
                    documento original ↗
                  </a>
                </>
              ) : (
                `Programa no disponible en línea${l.prog.nota ? ': ' + l.prog.nota : ''}`
              )}
            </p>
          ) : null}
        </div>
      </div>
      <Recuento list={l.prom} />
      {pista && (
        <div className="pista-areas">
          <Pista texto="pulsa un área" />
        </div>
      )}
      <ResumenAreas list={l.prom} elegir={setArea} />
    </>
  ) : l.enf ? (
    <EnFunciones l={l} />
  ) : null;

  const prom2 = l.prom2 ? (
    <div style={{marginTop: 26}}>
      <h3>{l.prom2.t}</h3>
      <Recuento list={l.prom2.l} />
      <ResumenAreas list={l.prom2.l} elegir={setArea} />
    </div>
  ) : null;

  return (
    <>
      <div className="dhead">
        <div>
          <div className="eyebrow">Elecciones del {new Date(l.a).toLocaleDateString('es-ES', {day: 'numeric', month: 'long', year: 'numeric'})}</div>
          <h2 style={{fontSize: 'clamp(24px,4vw,32px)'}}>
            {l.num} Legislatura · {yr(l.a)}–{yr(l.b)}
          </h2>
        </div>
      </div>
      <div className="mandato" style={{marginTop: 10}}>{govTags}</div>
      <div className="grid2">
        <div className="box hemi">
          <div className="eyebrow">Congreso · escaños y % de voto</div>
          <Hemiciclo l={l} />
          <table className="results">
            <thead>
              <tr>
                <th>Partido</th>
                <th>Escaños</th>
                <th>Voto</th>
              </tr>
            </thead>
            <tbody>
              {l.res.map(([p, s, v]) => (
                <tr key={p} className={!l.failed && l.mandato.includes(p) ? 'in' : ''}>
                  <td>
                    <i className="sw" style={{background: PARTY[p].c}} />
                    {PARTY[p].n}
                  </td>
                  <td>{s}</td>
                  <td>{v == null ? '—' : fmt(v, 1) + ' %'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dpromesas">
          {promBlock}
          {prom2}
        </div>
      </div>
      {area && (
        <Lateral antetitulo={`${l.num} Legislatura · ${mandatoTxt(l)}`} titulo={area} cerrar={cerrar}>
          {l.prom.some((p) => p[1] === area) && (
            <>
              {l.prom2 && <h3 className="lat-sec">Promesas del Gobierno {mandatoTxt(l)}</h3>}
              <ListaPromesas list={l.prom} filtro={area} titulos={false} />
            </>
          )}
          {l.prom2 && l.prom2.l.some((p: Promesa) => p[1] === area) && (
            <>
              <h3 className="lat-sec">{l.prom2.t}</h3>
              <ListaPromesas list={l.prom2.l} filtro={area} titulos={false} />
            </>
          )}
          <nav className="lat-nav" aria-label="Otras áreas">
            {pos > 0 ? (
              <button type="button" onClick={() => setArea(areas[pos - 1])}>
                ‹ {areas[pos - 1]}
              </button>
            ) : (
              <span />
            )}
            {pos < areas.length - 1 && (
              <button type="button" onClick={() => setArea(areas[pos + 1])}>
                {areas[pos + 1]} ›
              </button>
            )}
          </nav>
        </Lateral>
      )}
    </>
  );
}

export default function Detalle() {
  const {current} = useEstado();
  const l = LEGS.find((x) => x.id === current)!;
  // La pista «pulsa un área» sale al entrar en la pestaña y se va al primer clic
  const [pista, setPista] = useState(true);
  return (
    <section id="detail" aria-live="polite">
      {/* key: el panel de area se cierra al cambiar de legislatura */}
      <Contenido key={current} l={l} pista={pista} quitarPista={() => setPista(false)} />
    </section>
  );
}
