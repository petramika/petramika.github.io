import {useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as PE} from 'react';
import {CAT, COLOR_EDAD, ERAS, ETAPAS, anioTxt} from './config';
import Retrato from './Retrato';
import type {Filosofo} from './tipos';

/*
  La historia con lupa: una linea del tiempo de 2.800 años que se acerca y se
  aleja (rueda del raton, pellizco en el movil, botones + y − o doble clic) y
  se arrastra. De lejos solo se ven los grandes hitos y los filosofos mas
  famosos; al acercarse aparecen mas acontecimientos, periodos y pensadores.
  Pulsar un acontecimiento lo explica y dice quien vivia entonces; pulsar un
  filosofo abre su ficha.
*/
export type Evento = {id: string; anio: number; hasta: number | null; titulo: string; texto: string; nivel: 1 | 2 | 3; tipo: string; region: string; wiki: string};
export type Periodo = {id: string; desde: number; hasta: number; nombre: string; region: string; nivel: 1 | 2; texto: string; wiki: string};
export type Frase = {id: string; anio: number; texto: string; autor: string | null; autorNombre: string; obra: string; porQue: string; nota: string | null; nivel: 1 | 2; fuente: string};
type Datos = {eventos: Evento[]; periodos: Periodo[]; frases?: Frase[]; frasesFil?: Record<string, {texto: string; fuente: string}>};



export const TIPOS: Record<string, {nombre: string; color: string}> = {
  politica: {nombre: 'Política', color: '#1C7ED6'},
  guerra: {nombre: 'Guerras', color: '#C92A2A'},
  ciencia: {nombre: 'Ciencia y técnica', color: '#E67700'},
  religion: {nombre: 'Religión', color: '#AE3EC9'},
  cultura: {nombre: 'Cultura', color: '#D6336C'},
  sociedad: {nombre: 'Sociedad', color: '#2F9E44'},
  exploracion: {nombre: 'Exploración', color: '#0B7285'},
};

const MIN = -720, MAX = 2035, SPAN_MIN = 6;
const PASOS = [1000, 500, 200, 100, 50, 25, 10, 5, 2, 1];

/*
  Escala: no es lineal. Si lo fuera, la Edad Contemporanea (240 años) seria
  una rayita al lado de la Antigua (1.100). Cada edad ocupa un ancho parecido
  (como en la linea de la pagina) y dentro de cada una los años van parejos.
  Todo el zoom y el arrastre se hacen en esta escala «u».
*/
const NUDOS = [MIN, 476, 1453, 1789, MAX];
const PESOS = [1.2, 1, 0.9, 1.05];
const UN = NUDOS.map((_, i) => PESOS.slice(0, i).reduce((a, b) => a + b, 0));
const tramo = (anio: number) => Math.max(0, Math.min(3, NUDOS.findIndex((n, i) => i > 0 && anio <= n) - 1));
const U = (anio: number) => {
  const i = anio <= NUDOS[0] ? 0 : anio >= MAX ? 3 : tramo(anio);
  return UN[i] + ((anio - NUDOS[i]) / (NUDOS[i + 1] - NUDOS[i])) * PESOS[i];
};
const A = (u: number) => {
  const i = Math.max(0, Math.min(3, UN.findIndex((n, k) => k > 0 && u <= n) - 1));
  return NUDOS[i] + ((u - UN[i]) / PESOS[i]) * (NUDOS[i + 1] - NUDOS[i]);
};
/** Cuanta «u» es un año en ese momento */
const densidad = (anio: number) => {
  const i = tramo(anio);
  return PESOS[i] / (NUDOS[i + 1] - NUDOS[i]);
};
const UMIN = U(MIN), UMAX = U(MAX);

let cache: Datos | null = null;
const cargar = () => import('./datos/historia.json').then((m) => (cache = m.default as unknown as Datos));

/** En años (lo que se pide desde fuera) */
type Vista = {x0: number; x1: number};
/** En la escala u (lo que se guarda) */
type VistaU = {u0: number; u1: number};
type Sel = {tipo: 'frase'; fr: Frase} | {tipo: 'evento'; e: Evento} | {tipo: 'periodo'; p: Periodo} | {tipo: 'etapa'; et: (typeof ETAPAS)[number]} | null;

/** Coloca etiquetas en filas sin que se pisen; las que no caben, no se pintan */
function apilar<T>(items: T[], izq: (t: T) => number, ancho: (t: T) => number, filas: number, hueco = 8) {
  const ocupado: [number, number][][] = Array.from({length: filas}, () => []);
  const out: {t: T; fila: number}[] = [];
  for (const t of items) {
    const a = izq(t), b = a + ancho(t);
    const f = ocupado.findIndex((segs) => segs.every(([x, y]) => b + hueco <= x || a >= y + hueco));
    if (f >= 0) {
      ocupado[f].push([a, b]);
      out.push({t, fila: f});
    }
  }
  return out;
}

export default function Historia({todos, cerrar, abrir, inicio}: {todos: Filosofo[]; cerrar: () => void; abrir: (id: string) => void; inicio?: Vista}) {
  const [datos, setDatos] = useState<Datos | null>(cache);
  const aU = (v: Vista): VistaU => ({u0: U(Math.max(MIN, v.x0)), u1: U(Math.min(MAX, v.x1))});
  const [vista, setVista] = useState<VistaU>(aU(inicio ?? {x0: MIN, x1: MAX}));
  const [sel, setSel] = useState<Sel>(null);
  const [W, setW] = useState(1000);
  const lienzo = useRef<HTMLDivElement>(null);
  const cierre = useRef<HTMLButtonElement>(null);
  const anim = useRef<number>(0);
  const punteros = useRef(new Map<number, number>());
  const gesto = useRef<{x: number; vista: VistaU; dist?: number; centro?: number} | null>(null);
  const movido = useRef(false);
  const [encima, setEncima] = useState<{f: Filosofo; x: number; fila: number} | null>(null);

  useEffect(() => {
    if (!cache) cargar().then(setDatos);
  }, []);

  // Ancho real del lienzo
  useEffect(() => {
    const el = lienzo.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Dentro de la historia y sin acercarse mas de SPAN_MIN años */
  const limitar = useCallback((v: VistaU): VistaU => {
    const centro = A((v.u0 + v.u1) / 2);
    const minimo = SPAN_MIN * densidad(centro);
    let span = Math.min(UMAX - UMIN, Math.max(minimo, v.u1 - v.u0));
    let u0 = v.u0 + (v.u1 - v.u0 - span) / 2;
    u0 = Math.min(UMAX - span, Math.max(UMIN, u0));
    return {u0, u1: u0 + span};
  }, []);
  const vistaRef = useRef(vista);
  vistaRef.current = vista;

  /** Cambio de vista suave (botones, saltos) */
  const irU = useCallback(
    (destino: VistaU) => {
      cancelAnimationFrame(anim.current);
      const d = limitar(destino);
      const desde = {...vistaRef.current};
      const t0 = performance.now();
      const paso = (t: number) => {
        const k = Math.min(1, (t - t0) / 380);
        const e = 1 - Math.pow(1 - k, 3);
        setVista({u0: desde.u0 + (d.u0 - desde.u0) * e, u1: desde.u1 + (d.u1 - desde.u1) * e});
        if (k < 1) anim.current = requestAnimationFrame(paso);
      };
      anim.current = requestAnimationFrame(paso);
    },
    [limitar],
  );
  const ir = useCallback((v: Vista) => irU(aU(v)), [irU]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Acercar (factor < 1) o alejar alrededor de un punto de la pantalla */
  const zoom = useCallback(
    (factor: number, centroPx?: number): VistaU => {
      const v = vistaRef.current;
      const span = v.u1 - v.u0;
      const k = (centroPx ?? W / 2) / W;
      const c = v.u0 + k * span;
      const nuevo = span * factor;
      return {u0: c - k * nuevo, u1: c - k * nuevo + nuevo};
    },
    [W],
  );
  const mueve = (v: VistaU, px: number): VistaU => {
    const d = (px / W) * (v.u1 - v.u0);
    return {u0: v.u0 + d, u1: v.u1 + d};
  };

  // Teclado: Esc cierra (o quita la seleccion), + y − acercan, flechas mueven
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    cierre.current?.focus({preventScroll: true});
    const tecla = (e: KeyboardEvent) => {
      if (document.querySelector('.ficha-fondo')) return;
      if (e.key === 'Escape') sel ? setSel(null) : cerrar();
      else if (e.key === '+' || e.key === '=') irU(zoom(0.6));
      else if (e.key === '-') irU(zoom(1 / 0.6));
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') irU(mueve(vistaRef.current, W * 0.25 * (e.key === 'ArrowLeft' ? -1 : 1)));
    };
    document.addEventListener('keydown', tecla);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      if (!document.querySelector('.ficha-fondo')) document.body.style.overflow = '';
      antes?.focus?.({preventScroll: true});
    };
  }, [cerrar, irU, zoom, sel, W]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rueda: acercar y alejar donde esta el raton; desplazamiento lateral del trackpad: mover
  useEffect(() => {
    const el = lienzo.current;
    if (!el) return;
    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimationFrame(anim.current);
      const r = el.getBoundingClientRect();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setVista(limitar(mueve(vistaRef.current, e.deltaX)));
      else setVista(limitar(zoom(Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * (e.ctrlKey ? 0.01 : 0.004)), e.clientX - r.left)));
    };
    el.addEventListener('wheel', rueda, {passive: false});
    return () => el.removeEventListener('wheel', rueda);
  }, [W, zoom, limitar]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrastrar para mover; dos dedos para acercar
  const abajo = (e: PE<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    cancelAnimationFrame(anim.current);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    punteros.current.set(e.pointerId, e.clientX);
    movido.current = false;
    const xs = [...punteros.current.values()];
    gesto.current =
      xs.length === 2 ? {x: 0, vista: vistaRef.current, dist: Math.abs(xs[0] - xs[1]) || 1, centro: (xs[0] + xs[1]) / 2} : {x: e.clientX, vista: vistaRef.current};
  };
  const mover = (e: PE<HTMLDivElement>) => {
    if (!punteros.current.has(e.pointerId) || !gesto.current) return;
    punteros.current.set(e.pointerId, e.clientX);
    const g = gesto.current, span = g.vista.u1 - g.vista.u0;
    const xs = [...punteros.current.values()];
    const r = lienzo.current!.getBoundingClientRect();
    if (xs.length === 2 && g.dist) {
      const dist = Math.abs(xs[0] - xs[1]) || 1;
      const k = (g.centro! - r.left) / W;
      const c = g.vista.u0 + k * span;
      const nuevo = span * (g.dist / dist);
      setVista(limitar({u0: c - k * nuevo, u1: c - k * nuevo + nuevo}));
      movido.current = true;
    } else if (xs.length === 1) {
      const dx = e.clientX - g.x;
      if (Math.abs(dx) > 3) movido.current = true;
      setVista(limitar(mueve(g.vista, -dx)));
    }
  };
  const arriba = (e: PE<HTMLDivElement>) => {
    punteros.current.delete(e.pointerId);
    const xs = [...punteros.current.entries()];
    gesto.current = xs.length === 1 ? {x: xs[0][1], vista: vistaRef.current} : null;
  };

  const {u0, u1} = vista;
  const x0 = A(u0), x1 = A(u1);
  const span = x1 - x0;
  const X = useCallback((a: number) => ((U(a) - u0) / (u1 - u0)) * W, [u0, u1, W]);

  // Marcas del eje: de las mas redondas a las menos, sin que se junten (la escala no es uniforme)
  const marcas = useMemo(() => {
    const puestas: {a: number; x: number}[] = [];
    for (const p of PASOS) {
      if (span / p > 400) continue;
      for (let a = Math.ceil(x0 / p) * p; a <= x1; a += p) {
        if (a === 0 || puestas.some((m) => m.a === a)) continue;
        const x = X(a);
        if (puestas.every((m) => Math.abs(m.x - x) >= 78)) puestas.push({a, x});
      }
    }
    return puestas.map((m) => m.a);
  }, [x0, x1, span, X]);

  // Lo que entra segun lo cerca que estemos: los acontecimientos menores solo de cerca
  const nivelEv = span > 1400 ? 2 : 3;
  const estrecho = W < 640;

  const periodos = useMemo(() => {
    if (!datos) return [];
    const vis = datos.periodos
      .filter((p) => p.hasta >= x0 && p.desde <= x1 && (p.nivel === 1 || span < 1600))
      .sort((a, b) => a.nivel - b.nivel || b.hasta - b.desde - (a.hasta - a.desde));
    const filas: {p: Periodo; fila: number}[] = [];
    const fin: number[][] = [[], [], []];
    for (const p of vis) {
      const a = X(p.desde), b = X(p.hasta);
      const f = fin.findIndex((seg) => seg.every((_, i) => i % 2 || b + 2 <= seg[i] || a >= seg[i + 1] + 2));
      if (f >= 0) {
        fin[f].push(a, b);
        filas.push({p, fila: f});
      }
    }
    return filas;
  }, [datos, x0, x1, span, X]);

  const eventos = useMemo(() => {
    if (!datos) return [];
    const vis = datos.eventos.filter((e) => e.nivel <= nivelEv && (e.hasta ?? e.anio) >= x0 && e.anio <= x1).sort((a, b) => a.nivel - b.nivel || a.anio - b.anio);
    const ancho = (e: Evento) => Math.min(estrecho ? 150 : 220, e.titulo.length * 6.6 + 22);
    return apilar(vis, (e) => X(e.anio) - 6, ancho, estrecho ? 4 : 6);
  }, [datos, nivelEv, x0, x1, X, estrecho]);

  const frases = useMemo(() => {
    const vis = (datos?.frases ?? []).filter((f) => f.anio >= x0 && f.anio <= x1 && (f.nivel === 1 || span < 1400)).sort((a, b) => a.nivel - b.nivel || a.anio - b.anio);
    const ancho = (f: Frase) => Math.min(estrecho ? 170 : 260, f.texto.length * 6.7 + 30);
    return apilar(vis, (f) => X(f.anio) - 8, ancho, 2, 10);
  }, [datos, x0, x1, span, X, estrecho]);

  const pensadores = useMemo(() => {
    const vis = todos
      // Solo los de reconocimiento alto y muy alto
      .filter((f) => f.fl >= x0 - 10 && f.fl <= x1 + 10 && (f.fama?.n ?? 0) >= 3)
      .sort((a, b) => (a.fama?.puesto ?? 9999) - (b.fama?.puesto ?? 9999));
    const ancho = (f: Filosofo) => Math.min(170, f.nombre.length * 6.4 + 38);
    return apilar(vis, (f) => X(f.fl) - 13, ancho, estrecho ? 5 : 6, 6);
  }, [todos, x0, x1, X, estrecho]);

  const vivosEn = (a: number, b = a) =>
    todos
      .filter((f) => {
        const n = f.nace ?? f.fl - 35, m = f.muere ?? (f.nace != null ? f.nace + 70 : f.fl + 35);
        return n <= b && m >= a;
      })
      .sort((p, q) => (p.fama?.puesto ?? 9999) - (q.fama?.puesto ?? 9999))
      .slice(0, 12);

  const nombreZoom = span > 1500 ? 'Toda la historia' : span > 400 ? 'Siglos' : span > 60 ? 'Décadas' : 'Años';
  const fechaTxt = (a: number) => anioTxt(Math.round(a));

  return (
    <div className="hist-fondo" onClick={cerrar}>
      <div className="hist" role="dialog" aria-modal="true" aria-labelledby="hist-titulo" onClick={(e) => e.stopPropagation()}>
        <header className="hist-cabeza">
          <div>
            <h2 id="hist-titulo">
              La historia <em>con lupa</em>
            </h2>
            <p>Acércate con la rueda, pellizcando o con + y −; arrastra para moverte. Cuanto más cerca, más cosas pasan.</p>
          </div>
          <button ref={cierre} type="button" className="hist-cerrar" onClick={cerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="hist-barra">
          <div className="pills" role="group" aria-label="Ir a una edad">
            <button type="button" className="pill" onClick={() => ir({x0: MIN, x1: MAX})}>
              Todo
            </button>
            {ERAS.map((e) => (
              <button key={e.id} type="button" className="pill" onClick={() => ir({x0: e.desde - 20, x1: Math.min(e.hasta, 2030) + 20})}>
                {e.corto}
              </button>
            ))}
          </div>
          <div className="hist-zoom">
            <span className="hist-rango">
              {fechaTxt(x0)} – {fechaTxt(x1)} · <b>{nombreZoom}</b>
            </span>
            <button type="button" onClick={() => irU(zoom(1 / 0.5))} aria-label="Alejar" disabled={u1 - u0 >= UMAX - UMIN - 1e-6}>
              −
            </button>
            <button type="button" onClick={() => irU(zoom(0.5))} aria-label="Acercar" disabled={span <= SPAN_MIN + 0.5}>
              +
            </button>
          </div>
        </div>

        <div
          ref={lienzo}
          className="hist-lienzo"
          onPointerDown={abajo}
          onPointerMove={mover}
          onPointerUp={arriba}
          onPointerCancel={arriba}
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            const r = lienzo.current!.getBoundingClientRect();
            irU(zoom(0.4, e.clientX - r.left));
          }}
        >
          {/* Las cuatro edades: fondo, banda de color y sus etapas */}
          {ERAS.map((e, i) => {
            const a = Math.max(0, X(e.desde)), b = Math.min(W, X(Math.min(e.hasta, MAX)));
            if (b <= 0 || a >= W) return null;
            return (
              <div key={e.id} className={`hist-edad e${i}`} style={{left: a, width: b - a, ['--c' as string]: COLOR_EDAD[e.id]}}>
                <span className="hist-edad-nombre">{b - a > 150 ? e.nombre : e.corto}</span>
              </div>
            );
          })}
          <div className="hist-etapas">
            {ETAPAS.map((et) => {
              const a = Math.max(0, X(et.desde)), b = Math.min(W, X(et.hasta));
              if (b <= a + 1) return null;
              return (
                <button
                  key={et.nombre}
                  type="button"
                  className={`hist-etapa${sel?.tipo === 'etapa' && sel.et.nombre === et.nombre ? ' on' : ''}`}
                  style={{left: a, width: b - a, ['--c' as string]: COLOR_EDAD[et.era]}}
                  title={et.nombre}
                  onClick={() => !movido.current && setSel({tipo: 'etapa', et})}
                >
                  {b - a > 46 && <span>{et.nombre}</span>}
                </button>
              );
            })}
          </div>

          {/* Periodos: franjas */}
          <div className="hist-periodos">
            {periodos.map(({p, fila}) => {
              const a = X(p.desde), b = X(p.hasta);
              const l = Math.max(-4, a), r = Math.min(W + 4, b);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`hist-periodo${sel?.tipo === 'periodo' && sel.p.id === p.id ? ' on' : ''}`}
                  style={{left: l, width: Math.max(3, r - l), top: fila * 22}}
                  onClick={() => !movido.current && setSel({tipo: 'periodo', p})}
                  title={`${p.nombre} (${anioTxt(p.desde)} – ${anioTxt(p.hasta)})`}
                >
                  {r - l > 60 && <span>{p.nombre}</span>}
                </button>
              );
            })}
          </div>

          {/* Frases que dieron que hablar */}
          <div className="hist-frases">
            {frases.map(({t: f, fila}) => (
              <button
                key={f.id}
                type="button"
                className={`hist-frase${sel?.tipo === 'frase' && sel.fr.id === f.id ? ' on' : ''}`}
                style={{left: X(f.anio) - 8, top: fila * 25}}
                onClick={() => !movido.current && setSel({tipo: 'frase', fr: f})}
                title={`${f.autorNombre}, ${f.obra}`}
              >
                «{f.texto.replace(/\.$/, '')}» <small>{f.autorNombre.split(' ').slice(-1)[0]}</small>
              </button>
            ))}
          </div>

          {/* Acontecimientos, encima del eje */}
          <div className="hist-eventos">
            {eventos.map(({t: e, fila}) => {
              const x = X(e.anio), c = TIPOS[e.tipo]?.color ?? '#868E96';
              const on = sel?.tipo === 'evento' && sel.e.id === e.id;
              return (
                <div key={e.id} className="hist-ev" style={{left: x, ['--c' as string]: c, ['--fila' as string]: fila}}>
                  {e.hasta != null && <span className="hist-dura" style={{width: Math.max(2, X(e.hasta) - x)}} />}
                  <span className="hist-palo" />
                  <button type="button" className={`hist-ev-txt n${e.nivel}${on ? ' on' : ''}`} onClick={() => !movido.current && setSel({tipo: 'evento', e})}>
                    <b>{anioTxt(e.anio)}</b> {e.titulo}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Eje con los años */}
          <div className="hist-eje">
            {marcas.map((a) => (
              <span key={a} style={{left: X(a)}}>
                {anioTxt(a)}
              </span>
            ))}
          </div>

          {/* Filosofos, debajo del eje: los mas famosos primero */}
          <div className="hist-filosofos">
            {pensadores.map(({t: f, fila}) => (
              <button
                key={f.id}
                type="button"
                className="hist-fil"
                style={{left: X(f.fl) - 13, top: fila * 36, ['--c' as string]: f.categorias[0] ? CAT[f.categorias[0]].color : 'var(--suave)'}}
                onClick={() => !movido.current && abrir(f.id)}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setEncima({f, x: X(f.fl) - 13, fila})}
                onPointerLeave={() => setEncima(null)}
                onFocus={() => setEncima({f, x: X(f.fl) - 13, fila})}
                onBlur={() => setEncima(null)}
              >
                <Retrato nombre={f.nombre} img={f.img} cats={f.categorias} size={26} />
                <span>{f.nombre}</span>
              </button>
            ))}
          </div>

          {encima && (
            <div className="hist-tarjeta" style={{left: Math.min(Math.max(8, encima.x), W - 300), top: `calc(var(--fil-top) + ${encima.fila * 36 + 34}px)`}} aria-hidden="true">
              <b>{encima.f.nombre}</b> <span>{encima.f.fechas}</span>
              {datos?.frasesFil?.[encima.f.id] ? (
                <q>{datos.frasesFil[encima.f.id].texto}</q>
              ) : (
                encima.f.conocidoPor && <p>{encima.f.conocidoPor.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')}</p>
              )}
              {datos?.frasesFil?.[encima.f.id] && <small>{datos.frasesFil[encima.f.id].fuente}</small>}
            </div>
          )}

          {!datos && <p className="hist-cargando">Cargando la historia…</p>}
        </div>

        {/* Minimapa: donde estamos dentro de toda la historia */}
        <div
          className="hist-mapa"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const c = UMIN + ((e.clientX - r.left) / r.width) * (UMAX - UMIN), m = (u1 - u0) / 2;
            irU({u0: c - m, u1: c + m});
          }}
          aria-hidden="true"
        >
          {ERAS.map((e) => {
            const a = (U(Math.max(MIN, e.desde)) - UMIN) / (UMAX - UMIN), b = (U(Math.min(e.hasta, MAX)) - UMIN) / (UMAX - UMIN);
            return <i key={e.id} style={{left: `${a * 100}%`, width: `${(b - a) * 100}%`, background: COLOR_EDAD[e.id]}} />;
          })}
          <b style={{left: `${((u0 - UMIN) / (UMAX - UMIN)) * 100}%`, width: `${Math.max(0.8, ((u1 - u0) / (UMAX - UMIN)) * 100)}%`}} />
        </div>

        <p className="hist-leyenda">
          {Object.entries(TIPOS).map(([k, t]) => (
            <span key={k} style={{['--c' as string]: t.color}}>
              {t.nombre}
            </span>
          ))}
        </p>

        {sel && (
          <aside className="hist-detalle" aria-live="polite">
            <button type="button" className="hist-detalle-cerrar" onClick={() => setSel(null)} aria-label="Cerrar">
              ✕
            </button>
            {sel.tipo === 'frase' ? (
              <>
                <p className="hd-meta">Frase que dio que hablar · {anioTxt(sel.fr.anio)}</p>
                <blockquote className="hd-frase">«{sel.fr.texto}»</blockquote>
                <p className="hd-fecha">
                  {sel.fr.autor ? (
                    <button type="button" className="hd-autor" onClick={() => abrir(sel.fr.autor!)}>
                      {sel.fr.autorNombre}
                    </button>
                  ) : (
                    sel.fr.autorNombre
                  )}
                  , <i>{sel.fr.obra}</i>
                </p>
                <p>{sel.fr.porQue}</p>
                {sel.fr.nota && <p className="hd-nota">{sel.fr.nota}</p>}
                <p className="hd-pie">
                  <a href={sel.fr.fuente} target="_blank" rel="noopener">
                    Fuente ↗
                  </a>
                  <span />
                </p>
              </>
            ) : sel.tipo === 'etapa' ? (
              <>
                <p className="hd-meta" style={{color: COLOR_EDAD[sel.et.era]}}>
                  Etapa de la filosofía · {ERAS.find((e) => e.id === sel.et.era)!.nombre}
                </p>
                <h3>{sel.et.nombre}</h3>
                <p className="hd-fecha">
                  {anioTxt(sel.et.desde)} – {sel.et.hasta > 2026 ? 'hoy' : anioTxt(sel.et.hasta)}
                </p>
                <p>{sel.et.texto}</p>
                <Vivos lista={vivosEn(sel.et.desde, sel.et.hasta)} abrir={abrir} />
                <p className="hd-pie">
                  <span />
                  <button type="button" onClick={() => ir({x0: sel.et.desde - 10, x1: sel.et.hasta + 10})}>
                    Acercar aquí
                  </button>
                </p>
              </>
            ) : sel.tipo === 'evento' ? (
              <>
                <p className="hd-meta" style={{color: TIPOS[sel.e.tipo]?.color}}>
                  {TIPOS[sel.e.tipo]?.nombre} · {sel.e.region}
                </p>
                <h3>{sel.e.titulo}</h3>
                <p className="hd-fecha">{sel.e.hasta != null ? `${anioTxt(sel.e.anio)} – ${anioTxt(sel.e.hasta)}` : anioTxt(sel.e.anio)}</p>
                <p>{sel.e.texto}</p>
                <Vivos lista={vivosEn(sel.e.anio, sel.e.hasta ?? sel.e.anio)} abrir={abrir} />
                <p className="hd-pie">
                  <a href={sel.e.wiki} target="_blank" rel="noopener">
                    Leer más en Wikipedia ↗
                  </a>
                  <button type="button" onClick={() => ir({x0: sel.e.anio - 15, x1: (sel.e.hasta ?? sel.e.anio) + 15})}>
                    Acercar aquí
                  </button>
                </p>
              </>
            ) : (
              <>
                <p className="hd-meta">Periodo · {sel.p.region}</p>
                <h3>{sel.p.nombre}</h3>
                <p className="hd-fecha">
                  {anioTxt(sel.p.desde)} – {anioTxt(sel.p.hasta)}
                </p>
                <p>{sel.p.texto}</p>
                <Vivos lista={vivosEn(sel.p.desde, sel.p.hasta)} abrir={abrir} />
                <p className="hd-pie">
                  <a href={sel.p.wiki} target="_blank" rel="noopener">
                    Leer más en Wikipedia ↗
                  </a>
                  <button type="button" onClick={() => ir({x0: sel.p.desde - (sel.p.hasta - sel.p.desde) * 0.1, x1: sel.p.hasta + (sel.p.hasta - sel.p.desde) * 0.1})}>
                    Acercar aquí
                  </button>
                </p>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function Vivos({lista, abrir}: {lista: Filosofo[]; abrir: (id: string) => void}) {
  if (!lista.length) return null;
  return (
    <div className="hd-vivos">
      <p>Filósofos que vivían entonces</p>
      <ul>
        {lista.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => abrir(f.id)}>
              <Retrato nombre={f.nombre} img={f.img} cats={f.categorias} size={22} />
              {f.nombre}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
