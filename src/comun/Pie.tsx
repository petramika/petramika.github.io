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

const REPO = 'https://github.com/petramika/petramika.github.io';

function Github({className}: {className?: string}) {
  return (
    <a href="https://github.com/petramika" className={className} aria-label="GitHub de Anne" title="GitHub" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
        <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
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
        <span className="pie-iconos">
          <Github className="pie-carpeta" />
          {!indice && <Carpeta className="pie-carpeta" />}
        </span>
      </p>
      <p className="pie-linea">
        <a className="pie-ticket" href={`${REPO}/issues/new`} target="_blank" rel="noopener">
          ¿Dudas o ideas? Abre un ticket ↗
        </a>
      </p>
      <p className="pie-linea tenue">Actualizado · {actualizado}</p>
    </footer>
  );
}
