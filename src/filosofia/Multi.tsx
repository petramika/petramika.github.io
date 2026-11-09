import {useEffect, useRef, useState, type ReactNode} from 'react';

/** Chips que caben en la caja; el resto se resume en «+N» */
const VISIBLES = 2;

export type Opcion = {id: string; nombre: string; color?: string; antes?: ReactNode; cuenta?: number; ayuda?: string};

/**
  Selector multiple compacto: una caja con su titulo y, dentro, lo elegido como
  chips (con su color, y una × para quitarlo). Al pulsar se despliega la lista
  de opciones para marcar o desmarcar varias.
*/
export default function Multi({
  titulo,
  opciones,
  elegidos,
  alternar,
  limpiar,
  desactivado = false,
  ayuda,
}: {
  titulo: string;
  opciones: readonly Opcion[];
  elegidos: Set<string>;
  alternar: (id: string) => void;
  limpiar: () => void;
  /** En gris y sin abrirse (p. ej. la historia cuando no se ve) */
  desactivado?: boolean;
  ayuda?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (desactivado) setAbierto(false);
  }, [desactivado]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => !caja.current?.contains(e.target as Node) && setAbierto(false);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  const marcadas = opciones.filter((o) => elegidos.has(o.id));
  const punto = (o: Opcion) => (o.antes ? <span className="multi-antes" aria-hidden="true">{o.antes}</span> : o.color ? <i className="multi-punto" style={{background: o.color}} aria-hidden="true" /> : null);

  return (
    <div className={`multi${abierto ? ' abierto' : ''}${marcadas.length ? ' con' : ''}${desactivado ? ' desactivado' : ''}`} ref={caja} title={ayuda}>
      <div className="multi-caja" onClick={(e) => !desactivado && e.target === e.currentTarget && setAbierto((a) => !a)}>
        <button ref={boton} type="button" className="multi-titulo" aria-haspopup="listbox" aria-expanded={abierto} disabled={desactivado} onClick={() => setAbierto((a) => !a)}>
          {titulo}
          {!marcadas.length && <span className="multi-todos">Todos</span>}
        </button>
        {marcadas.slice(0, VISIBLES).map((o) => (
          <span key={o.id} className="multi-chip" style={o.color ? {['--c' as string]: o.color} : undefined}>
            {punto(o)}
            <span className="multi-chip-nombre">{o.nombre}</span>
            <button type="button" disabled={desactivado} onClick={() => alternar(o.id)} aria-label={`Quitar ${o.nombre}`}>
              ×
            </button>
          </span>
        ))}
        {marcadas.length > VISIBLES && (
          <button type="button" className="multi-mas" disabled={desactivado} onClick={() => setAbierto(true)} title={marcadas.slice(VISIBLES).map((o) => o.nombre).join(', ')}>
            +{marcadas.length - VISIBLES}
          </button>
        )}
        {marcadas.length > 0 && (
          <button type="button" className="multi-borrar" disabled={desactivado} onClick={limpiar} aria-label={`Quitar todo de ${titulo}`} title="Quitar todo">
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
              <path d="M3 3l6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button type="button" className="multi-flecha" tabIndex={-1} aria-hidden="true" disabled={desactivado} onClick={() => setAbierto((a) => !a)}>
          <svg viewBox="0 0 12 12" width="10" height="10">
            <path d="M2 4.5 6 8l4-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {abierto && (
        <div className="multi-menu" role="listbox" aria-multiselectable="true" aria-label={titulo}>
          {opciones.map((o) => (
            <button key={o.id} type="button" role="option" aria-selected={elegidos.has(o.id)} className="multi-op" title={o.ayuda} onClick={() => alternar(o.id)}>
              <span className="multi-check" aria-hidden="true">
                {elegidos.has(o.id) ? '✓' : ''}
              </span>
              {punto(o)}
              <span className="multi-nombre">{o.nombre}</span>
              {o.cuenta != null && <small>{o.cuenta}</small>}
            </button>
          ))}
          {marcadas.length > 0 && (
            <button type="button" className="multi-limpiar" onClick={limpiar}>
              Quitar todos
            </button>
          )}
        </div>
      )}
    </div>
  );
}
