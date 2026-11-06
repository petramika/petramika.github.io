import {CLASES, SIN_HOGAR} from '../../datos';
import {fmt} from '../../lib/formato';
import Info from '../../componentes/Info';
import Mini from '../../componentes/graficas/Mini';
import {L} from '../../componentes/enlace';
import {T} from '../../../comun/Glosario';
import {anios, anterior, enLetra, lista, ultimo} from './series';

/*
  Como se reparte la renta: clase baja, media y alta segun ingresos,
  pobreza y personas sin hogar. Datos en datos/economia/clases-renta.json y
  sin-hogar.json.
*/
const pct = (v: number) => fmt(v, 1) + ' %';
/** Cuanto ha cambiado b respecto a a: «un 24,5 % más» */
const cambio = (b: number, a: number) => `un ${fmt(Math.abs((b / a - 1) * 100), 1)} % ${b >= a ? 'más' : 'menos'}`;
// Ultima encuesta de condiciones de vida y su renta mediana
const [anioEcv, med] = ultimo(CLASES.medianaEurosAnio);
// Limites para una persona que vive sola, en euros netos al mes (12 pagas)
const mes = (f: number) => fmt(Math.round((med * f) / 12), 0) + ' €';

const ECV = () => (
  <>
    {L('INE, microdatos de la Encuesta de Condiciones de Vida', 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176807&menu=resultados&idp=1254735976608')} (cálculo propio)
  </>
);

export default function RentaYPobreza() {
  // Encuesta a las personas sin hogar (la ultima y la anterior)
  const encuestas = anios(SIN_HOGAR.personas);
  const [aSh, vSh] = ultimo(SIN_HOGAR.personas), [aSh0, vSh0] = anterior(SIN_HOGAR.personas);
  // Encuesta a los centros: ultimo dato y el anterior
  const [aCe, vCe] = ultimo(SIN_HOGAR.alojadosMediaDiaria), [aCe0, vCe0] = anterior(SIN_HOGAR.alojadosMediaDiaria);
  return (
    <>
      <h3 style={{marginTop: 26}}>
        Cómo se reparte la renta{' '}
        <Info>
          Quién gana cuánto, quién vive en la pobreza y cuántas personas no tienen casa. Los datos de ingresos salen de la Encuesta de Condiciones
          de Vida del INE, que pregunta cada año a unos 30.000 hogares; cada encuesta mide los ingresos del año anterior. Empieza en 2004, el primer año de la encuesta; en 2008 el INE cambió la forma de medir los
          ingresos (de lo que declaran los hogares a datos de Hacienda), y en los años en que se pueden comparar las dos formas la diferencia es
          de como mucho un punto. Para ver la pobreza de antes, la gráfica añade, con línea discontinua, los datos oficiales de <T k="eurostat">Eurostat</T> de otras
          encuestas: el Panel de Hogares de la UE (1995–2001) y, con otra medida, las encuestas de presupuestos familiares de 1980 y 1988.
        </Info>
      </h3>
      <div className="charts" id="charts-renta">
        <Mini
          id="eco-clases"
          title="Clase baja, media y alta según ingresos"
          sub="% de la población, según lo que ingresa su hogar"
          series={[
            {lab: 'Clase media', c: '#0B7A75', data: CLASES.media},
            {lab: 'Clase baja', c: '#E8590C', data: CLASES.baja},
            {lab: 'Clase alta', c: '#5F3DC4', data: CLASES.alta},
          ]}
          f={pct}
          x0={2003.5}
          yMin={0}
          note={
            <p>
              Se usa la definición de la <T k="ocde">OCDE</T>: es clase media quien vive en un hogar que ingresa entre el 75 % y el 200 % de lo
              que ingresa el hogar típico (la <T k="mediana">mediana</T>), teniendo en cuenta cuántas personas viven en él. En la encuesta de{' '}
              {anioEcv}, para una persona que vive sola eso es entre {mes(0.75)} y {mes(2)} netos al mes; por debajo es clase baja y por encima,
              alta. En una pareja con dos hijos pequeños los límites se multiplican por 2,1. Es una clasificación por ingresos, no por patrimonio,
              profesión o estudios. Cálculo propio con los <T k="microdatos">microdatos</T> del INE: la tasa de pobreza que sale con el mismo método
              coincide con la oficial. De 2004 a 2007 se usa la versión anterior de la encuesta, que mide los ingresos de otra forma (diferencia de
              como mucho 1,2 puntos).
            </p>
          }
          src={<ECV />}
        />
        <Mini
          id="eco-pobreza"
          title="Pobreza"
          sub="% de la población que vive en un hogar con pocos ingresos"
          series={[
            {lab: 'Riesgo de pobreza (menos del 60 % de la mediana)', c: '#E03131', data: CLASES.pobreza},
            {lab: 'Pobreza severa (menos del 40 %)', c: '#862E9C', dash: true, data: CLASES.pobrezaSevera},
            // Antes de 2004: otras encuestas, como series aparte (no se empalman)
            {lab: '1995–2001: otra encuesta (PHOGUE, Eurostat)', c: '#E03131', dash: true, data: CLASES.pobrezaPhogue},
            {lab: 'Severa 1995–2001 (PHOGUE, Eurostat)', c: '#862E9C', dash: true, data: CLASES.pobrezaSeveraPhogue},
            {lab: '1980 y 1988: según gasto, otra medida (Eurostat)', c: '#E8590C', dash: true, data: CLASES.pobrezaGasto},
          ]}
          f={pct}
          x0={1979.5}
          yMin={0}
          note={
            <>
              <p>
                <T k="riesgo-de-pobreza">Riesgo de pobreza</T> es la cifra oficial del INE: personas en hogares que ingresan menos del 60 % de la{' '}
                <T k="mediana">mediana</T> (en {anioEcv}, menos de {mes(0.6)} al mes para una persona sola). Pobreza severa, menos del 40 % (
                {mes(0.4)} al mes), calculada con los mismos microdatos. Mide ingresos relativos: si todos ganan más, la mediana sube y el{' '}
                <T k="umbral-de-pobreza">umbral</T> también.
              </p>
              <p>
                Antes de 2004 no hay Encuesta de Condiciones de Vida. De 1995 a 2001 está el Panel de Hogares de la Unión Europea (PHOGUE), que
                hacía el INE para Eurostat: misma definición, pero otra encuesta, y Eurostat solo da números enteros. Salía entre el 18 % y el 20 %,
                casi lo mismo que después.
              </p>
              <p>
                Para los años ochenta solo hay otra medida: Eurostat calculó con las encuestas de presupuestos familiares del INE cuántas personas
                vivían en hogares que gastaban menos de la mitad del gasto medio del país. Era el 20,9 % en 1980 (encuesta de 1980-81, la más
                cercana a la llegada de Felipe González en 1982) y el 16,9 % en 1988. Como mide gasto y no ingresos, sirve para ver la tendencia,
                no para comparar cifra a cifra. No hay dato oficial de 1982 ni de 1989 a 1994 publicado en internet (el INE hizo en 1996 un estudio
                con las encuestas de 1973-74, 1980-81 y 1990-91, pero no está en línea). Tampoco hay aún dato de {+anioEcv + 1}: el INE no ha
                publicado la encuesta de ese año.
              </p>
            </>
          }
          src={
            <>
              <ECV />;{' '}
              {L('Eurostat, ilc_li02 (PHOGUE 1995–2001)', 'https://ec.europa.eu/eurostat/databrowser/view/ilc_li02/default/table')};{' '}
              {L('Comisión Europea/Eurostat, Poverty in figures: Europe in the early 1980s (1990), tabla 4.1', 'https://aei.pitt.edu/100280/')} y{' '}
              {L('Eurostat, Poverty statistics in the late 1980s (1994), tabla 3.2', 'https://op.europa.eu/en/publication-detail/-/publication/9c787f17-acb6-4f4b-badc-49a2310e65f7')}
            </>
          }
        />
        <Mini
          id="eco-sin-hogar"
          title="Personas sin hogar"
          sub="personas atendidas en centros, según dos encuestas del INE"
          series={[
            {lab: 'Encuesta a las personas sin hogar', c: '#495057', data: SIN_HOGAR.personas},
            {lab: 'Plazas de albergue ocupadas, media diaria (otra encuesta)', c: '#1971C2', dash: true, data: SIN_HOGAR.alojadosMediaDiaria},
          ]}
          f={(v) => fmt(v, 0) + ' personas'}
          x0={2004.5}
          yMin={0}
          note={
            <>
              <p>
                La línea gris es la encuesta del INE a las propias personas sin hogar, que solo se ha hecho {enLetra(encuestas.length)} veces (
                {lista(encuestas)}). En {aSh} eran {fmt(vSh, 0)} personas, {cambio(vSh, vSh0)} que en {aSh0}
                {/* Estas dos cifras solo estan para la encuesta de 2022 (claves ...2022 del JSON) */}
                {aSh === '2022' && (
                  <>
                    : {fmt(SIN_HOGAR.porCadaCienMil2022, 1)} por cada 100.000 habitantes, y {fmt(SIN_HOGAR.enLaCalle2022, 0)} dormían en la calle
                  </>
                )}
                . Solo cuenta a adultos que usan albergues o comedores en municipios de más de 20.000 habitantes, así que la cifra real es mayor.
              </p>
              <p>
                La línea azul es otra encuesta del INE, a los centros, cada dos años: cuántas plazas de alojamiento estaban ocupadas por adultos un día
                cualquiera (media de un día de junio y otro de diciembre), en toda España. Mide otra cosa: no cuenta a quien solo va al comedor y sí
                incluye centros para mujeres víctimas de violencia de género, inmigrantes y solicitantes de asilo.{' '}
                {aCe === '2024' ? (
                  <>
                    El salto de {aCe} ({fmt(vCe, 0)}, {cambio(vCe, vCe0)} que en {aCe0}) viene sobre todo de los centros solo para inmigrantes.
                  </>
                ) : (
                  <>
                    En {aCe} fueron {fmt(vCe, 0)}, {cambio(vCe, vCe0)} que en {aCe0}.
                  </>
                )}
              </p>
            </>
          }
          src={
            <>
              {L('INE, Encuesta a las personas sin hogar 2022', 'https://www.ine.es/prensa/epsh_2022.pdf')} y{' '}
              {L('2012 (con la comparación con 2005)', 'https://ine.es/en/prensa/np761_en.pdf')};{' '}
              {L(
                'INE, Encuesta de centros y servicios de atención a las personas sin hogar (2006–2024)',
                'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176925&menu=resultados&idp=1254735976608',
              )}
            </>
          }
        />
      </div>
    </>
  );
}
