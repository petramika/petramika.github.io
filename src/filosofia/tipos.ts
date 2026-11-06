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
};

export type Enlace = {titulo: string; url: string; tipo: string};

/** Lo que se ve al abrir la ficha (fichas.json, carga aparte) */
export type Ficha = {
  resumen: string | null;
  ideas: string[] | null;
  curiosidad: string | null;
  frase: {texto: string; fuente: string} | null;
  influyeEn: string[] | null;
  obras: {titulo: string; anio?: string; deQueVa?: string; url?: string}[];
  enlaces: Enlace[];
  commons: string | null;
  wikidata: string;
};
