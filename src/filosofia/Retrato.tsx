import {useState} from 'react';
import {CAT, type CatId} from './config';

/** Anillo con un trozo de color por categoria: «conic-gradient(rojo 0 50%, azul 50% 100%)» */
export function anillo(cats: CatId[]) {
  if (!cats.length) return 'var(--raya)';
  const n = cats.length, hueco = n > 1 ? 1.2 : 0;
  return `conic-gradient(${cats
    .map((c, i) => `${CAT[c].color} ${(i * 100) / n + hueco}% ${((i + 1) * 100) / n - hueco}%, var(--papel) ${((i + 1) * 100) / n - hueco}% ${((i + 1) * 100) / n}%`)
    .join(', ')})`;
}

const iniciales = (n: string) =>
  n
    .split(/\s+/)
    .filter((p) => /^[A-ZÁÉÍÓÚÑÖÜ]/.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join('');

/** Retrato redondo con el anillo de categorias; si no hay foto, las iniciales */
export default function Retrato({nombre, img, cats, size = 64, eager}: {nombre: string; img: string | null; cats: CatId[]; size?: number; eager?: boolean}) {
  const [fallo, setFallo] = useState(false);
  return (
    <span className="retrato" style={{width: size, height: size, background: anillo(cats)}} aria-hidden="true">
      {img && !fallo ? (
        <img src={img} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFallo(true)} />
      ) : (
        <span className="iniciales" style={{fontSize: size * 0.32}}>
          {iniciales(nombre)}
        </span>
      )}
    </span>
  );
}
