import {CAT, ERAS, type EraId} from './config';
import type {Filosofo} from './tipos';

/*
  Vista de pajaro: las cuatro edades, con los años de corte bien marcados, y
  una rayita por filosofo en el momento en que trabajo. Pulsar una edad la
  filtra; pulsar una rayita abre su ficha. Las edades van a lo ancho igual,
  aunque duren distinto: si fueran proporcionales, la Contemporanea seria un
  hilo con 100 filosofos apretados.
*/
type Props = {todos: Filosofo[]; visibles: Set<string>; era: EraId | null; elegirEra: (e: EraId | null) => void; abrir: (id: string) => void};

export default function Linea({todos, visibles, era, elegirEra, abrir}: Props) {
  return (
    <div className="linea" role="group" aria-label="Las cuatro edades de la historia">
      <div className="linea-tramos">
        {ERAS.map((e) => {
          const suyos = todos.filter((f) => f.era === e.id);
          return (
            <button
              key={e.id}
              type="button"
              className={`tramo${era === e.id ? ' on' : ''}${era && era !== e.id ? ' off' : ''}`}
              aria-pressed={era === e.id}
              onClick={() => elegirEra(era === e.id ? null : e.id)}
            >
              <span className="tramo-nombre">
                {e.nombre} <small>{suyos.length}</small>
              </span>
              <span className="tramo-rayas" aria-hidden="true">
                {suyos.map((f) => {
                  const x = Math.min(99, Math.max(1, ((f.fl - e.desde) / (Math.min(e.hasta, 2010) - e.desde)) * 100));
                  return (
                    <i
                      key={f.id}
                      title={`${f.nombre} (${f.fechas})`}
                      className={visibles.has(f.id) ? undefined : 'apagada'}
                      style={{left: x + '%', background: f.categorias[0] ? CAT[f.categorias[0]].color : 'var(--suave)'}}
                      onClick={(ev) => (ev.stopPropagation(), abrir(f.id))}
                    />
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>
      <div className="linea-anios" aria-hidden="true">
        {ERAS.map((e, i) => (
          <span key={e.id} style={{left: `${(i * 100) / ERAS.length}%`}} className={i === 0 ? 'primero' : undefined}>
            {e.desdeTxt}
          </span>
        ))}
        <span style={{left: '100%'}} className="ultimo">
          hoy
        </span>
      </div>
    </div>
  );
}
