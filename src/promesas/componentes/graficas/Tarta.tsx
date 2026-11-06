import {useState, type ReactNode} from 'react';
import {fmt} from '../../lib/formato';
import Info from '../Info';

/*
  Grafico de anillo (tarta con hueco) con su leyenda al lado: cada trozo
  es una parte del total. Al pasar por un trozo o por su nombre se resalta.
  Con `vistas` muestra un selector para cambiar entre varios repartos
  (por ejemplo, un año concreto o la suma de varios).
*/
export type TrozoTarta = {lab: string; n: number; c: string; extra?: string};
type Vista = {lab: string; sub: string; trozos: TrozoTarta[]; centro?: string};
type Props = {
  id?: string;
  title: string;
  sub?: string;
  trozos?: TrozoTarta[];
  /** Texto del centro (el total, normalmente) */
  centro?: string;
  vistas?: Vista[];
  note?: ReactNode;
  src?: ReactNode;
};

const COLORES = ['#3B5BDB', '#0B7A75', '#E8590C', '#AE3EC9', '#2F9E44', '#F59F00', '#1C7ED6', '#C2255C', '#5C940D', '#7048E8', '#D9480F', '#0C8599'];
/** Color por posicion; «Resto» siempre en gris */
export const colorTrozo = (lab: string, i: number) => (/^resto|otros/i.test(lab) ? '#ADB5BD' : COLORES[i % COLORES.length]);

export default function Tarta({id, title, vistas, note, src, ...uno}: Props) {
  const [act, setAct] = useState<number | null>(null);
  const [iv, setIv] = useState(0);
  const v: Vista = vistas ? vistas[iv] : {lab: '', sub: uno.sub ?? '', trozos: uno.trozos ?? [], centro: uno.centro};
  const {sub, trozos, centro} = v;
  const total = trozos.reduce((a, t) => a + t.n, 0);
  const R = 70, r = 42, cx = 80, cy = 80;
  let ang = -Math.PI / 2;
  const arcos = trozos.map((t) => {
    const a0 = ang, a1 = ang + (t.n / total) * 2 * Math.PI;
    ang = a1;
    const big = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad: number, a: number) => `${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`;
    return `M${p(R, a0)}A${R} ${R} 0 ${big} 1 ${p(R, a1)}L${p(r, a1)}A${r} ${r} 0 ${big} 0 ${p(r, a0)}Z`;
  });
  const pct = (n: number) => fmt((n / total) * 100, 1) + ' %';
  const sel = act != null ? trozos[act] : null;

  return (
    <div id={id} className="chart tarta">
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
      {vistas && (
        <div className="seg" role="group" aria-label="Elegir reparto">
          {vistas.map((x, i) => (
            <button key={x.lab} type="button" aria-pressed={i === iv} onClick={() => (setIv(i), setAct(null))}>
              {x.lab}
            </button>
          ))}
        </div>
      )}
      <div className="tarta-cuerpo" onPointerLeave={() => setAct(null)}>
        <svg viewBox="0 0 160 160" role="img" aria-label={title}>
          {arcos.map((d, i) => (
            <path
              key={i}
              d={d}
              fill={trozos[i].c}
              stroke="var(--bg)"
              strokeWidth={1.5}
              opacity={act == null || act === i ? 1 : 0.25}
              onPointerEnter={() => setAct(i)}
            />
          ))}
          <text x={cx} y={cy - 2} textAnchor="middle" className="tarta-c1">{sel ? pct(sel.n) : centro ?? fmt(total, 0)}</text>
          <text x={cx} y={cy + 13} textAnchor="middle" className="tarta-c2">{sel ? sel.lab : 'total'}</text>
        </svg>
        <ul className="tarta-leg">
          {trozos.map((t, i) => (
            <li key={i} className={act === i ? 'act' : act != null ? 'off' : undefined} onPointerEnter={() => setAct(i)}>
              <i style={{background: t.c}} />
              <span>{t.lab}</span>
              <b className="num">{pct(t.n)}</b>
              <small className="num">{t.extra ?? fmt(t.n, 0)}</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
