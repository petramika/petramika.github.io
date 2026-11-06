/*
  Fecha de la ultima actualizacion de la web: la pone Vite al construir
  (define __ACTUALIZADO__ en vite.config.ts). Cada empujon a main construye
  y publica, asi que es la fecha de la version que se esta viendo.
*/
declare const __ACTUALIZADO__: string;

/** «noviembre 2026» */
export const actualizado = new Intl.DateTimeFormat('es-ES', {month: 'long', year: 'numeric'}).format(new Date(__ACTUALIZADO__)).replace(' de ', ' ');
