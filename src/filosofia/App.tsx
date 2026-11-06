import {useCallback, useEffect, useMemo, useState} from 'react';
import {CATEGORIAS, ERAS, numSiglo, siglo, type CatId, type EraId} from './config';
import LISTA from './datos/lista.json';
import Ficha from './Ficha';
import {plano, ProveedorGlosario, Texto, type Diccionario} from '../comun/Glosario';
import GLOSARIO from './datos/glosario.json';
import Pie from '../comun/Pie';
import Linea from './Linea';
import Tarjeta from './Tarjeta';
import type {Filosofo} from './tipos';

const TODOS = LISTA as unknown as Filosofo[];
const idDeHash = () => decodeURIComponent(location.hash.slice(1));
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function App() {
  const [era, setEra] = useState<EraId | null>(null);
  const [cats, setCats] = useState<Set<CatId>>(new Set());
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(() => (TODOS.some((f) => f.id === idDeHash()) ? idDeHash() : null));

  // La ficha abierta va en la direccion (#plato), asi se puede compartir y el boton atras la cierra
  useEffect(() => {
    const cambio = () => setSel(TODOS.some((f) => f.id === idDeHash()) ? idDeHash() : null);
    window.addEventListener('hashchange', cambio);
    return () => window.removeEventListener('hashchange', cambio);
  }, []);
  const abrir = useCallback((id: string) => {
    if (location.hash.slice(1) !== id) location.hash = id;
    setSel(id);
  }, []);
  const cerrar = useCallback(() => {
    history.pushState(null, '', location.pathname + location.search);
    setSel(null);
  }, []);

  const alternarCat = (c: CatId) =>
    setCats((s) => {
      const n = new Set(s);
      n.has(c) ? n.delete(c) : n.add(c);
      return n;
    });

  const visibles = useMemo(() => {
    const b = sinTildes(q.trim());
    return TODOS.filter(
      (f) =>
        (!era || f.era === era) &&
        (!cats.size || f.categorias.some((c) => cats.has(c))) &&
        (!b || sinTildes(`${f.nombre} ${f.escuela ?? ''} ${f.region ?? ''} ${plano(f.conocidoPor)}`).includes(b)),
    );
  }, [era, cats, q]);
  const ids = useMemo(() => new Set(visibles.map((f) => f.id)), [visibles]);

  // Por edad y, dentro, por siglo de nacimiento
  const grupos = ERAS.map((e) => {
    const suyos = visibles.filter((f) => f.era === e.id);
    const siglos = new Map<number, Filosofo[]>();
    suyos.forEach((f) => {
      const k = numSiglo(f.nace ?? f.fl - 35);
      siglos.set(k, [...(siglos.get(k) ?? []), f]);
    });
    return {e, suyos, siglos: [...siglos.entries()].sort((a, b) => a[0] - b[0])};
  }).filter((g) => g.suyos.length);

  const elegido = TODOS.find((f) => f.id === sel);
  const filtrando = era || cats.size || q;

  return (
    <ProveedorGlosario glosario={GLOSARIO as Diccionario}>
      <div className="pagina">
        <header className="cabecera">
          <a href="/" className="volver">
            ← petramika
          </a>
          <h1>
            Filosofía <em>comprimida</em>
          </h1>
          <p className="entradilla">
            2.600 años de ideas en una línea del tiempo: {TODOS.length} pensadores, por qué son famosos y dónde leerlos. Sin tecnicismos: las
            palabras raras, como <Texto>{'[[metafísica|metafisica]] o [[a priori|a-priori]]'}</Texto>, tienen fondo gris. Pasa el ratón por
            encima, o tócalas, y te las explico.
          </p>
        </header>

        <Linea todos={TODOS} visibles={ids} era={era} elegirEra={setEra} abrir={abrir} />

        <div className="filtros">
          <div className="pills" role="group" aria-label="Edad">
            <button type="button" className="pill" aria-pressed={!era} onClick={() => setEra(null)}>
              Todas
            </button>
            {ERAS.map((e) => (
              <button key={e.id} type="button" className="pill" aria-pressed={era === e.id} onClick={() => setEra(era === e.id ? null : e.id)}>
                {e.corto}
              </button>
            ))}
          </div>
          <div className="pills cats" role="group" aria-label="Temas">
            {CATEGORIAS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="pill cat"
                aria-pressed={cats.has(c.id)}
                title={c.pregunta}
                style={{['--c' as string]: c.color}}
                onClick={() => alternarCat(c.id)}
              >
                <i aria-hidden="true" />
                {c.nombre}
              </button>
            ))}
          </div>
          <div className="filtros-fila">
            <input type="search" className="buscar" placeholder="Buscar: Kant, estoicismo, Grecia…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar filósofo" />
            <span className="cuenta" aria-live="polite">
              {visibles.length === TODOS.length ? `${TODOS.length} filósofos` : `${visibles.length} de ${TODOS.length}`}
            </span>
            {filtrando && (
              <button
                type="button"
                className="limpiar"
                onClick={() => {
                  setEra(null);
                  setCats(new Set());
                  setQ('');
                }}
              >
                Quitar filtros
              </button>
            )}
          </div>
        </div>

        <main>
          {grupos.length === 0 && <p className="vacio">Nadie cumple esos filtros. Prueba a quitar alguno.</p>}
          {grupos.map(({e, suyos, siglos}) => (
            <section key={e.id} className={`edad ${e.id}`} aria-labelledby={`edad-${e.id}`}>
              <header className="edad-cabeza">
                <h2 id={`edad-${e.id}`}>
                  <em>{e.nombre.split(' ')[0]}</em> {e.nombre.split(' ').slice(1).join(' ')}
                </h2>
                <p className="edad-anios">
                  {e.desdeTxt} <span>→</span> {e.hastaTxt}
                  {e.hito && <small>{e.hito}</small>}
                  <small>{suyos.length} filósofos</small>
                </p>
                <p className="edad-texto">{e.texto}</p>
              </header>
              {siglos.map(([k, fs]) => (
                <div key={k} className="siglo">
                  <h3 className="siglo-nombre">
                    <span>{siglo(fs[0].nace ?? fs[0].fl - 35)}</span>
                  </h3>
                  <div className="tarjetas">
                    {fs.map((f) => (
                      <Tarjeta key={f.id} f={f} abrir={abrir} />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </main>
        <Pie marca="Filosofía" fuente='"Philosopher", Georgia, serif' />

      </div>
      {elegido && <Ficha f={elegido} todos={TODOS} abrir={abrir} cerrar={cerrar} />}
    </ProveedorGlosario>
  );
}
