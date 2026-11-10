import {CH, SRC_LAB} from '../../lib/config';
import {dAbs, fmt, formatoIndicador, fv, sgn, toYear, yr} from '../../lib/formato';
import {allSeries, scales, type Punto} from '../../lib/series';
import {EVENTS, GOVS, LEGS, METRICS, PARTY, SNAP, type Indicador} from '../../datos';
import {useEstado} from '../../estado';
import {Texto} from '../../../comun/Glosario';
import Info from '../Info';
import {claseSerie, MarcasHover, useHover, type InfoHover} from './useHover';

/*
  Grafica grande de un indicador, desde 1986 hasta el ultimo dato (chart en
  el original): fondo del color del partido que gobernaba, la legislatura
  elegida recuadrada y, debajo, una franja con cuanto subio o bajo en cada
  legislatura.
*/

const f1 = (v: number) => v.toFixed(1);

/*
  Fin del eje X, el mismo para todas las graficas grandes (asi los años caen
  en el mismo sitio en todas): CH.x1, o el ultimo dato de cualquier indicador
  + CH.margen si es posterior. Con los datos de hoy se queda en CH.x1.
*/
const X1 = Math.max(CH.x1, ...METRICS.flatMap((m) => allSeries(m).flatMap((s) => s.pts.map((p) => p.x + CH.margen))));
const ejeX = (x: number) => CH.L + ((x - CH.x0) / (X1 - CH.x0)) * (CH.W - CH.L - CH.R);
// Una etiqueta cada 10 años desde el principio (1986, 1996… 2026, y 2036 cuando haya datos)
const ANIOS: number[] = [];
for (let y = CH.x0; y <= X1; y += 10) ANIOS.push(y);
const ANIO_FIN = Math.floor(X1);

function linePath(pts: Punto[], src: string, X: (x: number) => number, Y: (v: number) => number) {
  return src === 'step'
    ? pts.map((p, i) => (i ? `H${f1(X(p.x))}V${f1(Y(p.v))}` : `M${f1(X(p.x))} ${f1(Y(p.v))}`)).join('')
    : pts.map((p, i) => (i ? 'L' : 'M') + f1(X(p.x)) + ' ' + f1(Y(p.v))).join('');
}

// Zona entre gasto e ingresos: roja si hay deficit, verde si hay superavit
function GapArea({a, b, X, Y}: {a: Punto[]; b: Punto[]; X: (x: number) => number; Y: (v: number) => number}) {
  const out = [];
  for (let i = 0; i < a.length - 1; i++) {
    const j = b.findIndex((p) => p.x === a[i].x), k = b.findIndex((p) => p.x === a[i + 1].x);
    if (j < 0 || k < 0) continue;
    const def = a[i].v - b[j].v + (a[i + 1].v - b[k].v) > 0;
    out.push(
      <polygon key={i} points={`${X(a[i].x)},${Y(a[i].v)} ${X(a[i + 1].x)},${Y(a[i + 1].v)} ${X(b[k].x)},${Y(b[k].v)} ${X(b[j].x)},${Y(b[j].v)}`}
        fill={def ? 'var(--ko)' : 'var(--ok)'} fillOpacity={0.14} />,
    );
  }
  return <>{out}</>;
}

function Franja({m, X}: {m: Indicador; X: (x: number) => number}) {
  const y = CH.H - CH.B + 24, h = 22;
  return (
    <>
      {LEGS.map((l) => {
        const a = SNAP[l.s][m.k], b = SNAP[l.e][m.k], x1 = X(toYear(l.a)), x2 = X(Math.min(toYear(l.b), X1)), w = x2 - x1 - 1.5;
        if (a == null || b == null)
          return (
            <rect key={l.id} x={f1(x1)} y={y} width={f1(w)} height={h} rx={2} fill="var(--soft)">
              <title>{`${l.num} Legislatura: sin dato`}</title>
            </rect>
          );
        const d = b - a, flat = Math.abs(d) < 1e-9, up = d > 0;
        let fill = 'var(--soft)', ink = 'var(--ink)';
        if (m.dir && !flat) {
          const good = (m.dir === 'up') === up;
          fill = good ? 'var(--ok-bg)' : 'var(--ko-bg)';
          ink = good ? 'var(--ok)' : 'var(--ko)';
        }
        const arrow = flat ? '=' : up ? '▲' : '▼';
        const txt = w > 52 ? `${arrow} ${sgn(d)}${dAbs(m, d).replace(/ (mil M€|€\/m²)/, '')}` : w > 12 ? arrow : '';
        return (
          <g key={l.id}>
            <title>{`${l.num} Legislatura: ${fv(m, a)} → ${fv(m, b)}`}</title>
            <rect x={f1(x1)} y={y} width={f1(w)} height={h} rx={2} fill={fill} />
            <text x={f1(x1 + w / 2)} y={y + 14.5} textAnchor="middle" style={{fill: ink, fontWeight: 600, fontSize: (w > 52 ? 9.5 : 10) + 'px'}}>{txt}</text>
          </g>
        );
      })}
    </>
  );
}

function Acontecimientos({X}: {X: (x: number) => number}) {
  return (
    <>
      {EVENTS.map(([x, lab]: [number, string], i: number) => {
        const px = X(x), ty = i % 2 ? 19 : 9;
        return (
          <g key={i}>
            <line x1={f1(px)} x2={f1(px)} y1={ty + 3} y2={CH.H - CH.B} stroke="var(--muted)" strokeWidth={1} strokeDasharray="2 2" opacity={0.55} />
            <text x={f1(Math.min(Math.max(px, CH.L + 14), CH.W - CH.R - 14))} y={ty} textAnchor="middle" style={{fontSize: '9px', fontWeight: 500, fill: 'var(--ink)'}}>{lab}</text>
          </g>
        );
      })}
    </>
  );
}

export default function Grafico({m, acontecimientos = false}: {m: Indicador; acontecimientos?: boolean}) {
  const {current} = useEstado();
  const S = allSeries(m), main = S[0].pts;
  // El eje Y sale de scales(); el X es el comun de todas las graficas grandes (ejeX)
  const {tk, Y} = scales(S.flatMap((s) => s.pts.map((p) => p.v)), m), X = ejeX;
  const {W, H, L, R, T, B} = CH, base = H - B;
  const l = LEGS.find((x) => x.id === current)!;
  const info: InfoHover = {
    S: S.map((sr) => ({lab: sr.lab || m.t, c: sr.c, pts: sr.pts})),
    X, Y, W, L, R, x0: CH.x0, x1: X1,
    f: (v) => formatoIndicador(m, v),
    gasto: m.k === 'gasto',
    click: true,
  };
  const {svgRef, h, handlers} = useHover(info);

  const sx1 = X(toYear(l.a)), sw = Math.max(2, X(Math.min(toYear(l.b), X1)) - sx1);
  const last = main.at(-1)!, first = main[0], d = last.v - first.v;
  const trendCol = m.dir && Math.abs(d) > 1e-9 ? ((m.dir === 'up') === d > 0 ? 'ok' : 'ko') : 'neutral';

  return (
    <div id={`g-${m.k}`} className={`chart${h ? ' hovering' : ''}`}>
      <div className="chead">
        <h3>
          {m.t}{' '}
          {m.note && (
            <Info titulo={m.t}>
              <p>
                <Texto>{m.note}</Texto>
              </p>
              <p className="srcl">
                Fuentes: <a href="fuentes.html" target="_blank" rel="noopener">página de fuentes</a>
              </p>
            </Info>
          )}
        </h3>
        <span className={`chip ${trendCol}`}>
          {d > 0 ? '▲' : d < 0 ? '▼' : '='} {sgn(d)}
          {dAbs(m, d)} desde {String(first.lab).replace(/^(desde |≈ )/, '').slice(-4)}
        </span>
      </div>
      <div className="sub">
        {m.u} · {SRC_LAB[m.src]}
        {m.multi ? '' : ' · último: ' + formatoIndicador(m, last.v)}
      </div>
      {m.multi && (
        <div className="mleg">
          {S.map((sr, si) => (
            <span key={si} data-s={si} className={claseSerie(h, si)}>
              <i style={{borderTop: `2.5px ${sr.dash ? 'dashed' : 'solid'} ${sr.c}`}} />
              {sr.lab}
            </span>
          ))}
          {m.k === 'gasto' && (
            <>
              <span><i className="sw" style={{background: 'var(--ko)', opacity: 0.3}} />Déficit</span>
              <span><i className="sw" style={{background: 'var(--ok)', opacity: 0.3}} />Superávit</span>
            </>
          )}
        </div>
      )}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} data-k={m.k} role="img" aria-label={`${m.t}, ${CH.x0}–${ANIO_FIN}`} {...handlers}>
        {GOVS.map((g, i) => (
          <rect key={i} x={f1(X(toYear(g.a)))} y={T} width={f1(X(Math.min(toYear(g.b), X1)) - X(toYear(g.a)))} height={base - T} fill={PARTY[g.p].c} fillOpacity={0.1} />
        ))}
        {tk.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={f1(Y(v))} y2={f1(Y(v))} stroke="var(--line)" />
            <text x={L - 6} y={f1(Y(v) + 3)} textAnchor="end">{fmt(v, v % 1 ? 1 : 0)}</text>
          </g>
        ))}
        {acontecimientos && <Acontecimientos X={X} />}
        <g className="selrect">
          <title>{`Legislatura seleccionada: ${l.num} (${yr(l.a)}–${yr(l.b)})`}</title>
          <rect x={f1(sx1)} y={T} width={f1(sw)} height={H - T - 6} fill="none" stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="4 3" />
          <rect x={f1(sx1 + sw / 2 - 13)} y={T + 2} width={26} height={13} rx={3} fill="var(--ink)" />
          <text x={f1(sx1 + sw / 2)} y={T + 11.5} textAnchor="middle" style={{fill: 'var(--bg)', fontSize: '9px', fontWeight: 700}}>{l.num}</text>
        </g>
        {m.k === 'gasto' && <GapArea a={S[0].pts} b={S[1].pts} X={X} Y={Y} />}
        {S.map((sr, si) => (
          <g key={si} data-s={si} className={claseSerie(h, si)}>
            <path d={linePath(sr.pts, m.src, X, Y)} fill="none" style={{stroke: sr.c}} strokeWidth={2} strokeDasharray={sr.dash ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
            {m.src !== 'annual' &&
              sr.pts.slice(0, m.src === 'step' ? -1 : undefined).map((p, i) => <circle key={i} cx={f1(X(p.x))} cy={f1(Y(p.v))} r={3} style={{fill: sr.c}} />)}
            <circle cx={f1(X(sr.pts.at(-1)!.x))} cy={f1(Y(sr.pts.at(-1)!.v))} r={4.5} style={{fill: sr.c}} stroke="var(--bg)" strokeWidth={2} />
          </g>
        ))}
        {ANIOS.map((y) => (
          <text key={y} x={f1(X(y))} y={base + 14} textAnchor="middle">{y}</text>
        ))}
        <text x={L - 6} y={base + 38} textAnchor="end" style={{fontSize: '9px'}}>cambio</text>
        <Franja m={m} X={X} />
        <rect className="hit" x={L} y={0} width={W - L - R} height={base} fill="transparent" style={{cursor: 'pointer'}} />
        <MarcasHover h={h} info={info} y2={CH.H - CH.B} />
      </svg>
    </div>
  );
}
