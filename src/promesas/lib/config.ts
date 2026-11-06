/*
  Constantes de presentacion: medidas de las graficas, colores y opciones.
  No son datos (no salen de ninguna fuente), por eso viven aqui y no en datos/.
*/
export const INK = '#1F2328';
export const TEAL = '#0B7A75';

// Plot arriba (T..H-B), etiquetas de años, y debajo una franja con la subida/bajada de cada legislatura.
// x1 es el fin minimo del eje: si algun indicador tiene datos posteriores, Grafico lo alarga
// hasta el ultimo dato + `margen` años (hoy el ultimo punto es 2026.8, asi que se queda en 2026.9).
export const CH = {W: 560, H: 226, L: 44, R: 12, T: 10, B: 56, x0: 1986, x1: 2026.9, margen: 0.1};

export const SRC_LAB: Record<string, string> = {annual: 'anual', step: 'tipo vigente', sparse: 'años con dato', snap: 'en cada elección'};

// Indicadores de la tabla "De un vistazo"
// 'rdl' no es un indicador: es la columna de decretos-ley (datos/global/decretos-ley.json)
export const GLANCE = ['rdl', 'paro', 'deuda', 'ipc', 'smi', 'precio', 'anios', 'edad', 'iva', 'pf', 'part'];

// Orden de los estados de una promesa: cumplida, a medias, no aprobada, incumplida, en curso
export const SORDER = ['c', 'p', 'n', 'i', 'e'];

