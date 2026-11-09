import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {CAT, CATEGORIAS, ERAS, FAMAS, SEXOS, numSiglo, siglo, type CatId, type EraId} from './config';
import Buscador from './Buscador';
import {mejores, palabras, puntuar, type Sugerencia} from './buscar';
import LISTA from './datos/lista.json';
import Ficha from './Ficha';
import {plano, ProveedorGlosario, Texto, type Diccionario} from '../comun/Glosario';
import Pie from '../comun/Pie';
import Linea from './Linea';
import Historia from './Historia';
import Tarjeta from './Tarjeta';
import type {Filosofo, Sexo} from './tipos';

const TODOS = LISTA as unknown as Filosofo[];
const idDeHash = () => decodeURIComponent(location.hash.slice(1));

// Palabras de cada filosofo para la busqueda aproximada
const INDICE = new Map(
  TODOS.map((f) => [
    f.id,
    palabras(`${f.nombre} ${f.escuela ?? ''} ${f.region ?? ''} ${plano(f.conocidoPor)} ${f.categorias.map((c) => CAT[c].nombre).join(' ')}`),
  ]),
);

// Lo que se puede sugerir al escribir: filosofos, corrientes, lugares y temas
const SUGERENCIAS: Sugerencia[] = (() => {
  const cuenta = (k: 'escuela' | 'region') => {
    const m = new Map<string, number>();
    TODOS.forEach((f) => f[k] && m.set(f[k]!, (m.get(f[k]!) ?? 0) + 1));
    return [...m.entries()];
  };
  return [
    ...TODOS.map((f) => ({
      texto: f.nombre,
      tipo: f.sexo === 'mujer' ? 'Filósofa' : f.sexo === 'otro' ? 'Filósofe' : 'Filósofo',
      detalle: f.fechas,
      peso: 1000 - (f.fama?.puesto ?? 999) / 10,
      clave: 'f:' + f.id,
      palabras: palabras(f.nombre),
      extra: INDICE.get(f.id),
    })),
    ...cuenta('escuela').map(([t, n]) => ({texto: t, tipo: 'Corriente', detalle: `${n}`, peso: n, clave: 'e:' + t, palabras: palabras(t)})),
    ...cuenta('region').map(([t, n]) => ({texto: t, tipo: 'Lugar', detalle: `${n}`, peso: n, clave: 'r:' + t, palabras: palabras(t)})),
    ...CATEGORIAS.map((c) => ({texto: c.nombre, tipo: 'Tema', peso: 500, clave: 'c:' + c.id, palabras: palabras(`${c.nombre} ${c.pregunta}`)})),
  ];
})();

export default function App() {
  const [era, setEra] = useState<EraId | null>(null);
  const [cats, setCats] = useState<Set<CatId>>(new Set());
  const [q, setQ] = useState('');
  // El glosario se baja despues de pintar: hasta entonces las palabras salen sin gris
  const [glosario, setGlosario] = useState<Diccionario>({});
  useEffect(() => {
    import('./datos/glosario.json').then((m) => setGlosario(m.default as Diccionario));
  }, []);
  const [sexo, setSexo] = useState<Sexo | null>(null);
  const [famas, setFamas] = useState<Set<number>>(new Set());
  const [historia, setHistoria] = useState(false);
  const cerrarHistoria = useCallback(() => setHistoria(false), []);
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

  const alternarFama = (n: number) =>
    setFamas((s) => {
      const x = new Set(s);
      x.has(n) ? x.delete(n) : x.add(n);
      return x;
    });

  const visibles = useMemo(() => {
    const consulta = palabras(q);
    const pasan = TODOS.filter(
      (f) =>
        (!era || f.era === era) &&
        (!cats.size || f.categorias.some((c) => cats.has(c))) &&
        (!sexo || f.sexo === sexo) &&
        (!famas.size || (f.fama && famas.has(f.fama.n))),
    );
    if (!consulta.length) return pasan;
    return mejores(pasan.map((f) => ({x: f, r: puntuar(consulta, INDICE.get(f.id)!)}))).map((y) => y.x);
  }, [era, cats, q, sexo, famas]);

  const elegirSugerencia = (s: Sugerencia) => {
    const [tipo, valor] = [s.clave.slice(0, 1), s.clave.slice(2)];
    if (tipo === 'f') abrir(valor);
    else if (tipo === 'c') {
      setCats((x) => new Set(x).add(valor as CatId));
      setQ('');
    } else setQ(s.texto);
  };
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

  // Se pintan las tarjetas poco a poco segun se baja: con 750 filosofos, pintarlas todas de golpe pesa
  const TANDA = 60;
  const [limite, setLimite] = useState(TANDA);
  const centinela = useRef<HTMLDivElement>(null);
  useEffect(() => setLimite(TANDA), [era, cats, q, sexo, famas]);
  useEffect(() => {
    const el = centinela.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLimite((l) => l + TANDA), {rootMargin: '1200px 0px'});
    io.observe(el);
    return () => io.disconnect();
  }, [limite, visibles.length]);
  let quedan = limite;
  const pintados = grupos
    .map((g) => ({
      ...g,
      siglos: g.siglos
        .map(([k, fs]) => {
          const parte = fs.slice(0, Math.max(0, quedan));
          quedan -= parte.length;
          return [k, parte] as [number, Filosofo[]];
        })
        .filter(([, fs]) => fs.length),
    }))
    .filter((g) => g.siglos.length);

  const elegido = TODOS.find((f) => f.id === sel);
  const filtrando = Boolean(era || cats.size || q || sexo || famas.size);

  return (
    <ProveedorGlosario glosario={glosario}>
      <div className="pagina">
        <header className="cabecera">
          <h1>
            Filosofía <em>comprimida</em>
          </h1>
          <p className="entradilla">
            2.600 años de ideas en una línea del tiempo: {TODOS.length} pensadores, por qué son famosos y dónde leerlos. Sin tecnicismos: las
            palabras raras, como <Texto>{'[[metafísica|metafisica]] o [[a priori|a-priori]]'}</Texto>, tienen fondo gris. Pasa el ratón por
            encima, o tócalas, y te las explico.
          </p>
        </header>

        <div className="linea-cabeza">
          <button type="button" className="abrir-historia" onClick={() => setHistoria(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5 21 21M8 10.5h5M10.5 8v5" />
            </svg>
            La historia con lupa
          </button>
        </div>
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
          <div className="pills-fila">
            <div className="pills" role="group" aria-label="Reconocimiento">
              <span className="pills-titulo">Reconocimiento</span>
              {FAMAS.map((x) => (
                <button key={x.n} type="button" className="pill fama" aria-pressed={famas.has(x.n)} title={x.ayuda} onClick={() => alternarFama(x.n)}>
                  <span className="fama-puntos" aria-hidden="true">
                    {'●'.repeat(x.n)}
                  </span>
                  {x.nombre}
                </button>
              ))}
            </div>
            <div className="pills" role="group" aria-label="Sexo">
              <span className="pills-titulo">Sexo</span>
              {SEXOS.map((x) => (
                <button key={x.id} type="button" className="pill" aria-pressed={sexo === x.id} onClick={() => setSexo(sexo === x.id ? null : x.id)}>
                  {x.nombre} <small>{TODOS.filter((f) => f.sexo === x.id).length}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="filtros-fila">
            <Buscador valor={q} cambiar={setQ} todas={SUGERENCIAS} elegir={elegirSugerencia} />
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
                  setSexo(null);
                  setFamas(new Set());
                }}
              >
                Quitar filtros
              </button>
            )}
          </div>
        </div>

        <main>
          {grupos.length === 0 && <p className="vacio">Nadie cumple esos filtros. Prueba a quitar alguno.</p>}
          {pintados.map(({e, suyos, siglos}) => (
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
          {limite < visibles.length && (
            <div ref={centinela} className="cargando-mas" aria-hidden="true">
              Cargando más filósofos…
            </div>
          )}
        </main>
        <Pie marca="Filosofía" fuente='"Philosopher", Georgia, serif' />

      </div>
      {historia && <Historia todos={TODOS} cerrar={cerrarHistoria} abrir={abrir} />}
      {elegido && <Ficha f={elegido} todos={TODOS} abrir={abrir} cerrar={cerrar} />}
    </ProveedorGlosario>
  );
}
