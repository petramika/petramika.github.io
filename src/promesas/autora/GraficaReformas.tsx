import REFORMAS from '../datos/autora/reformas.json';

/*
  Reformas de la constitucion acumuladas año a año en varios paises: cada
  linea sube un escalon con cada reforma. España va destacada. Al pasar el
  raton por un punto se ve que cambio esa reforma.
*/
type Pais = {desde: number; reformas: {fecha: string; que: string}[]; fuente: {nombre: string; url: string}};
const DATOS = REFORMAS as unknown as Record<string, Pais>;
const COLOR: Record<string, string> = {España: '#C92A2A', Alemania: '#343A40', Francia: '#1C7ED6', Italia: '#2F9E44', Portugal: '#E8590C', 'Estados Unidos': '#7048E8'};
const anio = (f: string) => +f.slice(0, 4) + ((+f.slice(5, 7) || 6) - 1) / 12;

export default function GraficaReformas() {
  const hoy = new Date().getFullYear() + new Date().getMonth() / 12;
  const paises = Object.entries(DATOS).filter(([n]) => n !== 'Estados Unidos');
  const x0 = Math.min(...paises.map(([, p]) => p.desde)), x1 = hoy;
  const max = Math.max(...paises.map(([, p]) => p.reformas.length));
  const W = 560, H = 300, L = 34, R = 96, T = 12, B = 26;
  const X = (x: number) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v: number) => T + (1 - v / max) * (H - T - B);
  const ticksX: number[] = [];
  for (let y = Math.ceil(x0 / 10) * 10; y <= x1; y += 10) ticksX.push(y);
  const paso = max > 40 ? 20 : max > 20 ? 10 : 5, ticksY: number[] = [];
  for (let v = 0; v <= max; v += paso) ticksY.push(v);

  // Etiquetas al final de cada linea, separadas para que no se pisen
  const finales = paises
    .map(([n, p]) => ({n, n2: p.reformas.length, y: Y(p.reformas.length)}))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < finales.length; i++) if (finales[i].y - finales[i - 1].y < 14) finales[i].y = finales[i - 1].y + 14;

  return (
    <figure className="reformas">
      <figcaption>
        <b>Reformas de la constitución, acumuladas</b>
        <span>Cada escalón es una reforma. Desde que se aprobó cada una hasta hoy.</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Reformas de la constitución acumuladas por país">
        {ticksY.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
            <text x={L - 6} y={Y(v) + 4} textAnchor="end" className="rf-eje">
              {v}
            </text>
          </g>
        ))}
        {ticksX.map((y) => (
          <text key={y} x={X(y)} y={H - 6} textAnchor="middle" className="rf-eje">
            {y}
          </text>
        ))}
        {paises.map(([n, p]) => {
          const pts: [number, number][] = [[p.desde, 0]];
          p.reformas.forEach((r, i) => {
            pts.push([anio(r.fecha), i], [anio(r.fecha), i + 1]);
          });
          pts.push([x1, p.reformas.length]);
          const es = n === 'España';
          return (
            <g key={n}>
              <polyline
                points={pts.map(([x, v]) => `${X(x).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}
                fill="none"
                stroke={COLOR[n] ?? '#868E96'}
                strokeWidth={es ? 3 : 1.6}
                strokeOpacity={es ? 1 : 0.75}
                strokeLinejoin="round"
              />
              {p.reformas.map((r, i) => (
                <circle key={i} cx={X(anio(r.fecha))} cy={Y(i + 1)} r={es ? 4.5 : 2.6} fill={COLOR[n] ?? '#868E96'}>
                  <title>{`${n}, ${r.fecha.slice(0, 4)}: ${r.que}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {finales.map((f) => (
          <text key={f.n} x={W - R + 6} y={f.y + 4} className="rf-pais" style={{fill: COLOR[f.n] ?? '#868E96', fontWeight: f.n === 'España' ? 700 : 500}}>
            {f.n} · {f.n2}
          </text>
        ))}
      </svg>
      <p className="rf-fuente">
        Fuentes:{' '}
        {paises.map(([n, p], i) => (
          <span key={n}>
            {i > 0 && ' · '}
            <a href={p.fuente.url} target="_blank" rel="noopener">
              {n}
            </a>
          </span>
        ))}
        . Cada ley o revisión de la constitución cuenta como una reforma, aunque cambie varios artículos.
      </p>
    </figure>
  );
}
