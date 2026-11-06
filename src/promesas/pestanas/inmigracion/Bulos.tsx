import type {ReactNode} from 'react';
import {DELITO, INMIG, MENORES, MIGRACIONES, NATALIDAD, PAGUITAS, POB_INMIG, REMESAS, SANIDAD, TRABAJO} from '../../datos';
import {fmt} from '../../lib/formato';
import Mini from '../../componentes/graficas/Mini';
import Barras from '../../componentes/graficas/Barras';
import {L} from '../../componentes/enlace';
import {Cuestion, Cuestiones, type Tono} from '../../componentes/Cuestiones';
import {COL_ES, COL_EX, COL_EX2} from './colores';
import {T} from '../../../comun/Glosario';
import {anioDe, claves, dec1, extremo, mesAnio, nombreMes, penultimo, porPrefijo, red, ultimo} from './ultimo';
import {fecundidadOrigen} from './Fecundidad';

// Ultimo dato de las series de afiliados por pension (para que el texto no se quede viejo)
const afiAnio = Object.keys(PAGUITAS.afiliadosPorPension).at(-1)!;
const afiCon = fmt(PAGUITAS.afiliadosPorPension[afiAnio], 2), afiSin = fmt(PAGUITAS.afiliadosEspanolesPorPension[afiAnio], 2);
const afiCasi2022 = Math.abs(PAGUITAS.afiliadosEspanolesPorPension[afiAnio] - PAGUITAS.afiliadosEspanolesPorPension['2022']) <= 0.03;

// Año en curso: el ultimo mes de afiliacion dice hasta donde llega (las medias de ese año van de enero a ese mes)
const mesAfi: string = PAGUITAS.afiliadosExtranjerosUltimoMes.mes;
const anioEnCurso = mesAfi.slice(0, 4), hayEnCurso = !mesAfi.endsWith('-12');
const mediaHasta = `${anioEnCurso} es la media de enero a ${nombreMes(mesAfi)}`;
/** ¿La serie anual acaba en el año en curso (dato a medias)? */
const acabaEnCurso = (s: Record<string, number>) => hayEnCurso && claves(s).at(-1) === anioEnCurso;
/** Ultimo año completo de una serie anual: se salta el año en curso si va a medias */
const anioCompleto = (s: Record<string, number>) => (acabaEnCurso(s) ? claves(s).at(-2)! : claves(s).at(-1)!);
/** «2023 y 2024», «2022, 2023 y 2024» */
const yLista = (xs: string[]) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' y ' + xs.at(-1) : xs[0]);

/*
  Cuestiones frecuentes de la pestaña: lo que se dice sobre la inmigracion
  y lo que dicen los datos oficiales. Cada frase va plegada con su
  veredicto, la conclusion, lo positivo, lo negativo y sus graficas.
  Si un dato da la razon a la frase, se dice.
*/
type BuloProps = {
  frase: string;
  veredicto: string;
  tono: Tono;
  resp: ReactNode;
  positivo: ReactNode[];
  negativo: ReactNode[];
  graficas?: {id: string; lab: string}[];
  children?: ReactNode;
};

/** Una frase que circula, como cuestion plegada: «frase», veredicto, conclusion, lo positivo, lo negativo y sus graficas */
function Bulo({frase, resp, ...resto}: BuloProps) {
  return <Cuestion pregunta={`«${frase}»`} conclusion={resp} {...resto} />;
}

/** {año: valor} → {año: valor / d} */
const div = (o: Record<string, number>, d: number) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v / d]));
const pct = (v: number) => fmt(v, 1) + ' %';

const SS_AFI = 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST8/EST10/EST290/EST292';
const SS_IMV = 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/cbe2fda1-3ac7-4bc8-a5ec-06c178839e11/0e716715-d290-4745-a74a-28cc1c3bc9ea';
const BDE_2023 = 'https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/PublicacionesAnuales/InformesAnuales/23/Fich/InfAnual_2023_Cap2.pdf';
const AIREF_2025 = 'https://www.airef.es/wp-content/uploads/2025/03/Opini%C3%B3n_sobre_la_sostenibilidad_de_las_AAPP_largo_plazo/Opinion.pdf';
// Hijas de inmigrantes: España (CSIC) y seis países europeos
const GF_2017 = 'https://doi.org/10.4054/DemRes.2017.37.19';
const KULU_2017 = 'https://doi.org/10.1111/padr.12037';

export default function Bulos() {
  const imv = PAGUITAS.imv, um = PAGUITAS.afiliadosExtranjerosUltimoMes;
  // IMV: un punto por año, el ultimo mes publicado de cada año (diciembre, o el mes en curso)
  const imvPct: Record<string, number> = {};
  for (const k of claves(imv.serie)) imvPct[k.slice(0, 4)] = imv.serie[k].extranjerosPct;
  const porTitular = Math.round(um.extranjerosMedios / imv.titularesExtranjeros);
  const pp = PAGUITAS.afiliadosPorPensionUltimoMes;
  const sect = TRABAJO.sectores.filas.filter((f: {sector: string}) => !/financieras|Transporte|administrativas/.test(f.sector));
  const san = SANIDAD.indicadores.filter((i: {indicador: string}) => !/hace un año|algún médico/.test(i.indicador));
  const salExt = REMESAS.otros.remesasPctSalariosExtranjeros;

  // «Nos están invadiendo»: poblacion
  const u = POB_INMIG.ultimoDato, nf2000 = POB_INMIG.nacidosFueraPctAntes['2000'];
  const pPais = POB_INMIG.porPais, marruecos = pPais.paises.find((p: {pais: string}) => p.pais === 'Marruecos');
  const pctMarruecos = (marruecos.n / pPais.total) * 100;
  const [anioIrr, irr] = ultimo<number>(INMIG.irrB);
  // Ritmo: cuanto ha crecido la poblacion nacida fuera en los ultimos 5 años (a 1 de enero)
  const [aNF, nNF] = ultimo<number>(POB_INMIG.nacidosFueraN), aNF5 = String(+aNF - 5), nNF5: number = POB_INMIG.nacidosFueraN[aNF5];

  // «Delinquen más»: condenas y delitos conocidos
  const tc = DELITO.tasaCondenados, [aCond, cEsp] = ultimo<number>(tc.espanoles), cExt = tc.extranjeros[aCond];
  const aCond0 = claves(tc.espanoles)[0], ratioCond0 = tc.extranjeros[aCond0] / tc.espanoles[aCond0], ratioCond = cExt / cEsp;
  const [, est] = ultimo<{ratioPorEdad: number}>(DELITO.estandarizada);
  const [aInf, tInf] = ultimo<number>(DELITO.tasaInfracciones), t08 = DELITO.tasaInfracciones['2008'];
  const nfInf = POB_INMIG.nacidosFueraPct[aInf] ?? ultimo<number>(POB_INMIG.nacidosFueraPct)[1];

  // «Paguitas»: pobreza e IMV
  const [aPob, pobExt] = ultimo<number>(PAGUITAS.pobrezaExtranjeros), pobEsp = PAGUITAS.pobrezaEspanoles[aPob];
  const [aPobMax, pobMax] = extremo(PAGUITAS.pobrezaExtranjeros);
  const [, pobExtranjera] = ultimo<number>(PAGUITAS.poblacionExtranjeraPct);
  const cmp = imv.comparativa, [, pctPobres] = porPrefijo<number>(cmp, 'extranjerosPctPoblacionEnRiesgoPobreza');
  const afiEnCurso = acabaEnCurso(PAGUITAS.afiliadosExtranjerosPct);

  // «Nos quitan el trabajo»: paro del ultimo año completo y sectores
  const aParo = anioCompleto(TRABAJO.paroEspanoles), aParoU = claves(TRABAJO.paroEspanoles).at(-1)!;
  const paroE = TRABAJO.paroEspanoles[aParo], paroX = TRABAJO.paroExtranjeros[aParo];
  const desdeParo = claves(TRABAJO.paroEspanoles).filter((a) => +a < +aParo && TRABAJO.paroEspanoles[a] <= paroE).at(-1);
  const minParo = desdeParo ? `el más bajo desde ${desdeParo}` : 'el más bajo de la serie';
  const aAfiExt = anioCompleto(PAGUITAS.afiliadosExtranjeros);
  const enSector = (re: RegExp): number => TRABAJO.sectores.filas.find((f: {sector: string}) => re.test(f.sector)).pctExtranjerosEnSector;
  const ocup = (re: RegExp) => TRABAJO.ocupacionesEPA.find((o: {ocupacion: string}) => re.test(o.ocupacion));
  const elem = ocup(/elementales/), tecn = ocup(/Técnicos/);

  // «Colapsan la sanidad»
  const ind = (re: RegExp) => SANIDAD.indicadores.find((i: {indicador: string}) => re.test(i.indicador));
  const sFam = ind(/médico de familia/), sEsp = ind(/especialista/), sAnio = ind(/hace un año/);
  const edad = SANIDAD.estructuraEdadPct;

  // «Nos están sustituyendo»: nacimientos y fecundidad
  const NAT = NATALIDAD, [aNac, nacT] = ultimo<number>(NAT.nacimientosTotal), defT = NAT.defuncionesTotal[aNac];
  const [aMad, pctMadre] = ultimo<number>(NAT.pctMadreExtranjera);
  const [aMaxExt, maxExt] = extremo(NAT.nacimientosMadreExtranjera);
  const [aFec, fecExt] = ultimo<number>(NAT.fecundidadExtranjeras), fecEsp = NAT.fecundidadEspanolas[aFec];
  // Hijos por mujer según dónde nació la madre (gráfica «Hijos por mujer según su origen»)
  const fo = fecundidadOrigen(), FE = fo.E, aFo = fo.a, aFo0 = fo.a0, censoMar = fo.censoMarruecos;
  const fuera = FE.nacidasFuera, nacEsp = FE.nacidasEspana, mar = FE.porPais.Marruecos, gr = FE.porGrupo;
  const pctFuera = FE.pctNacimientosMadreNacidaFuera[aFo], pctFuera0 = FE.pctNacimientosMadreNacidaFuera[aFo0];
  const latAmIgual = gr['Sudamérica'][aFo] <= nacEsp[aFo] && gr['Centroamérica y Caribe'][aFo] <= nacEsp[aFo];
  const dif02 = NAT.fecundidadExtranjeras['2002'] - NAT.fecundidadEspanolas['2002'], difU = fecExt - fecEsp;

  // «Menores no acompañados»
  const reg = MENORES.registrados, [aReg, nReg] = ultimo<number>(reg), [, pctMen] = ultimo<number>(MENORES.pctMenores);
  const xReg13 = Math.round(nReg / reg['2013']), xReg16 = Math.round(nReg / reg['2016']);
  const tmE = MENORES.tasaExtranjeros, tmS = MENORES.tasaEspanoles, [aTm] = ultimo<number>(tmE);
  const rm19 = tmE['2019'] / tmS['2019'], rmU = tmE[aTm] / tmS[aTm];
  const [aPat, nPat] = ultimo<number>(MENORES.pateras), recordPat = extremo(MENORES.pateras)[0] === '2018';
  const [, pctExtCond] = ultimo<number>(MENORES.pctExtranjerosCondenados);

  // «Se van los españoles»
  const mg = MIGRACIONES, [aMig, saldoX] = ultimo<number>(mg.saldoExtranjeros), saldoE = mg.saldoEspanoles;
  const positivosEsp: string[] = [];
  for (const a of claves(saldoE).reverse()) {
    if (saldoE[a] <= 0) break;
    positivosEsp.unshift(a);
  }
  const [aMinE, minE] = extremo(saldoE, true);
  const [aExt, extTot] = ultimo<number>(mg.espanolesExterior), extNac = mg.espanolesExteriorNacidosEspana;
  const extSube = extNac[aExt] > penultimo<number>(extNac)[1];
  const ratioExt = extTot / mg.espanolesExterior['2009'];

  // «Mandan todo el dinero fuera»
  const [aRem, rem] = ultimo<number>(REMESAS.salidasMEur), [aSal, salU] = ultimo<number>(salExt);
  const [kDest, dest] = porPrefijo<Record<string, number>>(REMESAS.otros, 'remesasPorDestino');
  const aDest = anioDe(kDest), pctDest = (k: string) => fmt((dest[k] / REMESAS.salidasMEur[aDest]) * 100, 0);
  const [, remPorNacidoFuera] = porPrefijo<number>(REMESAS.otros, 'remesasPorResidenteNacidoExtranjero');
  const pibs = Object.values(REMESAS.pctPIB) as number[];
  return (
    <Cuestiones
      intro={
        <>
          Frases que circulan mucho sobre la inmigración, comparadas con los datos oficiales más recientes. Algunas son falsas, otras son ciertas solo
          en parte, y alguna es cierta. Pulsa cada una para ver la conclusión, lo positivo y lo negativo, y las gráficas que lo
          respaldan.
        </>
      }
    >
      <Bulo
        frase="Nos están invadiendo"
        veredicto="No realmente"
        tono="matiz"
        resp={
          <>
            Uno de cada cinco habitantes nació fuera ({pct(u.nacidosFueraPct)} en {mesAnio(u.fecha)}), y ha crecido muy rápido: en 2000 era el{' '}
            {pct(nf2000)}. Pero un tercio de ellos ya son españoles, vienen de países muy distintos (Marruecos, el primero, es solo el{' '}
            {fmt(pctMarruecos, 0)} %) y la gran mayoría vive aquí <T k="permiso-de-residencia">con papeles</T>.
          </>
        }
        positivo={[
          <>Sin ellos la población de España bajaría: desde 2015 mueren más personas de las que nacen.</>,
          <>
            1 de cada 3 nacidos fuera ya tiene la <T k="nacionalizacion">nacionalidad española</T> ({fmt(u.nacidosFueraConNacionalidadEspanola / 1e6, 2)}{' '}
            millones): muchos llevan años aquí.
          </>,
          <>Su origen es muy diverso: casi 9 de cada 10 nacieron en países distintos de Marruecos, sobre todo latinoamericanos y europeos.</>,
        ]}
        negativo={[
          <>
            El problema no es la inmigración en sí, sino los números y el ritmo: de un {pct(nf2000)} de nacidos fuera en 2000 a un{' '}
            {pct(u.nacidosFueraPct)} en {u.fecha.slice(0, 4)}, y solo entre {aNF5} y {aNF} pasaron de {fmt(nNF5 / 1e6, 1)} a {fmt(nNF / 1e6, 1)}{' '}
            millones (+{fmt(((nNF - nNF5) / nNF5) * 100, 0)} %). Cuando la población que llega crece tan deprisa, adaptarse (el idioma, las
            costumbres, la vivienda, la escuela) es más difícil, para los que llegan y para los que ya estaban.
          </>,
          <>
            Hay personas <T k="situacion-irregular">sin papeles</T> que no salen en las estadísticas oficiales: unas {fmt(red(irr * 1e6, 10000), 0)} a
            principios de {anioIrr} según la estimación de Funcas, frente a unas {fmt(red(INMIG.irrB['2021'] * 1e6, 10000), 0)} en 2021.
          </>,
          <>La población crece solo por la inmigración, así que depende de que sigan llegando personas.</>,
        ]}
        graficas={[
          {id: 'inm-poblacion', lab: 'Población nacida fuera'},
          {id: 'inm-paises', lab: '¿Dónde nacieron?'},
          {id: 'inm-permiso', lab: 'Con permiso e irregulares'},
        ]}
      />

      <Bulo
        frase="Los inmigrantes delinquen más"
        veredicto="Cierto, con matices"
        tono="cierto"
        resp={
          <>
            Los extranjeros tienen unas {fmt(ratioCond, 1)} veces más condenas por habitante que los españoles ({fmt(cExt, 1)} frente a {fmt(cEsp, 1)}{' '}
            por 1.000 adultos en {aCond}). <T k="estandarizar-por-edad">A igual edad</T> la diferencia baja a {fmt(est.ratioPorEdad, 1)} veces, pero no
            desaparece. Y no se puede saber nada de los <T k="nacionalizacion">nacionalizados</T>: la estadística solo separa por nacionalidad.
          </>
        }
        positivo={[
          <>
            La delincuencia total no se ha disparado: {fmt(tInf, 0)} delitos conocidos por cada 1.000 habitantes en {aInf}, frente a {fmt(t08, 0)} en
            2008, aunque los nacidos fuera han pasado del {pct(POB_INMIG.nacidosFueraPct['2008'])} al {pct(nfInf)} de la población.
          </>,
          ...(ratioCond < ratioCond0
            ? [
                <>
                  La distancia se ha reducido algo: de {fmt(ratioCond0, 1)} veces en {aCond0} a {fmt(ratioCond, 1)} en {aCond}.
                </>,
              ]
            : []),
          <>No todos los extranjeros son iguales: los de nacionalidad asiática tienen la misma tasa que los españoles.</>,
        ]}
        negativo={[
          <>Incluso a igual edad, los extranjeros tienen {fmt(est.ratioPorEdad, 1)} veces más condenas.</>,
          <>Los de nacionalidad africana llegan a 25 por cada 1.000 adultos, cuatro veces la tasa de los españoles (sin ajustar por edad).</>,
          <>El {fmt(DELITO.prisiones.pctExtranjeros, 0)} % de los presos son extranjeros, más del doble de su peso entre los adultos.</>,
          <>No existen datos oficiales por país de nacimiento, así que el debate se hace a ciegas sobre los nacionalizados.</>,
        ]}
        graficas={[
          {id: 'inm-condenados', lab: 'Condenados por 1.000 adultos'},
          {id: 'inm-edad', lab: 'Según la edad'},
          {id: 'inm-delitos', lab: 'Delitos conocidos'},
        ]}
      />

      <Bulo
        frase="Viven de las paguitas"
        veredicto="Falso, con un matiz"
        tono="falso"
        positivo={[
          <>Por cada extranjero que cobra el Ingreso Mínimo Vital, {porTitular} extranjeros trabajan y cotizan.</>,
          <>
            Los extranjeros son ya más del {Math.floor(um.pct)} % de los <T k="afiliados">afiliados</T> a la Seguridad Social: sostienen una parte
            creciente del sistema.
          </>,
          ...(pobExt < pobMax
            ? [
                <>
                  Su pobreza ha bajado: del {fmt(pobMax, 0)} % de los adultos extranjeros en {aPobMax} al {pct(pobExt)} en {aPob}.
                </>,
              ]
            : []),
        ]}
        negativo={[
          <>
            {Math.round(pobExt / 10)} de cada 10 adultos extranjeros están en <T k="riesgo-de-pobreza">riesgo de pobreza</T>, casi el triple que los
            españoles ({pct(pobEsp)}).
          </>,
          <>
            Cobran el IMV algo más de lo que les tocaría por población: {pct(imv.extranjerosPct)} de los titulares frente al {pct(pobExtranjera)} de
            los habitantes.
          </>,
          <>
            La ayuda no llega a muchos de los que la necesitan: son en torno al {fmt(pctPobres, 0)} % de los adultos pobres, pero solo el{' '}
            {fmt(imv.extranjerosPct, 0)} % de los titulares (estimación propia).
          </>,
        ]}
        resp={
          <>
            En {mesAnio(um.mes)} había {fmt(um.extranjerosMedios / 1e6, 2)} millones de extranjeros{' '}
            <T k="cotizaciones">cotizando</T> a la Seguridad Social y {fmt(imv.titularesExtranjeros, 0)} cobrando el{' '}
            <T k="imv">Ingreso Mínimo Vital</T>: por cada extranjero que lo cobra, {porTitular} trabajan. El matiz: sí lo cobran algo más de lo que les
            tocaría por población (el {pct(imv.extranjerosPct)} de los titulares, siendo el {pct(pobExtranjera)} de los habitantes), porque son mucho
            más pobres.
          </>
        }
      >
        <Mini
          title="Peso de los extranjeros en España"
          sub="% que suponen los extranjeros en cada grupo"
          series={[
            {lab: 'Afiliados a la Seguridad Social', c: COL_ES, data: PAGUITAS.afiliadosExtranjerosPct},
            {lab: 'Población', c: '#868E96', dash: true, data: PAGUITAS.poblacionExtranjeraPct},
            {lab: 'Titulares del Ingreso Mínimo Vital', c: COL_EX, data: imvPct},
          ]}
          f={pct}
          x0={2005.5}
          yMin={0}
          note={
            <>
              <p>
                Los extranjeros son más del {Math.floor(um.pct)} % de quienes <T k="cotizaciones">cotizan</T> y el {pct(imv.extranjerosPct)} de los
                titulares del <T k="imv">Ingreso Mínimo Vital</T> (la ayuda estatal contra la pobreza). Por cada 100 habitantes,{' '}
                {fmt(cmp.titularesIMVpor100residentes_extranjeros, 1)} extranjeros cobran el IMV frente a {fmt(cmp.titularesIMVpor100residentes_espanoles, 1)}{' '}
                españoles.
              </p>
              <p>
                Pero frente a la pobreza están por debajo: son en torno al {fmt(pctPobres, 0)} % de los adultos en{' '}
                <T k="riesgo-de-pobreza">riesgo de pobreza</T> (estimación propia con Eurostat y el INE) y solo el {fmt(imv.extranjerosPct, 0)} % de los
                titulares. El IMV exige llevar al menos un año viviendo legalmente en España, así que quien no tiene papeles no puede cobrarlo.
              </p>
              <p>
                {afiEnCurso && anioEnCurso === '2026' ? (
                  <>
                    {mediaHasta}; el salto coincide con la <T k="regularizacion">regularización</T> extraordinaria de ese año.
                  </>
                ) : (
                  <>
                    {afiEnCurso && `${mediaHasta}. `}El salto de 2026 coincide con la <T k="regularizacion">regularización</T> extraordinaria de ese año.
                  </>
                )}{' '}
                El IMV solo se publica por nacionalidad desde 2024. Nacionalidad, no origen: los nacionalizados cuentan como españoles.
              </p>
            </>
          }
          src={
            <>
              {L('Seguridad Social, afiliados extranjeros', SS_AFI)} y {L('dosier del IMV (tabla 1.5)', SS_IMV)};{' '}
              {L('Ministerio de Trabajo, boletín AEX-1', 'https://www.mites.gob.es/estadisticas/bel/AEX/aex1.xls')}; población:{' '}
              {L('INE (tabla 59585)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=59585')}
            </>
          }
        />
        <Mini
          title="Riesgo de pobreza según la nacionalidad"
          sub="% de adultos que viven con menos del 60 % de la renta mediana"
          series={[
            {lab: 'Extranjeros', c: COL_EX, data: PAGUITAS.pobrezaExtranjeros},
            {lab: 'Españoles', c: COL_ES, data: PAGUITAS.pobrezaEspanoles},
          ]}
          f={pct}
          x0={2007.5}
          yMin={0}
          note={
            <p>
              En {aPob}, el {pct(pobExt)} de los adultos extranjeros estaba en <T k="riesgo-de-pobreza">riesgo de pobreza</T>, frente al {pct(pobEsp)} de
              los españoles. Llegó al {fmt(pobMax, 0)} % en {aPobMax}. Por eso, a igual reglas, más extranjeros cumplen los requisitos de las ayudas
              contra la pobreza. Antes de 2008 la encuesta usaba otro método y no se puede comparar.
            </p>
          }
          src={L('Eurostat, ilc_li31 (Encuesta de Condiciones de Vida del INE)', 'https://ec.europa.eu/eurostat/databrowser/view/ilc_li31/default/table')}
        />
      </Bulo>

      <Bulo
        frase="Nos quitan el trabajo"
        veredicto="Engañoso"
        tono="matiz"
        positivo={[
          <>
            El paro de los españoles está en el nivel {minParo.replace('el ', '')} a la vez que trabajan más extranjeros que nunca.
          </>,
          <>
            Cubren trabajos donde faltan manos: el {fmt(enSector(/hogares/), 0)} % de quienes trabajan en hogares y el {fmt(enSector(/Hostelería/), 0)} %
            en hostelería son extranjeros.
          </>,
          <>El Banco de España no encuentra que empeoren el empleo ni los sueldos de los españoles en conjunto.</>,
        ]}
        negativo={[
          <>
            Tienen mucho más paro: {pct(paroX)} frente a {pct(paroE)} de los españoles en {aParo}.
          </>,
          <>
            Se concentran en empleos peor pagados: el {fmt(elem.extranjerosPct, 0)} % en <T k="ocupaciones-elementales">ocupaciones elementales</T> y
            un sueldo medio de 18.470 € frente a 25.930 € de los españoles (Hacienda, 2024).
          </>,
          <>Que no haya efecto en la media no descarta que compitan con los trabajadores españoles con menos estudios en algunos sectores.</>,
        ]}
        resp={
          <>
            Desde 2012 los extranjeros <T k="afiliados">afiliados</T> han pasado de {dec1(PAGUITAS.afiliadosExtranjeros['2012'])} a{' '}
            {dec1(PAGUITAS.afiliadosExtranjeros[aAfiExt])} millones y, a la vez, el <T k="tasa-de-paro">paro</T> de los españoles ha bajado al{' '}
            {pct(paroE)} ({aParo}), {minParo}. Trabajan sobre todo en hostelería, campo, obra y hogares, y tienen más paro que los españoles. El Banco
            de España no encuentra que la inmigración empeore el empleo ni los sueldos de los españoles en conjunto. Puede haber más competencia en
            algunos trabajos que piden poca formación, pero los datos no sostienen la frase tal cual.
          </>
        }
      >
        <Mini
          title="Paro según la nacionalidad"
          sub="% de la población activa en paro (media del año)"
          series={[
            {lab: 'Extranjeros', c: COL_EX, data: TRABAJO.paroExtranjeros},
            {lab: 'Españoles', c: COL_ES, data: TRABAJO.paroEspanoles},
          ]}
          f={pct}
          x0={2001.5}
          yMin={0}
          note={
            <>
              <p>
                Los extranjeros siempre han tenido más <T k="tasa-de-paro">paro</T>: en 2013, el {dec1(TRABAJO.paroExtranjeros['2013'])} % frente al{' '}
                {pct(TRABAJO.paroEspanoles['2013'])} de los españoles; en {aParo}, el {pct(paroX)} frente al {pct(paroE)}.
                {aParoU !== aParo && ` ${aParoU} es el tercer trimestre.`}
              </p>
              <p>
                La <T k="tasa-de-empleo">tasa de empleo</T> de los extranjeros parece más alta (58 % frente a 52 %), pero es porque casi no hay jubilados entre ellos. De 25 a 54
                años trabajan menos: el {pct(TRABAJO.empleo25a54.extranjera)} frente al {pct(TRABAJO.empleo25a54.espanolaSolo)} de los españoles.
              </p>
              <p>
                Banco de España (2025): «la inmigración no tiene efectos negativos significativos sobre las oportunidades de empleo ni sobre los
                salarios para el conjunto de los trabajadores nativos». Es una media: no descarta efectos en grupos concretos, como los trabajadores
                con menos estudios. La <T k="epa">EPA</T> incluye a los que tienen doble nacionalidad entre los españoles.
              </p>
            </>
          }
          src={
            <>
              {L('INE, EPA (tabla 66057)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=66057')} y{' '}
              {L('tasas de empleo (66036)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=66036')};{' '}
              {L('Banco de España, Boletín Económico 2025/T2', 'https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/InformesBoletinesRevistas/BoletinEconomico/25/T2/Fich/be2502-art10.pdf')}
            </>
          }
        />
        <Barras
          title="Dónde trabajan"
          sub={`% de los afiliados de cada grupo que trabaja en cada sector, ${TRABAJO.sectores.anio}`}
          series={[
            {lab: 'Españoles', c: COL_ES},
            {lab: 'Extranjeros', c: COL_EX},
          ]}
          filas={sect.map((f: {sector: string; espanolesPct: number; extranjerosPct: number}) => ({
            lab: f.sector.replace(/ \(.*\)/, '').replace('Agricultura, ganadería y pesca', 'Campo y pesca'),
            vals: [f.espanolesPct, f.extranjerosPct],
          }))}
          f={pct}
          note={
            <>
              <p>
                Los extranjeros se concentran donde cuesta encontrar trabajadores: el {fmt(enSector(/hogares/), 0)} % de quienes trabajan en hogares
                (limpieza, cuidados) son extranjeros, el {fmt(enSector(/Hostelería/), 0)} % en hostelería, el {fmt(enSector(/Agricultura/), 0)} % en el
                campo y el {fmt(enSector(/Construcción/), 0)} % en la construcción. En la administración pública, solo el{' '}
                {pct(enSector(/Administración pública/))}.
              </p>
              <p>
                Según la <T k="epa">EPA</T>, el {fmt(elem.extranjerosPct, 0)} % de los extranjeros que trabajan tiene{' '}
                <T k="ocupaciones-elementales">ocupaciones elementales</T> (peones, limpieza), frente al {fmt(elem.espanolesPct, 0)} % de los españoles;
                en profesiones técnicas y científicas es al revés ({fmt(tecn.extranjerosPct, 0)} % frente a {fmt(tecn.espanolesPct, 0)} %).
              </p>
            </>
          }
          src={L('Seguridad Social, afiliados medios por sector (datos.gob.es)', 'https://datos.gob.es/es/catalogo/e05072501-afiliados-medios-ss-extranj-por-rg-y-reta-cc-aa-seccion-cnae-09-y-uenoue-hasta-dic-25')}
        />
      </Bulo>

      <Bulo
        frase="Colapsan la sanidad"
        veredicto="Engañoso"
        tono="matiz"
        positivo={[
          <>Van menos al médico de familia y al especialista que los nacidos en España, incluso a igual edad.</>,
          <>Son jóvenes: cotizan durante años antes de llegar a las edades en que más se usa la sanidad.</>,
        ]}
        negativo={[
          <>Más población total, nacida aquí o fuera, significa más demanda: listas de espera y centros de salud lo notan.</>,
          <>En urgencias y hospital, a igual edad, van igual que los nacidos en España: ahí no hay ahorro.</>,
          <>
            Algunas enfermedades infecciosas son más frecuentes entre quienes vienen de países donde son comunes. La tuberculosis es la más clara: en
            2024, el 49 % de los casos fueron de personas nacidas fuera (23,4 por 100.000 habitantes, frente a 5,4 entre los nacidos en España, según el
            ISCIII). Se trata y se controla, pero exige diagnóstico, cribado y seguimiento, que también cuestan dinero.
          </>,
          <>
            El {pct(sAnio.extranjeros)} de los nacidos fuera lleva más de un año sin ir al médico ({pct(sAnio.espanoles)} los nacidos en España): puede
            haber problemas para acceder.
          </>,
        ]}
        resp={
          <>
            Los nacidos fuera van menos al médico de familia y al especialista que los nacidos en España, incluso{' '}
            <T k="estandarizar-por-edad">comparando a la misma edad</T>. A urgencias y al hospital van igual. Lo que sí aumenta la demanda es que
            haya más gente en total, nacida aquí o fuera. Algunas enfermedades infecciosas, como la tuberculosis, son más frecuentes entre quienes
            vienen de países donde son comunes y piden cribado y seguimiento; aun así, por persona usan menos la sanidad porque son más jóvenes.
          </>
        }
      >
        <Barras
          ancha
          title="Uso de la sanidad"
          sub="% de personas que usó cada servicio (Encuesta de Salud 2025)"
          series={[
            {lab: 'Nacidos en España', c: COL_ES},
            {lab: 'Nacidos fuera', c: COL_EX},
            {lab: 'Nacidos fuera, a igual edad', c: COL_EX2},
          ]}
          filas={san.map((i: {indicador: string; espanoles: number; extranjeros: number; extranjerosEstandarizadoPorEdad: number}) => ({
            lab: i.indicador.replace(/ \(%\)$/, '').replace('Consultó al médico de familia o pediatra', 'Médico de familia').replace('Consultó al médico especialista', 'Especialista').replace('Hospitalizado (ingreso de al menos una noche)', 'Ingreso en el hospital').replace('Usó algún servicio de urgencias', 'Urgencias'),
            vals: [i.espanoles, i.extranjeros, i.extranjerosEstandarizadoPorEdad],
          }))}
          f={pct}
          note={
            <>
              <p>
                Los nacidos fuera son más jóvenes: solo el {pct(edad.nacidosExtranjero['De 65 y más años'])} tiene 65 años o más, frente al{' '}
                {pct(edad.nacidosEspana['De 65 y más años'])} de los nacidos en España, y los mayores son los que más usan la sanidad. La barra «
                <T k="estandarizar-por-edad">a igual edad</T>» corrige eso (cálculo propio con las tablas del INE por edad).
              </p>
              <p>
                Aun así, van menos al médico de familia ({dec1(sFam.extranjerosEstandarizadoPorEdad)} % frente a {dec1(sFam.espanoles)} %) y al
                especialista ({dec1(sEsp.extranjerosEstandarizadoPorEdad)} % frente a {dec1(sEsp.espanoles)} %). En urgencias y hospital la diferencia es
                menor de un punto, tan pequeña que puede deberse al azar de la encuesta. El {pct(sAnio.extranjeros)} de los nacidos fuera no ha ido al
                médico en más de un año, frente al {pct(sAnio.espanoles)}.
              </p>
              <p>
                La encuesta separa por país de nacimiento, no por nacionalidad. Mide cuánta gente usa cada servicio, no cuántas veces ni cuánto
                cuesta. Estudios con datos de toda una comunidad (Aragón) llegan a lo mismo: los inmigrantes usan menos todos los servicios, también
                a igual edad, sexo y enfermedades.
              </p>
              {/*
                Fuentes de enfermedades infecciosas (para fuentes.json):
                - ISCIII, Centro Nacional de Epidemiologia (RENAVE), «Informe preliminar de la vigilancia de la tuberculosis en España. Año 2024»
                  (datos extraidos el 19-9-2025): https://cne.isciii.es/documents/d/cne/renave_informe_vigilancia-tb_-2024
                - Ministerio de Sanidad, nota de prensa de 24-3-2026: https://www.sanidad.gob.es/gabinete/notasPrensa.do?id=6874
                - Ministerio de Sanidad, Plan para la prevención y control de la tuberculosis en España, resumen ejecutivo (diciembre de 2019):
                  https://www.sanidad.gob.es/gl/areas/DCVIHT/tuberculosis/docs/Resumen_PlanTB2019.pdf
                - Chatterjee, Roy, ..., Herrador (ISCIII), «Rising scabies incidence in Spain ... 2011 to 2023», Eurosurveillance 30(47), 27-11-2025:
                  https://doi.org/10.2807/1560-7917.ES.2025.30.47.2500296
              */}
              <p>
                <b>Enfermedades infecciosas.</b> La <T k="tuberculosis">tuberculosis</T> es más frecuente en personas nacidas en países donde es común:
                en 2024 se notificaron en España 2.070 casos de nacidos fuera, el 49 % de los que tenían ese dato, con una tasa de 23,4 por 100.000
                habitantes frente a 5,4 en los nacidos en España. El ISCIII avisa de que esa tasa probablemente está inflada, porque las personas sin
                papeles cuentan en los casos pero no en la población. España sigue siendo un país de baja incidencia (8,8 casos por 100.000 en total). El
                tratamiento es la medida decisiva para controlarla, y el plan nacional pide reforzar el diagnóstico precoz en los centros de acogida a
                migrantes y estudiar caso a caso a los menores llegados de países donde es frecuente.
              </p>
              <p>
                La <T k="sarna">sarna</T> también ha aumentado mucho en España, sobre todo desde 2020, pero el estudio del ISCIII con datos de 2011 a 2023
                no la relaciona con la inmigración: los casos crecen en toda la población, sobre todo entre jóvenes de 15 a 24 años, con brotes en hogares
                y residencias de mayores, y más en las islas y la costa norte.
              </p>
            </>
          }
          src={
            <>
              {L('INE, Encuesta de Salud de España 2025', 'https://www.ine.es/dyngs/Prensa/es/ESdE2025.htm')} (tablas 81359, 81365, 81436 y 81453);{' '}
              {L('Gimeno-Feliu y otros (2016), BMC Public Health', 'https://doi.org/10.1186/s12889-016-3127-5')}; tuberculosis:{' '}
              {L('ISCIII, vigilancia de la tuberculosis, informe preliminar 2024', 'https://cne.isciii.es/documents/d/cne/renave_informe_vigilancia-tb_-2024')} y{' '}
              {L('Plan de prevención y control de la tuberculosis (2019)', 'https://www.sanidad.gob.es/gl/areas/DCVIHT/tuberculosis/docs/Resumen_PlanTB2019.pdf')};
              sarna: {L('Chatterjee y otros (ISCIII), Eurosurveillance 2025', 'https://doi.org/10.2807/1560-7917.ES.2025.30.47.2500296')}
            </>
          }
        />
      </Bulo>

      <Bulo
        frase="Nos están sustituyendo"
        veredicto="Engañoso"
        tono="matiz"
        positivo={[
          <>
            Sin ellos la población bajaría: en {aNac} hubo {fmt(red(defT - nacT, 1000), 0)} muertes más que nacimientos.
          </>,
          <>
            Las mujeres nacidas fuera tienen {fmt(fuera[aFo], 2)} hijos de media, poco más que las nacidas en España ({fmt(nacEsp[aFo], 2)}), y cada vez
            menos: {fmt(fuera[aFo0], 2)} en {aFo0}.
            {latAmIgual &&
              ` Las nacidas en Sudamérica (${fmt(gr['Sudamérica'][aFo], 2)}) y en Centroamérica y el Caribe (${fmt(gr['Centroamérica y Caribe'][aFo], 2)}) ya tienen tantos o menos que las españolas.`}
          </>,
          <>
            La <T k="segunda-generacion">segunda generación</T> se parece más a las españolas que a sus madres. En España, las hijas de
            latinoamericanos tienden a igualarse ({L('González-Ferrer y otras, CSIC, 2017', GF_2017)}). En seis países de Europa, la mayoría de las
            hijas de inmigrantes tiene su primer hijo al mismo ritmo que las nativas ({L('Kulu y otros, 2017', KULU_2017)}).
          </>,
          <>Muchos de esos niños serán españoles y crecerán aquí.</>,
        ]}
        negativo={[
          <>
            La natalidad sigue bajísima ({fmt(fecEsp, 2)} hijos por mujer las españolas y {fmt(fecExt, 2)} las extranjeras en {aFec}): la inmigración no
            lo arregla, solo lo retrasa.
          </>,
          <>
            El cambio es rápido: de un {fmt(NAT.pctMadreExtranjera['1996'], 0)} % de bebés con madre extranjera en 1996 a un {fmt(pctMadre, 0)} % en{' '}
            {aMad}. Si se cuentan las madres nacidas fuera (también las que ya son españolas), el {pct(pctFuera)} en {aFo}, frente al {pct(pctFuera0)} en{' '}
            {aFo0}. Exige esfuerzo de integración en escuelas e idioma.
          </>,
          <>
            Las nacidas en Marruecos, el grupo grande con más hijos, siguen por encima del <T k="reemplazo-generacional">nivel de reemplazo</T>:{' '}
            {fmt(mar[aFo], 2)} hijos por mujer en {aFo}
            {mar[aFo] > censoMar.valor && `, más que en el propio Marruecos (${fmt(censoMar.valor, 2)} según su censo de ${censoMar.anio})`}. Bajan deprisa
            ({fmt(mar[aFo0], 2)} en {aFo0}), pero aún no se han igualado, y las hijas de magrebíes siguen teniendo un segundo y un tercer hijo más a
            menudo que las españolas ({L('CSIC, 2017', GF_2017)}).
          </>,
        ]}
        resp={
          <>
            Es verdad que pesan cada vez más: en {aMad}, el {pct(pctMadre)} de los bebés nació de madre extranjera y el {pct(pctFuera)} de madre nacida
            fuera de España. Pero no porque tengan muchos hijos: las nacidas fuera tienen {fmt(fuera[aFo], 2)} <T k="fecundidad">hijos por mujer</T>,
            frente a {fmt(nacEsp[aFo], 2)} las nacidas en España. Lo que más pesa es que llegan muchas mujeres jóvenes (el{' '}
            {fmt(fo.pctMujeresFuera, 0)} % de las mujeres de 15 a 49 años que viven aquí nació fuera) y que las españolas tienen cada vez menos hijos: los
            de madre española han pasado de {fmt(red(NAT.nacimientosMadreEspanola['2008'], 100), 0)} en 2008 a{' '}
            {fmt(red(NAT.nacimientosMadreEspanola[aMad], 100), 0)} en {aMad}. Con {fmt(fuera[aFo], 2)} hijos por mujer, lejos de los 2,1 que hacen falta
            para mantenerse, las familias de origen inmigrante tampoco crecen solas a la larga, y sus hijas, criadas aquí, se parecen más a las españolas
            que a sus madres. Si su peso sigue subiendo será, sobre todo, porque sigue llegando
            gente.
          </>
        }
        graficas={[{id: 'inm-fecundidad', lab: 'Hijos por mujer según su origen'}]}
      >
        <Mini
          title="Nacimientos según la nacionalidad de la madre"
          sub="miles de bebés nacidos en España cada año"
          series={[
            {lab: 'Madre española', c: COL_ES, data: div(NATALIDAD.nacimientosMadreEspanola, 1000)},
            {lab: 'Madre extranjera', c: COL_EX, data: div(NATALIDAD.nacimientosMadreExtranjera, 1000)},
          ]}
          f={(v) => fmt(v, 1) + ' mil'}
          x0={1995.5}
          yMin={0}
          note={
            <>
              <p>
                Los hijos de madre extranjera subieron hasta {fmt(maxExt, 0)} en {aMaxExt} y en {aMad} fueron{' '}
                {fmt(NAT.nacimientosMadreExtranjera[aMad], 0)}. Los de madre española cayeron mucho más, por eso su peso pasa del{' '}
                {pct(NAT.pctMadreExtranjera['1996'])} (1996) al {pct(pctMadre)} ({aMad}). Si se cuenta a los que tienen al menos un progenitor
                extranjero, el {pct(ultimo<number>(NAT.pctAlMenosUnProgenitorExtranjero)[1])}.
              </p>
              <p>
                Desde 2015 en España mueren más personas de las que nacen: en {aNac}, {fmt(defT, 0)} defunciones frente a {fmt(nacT, 0)} nacimientos.
                Sin inmigración, la población bajaría.
              </p>
              <p>
                1996–2008 calculado con los <T k="microdatos">microdatos</T> oficiales del INE (el mismo cálculo reproduce exactamente sus tablas desde
                2009). {+aMad + 1} aún no está publicado por nacionalidad.
              </p>
            </>
          }
          src={
            <>
              {L('INE, Movimiento Natural de la Población (tablas 58929 y 48861)', 'https://www.ine.es/dyngs/Prensa/MNP2024.htm')} y{' '}
              {L('microdatos de nacimientos', 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177007&menu=resultados&idp=1254735573002')}
            </>
          }
        />
        <Mini
          title="Hijos por mujer"
          sub="indicador coyuntural de fecundidad, según la nacionalidad de la madre"
          series={[
            {lab: 'Extranjeras', c: COL_EX, data: NATALIDAD.fecundidadExtranjeras},
            {lab: 'Españolas', c: COL_ES, data: NATALIDAD.fecundidadEspanolas},
          ]}
          f={(v) => fmt(v, 2)}
          x0={2001.5}
          yMin={0}
          note={
            <p>
              En 2002 las extranjeras tenían {fmt(NAT.fecundidadExtranjeras['2002'], 2)} hijos de media y las españolas{' '}
              {fmt(NAT.fecundidadEspanolas['2002'], 2)}. En {aFec}, {fmt(fecExt, 2)} y {fmt(fecEsp, 2)}: la diferencia ha pasado de {fmt(dif02, 2)} a{' '}
              {fmt(difU, 2)} hijos.{difU < dif02 && ' La diferencia se va cerrando.'} Para que una población se mantenga sin inmigración hacen falta 2,1.
            </p>
          }
          src={L('INE, Indicadores Demográficos Básicos (tabla 1407)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=1407')}
        />
      </Bulo>

      <Bulo
        frase="Los inmigrantes pagarán nuestras pensiones"
        veredicto="No realmente"
        tono="matiz"
        positivo={[
          <>Casi toda la mejora reciente de cotizantes por pensión viene de los extranjeros: con ellos hay {afiCon} por pensión; sin ellos, {afiSin} ({afiAnio}).</>,
          <>
            Mientras se jubila la generación del <T k="baby-boom">baby boom</T>, su aportación da un respiro a las cuentas públicas (
            <T k="airef">AIReF</T>).
          </>,
        ]}
        negativo={[
          <>No basta: haría falta el triple de inmigrantes en edad de trabajar de los previstos para que no empeorase la proporción de mayores (Banco de España).</>,
          <>Ellos también se jubilarán y cobrarán pensión.</>,
          <>Muchos cobran sueldos bajos, así que cotizan menos que la media.</>,
        ]}
        resp={
          <>
            Ayudan, y mucho ahora: casi toda la mejora reciente del número de <T k="cotizaciones">cotizantes</T> por pensión se debe a los extranjeros.
            Sin ellos habría {fmt(pp.ratioSinExtranjeros, 2)} <T k="afiliados">afiliados</T> por pensión en lugar de {fmt(pp.ratio, 2)}. Pero el Banco de España y la AIReF coinciden en que no
            bastan para frenar el envejecimiento, y además ellos también se jubilarán.
          </>
        }
      >
        <Mini
          title="Afiliados por cada pensión"
          sub="afiliados a la Seguridad Social por cada pensión contributiva"
          series={[
            {lab: 'Con extranjeros', c: '#495057', data: PAGUITAS.afiliadosPorPension},
            {lab: 'Sin contar a los extranjeros', c: COL_ES, data: PAGUITAS.afiliadosEspanolesPorPension},
          ]}
          f={(v) => fmt(v, 2)}
          x0={1999.5}
          yMin={0}
          note={
            <>
              <p>
                Con todos los <T k="afiliados">afiliados</T> hay {afiCon} por pensión ({afiAnio}); sin los extranjeros, {afiSin}
                {afiCasi2022 && ', casi igual que en 2022'}. Es decir: la mejora de los últimos años viene de los extranjeros que cotizan.
              </p>
              <p>
                Banco de España: para que la proporción entre mayores y personas en edad de trabajar no cambiara en 30 años, haría falta el triple de
                población nacida fuera en edad de trabajar de la que prevé el INE. La <T k="airef">AIReF</T> calcula que con un 15 % más o menos de
                inmigración el gasto en pensiones solo cambia 0,1 puntos del <T k="pib">PIB</T>, aunque la <T k="deuda-publica">deuda</T> sí varía bastante (unos 6 puntos en 2050). Y avisa: cuando estos
                inmigrantes se jubilen, también cobrarán pensión.
              </p>
              <p>
                {acabaEnCurso(PAGUITAS.afiliadosPorPension) && `${mediaHasta}. `}Los afiliados son altas, no personas: quien tiene dos trabajos cuenta dos
                veces.
              </p>
            </>
          }
          src={
            <>
              {L('Ministerio de Trabajo, boletines AFI-1, AEX-1 y PEN-1', 'https://www.mites.gob.es/estadisticas/bel/AFI/afi1.xls')};{' '}
              {L('Banco de España, Informe Anual 2023 (cap. 2)', BDE_2023)}; {L('AIReF, sostenibilidad a largo plazo (2025)', AIREF_2025)}
            </>
          }
        />
      </Bulo>

      <Bulo
        frase="Los menores no acompañados son muchísimos y delinquen"
        veredicto="No realmente"
        tono="matiz"
        positivo={[
          <>Son pocos en proporción: el {fmt(pctMen, 1)} % de los menores de España.</>,
          <>
            Mientras los registrados se multiplicaban por {xReg16} (2016–{aReg}), los menores extranjeros condenados apenas cambiaron.
          </>,
          ...(rmU < rm19
            ? [
                <>
                  La diferencia de condenas con los menores españoles se está reduciendo: de {fmt(rm19, 1)} veces (2019) a {fmt(rmU, 1)} ({aTm}).
                </>,
              ]
            : []),
        ]}
        negativo={[
          <>
            Se han multiplicado por {xReg13} desde 2013 y se concentran en Canarias, Ceuta y Melilla, que tienen más del triple de los que pueden
            atender.
          </>,
          <>Los menores extranjeros tienen casi el doble de condenas por habitante que los españoles.</>,
          <>Algunas fiscalías han descrito agresiones en <T k="centro-de-proteccion">centros de protección</T>, y no hay estadística específica de estos menores para medirlo bien.</>,
        ]}
        resp={
          <>
            A final de {aReg} había {fmt(nReg, 0)} <T k="mena">menores extranjeros no acompañados</T> registrados: 1 de cada{' '}
            {fmt(red(100 / pctMen, 100), 0)} menores que viven en España. Sí han crecido mucho ({xReg13} veces más que en 2013). Los menores extranjeros tienen el doble de condenas por habitante que los
            españoles, pero la diferencia se está reduciendo, y la estadística no dice cuántas son de menores no acompañados.
          </>
        }
      >
        <Mini
          title="Menores extranjeros no acompañados"
          sub="registrados por la Fiscalía a 31 de diciembre"
          series={[{lab: 'Registrados', c: COL_EX, data: MENORES.registrados}]}
          bars
          f={(v, x) => fmt(v, 0) + (x != null && MENORES.pctMenores[x] ? ` · ${fmt(MENORES.pctMenores[x], 2)} % de los menores` : '')}
          x0={2011.5}
          yMin={0}
          note={
            <>
              <p>
                Son el {fmt(pctMen, 1)} % de los casi 8 millones de menores de España, y el 1,5 % de los menores extranjeros. El salto de 2018 coincide
                con {recordPat ? 'el récord' : 'un pico'} de llegadas en patera ({fmt(MENORES.pateras['2018'], 0)} menores ese año). En {aPat} llegaron{' '}
                {fmt(nPat, 0)} en patera{aPat === '2024' && ' y casi 3.000 por tierra a Ceuta y Melilla'}.
              </p>
              <p>
                El problema real está en la distribución: Canarias, Ceuta y Melilla tienen más del triple de los que pueden atender, y en agosto de 2025
                se declaró la <T k="contingencia-migratoria">contingencia migratoria</T> para repartirlos entre comunidades.
              </p>
              <p>2012 cuenta solo los registros activos. La Fiscalía aún no ha publicado el dato de {+aReg + 1}.</p>
            </>
          }
          src={
            <>
              {L('Fiscalía General del Estado, memorias anuales (capítulo de extranjería)', 'https://www.fiscal.es/memorias/memoria2025/FISCALIA_SITE/capitulo_III/cap_III_4_4.html')};{' '}
              {L('La Moncloa, contingencia migratoria (29-8-2025)', 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/juventud-e-infancia/Paginas/2025/290825-rego-contingencia-migratoria.aspx')}
            </>
          }
        />
        <Mini
          title="Menores condenados"
          sub="condenados de 14 a 17 años por cada 1.000 de esa edad y nacionalidad"
          series={[
            {lab: 'Extranjeros', c: COL_EX, data: MENORES.tasaExtranjeros},
            {lab: 'Españoles', c: COL_ES, data: MENORES.tasaEspanoles},
          ]}
          f={(v) => fmt(v, 1)}
          x0={2012.5}
          yMin={0}
          note={
            <>
              <p>
                En {aTm}, {fmt(tmE[aTm], 1)} de cada 1.000 menores extranjeros fueron condenados, frente a {fmt(tmS[aTm], 1)} de cada 1.000 españoles:{' '}
                {fmt(rmU, 1)} veces más. En 2019 era {fmt(rm19, 1)} veces. El {fmt(100 - pctExtCond, 0)} % de los menores condenados son españoles.
              </p>
              <p>
                El INE no separa a los <T k="mena">menores no acompañados</T> del resto de menores extranjeros. Un dato que no encaja con la frase: entre
                2016 y {aReg} los no acompañados se multiplicaron por {xReg16} y los menores extranjeros condenados apenas cambiaron (de{' '}
                {fmt(MENORES.condenadosExtranjeros['2016'], 0)} a {fmt(MENORES.condenadosExtranjeros[aReg], 0)}). Uno que sí: tras el
                pico de llegadas de 2018, las condenas de menores africanos subieron un 31 % en 2019. Algunas fiscalías provinciales describieron en
                2018 agresiones de algunos de estos menores en centros de protección.
              </p>
              <p>
                Las tasas de extranjeros pueden salir algo altas: si hay menores sin <T k="padron">empadronar</T>, cuentan en las condenas pero no en la población.
              </p>
            </>
          }
          src={
            <>
              {L('INE, Estadística de la Población Condenada Menor de Edad (tabla 25721)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=25721')};{' '}
              {L('Fiscalía, Memoria 2019 (cap. III 6.2)', 'https://www.fiscal.es/memorias/memoria2019/FISCALIA_SITE/recursos/pdf/capitulo_III/cap_III_6_2.pdf')}
            </>
          }
        />
      </Bulo>

      <Bulo
        frase="Se van los españoles y vienen ellos"
        veredicto="No realmente"
        tono="matiz"
        positivo={[
          ...(positivosEsp.length ? [<>En {yLista(positivosEsp)} llegaron más españoles de los que se fueron.</>] : []),
          <>Muchos de los que llegan son hijos y nietos de emigrantes españoles que vuelven.</>,
        ]}
        negativo={[
          <>Los nacidos en España se van más de lo que vuelven todos los años: unos 25.000 menos en 2024.</>,
          <>
            {fmt(red(extNac[aExt], 1000), 0)} españoles nacidos en España viven en el extranjero ({aExt}){extSube && ', y la cifra sigue subiendo'}.
          </>,
          <>La población solo crece porque llegan extranjeros: si dejan de venir, España empieza a perder habitantes.</>,
        ]}
        resp={
          <>
            Vienen muchos más extranjeros de los que se van: en {aMig}, {fmt(saldoX, 0)} más. Pero los españoles no se van en masa: ese año salieron{' '}
            {fmt(mg.emigracionesEspanoles[aMig], 0)} y volvieron o llegaron {fmt(mg.inmigracionesEspanoles[aMig], 0)}. Contando solo a los nacidos en España, se pierden unos 25.000 al año.
          </>
        }
      >
        <Mini
          title="Saldo migratorio"
          sub="miles de personas: llegadas desde el extranjero menos salidas al extranjero"
          series={[
            {lab: 'Extranjeros', c: COL_EX, data: div(MIGRACIONES.saldoExtranjeros, 1000)},
            {lab: 'Españoles', c: COL_ES, data: div(MIGRACIONES.saldoEspanoles, 1000)},
          ]}
          f={(v) => fmt(v, 1) + ' mil'}
          x0={2007.5}
          hitos={[{x: 2020.5, lab: 'Nueva estadística'}]}
          note={
            <>
              <p>
                Durante la crisis (2010–2014) se fueron más extranjeros de los que llegaron. Los españoles perdieron como mucho{' '}
                {fmt(red(-minE, 100), 0)} personas netas al año ({aMinE}).{' '}
                {positivosEsp.length ? (
                  <>
                    En {yLista(positivosEsp)} el <T k="saldo-migratorio">saldo</T> de los españoles es positivo, aunque de
                  </>
                ) : (
                  'De'
                )}{' '}
                los españoles que llegaron en {aMig} solo el{' '}
                {fmt((mg.inmigracionesEspanolesNacidosEspana[aMig] / mg.inmigracionesEspanoles[aMig]) * 100, 0)} % había nacido en España: el resto son hijos y nietos de españoles nacidos fuera. Los nacidos en España salen más de los que vuelven todos los
                años (−25.521 en 2024).
              </p>
              <p>
                En 2021 cambia la estadística del INE y cuenta más movimientos, así que las cifras de antes y después no se pueden comparar
                directamente.
              </p>
            </>
          }
          src={
            <>
              {L('INE, Estadística de Migraciones (2008–2020)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=24293')} y{' '}
              {L('Estadística de Migraciones y Cambios de Residencia (2021–2024)', 'https://www.ine.es/dyngs/Prensa/EMCR2024.htm')}
            </>
          }
        />
        <Mini
          title="Españoles que viven en el extranjero"
          sub="millones, inscritos en los consulados a 1 de enero"
          series={[
            {lab: 'Total', c: '#495057', data: div(MIGRACIONES.espanolesExterior, 1e6)},
            {lab: 'Nacidos en España', c: COL_ES, data: div(MIGRACIONES.espanolesExteriorNacidosEspana, 1e6)},
          ]}
          f={(v) => fmt(v, 2) + ' M'}
          x0={2008.5}
          yMin={0}
          note={
            <p>
              Hay {fmt(extTot / 1e6, 1)} millones de españoles inscritos en el extranjero ({aExt}),{' '}
              {ratioExt > 2 ? 'más del doble que en 2009' : `${fmt(ratioExt, 1)} veces los de 2009`}. Pero los nacidos en España solo han pasado de{' '}
              {fmt(red(extNac['2009'], 1000), 0)} a {fmt(red(extNac[aExt], 1000), 0)}: casi todo el aumento son hijos y nietos de españoles nacidos fuera,
              y la «<T k="ley-de-nietos">ley de nietos</T>». Cuenta inscripciones en consulados, no emigración real.
            </p>
          }
          src={L('INE, Padrón de Españoles Residentes en el Extranjero (tabla 71119)', 'https://www.ine.es/dyngs/Prensa/PERE2026.htm')}
        />
      </Bulo>

      <Bulo
        frase="Mandan todo el dinero fuera"
        veredicto="Falso"
        tono="falso"
        positivo={[
          <>Lo que envían equivale como mucho a una cuarta parte de su sueldo; el resto se gasta aquí.</>,
          <>
            Es dinero ya ganado: los impuestos sobre el sueldo y las <T k="cotizaciones">cotizaciones</T> se pagan antes de enviarlo.
          </>,
          <>
            Pesa poco en la economía: el {fmt(REMESAS.pctPIB[aRem], 2)} % del <T k="pib">PIB</T>.
          </>,
        ]}
        negativo={[
          <>Son más de {fmt(Math.floor(rem / 100) * 100, 0)} millones de euros al año que no se gastan en España.</>,
          <>
            La cantidad se ha duplicado desde 2013 (de {fmt(red(REMESAS.salidasMEur['2013'], 100), 0)} a {fmt(red(rem, 100), 0)} millones).
          </>,
        ]}
        resp={
          <>
            En {aRem} se enviaron fuera {fmt(rem, 0)} millones de euros, el {fmt(REMESAS.pctPIB[aRem], 2)} % del PIB.
            Equivale como mucho a una cuarta parte de lo que cobran los asalariados extranjeros ({fmt(salU, 1)} % en {aSal}). El resto se queda aquí.
          </>
        }
      >
        <Mini
          title="Dinero enviado a otros países"
          sub="remesas de trabajadores pagadas desde España, millones de euros"
          series={[{lab: 'Remesas', c: COL_EX, data: REMESAS.salidasMEur}]}
          bars
          f={(v, x) => fmt(v, 0) + ' M€' + (x != null && REMESAS.pctPIB[x] ? ` · ${fmt(REMESAS.pctPIB[x], 2)} % del PIB` : '')}
          x0={2012.5}
          yMin={0}
          note={
            <>
              <p>
                Crecen porque hay más inmigrantes trabajando, pero apenas cambian respecto al tamaño de la economía ({fmt(Math.min(...pibs), 1)}–
                {fmt(Math.max(...pibs), 1)} % del <T k="pib">PIB</T>). Unos {fmt(red(remPorNacidoFuera, 100), 0)} € al año por persona nacida fuera.
              </p>
              <p>
                En {aDest} el {pctDest('America')} % fue a América (Colombia, {fmt(dest.Colombia, 0)} M€), el {pctDest('Africa')} % a África (Marruecos,{' '}
                {fmt(dest.Marruecos, 0)} M€) y el {pctDest('Asia')} % a Asia. Antes de 2013 el Banco de
                España usaba otro método.
              </p>
            </>
          }
          src={L('Banco de España, Boletín Estadístico (cuadro 17.6a)', 'https://www.bde.es/webbe/es/estadisticas/compartido/datos/csv/be176a.csv')}
        />
        <Mini
          title="Remesas frente a sueldos"
          sub="remesas enviadas, en % de lo que cobran los asalariados extranjeros"
          series={[{lab: '% de los sueldos', c: COL_EX, data: salExt}]}
          f={pct}
          x0={2012.5}
          yMin={0}
          note={
            <p>
              {/* Personas y sueldos medios: Hacienda 2024, no estan en el JSON (solo se dicen si el ultimo año es 2024) */}
              En {aSal} los asalariados extranjeros cobraron {fmt(REMESAS.salariosExtranjerosMEur[aSal], 0)} millones de euros
              {aSal === '2024' && ' (2,68 millones de personas, 18.470 € de media frente a 25.930 € de los españoles)'}. Las{' '}
              <T k="remesas">remesas</T> equivalen al {pct(salU)}. Es un máximo: también envían dinero nacionalizados,{' '}
              <T k="autonomo">autónomos</T> y pensionistas, y los sueldos de Hacienda no incluyen País Vasco ni Navarra. En 2013 era el{' '}
              {pct(salExt['2013'])}.
            </p>
          }
          src={
            <>
              {L('Agencia Tributaria, Mercado de trabajo y pensiones en las fuentes tributarias', 'https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/mercado/2024/home.html')}{' '}
              y Banco de España (cálculo propio)
            </>
          }
        />
      </Bulo>
    </Cuestiones>
  );
}
