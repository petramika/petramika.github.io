import {useEffect, useRef, useState, type FocusEvent, type MouseEvent, type PointerEvent} from 'react';
import {COFOG, COFOG_CATS} from '../../datos';
import {fmt} from '../../lib/formato';
import {useTip} from '../../componentes/Tip';
import './cofog.css';

/*
  En que se gasta el dinero publico (renderCofog + cofogFocus del original):
  una barra por año partida por funciones. Al pasar el cursor, pulsar o
  enfocar un area, se resalta esa area en todos los años y la etiqueta
  (debajo del cursor) da sus cifras.
*/
type Unidad = 'pct' | 'eur';

export default function Cofog() {
  const [cofogUnit, setCofogUnit] = useState<Unidad>('pct');
  const [foco, setFoco] = useState<string | null>(null);
  const tip = useTip();
  const caja = useRef<HTMLDivElement>(null);
  const focoRef = useRef(foco);
  focoRef.current = foco;

  const years = Object.keys(COFOG), idx = cofogUnit === 'pct' ? 1 : 0, max = Math.max(...years.map((y) => COFOG[y].total[idx]));
  const f = (v: number) => (cofogUnit === 'pct' ? fmt(v, 1) + ' %' : fmt(v, 1) + ' mil M€');

  // Resaltar un area del gasto en todos los años y apagar el resto
  function cofogFocus(k: string | null, pos?: {x: number; y: number}, y?: string) {
    setFoco(k);
    if (!k) {
      tip.ocultar();
      return;
    }
    const cat = COFOG_CATS.find((c) => c[0] === k)!;
    const rows = (y ? [y] : Object.keys(COFOG)).map((yy) => {
      const r = COFOG[yy];
      return (
        <div key={yy} className={`trow${yy === y ? ' cur' : ''}`}>
          <span>{yy}</span>
          <b className="num">{fmt(r[k][1], 1)} % del PIB</b>
          <span className="num">{fmt(r[k][0], 1)} mil M€</span>
          <span className="num">{fmt((r[k][0] / r.total[0]) * 100, 0)} % del gasto</span>
        </div>
      );
    });
    if (pos)
      tip.mostrar(
        <>
          <div className="thead">
            <i className="sw" style={{background: cat[2]}} />
            {cat[1]}
          </div>
          {rows}
        </>,
        {...pos, lado: 'abajo'},
      );
  }

  const area = (t: EventTarget) => (t as Element).closest<HTMLElement>('[data-c]');

  const alMover = (e: PointerEvent) => {
    const el = area(e.target);
    if (el) cofogFocus(el.dataset.c!, {x: e.clientX, y: e.clientY}, el.dataset.y);
    else if (foco) cofogFocus(null);
  };
  const alPulsar = (e: MouseEvent) => {
    const el = area(e.target);
    if (el) cofogFocus(el.dataset.c!, {x: e.clientX, y: e.clientY}, el.dataset.y);
  };
  // Con teclado la etiqueta va bajo la esquina del elemento enfocado
  const alEnfocar = (e: FocusEvent) => {
    const el = area(e.target);
    if (el) {
      const r = el.getBoundingClientRect();
      cofogFocus(el.dataset.c!, {x: r.left, y: r.top});
    }
  };

  // Pulsar fuera del grafico (en movil no hay pointermove) apaga el resaltado
  useEffect(() => {
    if (!foco) return;
    const fuera = (e: globalThis.MouseEvent) => {
      const t = e.target as Element;
      if (!(caja.current?.contains(t) && t.closest('[data-c]'))) cofogFocus(null);
    };
    document.addEventListener('click', fuera);
    return () => document.removeEventListener('click', fuera);
  });

  // Al cambiar de pestaña no debe quedar la etiqueta flotando
  useEffect(() => () => void (focoRef.current && tip.ocultar()), [tip]);

  const on = (k: string) => (k === foco ? 'on' : undefined);

  return (
    <>
      <div className="seg" id="cofog-unit" role="group" aria-label="Unidad">
        <button type="button" data-unit="pct" aria-pressed={cofogUnit === 'pct'} onClick={() => setCofogUnit('pct')}>
          % del PIB
        </button>
        <button type="button" data-unit="eur" aria-pressed={cofogUnit === 'eur'} onClick={() => setCofogUnit('eur')}>
          Miles de millones de €
        </button>
      </div>
      <div
        id="cofog"
        ref={caja}
        className={foco ? 'focus' : undefined}
        onPointerMove={alMover}
        onPointerLeave={() => foco && cofogFocus(null)}
        onClick={alPulsar}
        onFocus={alEnfocar}
        onBlur={() => cofogFocus(null)}
      >
        <div className="statlegend cleg">
          {COFOG_CATS.map(([k, lab, c]) => (
            <span key={k} data-c={k} tabIndex={0} className={on(k)}>
              <i className="sw" style={{background: c}} />
              {lab}
            </span>
          ))}
        </div>
        <div className="hbars">
          {years.map((y) => {
            const r = COFOG[y];
            return (
              <div key={y} className="hrow">
                <span className="num">{y}</span>
                <div style={{width: `${((r.total[idx] / max) * 100).toFixed(1)}%`}}>
                  <div className="stack" style={{height: '22px'}}>
                    {COFOG_CATS.map(([k, , c]) => (
                      <span key={k} data-c={k} data-y={y} className={on(k)} style={{flex: r[k][idx], background: c}} />
                    ))}
                  </div>
                </div>
                <span className="num hnum">{f(r.total[idx])}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
