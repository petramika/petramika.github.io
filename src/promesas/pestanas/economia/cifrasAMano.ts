/*
  Cifras de la pestaña que no estan en los JSON de datos (salen de boletines
  e informes). No se actualizan solas: hay que revisarlas a mano.
*/

/** Gasto y numero de pensiones contributivas (Seguridad Social, Boletin de Informacion Estadistica) */
export const PENSIONES_A_MANO = {anio: '2025', gastoMillones: 182683, numeroMillones: 10.4, anioInicio: '1986', numeroInicioMillones: 5.6};

/**
 * Cuota de autonomos por ingresos reales: limites del tramo mas bajo y del mas
 * alto (€ netos al mes) que rigen en `anio`, y año de las tablas que aplica
 */
export const TRAMOS_RETA = {anio: '2026', menosDe: 670, masDe: 6000, tablasDe: '2025'};

/** Tarifa plana para quien empieza como autonomo, € al mes desde 2023 */
export const TARIFA_PLANA = 80;
