import {useLayoutEffect, useRef, useState, type KeyboardEvent} from 'react';
import {fmt} from '../../lib/formato';
import Pista from '../../componentes/Pista';
import {CIS_CUANDO, esProxima, PEL, type EleccionPartido, type Partido} from './datos';
import {tituloEleccion} from './textos';

type Props = {P: Partido; elegida: string | null; elegir: (id: string) => void; pista?: boolean};

/**
  Barras con los escaños del partido en cada eleccion; la proxima (2026) va punteada con el
  dato del CIS (pseatChart). Cada columna es un boton que abre su ficha en el
  panel lateral. Mide su ancho para que las barras ocupen todo el espacio con
  las letras a su tamaño real.
*/
function useAncho() {
  const ref = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(720);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return {ref, ancho};
}

export default function EscanosPartido({P, elegida, elegir, pista}: Props) {
  const {ref, ancho} = useAncho();
  const W = ancho, H = ancho < 560 ? 170 : 200, L = 4, R = 4, T = 22, B = ancho < 560 ? 22 : 36, n = PEL.length, bw = (W - L - R) / n;
  // Movil: columnas estrechas → sin numero romano, año con dos cifras y cifras mas pequeñas
  const estrecho = bw < 40;
  const byE: Record<string, EleccionPartido> = Object.fromEntries(P.elections.map((e) => [e.e, e]));
  const max = Math.max(10, ...P.elections.map((e) => e.seats || 0)), Y = (v: number) => T + (1 - v / max) * (H - T - B);

  return (
    // role group y no img: dentro de un img los botones no llegarian a los lectores de pantalla
    <div ref={ref} id="par-escanos" className="seatwrap">
      {pista && <PistaSobreBarra P={P} W={W} H={H} L={L} T={T} B={B} bw={bw} max={max} />}
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="seatchart2" role="group" aria-label="Escaños en cada elección: pulsa una para ver sus propuestas">
      {PEL.map(([id, num, lab], i) => {
        const hueco = Math.min(10, bw * 0.18), e = byE[id], x = L + i * bw + hueco / 2, w = bw - hueco, cx = (x + w / 2).toFixed(1), on = elegida === id, prox = esProxima(id);
        const tecla = (ev: KeyboardEvent) => {
          if (ev.key !== 'Enter' && ev.key !== ' ') return;
          ev.preventDefault();
          elegir(id);
        };
        let barra;
        if (!e) barra = <line x1={x} x2={x + w} y1={H - B} y2={H - B} stroke="var(--line)" />;
        else if (prox)
          barra = (
            <>
              <rect x={x} y={T} width={w} height={H - B - T} rx={3} fill="none" stroke={P.color} strokeDasharray="3 3" />
              <text x={cx} y={(H - B) / 2 + 8} textAnchor="middle" style={{fontSize: estrecho ? '10px' : '13px', fill: 'var(--ink)', fontWeight: 600}}>
                {e.cis != null ? fmt(e.cis, 0) + '%' : '?'}
                <title>{`CIS ${CIS_CUANDO.largo.replace(' de ', ' ')}: ${e.cis != null ? fmt(e.cis, 1) + ' %' : 'sin dato'}`}</title>
              </text>
            </>
          );
        else {
          const s = e.seats || 0;
          barra = !s ? (
            <>
              <rect x={x} y={H - B - 2} width={w} height={2} fill="var(--wip-bar)" />
              <text x={cx} y={H - B - 5} textAnchor="middle">0</text>
            </>
          ) : (
            <>
              <rect x={x.toFixed(1)} y={Y(s).toFixed(1)} width={w.toFixed(1)} height={(H - B - Y(s)).toFixed(1)} rx={3} fill={P.color}>
                <title>{`${num}: ${s} escaños`}</title>
              </rect>
              <text x={cx} y={(Y(s) - 4).toFixed(1)} textAnchor="middle" style={{fill: 'var(--ink)', fontWeight: 600, fontSize: estrecho ? '10.5px' : undefined}}>{s}</text>
            </>
          );
        }
        return (
          <g
            key={id}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={prox ? tituloEleccion(id) : `${num} Legislatura, elecciones de ${lab}`}
            style={{cursor: 'pointer'}}
            onClick={() => elegir(id)}
            onKeyDown={tecla}
          >
            {/* Zona de clic de toda la columna; se sombrea la elegida */}
            <rect className="szona" x={L + i * bw} y={0} width={bw} height={H} rx={6} fill={on ? 'var(--soft)' : 'transparent'} stroke={on ? 'var(--line)' : 'none'} />
            {!estrecho && (
              <text x={cx} y={H - 19} textAnchor="middle" className="snum" style={on ? {fontWeight: 700, fill: 'var(--ink)'} : undefined}>{num}</text>
            )}
            <text x={cx} y={H - 5} textAnchor="middle" className="sanio" style={estrecho && on ? {fontWeight: 700, fill: 'var(--ink)'} : undefined}>
              {estrecho ? "'" + lab.slice(-2) : lab.slice(-4)}
            </text>
            {barra}
          </g>
        );
      })}
    </svg>
    </div>
  );
}

/**
  La pista «pulsa una barra», con la punta de la flecha justo encima del
  centro de la ultima barra con escaños (su numero queda debajo de la punta).
*/
function PistaSobreBarra({P, W, H, L, T, B, bw, max}: {P: Partido; W: number; H: number; L: number; T: number; B: number; bw: number; max: number}) {
  let i = PEL.length - 1;
  while (i >= 0 && !((P.elections.find((e) => e.e === PEL[i][0])?.seats ?? 0) > 0)) i--;
  if (i < 0) return null;
  const s = P.elections.find((e) => e.e === PEL[i][0])!.seats!;
  const centro = L + i * bw + bw / 2, techo = T + (1 - s / max) * (H - T - B);
  // En Pista.tsx la punta esta en x=18, y=63 de un viewBox 60x70 dibujado a 46x54, con 8px de margen arriba
  const puntaX = (18 / 60) * 46, puntaY = 8 + (63 / 70) * 54;
  // Si el texto no cabe a la derecha de la punta, va a la izquierda (flecha en espejo); la punta sigue en el centro de la barra
  const derecha = centro + 160 <= W;
  return (
    <span
      className="pista-barra"
      style={derecha ? {left: centro - puntaX, top: techo - 20 - puntaY} : {right: W - (centro + puntaX), top: techo - 20 - puntaY}}
    >
      <Pista texto="pulsa una barra" lado={derecha ? 'derecha' : 'izquierda'} />
    </span>
  );
}
