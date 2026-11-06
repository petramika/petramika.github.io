/*
  Las cuatro edades de la historia (la division de siempre en los libros
  españoles) y las categorias con las que se filtra. A cada filosofo se le
  asigna la edad en la que trabajo (nacimiento + 35 años, mas o menos).
*/
export type EraId = 'antigua' | 'medieval' | 'moderna' | 'contemporanea';

export type Era = {id: EraId; nombre: string; corto: string; desde: number; hasta: number; desdeTxt: string; hastaTxt: string; hito: string; texto: string};

export const ERAS: Era[] = [
  {
    id: 'antigua',
    nombre: 'Edad Antigua',
    corto: 'Antigua',
    desde: -650,
    hasta: 476,
    desdeTxt: 'c. 600 a. C.',
    hastaTxt: '476',
    hito: 'Cae el Imperio romano de Occidente',
    texto: 'Unos griegos empiezan a preguntarse de qué está hecho el mundo sin tirar de mitos. A la vez, en China y en la India, otros piensan cómo vivir bien. Acaba con la caída de Roma.',
  },
  {
    id: 'medieval',
    nombre: 'Edad Media',
    corto: 'Medieval',
    desde: 476,
    hasta: 1453,
    desdeTxt: '476',
    hastaTxt: '1453',
    hito: 'Los turcos toman Constantinopla',
    texto: 'Mil años en los que la fe y la razón intentan entenderse. Cristianos, musulmanes y judíos leen a los griegos, y Bagdad, Córdoba y París se llenan de sabios.',
  },
  {
    id: 'moderna',
    nombre: 'Edad Moderna',
    corto: 'Moderna',
    desde: 1453,
    hasta: 1789,
    desdeTxt: '1453',
    hastaTxt: '1789',
    hito: 'Revolución francesa',
    texto: 'La imprenta, la ciencia nueva y la duda: ¿qué puedo saber con certeza? Se discute de dónde sale el poder, y la Ilustración pide libertad, razón y derechos.',
  },
  {
    id: 'contemporanea',
    nombre: 'Edad Contemporánea',
    corto: 'Contemporánea',
    desde: 1789,
    hasta: 2030,
    desdeTxt: '1789',
    hastaTxt: 'hoy',
    hito: '',
    texto: 'Fábricas, revoluciones, guerras mundiales e internet. La filosofía se pregunta por la libertad, el lenguaje, la mente, el poder y el sentido de la vida.',
  },
];

export type CatId = 'etica' | 'politica' | 'metafisica' | 'conocimiento' | 'logica' | 'mente' | 'lenguaje' | 'ciencia' | 'religion' | 'estetica' | 'existencia' | 'sociedad';

export const CATEGORIAS: {id: CatId; nombre: string; color: string; pregunta: string}[] = [
  {id: 'etica', nombre: 'Ética', color: '#E8590C', pregunta: '¿Cómo debo vivir? ¿Qué está bien y qué está mal?'},
  {id: 'politica', nombre: 'Política', color: '#C92A2A', pregunta: '¿Quién debe mandar? ¿Qué es una sociedad justa?'},
  {id: 'metafisica', nombre: 'Realidad', color: '#6741D9', pregunta: '¿Qué existe de verdad? ¿Qué es el tiempo, el alma, Dios?'},
  {id: 'conocimiento', nombre: 'Conocimiento', color: '#1C7ED6', pregunta: '¿Qué podemos saber y cómo lo sabemos?'},
  {id: 'logica', nombre: 'Lógica', color: '#0B7285', pregunta: '¿Cómo se razona bien? ¿Cuándo un argumento es una trampa?'},
  {id: 'mente', nombre: 'Mente', color: '#2F9E44', pregunta: '¿Qué es pensar? ¿Qué es la conciencia?'},
  {id: 'lenguaje', nombre: 'Lenguaje', color: '#74B816', pregunta: '¿Cómo significan las palabras? ¿Nos atrapa el lenguaje?'},
  {id: 'ciencia', nombre: 'Ciencia', color: '#F59F00', pregunta: '¿Qué hace que algo sea ciencia? ¿Cómo avanza?'},
  {id: 'religion', nombre: 'Religión', color: '#AE3EC9', pregunta: '¿Existe Dios? ¿Fe y razón pueden ir juntas?'},
  {id: 'estetica', nombre: 'Arte y belleza', color: '#E64980', pregunta: '¿Qué es lo bello? ¿Para qué sirve el arte?'},
  {id: 'existencia', nombre: 'Sentido de la vida', color: '#495057', pregunta: '¿Qué sentido tiene vivir? ¿Cómo afrontar la muerte y la libertad?'},
  {id: 'sociedad', nombre: 'Sociedad', color: '#8D5524', pregunta: 'Cultura, educación, economía, género y raza: cómo convivimos.'},
];
export const CAT = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c])) as Record<CatId, (typeof CATEGORIAS)[number]>;

/** «Siglo V a. C.», «Siglo XVII» */
const ROMANOS: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
function romano(n: number) {
  let s = '';
  for (const [v, r] of ROMANOS) while (n >= v) (s += r), (n -= v);
  return s;
}
export function siglo(anio: number) {
  return anio < 0 ? `Siglo ${romano(Math.floor((-anio - 1) / 100) + 1)} a. C.` : `Siglo ${romano(Math.floor((anio - 1) / 100) + 1)}`;
}
/** Para ordenar los siglos: -5 = siglo V a. C., 17 = siglo XVII */
export function numSiglo(anio: number) {
  return anio < 0 ? -(Math.floor((-anio - 1) / 100) + 1) : Math.floor((anio - 1) / 100) + 1;
}
export const anioTxt = (a: number) => (a < 0 ? `${-a} a. C.` : String(a));
