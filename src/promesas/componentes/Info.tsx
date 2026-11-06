import {useCallback, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import Lateral from './Lateral';

/*
  El boton (i). Al pulsarlo (o tocarlo en el movil) se abre un panel lateral
  con toda la explicacion, que cabe entera y se lee con calma, en vez de una
  ventanita que en el movil no cabia. Sin efecto al pasar el raton.

  El titulo del panel: el que se le pase o, si no, el del encabezado donde
  esta la (i) («De un vistazo», «Condenados por cada 1.000 adultos»…).
*/
export default function Info({children, html, etiqueta = 'Más información', titulo, antetitulo}: {
  children?: ReactNode;
  /** HTML de confianza (escrito por la autora), cuando el texto viene de un JSON con marcas */
  html?: string;
  etiqueta?: string;
  /** Titulo del panel (si no, el del encabezado que contiene la (i)) */
  titulo?: ReactNode;
  /** Linea pequeña encima del titulo; por defecto «Sobre esta gráfica» si es una grafica */
  antetitulo?: ReactNode;
  /** Ya no se usa (era el ancho de la ventanita); se acepta para no romper llamadas antiguas */
  ancho?: number;
}) {
  const [abierto, setAbierto] = useState<{titulo: ReactNode} | null>(null);
  const cerrar = useCallback(() => setAbierto(null), []);

  if (!children && !html) return null;
  return (
    <span className="iwrap">
      <button
        type="button"
        className="ibtn"
        aria-label={etiqueta}
        aria-haspopup="dialog"
        aria-expanded={abierto != null}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Sin titulo propio: el texto del encabezado que contiene la (i), sin la «i» del boton
          const cab = e.currentTarget.closest('h1, h2, h3, h4, h5, summary, .chead') as HTMLElement | null;
          let deCabecera = '';
          if (cab) {
            const copia = cab.cloneNode(true) as HTMLElement;
            copia.querySelectorAll('.iwrap, .veredicto').forEach((n) => n.remove());
            deCabecera = (copia.textContent ?? '').replace(/\s+/g, ' ').trim();
          }
          setAbierto({titulo: titulo ?? (deCabecera || etiqueta)});
        }}
      >
        i
      </button>
      {abierto &&
        createPortal(
          <Lateral antetitulo={antetitulo ?? (titulo ? 'Sobre esta gráfica' : undefined)} titulo={abierto.titulo} cerrar={cerrar}>
            <div className="lat-info" {...(html ? {dangerouslySetInnerHTML: {__html: html}} : {children})} />
          </Lateral>,
          document.body,
        )}
    </span>
  );
}
