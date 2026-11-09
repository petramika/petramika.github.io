import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject} from 'react';
import {ERAS, anioTxt, numSiglo, type EraId} from './config';
import Retrato from './Retrato';
import {TIPOS, cargarHistoria, historiaCargada, type DatosHistoria, type Evento, type Frase} from './historia';
import type {Filosofo} from './tipos';

/*
  «Con historia»: la misma pagina de tarjetas se transforma. El rail de los
  siglos se desliza al centro y deja sitio a la izquierda para lo que pasaba en
  el mundo, colocado por su año en un eje proporcional:
    - periodos (imperios, dinastias…): bandas verticales todo lo que duraron;
    - acontecimientos: una pill unida al eje, con el año en el color de su tipo,
      y una barra fina si duraron años (guerras…);
    - frases que dieron que hablar, en cursiva.
  A la derecha, en vez de tarjetas, la cara de cada filosofo en su año.
  Zoom: botones − y +, pellizco del trackpad o Ctrl + rueda; al acercar aparece
  mas detalle y el año que se mira no se mueve. Al pulsar algo de la historia,
  su explicacion se abre en una pestaña pequeña al lado, como la ficha.
*/
type Pill = {k: 'evento'; id: string; anio: number; e: Evento} | {k: 'frase'; id: string; anio: number; fr: Frase};
export type Sel = {id: string} | null;
export type SigloDatos = {eventos: Evento[]; frases: Frase[]; fil: Filosofo[]};

/** Sitio por año de cada edad (como en la lupa): en las modernas pasan mas cosas */
const PESO: Record<EraId, number> = {antigua: 1, medieval: 1, moderna: 2.2, contemporanea: 3.5};
export const RAIL = 120;
export const RAIL_MOVIL = 44;
const EJE = 7; // la linea del tiempo, dentro del rail

const leer = (k: string, d: string) => {
  try {
    return localStorage.getItem(k) ?? d;
  } catch {
    return d;
  }
};
const guardar = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sin almacenamiento */
  }
};

/** Coloca etiquetas en carriles sin que se pisen en vertical; las que no caben se quedan fuera */
function apilarV<T>(items: T[], y: (t: T) => number, alto: number, carriles: number, hueco = 4) {
  const ocupado: [number, number][][] = Array.from({length: carriles}, () => []);
  const out: {t: T; carril: number; y: number}[] = [];
  for (const t of items) {
    const y0 = y(t);
    for (const d of [0, alto * 0.6, -alto * 0.6, alto * 1.2, -alto * 1.2]) {
      const a = y0 + d - alto / 2, b = a + alto;
      const c = ocupado.findIndex((segs) => segs.every(([x, z]) => b + hueco <= x || a >= z + hueco));
      if (c >= 0) {
        ocupado[c].push([a, b]);
        out.push({t, carril: c, y: y0 + d});
        break;
      }
    }
  }
  return out;
}

/** El estado de la historia: datos, filtro de tipos, zoom y lo seleccionado */
export function useHistoria(activa: boolean, caja: RefObject<HTMLElement | null>) {
  const [datos, setDatos] = useState<DatosHistoria | null>(historiaCargada());
  const [tipos, setTipos] = useState<Set<string>>(new Set());
  const [z, setZ] = useState(() => Math.min(30, Math.max(2, Number(leer('filo-zoom', '4')) || 4)));
  const [sel, setSel] = useState<Sel>(null);
  const ancla = useRef<{k: string; frac: number; vista: number} | null>(null);

  useEffect(() => {
    if (activa && !datos) cargarHistoria().then(setDatos);
  }, [activa, datos]);
  useEffect(() => {
    if (!sel) return;
    const t = (e: KeyboardEvent) => e.key === 'Escape' && setSel(null);
    document.addEventListener('keydown', t);
    return () => document.removeEventListener('keydown', t);
  }, [sel]);

  /** Acerca o aleja manteniendo quieto el punto de la pantalla que esta en `yVista` */
  const zoom = useCallback(
    (factor: number, yVista = window.innerHeight / 2) => {
      const filas = [...(caja.current?.querySelectorAll<HTMLElement>('.siglo[data-siglo]') ?? [])];
      const el = filas.find((c) => {
        const r = c.getBoundingClientRect();
        return r.top <= yVista && r.bottom >= yVista;
      });
      if (el) {
        const r = el.getBoundingClientRect();
        ancla.current = {k: el.dataset.siglo!, frac: (yVista - r.top) / r.height, vista: yVista};
      }
      setZ((v) => {
        const n = Math.min(30, Math.max(2, v * factor));
        guardar('filo-zoom', String(n));
        return n;
      });
    },
    [caja],
  );
  useLayoutEffect(() => {
    const a = ancla.current;
    if (!a) return;
    ancla.current = null;
    const el = caja.current?.querySelector<HTMLElement>(`.siglo[data-siglo="${a.k}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    window.scrollBy(0, r.top + a.frac * r.height - a.vista);
  }, [z, caja]);
  // Pellizco del trackpad (llega como Ctrl + rueda) y Ctrl + rueda
  useEffect(() => {
    const el = caja.current;
    if (!el || !activa) return;
    const rueda = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      zoom(Math.exp(-Math.max(-50, Math.min(50, e.deltaY)) * 0.012), e.clientY);
    };
    el.addEventListener('wheel', rueda, {passive: false});
    return () => el.removeEventListener('wheel', rueda);
  }, [zoom, activa, caja]);

  // Carril de cada periodo, el mismo en todos los siglos que cruza (los grandes primero)
  const carrilPeriodo = useMemo(() => {
    const m = new Map<string, number>();
    if (!datos) return m;
    const ocupado: [number, number][][] = Array.from({length: 3}, () => []);
    [...datos.periodos]
      .sort((a, b) => a.nivel - b.nivel || b.hasta - b.desde - (a.hasta - a.desde))
      .forEach((p) => {
        const c = ocupado.findIndex((segs) => segs.every(([x, y]) => p.hasta + 5 <= x || p.desde >= y + 5));
        if (c >= 0) {
          ocupado[c].push([p.desde, p.hasta]);
          m.set(p.id, c);
        }
      });
    return m;
  }, [datos]);

  return {datos, tipos, setTipos, z, zoom, sel, setSel, carrilPeriodo};
}
export type Historia = ReturnType<typeof useHistoria>;

/** Lo que pasa en cada siglo: acontecimientos y frases (filtrados) y filosofos */
export function porSiglo(visibles: Filosofo[], h: Historia, era: EraId | null) {
  const rango = era ? ERAS.find((e) => e.id === era)! : null;
  const dentro = (a: number) => !rango || (a >= rango.desde && a < rango.hasta);
  const m = new Map<number, SigloDatos>();
  const de = (a: number) => {
    const k = numSiglo(a);
    if (!m.has(k)) m.set(k, {eventos: [], frases: [], fil: []});
    return m.get(k)!;
  };
  visibles.forEach((f) => de(f.fl).fil.push(f));
  if (h.datos) {
    h.datos.eventos.filter((e) => dentro(e.anio) && (!h.tipos.size || h.tipos.has(e.tipo))).forEach((e) => de(e.anio).eventos.push(e));
    if (!h.tipos.size) h.datos.frases.filter((f) => dentro(f.anio)).forEach((f) => de(f.anio).frases.push(f));
  }
  return m;
}

/** Pills de tipos (filtran los acontecimientos) */
export function BarraHistoria({h}: {h: Historia}) {
  return (
    <>
      <p className="hist-leyenda crono-tipos" role="group" aria-label="Filtrar acontecimientos por tipo">
        {Object.entries(TIPOS).map(([k, t]) => (
          <button
            key={k}
            type="button"
            style={{['--c' as string]: t.color}}
            aria-pressed={h.tipos.has(k)}
            className={h.tipos.size && !h.tipos.has(k) ? 'apagado' : undefined}
            onClick={() =>
              h.setTipos((s) => {
                const n = new Set(s);
                n.has(k) ? n.delete(k) : n.add(k);
                return n;
              })
            }
          >
            {t.nombre}
          </button>
        ))}
        {h.tipos.size > 0 && (
          <button type="button" className="hist-todos" onClick={() => h.setTipos(new Set())}>
            Ver todos
          </button>
        )}
      </p>
    </>
  );
}

/** Zoom flotante (fuera de la barra de filtros: su desenfoque descoloca lo fijo) */
export function ZoomHistoria({h}: {h: Historia}) {
  return (
    <>
      <div className="crono-zoom" role="group" aria-label="Zoom de la historia">
        <button type="button" onClick={() => h.zoom(1 / 1.6)} disabled={h.z <= 2} aria-label="Alejar">
          −
        </button>
        <span>{h.z < 4 ? 'Siglos' : h.z < 10 ? 'Décadas' : 'Años'}</span>
        <button type="button" onClick={() => h.zoom(1.6)} disabled={h.z >= 30} aria-label="Acercar">
          +
        </button>
      </div>
    </>
  );
}

/**
  Pinta un siglo con historia: devuelve lo que va a la izquierda del rail, las
  marcas y puntos del rail, lo que va a la derecha y el alto de la fila.
*/
export function pintarSiglo({
  k,
  s,
  h,
  edad,
  izqW,
  derW,
  movil,
  era,
  abrir,
}: {
  k: number;
  s: SigloDatos;
  h: Historia;
  edad: EraId;
  izqW: number;
  derW: number;
  movil: boolean;
  era: EraId | null;
  abrir: (id: string) => void;
}): {izq: ReactNode; rail: ReactNode; der: ReactNode; alto: number} {
  const {datos, tipos, z, sel, setSel, carrilPeriodo} = h;
  const rango = era ? ERAS.find((e) => e.id === era)! : null;
  const inicio = k < 0 ? k * 100 : (k - 1) * 100;
  const fin = inicio + 100;

  const pxAnio = z * PESO[edad] * (movil ? 0.8 : 1);
  const alto = Math.round(100 * pxAnio) + 30;
  const Y = (a: number) => 15 + (Math.min(Math.max(a, inicio), fin) - inicio) * pxAnio;

  // Cuanto mas cerca, mas detalle (y lo que no cabe se queda fuera al colocar)
  const nivelEv = pxAnio < 6 ? 1 : pxAnio < 14 ? 2 : 3;
  const ordenados = [...s.eventos].sort((a, b) => a.nivel - b.nivel || a.anio - b.anio);
  // Siempre al menos los 3 principales de cada siglo, aunque sean menores
  const eventos = ordenados.filter((e, i) => e.nivel <= nivelEv || i < 3);
  const frases = s.frases.filter((f) => f.nivel === 1 || pxAnio >= 10);
  // Caras por reconocimiento: de lejos solo los muy conocidos y, al acercar, entran los demas
  // (siempre los 2 mas conocidos del siglo, para que ninguno se quede vacio)
  const famaMin = z < 3 ? 4 : z < 5 ? 3 : z < 9 ? 2 : 1;
  const filosofos = [...s.fil]
    .sort((a, b) => (a.fama?.puesto ?? 9999) - (b.fama?.puesto ?? 9999))
    .filter((f, i) => (f.fama?.n ?? 1) >= famaMin || i < 2);
  const periodos =
    datos && !tipos.size
      ? datos.periodos.filter((p) => carrilPeriodo.has(p.id) && p.desde < fin && p.hasta > inicio && (p.nivel === 1 || pxAnio >= 8) && (!rango || (p.hasta > rango.desde && p.desde < rango.hasta)))
      : [];
  // Orden de prioridad al colocar: grandes acontecimientos, frases famosas y luego el resto
  const prioridad = (p: Pill) => (p.k === 'evento' ? (p.e.nivel - 1) * 2 : (p.fr.nivel - 1) * 2 + 1);
  const pills: Pill[] = [...frases.map((fr) => ({k: 'frase' as const, id: fr.id, anio: fr.anio, fr})), ...eventos.map((e) => ({k: 'evento' as const, id: e.id, anio: e.anio, e}))].sort(
    (a, b) => prioridad(a) - prioridad(b) || a.anio - b.anio,
  );

  // Izquierda, del borde hacia el rail: bandas de periodos, barras de lo que dura y pills
  const bandaW = movil ? 13 : 18;
  const PL = movil ? 2 : 3;
  const x0 = 2;
  const xDuras = x0 + PL * (bandaW + 3) + 3;
  const inicioPills = xDuras + 3 * 7 + 6;
  const hueco = movil ? 10 : 22; // sitio para el tallo hasta el eje
  const L = movil || izqW < 520 ? 1 : 2;
  const anchoPill = Math.max(80, (izqW - hueco - inicioPills - (L - 1) * 10) / L);
  const xPill = (c: number) => izqW - hueco - c * (anchoPill + 10); // borde derecho de la pill
  // Derecha: caras en carriles
  const anchoCara = movil ? 44 : Math.min(230, Math.max(150, derW / 4));
  const R = Math.max(1, Math.floor((derW - 12) / anchoCara));

  const colocadas = apilarV(pills, (p) => Y(p.anio), 26, L);
  const caras = apilarV(filosofos, (f) => Y(f.fl), 46, R, 6);
  const duran = eventos.filter((e) => e.hasta != null && e.hasta > e.anio + 1);
  const paso = pxAnio * 10 >= 60 ? 10 : 25;
  const marcas: number[] = [];
  for (let a = inicio + paso; a < fin; a += paso) marcas.push(a);

  const elegido = sel;
  const color = (p: Pill) => (p.k === 'evento' ? TIPOS[p.e.tipo]?.color ?? '#868E96' : 'var(--tinta)');

  const izq = (
    <div className="siglo-izq" style={{height: alto}}>
      <svg className="crono-rayas" width={izqW + EJE} height={alto} aria-hidden="true">
        {colocadas.map(({t: p, carril, y}) => (
          <polyline key={p.id} points={`${izqW + EJE},${Y(p.anio)} ${izqW - hueco + 8},${Y(p.anio)} ${xPill(carril)},${y}`} fill="none" stroke={color(p)} strokeOpacity={0.4} strokeWidth={1} />
        ))}
      </svg>
      {periodos.map((p) => {
        const top = Y(Math.max(p.desde, inicio)), bajo = Y(Math.min(p.hasta, fin));
        return (
          <button
            key={'b' + p.id}
            type="button"
            className={`crono-banda${p.desde >= inicio ? ' empieza' : ''}${p.hasta <= fin ? ' acaba' : ''}${elegido?.id === p.id ? ' on' : ''}`}
            style={{left: x0 + carrilPeriodo.get(p.id)! * (bandaW + 3), top, height: Math.max(6, bajo - top), width: bandaW}}
            onClick={() => setSel(elegido?.id === p.id ? null : {id: p.id})}
            title={`${p.nombre} (${anioTxt(p.desde)} – ${anioTxt(p.hasta)})`}
          >
            {bajo - top > 50 && <span>{p.nombre}</span>}
          </button>
        );
      })}
      {duran.map((e, i) => (
        <button
          key={'d' + e.id}
          type="button"
          className={`crono-dura${elegido?.id === e.id ? ' on' : ''}`}
          style={{left: xDuras + (i % 3) * 7, top: Y(e.anio), height: Math.max(4, Y(e.hasta!) - Y(e.anio)), ['--c' as string]: TIPOS[e.tipo]?.color ?? '#868E96'}}
          onClick={() => setSel(elegido?.id === e.id ? null : {id: e.id})}
          title={`${e.titulo} (${anioTxt(e.anio)} – ${anioTxt(e.hasta!)})`}
          aria-label={e.titulo}
        />
      ))}
      {colocadas.map(({t: p, carril, y}) => {
        const on = elegido?.id === p.id;
        return (
          <button
            key={p.id}
            type="button"
            className={`crono-pill ${p.k}${p.k === 'evento' ? ' n' + p.e.nivel : ''}${on ? ' on' : ''}`}
            style={{top: y, left: xPill(carril) - anchoPill, width: anchoPill, ['--c' as string]: p.k === 'evento' ? color(p) : undefined}}
            onClick={() => setSel(on ? null : {id: p.id})}
            title={p.k === 'evento' ? p.e.titulo : p.fr.texto}
          >
            {p.k === 'frase' ? (
              <>
                «{p.fr.texto.replace(/\.$/, '')}» <small>{p.fr.autorNombre.replace(/,?\s+Jr\.?$/, '').split(' ').slice(-1)[0]}</small>
              </>
            ) : (
              <>
                <b>{p.e.hasta != null ? `${anioTxt(p.e.anio)}–${anioTxt(p.e.hasta)}` : anioTxt(p.e.anio)}</b> {p.e.titulo}
              </>
            )}
          </button>
        );
      })}
    </div>
  );

  const marcasRail = (
    <span className="crono-eje-marcas" aria-hidden="true">
      {marcas.map((a) => (
        <span key={a} className="crono-marca" style={{top: Y(a)}}>
          {a === 0 ? '' : anioTxt(a)}
        </span>
      ))}
      {colocadas.map(({t: p}) => (
        <span key={'p' + p.id} className="crono-punto" style={{top: Y(p.anio), background: color(p)}} />
      ))}
    </span>
  );

  const der = (
    <div className="siglo-der" style={{height: alto}}>
      {caras.map(({t: f, carril, y}) => (
        <button key={f.id} type="button" className="crono-cara" style={{top: y, left: 10 + carril * anchoCara, maxWidth: anchoCara - 6}} onClick={() => abrir(f.id)} title={`${f.nombre} (${f.fechas})`}>
          <Retrato nombre={f.nombre} img={f.img} cats={f.categorias} size={38} />
          {!movil && <span>{f.nombre}</span>}
        </button>
      ))}
    </div>
  );

  return {izq, rail: marcasRail, der, alto};
}

/** Pestaña pequeña al lado (como la ficha de los filosofos) con lo pulsado de la historia */
export function DetalleHistoria({h, abrir}: {h: Historia; abrir: (id: string) => void}) {
  const {datos, sel, setSel} = h;
  if (!sel || !datos) return null;
  const ev = datos.eventos.find((e) => e.id === sel.id);
  const fr = datos.frases.find((f) => f.id === sel.id);
  const pe = datos.periodos.find((p) => p.id === sel.id);
  if (!ev && !fr && !pe) return null;
  return (
    <aside key={sel.id} className="crono-detalle" role="dialog" aria-label="Más información">
      <button type="button" className="cd-cerrar" onClick={() => setSel(null)} aria-label="Cerrar">
        ✕
      </button>
      {ev && (
        <>
          <p className="cd-meta" style={{color: TIPOS[ev.tipo]?.color}}>
            {TIPOS[ev.tipo]?.nombre} · {ev.region}
          </p>
          <h4>{ev.titulo}</h4>
          <p className="cd-fecha">{ev.hasta != null ? `${anioTxt(ev.anio)} – ${anioTxt(ev.hasta)}` : anioTxt(ev.anio)}</p>
          <p>{ev.texto}</p>
          <a href={ev.wiki} target="_blank" rel="noopener">
            Leer más en Wikipedia ↗
          </a>
        </>
      )}
      {pe && (
        <>
          <p className="cd-meta">Periodo · {pe.region}</p>
          <h4>{pe.nombre}</h4>
          <p className="cd-fecha">
            {anioTxt(pe.desde)} – {anioTxt(pe.hasta)}
          </p>
          <p>{pe.texto}</p>
          <a href={pe.wiki} target="_blank" rel="noopener">
            Leer más en Wikipedia ↗
          </a>
        </>
      )}
      {fr && (
        <>
          <p className="cd-meta">Frase que dio que hablar · {anioTxt(fr.anio)}</p>
          <p className="cd-frase">«{fr.texto}»</p>
          <p className="cd-fecha">
            {fr.autor ? (
              <button type="button" className="crono-autor" onClick={() => abrir(fr.autor!)}>
                {fr.autorNombre}
              </button>
            ) : (
              fr.autorNombre
            )}
            , <i>{fr.obra}</i>
          </p>
          <p>{fr.porQue}</p>
          {fr.nota && <p className="cd-nota">{fr.nota}</p>}
          <a href={fr.fuente} target="_blank" rel="noopener">
            Fuente ↗
          </a>
        </>
      )}
    </aside>
  );
}
