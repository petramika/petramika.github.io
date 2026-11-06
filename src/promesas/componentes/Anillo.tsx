import {fmt, rateColor} from '../lib/formato';

/** El circulo con el % de promesas conseguidas (ring en el original). */
export default function Anillo({r, size}: {r: number | null; size: number}) {
  if (r == null)
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-label="Sin promesas que evaluar">
        <circle cx="20" cy="20" r="16" fill="none" stroke="var(--line)" strokeWidth="5" strokeDasharray="3 3" />
        <text x="20" y="23.5" textAnchor="middle" style={{font: '600 10px var(--f-data)', fill: 'var(--muted)'}}>—</text>
      </svg>
    );
  const C = 2 * Math.PI * 16, len = (C * r) / 100;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={`${fmt(r, 0)} % cumplido`}>
      <circle cx="20" cy="20" r="16" fill="none" stroke="var(--line)" strokeWidth="5" />
      <circle cx="20" cy="20" r="16" fill="none" stroke={rateColor(r)} strokeWidth="5" strokeDasharray={`${len.toFixed(2)} ${C.toFixed(2)}`} transform="rotate(-90 20 20)" strokeLinecap="butt" />
      <text x="20" y="23.5" textAnchor="middle" style={{font: `600 ${r >= 100 ? 9 : 10.5}px var(--f-data)`, fill: 'var(--ink)'}}>{fmt(r, 0)}%</text>
    </svg>
  );
}
