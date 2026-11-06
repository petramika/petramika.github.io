import {PARTIES, type Partido} from './datos';

const GRUPOS = [...new Set(PARTIES.map((p) => p.grp))];

type Props = {sel: string; elegir: (key: string) => void; visible: (P: Partido) => boolean};

/** Botones de partido agrupados; los que nunca sacaron escaños van con borde discontinuo (.new) */
export default function ChipsPartidos({sel, elegir, visible}: Props) {
  return (
    <div className="pchips" id="pchips">
      {GRUPOS.map((g) => {
        const ps = PARTIES.filter((p) => p.grp === g && visible(p));
        // Un grupo sin partidos dentro del filtro de años no se pinta
        if (!ps.length) return null;
        return (
          <div key={g} className="pgrp">
            <span className="pglab">{g}</span>
            {ps.map((P) => {
              const never = !P.elections.some((e) => (e.seats ?? 0) > 0);
              return (
                <button key={P.key} type="button" data-party2={P.key} aria-pressed={P.key === sel} className={never ? 'new' : ''} onClick={() => elegir(P.key)}>
                  <i className="sw" style={{background: P.color}} />
                  {P.n}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
