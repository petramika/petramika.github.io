import {Fragment, useEffect, useMemo, useState} from 'react';
import {CAT, COLOR_EDAD, ERAS, ETAPAS, anioTxt, numSiglo, siglo, type EraId} from './config';
import {Texto} from '../comun/Glosario';
import Retrato from './Retrato';
import {TIPOS, cargarHistoria, historiaCargada, type DatosHistoria, type Evento, type Frase, type Periodo} from './historia';
import type {Filosofo} from './tipos';

/*
  Cronologia: la historia y los filosofos en una sola columna del tiempo.
  A la izquierda, lo que pasaba en el mundo (acontecimientos, periodos y
  frases que dieron que hablar); a la derecha, los filosofos de esa epoca.
  Cada siglo empieza plegado, con lo mas importante, y «Ver todo» lo
  despliega entero: es el zoom. Se puede esconder la historia y dejar solo a
  los filosofos, con un resumen de una linea por siglo.
*/
type Item =
  | {k: 'evento'; anio: number; e: Evento}
  | {k: 'periodo'; anio: number; p: Periodo}
  | {k: 'frase'; anio: number; fr: Frase}
  | {k: 'filosofo'; anio: number; f: Filosofo};

type Props = {
  /** Filosofos que pasan los filtros */
  visibles: Filosofo[];
  /** Si hay filtros que afectan a los filosofos (busqueda, temas, sexo, reconocimiento) */
  filtrando: boolean;
  era: EraId | null;
  abrir: (id: string) => void;
};

const leer = (k: string, porDefecto: string) => {
  try {
    return localStorage.getItem(k) ?? porDefecto;
  } catch {
    return porDefecto;
  }
};
const guardar = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sin almacenamiento: da igual */
  }
};

export default function Cronologia({visibles, filtrando, era, abrir}: Props) {
  const [datos, setDatos] = useState<DatosHistoria | null>(historiaCargada());
  const [tipos, setTipos] = useState<Set<string>>(new Set());
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());
  const [conHistoria, setConHistoria] = useState(() => leer('filo-historia', 'si') === 'si');
  const [detalle, setDetalle] = useState<string | null>(null);

  useEffect(() => {
    if (!datos) cargarHistoria().then(setDatos);
  }, [datos]);

  const cambiarHistoria = (v: boolean) => {
    setConHistoria(v);
    guardar('filo-historia', v ? 'si' : 'no');
  };
  const alternarSiglo = (k: number) =>
    setAbiertos((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  // Todo lo que pasa en cada siglo
  const siglos = useMemo(() => {
    const rango = era ? ERAS.find((e) => e.id === era)! : null;
    const dentro = (a: number) => !rango || (a >= rango.desde && a < rango.hasta);
    const m = new Map<number, {eventos: Evento[]; periodos: Periodo[]; frases: Frase[]; fil: Filosofo[]}>();
    const de = (a: number) => {
      const k = numSiglo(a);
      if (!m.has(k)) m.set(k, {eventos: [], periodos: [], frases: [], fil: []});
      return m.get(k)!;
    };
    visibles.forEach((f) => de(f.fl).fil.push(f));
    if (datos) {
      datos.eventos.filter((e) => dentro(e.anio) && (!tipos.size || tipos.has(e.tipo))).forEach((e) => de(e.anio).eventos.push(e));
      if (!tipos.size) {
        datos.periodos.filter((p) => dentro(p.desde)).forEach((p) => de(p.desde).periodos.push(p));
        datos.frases.filter((f) => dentro(f.anio)).forEach((f) => de(f.anio).frases.push(f));
      }
    }
    return [...m.entries()]
      .filter(([, s]) => s.fil.length || (conHistoria && !filtrando && (s.eventos.length || s.frases.length)))
      .sort((a, b) => a[0] - b[0]);
  }, [visibles, datos, tipos, era, filtrando, conHistoria]);

  return (
    <div className={`crono${conHistoria ? '' : ' sin-historia'}`}>
      <div className="crono-barra">
        <div className="modo-busca" role="group" aria-label="Historia a la izquierda">
          <button type="button" aria-pressed={conHistoria} onClick={() => cambiarHistoria(true)}>
            Con historia
          </button>
          <button type="button" aria-pressed={!conHistoria} onClick={() => cambiarHistoria(false)}>
            Solo filósofos
          </button>
        </div>
        {conHistoria && (
          <p className="hist-leyenda" role="group" aria-label="Filtrar acontecimientos por tipo">
            {Object.entries(TIPOS).map(([k, t]) => (
              <button
                key={k}
                type="button"
                style={{['--c' as string]: t.color}}
                aria-pressed={tipos.has(k)}
                className={tipos.size && !tipos.has(k) ? 'apagado' : undefined}
                onClick={() =>
                  setTipos((s) => {
                    const n = new Set(s);
                    n.has(k) ? n.delete(k) : n.add(k);
                    return n;
                  })
                }
              >
                {t.nombre}
              </button>
            ))}
            {tipos.size > 0 && (
              <button type="button" className="hist-todos" onClick={() => setTipos(new Set())}>
                Ver todos
              </button>
            )}
          </p>
        )}
        <button
          type="button"
          className="crono-desplegar"
          onClick={() => setAbiertos(abiertos.size >= siglos.length ? new Set() : new Set(siglos.map(([k]) => k)))}
        >
          {abiertos.size >= siglos.length ? 'Plegar todos los siglos' : 'Desplegar todos los siglos'}
        </button>
      </div>

      {siglos.length === 0 && <p className="vacio">Nadie cumple esos filtros. Prueba a quitar alguno.</p>}

      {siglos.map(([k, s]) => {
        const abierto = abiertos.has(k);
        const anioRef = k < 0 ? k * 100 + 50 : k * 100 - 50;
        const edad = anioRef < ERAS[0].desde ? ERAS[0] : ERAS.find((e) => anioRef >= e.desde && anioRef < e.hasta) ?? ERAS[ERAS.length - 1];
        const etapas = ETAPAS.filter((et) => et.desde < (k < 0 ? (k + 1) * 100 : k * 100) && et.hasta > (k < 0 ? k * 100 : (k - 1) * 100));

        // Plegado: lo mas importante. Desplegado: todo.
        const evs = [...s.eventos].sort((a, b) => a.nivel - b.nivel || a.anio - b.anio);
        const eventos = abierto ? evs : evs.slice(0, 4);
        const periodos = abierto ? s.periodos : s.periodos.filter((p) => p.nivel === 1);
        const frases = abierto ? s.frases : s.frases.filter((f) => f.nivel === 1).slice(0, 2);
        const fils = [...s.fil].sort((a, b) => (a.fama?.puesto ?? 9999) - (b.fama?.puesto ?? 9999));
        const importantes = fils.filter((f) => (f.fama?.n ?? 0) >= 3);
        const filosofos = abierto || filtrando ? fils : (importantes.length >= 3 ? importantes : fils.slice(0, 3)).slice(0, 8);
        const ocultos = (conHistoria ? s.eventos.length - eventos.length + (s.periodos.length - periodos.length) + (s.frases.length - frases.length) : 0) + (fils.length - filosofos.length);

        const items: Item[] = [
          ...filosofos.map((f) => ({k: 'filosofo' as const, anio: f.fl, f})),
          ...(conHistoria
            ? [
                ...eventos.map((e) => ({k: 'evento' as const, anio: e.anio, e})),
                ...periodos.map((p) => ({k: 'periodo' as const, anio: p.desde, p})),
                ...frases.map((fr) => ({k: 'frase' as const, anio: fr.anio, fr})),
              ]
            : []),
        ].sort((a, b) => a.anio - b.anio || (a.k === 'filosofo' ? 1 : -1));

        return (
          <section key={k} className="crono-siglo" style={{['--edad' as string]: COLOR_EDAD[edad.id]}} aria-labelledby={`siglo-${k}`}>
            <header className="crono-cabeza">
              <h3 id={`siglo-${k}`}>{siglo(anioRef)}</h3>
              <p className="crono-etapas">
                <span className="crono-edad">{edad.nombre}</span>
                {etapas.map((et) => (
                  <span key={et.nombre}>{et.nombre}</span>
                ))}
              </p>
              <p className="crono-cuenta">
                {s.fil.length} {s.fil.length === 1 ? 'filósofo' : 'filósofos'}
                {conHistoria && s.eventos.length > 0 && ` · ${s.eventos.length} acontecimientos`}
              </p>
              {ocultos > 0 || abierto ? (
                <button type="button" className="crono-ver" aria-expanded={abierto} onClick={() => alternarSiglo(k)}>
                  {abierto ? 'Ver menos' : `Ver todo (+${ocultos})`}
                </button>
              ) : null}
            </header>

            {!conHistoria && evs.length > 0 && (
              <p className="crono-resumen">
                <span>En el mundo:</span>
                {evs.slice(0, 3).sort((a, b) => a.anio - b.anio).map((e, i) => (
                  <Fragment key={e.id}>
                    {i > 0 && ' · '}
                    <b>{anioTxt(e.anio)}</b> {e.titulo}
                  </Fragment>
                ))}
              </p>
            )}

            <ol className="crono-lista">
              {items.map((it) => {
                const id = it.k === 'filosofo' ? it.f.id : it.k === 'evento' ? it.e.id : it.k === 'periodo' ? it.p.id : it.fr.id;
                const abiertoItem = detalle === `${it.k}:${id}`;
                const alternar = () => setDetalle(abiertoItem ? null : `${it.k}:${id}`);
                if (it.k === 'filosofo') {
                  const f = it.f;
                  return (
                    <li key={'f' + f.id} className="crono-fila der">
                      <span className="crono-anio">{f.fechas}</span>
                      <span className="crono-punto" style={{background: f.categorias[0] ? CAT[f.categorias[0]].color : 'var(--suave)'}} />
                      <div className="crono-fil" onClick={() => abrir(f.id)}>
                        <Retrato nombre={f.nombre} img={f.img} cats={f.categorias} size={46} />
                        <span>
                          <button type="button" className="crono-nombre" onClick={(e) => (e.stopPropagation(), abrir(f.id))}>
                            {f.nombre}
                          </button>
                          {f.conocidoPor && (
                            <small>
                              <Texto>{f.conocidoPor}</Texto>
                            </small>
                          )}
                        </span>
                      </div>
                    </li>
                  );
                }
                if (it.k === 'evento') {
                  const e = it.e, c = TIPOS[e.tipo]?.color ?? '#868E96';
                  return (
                    <li key={'e' + e.id} className={`crono-fila izq n${e.nivel}`} style={{['--c' as string]: c}}>
                      <span className="crono-anio">{e.hasta != null ? `${anioTxt(e.anio)}–${anioTxt(e.hasta)}` : anioTxt(e.anio)}</span>
                      <span className="crono-punto" />
                      <div className="crono-ev">
                        <button type="button" aria-expanded={abiertoItem} onClick={alternar}>
                          {e.titulo}
                        </button>
                        {abiertoItem && (
                          <p>
                            {e.texto}{' '}
                            <a href={e.wiki} target="_blank" rel="noopener">
                              Wikipedia ↗
                            </a>
                          </p>
                        )}
                      </div>
                    </li>
                  );
                }
                if (it.k === 'periodo') {
                  const p = it.p;
                  return (
                    <li key={'p' + p.id} className="crono-fila izq periodo">
                      <span className="crono-anio">
                        {anioTxt(p.desde)}–{anioTxt(p.hasta)}
                      </span>
                      <span className="crono-punto" />
                      <div className="crono-ev">
                        <button type="button" aria-expanded={abiertoItem} onClick={alternar}>
                          {p.nombre}
                        </button>
                        {abiertoItem && (
                          <p>
                            {p.texto}{' '}
                            <a href={p.wiki} target="_blank" rel="noopener">
                              Wikipedia ↗
                            </a>
                          </p>
                        )}
                      </div>
                    </li>
                  );
                }
                const fr = it.fr;
                return (
                  <li key={'q' + fr.id} className="crono-fila izq frase">
                    <span className="crono-anio">{anioTxt(fr.anio)}</span>
                    <span className="crono-punto" />
                    <div className="crono-frase">
                      <button type="button" aria-expanded={abiertoItem} onClick={alternar}>
                        «{fr.texto.replace(/\.$/, '')}»
                      </button>
                      <small>
                        {fr.autor ? (
                          <button type="button" className="crono-autor" onClick={() => abrir(fr.autor!)}>
                            {fr.autorNombre}
                          </button>
                        ) : (
                          fr.autorNombre
                        )}
                        , <i>{fr.obra}</i>
                      </small>
                      {abiertoItem && (
                        <p>
                          {fr.porQue}
                          {fr.nota && <span className="crono-nota"> {fr.nota}</span>}{' '}
                          <a href={fr.fuente} target="_blank" rel="noopener">
                            Fuente ↗
                          </a>
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
