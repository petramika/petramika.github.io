/*
  Datos de la pestaña de partidos, con los nombres del codigo original.
  Solo los importa esta pestaña, asi que se descargan al abrirla.
*/
import partidos from '../../datos/partidos/partidos.json';
import temas from '../../datos/partidos/temas.json';
import temasInfo from '../../datos/partidos/temas-info.json';
import elecciones from '../../datos/partidos/elecciones.json';
import clavesGobierno from '../../datos/partidos/claves-gobierno.json';
import {LEGS} from '../../datos';

/** Una propuesta. src: "p" programa o documento oficial · "m" prensa */
export type Propuesta = {area: string; text: string; topic?: string; src?: string; url?: string; medio?: string};
/** Lo que hizo un partido en una eleccion. e: id de la legislatura, el de la proxima eleccion ("2026") o "sin_generales" */
export type EleccionPartido = {
  e: string; as?: string; seats?: number | null; vote?: number | null; cis?: number | null;
  programa?: {estado: string; url?: string; donde?: string}; items?: Propuesta[];
};
export type Partido = {
  key: string; n: string; color: string; d: string; grp: string; notRun?: boolean;
  /** Año de fundacion y, si ya no existe, de desaparicion; las notas matizan el año */
  fundado: number; fundadoNota?: string; disuelto?: number; disueltoNota?: string;
  web?: [string, string][]; elections: EleccionPartido[];
};
/** Un tema: que significa, argumentos a favor y en contra, quien lo paga, precedente y areas */
export type Tema = {t: string; q: string; pro: string[]; con: string[]; pay?: string; ej?: string; af?: string[]};

export const PARTIES = partidos as unknown as Partido[];
export const TOPICS = temas as unknown as Record<string, Tema>;
// HTML de confianza escrito por la autora: se pinta tal cual en la ventana (i)
export const TOPIC_INFO = temasInfo as Record<string, string>;
/** [id, legislatura, fecha] de cada eleccion, en orden */
export const PEL = elecciones as [string, string, string][];
/** Con que clave aparece cada partido en el `mandato` de las legislaturas */
export const GOVKEY = clavesGobierno as Record<string, string[]>;

/** Si una eleccion ya tiene resultado: su legislatura trae el reparto de escaños */
export const conResultado = (id: string) => LEGS.some((l) => l.id === id && l.res.length > 0);
/** Ids de las elecciones con resultado, en orden */
export const ELEC = PEL.map(([id]) => id).filter(conResultado);
/**
  Eleccion convocada que aun no tiene resultado (hoy, la del 29-N-2026). En
  cuanto legislaturas.json traiga su reparto de escaños, pasa sola a ELEC.
*/
export const esProxima = (id: string) => PEL.some(([x]) => x === id) && !conResultado(id);
export const PROXIMA = PEL.map(([id]) => id).find(esProxima);
/** Cuando se hizo la estimacion del CIS que partidos.json guarda en la proxima eleccion (no viene en el JSON) */
export const CIS_CUANDO = {corto: 'oct 2026', largo: 'octubre de 2026'};
