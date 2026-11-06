import {DELITO} from '../../datos';
import {fmt} from '../../lib/formato';
import Mini from '../../componentes/graficas/Mini';
import Barras from '../../componentes/graficas/Barras';
import {L} from '../../componentes/enlace';
import {COL_ES, COL_EX} from './colores';
import {T} from '../../../comun/Glosario';
import {claves, penultimo, ultimo} from './ultimo';

/*
  Delincuencia: total de infracciones conocidas y condenas por nacionalidad.
  Ninguna estadistica nacional separa por pais de nacimiento: se explica.
*/
const INE_COND = 'https://www.ine.es/dyngs/Prensa/EPCAEPCM2025.htm';

export default function Delincuencia() {
  type Est = {espanoles: number; extranjeros: number; ratioBruta: number; ratioPorEdad: number};
  const [, eU] = ultimo<Est>(DELITO.estandarizada), [aP, eP] = penultimo<Est>(DELITO.estandarizada);
  const [, nacFuera] = ultimo<number>(DELITO.espanolesAdultosNacidosFuera);
  const edades = Object.keys(DELITO.porEdad2024.espanoles);
  const [e1, e2] = [edades[0], edades.at(-1)!];
  const pe = DELITO.porEdad2024;

  // Delitos conocidos: ultimo año frente a 2008
  const [aInf, tInf] = ultimo<number>(DELITO.tasaInfracciones), t08 = DELITO.tasaInfracciones['2008'];
  const comparaInf = Math.abs(tInf - t08) < 3 ? 'casi lo mismo que' : tInf < t08 ? 'menos que' : 'más que';

  // Condenados: ultimo año. El peso de los extranjeros sale de las tres tasas:
  // total = p·extranjeros + (1 − p)·españoles → p = parte de los adultos que son extranjeros
  const tc = DELITO.tasaCondenados, [aCond, tEsp] = ultimo<number>(tc.espanoles), tExt = tc.extranjeros[aCond], tTot = tc.total[aCond];
  const pAdultos = (tTot - tEsp) / (tExt - tEsp);
  const pCondenados = (pAdultos * tExt) / tTot;
  const pr = DELITO.prisiones, fechaPr = pr.fecha.replace(' ', ' de ');
  return (
    <>
        <Mini
          id="inm-delitos"
          title="Delitos conocidos por la policía"
          sub="infracciones penales por cada 1.000 habitantes"
          series={[
            {lab: 'Infracciones penales', c: '#495057', data: DELITO.tasaInfracciones},
            {lab: 'Antes de 1987 (otro recuento)', c: '#495057', dash: true, data: DELITO.tasaInfraccionesAntes},
          ]}
          f={(v) => fmt(v, 1)}
          x0={1979.5}
          yMin={0}
          note={
            <>
              <p>
                <T k="infracciones-penales">Delitos y faltas</T> que conoce la policía (denuncias y actuaciones de oficio), por cada 1.000 habitantes.
                En {aInf} fueron unos {fmt(DELITO.infracciones[aInf], 2)} millones: {fmt(tInf, 0)} por cada 1.000, {comparaInf} en 2008 ({fmt(t08, 0)}).
                El mínimo de 2020 es el confinamiento.
              </p>
              <p>
                Entre 1986 y 1987 la cifra salta un 69 % en un año: es un cambio en la forma de contar, no más delitos, por eso 1980–1986 va aparte.
                Otros cambios: el Código Penal de 1995, la supresión de las faltas en 2015 (pasan a <T k="delitos-leves">delitos leves</T> o desaparecen) y la entrada poco a
                poco de las policías autonómicas y locales. Desde 2016 crecen mucho las estafas por internet, que están incluidas.
              </p>
              <p>Esta cifra no se publica por nacionalidad.</p>
            </>
          }
          src={
            <>
              {L('Eurostat (crim_hist, crim_gen), datos del Ministerio del Interior', 'https://ec.europa.eu/eurostat/databrowser/view/crim_gen/default/table')} (1980–2003);{' '}
              {L('INE, Indicadores de Calidad de Vida, tabla 74617', 'https://www.ine.es/jaxiT3/Tabla.htm?t=74617')} (2004–{claves(DELITO.tasaInfracciones).at(-1)})
            </>
          }
        />
        <Mini
          id="inm-condenados"
          title="Condenados por cada 1.000 adultos"
          sub="adultos condenados en sentencia firme, según su nacionalidad"
          series={[
            {lab: 'Extranjeros', c: COL_EX, data: DELITO.tasaCondenados.extranjeros},
            {lab: 'Total', c: '#868E96', dash: true, data: DELITO.tasaCondenados.total},
            {lab: 'Españoles (incluye nacionalizados)', c: COL_ES, data: DELITO.tasaCondenados.espanoles},
          ]}
          f={(v) => fmt(v, 1)}
          x0={2012.5}
          yMin={0}
          hitos={[{x: 2015.5, lab: 'Entran los delitos leves'}]}
          note={
            <>
              <p>
                En {aCond} fueron condenados {fmt(tEsp, 1)} de cada 1.000 adultos españoles y {fmt(tExt, 1)} de cada 1.000 extranjeros:{' '}
                {fmt(tExt / tEsp, 1)} veces más. Los extranjeros son el {fmt(pCondenados * 100, 1)} % de los condenados y alrededor del{' '}
                {Math.round(pAdultos * 20) * 5} % de los adultos.
              </p>
              <p>
                <b>La edad pesa mucho.</b> La mitad de los adultos extranjeros tiene entre 18 y 40 años, frente a menos de un tercio de los españoles,
                y a esas edades se delinque más en cualquier país. Comparando <T k="estandarizar-por-edad">a igual edad</T>, la tasa de los extranjeros
                sería {fmt(eU.extranjeros, 1)} frente a {fmt(eU.espanoles, 1)}: {fmt(eU.ratioPorEdad, 1)} veces, no {fmt(eU.ratioBruta, 1)} (cálculo propio
                con datos del INE; en {aP}, {fmt(eP.ratioPorEdad, 1)}). Tener en cuenta el sexo apenas lo cambia.
              </p>
              <p>
                <b>Otras cosas que inflan la tasa de extranjeros:</b> entre los condenados hay personas que no viven en España (turistas, gente de
                paso, redes que se mueven de país), pero la población con la que se divide solo cuenta a los <T k="padron">empadronados</T>. Estar en
                España sin papeles no es delito (es una <T k="falta-administrativa">falta administrativa</T>), así que no suma condenas.
              </p>
              <p>
                <b>Nacionalidad no es lo mismo que origen:</b> {fmt(nacFuera, 0)} adultos españoles nacieron fuera (8 % de los adultos españoles)
                y cuentan como españoles. Ninguna estadística nacional separa por país de nacimiento.
              </p>
              <p>
                En 2016 empiezan a contarse los delitos leves (antes eran faltas y no se apuntaban), por eso el salto: el INE avisa de que no se
                puede comparar con los años anteriores. En las cárceles el peso es mayor: el {fmt(pr.pctExtranjeros, 1)} % de los presos eran
                extranjeros en {fechaPr}, en parte porque se les aplica más la <T k="prision-preventiva">prisión preventiva</T>.
              </p>
            </>
          }
          src={
            <>
              {L('INE, Estadística de la Población Condenada (tablas 25704 y 25645)', INE_COND)}; población:{' '}
              {L('INE, Estadística Continua de Población (tabla 56938)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=56938')}; cárceles:{' '}
              {L(`Instituciones Penitenciarias, ${fechaPr}`, 'https://www.institucionpenitenciaria.es/es/web/home/fondo-documental/estadistica-penitenciaria')}
            </>
          }
        />
        <Barras
          id="inm-edad"
          title="Condenados según la edad"
          sub="por cada 1.000 adultos de esa edad y nacionalidad, 2024"
          series={[
            {lab: 'Españoles', c: COL_ES},
            {lab: 'Extranjeros', c: COL_EX},
          ]}
          filas={edades.map((k) => ({lab: k.replace(/^De /, '').replace(' años', ''), vals: [DELITO.porEdad2024.espanoles[k], DELITO.porEdad2024.extranjeros[k]]}))}
          f={(v) => fmt(v, 1)}
          note={
            <>
              <p>
                En cualquier grupo, los jóvenes concentran las condenas: entre los españoles de 18 a 20 años hay {fmt(pe.espanoles[e1], 1)} condenados
                por cada 1.000; a partir de los 70, {pe.espanoles[e2] < 1 ? 'menos de 1' : fmt(pe.espanoles[e2], 1)}.
              </p>
              <p>
                A igual edad, los extranjeros siguen teniendo más condenas (de 18 a 20 años, {fmt(pe.extranjeros[e1], 0)} frente a {fmt(pe.espanoles[e1], 0)}), pero la distancia es menor que en el
                total, porque hay muchos más extranjeros jóvenes.
              </p>
            </>
          }
          src={L('INE, tabla 25645, y población de la tabla 56938 (cálculo propio)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=25645')}
        />
    </>
  );
}
