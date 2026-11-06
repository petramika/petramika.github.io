import {useCallback, useEffect, useRef, useState, type PointerEvent, type MouseEvent} from 'react';
import {LEGS} from '../../datos';
import {useEstado} from '../../estado';
import {fmt, govAt, toYear} from '../../lib/formato';
import {useTip} from '../Tip';

/*
  Lo que hacen todas las graficas al pasar el raton (o tocar, en movil):
  etiqueta con todas las series en ese año, la serie mas cercana resaltada
  y el resto de graficas del mismo grupo (.charts) atenuadas. En las
  graficas grandes, pulsar elige la legislatura de ese año.
*/
export type PuntoH = {x: number; v: number; lab?: string; key?: string};
export type InfoHover = {
  S: {lab: string; c: string; pts: PuntoH[]}[];
  X: (x: number) => number;
  Y: (v: number) => number;
  W: number; L: number; R: number; x0: number; x1: number;
  f: (v: number, x: number) => string;
  gasto?: boolean;
  bars?: boolean;
  click?: boolean;
};
export type EstadoHover = {x: number; at: (PuntoH | undefined)[]; act: number};

const tactil = () => matchMedia('(hover: none)').matches;

export function useHover(info: InfoHover) {
  const [h, setH] = useState<EstadoHover | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tip = useTip();
  const {current, select} = useEstado();

  const grupo = (activo: boolean) => svgRef.current?.closest('.charts')?.classList.toggle('has-hover', activo);

  const limpiar = useCallback(() => {
    setH(null);
    tip.ocultar();
    svgRef.current?.closest('.charts')?.classList.remove('has-hover');
  }, [tip]);

  const mover = (e: PointerEvent<SVGSVGElement> | MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * info.W, sy = ((e.clientY - r.top) / r.height) * svg.viewBox.baseVal.height;
    const yr = info.x0 + ((sx - info.L) / (info.W - info.L - info.R)) * (info.x1 - info.x0);
    const xs = [...new Set(info.S.flatMap((s) => s.pts.map((p) => p.x)))];
    const x = xs.reduce((a, b) => (Math.abs(b - yr) < Math.abs(a - yr) ? b : a));
    const at = info.S.map((s) => s.pts.find((p) => Math.abs(p.x - x) < 0.01));
    let act = 0, best = 1e9;
    at.forEach((q, i) => {
      if (q) {
        const dy = Math.abs(info.Y(q.v) - sy);
        if (dy < best) { best = dy; act = i; }
      }
    });
    setH({x, at, act});
    grupo(true);
    const ref = at[act] || at.find(Boolean)!;
    const dd = info.gasto && at[0] && at[1] ? at[1].v - at[0].v : null;
    tip.mostrar(
      <>
        <div className="thead">{String(ref.lab)} · Gobierno {govAt(x)}</div>
        {info.S.map((s, i) =>
          at[i] ? (
            <div key={i} className={`trow2${i === act ? ' act' : ''}`}>
              <i className="sw" style={{background: s.c}} />
              <span>{s.lab}</span>
              <b className="num">{info.f(at[i]!.v, at[i]!.x)}</b>
            </div>
          ) : null,
        )}
        {dd != null && (
          <div className="trow2">
            <span>{dd < 0 ? 'Déficit' : 'Superávit'}</span>
            <b className="num">{fmt(Math.abs(dd), 1)} mil M€</b>
          </div>
        )}
      </>,
      {x: e.clientX, y: e.clientY},
    );
  };

  // En movil la etiqueta se queda hasta que se toca fuera
  useEffect(() => {
    if (!h || !tactil()) return;
    const fuera = (e: Event) => {
      const t = e.target as Element;
      if (!svgRef.current?.contains(t) && !t.closest?.('.tip')) limpiar();
    };
    document.addEventListener('click', fuera);
    return () => document.removeEventListener('click', fuera);
  }, [h, limpiar]);

  const handlers = {
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => !tactil() && mover(e),
    onPointerLeave: () => !tactil() && limpiar(),
    onClick: (e: MouseEvent<SVGSVGElement>) => {
      if (tactil()) return mover(e);
      if (!info.click) return;
      const r = e.currentTarget.getBoundingClientRect(), sx = ((e.clientX - r.left) / r.width) * info.W;
      const y = info.x0 + ((sx - info.L) / (info.W - info.L - info.R)) * (info.x1 - info.x0);
      const l = LEGS.find((l) => y >= toYear(l.a) && y < toYear(l.b));
      if (l && l.id !== current) { limpiar(); select(l.id, false); }
    },
  };

  return {svgRef, h, handlers};
}

/** La linea vertical y los puntos que marcan el año señalado */
export function MarcasHover({h, info, y2}: {h: EstadoHover | null; info: InfoHover; y2: number}) {
  if (!h) return null;
  const px = info.X(h.x);
  return (
    <>
      <line className="hx hxl" stroke="var(--ink)" strokeWidth={1} x1={px} x2={px} y1={8} y2={y2} opacity={0.35} />
      {!info.bars &&
        info.S.map((s, i) => {
          const q = h.at[i];
          return q ? <circle key={i} className="hx hxd" r={5} fill={s.c} stroke="#fff" strokeWidth={2} cx={px} cy={info.Y(q.v)} /> : null;
        })}
    </>
  );
}

/** Clase para lo que lleva data-s (lineas y leyenda): resalta la serie activa */
export const claseSerie = (h: EstadoHover | null, i: number) => (h && h.act === i ? 'act' : undefined);
