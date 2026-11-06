import {CAT} from './config';
import {Texto} from '../comun/Glosario';
import Retrato from './Retrato';
import type {Filosofo} from './tipos';

/** Un filosofo en la linea del tiempo. Toda la tarjeta abre su ficha; las palabras del glosario tienen su propio clic. */
export default function Tarjeta({f, abrir}: {f: Filosofo; abrir: (id: string) => void}) {
  return (
    <article className="tarjeta" onClick={() => abrir(f.id)} style={{['--c1' as string]: f.categorias[0] ? CAT[f.categorias[0]].color : 'var(--suave)'}}>
      <Retrato nombre={f.nombre} img={f.img} cats={f.categorias} size={68} />
      <div className="t-cuerpo">
        <h3>
          <button type="button" className="t-nombre" onClick={(e) => (e.stopPropagation(), abrir(f.id))}>
            {f.nombre}
          </button>
        </h3>
        <p className="t-fechas">
          {f.fechas}
          {f.region && <span> · {f.region}</span>}
        </p>
        {f.conocidoPor && (
          <p className="t-conocido">
            <Texto>{f.conocidoPor}</Texto>
          </p>
        )}
        {f.categorias.length > 0 && (
          <p className="t-cats">
            {f.categorias.map((c) => (
              <span key={c} style={{['--c' as string]: CAT[c].color}}>
                {CAT[c].nombre}
              </span>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}
