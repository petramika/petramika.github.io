import {useCallback, useLayoutEffect, useRef, useState, type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import Lateral from '../../componentes/Lateral';
import {EVENTS, GOVS, PARTY, type Legislatura} from '../../datos';
import {toYear} from '../../lib/formato';

/*
  Linea temporal de acontecimientos (renderEvents en el original). Con una
  legislatura, marca su periodo y resalta lo que paso en el. Pulsar cualquier
  acontecimiento abre su ficha en el panel lateral sin cambiar la legislatura.
  Quien la usa le pone key por legislatura: asi vuelve a empezar (primer
  acontecimiento del periodo elegido y scroll centrado) al cambiarla.
*/
const g = (x: number) => GOVS.find((v) => x >= toYear(v.a) && x < toYear(v.b)) || GOVS[0];
const ev: [number, string, string, string][] = [...EVENTS].sort((a, b) => a[0] - b[0]);
// La linea llega hasta 2027 o, si hay acontecimientos o Gobierno posteriores, un poco mas alla del ultimo
const x0 = 1985.5, x1 = Math.max(2027, ev.at(-1)![0] + 0.5, toYear(GOVS[GOVS.length - 1].b) + 0.16);
const pos = (x: number) => ((x - x0) / (x1 - x0)) * 100;
// Años marcados: 1986 y luego cada 5 (1990, 1995…) mientras quepan
const TICKS = [1986];
for (let y = 1990; y <= x1 - 0.5; y += 5) TICKS.push(y);
const ROWS = [{top: 30, up: true}, {top: 96, up: false}, {top: 4, up: true}, {top: 122, up: false}];

export default function Acontecimientos({leg}: {leg: Legislatura | null}) {
  const la = leg ? toYear(leg.a) : -1e9, lb = leg ? toYear(leg.b) : 1e9, inP = (x: number) => x >= la && x < lb;
  const firstIn = ev.findIndex((e) => inP(e[0]));
  const [sel, setSel] = useState(firstIn);
  const [ficha, setFicha] = useState<number | null>(null);
  const cerrar = useCallback(() => setFicha(null), []);
  const wrapRef = useRef<HTMLDivElement>(null), htlRef = useRef<HTMLDivElement>(null);

  // Centrar el periodo en la linea si no cabe: la posicion del scroll solo se puede fijar en el DOM
  useLayoutEffect(() => {
    const wrap = wrapRef.current, htl = htlRef.current;
    if (leg && wrap && htl && htl.scrollWidth > wrap.clientWidth) {
      const mid = ((pos(la) + pos(Math.min(lb, x1))) / 200) * htl.scrollWidth;
      wrap.scrollLeft = Math.max(0, mid - wrap.clientWidth / 2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const last = ROWS.map(() => -99);
  const items = ev.map(([x, lab], i) => {
    const P = pos(x);
    let r = ROWS.findIndex((_, k) => P - last[k] > 9);
    if (r < 0) r = ROWS.findIndex((_, k) => last[k] === Math.min(...last));
    last[r] = P;
    const R = ROWS[r], stem = R.up ? 72 - (R.top + 18) : R.top - 74, on = inP(x);
    const mostrar = () => setSel(i);
    const abrir = () => {
      if (on) setSel(i);
      setFicha(i);
    };
    return (
      <button
        key={i}
        type="button"
        className={`hev${on ? '' : ' off'}${sel === i ? ' on' : ''}`}
        data-i={i}
        aria-haspopup="dialog"
        onClick={abrir}
        {...(on ? {onMouseEnter: mostrar, onFocus: mostrar} : {})}
        style={{left: `${P.toFixed(2)}%`, top: `${R.top}px`, '--stem': `${stem}px`} as CSSProperties}
      >
        <span className={`hlab ${R.up ? 'up' : 'dn'}`}>{lab}</span>
      </button>
    );
  });

  let det;
  if (sel >= 0) {
    const [x, lab, d, t] = ev[sel], gv = g(x);
    det = (
      <>
        <b>{lab}</b>{' '}
        <span className="num" style={{color: 'var(--muted)'}}>
          · {d} · Gobierno {PARTY[gv.p].n}
        </span>
        <br />
        {t}
      </>
    );
  } else det = 'En esta legislatura no hay ninguno de los grandes acontecimientos de la lista.';

  return (
    <>
      <div className="htl-wrap" ref={wrapRef}>
        <div className="htl" ref={htlRef}>
          {leg && (
            <i className="hper" style={{left: `${pos(la).toFixed(2)}%`, width: `${(pos(Math.min(lb, x1)) - pos(la)).toFixed(2)}%`}}>
              <span>{leg.num} Legislatura</span>
            </i>
          )}
          {GOVS.map((v, i) => (
            <i
              key={i}
              className="hband"
              style={{
                left: `${pos(toYear(v.a)).toFixed(2)}%`,
                width: `${(pos(Math.min(toYear(v.b), x1)) - pos(toYear(v.a))).toFixed(2)}%`,
                background: PARTY[v.p].c,
              }}
            />
          ))}
          <i className="haxis" />
          {TICKS.map((y) => (
            <span key={y} className="htick" style={{left: `${pos(y).toFixed(2)}%`}}>{y}</span>
          ))}
          {ev.map(([x], i) => (
            <i
              key={i}
              className={`hdot${inP(x) ? '' : ' off'}${sel === i ? ' on' : ''}`}
              data-i={i}
              style={{left: `${pos(x).toFixed(2)}%`, background: PARTY[g(x).p].c}}
            />
          ))}
          {items}
        </div>
      </div>
      <p className="htl-det">{det}</p>
      {ficha != null &&
        createPortal(
          <Lateral
            antetitulo={`${ev[ficha][2]} · Gobierno ${PARTY[g(ev[ficha][0]).p].n}`}
            titulo={ev[ficha][1]}
            color={PARTY[g(ev[ficha][0]).p].c}
            cerrar={cerrar}
          >
            <div className="lat-info">
              <p>{ev[ficha][3]}</p>
            </div>
          </Lateral>,
          document.body,
        )}
    </>
  );
}
