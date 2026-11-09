import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {CAT, CATEGORIAS, COLOR_EDAD, ERAS, ETAPAS, FAMAS, SEXOS, anioTxt, numSiglo, siglo, type CatId, type EraId} from './config';
import Buscador, {type Termino} from './Buscador';
import {mejores, palabras, puntuar, type Sugerencia} from './buscar';
import LISTA from './datos/lista.json';
import Ficha from './Ficha';
import {plano, ProveedorGlosario, type Diccionario} from '../comun/Glosario';
import Pie from '../comun/Pie';
import Lateral from './Lateral';
import Linea from './Linea';
import Multi from './Multi';
import {BarraHistoria, DetalleHistoria, ZoomHistoria, RAIL, RAIL_MOVIL, pintarSiglo, porSiglo, useHistoria, type SigloDatos} from './Cronologia';
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
  const [eras, setEras] = useState<Set<EraId>>(new Set());
  const [cats, setCats] = useState<Set<CatId>>(new Set());
  const [q, setQ] = useState('');
  // El glosario se baja despues de pintar: hasta entonces las palabras salen sin gris
  const [glosario, setGlosario] = useState<Diccionario>({});
  useEffect(() => {
    import('./datos/glosario.json').then((m) => setGlosario(m.default as Diccionario));
  }, []);
  const [sexos, setSexos] = useState<Set<Sexo>>(new Set());
  const [terminos, setTerminos] = useState<Termino[]>([]);
  // Con varios terminos: los que cumplen cualquiera (suma) o todos a la vez (va filtrando)
  const [modo, setModo] = useState<'alguno' | 'todos'>('alguno');
  const [famas, setFamas] = useState<Set<number>>(new Set());
  // «Con historia»: apagado, las tarjetas; encendido, la cronologia con la historia a la izquierda
  const [vista, setVista] = useState<'tarjetas' | 'cronologia'>(() => {
    try {
      // Por defecto la vista simple; si alguien enciende la historia, se recuerda
      return localStorage.getItem('filo-vista') === 'cronologia' ? 'cronologia' : 'tarjetas';
    } catch {
      return 'tarjetas';
    }
  });
  const cambiarVista = useCallback((v: 'tarjetas' | 'cronologia') => {
    setVista(v);
    try {
      localStorage.setItem('filo-vista', v);
    } catch {
      /* sin almacenamiento */
    }
  }, []);
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

  /** Marca o desmarca un valor en un filtro de varios */
  const alterna =
    <T,>(set: (f: (s: Set<T>) => Set<T>) => void) =>
    (v: T) =>
      set((s) => {
        const n = new Set(s);
        n.has(v) ? n.delete(v) : n.add(v);
        return n;
      });
  const alternarEra = alterna(setEras);

  const visibles = useMemo(() => {
    const consulta = palabras(q);
    const pasan = TODOS.filter(
      (f) =>
        (!eras.size || eras.has(f.era)) &&
        (!cats.size || f.categorias.some((c) => cats.has(c))) &&
        (!sexos.size || sexos.has(f.sexo)) &&
        (!famas.size || (f.fama && famas.has(f.fama.n))),
    );
    if (!consulta.length && !terminos.length) return pasan;
    // Varios terminos: salen los que cumplen cualquiera (lo que se esta escribiendo cuenta como uno mas)
    const porTexto = (texto: string) => {
      const c = palabras(texto);
      return new Set(mejores(pasan.map((f) => ({x: f, r: puntuar(c, INDICE.get(f.id)!)}))).map((y) => y.x.id));
    };
    const sirve = terminos.map((t) => {
      const [tipo, valor] = [t.clave.slice(0, 1), t.clave.slice(2)];
      if (tipo === 'f') return new Set([valor]);
      if (tipo === 'e') return new Set(pasan.filter((f) => f.escuela === valor).map((f) => f.id));
      if (tipo === 'r') return new Set(pasan.filter((f) => f.region === valor).map((f) => f.id));
      return porTexto(t.texto);
    });
    if (consulta.length) sirve.push(porTexto(q));
    return pasan.filter((f) => (modo === 'todos' ? sirve.every((x) => x.has(f.id)) : sirve.some((x) => x.has(f.id))));
  }, [eras, cats, q, sexos, famas, terminos, modo]);

  // Un tema activa su pastilla de tema; lo demas se queda como termino de busqueda
  const anadirTermino = (s: {clave: string; texto: string; tipo: string}) => {
    const [tipo, valor] = [s.clave.slice(0, 1), s.clave.slice(2)];
    if (tipo === 'c') setCats((x) => new Set(x).add(valor as CatId));
    else setTerminos((ts) => (ts.some((t) => t.clave === s.clave) ? ts : [...ts, {clave: s.clave, texto: s.texto, tipo: s.tipo}]));
    setQ('');
  };
  const quitarTermino = (clave: string) => setTerminos((ts) => ts.filter((t) => t.clave !== clave));
  const ids = useMemo(() => new Set(visibles.map((f) => f.id)), [visibles]);

  // Por edad y, dentro, por siglo de nacimiento
  const grupos = ERAS.map((e) => {
    const suyos = visibles.filter((f) => f.era === e.id);
    const siglos = new Map<number, Filosofo[]>();
    suyos.forEach((f) => {
      // Por el siglo en que hicieron su obra (nacimiento + 35, mas o menos), como la edad
      const k = numSiglo(f.fl);
      siglos.set(k, [...(siglos.get(k) ?? []), f]);
    });
    return {e, suyos, siglos: [...siglos.entries()].sort((a, b) => a[0] - b[0])};
  }).filter((g) => g.suyos.length);

  // Se pintan las tarjetas poco a poco segun se baja: con 750 filosofos, pintarlas todas de golpe pesa
  const TANDA = 60;
  const [limite, setLimite] = useState(TANDA);
  const centinela = useRef<HTMLDivElement>(null);
  useEffect(() => setLimite(TANDA), [eras, cats, q, sexos, famas, terminos, modo]);
  useEffect(() => {
    const el = centinela.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLimite((l) => l + TANDA), {rootMargin: '1200px 0px'});
    io.observe(el);
    return () => io.disconnect();
  }, [limite, visibles.length, vista]); // al volver de «Con historia» el centinela es nuevo
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

  // Alto de la barra de filtros (fija arriba), para que el siglo se quede pegado justo debajo
  const filtrosRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = filtrosRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--alto-filtros', el.offsetHeight + 'px'));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Subir arriba / ir al final de lo filtrado (pintando antes todo lo que falte)
  const finRef = useRef<HTMLDivElement>(null);
  const [irAlFinal, setIrAlFinal] = useState(false);
  const [bajado, setBajado] = useState(false);
  useEffect(() => {
    const mira = () => setBajado(window.scrollY > 600);
    mira();
    window.addEventListener('scroll', mira, {passive: true});
    return () => window.removeEventListener('scroll', mira);
  }, []);
  useEffect(() => {
    if (!irAlFinal) return;
    requestAnimationFrame(() => finRef.current?.scrollIntoView({behavior: 'smooth', block: 'end'}));
    setIrAlFinal(false);
  }, [irAlFinal, limite]);
  const alFinal = () => {
    setLimite(visibles.length);
    setIrAlFinal(true);
  };

  const elegido = TODOS.find((f) => f.id === sel);
  const filtrando = Boolean(eras.size || cats.size || q || sexos.size || famas.size || terminos.length);

  // «Con historia»: el rail de los siglos se va al centro y a la izquierda aparece la historia
  const conHistoria = vista === 'cronologia';
  const mainRef = useRef<HTMLElement>(null);
  const [W, setW] = useState(1100);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const h = useHistoria(conHistoria, mainRef);
  const movil = W < 700;
  const rail = movil ? RAIL_MOVIL : RAIL;
  // A la izquierda de todo, la franja de color de cada edad (con su nombre, que acompaña al bajar)
  const [franja, franjaHueco] = movil ? [18, 6] : [30, 14];
  const anchoSiglos = W - franja - franjaHueco;
  const izqW = Math.round(movil ? (anchoSiglos - rail) * 0.56 : (anchoSiglos - rail) / 2);
  const derW = anchoSiglos - rail - izqW;
  const [edadInfo, setEdadInfo] = useState<EraId | null>(null);
  const cerrarEdad = useCallback(() => setEdadInfo(null), []);
  const franjaDe = (e: (typeof ERAS)[number]) => (
    // Un div con el nombre dentro como boton pegajoso: dentro de un <button> el sticky no funciona bien
    <div className="edad-franja" onClick={() => setEdadInfo(e.id)} title={`${e.nombre} · ${e.desdeTxt} → ${e.hastaTxt}`}>
      <button type="button" aria-label={`${e.nombre}: más información`}>
        {e.nombre}
      </button>
    </div>
  );
  const filtrandoFil = Boolean(cats.size || q.trim() || sexos.size || famas.size || terminos.length);
  // Con historia: todos los siglos con filosofos o con historia (si no se filtran filosofos), por edad
  const conHist = useMemo(() => {
    if (!conHistoria) return [];
    const m = porSiglo(visibles, h, eras);
    return ERAS.map((e) => {
      const siglos = [...m.entries()]
        .filter(([k, sd]) => {
          const medio = (k < 0 ? k * 100 : (k - 1) * 100) + 50;
          const suya = medio < ERAS[0].desde ? ERAS[0] : ERAS.find((x) => medio >= x.desde && medio < x.hasta) ?? ERAS[ERAS.length - 1];
          return suya.id === e.id && (sd.fil.length || (!filtrandoFil && (sd.eventos.length || sd.frases.length)));
        })
        .sort((a, b) => a[0] - b[0]);
      return {e, suyos: siglos.flatMap(([, sd]) => sd.fil), siglos};
    }).filter((g) => g.siglos.length);
  }, [conHistoria, visibles, h, eras, filtrandoFil]);

  return (
    <ProveedorGlosario glosario={glosario}>
      <div className="pagina">
        <header className="cabecera">
          <h1>
            Filosofía <em>comprimida</em>
          </h1>
          <p className="entradilla">
            2.600 años de ideas en una línea del tiempo. Pensadores: qué plantearon y dónde saber más de cada uno.
          </p>
        </header>

        <Linea todos={TODOS} visibles={ids} eras={eras} alternarEra={alternarEra} abrir={abrir} />

        <div className="filtros" ref={filtrosRef}>
          <div className="multis">
            <div className="multis-historia">
              <button
                type="button"
                className="boton-historia"
                aria-pressed={conHistoria}
                onClick={() => cambiarVista(conHistoria ? 'tarjetas' : 'cronologia')}
                title={conHistoria ? 'Historia: quitarla' : 'Historia: ver qué pasaba en el mundo, junto a los filósofos'}
                aria-label="Historia"
              >
                {/* Bola del mundo de escritorio sobre un libro: la historia del mundo */}
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <circle cx="12.6" cy="9" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M9.6 4.6c.9.5 1.1 1.4.5 2-.6.7.2 1.6 1.1 1.4.9-.2 1.5.6 1.1 1.4-.4.8.1 1.7.9 2.2M15.6 4.4c-.6.9-.3 2 .6 2.5.8.5 1.3 1.3 1.2 2.1" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7.7 3.6a7.4 7.4 0 0 0 9.9 10.9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M6.6 2.5l2 2M16.7 13.6l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12.6 16.4v1.8" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="9.6" y="18.2" width="6" height="1.6" rx=".8" fill="currentColor" />
                  <rect x="4.5" y="20.3" width="15.5" height="2.6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </button>
              <BarraHistoria h={h} activa={conHistoria} />
            </div>
            <Multi
              titulo="Época"
              opciones={ERAS.map((e) => ({id: e.id, nombre: e.corto, color: COLOR_EDAD[e.id], cuenta: TODOS.filter((f) => f.era === e.id).length}))}
              elegidos={eras}
              alternar={(id) => alternarEra(id as EraId)}
              limpiar={() => setEras(new Set())}
            />
            <Multi
              titulo="Tema"
              opciones={CATEGORIAS.map((c) => ({id: c.id, nombre: c.nombre, color: c.color, ayuda: c.pregunta}))}
              elegidos={cats}
              alternar={(id) => alterna(setCats)(id as CatId)}
              limpiar={() => setCats(new Set())}
            />
            <Multi
              titulo="Reconocimiento"
              opciones={FAMAS.map((x) => ({id: String(x.n), nombre: x.nombre, antes: '●'.repeat(x.n), ayuda: x.ayuda}))}
              elegidos={new Set([...famas].map(String))}
              alternar={(id) => alterna(setFamas)(Number(id))}
              limpiar={() => setFamas(new Set())}
            />
            <Multi
              titulo="Sexo"
              opciones={SEXOS.map((x) => ({id: x.id, nombre: x.nombre, cuenta: TODOS.filter((f) => f.sexo === x.id).length}))}
              elegidos={sexos}
              alternar={(id) => alterna(setSexos)(id as Sexo)}
              limpiar={() => setSexos(new Set())}
            />
          </div>
          <div className="filtros-fila">
            <Buscador valor={q} cambiar={setQ} terminos={terminos} anadir={anadirTermino} quitar={quitarTermino} todas={SUGERENCIAS} />
            {terminos.length + (q.trim() ? 1 : 0) >= 2 && (
              <button
                type="button"
                className="modo-busca"
                onClick={() => setModo(modo === 'alguno' ? 'todos' : 'alguno')}
                title={modo === 'alguno' ? 'Unión: salen los que cumplen cualquiera de los términos. Pulsa para ver solo los que cumplen todos' : 'Intersección: solo los que cumplen todos los términos a la vez. Pulsa para ver los que cumplen cualquiera'}
                aria-label={modo === 'alguno' ? 'Combinar: cualquiera de los términos (unión)' : 'Combinar: todos los términos a la vez (intersección)'}
              >
                <svg viewBox="0 0 28 18" width="28" height="18" aria-hidden="true">
                  <defs>
                    <clipPath id="interseccion-a">
                      <circle cx="10" cy="9" r="7" />
                    </clipPath>
                  </defs>
                  {modo === 'alguno' ? (
                    <>
                      <circle cx="10" cy="9" r="7" fill="currentColor" fillOpacity=".85" />
                      <circle cx="18" cy="9" r="7" fill="currentColor" fillOpacity=".85" />
                    </>
                  ) : (
                    <circle cx="18" cy="9" r="7" fill="currentColor" fillOpacity=".85" clipPath="url(#interseccion-a)" />
                  )}
                  <circle cx="10" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
                  <circle cx="18" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </button>
            )}
            <span className="cuenta" aria-live="polite">
              {visibles.length === TODOS.length ? `${TODOS.length} filósofos` : `${visibles.length} de ${TODOS.length}`}
            </span>
            {filtrando && (
              <button
                type="button"
                className="limpiar"
                onClick={() => {
                  setEras(new Set());
                  setCats(new Set());
                  setQ('');
                  setTerminos([]);
                  setSexos(new Set());
                  setFamas(new Set());
                }}
              >
                Quitar filtros
              </button>
            )}
          </div>
        </div>

        <main
          ref={mainRef}
          className={conHistoria ? 'con-historia' : undefined}
          style={{['--izq' as string]: conHistoria ? `${izqW}px` : '0px', ['--rail' as string]: `${rail}px`, ['--franja' as string]: `${franja}px`, ['--franja-hueco' as string]: `${franjaHueco}px`}}
        >
          {(conHistoria ? conHist : grupos).length === 0 && <p className="vacio">Nadie cumple esos filtros. Prueba a quitar alguno.</p>}
          {conHistoria
            ? conHist.map(({e, suyos, siglos}) => (
                <section key={e.id} className={`edad ${e.id}`} aria-label={e.nombre} style={{['--ce' as string]: COLOR_EDAD[e.id]}}>
                  {franjaDe(e)}
                  <div className="edad-siglos">
                  {siglos.map(([k, sd]) => {
                    const p = pintarSiglo({k, s: sd, h, edad: e.id, izqW, derW, movil, eras, abrir});
                    return (
                      <div key={k} className="siglo" data-siglo={k}>
                        {p.izq}
                        <h3 className="siglo-nombre" style={{height: p.alto}}>
                          <span>
                            {siglo((k < 0 ? k * 100 : (k - 1) * 100) + 50)}
                          </span>
                          {p.rail}
                        </h3>
                        {p.der}
                      </div>
                    );
                  })}
                  </div>
                </section>
              ))
            : pintados.map(({e, suyos, siglos}) => (
                <section key={e.id} className={`edad ${e.id}`} aria-label={e.nombre} style={{['--ce' as string]: COLOR_EDAD[e.id]}}>
                  {franjaDe(e)}
                  <div className="edad-siglos">
                  {siglos.map(([k, fs]) => (
                    <div key={k} className="siglo" data-siglo={k}>
                      <div className="siglo-izq" />
                      <h3 className="siglo-nombre">
                        <span>{siglo(fs[0].fl)}</span>
                      </h3>
                      <div className="tarjetas">
                        {fs.map((f) => (
                          <Tarjeta key={f.id} f={f} abrir={abrir} />
                        ))}
                      </div>
                    </div>
                  ))}
                  </div>
                </section>
              ))}
          <div ref={finRef} />
          {!conHistoria && limite < visibles.length && (
            <div ref={centinela} className="cargando-mas" aria-hidden="true">
              Cargando más filósofos…
            </div>
          )}
        </main>
        {conHistoria && <ZoomHistoria h={h} />}
        {conHistoria && <DetalleHistoria h={h} abrir={abrir} />}
        {edadInfo && <EdadInfo id={edadInfo} abrir={abrir} cerrar={cerrarEdad} />}
        <div className="saltos" role="group" aria-label="Desplazarse">
          <button type="button" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} aria-label="Subir arriba" title="Subir arriba" className={bajado ? '' : 'oculto'}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </button>
          <button type="button" onClick={alFinal} aria-label="Ir al final de la lista" title="Ir al final de la lista">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </button>
        </div>
        <Pie marca="Filosofía" fuente='"Philosopher", Georgia, serif' />

      </div>
      {elegido && <Ficha f={elegido} todos={TODOS} abrir={abrir} cerrar={cerrar} />}
    </ProveedorGlosario>
  );
}

/** La pestaña lateral de una edad: fechas, de qué va, sus etapas y sus filósofos más conocidos */
function EdadInfo({id, abrir, cerrar}: {id: EraId; abrir: (id: string) => void; cerrar: () => void}) {
  const e = ERAS.find((x) => x.id === id)!;
  const suyos = TODOS.filter((f) => f.era === id);
  const top = [...suyos].sort((a, b) => (a.fama?.puesto ?? 9999) - (b.fama?.puesto ?? 9999)).slice(0, 8);
  return (
    <Lateral cerrar={cerrar} etiqueta={e.nombre}>
      <div className="edad-info" style={{['--ce' as string]: COLOR_EDAD[id]}}>
        <p className="ficha-era">Edad</p>
        <h2>{e.nombre}</h2>
        <p className="ficha-fechas">
          {e.desdeTxt} → {e.hastaTxt}
        </p>
        {e.hito && <p className="edad-info-hito">{e.hito}</p>}
        <p className="ficha-resumen">{e.texto}</p>
        <section>
          <h3>Etapas de la filosofía</h3>
          <ul className="ficha-obras">
            {ETAPAS.filter((t) => t.era === id).map((t) => (
              <li key={t.nombre}>
                <span className="anio">
                  {anioTxt(t.desde)} – {anioTxt(t.hasta)}
                </span>{' '}
                <b>{t.nombre}</b>
                <span className="dequeva">{t.texto}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Los más conocidos</h3>
          <p className="ficha-con">
            {top.map((f) => (
              <button key={f.id} type="button" onClick={() => (cerrar(), abrir(f.id))}>
                {f.nombre}
              </button>
            ))}
          </p>
        </section>
      </div>
    </Lateral>
  );
}
