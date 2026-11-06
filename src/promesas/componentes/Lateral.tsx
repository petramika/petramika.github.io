import {useEffect, useRef, type ReactNode} from 'react';
import './lateral.css';

/*
  Panel lateral (como la ficha de Filosofía): entra por la derecha con todo el
  detalle de algo que se ha pulsado. Se cierra con la ✕, con Esc o pulsando
  fuera; mientras esta abierto, la pagina de detras no se mueve y el foco va
  dentro. En el movil ocupa toda la pantalla.
*/
type Props = {
  titulo: ReactNode;
  /** Linea pequeña encima del titulo */
  antetitulo?: ReactNode;
  /** Color de la franja izquierda (el del partido, por ejemplo) */
  color?: string;
  cerrar: () => void;
  children: ReactNode;
};

export default function Lateral({titulo, antetitulo, color, cerrar, children}: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const cierre = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    cierre.current?.focus({preventScroll: true});
    const tecla = (e: KeyboardEvent) => {
      // Si hay un bocadillo del glosario abierto, Esc cierra antes ese
      if (e.key === 'Escape' && !document.querySelector('.bocadillo, .ipop:not([hidden])')) cerrar();
    };
    document.addEventListener('keydown', tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = overflow;
      antes?.focus?.({preventScroll: true});
    };
  }, [cerrar]);

  return (
    <div className="lat-fondo" onClick={cerrar}>
      <div
        ref={panel}
        className="lat"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lat-titulo"
        style={color ? {borderLeftColor: color} : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={cierre} type="button" className="lat-cerrar" onClick={cerrar} aria-label="Cerrar">
          ✕
        </button>
        {antetitulo && <p className="lat-ante">{antetitulo}</p>}
        <h2 id="lat-titulo" className="lat-titulo">
          {titulo}
        </h2>
        <div className="lat-cuerpo">{children}</div>
      </div>
    </div>
  );
}
