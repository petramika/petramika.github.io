import {createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import './glosario.css';

/*
  Palabras dificiles, comun a todas las webs. Se pintan subrayadas con fondo
  gris; al pasar el raton (o al tocarlas en el movil) sale una explicacion
  facil. Hay un solo bocadillo para toda la pagina, que se coloca junto a la
  palabra. Cada web pasa su diccionario al proveedor:
    <ProveedorGlosario glosario={{clave: {t: 'Término', d: 'Definición'}}}>
  y marca las palabras con <T k="clave">texto</T>, o con [[clave]] /
  [[texto|clave]] dentro de un texto que pinte <Texto>.
*/
export type Diccionario = Record<string, {t: string; d: string}>;

type Abierto = {clave: string; el: HTMLElement; fijo: boolean} | null;
const Ctx = createContext<{G: Diccionario; abierto: Abierto; abrir: (a: Abierto) => void; cerrarSi: (el: HTMLElement) => void}>({G: {}, abierto: null, abrir: () => {}, cerrarSi: () => {}});

export function ProveedorGlosario({glosario, children}: {glosario: Diccionario; children: ReactNode}) {
  const [abierto, setAbierto] = useState<Abierto>(null);
  const cerrarSi = useCallback((el: HTMLElement) => setAbierto((a) => (a && a.el === el && !a.fijo ? null : a)), []);

  // Esc, clic fuera o scroll largo lo cierran
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(null);
    const fuera = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.termino') && !t.closest('.bocadillo')) setAbierto(null);
    };
    document.addEventListener('keydown', tecla);
    document.addEventListener('pointerdown', fuera);
    return () => {
      document.removeEventListener('keydown', tecla);
      document.removeEventListener('pointerdown', fuera);
    };
  }, [abierto]);

  return (
    <Ctx.Provider value={{G: glosario, abierto, abrir: setAbierto, cerrarSi}}>
      {children}
      {abierto && <Bocadillo {...abierto} G={glosario} />}
    </Ctx.Provider>
  );
}

function Bocadillo({clave, el, G}: {clave: string; el: HTMLElement; G: Diccionario}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{top: number; left: number; arriba: boolean; flecha: number} | null>(null);
  const g = G[clave];

  useLayoutEffect(() => {
    const colocar = () => {
      const r = el.getBoundingClientRect(), b = ref.current!.getBoundingClientRect();
      const margen = 10, ancho = b.width, alto = b.height;
      const centro = r.left + r.width / 2;
      const left = Math.min(Math.max(margen, centro - ancho / 2), window.innerWidth - ancho - margen);
      const arriba = r.bottom + alto + 14 > window.innerHeight && r.top > alto + 14;
      setPos({top: arriba ? r.top - alto - 10 : r.bottom + 10, left, arriba, flecha: Math.min(Math.max(14, centro - left), ancho - 14)});
    };
    colocar();
    window.addEventListener('scroll', colocar, true);
    window.addEventListener('resize', colocar);
    return () => {
      window.removeEventListener('scroll', colocar, true);
      window.removeEventListener('resize', colocar);
    };
  }, [el, clave]);

  if (!g) return null;
  return (
    <div
      ref={ref}
      role="tooltip"
      id="bocadillo"
      className={`bocadillo${pos?.arriba ? ' arriba' : ''}`}
      style={pos ? {top: pos.top, left: pos.left, ['--flecha' as string]: pos.flecha + 'px'} : {visibility: 'hidden', top: 0, left: 0}}
    >
      <b>{g.t}</b>
      <span>{g.d}</span>
    </div>
  );
}

export function Termino({clave, children}: {clave: string; children: ReactNode}) {
  const {G, abierto, abrir, cerrarSi} = useContext(Ctx);
  const ref = useRef<HTMLButtonElement>(null);
  const t = useRef<number | undefined>(undefined);
  if (!G[clave]) return <>{children}</>;
  const mio = abierto?.el === ref.current && abierto != null;
  return (
    <button
      ref={ref}
      type="button"
      className={`termino${mio ? ' activo' : ''}`}
      aria-describedby={mio ? 'bocadillo' : undefined}
      aria-expanded={mio}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(t.current);
        t.current = window.setTimeout(() => ref.current && (!abierto?.fijo || abierto.el === ref.current) && abrir({clave, el: ref.current, fijo: false}), 90);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(t.current);
        ref.current && cerrarSi(ref.current);
      }}
      onFocus={() => ref.current && !abierto?.fijo && abrir({clave, el: ref.current, fijo: false})}
      onBlur={() => ref.current && cerrarSi(ref.current)}
      onClick={(e) => {
        e.stopPropagation();
        abrir(mio && abierto?.fijo ? null : {clave, el: ref.current!, fijo: true});
      }}
    >
      {children}
    </button>
  );
}

const MARCA = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** Pinta un texto con sus [[terminos]] */
export function Texto({children}: {children: string | null | undefined}) {
  if (!children) return null;
  const partes: ReactNode[] = [];
  let i = 0;
  for (const m of children.matchAll(MARCA)) {
    if (m.index! > i) partes.push(children.slice(i, m.index));
    const visible = m[1], clave = (m[2] ?? m[1]).trim();
    partes.push(
      <Termino key={m.index} clave={clave}>
        {visible}
      </Termino>,
    );
    i = m.index! + m[0].length;
  }
  partes.push(children.slice(i));
  return <>{partes}</>;
}

/** Texto plano, sin marcas (para buscar y para title) */
export const plano = (s: string | null | undefined) => (s ?? '').replace(MARCA, (_, a) => a);

/** Atajo para JSX: <T k="deficit">déficit</T> */
export const T = ({k, children}: {k: string; children: ReactNode}) => <Termino clave={k}>{children}</Termino>;
