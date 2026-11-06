import FuenteDot from '../../componentes/FuenteDot';
import Icono from '../../componentes/Icono';
import {AREA_ICON} from '../../componentes/iconos';
import {TOPICS, type Propuesta} from './datos';
import Tema from './Tema';

/** Propuestas de una eleccion; las que tienen tema se despliegan con pros y contras (pitems) */
export default function ListaPropuestas({items}: {items: Propuesta[]}) {
  if (!items.length) return <p className="note">No se han encontrado propuestas con fuente para esta elección.</p>;
  return (
    <ul className="plist">
      {items.map((it, i) => {
        const T = it.topic && TOPICS[it.topic];
        const head = (
          <>
            <span className="area">
              <Icono k={AREA_ICON[it.area] || 'inst'} />
              {it.area}
            </span>
            <span className="ptxt">
              <FuenteDot src={{psrc: it.src, purl: it.url, pmedio: it.medio}} />
              {it.text}
            </span>
          </>
        );
        return T ? (
          <li key={i}>
            <details className="pdet">
              <summary>
                {head}
                <span className="more">Pros y contras</span>
              </summary>
              <Tema T={T} />
            </details>
          </li>
        ) : (
          <li key={i} className="pstatic">
            {head}
          </li>
        );
      })}
    </ul>
  );
}
