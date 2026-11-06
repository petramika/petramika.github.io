import {useRef, useState} from 'react';
import {LEGS, PARTY, type Legislatura} from '../../datos';
import {useEstado} from '../../estado';
import {mandatoShort, mandatoTxt, toYear, yr} from '../../lib/formato';
import Acontecimientos from './Acontecimientos';

/*
  Barra de legislaturas, leyenda y caja de acontecimientos (renderRail).
  Pasar el raton por una legislatura muestra su periodo en los
  acontecimientos sin elegirla; al salir de la barra vuelve la elegida.
*/
function railBg(l: Legislatura) {
  if (l.split) {
    const a = toYear(l.a), b = toYear(l.b), s = toYear(l.split), p = (((s - a) / (b - a)) * 100).toFixed(0);
    return `linear-gradient(90deg,${PARTY.PP.c} ${p}%,${PARTY.PSOE.c} ${p}%)`;
  }
  return PARTY[l.gov].c;
}

const NO_HOVER = matchMedia('(hover: none)').matches;

export default function Legislaturas() {
  const {current, select} = useEstado();
  // Legislatura que enseñan los acontecimientos si no es la elegida; vale solo mientras no cambie `current`
  const [vista, setVista] = useState<{base: string; id: string} | null>(null);
  const evPreview = useRef<string | null>(null);
  const mostrada = vista && vista.base === current ? vista.id : current;

  return (
    <nav aria-label="Legislaturas">
      <div className="rail-scroll">
        <div
          className="rail"
          id="rail"
          onPointerLeave={() => {
            if (evPreview.current) {
              evPreview.current = null;
              setVista(null);
            }
          }}
        >
          {LEGS.map((l) => {
            const dur = Math.max(0.6, (new Date(l.b).getTime() - new Date(l.a).getTime()) / 31557600000);
            return (
              <button
                key={l.id}
                className={`leg${l.failed ? ' failed' : ''}`}
                data-id={l.id}
                aria-pressed={l.id === current}
                style={{flex: `${dur} 1 0`, background: railBg(l)}}
                title={`${l.num} Legislatura · ${l.failed ? 'Sin investidura' : mandatoTxt(l)}`}
                onClick={() => select(l.id, !NO_HOVER)}
                onPointerOver={() => {
                  if (l.id !== evPreview.current) {
                    evPreview.current = l.id;
                    setVista({base: current, id: l.id});
                  }
                }}
                onFocus={() => setVista({base: current, id: l.id})}
              >
                <span className="r">{l.num}</span>
                <span className="y">
                  {yr(l.a)}–{String(yr(l.b)).slice(2)}
                </span>
                <span className="g">{l.failed ? 'Sin gobierno' : mandatoShort(l)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="legend">
        <span>
          <i className="sw" style={{background: '#D9262E'}} />
          Gobierno del PSOE (solo o en coalición)
        </span>
        <span>
          <i className="sw" style={{background: '#1E6FB8'}} />
          Gobierno del PP
        </span>
        <span>
          <i
            className="sw"
            style={{
              background: 'var(--soft)',
              backgroundImage: 'repeating-linear-gradient(135deg,transparent 0 3px,#B8BDC4 3px 4px)',
              boxShadow: 'inset 0 0 0 1px var(--line)',
            }}
          />
          Sin investidura, elecciones repetidas
        </span>
      </div>
      <div className="evbox">
        <div className="evhead">
          Lo que pasó en España en esos años{' '}
          <span className="note" style={{display: 'inline', margin: 0}}>
            · pasa el ratón o toca una legislatura para ver su periodo; solo se pueden abrir los acontecimientos de ese periodo
          </span>
        </div>
        <div id="ev-rail">
          <Acontecimientos key={mostrada} leg={LEGS.find((l) => l.id === mostrada) ?? null} />
        </div>
      </div>
    </nav>
  );
}
