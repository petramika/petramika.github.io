import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';
import {LEGS} from './datos';

/*
  Lo que comparten todas las pestañas: que pestaña se ve y que legislatura
  esta elegida. Ambas viven en la URL, como en la version original:
  #partidos, #economia... para las pestañas y #l<id> para una legislatura.
*/
export const PESTANAS = [
  ['global', 'Global'],
  ['partidos', 'Partidos y programas'],
  ['economia', 'Economía'],
  ['vivienda', 'Vivienda'],
  ['inmigracion', 'Inmigración'],
  ['violencia', 'Violencia'],
  ['medios', 'Medios'],
] as const;
export type Pestana = (typeof PESTANAS)[number][0];

const OTRAS = PESTANAS.map(([id]) => '#' + id).filter((h) => h !== '#global');

type Estado = {
  tab: Pestana;
  setTab: (t: Pestana) => void;
  /** id de la legislatura elegida */
  current: string;
  /** Elige una legislatura; con scroll, baja hasta su detalle */
  select: (id: string, scroll?: boolean) => void;
};

const Contexto = createContext<Estado | null>(null);
export const useEstado = () => useContext(Contexto)!;

const ultima = LEGS[LEGS.length - 1].id;
const reemplazarHash = (h: string) => location.hash !== h && history.replaceState(null, '', h);

function leerHash(): {tab: Pestana; current?: string} {
  if (OTRAS.includes(location.hash)) return {tab: location.hash.slice(1) as Pestana};
  const id = location.hash.replace('#l', '');
  return {tab: 'global', current: LEGS.some((l) => l.id === id) ? id : undefined};
}

export function EstadoProvider({children}: {children: ReactNode}) {
  const inicial = leerHash();
  const [tab, setTabState] = useState<Pestana>(inicial.tab);
  const [current, setCurrent] = useState(inicial.current ?? ultima);

  const setTab = useCallback((t: Pestana) => {
    setTabState(t);
    if (t !== 'global') reemplazarHash('#' + t);
    else if (OTRAS.includes(location.hash)) reemplazarHash('#global');
  }, []);

  const select = useCallback((id: string, scroll?: boolean) => {
    setCurrent(id);
    reemplazarHash('#l' + id);
    if (scroll)
      requestAnimationFrame(() =>
        document.getElementById('detail')?.scrollIntoView({
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'start',
        }),
      );
  }, []);

  useEffect(() => {
    const alCambiar = () => {
      const h = leerHash();
      setTabState(h.tab);
      if (h.current) setCurrent(h.current);
    };
    addEventListener('hashchange', alCambiar);
    return () => removeEventListener('hashchange', alCambiar);
  }, []);

  const valor = useMemo(() => ({tab, setTab, current, select}), [tab, setTab, current, select]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
