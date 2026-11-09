import {useEffect, useLayoutEffect, useRef, useState, type ReactNode} from 'react';

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

  // Se ven los chips que caben en la caja; el resto se resume en «+N» (el primero siempre, encogido si hace falta)
  const fila = useRef<HTMLSpanElement>(null);
  const [caben, setCaben] = useState(marcadas.length);
  const clave = marcadas.map((o) => o.id).join();
  useLayoutEffect(() => {
    const el = fila.current;
    if (!el) return;
    const medir = () => {
      // Anchos naturales (los que no caben van fuera del flujo, pero se pueden medir igual)
      let usado = 0;
      let n = 0;
      for (const c of [...el.children] as HTMLElement[]) {
        usado += Math.max(c.offsetWidth, c.scrollWidth) + (n ? 5 : 0);
        if (n && usado > el.clientWidth + 1) break;
        n++;
      }
      setCaben(n);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [clave]);
  const ocultas = marcadas.slice(caben);
  const punto = (o: Opcion) => (o.antes ? <span className="multi-antes" aria-hidden="true">{o.antes}</span> : o.color ? <i className="multi-punto" style={{background: o.color}} aria-hidden="true" /> : null);

  return (
    <div className={`multi${abierto ? ' abierto' : ''}${marcadas.length ? ' con' : ''}${desactivado ? ' desactivado' : ''}`} ref={caja} title={ayuda}>
      <div className="multi-caja" onClick={(e) => !desactivado && (e.target === e.currentTarget || e.target === fila.current) && setAbierto((a) => !a)}>
        <button ref={boton} type="button" className="multi-titulo" aria-haspopup="listbox" aria-expanded={abierto} disabled={desactivado} onClick={() => setAbierto((a) => !a)}>
          {titulo}
        </button>
        <span className="multi-fila" ref={fila}>
        {marcadas.map((o, i) => (
          <span key={o.id} className={`multi-chip${i >= caben ? ' fuera' : ''}`} style={o.color ? {['--c' as string]: o.color} : undefined} aria-hidden={i >= caben || undefined}>
            {punto(o)}
            <span className="multi-chip-nombre">{o.nombre}</span>
            <button type="button" disabled={desactivado} tabIndex={i >= caben ? -1 : undefined} onClick={() => alternar(o.id)} aria-label={`Quitar ${o.nombre}`}>
              ×
            </button>
          </span>
        ))}
        </span>
        {ocultas.length > 0 && (
          <button type="button" className="multi-mas" disabled={desactivado} onClick={() => setAbierto(true)} title={ocultas.map((o) => o.nombre).join(', ')}>
            +{ocultas.length}
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
