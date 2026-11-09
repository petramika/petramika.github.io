/*
  Busqueda aproximada («fuzzy»): perdona tildes, mayusculas y erratas
  («nietzche», «espinoza», «estoisismo»). Cada palabra que se escribe tiene
  que parecerse a alguna palabra del filosofo (nombre, corriente, lugar,
  temas o «conocido por»): igual, empezando igual, conteniendola o con una o
  dos letras cambiadas segun lo larga que sea.
*/
export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();

// Palabras que no ayudan a buscar
const VACIAS = new Set('de del la las el los y e o u a en un una por con al lo que su sus se'.split(' '));
export const palabras = (s: string) => norm(s).split(' ').filter((w) => w && !VACIAS.has(w));

/** Distancia de edicion con trasposiciones (Damerau, version corta); corta en cuanto pasa de `max` */
function distancia(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let minFila = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      minFila = Math.min(minFila, d[i][j]);
    }
    if (minFila > max) return max + 1;
  }
  return d[a.length][b.length];
}

/*
  Palabras de la misma familia o del mismo concepto: al buscar una, tambien
  vale la otra (pero cuenta algo menos). Asi «tecnologia» encuentra a quien
  habla de la tecnica, sin confundirla con la «teologia».
*/
const GRUPOS = [
  'tecnologia tecnica tecnologico maquina maquinas artefacto cibernetica digital internet',
  'mujer mujeres feminismo feminista genero',
  'dios dioses religion teologia divino fe',
  'mente conciencia cerebro pensamiento',
  'politica poder estado gobierno democracia',
  'etica moral bien virtud',
  'ciencia cientifico cientifica',
  'arte estetica belleza bello',
  'lenguaje palabras significado signo',
  'muerte morir mortal',
  'felicidad feliz placer',
  'libertad libre',
  'justicia justo',
  'naturaleza ecologia ambiental medioambiente',
  'animales animal',
  'raza racismo colonial colonialismo descolonial',
  'economia dinero mercado capitalismo',
  'educacion ensenar escuela',
  'verdad verdadero',
  'tiempo historia',
  'amor amistad',
].map((g) => g.split(' '));
const SINONIMOS = new Map<string, string[]>();
for (const g of GRUPOS) for (const w of g) SINONIMOS.set(w, [...(SINONIMOS.get(w) ?? []), ...g.filter((x) => x !== w)]);

/** Plural y femenino fuera: «tecnologias» → «tecnologia», «filosofas» → «filosofa» */
const raiz = (w: string) => (w.length > 4 && w.endsWith('es') && !w.endsWith('ies') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);

/** Errata clara: misma primera parte, casi la misma longitud y 1 letra cambiada (2 si es muy larga) */
function errata(t: string, w: string) {
  if (t.length < 5) return false;
  // Palabra entera casi igual: 1 letra («espinoza» → «spinoza»), o 2 si es larga y empieza igual
  if (Math.abs(t.length - w.length) <= 1 && distancia(t, w, 1) <= 1) return true;
  if (t.length >= 9 && t[0] === w[0] && Math.abs(t.length - w.length) <= 1 && distancia(t, w, 2) <= 2) return true;
  // Errata al principio de una palabra mas larga («nietz» → «nietzsche»)
  return w.length > t.length + 1 && distancia(t, w.slice(0, t.length), 1) <= 1;
}

/** Cuanto se parece una palabra escrita a una palabra del texto. fuerte = de verdad; debil = errata. */
function parecido(t: string, w: string): Puntos {
  if (w === t) return {p: 4, nivel: 3};
  if (w.startsWith(t)) return {p: 3, nivel: 3};
  // Dentro de otra palabra solo si es larga: «dios» no debe encontrar «medios»
  if (t.length >= 5 && w.includes(t)) return {p: 2, nivel: 3};
  // La palabra escrita alarga a otra: «kantiano» → «kant», «marxista» → «marx»
  if (w.length >= 4 && t.startsWith(w) && t.length - w.length <= 4) return {p: 2, nivel: 3};
  const rt = raiz(t), rw = raiz(w);
  if (rt === rw || (rt.length >= 4 && rw.startsWith(rt))) return {p: 2.5, nivel: 3};
  if (errata(t, w)) return {p: 1, nivel: 1};
  return {p: 0, nivel: 0};
}

/** nivel 3 = coincide de verdad, 2 = por sinonimo, 1 = por errata */
export type Puntos = {p: number; nivel: number};

/** Puntuacion de una busqueda contra un texto ya partido en palabras. p = 0 si alguna palabra no encaja. */
export function puntuar(consulta: string[], texto: string[]): Puntos {
  if (!consulta.length) return {p: 1, nivel: 3};
  let total = 0, nivel = 3;
  for (const t of consulta) {
    let mejor: Puntos = {p: 0, nivel: 0};
    const alternativas = SINONIMOS.get(raiz(t)) ?? SINONIMOS.get(t) ?? [];
    for (const w of texto) {
      const x = parecido(t, w);
      if (x.p > mejor.p) mejor = x;
      if (mejor.p === 4) break;
    }
    // Sinonimos: cuentan como coincidencia de verdad, pero algo menos
    if (mejor.nivel < 3)
      for (const a of alternativas)
        for (const w of texto)
          if (w === a || (a.length >= 5 && w.startsWith(a))) {
            mejor = {p: 1.8, nivel: 2};
            break;
          }
    if (!mejor.p) return {p: 0, nivel: 0};
    total += mejor.p;
    nivel = Math.min(nivel, mejor.nivel);
  }
  return {p: total / consulta.length, nivel};
}

/*
  Que resultados se ensenan:
  - si hay bastantes que coinciden de verdad, solo esos;
  - si hay pocos, se completan con los del mismo concepto (sinonimos);
  - las erratas solo cuando no hay nada mas (por si se escribio mal).
*/
export function mejores<T>(lista: {x: T; r: Puntos}[], bastantes = 10) {
  const buenos = lista.filter((y) => y.r.p > 0);
  const de = (n: number) => buenos.filter((y) => y.r.nivel >= n);
  if (de(3).length >= bastantes) return de(3);
  if (de(2).length) return de(2);
  return buenos;
}

export type Sugerencia = {texto: string; tipo: string; peso: number; clave: string; palabras: string[]; detalle?: string;
  /** Palabras relacionadas (corriente, lugar, «conocido por»): cuentan menos, rellenan la lista */
  extra?: string[]};

/** Las mejores `n` sugerencias: primero las que mas se parecen, y a igualdad, las mas importantes */
export function sugerir(q: string, todas: Sugerencia[], n = 7) {
  const consulta = palabras(q);
  if (!consulta.length) return [];
  const entera = norm(q);
  const puntuadas = todas.map((s) => {
    let r = puntuar(consulta, s.palabras);
    if (r.p && norm(s.texto).startsWith(entera)) r = {...r, p: r.p + 2};
    if (!r.p && s.extra) {
      const e = puntuar(consulta, s.extra);
      r = {p: e.p * 0.3, nivel: e.nivel};
    }
    return {x: s, r};
  });
  return mejores(puntuadas, n)
    .sort((a, b) => b.r.p - a.r.p || b.x.peso - a.x.peso)
    .slice(0, n)
    .map((y) => y.x);
}
