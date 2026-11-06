/*
  Los datos de Cuarenta años de promesas: un JSON por tema, agrupados en
  carpetas por pestaña (comun/ es lo que usan varias). Aqui solo se
  reexportan. Los nombres en mayusculas son los del codigo original, para
  que la logica de cada pestaña se lea igual que antes de pasar a React.

  Los datos de la pestaña de partidos no estan aqui: pesan mucho y solo se
  cargan al abrir esa pestaña (ver pestanas/partidos/datos.ts).
*/
/* eslint-disable @typescript-eslint/no-explicit-any */
import legislaturas from './comun/legislaturas.json';
import partidosColores from './comun/partidos-colores.json';
import gobiernos from './comun/gobiernos.json';
import indicadores from './comun/indicadores.json';
import estadosPromesa from './comun/estados-promesa.json';
import acontecimientos from './comun/acontecimientos.json';
import enCadaEleccion from './comun/en-cada-eleccion.json';
import enCadaEleccionAnio from './comun/en-cada-eleccion-anio.json';
import enCadaEleccionFecha from './comun/en-cada-eleccion-fecha.json';
import enCadaEleccionCorrecciones from './comun/en-cada-eleccion-correcciones.json';
import impuestosEnCadaEleccion from './comun/impuestos-en-cada-eleccion.json';
import seriesAnuales from './comun/series-anuales.json';
import seriesEscalonadas from './comun/series-escalonadas.json';
import seriesSueltas from './comun/series-sueltas.json';
import participacion from './comun/participacion.json';
import empleoGenero from './global/empleo-genero.json';
import violencia from './global/violencia.json';
import accidentes from './global/accidentes.json';
import medioambiente from './global/medioambiente.json';
import decretosLey from './global/decretos-ley.json';
import fiscal from './economia/fiscal.json';
import presionFiscal from './economia/presion-fiscal.json';
import cofogCategorias from './economia/cofog-categorias.json';
import cofog from './economia/cofog.json';
import pensiones from './economia/pensiones.json';
import pensionesRevalorizacion from './economia/pensiones-revalorizacion.json';
import ipc from './economia/ipc.json';
import autonomos from './economia/autonomos.json';
import clasesRenta from './economia/clases-renta.json';
import sinHogar from './economia/sin-hogar.json';
import vivienda from './vivienda/vivienda.json';
import tenencia from './vivienda/tenencia.json';
import hayCasas from './vivienda/hay-casas.json';
import inmigracion from './inmigracion/inmigracion.json';
import poblacionInmig from './inmigracion/poblacion.json';
import dondeNacieron from './inmigracion/donde-nacieron.json';
import delincuencia from './inmigracion/delincuencia.json';
import nacionalizaciones from './inmigracion/nacionalizaciones.json';
import paguitas from './inmigracion/paguitas.json';
import trabajo from './inmigracion/trabajo.json';
import sanidad from './inmigracion/sanidad.json';
import natalidad from './inmigracion/natalidad.json';
import fecundidadOrigen from './inmigracion/fecundidad-origen.json';
import migraciones from './inmigracion/migraciones.json';
import menores from './inmigracion/menores.json';
import remesas from './inmigracion/remesas.json';
import medios from './medios/medios.json';

/** Un indicador: paro, deuda, salario minimo... `dec` y `suf` dicen como se escribe. */
export type Indicador = {
  k: string; g: string; src: string; t: string; u: string; dir: 'up' | 'down' | null; kind: string;
  dec: number; suf: string; decDesde1000?: number; note?: string; approxBefore?: number;
  also?: boolean; kpiOnly?: boolean; multi?: {k: string; lab: string; c: string; dash?: boolean}[];
};
/** Una legislatura. El resto de campos (promesas, investidura...) se leen tal cual del JSON. */
export type Legislatura = {
  id: string; num: string; a: string; b: string; s: string; e: string; gov: string; mandato: string[];
  pres: string; failed?: boolean; current?: boolean; split?: string; res: [string, number, number?][];
  prom: any[]; prom2?: any; [k: string]: any;
};

export const LEGS = legislaturas as unknown as Legislatura[];
export const PARTY = partidosColores as Record<string, {c: string; n: string; o: number}>;
export const GOVS = gobiernos as {p: string; a: string; b: string}[];
export const METRICS = indicadores as unknown as Indicador[];
export const STATUS = estadosPromesa as Record<string, {lab: string; cls: string; ic: string; [k: string]: any}>;
export const EVENTS = acontecimientos as any[];
export const SNAP = enCadaEleccion as Record<string, any>;
export const SNAP_YEAR = enCadaEleccionAnio as Record<string, any>;
export const SNAP_X = enCadaEleccionFecha as Record<string, number>;
export const SNAP_FIX = enCadaEleccionCorrecciones as Record<string, any>;
export const TAXSNAP = impuestosEnCadaEleccion as Record<string, any>;
export const ANNUAL = seriesAnuales as Record<string, Record<string, number>>;
export const STEPS = seriesEscalonadas as unknown as Record<string, [number, number, string][]>;
export const SPARSE = seriesSueltas as Record<string, Record<string, number>>;
export const TURNOUT = participacion as Record<string, any>;
export const EMPLEO = empleoGenero as any;
export const VIOL = violencia as any;
export const ACC = accidentes as any;
export const ENV = medioambiente as any;
/** Reales decretos-ley publicados en el BOE: por año y por legislatura (de elección a elección) */
export type DecretosLegislatura = {n: number; desde: string; hasta: string; primero?: string; ultimo?: string; tramos?: {p: string; n: number}[]};
export const DECRETOS = decretosLey as unknown as {
  fuente: {nombre: string; url: string; consulta: string}; porAnio: Record<string, number>; porLegislatura: Record<string, DecretosLegislatura>;
};
export const FISCAL = fiscal as any;
export const PF = presionFiscal as any;
export const COFOG_CATS = cofogCategorias as unknown as [string, string, string][];
export const COFOG = cofog as Record<string, any>;
export const PENS = pensiones as any;
export const PREV = pensionesRevalorizacion as Record<string, number>;
export const IPCDIC = ipc.diciembre as Record<string, number>;
export const IPC2026 = ipc.estimado2026;
export const RETA = autonomos as any;
/** Clases por ingresos y pobreza, 2008–2025 (calculo propio con microdatos del INE) */
export const CLASES = clasesRenta;
/** Personas sin hogar atendidas en centros (INE, 2005, 2012 y 2022) */
export const SIN_HOGAR = sinHogar;
export const VIV = vivienda as any;
/** % de hogares en propiedad, alquiler o cesion, 2004–2025 (INE, ECV) */
export const TENENCIA = tenencia;
/** Adultos, hogares y viviendas hoy, y el reparto de vacias del censo de 2021 (INE) */
export const HAY_CASAS = hayCasas;
export const INMIG = inmigracion as any;
// Inmigracion: una entrada por bloque de la pestaña (ver datos/inmigracion/)
export const POB_INMIG = poblacionInmig as any;
export const DONDE_NACIERON = dondeNacieron as any;
export const DELITO = delincuencia as any;
export const NACIONALIZ = nacionalizaciones as any;
export const PAGUITAS = paguitas as any;
export const TRABAJO = trabajo as any;
export const SANIDAD = sanidad as any;
export const NATALIDAD = natalidad as any;
/** Hijos por mujer según el país de nacimiento de la madre (cálculo propio, INE) y en los países de origen (Banco Mundial) */
export const FEC_ORIGEN = fecundidadOrigen as any;
export const MIGRACIONES = migraciones as any;
export const MENORES = menores as any;
export const REMESAS = remesas as any;
export const MEDIA = medios as any;
