/*
  Los datos de la historia (acontecimientos, periodos y frases celebres), que
  se bajan aparte la primera vez que se abre la cronologia.
*/
export type Evento = {id: string; anio: number; hasta: number | null; titulo: string; texto: string; nivel: 1 | 2 | 3; tipo: string; region: string; wiki: string};
export type Periodo = {id: string; desde: number; hasta: number; nombre: string; region: string; nivel: 1 | 2; texto: string; wiki: string};
export type Frase = {id: string; anio: number; texto: string; autor: string | null; autorNombre: string; obra: string; porQue: string; nota: string | null; nivel: 1 | 2; fuente: string};
export type DatosHistoria = {eventos: Evento[]; periodos: Periodo[]; frases: Frase[]};

/** Tipos de acontecimiento y su color */
export const TIPOS: Record<string, {nombre: string; color: string}> = {
  politica: {nombre: 'Política', color: '#1C7ED6'},
  guerra: {nombre: 'Guerras', color: '#C92A2A'},
  ciencia: {nombre: 'Ciencia y técnica', color: '#E67700'},
  religion: {nombre: 'Religión', color: '#AE3EC9'},
  cultura: {nombre: 'Cultura', color: '#D6336C'},
  sociedad: {nombre: 'Sociedad', color: '#2F9E44'},
  exploracion: {nombre: 'Exploración', color: '#0B7285'},
};

let cache: DatosHistoria | null = null;
export const historiaCargada = () => cache;
export const cargarHistoria = () =>
  cache ? Promise.resolve(cache) : import('./datos/historia.json').then((m) => (cache = m.default as unknown as DatosHistoria));
