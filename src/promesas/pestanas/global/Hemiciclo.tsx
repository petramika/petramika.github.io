import {PARTY, type Legislatura} from '../../datos';

/* Los 350 escaños del Congreso, coloreados por partido (hemicycle en el original). */
export default function Hemiciclo({l}: {l: Legislatura}) {
  const N = 350, rows = 10, inner = 0.42, R = 200, cx = 210, cy = 212, seats: {th: number; r: number; x: number; y: number}[] = [];
  const radii = [...Array(rows)].map((_, i) => inner + ((1 - inner) * i) / (rows - 1)), sum = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((r) => Math.round((N * r) / sum));
  counts[rows - 1] += N - counts.reduce((a, b) => a + b, 0);
  radii.forEach((r, i) => {
    const n = counts[i];
    for (let j = 0; j < n; j++) {
      const th = Math.PI - (Math.PI * j) / (n - 1);
      seats.push({th, r, x: cx + Math.cos(th) * r * R, y: cy - Math.sin(th) * r * R});
    }
  });
  seats.sort((a, b) => b.th - a.th || a.r - b.r);
  const order = [...l.res].sort((a, b) => PARTY[a[0]].o - PARTY[b[0]].o);
  let k = 0;
  const dots = order.flatMap(([p, n]) =>
    [...Array(n)].map(() => {
      const s = seats[k++];
      return (
        <circle key={k} cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r="5.2" fill={PARTY[p].c}>
          <title>{`${PARTY[p].n}: ${n}`}</title>
        </circle>
      );
    }),
  );
  const govSeats = l.failed ? 0 : l.res.filter((r) => l.mandato.includes(r[0])).reduce((a, r) => a + r[1], 0);
  return (
    <svg viewBox="0 0 420 240" role="img" aria-label="Hemiciclo de 350 escaños">
      {dots}
      <text x="210" y="222" textAnchor="middle" style={{font: '600 20px var(--f-data)', fill: 'var(--ink)'}}>
        {govSeats || '—'}
      </text>
      <text x="210" y="237" textAnchor="middle">
        {govSeats ? 'escaños del Gobierno · mayoría 176' : 'mayoría absoluta: 176'}
      </text>
    </svg>
  );
}
