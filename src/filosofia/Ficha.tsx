import {useEffect, useRef, useState} from 'react';
import {CAT, ERAS} from './config';
import {Texto} from '../comun/Glosario';
import Retrato from './Retrato';
import type {Ficha as FichaT, Filosofo} from './tipos';

// Las fichas pesan: se descargan la primera vez que se abre una
let fichas: Record<string, FichaT> | null = null;
const cargar = () => import('./datos/fichas.json').then((m) => (fichas = m.default as unknown as Record<string, FichaT>));

const ICONO: Record<string, string> = {wiki: 'W', enciclopedia: '📚', texto: '📜', libro: '📖', frases: '❝', articulo: '📰', video: '▶', web: '↗'};

type Props = {f: Filosofo; todos: Filosofo[]; abrir: (id: string) => void; cerrar: () => void};

export default function Ficha({f, todos, abrir, cerrar}: Props) {
  const [d, setD] = useState<FichaT | null>(fichas?.[f.id] ?? null);
  const panel = useRef<HTMLDivElement>(null);
  const cierre = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (fichas) setD(fichas[f.id]);
    else cargar().then((x) => setD(x[f.id]));
    panel.current?.scrollTo({top: 0});
  }, [f.id]);

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

  const nombreDe = (id: string) => todos.find((x) => x.id === id);
  const influyeEn = (d?.influyeEn ?? []).map(nombreDe).filter(Boolean) as Filosofo[];
  const influidoPor = todos.filter((x) => x.id !== f.id && (fichas?.[x.id]?.influyeEn ?? []).includes(f.id));
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

        {!d ? (
          <p className="ficha-cargando">Cargando…</p>
        ) : (
          <>
            {d.resumen && (
              <section>
                <h3>Por qué es famoso</h3>
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
