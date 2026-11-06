import {actualizado} from './actualizado';
import './pie.css';

/*
  El pie de todas las paginas, el mismo que cierra ROTA: el nombre, el año,
  quien lo hace, cuando se actualizo y una carpeta que lleva al indice con
  todos los proyectos (en el propio indice no sale: ya estas ahi).
*/
export function Carpeta({className}: {className?: string}) {
  return (
    <a href="/" className={className} aria-label="Todos los proyectos" title="Todos los proyectos">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      </svg>
    </a>
  );
}

export default function Pie({marca, fuente, indice}: {marca?: string; fuente?: string; indice?: boolean}) {
  return (
    <footer className="pie-sitio">
      {marca && (
        <p className="pie-marca" style={fuente ? {fontFamily: fuente} : undefined}>
          {marca}
        </p>
      )}
      <p className="pie-linea tenue">© {new Date().getFullYear()}</p>
      <p className="pie-linea">
        <span>Desarrollado y diseñado por Anne</span>
        {!indice && <Carpeta className="pie-carpeta" />}
      </p>
      <p className="pie-linea tenue">Actualizado · {actualizado}</p>
    </footer>
  );
}
