import {useEffect, useRef, type ReactNode} from 'react';

/** Pestaña lateral, la misma que la ficha de los filosofos, para lo que no es un filosofo (edades, historia) */
export default function Lateral({cerrar, etiqueta, children}: {cerrar: () => void; etiqueta: string; children: ReactNode}) {
  const cierre = useRef<HTMLButtonElement>(null);

  // Foco dentro, Esc cierra, el fondo no se mueve
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    cierre.current?.focus({preventScroll: true});
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.bocadillo')) cerrar();
    };
    document.addEventListener('keydown', tecla);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = '';
      antes?.focus?.({preventScroll: true});
    };
  }, [cerrar]);

  return (
    <div className="ficha-fondo" onClick={cerrar}>
      <div className="ficha lateral" role="dialog" aria-modal="true" aria-label={etiqueta} onClick={(e) => e.stopPropagation()}>
        <button ref={cierre} type="button" className="ficha-cerrar" onClick={cerrar} aria-label="Cerrar">
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
