import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

/*
  Punto de fuente: verde si la promesa sale del programa o de un documento
  oficial del partido, naranja si sale de la prensa. Con raton, la etiqueta
  la pinta el CSS (.sdot:hover::after con data-tip). En pantallas tactiles,
  tocarlo abre una ventanita con el texto y el enlace (el .srcpop). La
  ventanita va al final de <body>: si el punto esta dentro de un <summary>,
  tocarla no debe abrir ni cerrar el desplegable.
*/
type Fuente = {psrc?: string; purl?: string; pmedio?: string};

let cerrarAbierto: (() => void) | null = null;

export default function FuenteDot({src}: {src: Fuente}) {
  const prensa = src.psrc === 'm';
  const lab = prensa ? `Extraído de la prensa${src.pmedio ? ' · ' + src.pmedio : ''}` : 'Extraído del programa o de un documento oficial del partido';
  const [pos, setPos] = useState<{left: number; top: number; width: number} | null>(null);

  useEffect(() => {
    if (!pos) return;
    const cerrar = () => setPos(null);
    cerrarAbierto = cerrar;
    const fuera = (e: MouseEvent) => !(e.target as Element).closest?.('.srcpop, .sdot') && cerrar();
    addEventListener('scroll', cerrar, {passive: true});
    document.addEventListener('click', fuera);
    return () => {
      removeEventListener('scroll', cerrar);
      document.removeEventListener('click', fuera);
    };
  }, [pos]);

  return (
    <>
      <a
        className={`sdot ${prensa ? 'm' : 'p'}`}
        href={src.purl || '#'}
        target="_blank"
        rel="noopener"
        aria-label={lab}
        data-tip={lab + ' — ' + (src.purl || '')}
        onClick={(e) => {
          if (!matchMedia('(hover: none)').matches) return;
          e.preventDefault();
          cerrarAbierto?.();
          const r = e.currentTarget.getBoundingClientRect(), w = Math.min(320, innerWidth - 24);
          setPos({width: w, left: Math.max(12, Math.min(r.left - 8, innerWidth - w - 12)), top: r.bottom + 8});
        }}
      />
      {pos &&
        createPortal(
          <div className="srcpop" style={pos}>
            <div>{lab}</div>
            {src.purl && (
              <a href={src.purl} target="_blank" rel="noopener">
                Abrir la fuente ↗
              </a>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
