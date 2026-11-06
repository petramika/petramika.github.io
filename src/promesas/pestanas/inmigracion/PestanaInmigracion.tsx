import {DELITO, INMIG, NACIONALIZ} from '../../datos';
import {fmt} from '../../lib/formato';
import {INK} from '../../lib/config';
import Info from '../../componentes/Info';
import Mini from '../../componentes/graficas/Mini';
import {L} from '../../componentes/enlace';
import {DondeNacieron, GraficaPoblacion} from './Poblacion';
import Nacionalizaciones from './Nacionalizaciones';
import Delincuencia from './Delincuencia';
import GraficaFecundidad from './Fecundidad';
import Bulos from './Bulos';
import {T} from '../../../comun/Glosario';
import {extremo, ultimo} from './ultimo';

export default function PestanaInmigracion() {
  const ac = NACIONALIZ.porPaisAcumulado;
  const [anioNac, nNac] = ultimo<number>(NACIONALIZ.ine);
  const esMaxNac = extremo(NACIONALIZ.ine)[0] === anioNac;
  const [, est] = ultimo<{ratioBruta: number; ratioPorEdad: number}>(DELITO.estandarizada);
  const [, nacFuera] = ultimo<number>(DELITO.espanolesAdultosNacidosFuera);
  return (
    <section style={{borderTop: 0, paddingTop: 8}}>
      <h2>
        Inmigración en España{' '}
        <Info>
          Cuánta gente nacida fuera vive en España y de dónde viene, cuántos tienen papeles, cuántos se hacen españoles, qué dicen las
          estadísticas de delincuencia y qué hay de cierto en las frases que más circulan. Solo datos oficiales (INE, ministerios, Banco de
          España, Fiscalía) o estudios publicados; cuando un cálculo es propio, se dice.
        </Info>
      </h2>
      <DondeNacieron />
      <h2 style={{marginTop: 36}}>
        Cuántos son, quién se hace español y delincuencia{' '}
        <Info>
          <p>
            <b>Cuántos son y con qué papeles.</b> Población nacida fuera y extranjera desde 1981, extranjeros que viven en España con{' '}
            <T k="permiso-de-residencia">permiso de residencia</T> (dato oficial), estimaciones de los que están en{' '}
            <T k="situacion-irregular">situación irregular</T> (no hay cifra oficial: nadie puede contar a quien no está registrado) y personas{' '}
            <T k="regularizacion">regularizadas</T> cada año.
          </p>
          <p>
            <b>Quién se hace español.</b> Entre {ac.desde} y {ac.hasta}, {fmt(ac.total / 1e6, 1)} millones de personas que vivían en España{' '}
            <T k="nacionalizacion">obtuvieron la nacionalidad</T>. Una de cada cinco era marroquí; el resto, sobre todo latinoamericanos. En {anioNac}{' '}
            fueron {fmt(nNac, 0)}
            {esMaxNac && ', el máximo de la serie'}.
          </p>
          <p>
            <b>Hijos.</b> Cuántos <T k="fecundidad">hijos por mujer</T> tienen las mujeres que viven en España según el país donde nacieron, y
            cuántos se tienen en esos países.
          </p>
          <p>
            <b>Delincuencia.</b> Los extranjeros tienen más condenas por habitante que los españoles: unas {fmt(est.ratioBruta, 1)} veces más. Una parte se
            explica por la edad (hay muchos más jóvenes, que es cuando más se delinque en cualquier país):{' '}
            <T k="estandarizar-por-edad">a igual edad</T>, la diferencia baja a {fmt(est.ratioPorEdad, 1)} veces. El resto no se puede explicar con
            estos datos. Lo que no existe es una estadística por país de nacimiento: los {fmt(nacFuera / 1e6, 1)} millones de adultos españoles nacidos
            fuera cuentan como españoles.
          </p>
          <p>
            Las estadísticas oficiales (INE y Ministerio del Interior) clasifican a los condenados por nacionalidad, no por país de nacimiento: una
            persona nacida fuera que se ha hecho española cuenta como española, y un niño nacido en España de padres extranjeros sin la nacionalidad
            cuenta como extranjero. Solo la Ertzaintza (País Vasco) ha empezado a publicar detenidos por lugar de nacimiento, desde 2025.
          </p>
        </Info>
      </h2>
      <div className="charts" id="charts-inmig">
        <GraficaPoblacion />
        <Mini
          id="inm-permiso"
          title="Extranjeros con permiso y en situación irregular"
          sub="millones de personas"
          series={[
            {lab: 'Con permiso (oficial)', c: INK, data: INMIG.permiso},
            {lab: 'Irregulares (Elcano, 2001–2009)', c: '#E03131', dash: true, data: INMIG.irrA},
            {lab: 'Irregulares (Funcas, 2017–2025)', c: '#E8590C', dash: true, data: INMIG.irrB},
          ]}
          f={(v) => fmt(v, 2) + ' M'}
          x0={1984.5}
          x1={2026.5}
          yMin={0}
          note={
            <p>
              A 30 de junio de 2026 había 7,9 millones de extranjeros con <T k="permiso-de-residencia">permiso</T> (15,9 % de la población). La serie
              oficial cambió de método en 2013. Las dos estimaciones de <T k="situacion-irregular">irregulares</T> usan métodos distintos y no se pueden
              unir: la de 2005 es justo antes de la <T k="regularizacion">regularización</T> de ese año.
            </p>
          }
          src={
            <>
              {L('Observatorio Permanente de la Inmigración (Ministerio de Inclusión)', 'https://www.inclusion.gob.es/web/opi/estadisticas/catalogo/stock_documentacion')} ·
              estimaciones:{' '}
              {L('proyecto CLANDESTINO (González-Enríquez, Elcano)', 'https://www.uni-bremen.de/fileadmin/user_upload/fachbereiche/fb12/fb12/irregular-migration/3.Database_on_IrregMig/3.2.Stock_Tables/Spain_Estimates_IrregularMigration_Nov09_2.pdf')}{' '}
              y {L('Funcas, enero de 2026', 'https://www.funcas.es/wp-content/uploads/2026/01/Nota-Coyuntura-Social_Enero-2026.pdf')}. 1985–1991: fuentes
              secundarias.
            </>
          }
        />
        <Mini
          id="inm-regularizadas"
          title="Personas regularizadas cada año"
          sub="% de la población total de España"
          series={[{lab: 'Regularizadas', c: '#3B5BDB', data: INMIG.regPct}]}
          bars
          h={300}
          f={(v, x) => fmt(v, 2) + ' %' + (x != null && INMIG.regN[x] ? ` · ${fmt(INMIG.regN[x], 0)} personas` : '')}
          x0={1984.5}
          x1={2026.5}
          yMin={0}
          note={
            <p>
              Picos de los procesos extraordinarios: 1985–86 (38.294 personas), 1991 (114.423), 1996 (21.294), 2000 (152.207), 2001 (unas 300.000
              sumando <T k="arraigo">arraigo</T>, reexamen y ecuatorianos) y 2005 (578.375, el 1,34 % de la población). Desde 2014, regularizaciones
              ordinarias por arraigo. En 2026 hubo otra <T k="regularizacion">regularización</T> extraordinaria (Real
              Decreto 316/2026) con 1.174.978 solicitudes (2,37 % de la población); aún no hay cifra oficial de
              concesiones, por eso no aparece.
            </p>
          }
          src={
            <>
              {L('Ministerio de Inclusión (presentación de abril de 2026)', 'https://fravm.org/documentos/1487/guias-de-apoyo-otras-entidades/215927/ministerio_informacion-regularizacion-final.pdf')},{' '}
              {L('OPI, flujo de autorizaciones por arraigo', 'https://www.inclusion.gob.es/web/opi/estadisticas/catalogo/flujo_arraigo')},{' '}
              {L('La Moncloa, balance de julio de 2026', 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/inclusion/Paginas/2026/020726-balance-regularizacion-extraordinaria.aspx')}
            </>
          }
        />
        <Nacionalizaciones />
        <Delincuencia />
        <GraficaFecundidad />
      </div>
      <Bulos />
    </section>
  );
}
