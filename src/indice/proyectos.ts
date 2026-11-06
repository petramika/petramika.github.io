/*
  Lo que sale en el indice, en este orden. Cada proyecto es una carpeta de la
  web: `ruta` tiene que coincidir con la carpeta que construye vite.config.ts.
  `marca` es el color del subrayador que pasa por el nombre al señalarlo.
*/
export type Proyecto = {
  ruta: string;
  nombre: string;
  descripcion: string;
  marca: string;
  nota?: string;
  /** Captura de la app (public/miniaturas), alta: al señalarla se recorre de arriba abajo */
  miniatura: string;
  /** Zona de la captura que se ve en reposo (object-position) */
  foco?: string;
};

export const proyectos: Proyecto[] = [
  {
    ruta: '/rota/',
    nombre: 'rota',
    descripcion:
      'Esto es sentir. Una forma visual y digital de romperse. Acercar la tecnología al sentimiento profundo de dolor.',
    marca: '#ffc4dc',
    miniatura: '/miniaturas/rota.jpg',
    foco: '50% 48%',
  },
  {
    ruta: '/espana-politica-datos/',
    nombre: 'espana-politica-datos',
    descripcion:
      'España política en datos: cuarenta años de historia política, de 1986 a hoy. Quién gobernó, qué prometió y qué cumplió, y cómo cambiaron la economía, la vivienda, la inmigración y los medios. Una guía cercana para formarse una idea antes de votar.',
    marca: '#ffe27a',
    miniatura: '/miniaturas/promesas.jpg',
  },
  {
    ruta: '/historia-filosofia-tldr/',
    nombre: 'historia-filosofia-tldr',
    descripcion:
      'Filosofía comprimida: 2.600 años de ideas en una línea del tiempo, de Tales a hoy. Cada filósofo, por qué es famoso y dónde leerlo, y las palabras raras explicadas fácil.',
    marca: '#c9b8ff',
    miniatura: '/miniaturas/filosofia.jpg',
  },
];
