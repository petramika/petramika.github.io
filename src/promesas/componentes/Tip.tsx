import {createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode} from 'react';

/*
  La etiqueta flotante oscura que sigue al cursor (el #tip del original).
  Hay una sola para toda la pagina; cualquier componente la usa con useTip():

    const tip = useTip();
    tip.mostrar(<>contenido</>, {x: e.clientX, y: e.clientY});
    tip.ocultar();

  `lado` dice si va encima del cursor (graficas, balance) o debajo (gasto
  por funciones). `grande` es la version ancha con cabecera (.tip.big).
*/
type Opciones = {x: number; y: number; lado?: 'arriba' | 'abajo'; dx?: number; dy?: number; grande?: boolean};
type Tip = {mostrar: (contenido: ReactNode, o: Opciones) => void; ocultar: () => void};

const Contexto = createContext<Tip>({mostrar: () => {}, ocultar: () => {}});
export const useTip = () => useContext(Contexto);

export function TipProvider({children}: {children: ReactNode}) {
  const [estado, setEstado] = useState<{contenido: ReactNode; o: Opciones} | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const mostrar = useCallback((contenido: ReactNode, o: Opciones) => setEstado({contenido, o}), []);
  const ocultar = useCallback(() => setEstado(null), []);
  const api = useMemo(() => ({mostrar, ocultar}), [mostrar, ocultar]);

  useLayoutEffect(() => {
    const t = ref.current;
    if (!estado || !t) return;
    const {x, y, lado = 'arriba', dx = 16, dy = lado === 'arriba' ? 14 : 16} = estado.o;
    t.style.left = Math.max(8, Math.min(x + dx, innerWidth - t.offsetWidth - 8)) + 'px';
    t.style.top =
      (lado === 'arriba'
        ? Math.max(8, Math.min(y - t.offsetHeight - dy, innerHeight - t.offsetHeight - 8))
        : Math.max(8, Math.min(y + dy, innerHeight - t.offsetHeight - 8))) + 'px';
  }, [estado]);

  return (
    <Contexto.Provider value={api}>
      {children}
      <div ref={ref} className={`tip${estado?.o.grande !== false ? ' big' : ''}`} hidden={!estado}>
        {estado?.contenido}
      </div>
    </Contexto.Provider>
  );
}
