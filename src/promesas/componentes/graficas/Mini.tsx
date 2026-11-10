import {useEffect, useRef, useState, type ReactNode} from 'react';
import {GOVS, PARTY} from '../../datos';
import {fmt, niceTicks, toYear} from '../../lib/formato';
import Info from '../Info';
import {claseSerie, MarcasHover, useHover, type InfoHover} from './useHover';

/*
  Grafica de lineas (o barras) generica, con el fondo del partido que
  gobernaba (mini en el original). Recibe lo mismo que mini():
    series: [{lab, c, dash?, data: {año: valor}}]
    f: como se escribe un valor en la etiqueta
  `src` y `note` van a la ventana (i): `src` puede llevar enlaces.
  Pulsar un nombre de la leyenda filtra la grafica a esa serie (se pueden
  elegir varias); «Ver todas», Esc o pulsar fuera de la grafica lo deshace.
*/
export type SerieMini = {lab: string; c: string; dash?: boolean; data: Record<string | number, number>};
export type MiniProps = {
  id?: string;
  title: string;
  sub: string;
  series: SerieMini[];
  f: (v: number, x?: number) => string;
  x0: number;
  /** Fin del eje. Opcional: si falta, o si hay datos posteriores, llega hasta el ultimo dato + medio año */
  x1?: number;
  invert?: boolean;
  yMin?: number;
  bars?: boolean;
  src?: ReactNode;
  /** Texto de la (i); puede llevar enlaces (si no es texto, va tal cual) */
  note?: ReactNode;
  h?: number;
  /** Hitos: linea vertical discontinua con su texto (x en años con decimales, 2022.91 = finales de nov.) */
  hitos?: {x: number; lab: string}[];
};

const f1 = (v: number) => v.toFixed(1);

export default function Mini({id, title, sub, series: todas, f, x0, x1: x1Dado, invert, yMin, bars, src, note, h: alto, hitos}: MiniProps) {
  const {sel, alternar, caja} = useFiltro();
  // Ultimo año con dato: el eje nunca se queda corto aunque lleguen datos nuevos
  const ultimo = Math.max(...todas.flatMap((s) => Object.keys(s.data).map(Number).filter(Number.isFinite)));
  const x1 = Math.max(x1Dado ?? -Infinity, ultimo + 0.5);
  const {lienzo, hLienzo} = useAltoLibre(560);
  // Series que se dibujan: las elegidas en la leyenda, o todas
  const series = sel.length ? todas.filter((_, i) => sel.includes(i)) : todas;
  const vals = series.flatMap((s) => Object.values(s.data));
  const lo = yMin ?? Math.min(0, Math.min(...vals)), hi = Math.max(...vals);
  const tk = niceTicks(lo, hi * 1.05), y0 = tk[0], y1 = tk.at(-1)!;
  // Margen izquierdo segun lo largas que sean las cifras del eje ("400.000" no cabe en 44)
  const ancho = Math.max(...tk.map((v) => fmt(v, v % 1 ? 1 : 0).length));
  const W = 560, H0 = alto || 210, H = Math.max(H0, hLienzo ?? 0), L = Math.max(44, ancho * 6 + 10), R = 14, T = 14, B = 26;
  const X = (x: number) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v: number) => (invert ? T + ((v - y0) / (y1 - y0)) * (H - T - B) : T + (1 - (v - y0) / (y1 - y0)) * (H - T - B));
  const step = x1 - x0 > 20 ? 5 : x1 - x0 > 10 ? 2 : 1, xs: number[] = [];
  for (let y = Math.ceil(x0 / step) * step; y <= x1; y += step) xs.push(y);
  // El ultimo año con dato siempre lleva su etiqueta, para que no parezca que la serie acaba antes
  if (ultimo > xs.at(-1)!) {
    // Si no cabe al lado de la ultima marca, la sustituye (2025 → 2026)
    if (X(ultimo) - X(xs.at(-1)!) >= 38) xs.push(ultimo);
    else xs[xs.length - 1] = ultimo;
  }

  const info: InfoHover = {
    S: series.map((s) => ({lab: s.lab, c: s.c, pts: Object.entries(s.data).map(([y, v]) => ({x: +y, v, lab: String(y)}))})),
    X, Y, W, L, R, x0, x1, f: (v, x) => f(v, x), bars,
  };
  const {svgRef, h, handlers} = useHover(info);

  return (
    <div ref={caja} id={id} className={`chart${h ? ' hovering' : ''}`}>
      <div className="chead">
        <h3>
          {title}{' '}
          {note && (
            <Info titulo={title}>
              {typeof note === 'string' ? <p>{note}</p> : note}
              <p className="srcl">Fuente: {src}</p>
            </Info>
          )}
        </h3>
      </div>
      <div className="sub">{sub}</div>
      {todas.length > 1 && (
        <div className="mleg filtrable">
          {todas.map((s, i) => {
            const vi = series.indexOf(s);
            const estado = sel.length ? (vi >= 0 ? 'on' : 'off') : '';
            return (
              <button
                key={i}
                type="button"
                data-s={vi >= 0 ? vi : undefined}
                className={[claseSerie(h, vi), estado].filter(Boolean).join(' ') || undefined}
                aria-pressed={sel.includes(i)}
                title={sel.includes(i) ? 'Quitar del filtro' : 'Ver solo esta serie'}
                onClick={() => alternar(i)}
              >
                <i style={{borderTop: `2.5px ${s.dash ? 'dashed' : 'solid'} ${s.c}`}} />
                {s.lab}
              </button>
            );
          })}
          {sel.length > 0 && (
            <button type="button" className="golink limpiar" onClick={() => alternar(null)}>
              Ver todas
            </button>
          )}
        </div>
      )}
      {/* El lienzo crece si la tarjeta es mas alta (la de al lado es mayor): la grafica ocupa todo el hueco */}
      <div ref={lienzo} className="mini-lienzo">
      <div style={{aspectRatio: `${W} / ${H0}`}} />
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} {...handlers}>
        {GOVS.filter((g) => toYear(g.b) > x0).map((g, i) => {
          const a = Math.max(toYear(g.a), x0), b = Math.min(toYear(g.b), x1);
          return <rect key={i} x={f1(X(a))} y={T} width={f1(Math.max(0, X(b) - X(a)))} height={H - T - B} fill={PARTY[g.p].c} fillOpacity={0.08} />;
        })}
        {tk.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={f1(Y(v))} y2={f1(Y(v))} stroke="var(--line)" />
            <text x={L - 6} y={f1(Y(v) + 3)} textAnchor="end">{fmt(v, v % 1 ? 1 : 0)}</text>
          </g>
        ))}
        {hitos?.map((m) => (
          <g key={m.lab} className="hito">
            <line x1={f1(X(m.x))} x2={f1(X(m.x))} y1={T} y2={H - B} stroke="var(--ink, #212529)" strokeOpacity={0.55} strokeDasharray="3 3" />
            <text x={f1(X(m.x) + 5)} y={T + 10} textAnchor="start" fontWeight={600}>{m.lab}</text>
          </g>
        ))}
        {series.map((s, si) => {
          const pts = Object.entries(s.data).map(([y, v]) => ({x: +y, v}));
          if (bars) {
            const bw = Math.max(4, ((W - L - R) / (x1 - x0 + 1)) * 0.62);
            return (
              <g key={si} data-s={si} className={claseSerie(h, si)}>
                {pts.map((p) => (
                  <rect key={p.x} x={f1(X(p.x) - bw / 2)} y={f1(Y(p.v))} width={f1(bw)} height={f1(Y(y0) - Y(p.v))} rx={2} style={{fill: s.c}} />
                ))}
              </g>
            );
          }
          return (
            <g key={si} data-s={si} className={claseSerie(h, si)}>
              <path d={pts.map((p, i) => (i ? 'L' : 'M') + f1(X(p.x)) + ' ' + f1(Y(p.v))).join('')} fill="none" style={{stroke: s.c}} strokeWidth={2} strokeDasharray={s.dash ? '5 4' : undefined} strokeLinejoin="round" />
              {pts.map((p) => (
                <circle key={p.x} cx={f1(X(p.x))} cy={f1(Y(p.v))} r={3} style={{fill: s.c}} />
              ))}
            </g>
          );
        })}
        {xs.map((y) => (
          <text key={y} x={f1(X(y))} y={H - 8} textAnchor="middle">{y}</text>
        ))}
        <rect className="hit" x={L} y={0} width={W - L - R} height={H} fill="transparent" />
        <MarcasHover h={h} info={info} y2={H - B} />
      </svg>
      </div>
    </div>
  );
}

/** Seleccion de series desde la leyenda; se limpia con Esc o pulsando fuera de la grafica */
function useFiltro() {
  const [sel, setSel] = useState<number[]>([]);
  const caja = useRef<HTMLDivElement>(null);
  const alternar = (i: number | null) => setSel((s) => (i == null ? [] : s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const hay = sel.length > 0;
  useEffect(() => {
    if (!hay) return;
    const fuera = (e: PointerEvent) => {
      const t = e.target as Element;
      // La ventana (i) y la etiqueta flotante viven fuera de la grafica (portal): no cuentan como «fuera»
      if (!caja.current?.contains(t) && !t.closest?.('.ipop, .tip, [role="dialog"]')) setSel([]);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setSel([]);
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', esc);
    };
  }, [hay]);
  return {sel, alternar, caja};
}

/**
 * Alto (en unidades del viewBox de ancho `W`) del hueco que deja la tarjeta para la grafica.
 * El svg va en absoluto dentro del lienzo, asi que medirlo no cambia el alto de la fila (no hay bucle).
 */
function useAltoLibre(W: number) {
  const lienzo = useRef<HTMLDivElement>(null);
  const [hLienzo, setH] = useState<number | null>(null);
  useEffect(() => {
    const el = lienzo.current;
    if (!el) return;
    const medir = () => {
      const {width, height} = el.getBoundingClientRect();
      if (width > 0) setH((h) => {
        const n = Math.round((height / width) * W);
        return h != null && Math.abs(h - n) < 2 ? h : n;
      });
    };
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);
  return {lienzo, hLienzo};
}
