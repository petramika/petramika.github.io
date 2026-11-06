import {useEffect, useState, type ChangeEvent, type CSSProperties, type PointerEvent, type MouseEvent} from 'react';
import {T} from '../../../comun/Glosario';
import Icono from '../../componentes/Icono';
import {AREA_ICON} from '../../componentes/iconos';
import Info from '../../componentes/Info';
import {useTip} from '../../componentes/Tip';
import {LEGS, PARTY, STATUS, type Legislatura} from '../../datos';
import {SORDER} from '../../lib/config';
import {fmt, mandatoTxt, yr} from '../../lib/formato';
import type {Promesa} from './Promesas';

/*
  Balance: dos paneles enfrentados (PSOE y PP), una fila por area y un
  bloque por promesa; al pasar el raton se ve cual fue (renderBalance y
  balTip en el original).
*/
type Item = {p: Promesa; gov: string; l: Legislatura; sub?: boolean};

function allPromises() {
  const out: Item[] = [];
  LEGS.forEach((l) => {
    l.prom.forEach((p: Promesa) => out.push({p, gov: l.gov, l}));
    if (l.prom2) l.prom2.l.forEach((p: Promesa) => out.push({p, gov: 'PSOE', l, sub: true}));
  });
  return out;
}
const TODAS = allPromises();

function Pila({c}: {c: Record<string, number>}) {
  return (
    <div className="stack">
      {SORDER.filter((k) => c[k]).map((k) => (
        <span key={k} style={{flex: c[k], background: STATUS[k].bar}} title={`${STATUS[k].lab}: ${c[k]}`} />
      ))}
    </div>
  );
}

// El periodo sobrevive a cambiar de pestaña y volver, como en el original (alli eran variables globales)
let rangoGuardado: {balFrom: number; balTo: number | null} = {balFrom: 0, balTo: null};

/** dentro: dentro de una cuestion frecuente (Partidos), como una grafica mas, con titulo pequeño */
export default function Balance({dentro}: {dentro?: boolean} = {}) {
  const tip = useTip();
  const [rango, setRango] = useState(rangoGuardado);
  const [activo, setActivo] = useState<number | null>(null); // la promesa con .pb.on
  const fi = rango.balFrom, ti = rango.balTo ?? LEGS.length - 1;

  const BAL = TODAS.filter((x) => {
    const i = LEGS.indexOf(x.l);
    return i >= fi && i <= ti;
  });
  const areaCount: Record<string, number> = {};
  BAL.forEach(({p}) => (areaCount[p[1]] = (areaCount[p[1]] || 0) + 1));
  const areas = Object.keys(areaCount).sort((a, b) => areaCount[b] - areaCount[a]);

  const cambiar = (e: ChangeEvent<HTMLSelectElement>) => {
    let f = e.target.id === 'bal-from' ? +e.target.value : fi, t = e.target.id === 'bal-to' ? +e.target.value : ti;
    if (f > t) [f, t] = [t, f];
    rangoGuardado = {balFrom: f, balTo: t};
    setRango(rangoGuardado);
    setActivo(null);
  };

  const balTip = (i: number, el: HTMLElement, e?: PointerEvent | MouseEvent) => {
    const x = BAL[i];
    if (!x) return;
    const [st, ar, t, , res] = x.p, S = STATUS[st], l = x.l;
    const who = x.sub
      ? 'Gobierno de Pedro Sánchez tras la moción (2018–2019)'
      : `${l.num} Legislatura (${yr(l.a)}–${yr(l.b)}) · ${mandatoTxt(l)}`;
    const r = el.getBoundingClientRect(), cx = e && e.clientX != null ? e.clientX : r.left + r.width / 2, cy = e && e.clientY != null ? e.clientY : r.top;
    tip.mostrar(
      <>
        <div className="thead">
          <span className={`chip ${S.cls}`} style={{marginRight: 6}}>
            {S.ic} {S.lab}
          </span>
          {ar}
        </div>
        <div style={{fontWeight: 700, fontSize: 14, margin: '4px 0'}}>{t}</div>
        <div style={{opacity: 0.8}}>{who}</div>
        <div style={{marginTop: 6}}>{res}</div>
      </>,
      {x: cx, y: cy, lado: 'arriba', dx: 14, dy: 12},
    );
    setActivo(i);
  };

  /*
    Ocultar la etiqueta cuando el puntero pasa a cualquier otro sitio de la
    pagina (no basta pointerleave: en tactil salta justo al levantar el dedo
    y la etiqueta se cerraria nada mas tocar). Se respetan las graficas, que
    usan la misma etiqueta.
  */
  useEffect(() => {
    if (activo == null) return;
    const fuera = (e: globalThis.PointerEvent) => {
      const t = e.target as Element;
      if (t.closest?.('.pb') || t.closest?.('.chart svg')) return;
      setActivo(null);
      tip.ocultar();
    };
    document.addEventListener('pointerover', fuera);
    return () => document.removeEventListener('pointerover', fuera);
  }, [activo, tip]);

  const opt = () =>
    LEGS.map((l, i) => (
      <option key={i} value={i}>
        {l.num} · {yr(l.a)}
      </option>
    ));

  const panel = (g: string) => {
    const mine = BAL.map((x, i) => ({...x, i})).filter((x) => x.gov === g), c: Record<string, number> = {};
    mine.forEach(({p}) => (c[p[0]] = (c[p[0]] || 0) + 1));
    const cabecera = (
      <>
        <span className="tag gov" style={{background: PARTY[g].c}}>{PARTY[g].n}</span>
        <strong>Gobiernos del {PARTY[g].n}</strong>
      </>
    );
    if (!mine.length)
      return (
        <div className="bpanel" style={{'--pc': PARTY[g].c} as CSSProperties}>
          <div className="bph">{cabecera}</div>
          <p className="note">No gobernó en este periodo.</p>
        </div>
      );
    const rate = (((c.c || 0) + (c.p || 0) * 0.5) / ((c.c || 0) + (c.p || 0) + (c.n || 0) + (c.i || 0))) * 100;
    return (
      <div className="bpanel" style={{'--pc': PARTY[g].c} as CSSProperties}>
        <div className="bph">
          {cabecera}
          <span className="bpr num">{fmt(rate, 0)} % conseguido</span>
        </div>
        <Pila c={c} />
        <div className="pbar" style={{margin: '6px 0 10px'}}>
          {SORDER.filter((k) => c[k]).map((k) => (
            <span key={k} className={`chip ${STATUS[k].cls}`}>
              {STATUS[k].ic} {c[k]}
            </span>
          ))}
        </div>
        {areas.map((ar) => {
          const list = mine.filter((x) => x.p[1] === ar).sort((a, b) => SORDER.indexOf(a.p[0]) - SORDER.indexOf(b.p[0]));
          return (
            <div key={ar} className="brow">
              <span className="blab">
                <Icono k={AREA_ICON[ar] || 'inst'} size={14} />
                {ar}
              </span>
              <div className="bseg">
                {list.length ? (
                  list.map((x) => (
                    <span
                      key={x.i}
                      className={`pb${activo === x.i ? ' on' : ''}`}
                      data-b={x.i}
                      tabIndex={0}
                      style={{background: STATUS[x.p[0]].bar}}
                      onPointerOver={(e) => balTip(x.i, e.currentTarget, e)}
                      onFocus={(e) => balTip(x.i, e.currentTarget)}
                      onClick={(e) => balTip(x.i, e.currentTarget, e)}
                    />
                  ))
                ) : (
                  <em className="note" style={{margin: 0}}>—</em>
                )}
              </div>
              <span className="num bn">{list.length || ''}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const Raiz = dentro ? 'div' : 'section';
  const Titulo = dentro ? 'h3' : 'h2';
  return (
    <Raiz {...(dentro ? {id: 'par-balance', className: 'bal-caja'} : {})}>
      {!dentro && <div className="eyebrow">Balance</div>}
      <Titulo>
        Promesas por área y por partido{' '}
        <Info>
          Unas 250 promesas concretas y comprobables, entre 12 y 29 por legislatura, elegidas con el mismo criterio para todos los Gobiernos. Cada una
          lleva un punto que indica de dónde sale: verde si es del programa electoral o de un documento oficial (por ejemplo, el discurso de{' '}
          <T k="investidura">investidura</T>), naranja si es de la prensa. El resultado enlaza a la ley del <T k="boe">BOE</T> o al dato oficial.
          <br />
          <br />
          Ojo: el % depende de qué promesas se pueden comprobar. En 1986–1996 y en el PP de 2016 no hay programa en línea y se usan los discursos de
          investidura; en 2023 algunas promesas incumplidas se dejaron fuera por no encontrar una fuente que lo acredite. Más promesas comprobables
          suelen ser leyes que se aprobaron.
          <br />
          <br />
          Cómo se calcula el % conseguido: las cumplidas cuentan 1, las cumplidas a medias 0,5, y las incumplidas y las presentadas pero no
          aprobadas, 0. Las que siguen en curso no cuentan. La selección y la valoración de las promesas son un criterio propio de esta web.
        </Info>
      </Titulo>
      <div className="statlegend" id="statlegend">
        {SORDER.map((k) => (
          <span key={k}>
            <i className="sw" style={{background: STATUS[k].bar}} />
            {STATUS[k].lab}
          </span>
        ))}
      </div>
      <div className="hbars" id="bycat">
        <div className="bfilter">
          <label htmlFor="bal-from">Desde</label>
          <select id="bal-from" value={fi} onChange={cambiar}>
            {opt()}
          </select>
          <label htmlFor="bal-to">hasta</label>
          <select id="bal-to" value={ti} onChange={cambiar}>
            {opt()}
          </select>
          <span className="note" style={{margin: 0}}>
            {yr(LEGS[fi].a)}–{yr(LEGS[ti].b)}
          </span>
        </div>
      </div>
      <div className="balance" id="balance">
        <div className="bgrid">
          {panel('PSOE')}
          {panel('PP')}
        </div>
      </div>
    </Raiz>
  );
}
