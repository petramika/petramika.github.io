import {NACIONALIZ as N} from '../../datos';
import {fmt} from '../../lib/formato';
import Mini from '../../componentes/graficas/Mini';
import {L} from '../../componentes/enlace';
import {T} from '../../../comun/Glosario';
import {claves} from './ultimo';

/*
  Nacionalizaciones: cuanta gente se hace española cada año y, por pais,
  la comparacion entre quien vive aqui (nacidos fuera) y quien se hace
  español. La diferencia es lo interesante: los latinoamericanos se
  nacionalizan mucho (2 años de residencia), los europeos casi nada.
*/
type Pais = {pais: string; n: number; pct: number};
type PaisAnio = Pais & {vivenPct: number};

/** Por año (2013–ultimo): los diez paises con mas nuevos españoles, y Rumania para comparar */
const POR_ANIO = N.porAnio as Record<string, {total: number; top10: string[]; paises: PaisAnio[]}>;
const ANIOS_NAC = Object.keys(POR_ANIO).sort();
const PAISES_NAC = [
  {pais: 'Marruecos', c: '#2F9E44'},
  {pais: 'Colombia', c: '#F59F00'},
  {pais: 'Venezuela', c: '#C2255C'},
  {pais: 'Ecuador', c: '#0B7A75'},
  {pais: 'Honduras', c: '#7048E8'},
  {pais: 'Perú', c: '#E8590C'},
  {pais: 'Bolivia', c: '#868E96'},
  {pais: 'Rumanía', c: '#3B5BDB'},
];
const pctPais = (pais: string) =>
  Object.fromEntries(ANIOS_NAC.map((y) => [y, POR_ANIO[y].paises.find((p) => p.pais === pais)?.pct]).filter((x): x is [string, number] => x[1] != null));
const deAnio = (y: string) => {
  const ps = POR_ANIO[y].paises;
  const comparados = ps.map((p) => ({pais: p.pais, nac: p.pct, viven: p.vivenPct})).sort((a, b) => b.viven + b.nac - (a.viven + a.nac));
  const rumania = ps.find((p) => p.pais === 'Rumanía');
  const top = ps.filter((p) => POR_ANIO[y].top10.includes(p.pais)).sort((a, b) => a.pct - b.pct);
  return {comparados, rumania, ultimoLista: top[0]};
};

// Gentilicio en femenino plural («personas … colombianas»); si falta, «de <pais>»
const GENTILICIO: Record<string, string> = {
  Marruecos: 'marroquíes', Colombia: 'colombianas', Ecuador: 'ecuatorianas', Venezuela: 'venezolanas', Bolivia: 'bolivianas',
  'República Dominicana': 'dominicanas', Perú: 'peruanas', Honduras: 'hondureñas', Cuba: 'cubanas', Argentina: 'argentinas',
  Pakistán: 'paquistaníes', Brasil: 'brasileñas', Nicaragua: 'nicaragüenses', Rumanía: 'rumanas',
};
const gentilicio = (pais: string) => GENTILICIO[pais] ?? `de ${pais}`;

export default function Nacionalizaciones() {
  const y = ANIOS_NAC[ANIOS_NAC.length - 1];
  const {comparados, rumania, ultimoLista} = deAnio(y);
  const viven = (pais: string) => POR_ANIO[y].paises.find((p) => p.pais === pais)?.vivenPct ?? 0;
  const ac = N.porPaisAcumulado, lm = N.leyMemoria;
  const anJ = claves(N.justicia);
  // Los tres primeros del acumulado y los del ultimo año (sin «Resto»)
  const [a1, a2, a3] = (ac.paises as Pais[]).filter((p) => p.pais !== 'Resto');
  return (
    <>
        <Mini
          id="inm-nacionalizaciones"
          title="Personas que se hacen españolas cada año"
          sub="residentes en España que obtienen la nacionalidad"
          series={[
            {lab: 'Todas las vías (INE)', c: '#3B5BDB', data: N.ine},
            {lab: 'Concesiones por residencia (Justicia)', c: '#868E96', dash: true, data: N.justicia},
          ]}
          f={(v) => fmt(v, 0)}
          x0={1994.5}
          yMin={0}
          note={
            <>
              <p>
                Para pedir la <T k="nacionalidad-por-residencia">nacionalidad por residencia</T> hacen falta, en general, 10 años viviendo legalmente en España; 2 para latinoamericanos,
                filipinos, andorranos, portugueses, ecuatoguineanos y <T k="sefardies">sefardíes</T>, y 1 para quien se casa con un español o nace aquí. Desde 2015 hay
                que aprobar un examen de español y otro de cultura y Constitución.
              </p>
              <p>
                Hay dos series y no coinciden. La del INE (2013–{ac.hasta}) cuenta a todos los que viven en España y se hacen españoles por cualquier
                vía, en el año en que se inscriben en el <T k="registro-civil">Registro Civil</T>. La de Justicia ({anJ[0]}–{anJ.at(-1)}) cuenta solo las concesiones por residencia, en el
                año en que se aprueban. Por eso los picos no caen en el mismo año: en 2013 un plan de choque resolvió muchos expedientes atrasados, y
                en 2017 casi no hubo por el cambio a los exámenes y al trámite electrónico.
              </p>
              <p>
                No incluye la «<T k="ley-de-nietos">ley de nietos</T>» (Ley de Memoria Democrática): hijos y nietos de exiliados y emigrantes que la piden desde el extranjero,
                en los consulados. Hasta el {new Date(lm.fecha).toLocaleDateString('es-ES')} se habían presentado {fmt(lm.solicitudesPresentadasConsulados, 0)}{' '}
                solicitudes y se habían aprobado {fmt(lm.expedientesAprobados, 0)}. Tampoco a los sefardíes ({fmt(N.sefardies.concesionesAcumuladas, 0)} desde
                2015).
              </p>
            </>
          }
          src={
            <>
              {L('INE, Adquisiciones de nacionalidad de residentes (tabla 15083)', 'https://www.ine.es/dyngs/Prensa/EANER2025.htm')};{' '}
              {L('Observatorio Permanente de la Inmigración, concesiones por residencia', 'https://www.inclusion.gob.es/web/opi/estadisticas/catalogo/concesiones_nacionalidad')};{' '}
              {L('Exteriores, ley de nietos', 'https://www.exteriores.gob.es/eu/Comunicacion/Exteriores-explica/Paginas/2026_Articulos/Ley-nietos-memoria-democratica-nacionalidad-espanola.aspx')};{' '}
              {L('Justicia, datos a 30-9-2026', 'https://www.mjusticia.gob.es/es/Ciudadano/Nacionalidad/Documents/Estadisticas%20nacionalidad%2030-09-2026.pdf')}
            </>
          }
        />
        <Mini
          id="inm-nac-paises"
          title="De dónde vienen los nuevos españoles"
          sub="% de las personas que se hacen españolas cada año, según su nacionalidad anterior"
          series={PAISES_NAC.map((p) => ({lab: p.pais, c: p.c, dash: p.pais === 'Rumanía', data: pctPais(p.pais)}))}
          f={(v) => fmt(v, 1) + ' %'}
          x0={Number(ANIOS_NAC[0]) - 0.5}
          yMin={0}
          note={
            <>
              <p>
                De todas las personas que se hicieron españolas cada año, qué parte tenía antes cada nacionalidad. Para comparar, en {y} los nacidos en
                Marruecos eran el {fmt(viven('Marruecos'), 1)} % de los nacidos fuera que viven aquí, los nacidos en Colombia el {fmt(viven('Colombia'), 1)} % y en
                Venezuela el {fmt(viven('Venezuela'), 1)} %: si un país está por encima de ese peso, se nacionaliza más de lo que pesa entre quienes viven aquí.
              </p>
              <p>
                Los latinoamericanos se nacionalizan mucho porque pueden pedirlo con 2 años de residencia en lugar de 10. Los europeos casi no: los
                rumanos son el {fmt(comparados.find((c) => c.pais === 'Rumanía')?.viven ?? 0, 1)} % de los nacidos fuera, pero solo el{' '}
                {rumania ? fmt(rumania.pct, 1) : '—'} % de los nuevos españoles. Como ciudadanos de la UE ya tienen casi los mismos derechos. Los
                nacidos en el Reino Unido, Francia, Alemania o China viven aquí en buen número, pero se nacionalizan tan poco que no llegan al último
                país de la lista del INE ({fmt(ultimoLista.pct, 1)} %).
              </p>
              <p>
                Entre {ac.desde} y {ac.hasta}, {fmt(ac.total / 1e6, 2)} millones de personas que vivían en España se hicieron españolas: de cada 100,{' '}
                {fmt(a1.pct, 0)} eran {gentilicio(a1.pais)}, {fmt(a2.pct, 0)} {gentilicio(a2.pais)} y {fmt(a3.pct, 0)} {gentilicio(a3.pais)}. Lo que
                se ve aquí refleja quién llegó hace entre 2 y 10 años.
              </p>
            </>
          }
          src={
            <>
              {L('INE, Adquisiciones de nacionalidad por nacionalidad previa (tabla 15071)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=15071')} y{' '}
              {L('Estadística Continua de Población por país de nacimiento (tabla 56937)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=56937')}
            </>
          }
        />
    </>
  );
}
