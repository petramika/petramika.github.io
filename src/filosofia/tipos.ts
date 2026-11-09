import type {CatId, EraId} from './config';

/** Lo que se ve en la linea del tiempo (lista.json, carga con la pagina) */
export type Filosofo = {
  id: string;
  nombre: string;
  fechas: string;
  nace: number | null;
  muere: number | null;
  /** Año aproximado de madurez: nacimiento + 35 */
  fl: number;
  era: EraId;
  region: string | null;
  escuela: string | null;
  categorias: CatId[];
  conocidoPor: string | null;
  img: string | null;
  /** Segun Wikidata */
  sexo?: Sexo | null;
  fama?: Fama | null;
  /** Trozo de fichas donde esta la suya (datos/fichas/NN.json) */
  t: number;
};

export type Sexo = 'hombre' | 'mujer' | 'otro';

/** Ranking de fama (build.py a partir de fama.json) */
export type Fama = {
  /** 1 baja, 2 media, 3 alta, 4 muy alta */
  n: 1 | 2 | 3 | 4;
  /** Puesto entre todos (1 = el mas famoso) */
  puesto: number;
};

export type Enlace = {titulo: string; url: string; tipo: string};

/** Lo que se ve al abrir la ficha (fichas.json, carga aparte) */
export type Ficha = {
  resumen: string | null;
  ideas: string[] | null;
  curiosidad: string | null;
  frase: {texto: string; fuente: string} | null;
  influyeEn: string[] | null;
  influidoPor: string[];
  obras: {titulo: string; anio?: string; deQueVa?: string; url?: string}[];
  enlaces: Enlace[];
  commons: string | null;
  wikidata: string;
};
