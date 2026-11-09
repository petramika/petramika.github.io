import {useEffect, useRef, useState} from 'react';
import {CAT, ERAS, FAMAS} from './config';
import {Texto} from '../comun/Glosario';
import Retrato from './Retrato';
import type {Ficha as FichaT, Filosofo} from './tipos';

// Las fichas pesan: estan en trozos de 40 y se baja solo el de la que se abre
const TROZOS = import.meta.glob<{default: Record<string, FichaT>}>('./datos/fichas/*.json');
const cache = new Map<number, Record<string, FichaT>>();
export const cargarFicha = async (f: Filosofo) => {
  if (!cache.has(f.t)) cache.set(f.t, (await TROZOS[`./datos/fichas/${String(f.t).padStart(2, '0')}.json`]()).default);
  return cache.get(f.t)![f.id];
};

const ICONO: Record<string, string> = {wiki: 'W', enciclopedia: '📚', texto: '📜', libro: '📖', frases: '❝', articulo: '📰', video: '▶', web: '↗'};

type Props = {f: Filosofo; todos: Filosofo[]; abrir: (id: string) => void; cerrar: () => void};

/** Reconocimiento: cuatro puntos y su nivel (Baja, Media, Alta, Muy alta) */
function Relevancia({f}: {f: Filosofo}) {
  const x = f.fama;
  if (!x) return null;
  const nivel = FAMAS.find((n) => n.n === x.n)!;
  return (
    <p className="ficha-relevancia" title="Según cuántos papers académicos lo nombran, cuánta gente lee su Wikipedia y en cuántos idiomas está">
      <span className="fr-titulo">Reconocimiento</span>
      <span className="fama-puntos" aria-hidden="true">
        {'●'.repeat(x.n)}
        <span className="apagados">{'●'.repeat(4 - x.n)}</span>
      </span>
      <strong>{nivel.nombre}</strong>
    </p>
  );
}

export default function Ficha({f, todos, abrir, cerrar}: Props) {
  const [d, setD] = useState<FichaT | null>(cache.get(f.t)?.[f.id] ?? null);
  const panel = useRef<HTMLDivElement>(null);
  const cierre = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let vivo = true;
    setD(cache.get(f.t)?.[f.id] ?? null);
    cargarFicha(f).then((x) => vivo && setD(x));
    panel.current?.scrollTo({top: 0});
    return () => {
      vivo = false;
    };
  }, [f]);

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
      document.body.style.overflow = document.querySelector('.hist-fondo') ? 'hidden' : '';
      antes?.focus?.({preventScroll: true});
    };
  }, [cerrar]);

  const nombreDe = (id: string) => todos.find((x) => x.id === id);
  const influyeEn = (d?.influyeEn ?? []).map(nombreDe).filter(Boolean) as Filosofo[];
  const influidoPor = (d?.influidoPor ?? []).map(nombreDe).filter(Boolean) as Filosofo[];
  const era = ERAS.find((e) => e.id === f.era)!;

  return (
    <div className="ficha-fondo" onClick={cerrar}>
      <div ref={panel} className="ficha" role="dialog" aria-modal="true" aria-labelledby="ficha-nombre" onClick={(e) => e.stopPropagation()}>
        <button ref={cierre} type="button" className="ficha-cerrar" onClick={cerrar} aria-label="Cerrar">
          ✕
        </button>
        <header className="ficha-cabeza">
          <Retrato nombre={f.nombre} img={f.img} cats={f.categorias} size={124} eager />
          <div>
            <p className="ficha-era">{era.nombre}</p>
            <h2 id="ficha-nombre">{f.nombre}</h2>
            <p className="ficha-fechas">
              {f.fechas}
              {f.region && <> · {f.region}</>}
            </p>
            {f.escuela && <p className="ficha-escuela">{f.escuela}</p>}
          </div>
        </header>
        {f.categorias.length > 0 && (
          <p className="t-cats grande">
            {f.categorias.map((c) => (
              <span key={c} style={{['--c' as string]: CAT[c].color}} title={CAT[c].pregunta}>
                {CAT[c].nombre}
              </span>
            ))}
          </p>
        )}

        <Relevancia f={f} />

        {!d ? (
          <div className="ficha-esqueleto" aria-label="Cargando" role="status">
            <i className="e-titulo" />
            <i />
            <i />
            <i className="corta" />
            <i className="e-titulo" />
            <i />
            <i className="corta" />
          </div>
        ) : (
          <>
            {d.resumen && (
              <section>
                <h3>En qué destacó</h3>
                <p className="ficha-resumen">
                  <Texto>{d.resumen}</Texto>
                </p>
              </section>
            )}
            {d.ideas && d.ideas.length > 0 && (
              <section>
                <h3>Sus ideas, en fácil</h3>
                <ul className="ficha-ideas">
                  {d.ideas.map((x, i) => (
                    <li key={i}>
                      <Texto>{x}</Texto>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {d.frase && (
              <figure className="ficha-frase">
                <blockquote>«{d.frase.texto}»</blockquote>
                <figcaption>{d.frase.fuente}</figcaption>
              </figure>
            )}
            {d.curiosidad && (
              <section className="ficha-curiosidad">
                <h3>¿Sabías que…?</h3>
                <p>
                  <Texto>{d.curiosidad}</Texto>
                </p>
              </section>
            )}
            {d.obras.length > 0 && (
              <section>
                <h3>Sus obras</h3>
                <ul className="ficha-obras">
                  {d.obras.map((o) => (
                    <li key={o.titulo}>
                      {o.url ? (
                        <a href={o.url} target="_blank" rel="noopener">
                          <i>{o.titulo}</i>
                        </a>
                      ) : (
                        <i>{o.titulo}</i>
                      )}
                      {o.anio && <span className="anio"> {o.anio}</span>}
                      {o.deQueVa && <span className="dequeva">{o.deQueVa}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {d.enlaces.length > 0 && (
              <section>
                <h3>Para saber más</h3>
                <ul className="ficha-enlaces">
                  {d.enlaces.map((e) => (
                    <li key={e.url}>
                      <a href={e.url} target="_blank" rel="noopener">
                        <span className="ico" aria-hidden="true">
                          {ICONO[e.tipo] ?? '↗'}
                        </span>
                        {e.titulo}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {(influidoPor.length > 0 || influyeEn.length > 0) && (
              <section>
                <h3>Conexiones</h3>
                {influidoPor.length > 0 && (
                  <p className="ficha-con">
                    <span>Le influyeron:</span>
                    {influidoPor.map((x) => (
                      <button key={x.id} type="button" onClick={() => abrir(x.id)}>
                        {x.nombre}
                      </button>
                    ))}
                  </p>
                )}
                {influyeEn.length > 0 && (
                  <p className="ficha-con">
                    <span>Influyó en:</span>
                    {influyeEn.map((x) => (
                      <button key={x.id} type="button" onClick={() => abrir(x.id)}>
                        {x.nombre}
                      </button>
                    ))}
                  </p>
                )}
              </section>
            )}
            <p className="ficha-pie">
              {d.commons && (
                <>
                  <a href={d.commons} target="_blank" rel="noopener">
                    Retrato: Wikimedia Commons
                  </a>{' '}
                  ·{' '}
                </>
              )}
              <a href={d.wikidata} target="_blank" rel="noopener">
                Datos: Wikidata
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
