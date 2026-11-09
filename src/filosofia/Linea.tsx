import {useRef, useState} from 'react';
import {CAT, ERAS, type EraId} from './config';
import Retrato from './Retrato';
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
  // Tarjetita al pasar por una raya: sale al instante (el title del navegador tarda y no deja claro de quien es)
  const caja = useRef<HTMLDivElement>(null);
  const [enc, setEnc] = useState<{f: Filosofo; x: number; y: number; lado: 'centro' | 'izq' | 'der'} | null>(null);
  const mostrar = (f: Filosofo, el: HTMLElement) => {
    const r = el.getBoundingClientRect(), c = caja.current!.getBoundingClientRect();
    const x = r.left + r.width / 2 - c.left;
    // Cerca de los bordes la tarjeta se abre hacia dentro; la flecha siempre apunta a la raya
    setEnc({f, x, y: r.top - c.top, lado: x < 170 ? 'izq' : x > c.width - 170 ? 'der' : 'centro'});
  };
  return (
    <div className="linea" role="group" aria-label="Las cuatro edades de la historia" ref={caja} onMouseLeave={() => setEnc(null)}>
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
                      aria-label={`${f.nombre} (${f.fechas})`}
                      className={`${visibles.has(f.id) ? '' : 'apagada'}${enc?.f.id === f.id ? ' encima' : ''}`.trim() || undefined}
                      onMouseEnter={(ev) => mostrar(f, ev.currentTarget)}
                      onMouseLeave={() => setEnc(null)}
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
      {enc && (
        <div className={`linea-tip ${enc.lado}`} style={{left: enc.x, top: enc.y}} aria-hidden="true">
          <Retrato nombre={enc.f.nombre} img={enc.f.img} cats={enc.f.categorias} size={34} liso />
          <span>
            <b>{enc.f.nombre}</b>
            <small>{enc.f.fechas}</small>
            <span className="linea-tip-cats">
              {enc.f.categorias.map((c) => (
                <span key={c}>
                  <i style={{background: CAT[c].color}} />
                  {CAT[c].nombre}
                </span>
              ))}
            </span>
          </span>
        </div>
      )}
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
