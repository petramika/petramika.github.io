import {ICONS} from './iconos';

/** Icono de un area, por su clave (edu, viv, san...). Nada si la clave no existe. */
export default function Icono({k, size = 18}: {k: string; size?: number}) {
  const ic = ICONS[k];
  if (!ic) return null;
  return (
    <svg className="ico" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={ic[1]} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
