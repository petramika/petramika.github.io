import {VIOL, VIOLENCIA as V, POB_INMIG} from '../../datos';
import {fmt} from '../../lib/formato';
import Mini from '../../componentes/graficas/Mini';
import Barras from '../../componentes/graficas/Barras';
import Info from '../../componentes/Info';
import {L} from '../../componentes/enlace';
import {ultimo} from '../inmigracion/ultimo';
import TiposViolencia, {COL, TIPOS, type Serie, enMiles, red} from './TiposViolencia';
import Indice, {GraficasIndice, NotaIndice} from './Indice';
import CuestionesViolencia from './CuestionesViolencia';
import {ContraQuien, Edad, Estimado, Extranjeros, QuienComete, Resueltos} from './PorAnio';

const enMilesF = (v: number) => fmt(Math.round(v * 1000), 0);
const pctF = (v: number) => fmt(v, 1) + ' %';

const INTERIOR = 'https://estadisticasdecriminalidad.ses.mir.es/';
const SANIDAD = 'https://www.sanidad.gob.es/areas/promocionPrevencion/embarazo/home.htm';
const MACRO24 = 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/igualdad/Paginas/2025/031225-macroencuesta-violencia-genero.aspx';
const MACRO24_SEX = 'https://violenciagenero.igualdad.gob.es/wp-content/uploads/Capitulo-16.-VSx-fuera-pareja.pdf';
const MACRO19 = 'https://violenciagenero.igualdad.gob.es/wp-content/uploads/Principales_Resultados_Macroencuesta2019.pdf';
const INE_VG = 'https://www.ine.es/jaxiT3/Tabla.htm?t=28195';
const CGPJ_MUERTES =
  'https://www.poderjudicial.es/stfls/SALA%20DE%20PRENSA/DOCUMENTOS%20DE%20INTERES/Informe%20Muertes%20Violencia%20de%20G%C3%A9nero%20y%20Dom%C3%A9stica%202025.pdf';

const combinar = (f: (...v: number[]) => number, ...series: Serie[]): Serie =>
  Object.fromEntries(
    Object.keys(series[0])
      .filter((a) => series.every((s) => s[a] != null))
      .map((a) => [a, f(...series.map((s) => s[a]))]),
  );

const SEXUALES = TIPOS.filter((t) => t.sexual).map((t) => t.k);
const NO_SEXUALES = TIPOS.filter((t) => !t.sexual).map((t) => t.k);
const sumaTipos = (ks: string[], sexo: 'hombres' | 'mujeres'): Serie => combinar((...v) => v.reduce((t, x) => t + x, 0), ...ks.map((k) => V.tipos[k][sexo]));

/** Condenados por sexo: delito y nombre */
const AUTORES: [string, string][] = [
  ['sexuales', 'Delitos sexuales'],
  ['tratoDegradante', 'Malos tratos habituales'],
  ['pareja', 'Violencia en la pareja y la familia'],
  ['homicidios', 'Homicidios y asesinatos'],
  ['roboViolencia', 'Robos con violencia'],
  ['amenazas', 'Amenazas'],
  ['lesiones', 'Lesiones'],
  ['todos', 'Todos los delitos'],
];

/** Detenidos: los tipos que se comparan y su nombre corto */
const DETENIDOS: [string, string][] = [
  ['robosViolencia', 'Robos con violencia'],
  ['conPenetracion', 'Agresión sexual con penetración'],
  ['agresionSexual', 'Agresión sexual sin penetración'],
  ['otrosPersonas', 'Otros contra las personas'],
  ['malosTratos', 'Malos tratos en la familia'],
  ['homicidios', 'Homicidios y tentativas'],
  ['lesiones', 'Lesiones'],
];

export default function PestanaViolencia() {
  const sM = sumaTipos(SEXUALES, 'mujeres'), sH = sumaTipos(SEXUALES, 'hombres');
  const nsM = sumaTipos(NO_SEXUALES, 'mujeres'), nsH = sumaTipos(NO_SEXUALES, 'hombres');
  const total = combinar((a, b, c, d) => a + b + c + d, sM, sH, nsM, nsH);
  const pctSexual = combinar((a, b, t) => ((a + b) / t) * 100, sM, sH, total);
  const pctSexualMujeres = combinar((s, ns) => (s / (s + ns)) * 100, sM, nsM);
  const pctSexualHombres = combinar((s, ns) => (s / (s + ns)) * 100, sH, nsH);
  const [a] = ultimo<number>(total);

  const M = V.macroencuesta2024, M19 = V.macroencuesta2019;

  const [aAb, abU] = ultimo<number>(V.abortos);
  const MA = V.abortosMetodoAnual as Record<string, Record<string, number>>;
  const aniosMetodo = Object.keys(MA).filter((y) => Number(y) >= 2011).sort();
  const pctMetodo = (k: string) =>
    Object.fromEntries(
      aniosMetodo.map((y) => {
        const tot = Object.values(MA[y]).reduce((s, n) => s + n, 0);
        return [y, ((MA[y][k] ?? 0) / tot) * 100];
      }),
    );
  const pct89 = (k: string) => ((MA['1989'][k] ?? 0) / Object.values(MA['1989']).reduce((s, n) => s + n, 0)) * 100;
  const tasaAb = V.abortosTasa as Serie;
  const [aTasa, tasaU] = ultimo<number>(tasaAb);
  const [anioProt, vgU] = ultimo<number>(VIOL.vgMuj);

  const C = V.condenadosPorSexo, P = V.pareja;
  const [aCond] = ultimo<number>(P.condenadosGenero);
  const condenados = (k: string) => {
    if (k === 'pareja') return {h: P.condenadosGenero[aCond] + P.condenadosDomesticaHombres[aCond], m: P.condenadosDomesticaMujeres[aCond]};
    if (k === 'homicidios') return {h: C.homicidio.hombres[aCond] + C.asesinato.hombres[aCond], m: C.homicidio.mujeres[aCond] + C.asesinato.mujeres[aCond]};
    return {h: C[k].hombres[aCond], m: C[k].mujeres[aCond]};
  };
  const pctH = (k: string) => {
    const {h, m} = condenados(k);
    return (h / (h + m)) * 100;
  };

  return (
    <section style={{borderTop: 0, paddingTop: 8}}>
      <h2>
        Violencia{' '}
        <Info>
          Todas las víctimas de violencia que registran las policías (Policía Nacional, Guardia Civil, autonómicas y locales) desde 2010: de qué
          tipo, contra quién, quién la comete y quién es detenido. Lo registrado es solo lo que se denuncia o descubre la policía, así que se añade lo que cuentan las
          propias mujeres en la Macroencuesta de Violencia contra la Mujer. Al final, los abortos de cada año, que no son violencia pero se
          preguntan a menudo junto a ella.
        </Info>
      </h2>

      <TiposViolencia nota={<NotaIndice />}>
        <Indice />
      </TiposViolencia>

      <div className="charts" id="charts-vio">
        <GraficasIndice />
        <ContraQuien />
        <QuienComete />
        <Mini
          id="vio-autores-pareja"
          title="Condenados por violencia en la pareja y la familia"
          sub="miles de personas condenadas en sentencia firme al año, por sexo"
          series={[
            {lab: 'Hombres, violencia de género (contra su pareja o expareja)', c: COL.sexHombres, data: enMiles(P.condenadosGenero)},
            {lab: 'Hombres, violencia doméstica', c: COL.noSexHombres, data: enMiles(P.condenadosDomesticaHombres)},
            {lab: 'Mujeres, violencia doméstica', c: COL.noSexMujeres, data: enMiles(P.condenadosDomesticaMujeres)},
          ]}
          f={enMilesF}
          x0={2014.5}
          yMin={0}
          note={
            <>
              <p>
                Quién maltrata en la pareja y en la familia. En {aCond} fueron condenados {fmt(P.condenadosGenero[aCond], 0)} hombres por violencia de
                género y, por violencia doméstica, {fmt(P.condenadosDomesticaHombres[aCond], 0)} hombres y {fmt(P.condenadosDomesticaMujeres[aCond], 0)}{' '}
                mujeres. Juntando las dos, de cada 100 condenados {fmt(pctH('pareja'), 0)} son hombres.
              </p>
              <p>
                La violencia doméstica es la de entre familiares (padres, hijos, hermanos) y la que sufre un hombre de su pareja. Entre los denunciados
                por violencia doméstica con orden de protección, en {aCond} había {fmt(P.denunciadosDomesticaHombres[aCond], 0)} hombres y{' '}
                {fmt(P.denunciadosDomesticaMujeres[aCond], 0)} mujeres.
              </p>
            </>
          }
          src={L('INE, Estadística de Violencia Doméstica y Violencia de Género', INE_VG)}
        />
        <Mini
          id="vio-pareja"
          title="Violencia en la pareja y en la familia"
          sub="miles de víctimas al año con orden de protección o medidas cautelares, por sexo"
          series={[
            {lab: 'Mujeres, violencia de género (pareja)', c: COL.sexMujeres, data: enMiles(VIOL.vgMuj)},
            {lab: 'Mujeres, violencia en la familia', c: COL.noSexMujeres, data: enMiles(VIOL.vdMuj)},
            {lab: 'Hombres, violencia en la familia o la pareja', c: COL.noSexHombres, data: enMiles(VIOL.vdHom)},
          ]}
          f={enMilesF}
          x0={2010.5}
          yMin={0}
          note={
            <>
              <p>
                Por ley (Ley Orgánica 1/2004), violencia de género es la de un hombre contra una mujer que es o fue su pareja, así que solo hay
                mujeres. La violencia contra los hombres en la pareja y la de entre familiares (padres, hijos, hermanos) se cuenta como violencia
                doméstica. En {anioProt}: {fmt(vgU, 0)} mujeres víctimas de violencia de género, y en la familia {fmt(VIOL.vdMuj[anioProt], 0)} mujeres
                y {fmt(VIOL.vdHom[anioProt], 0)} hombres.
              </p>
              <p>
                Son solo los casos que llegan al juzgado con una orden de protección. Según la Macroencuesta 2024, el {fmt(M.violenciaParejaAlguna, 1)} %
                de las mujeres ha sufrido algún tipo de violencia de una pareja (física, sexual, psicológica o económica), y solo el{' '}
                {fmt(M.denunciaPareja, 1)} % de las que sufrieron violencia física, sexual o emocional lo denunció. Para la violencia sexual fuera de
                la pareja es aún menos: el {fmt(M.denunciaViolenciaSexual, 1)} % (en 2019 se calculó un {M19.denuncian} %, con otra forma de preguntar).
              </p>
            </>
          }
          src={
            <>
              {L('INE, Estadística de Violencia Doméstica y Violencia de Género', INE_VG)};{' '}
              {L('Ministerio de Igualdad, Macroencuesta 2024', MACRO24)}
            </>
          }
        />
        <Mini
          id="vio-muertes"
          title="Asesinados por su pareja o expareja"
          sub="personas al año, por sexo de la víctima"
          series={[
            {lab: 'Mujeres asesinadas por su pareja o expareja (hombre)', c: COL.sexMujeres, data: VIOL.mujMuertas},
            {lab: 'Resto: casi todos hombres asesinados por su pareja', c: COL.sexHombres, data: VIOL.otrasMuertes},
          ]}
          f={(v) => fmt(v, 0)}
          x0={2002.5}
          yMin={0}
          note={
            <p>
              Las mujeres asesinadas por su pareja o expareja son violencia de género. La línea azul es el resto de muertes en la pareja que recoge el
              CGPJ desde 2009: casi todas son hombres asesinados por una mujer. También está en la pestaña Global.
            </p>
          }
          src={L('CGPJ, informes de víctimas mortales en la pareja', CGPJ_MUERTES)}
        />
        <Extranjeros />
        <Resueltos />
      </div>

      <h3 style={{marginTop: 22}}>Violencia sexual</h3>
      <div className="charts" id="charts-vio-sexual">
        <Estimado />
        <Edad />
        <Barras
          id="vio-agresores"
          title="¿Quién viola?"
          sub="relación del agresor con la mujer violada fuera de la pareja, % (Macroencuesta 2024)"
          series={[{lab: 'Agresores', c: COL.sexMujeres}]}
          filas={Object.entries(M.agresoresViolacion as Record<string, number>).map(([lab, v]) => ({lab, vals: [v]}))}
          f={pctF}
          max={100}
          note={
            <>
              <p>
                El {fmt(M.violadas, 1)} % de las mujeres de 16 años o más ha sido violada fuera de la pareja alguna vez. En casi 9 de cada 10 casos el
                agresor era alguien que conocía: amigos, conocidos o familiares. Solo el {fmt(M.agresoresViolacion.Desconocidos, 0)} % fueron
                desconocidos.
              </p>
              <p>
                Solo se denunció el {fmt(M.denunciaViolaciones, 1)} % de las violaciones; el {fmt(M.contaronAAlguien, 1)} % de las víctimas de violencia
                sexual fuera de la pareja se lo contó a alguien. A esto se suman las violaciones dentro de la pareja, que la encuesta cuenta aparte.
              </p>
            </>
          }
          src={L('Ministerio de Igualdad, Macroencuesta de Violencia contra la Mujer 2024', MACRO24)}
        />
        <dl className="cuenta" id="vio-registrado-claves" style={{gridColumn: '1 / -1', marginTop: 0}}>
          <div>
            <dt>Más víctimas mujeres que hombres</dt>
            <dd>
              Las mujeres son el {pctF(((sM[a] + nsM[a]) / total[a]) * 100)} de las víctimas registradas en {a}, sobre todo por los malos tratos en la
              familia ({fmt(V.tipos.malosTratos.mujeres[a], 0)} mujeres frente a {fmt(V.tipos.malosTratos.hombres[a], 0)} hombres). Los hombres sufren más
              lesiones, robos y homicidios: {fmt(V.tipos.homicidios.hombres[a], 0)} víctimas de homicidio o tentativa frente a{' '}
              {fmt(V.tipos.homicidios.mujeres[a], 0)} mujeres.
            </dd>
          </div>
          <div className="ko">
            <dt>La violencia sexual es sobre todo contra mujeres</dt>
            <dd>
              De cada 100 víctimas de violencia sexual, {fmt((sM[a] / (sM[a] + sH[a])) * 100, 0)} son mujeres. Entre las mujeres,{' '}
              {fmt(pctSexualMujeres[a], 1)} de cada 100 violencias registradas son sexuales; entre los hombres, {fmt(pctSexualHombres[a], 1)}.
            </dd>
          </div>
          <div className="half">
            <dt>Lo que no llega a la policía</dt>
            <dd>
              Según la Macroencuesta 2024, el {fmt(M.violenciaSexualFueraPareja, 1)} % de las mujeres ha sufrido violencia sexual fuera de la pareja y
              el {fmt(M.violadas, 1)} % ha sido violada, pero <b>solo se denuncia el {fmt(M.denunciaViolenciaSexual, 1)} %</b> (el{' '}
              {fmt(M.denunciaViolaciones, 1)} % de las violaciones). Lo registrado es una parte pequeña de lo que pasa.
            </dd>
          </div>
        </dl>
      </div>

      <h3 style={{marginTop: 22}}>Abortos</h3>
      <div className="charts" id="charts-vio-abortos">
        <Mini
          id="vio-abortos"
          title="Abortos al año"
          sub="miles de interrupciones voluntarias del embarazo, desde la ley de 1985"
          series={[{lab: 'Abortos', c: COL.abortos, data: enMiles(V.abortos)}]}
          f={enMilesF}
          x0={1985.5}
          yMin={0}
          hitos={[{x: 2010.5, lab: 'Ley de plazos'}]}
          note={
            <>
              <p>
                Interrupciones voluntarias del embarazo notificadas por los centros autorizados, desde 1986: {fmt(V.abortos['1987'], 0)} en 1987,{' '}
                {fmt(V.abortos['2000'], 0)} en 2000 y {fmt(abU, 0)} en {aAb}. Por cada 1.000 mujeres de 15 a 44 años, de {fmt(tasaAb['1987'], 2)} en 1987 a{' '}
                {fmt(tasaU, 2)} en {aTasa}. No las publica el INE sino el Ministerio de Sanidad, y {Number(aAb) + 1} aún no se ha publicado.
              </p>
              <p>
                La ley de 1985 solo lo permitía en tres supuestos (violación, riesgo para la salud de la madre o malformación del feto); la de 2010
                (Ley Orgánica 2/2010, en vigor desde julio) lo permite a petición de la mujer en las primeras 14 semanas. Los primeros años los centros
                notificaban menos: de 1987 a 1989 faltan los de Cataluña, así que esos años se quedan cortos.
              </p>
              <p>
                No son violencia para ninguna de las fuentes: son una prestación sanitaria legal. En {aAb} lo decidió la propia mujer en el{' '}
                {fmt(V.abortosDecisionMujer2024, 1)} % de los casos; el resto fue por riesgo para su salud o por anomalías del feto.
              </p>
            </>
          }
          src={L('Ministerio de Sanidad, Interrupciones voluntarias del embarazo', SANIDAD)}
        />
        <Mini
          id="vio-metodo"
          title="¿Usaban anticonceptivo?"
          sub="% de las mujeres que abortaron, según el método que usaban"
          series={[
            {lab: 'Ninguno', c: '#212529', data: pctMetodo('Ninguno')},
            {lab: 'Preservativo', c: COL.abortos, data: pctMetodo('Preservativo/barrera')},
            {lab: 'Hormonales (píldora, parche…)', c: '#AE3EC9', data: pctMetodo('Hormonales')},
            {lab: 'Naturales (marcha atrás, calendario)', c: '#F59F00', data: pctMetodo('Naturales')},
            {lab: 'No consta', c: '#ADB5BD', dash: true, data: pctMetodo('No consta')},
          ]}
          f={pctF}
          x0={Number(aniosMetodo[0]) - 0.5}
          yMin={0}
          note={
            <>
              <p>
                En {aAb}, la mitad no usaba ningún método ({fmt(pctMetodo('Ninguno')[aAb], 1)} %). El informe no pregunta por qué: puede ser sexo que no se esperaba, falta de información, dinero,
                efectos secundarios o presión de la pareja. Una de cada cuatro usaba preservativo, y la mayoría serán roturas o malos usos.
              </p>
              <p>
                Sanidad solo publica el método de 1986 a 1989 y desde 2011: entre medias el cuestionario no lo preguntaba. En 1989 no usaba ninguno el{' '}
                {fmt(pct89('Ninguno'), 0)} %, el {fmt(pct89('Naturales'), 0)} % usaba métodos naturales y el {fmt(pct89('Preservativo/barrera'), 0)} %
                preservativo. En 2015 el «no consta» es muy alto: una de cada cinco, sin que el informe explique por qué.
              </p>
              <p>
                Lo que no se mide en España es la coerción reproductiva: presionar para no usar anticonceptivos, quitarse el preservativo sin que ella
                lo sepa o sabotear su método. En consultas de planificación familiar de Estados Unidos, entre el 15 % y el 25 % de las mujeres dice
                haberla sufrido alguna vez; en el conjunto de la población, entre el 5 % y el 7 %.
              </p>
            </>
          }
          src={
            <>
              {L('Ministerio de Sanidad, informes IVE de cada año (tabla G.1)', 'https://www.sanidad.gob.es/areas/promocionPrevencion/embarazo/anterioresIVEs.htm')};{' '}
              {L('Miller y otros, Contraception (2010)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4442065/table/T3')}
            </>
          }
        />
      </div>
      <CuestionesViolencia />
    </section>
  );
}

