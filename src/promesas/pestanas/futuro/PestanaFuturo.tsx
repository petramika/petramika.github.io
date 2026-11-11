import {ANNUAL, HAY_CASAS, POB_INMIG, VIV} from '../../datos';
import {fmt} from '../../lib/formato';
import Mini from '../../componentes/graficas/Mini';
import Barras from '../../componentes/graficas/Barras';
import Teselas from '../../componentes/graficas/Teselas';
import Info from '../../componentes/Info';
import {L} from '../../componentes/enlace';
import DEMO from '../../datos/futuro/demografia.json';
import SOST from '../../datos/futuro/sostenibilidad.json';
import IA from '../../datos/futuro/ia-crisis.json';

/*
  Pestaña escondida (se abre con el año final de la cabecera o con #futuro):
  qué ha cambiado de verdad en 40 años, qué no se sostiene según las
  proyecciones oficiales, si vendrán crisis y qué se sabe de la IA y el empleo.
  Sus datos viven en datos/futuro/ y solo se descargan al abrirla.
*/
type Serie = Record<string, number>;
/* eslint-disable @typescript-eslint/no-explicit-any */
const H = (DEMO as any).historia as Record<string, Serie>;
const P = (DEMO as any).proyeccionINE as Record<string, Serie>;
const EUROSTAT = (DEMO as any).eurostat;
const S = SOST as any;
const C = (IA as any).crisis;
const I = (IA as any).ia;

const n0 = (v: number) => fmt(v, 0);
const n1 = (v: number) => fmt(v, 1);
const pct1 = (v: number) => fmt(v, 1) + ' %';
const escala = (s: Serie, d: number): Serie => Object.fromEntries(Object.entries(s).map(([y, v]) => [y, v / d]));
const desde = (s: Serie, a: number, b = 9999): Serie => Object.fromEntries(Object.entries(s).filter(([y]) => +y >= a && +y <= b));
const ult = (s: Serie): [string, number] => {
  const k = Object.keys(s).sort().at(-1)!;
  return [k, s[k]];
};
const solo = (o: Record<string, unknown>): Serie =>
  Object.fromEntries(Object.entries(o).filter(([y, v]) => /^\d{4}$/.test(y) && typeof v === 'number')) as Serie;

const INE_PROY = 'https://www.ine.es/dyngs/Prensa/PROP20262076.htm';
const INE_IDB = 'https://www.ine.es/dynt3/inebase/es/index.htm?padre=1894';
const PROY = {x: 2025.5, lab: 'Proyección'};

export default function PestanaFuturo() {
  const [aH, pct65H] = ult(H.pct65);
  const deuda = ANNUAL.deuda as Serie;
  const [aDeuda, deudaU] = ult(deuda);
  const pf = ANNUAL.pf as Serie;
  const anios = VIV.anios as Serie;
  const [aAnios, aniosU] = ult(anios);
  const vpo = VIV.vpo as Serie;
  const [aVpo, vpoU] = ult(vpo);
  const fuera = {...(POB_INMIG.nacidosFueraPctAntes as Serie), ...(POB_INMIG.nacidosFueraPct as Serie)};
  const [aFuera, fueraU] = ult(fuera);
  const pib = S.salarios.pibPerCapitaReal;
  const ratioUE: Serie = Object.fromEntries(Object.keys(pib.ES).filter((y) => pib.UE27[y]).map((y) => [y, (pib.ES[y] / pib.UE27[y]) * 100]));
  const term = S.vivienda.terminadas.total as Serie;
  const hog = S.vivienda.hogaresNuevos.aumentoAnual as Serie;
  const AR = S.pensiones.ageingReport2024;
  const soporte = escala(AR.ratioSoporte_cotizantesPor100pensionistas as Serie, 100);
  const fmi = S.deuda.fmi.serie as Serie, com = S.deuda.comision.serie as Serie;
  const intereses = S.deuda.intereses.comisionDSM2025_gasto_intereses_pctPIB as Serie;
  const pibCrec = solo(C.crecimientoPIB), paro = solo(C.paroAnual);
  const negativos = Object.entries(pibCrec).filter(([, v]) => v < 0).map(([y]) => y);
  const adop = solo(I.adopcionEmpresasINE);
  const E = I.exposicion as any[];
  const cifra = (fuente: string, texto: string) => E.find((e) => e.fuente.startsWith(fuente) && e.dato.includes(texto))?.cifra as number | undefined;
  const expo: {lab: string; v: number | undefined}[] = [
    {lab: 'España, expuestos a la IA generativa (OCDE, 2024)', v: cifra('OCDE, Job', 'expuestos')},
    {lab: 'España, riesgo alto de automatización (OCDE, 2024)', v: cifra('OCDE, Job', 'alto riesgo')},
    {lab: 'España, ocupaciones de riesgo alto con toda la tecnología (OCDE, 2023)', v: cifra('OCDE, Employment', 'alto riesgo')},
    {lab: 'España, exposición media-alta y alta (BBVA Research)', v: cifra('BBVA', 'exposición')},
    {lab: 'Países ricos, expuestos (FMI)', v: cifra('FMI', 'Empleo en ocupaciones de alta exposición')},
    {lab: 'Países ricos, donde la IA podría sustituir (FMI)', v: cifra('FMI', 'baja complementariedad')},
    {lab: 'Países ricos, donde la IA ayudaría (FMI)', v: cifra('FMI', 'alta complementariedad')},
    {lab: 'Países ricos, expuestos a la IA generativa (OIT)', v: cifra('OIT', 'renta alta')},
    {lab: 'Mundo, expuestos (FMI)', v: cifra('FMI', 'mundial')},
    {lab: 'Mundo, expuestos a la IA generativa (OIT)', v: cifra('OIT', 'mundial')},
  ];
  const funcas = E.find((e) => e.cifra < 0);
  const [aNac, nacU] = ult(H.nacimientos);
  const [aSaldo, saldoU] = ult(H.saldoNatural);
  const eu2050 = EUROSTAT?.poblacion?.['2050'] as number | undefined;

  return (
    <section style={{borderTop: 0, paddingTop: 8}}>
      <h2>
        Lo que viene{' '}
        <Info>
          <p>
            Una página aparte, sin enlace en la barra de pestañas. Junta lo que ha cambiado de verdad en estos 40 años con lo que dicen las
            proyecciones oficiales: INE para la población, Fondo Monetario Internacional y Comisión Europea para la deuda, Comisión Europea para las
            pensiones, Banco de España para la vivienda, y OCDE, FMI, OIT, Banco de España y otros para la inteligencia artificial.
          </p>
          <p>
            Una proyección no es una profecía: dice qué pasaría si se cumplen sus supuestos (cuántos niños nacen, cuánta gente llega, que no cambien
            las leyes). Por eso las líneas futuras van discontinuas. La última parte es una lectura propia.
          </p>
        </Info>
      </h2>

      <div className="box" id="fut-cambios" style={{marginTop: 12}}>
        <h3>Lo que sí ha cambiado muchísimo</h3>
        <p className="note">
          La mayoría de los indicadores se mueven poco de una década a otra: el paro sube y baja con las crisis, la violencia registrada va y viene, la
          presión fiscal sube despacio. Pero unos pocos se han desbordado, y casi todos apuntan a lo mismo: <b>un país más viejo, más endeudado, donde
          vivir cuesta mucho más y que necesita a quien llega de fuera para crecer</b>.
        </p>
        <Teselas
          list={[
            [`${n1(anios['1987'])} → ${n1(aniosU)}`, `años de sueldo para comprar un piso (1987 → ${aAnios})`, 'Banco de España e INE'],
            [`${n0(deuda['1986'])} % → ${n0(deudaU)} %`, `deuda pública sobre el PIB (1986 → ${aDeuda}); en 2007 era el ${n0(deuda['2007'])} %`, 'Banco de España'],
            [`${n0(H.pct65['1986'])} % → ${n0(pct65H)} %`, `población de 65 años o más (1986 → ${aH}); ${n0(P.pct65['2050'])} % en 2050`, 'INE'],
            [`${n0(H.nacimientos['1976'] / 1000)} mil → ${n0(nacU / 1000)} mil`, `nacimientos al año (1976 → ${aNac})`, 'INE'],
            [`${n1(fuera['1981'])} % → ${n1(fueraU)} %`, `población nacida fuera de España (1981 → ${aFuera})`, 'INE'],
            [`${n0(vpo['1986'] / 1000)} mil → ${n0(vpoU / 1000)} mil`, `viviendas protegidas al año (1986 → ${aVpo})`, 'Ministerio de Vivienda'],
            [`${n0(term['2006'] / 1000)} mil → ${n0(ult(term)[1] / 1000)} mil`, `viviendas terminadas al año (2006 → ${ult(term)[0]})`, 'Ministerio de Vivienda'],
            [`${n0(ratioUE['2000'])} % → ${n0(ult(ratioUE)[1])} %`, `renta por habitante de España sobre la media de la UE (2000 → ${ult(ratioUE)[0]})`, 'Eurostat'],
          ]}
        />
        <dl className="cuenta">
          <div className="ok">
            <dt>Lo que casi no se mueve</dt>
            <dd>
              Los homicidios (entre 300 y 400 muertes al año desde 1980, con mucha más población), quién sufre cada tipo de violencia, o la presión
              fiscal, que sube despacio (del {n0(pf['1986'])} % al {n0(ult(pf)[1])} % del PIB en casi 40 años). El paro baja en los años buenos, pero siempre
              vuelve a niveles muy altos para Europa. Ahí no hay un disparate: hay problemas crónicos.
            </dd>
          </div>
        </dl>
      </div>

      <h3 style={{marginTop: 22}}>Lo que no se sostiene</h3>
      <div className="charts" id="fut-sostenible">
        <Mini
          id="fut-mayores"
          title="Cada vez más mayores"
          sub="% de la población (proyección del INE en discontinua)"
          series={[
            {lab: '65 años o más', c: '#C2255C', data: desde(H.pct65, 1976)},
            {lab: '65 o más, proyección', c: '#C2255C', dash: true, data: P.pct65},
            {lab: '80 años o más', c: '#7048E8', data: desde(H.pct80, 1976)},
            {lab: '80 o más, proyección', c: '#7048E8', dash: true, data: P.pct80},
          ]}
          f={pct1}
          x0={1975.5}
          yMin={0}
          hitos={[PROY]}
          note={
            <>
              <p>
                En 1986 el {pct1(H.pct65['1986'])} tenía 65 años o más; en {aH}, el {pct1(pct65H)}. El INE proyecta el {pct1(P.pct65['2050'])} en 2050: casi
                uno de cada tres. Los mayores de 80 pasan del {pct1(H.pct80['1986'])} al {pct1(P.pct80['2050'])}.
              </p>
              <p>
                Es lo más seguro de toda la página: los que tendrán 65 años en 2050 ya han nacido, y la migración o la natalidad lo mueven poco.
                Proyección del INE 2026–2076, publicada en junio de 2026.
              </p>
            </>
          }
          src={
            <>
              {L('INE, Indicadores Demográficos Básicos', INE_IDB)}; {L('INE, Proyecciones de Población 2026–2076', INE_PROY)}
            </>
          }
        />
        <Mini
          id="fut-dependencia"
          title="Mayores por cada 100 en edad de trabajar"
          sub="personas de 65 o más por cada 100 de 16 a 64 años"
          series={[
            {lab: 'Hasta hoy', c: '#E8590C', data: desde(H.dependencia, 1976)},
            {lab: 'Proyección del INE', c: '#E8590C', dash: true, data: P.dependencia},
          ]}
          f={n1}
          x0={1975.5}
          yMin={0}
          hitos={[PROY]}
          note={
            <p>
              En 1986 había {n0(H.dependencia['1986'])} personas de 65 años o más por cada 100 en edad de trabajar; en {aH}, {n0(H.dependencia[aH])}, y en 2050
              serán {n0(P.dependencia['2050'])}. Es la cuenta de fondo de las pensiones y la sanidad: menos gente trabajando por cada jubilado, aunque la
              proyección ya cuenta con que llegue mucha gente de fuera.
            </p>
          }
          src={L('INE, Indicadores Demográficos Básicos y Proyecciones 2026–2076', INE_PROY)}
        />
        <Mini
          id="fut-nacimientos"
          title="Nacen menos de los que mueren"
          sub="miles al año (proyección del INE en discontinua)"
          series={[
            {lab: 'Nacimientos', c: '#2F9E44', data: escala(desde(H.nacimientos, 1976), 1000)},
            {lab: 'Nacimientos, proyección', c: '#2F9E44', dash: true, data: escala(P.nacimientos, 1000)},
            {lab: 'Defunciones', c: '#212529', data: escala(desde(H.defunciones, 1976), 1000)},
            {lab: 'Defunciones, proyección', c: '#212529', dash: true, data: escala(P.defunciones, 1000)},
          ]}
          f={(v) => n0(v * 1000)}
          x0={1975.5}
          yMin={0}
          hitos={[PROY]}
          note={
            <p>
              Desde 2017 mueren más personas de las que nacen cada año: en {aSaldo}, {n0(-saldoU)} más. Con más mayores la diferencia crece: el INE proyecta{' '}
              {n0(-P.saldoNatural['2050'])} más muertes que nacimientos en 2050. Y eso suponiendo que la fecundidad sube un poco, de{' '}
              {fmt(H.fecundidad['2024'], 2)} hijos por mujer en 2024 a {fmt(P.fecundidad['2050'], 2)} en 2050.
            </p>
          }
          src={L('INE (Movimiento Natural de la Población y Proyecciones 2026–2076); Eurostat demo_gind', INE_PROY)}
        />
        <Mini
          id="fut-poblacion"
          title="Una población que solo crece por la inmigración"
          sub="millones de habitantes a 1 de enero"
          series={[
            {lab: 'Hasta hoy', c: '#3B5BDB', data: escala(desde(H.poblacion, 1976), 1e6)},
            {lab: 'Proyección del INE', c: '#3B5BDB', dash: true, data: escala(P.poblacion, 1e6)},
          ]}
          f={(v) => fmt(v, 1) + ' M'}
          x0={1975.5}
          hitos={[PROY]}
          note={
            <p>
              España pasa de {fmt(H.poblacion['1986'] / 1e6, 1)} millones en 1986 a {fmt(ult(H.poblacion)[1] / 1e6, 1)} hoy, y el INE proyecta{' '}
              {fmt(P.poblacion['2050'] / 1e6, 1)} en 2050. Todo ese crecimiento sale de la migración: supone que cada año llegan más de los que se van (unos{' '}
              {n0(P.saldoMigratorioSupuesto['2026'] / 1000)} mil netos en 2026 y {n0(P.saldoMigratorioSupuesto['2050'] / 1000)} mil en 2050). Si llegara
              menos gente, la población bajaría y el envejecimiento sería aún mayor.
              {eu2050 != null && ` Eurostat, que supone menos migración, proyecta ${fmt(eu2050 / 1e6, 1)} millones en 2050.`}
            </p>
          }
          src={L('INE, Proyecciones de Población 2026–2076', INE_PROY)}
        />
        <Mini
          id="fut-deuda"
          title="Deuda pública"
          sub="% del PIB (proyecciones en discontinua)"
          series={[
            {lab: 'Hasta hoy', c: '#C92A2A', data: deuda},
            {lab: 'FMI', c: '#C92A2A', dash: true, data: desde(fmi, +aDeuda + 1)},
            {lab: 'Comisión Europea, sin nuevas medidas', c: '#868E96', dash: true, data: desde(com, +aDeuda + 1)},
          ]}
          f={pct1}
          x0={1985.5}
          yMin={0}
          hitos={[{x: 2008, lab: 'Crisis de 2008'}]}
          note={
            <>
              <p>
                Junto con la vivienda, el cambio más grande de la web: la deuda pasó del {n0(deuda['1986'])} % del PIB en 1986 al {n0(deuda['2007'])} % en 2007,
                y se disparó con las crisis de 2008 y de 2020 ({n0(deuda['2020'])} % en 2020). Hoy está en el {n0(deudaU)} %. Cada crisis la sube de golpe y en
                los años buenos baja muy despacio.
              </p>
              <p>
                El FMI ({S.deuda.fmi.edicion.split(';')[0].replace(/\s*\(.*$/, '')}) la ve bajando hasta el {n0(fmi['2031'])} % en 2031. La Comisión Europea, si
                no se toman nuevas medidas, la ve bajar hasta 2028 y volver a subir al {n0(com['2036'])} % en 2036 por las pensiones y los intereses, que
                pasan del {fmt(intereses['2024'], 1)} % al {fmt(intereses['2036'], 1)} % del PIB; califica el riesgo de alto a medio plazo. AIReF, a más largo
                plazo y sin cambios de política, habla de en torno al 129 % en 2050 (cifra de sus resúmenes: no se pudo leer el documento original).
              </p>
              <p>Lo peligroso no es la cifra sola: una próxima crisis empezaría con la deuda en el 100 %, y no en el 36 % como en 2007.</p>
            </>
          }
          src={
            <>
              Banco de España; {L('FMI, World Economic Outlook', S.deuda.fmi.url)}; {L('Comisión Europea, Debt Sustainability Monitor 2025', S.deuda.comision.url)}
            </>
          }
        />
        <Mini
          id="fut-pensiones"
          title="Gasto en pensiones"
          sub="% del PIB, proyección de la Comisión Europea (Ageing Report 2024)"
          series={[{lab: 'Pensiones públicas, bruto', c: '#7048E8', dash: true, data: solo(AR.serie)}]}
          f={(v) => fmt(v, 1) + ' %'}
          x0={2021.5}
          yMin={0}
          note={
            <>
              <p>
                La Comisión Europea proyecta que el gasto en pensiones pase del {fmt(AR.serie['2022'], 1)} % del PIB en 2022 al {fmt(AR.serie['2050'], 1)} % en
                2050, su punto más alto, ya contando la reforma de 2021–2023. Son unos 4 puntos de PIB más, parecido a todo lo que hoy se gasta en
                educación (4,1 %). Incluye todas las pensiones públicas, por eso sale más que el 10,8 % de las contributivas de la pestaña Economía.
              </p>
              <p>
                Por cada pensionista habrá menos cotizantes: {fmt(soporte['2022'], 2)} en 2022, {fmt(soporte['2050'], 2)} en 2050 y {fmt(soporte['2070'], 2)} en
                2070. Hoy hay unos 2,1 afiliados por cada pensión. AIReF (2025, según sus resúmenes) proyecta algo menos, en torno al 16 % en 2050.
              </p>
            </>
          }
          src={L('Comisión Europea, 2024 Ageing Report', AR.url)}
        />
        <Mini
          id="fut-vivienda"
          title="Se construye mucho menos de lo que se necesita"
          sub="miles al año: viviendas terminadas y hogares nuevos"
          series={[
            {lab: 'Viviendas terminadas', c: '#2F9E44', data: escala(term, 1000)},
            {lab: 'Hogares nuevos', c: '#E03131', data: escala(hog, 1000)},
          ]}
          f={(v) => n0(v * 1000)}
          x0={2005.5}
          yMin={0}
          note={
            <>
              <p>
                <b>El problema, en sencillo:</b> cada año hay muchos más hogares nuevos que casas nuevas. Hogares nuevos son parejas que se independizan,
                gente que se separa, personas mayores que viven solas y familias que llegan de fuera: más de 200.000 al año. Casas nuevas se terminan unas
                90.000 o 100.000 al año, cuando en 2006 se terminaron {n0(term['2006'])}. Desde 2021, según el Banco de España, faltan unas{' '}
                {n0(S.vivienda.deficitBdE.cifra)} viviendas.
              </p>
              <p>
                <b>Qué pasa cuando faltan casas:</b> muchos buscan y hay pocas, así que suben los precios de compra y de alquiler. Los sueldos no suben igual:
                en 1987 un piso costaba {n1(anios['1987'])} años de sueldo y hoy {n1(aniosU)}. Por eso la gente se independiza tarde (a los{' '}
                {n0(VIV.edad[ult(VIV.edad as Serie)[0]])} años de media) y solo el {n1(ult(VIV.emanc as Serie)[1])} % de los jóvenes de 16 a 29 años vive fuera
                de casa de sus padres.
              </p>
              <p>
                <b>¿Y las casas vacías?</b> Hay {fmt(HAY_CASAS.censo2021.vacias / 1e6, 1)} millones (censo de 2021), pero casi la mitad (
                {n0(HAY_CASAS.censo2021.vaciasPorTamano.menos10000.vacias)} %) está en pueblos de menos de 10.000 habitantes, lejos de donde está el trabajo.
                Y la vivienda protegida, la que tiene precio limitado, casi ha desaparecido: de {n0(vpo['1986'])} al año en 1986 a {n0(vpoU)} en {aVpo}.
              </p>
            </>
          }
          src={
            <>
              {L('Ministerio de Vivienda, viviendas terminadas', S.vivienda.terminadas.urls?.[0] ?? 'https://www.mivau.gob.es')};{' '}
              {L('INE, hogares', 'https://www.ine.es/jaxiT3/Tabla.htm?t=60131')}; {L('Banco de España, Informe Anual 2025', S.vivienda.deficitBdE.url)}
            </>
          }
        />
        <Mini
          id="fut-renta"
          title="España se aleja de la renta media europea"
          sub="PIB real por habitante de España, % de la media de la UE"
          series={[{lab: 'España / UE', c: '#F59F00', data: ratioUE}]}
          f={pct1}
          x0={1999.5}
          note={
            <p>
              En 2000 la renta por habitante de España era el {pct1(ratioUE['2000'])} de la media de la UE; en {ult(ratioUE)[0]}, el {pct1(ult(ratioUE)[1])}.
              Entre 2000 y 2024 creció un 21 % en España y un 32 % en la UE. La economía crece, pero sobre todo porque hay más gente trabajando, no porque
              cada persona produzca o gane más. Es la razón de fondo de que los sueldos no sigan a la vivienda.
            </p>
          }
          src={L('Eurostat, PIB real por habitante (sdg_08_10)', pib.url)}
        />
      </div>

      <h3 style={{marginTop: 22}}>¿Vendrán crisis?</h3>
      <div className="charts" id="fut-crisis">
        <Mini
          id="fut-pib"
          title="Crecimiento de la economía"
          sub="% de crecimiento real del PIB cada año"
          series={[{lab: 'PIB', c: '#3B5BDB', data: pibCrec}]}
          bars
          f={(v) => fmt(v, 1) + ' %'}
          x0={1970.5}
          note={
            <p>
              Desde 1971 la economía cayó en {negativos.length} años: {negativos.join(', ')}. Las recesiones que fecha la Asociación Española de Economía son
              las de {(C.recesiones as any[]).map((r) => `${r.inicio.slice(0, 4)}–${r.fin.slice(0, 4)}`).join(', ')}: más o menos una cada 8 a 12 años. Desde la
              de 2020 no ha habido ninguna, y en 2025 la economía creció un {fmt(pibCrec['2025'] ?? 0, 1)} %.
            </p>
          }
          src={L('Banco Mundial (datos del INE) y Comité de Fechado del Ciclo de la AEE', 'https://www.asesec.org/CFCweb/')}
        />
        <Mini
          id="fut-paro"
          title="Paro en cada crisis"
          sub="% de la población activa, media anual"
          series={[{lab: 'Paro', c: '#E03131', data: paro}]}
          f={(v) => fmt(v, 1) + ' %'}
          x0={1969.5}
          yMin={0}
          note={
            <p>
              Cada crisis lleva el paro a niveles que en otros países no se ven: más del 20 % en 1985, en 1994 y en 2013. En 2020 subió menos porque los ERTE
              no cuentan como paro. Nadie puede decir cuándo será la próxima, pero sí qué la haría más dura: llegar con la deuda alta y con un paro que nunca
              baja del todo.
            </p>
          }
          src={L('Banco Mundial e INE (EPA)', 'https://data.worldbank.org/indicator/SL.UEM.TOTL.NE.ZS?locations=ES')}
        />
        <div className="chart" id="fut-recesiones">
          <div className="chead">
            <h3>
              Las recesiones desde 1970{' '}
              <Info titulo="Las recesiones desde 1970">
                <dl className="cuenta">
                  {(C.recesiones as any[]).map((r) => (
                    <div key={r.nombre} className="half">
                      <dt>
                        {r.nombre} ({r.inicio}–{r.fin})
                      </dt>
                      <dd>
                        {r.caidaPIB != null ? `El PIB cayó un ${fmt(-r.caidaPIB, 1)} %.` : 'Sin dato publicado de la caída del PIB.'}
                        {r.paroMax ? ` Paro máximo: ${fmt(r.paroMax.valor, 1)} % (${r.paroMax.periodo}).` : ''}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="srcl">
                  Fuente: {L('Comité de Fechado del Ciclo Económico de la AEE', 'https://www.asesec.org/CFCweb/')}; paro: INE (EPA) y Banco Mundial.
                </p>
              </Info>
            </h3>
          </div>
          <p className="note">
            {(C.recesiones as any[]).length} recesiones en 50 años: dos con las crisis del petróleo de los setenta, la de 1992–93, la de 2008–2013 en dos
            fases y la de la pandemia. La más larga, la de 2010–2013: el paro llegó al 26,9 %. La más brusca, la de 2020: el PIB cayó un 22 % en medio año,
            pero se recuperó deprisa. Pulsa (i) para verlas una a una.
          </p>
        </div>
      </div>

      <h3 style={{marginTop: 22}}>¿Y la inteligencia artificial?</h3>
      <div className="charts" id="fut-ia">
        <Barras
          id="fut-ia-expo"
          title="Empleos expuestos a la IA"
          sub="% del empleo, según cada organismo"
          series={[{lab: 'Empleo', c: '#7048E8'}]}
          filas={expo.filter((e) => e.v != null).map((e) => ({lab: e.lab, vals: [e.v!]}))}
          f={pct1}
          max={100}
          note={
            <>
              <p>
                «Expuesto» no quiere decir que se vaya a perder: quiere decir que la IA puede hacer una parte de sus tareas. Según la OCDE, el 27,4 % de los
                trabajadores en España está expuesto a la IA generativa (la media de la OCDE es el 26 %), pero solo el 5,9 % tiene un riesgo alto de
                automatización, la mitad que en la OCDE. El FMI calcula que en los países ricos el 60 % de los empleos está expuesto: en la mitad la IA
                ayudaría al trabajador y en la otra mitad podría sustituirlo.
              </p>
              {funcas && (
                <p>
                  Previsión, no dato: Funcas calcula para España una pérdida neta de unos {n0(-funcas.cifra / 1000)} mil empleos entre 2025 y 2035 (unos 2
                  millones desplazados y 1,6 millones creados).
                </p>
              )}
            </>
          }
          src={L('OCDE, FMI, OIT, BBVA Research y Funcas', 'https://www.imf.org/en/Publications/staff-discussion-notes/Issues/2024/01/14/Gen-AI-Artificial-Intelligence-and-the-Future-of-Work-542379')}
        />
        <Mini
          id="fut-ia-empresas"
          title="Empresas que usan IA"
          sub="% de las empresas de 10 o más empleados"
          series={[{lab: 'Empresas', c: '#7048E8', data: adop}]}
          bars
          f={pct1}
          x0={2022.5}
          yMin={0}
          note={
            <p>
              Del {pct1(adop['2023'])} de las empresas en 2023 al {pct1(adop['2026'])} en 2026: más del triple en tres años. El dato de 2026 no se compara del
              todo con los anteriores porque el INE cambió la clasificación de actividades.
            </p>
          }
          src={L('INE, Encuesta sobre el uso de TIC en las empresas', 'https://www.ine.es/dyngs/Prensa/ETICCE20251T2026.htm')}
        />
        <div className="chart" id="fut-ia-efectos">
          <div className="chead">
            <h3>
              Lo que se ha visto hasta ahora{' '}
              <Info titulo="Lo que se ha visto hasta ahora">
                <ul className="fut-lista">
                  {(I.efectosObservados as any[]).map((e) => (
                    <li key={e.fuente}>
                      <b>{e.fuente.split(/[,(']/)[0].trim()}</b> ({String(e.fecha).slice(0, 7)}): {e.resumen}{' '}
                      {e.url && <a href={e.url} target="_blank" rel="noopener">Fuente ↗</a>}
                    </li>
                  ))}
                </ul>
              </Info>
            </h3>
          </div>
          <p className="note">
            De momento, ni en España ni en Europa hay despidos por la IA: casi 9 de cada 10 empresas que la usan dicen que no ha cambiado su plantilla, y
            las que más la usan contratan algo más. La única señal clara viene de Estados Unidos: en los trabajos más expuestos se contrata menos a los
            jóvenes de 22 a 25 años. Pulsa (i) para ver cada estudio.
          </p>
        </div>
      </div>

      <div className="box" id="fut-lectura" style={{marginTop: 22}}>
        <h3>
          Lo que yo leo en todo esto{' '}
          <Info>
            Lectura propia a partir de las gráficas de esta página y del resto de la web. No es una predicción: es una forma de ordenar qué es casi
            seguro, qué es probable y qué no se sabe.
          </Info>
        </h3>
        <dl className="cuenta">
          <div className="ko">
            <dt>Casi seguro: un país mucho más viejo</dt>
            <dd>
              En 2050 casi uno de cada tres tendrá 65 años o más, y habrá {n0(P.dependencia['2050'])} mayores por cada 100 en edad de trabajar. Pensiones,
              sanidad y cuidados van a costar bastante más, y eso no depende de quién gobierne. La discusión de verdad es cómo se paga: más años trabajando,
              más cotizaciones, más inmigración o pensiones algo menores.
            </dd>
          </div>
          <div className="ko">
            <dt>Ya está aquí: la vivienda</dt>
            <dd>
              Es el cambio más grande y el que más se nota en la vida de la gente. Cada año se forman más del doble de hogares que casas se construyen, así
              que faltan casas (unas {n0(S.vivienda.deficitBdE.cifra / 1000)} mil desde 2021) y suben los precios y los alquileres mucho más que los sueldos:
              un piso cuesta {n1(aniosU)} años de sueldo y los jóvenes se van de casa a los 30. Las casas vacías están sobre todo en pueblos, lejos del
              trabajo. Como la población seguirá creciendo, esto solo mejora si se construye mucho más donde vive la gente, y sobre todo vivienda de precio
              limitado, que casi ha desaparecido.
            </dd>
          </div>
          <div className="half">
            <dt>Probable: la deuda complica la próxima crisis</dt>
            <dd>
              Vendrá alguna crisis, porque siempre vienen, pero no se sabe cuándo. Con la deuda en el {n0(deudaU)} % y los intereses subiendo, habrá menos
              margen para ayudar como en 2020, y es más fácil que la factura acabe en recortes o subidas de impuestos.
            </dd>
          </div>
          <div className="half">
            <dt>Probable: crecer sin ganar más</dt>
            <dd>
              La renta por habitante se aleja de la media europea desde 2000. Mientras la economía crezca porque hay más gente y no porque cada uno produzca
              más, los sueldos seguirán por detrás de la vivienda.
            </dd>
          </div>
          <div>
            <dt>No se sabe: la IA</dt>
            <dd>
              Lo que se ve hasta ahora no son despidos masivos: la mayoría de las empresas que la usan no cambian su plantilla. La señal a vigilar es otra:
              que se contrate menos a los jóvenes para los trabajos de oficina que la IA ya hace. Una cuarta parte de las grandes empresas españolas cree que
              tendrá menos plantilla en tres años. Puede ser una ola lenta más que un golpe.
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
