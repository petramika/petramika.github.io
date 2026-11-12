import type {ReactNode} from 'react';
import {fmt} from '../../lib/formato';
import Mini from '../../componentes/graficas/Mini';
import {L} from '../../componentes/enlace';
import type {Tono} from '../../componentes/Cuestiones';
import EDU from '../../datos/futuro/educacion.json';
import AUT from '../../datos/futuro/autonomias-infra.json';
import EXT from '../../datos/futuro/exterior.json';
import COB from '../../datos/sanidad/cobertura.json';
import ESP from '../../datos/sanidad/esperas.json';
import REC from '../../datos/sanidad/recursos.json';

/*
  Temas de «Lo que viene» con datos propios de esta pestaña: educación,
  sanidad, autonomías, Europa y exterior, e infraestructuras.
*/
type Serie = Record<string, number>;
export type TemaExtra = {
  id: string;
  k: string;
  tema: string;
  veredicto: string;
  tono: Tono;
  resumen: ReactNode;
  mejor: ReactNode[];
  peor: ReactNode[];
  hacer: ReactNode[];
  graficas?: ReactNode;
};
/* eslint-disable @typescript-eslint/no-explicit-any */
const D = EDU as any, A = AUT as any, X = EXT as any;
const n0 = (v: number) => fmt(v, 0);
const n1 = (v: number) => fmt(v, 1);
const pct1 = (v: number) => fmt(v, 1) + ' %';
const anios = (s: Record<string, unknown>) => Object.keys(s).filter((k) => /^\d{4}$/.test(k)).sort();
const ult = (s: Serie): [string, number] => {
  const k = anios(s).at(-1)!;
  return [k, s[k]];
};
const minDe = (s: Serie): [string, number] => anios(s).reduce<[string, number]>((m, k) => (s[k] < m[1] ? [k, s[k]] : m), ['', Infinity]);
const maxDe = (s: Serie): [string, number] => anios(s).reduce<[string, number]>((m, k) => (s[k] > m[1] ? [k, s[k]] : m), ['', -Infinity]);
const escala = (s: Serie, d: number): Serie => Object.fromEntries(Object.entries(s).map(([y, v]) => [y, v / d]));
const solo = (o: Record<string, unknown>): Serie =>
  Object.fromEntries(Object.entries(o).filter(([y, v]) => /^\d{4}$/.test(y) && typeof v === 'number')) as Serie;
const pre = (sub: string, xs: ReactNode[]): ReactNode[] =>
  xs.map((x) => (
    <>
      <strong>{sub}:</strong> {x}
    </>
  ));
const EUROSTAT = 'https://ec.europa.eu/eurostat/databrowser/';

export function masTemas(): TemaExtra[] {
  // Educación
  const ab = D.abandono, sup = D.superiores2534, bas = D.basica2534, ninis = D.ninis;
  const pisaM = D.pisa.matematicas, pisaL = D.pisa.lectura;
  const gEdu = D.gastoPctPIB;
  const fp = solo(D.alumnosFP.total), uni = solo(D.alumnosUniversidad.grado_y_1er2oCiclo);
  const [aFp, fpU] = ult(fp), [aFpMin, fpMin] = minDe(fp);
  const pisaMSerie = Object.fromEntries(anios(pisaM.ES).filter((y) => +y >= 2003).map((y) => [y, pisaM.ES[y]]));
  // Sanidad
  const C = (COB as any).cobertura as Record<string, any>;
  const olas = anios(C).filter((y) => C[y].publicaYPrivada != null);
  const privado: Serie = Object.fromEntries(olas.map((y) => [y, C[y].publicaYPrivada + (C[y].soloPrivada ?? 0)]));
  const E = ESP as any, R = REC as any;
  const dic = (o: Record<string, any>, c: string): Serie =>
    Object.fromEntries(Object.entries(o).filter(([k, v]) => k.endsWith('-12') && v?.[c] != null).map(([k, v]) => [k.slice(0, 4), v[c]]));
  const quir = dic(E.quirurgica, 'pacientes'), quirDias = dic(E.quirurgica, 'dias');
  const sat = E.barometro.satisfaccion as Serie;
  const enf = R.ue.enfermeros100k;
  // Autonomías
  const ratio: Serie = Object.fromEntries(Object.entries(A.pibPcCCAA as Record<string, any>).map(([y, v]) => [y, v.ratio]));
  const paroMax: Serie = Object.fromEntries(Object.entries(A.paroCCAA as Record<string, any>).map(([y, v]) => [y, v.max.valor]));
  const paroMin: Serie = Object.fromEntries(Object.entries(A.paroCCAA as Record<string, any>).map(([y, v]) => [y, v.min.valor]));
  const pibU = A.pibPcCCAA[ult(ratio)[0]];
  const deudaCA = A.deudaCCAA as Serie, [aDCA, dcaU] = ult(deudaCA), [aDCAMax, dcaMax] = maxDe(deudaCA);
  const gastoCA = A.gastoCCAAPct as Serie, gastoCen = A.gastoCentralPct as Serie;
  // Europa y exterior
  const saldo = X.saldoUE.pctRNB as Serie, ngeu = X.saldoUE.ngeuPctRNB as Serie;
  const [aSaldoMax, saldoMax] = maxDe(saldo), [aSaldo, saldoU] = ult(saldo);
  const expo = X.exportacionesPctPIB as Serie, cc = X.cuentaCorrientePctPIB as Serie;
  const aod = X.aodPctRNB as Serie, [aAodMax, aodMax] = maxDe(aod);
  const def = X.defensaPctPIB as Serie, [aDefMin, defMin] = minDe(def), [aDef, defU] = ult(def);
  const mrrTotal = Object.values(X.saldoUE.mrr as Serie).reduce((t, v) => t + v, 0);
  // Infraestructuras
  const ave = A.aveKm as Serie, auto = A.autoviasKm as Serie, inv = A.inversionPublica;
  const [aInvMax, invMax] = maxDe(inv.ES), [aInvMin, invMin] = minDe(desdeAnio(inv.ES, 2010));
  const aereo = A.pasajerosAereosMill as Serie;

  return [
    {
      id: 'educacion',
      k: 'edu',
      tema: 'Educación',
      veredicto: 'Mixto',
      tono: 'matiz',
      resumen: (
        <>
          Uno de los cambios más grandes y más buenos: el abandono escolar ha caído del {n0(ab.ES['1992'])} % al {n1(ult(ab.ES)[1])} % y la mitad de los jóvenes
          tiene estudios superiores. Pero sigue habiendo muchos jóvenes con solo la ESO, pocos en medio, y en PISA España no mejora.
        </>
      ),
      mejor: [
        <>Abandono escolar (18 a 24 años): del {n1(ab.ES['1992'])} % en 1992 al {n1(ult(ab.ES)[1])} % en {ult(ab.ES)[0]}; la UE está en el {n1(ult(ab.EU27)[1])} %.</>,
        <>El {n1(ult(sup.ES)[1])} % de los jóvenes de 25 a 34 años tiene estudios superiores, más que la media de la UE ({n1(ult(sup.EU27)[1])} %).</>,
        <>La FP crece: de {n0(fpMin / 1000)} mil alumnos en {aFpMin} a {fmt(fpU / 1e6, 2)} millones en {aFp}–{+aFp + 1 - 2000}.</>,
      ],
      peor: [
        <>El {n1(ult(bas.ES)[1])} % de los jóvenes de 25 a 34 solo tiene la ESO o menos, casi el doble que en la UE ({n1(ult(bas.EU27)[1])} %).</>,
        <>PISA matemáticas: {n0(pisaM.ES['2022'])} puntos en 2022, el peor resultado de España (en 2003, {n0(pisaM.ES['2003'])}); la media de la OCDE también cayó.</>,
        <>El gasto público en educación está en el {n1(ult(gEdu.ES)[1])} % del PIB, por debajo de la UE ({n1(ult(gEdu.EU27)[1])} %), y apenas ha cambiado desde 1995.</>,
      ],
      hacer: [
        <>
          <strong>Más FP y mejor orientada:</strong> que tenga prestigio y salida, con prácticas en empresas, para los que hoy se quedan con la ESO.
        </>,
        <>
          <strong>Reforzar la base:</strong> matemáticas y lectura en primaria, y apoyo temprano a quien se queda atrás, antes de que abandone.
        </>,
        <>
          <strong>Profesorado:</strong> mejor formación y carrera; la ratio de alumnos por profesor ya es menor que en la UE, así que no es solo cuestión de
          número.
        </>,
      ],
      graficas: (
        <>
          <Mini
            id="fut-edu-abandono"
            title="Abandono escolar temprano"
            sub="% de jóvenes de 18 a 24 años que dejan los estudios sin terminar secundaria postobligatoria"
            series={[
              {lab: 'España', c: '#3B5BDB', data: ab.ES},
              {lab: 'Media de la UE', c: '#868E96', dash: true, data: ab.EU27},
            ]}
            f={pct1}
            x0={1991.5}
            yMin={0}
            note={<p>Es el indicador que más ha mejorado de toda la web: del {n1(ab.ES['1992'])} % al {n1(ult(ab.ES)[1])} %.</p>}
            src={L('Eurostat (edat_lfse_14) e INE (EPA)', EUROSTAT)}
          />
          <Mini
            id="fut-edu-estudios"
            title="Qué estudios tienen los jóvenes"
            sub="% de las personas de 25 a 34 años"
            series={[
              {lab: 'Estudios superiores, España', c: '#2F9E44', data: sup.ES},
              {lab: 'Estudios superiores, UE', c: '#2F9E44', dash: true, data: sup.EU27},
              {lab: 'Solo la ESO o menos, España', c: '#C92A2A', data: bas.ES},
              {lab: 'Solo la ESO o menos, UE', c: '#C92A2A', dash: true, data: bas.EU27},
            ]}
            f={pct1}
            x0={1991.5}
            yMin={0}
            note={
              <p>
                España tiene más jóvenes con estudios superiores que la media de la UE, pero también muchos más con solo la ESO: le faltan los de en medio
                (bachillerato y FP de grado medio).
              </p>
            }
            src={L('Eurostat (edat_lfse_03)', EUROSTAT)}
          />
          <Mini
            id="fut-edu-pisa"
            title="PISA"
            sub="puntos en matemáticas y lectura de los alumnos de 15 años"
            series={[
              {lab: 'Matemáticas, España', c: '#7048E8', data: pisaMSerie},
              {lab: 'Matemáticas, OCDE', c: '#7048E8', dash: true, data: Object.fromEntries(anios(pisaM.OCDE).filter((y) => +y >= 2003).map((y) => [y, pisaM.OCDE[y]]))},
              {lab: 'Lectura, España', c: '#E8590C', data: solo(pisaL.ES)},
              {lab: 'Lectura, OCDE', c: '#E8590C', dash: true, data: solo(pisaL.OCDE)},
            ]}
            f={(v) => n0(v)}
            x0={1999.5}
            yMin={440}
            note={
              <p>
                Matemáticas solo se compara desde 2003. La OCDE no publicó la lectura de España en 2018. En 2022, España saca {n0(pisaM.ES['2022'])} en matemáticas y{' '}
                {n0(pisaL.ES['2022'])} en lectura, casi igual que la media de la OCDE, que también ha bajado.
              </p>
            }
            src={L('OCDE, PISA', 'https://www.oecd.org/pisa/')}
          />
          <Mini
            id="fut-edu-alumnos"
            title="Alumnos de FP y de universidad"
            sub="miles de alumnos cada curso"
            series={[
              {lab: 'Formación profesional', c: '#F59F00', data: escala(fp, 1000)},
              {lab: 'Universidad (grado)', c: '#3B5BDB', data: escala(uni, 1000)},
            ]}
            f={(v) => n0(v * 1000)}
            x0={1984.5}
            yMin={0}
            note={<p>Cada año es el curso que empieza ese año (2025 = 2025–26, avance). El mínimo de la FP en 2000 coincide con el cambio al sistema actual.</p>}
            src={L('Ministerio de Educación y Ministerio de Ciencia (estadísticas de alumnado)', 'https://www.educacionfpydeportes.gob.es/servicios-al-ciudadano/estadisticas.html')}
          />
        </>
      ),
    },
    {
      id: 'sanidad',
      k: 'san',
      tema: 'Sanidad',
      veredicto: 'Va a peor',
      tono: 'falso',
      resumen: (
        <>
          Las listas de espera se han más que duplicado, la satisfacción está en su punto más bajo y uno de cada cuatro ya paga un seguro privado. Con más mayores,
          la presión irá a más. Más detalle en la pestaña Sanidad.
        </>
      ),
      mejor: [
        <>Se vive más que casi en ningún país: 84 años de esperanza de vida.</>,
        <>Las plazas para formar médicos especialistas (MIR) han subido un 40 % desde 2010.</>,
      ],
      peor: [
        <>De {n0(quir['2005'])} personas esperando una operación en 2005 a {n0(ult(quir)[1])} en {ult(quir)[0]}, y de {n0(quirDias['2005'])} a {n0(ult(quirDias)[1])} días de media.</>,
        <>La satisfacción con la sanidad pública ha bajado a {fmt(ult(sat)[1], 2)} sobre 10, la más baja de la serie.</>,
        <>Con seguro privado, del {n1(privado[olas[0]])} % en {olas[0]} al {n1(ult(privado)[1])} % en {ult(privado)[0]}.</>,
      ],
      hacer: [
        <>Más enfermeras y médicos de familia: España tiene {n0(ult(enf.ES)[1])} enfermeras por 100.000 habitantes y Alemania {n0(ult(enf.DE)[1])}.</>,
        <>Condiciones para que los médicos se queden en la pública y en los pueblos, porque muchos se jubilan pronto.</>,
        <>Usar mejor lo que hay (quirófanos por la tarde, consultas por teléfono y en línea) además de gastar más, y cuidados en casa para los mayores.</>,
      ],
      graficas: (
        <>
          <Mini
            id="fut-san-privado"
            title="Con seguro privado"
            sub="% de la población, según cada Encuesta de Salud"
            series={[{lab: 'Con seguro privado', c: '#F59F00', data: privado}]}
            f={pct1}
            x0={2002.5}
            yMin={0}
            note={<p>Casi siempre además de la pública. Las encuestas de 2014 y 2020 solo cuentan a los mayores de 15 años.</p>}
            src={L('Ministerio de Sanidad e INE, Encuestas de Salud', 'https://www.sanidad.gob.es/estadEstudios/estadisticas/encuestaNacional/home.htm')}
          />
          <Mini
            id="fut-san-lista"
            title="Esperando una operación"
            sub="miles de personas, cada diciembre"
            series={[{lab: 'Pacientes', c: '#C92A2A', data: escala(quir, 1000)}]}
            f={(v) => n0(v * 1000)}
            x0={2002.5}
            yMin={0}
            note={<p>En diciembre de 2018 Andalucía cambió la forma de contar.</p>}
            src={L('Ministerio de Sanidad, SISLE', 'https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/listaEspera.htm')}
          />
        </>
      ),
    },
    {
      id: 'autonomias',
      k: 'aut',
      tema: 'Autonomías',
      veredicto: 'Mixto',
      tono: 'matiz',
      resumen: (
        <>
          Las diferencias entre comunidades se acortan, pero despacio: la más rica sigue teniendo casi el doble de renta por habitante que la más pobre. Las
          comunidades gastan ya más de una cuarta parte de todo el dinero público y su deuda se ha multiplicado por cuatro desde 2007.
        </>
      ),
      mejor: [
        <>
          La comunidad más rica tenía {fmt(ratio['2000'], 2)} veces la renta por habitante de la más pobre en 2000; en {ult(ratio)[0]}, {fmt(ult(ratio)[1], 2)} (
          {pibU.max.ccaa.split(',')[0]} y {pibU.min.ccaa}).
        </>,
        <>El paro baja en todas: en {ult(paroMax)[0]}, del {n1(ult(paroMin)[1])} % al {n1(ult(paroMax)[1])} %, frente al {n1(paroMin['2013'])} %–{n1(paroMax['2013'])} % de 2013.</>,
      ],
      peor: [
        <>La deuda de las comunidades ha pasado del {n1(deudaCA['2007'])} % del PIB en 2007 al {n1(dcaU)} % en {aDCA} (máximo, {n1(dcaMax)} % en {aDCAMax}).</>,
        <>La comunidad con más paro sigue teniendo el doble que la que menos.</>,
      ],
      hacer: [
        <>Un nuevo sistema de financiación autonómica: el actual debía revisarse en 2014 y sigue sin cambiarse.</>,
        <>Que cada comunidad responda de lo que gasta y recauda, y que se pueda comparar qué funciona en cada una.</>,
        <>Más coordinación en lo que no entiende de fronteras: listas de espera, transporte, agua.</>,
      ],
      graficas: (
        <>
          <Mini
            id="fut-aut-renta"
            title="Distancia entre la comunidad más rica y la más pobre"
            sub="veces la renta por habitante de la más pobre (cálculo propio)"
            series={[{lab: 'Más rica / más pobre', c: '#7048E8', data: ratio}]}
            f={(v) => fmt(v, 2)}
            x0={1999.5}
            yMin={1}
            note={<p>PIB por habitante de cada comunidad (INE). Se dejan fuera Ceuta y Melilla.</p>}
            src={L('INE, Contabilidad Regional de España', 'https://www.ine.es/jaxiT3/Tabla.htm?t=82285')}
          />
          <Mini
            id="fut-aut-paro"
            title="Paro en la comunidad con más y con menos"
            sub="% de la población activa"
            series={[
              {lab: 'La que más', c: '#C92A2A', data: paroMax},
              {lab: 'La que menos', c: '#2F9E44', data: paroMin},
            ]}
            f={pct1}
            x0={2001.5}
            yMin={0}
            src={L('INE, Encuesta de Población Activa', 'https://www.ine.es/jaxiT3/Tabla.htm?t=66055')}
          />
          <Mini
            id="fut-aut-deuda"
            title="Deuda y gasto de las comunidades"
            sub="% del PIB (deuda) y % del gasto público total (gasto)"
            series={[
              {lab: 'Deuda de las comunidades, % del PIB', c: '#C92A2A', data: deudaCA},
              {lab: 'Gasto de las comunidades, % del total', c: '#3B5BDB', data: gastoCA},
              {lab: 'Gasto del Estado central, % del total', c: '#868E96', dash: true, data: gastoCen},
            ]}
            f={pct1}
            x0={1994.5}
            yMin={0}
            note={<p>El salto del gasto de las comunidades en 2002 es el traspaso de la sanidad. Gasto sin consolidar (cálculo propio con Eurostat).</p>}
            src={L('Banco de España y Eurostat (gov_10q_ggdebt, gov_10a_main)', EUROSTAT)}
          />
        </>
      ),
    },
    {
      id: 'exterior',
      k: 'eur',
      tema: 'Europa y exterior',
      veredicto: 'Mixto',
      tono: 'matiz',
      resumen: (
        <>
          España exporta el doble que en 1986 y ya vende al exterior más de lo que compra. De recibir mucho dinero europeo ha pasado a aportar más de lo que
          recibe, salvo los fondos de recuperación. Lo que viene es gastar más en defensa sin descuidar lo demás.
        </>
      ),
      mejor: [
        <>Las exportaciones pasan del {n1(expo['1986'])} % al {n1(ult(expo)[1])} % del PIB, y la cuenta con el exterior está en positivo ({n1(ult(cc)[1])} %, frente al {n1(cc['2007'])} % de 2007).</>,
        <>Fondos europeos de recuperación: unos {n0(mrrTotal / 1000)} mil millones de euros en ayudas entre 2021 y 2025.</>,
      ],
      peor: [
        <>Lo que España recibe de la UE menos lo que aporta: del {n1(saldoMax)} % de la renta en {aSaldoMax} (el máximo) al {n1(saldoU)} % en {aSaldo}, sin contar los fondos de recuperación.</>,
        <>Ayuda al desarrollo: el {fmt(ult(aod)[1], 2)} % de la renta (máximo, {fmt(aodMax, 2)} % en {aAodMax}), lejos del 0,7 % prometido.</>,
        <>Defensa: del {n1(defMin)} % del PIB en {aDefMin} al {n1(defU)} % en {aDef}, y la OTAN pide llegar al 3,5 %.</>,
      ],
      hacer: [
        <>Usar bien los fondos europeos que quedan: proyectos que sigan dando fruto cuando se acaben.</>,
        <>Defensa: si hay que gastar más, que sea en común con Europa y sin quitarlo de sanidad o educación.</>,
        <>Cumplir poco a poco lo prometido en ayuda al desarrollo, que también reduce la presión migratoria.</>,
      ],
      graficas: (
        <>
          <Mini
            id="fut-ext-ue"
            title="Lo que España recibe de la UE menos lo que aporta"
            sub="% de la renta nacional bruta"
            series={[
              {lab: 'Saldo con el presupuesto de la UE', c: '#3B5BDB', data: saldo},
              {lab: 'Fondos de recuperación (aparte)', c: '#F59F00', data: ngeu},
            ]}
            bars
            f={(v) => fmt(v, 2) + ' %'}
            x0={1985.5}
            note={
              <p>
                Gasto de la UE en España menos las aportaciones de España (cálculo propio con datos de la Comisión Europea; antes de 1999, en ecus). Los fondos de
                recuperación (NextGenerationEU) van aparte.
              </p>
            }
            src={L('Comisión Europea, EU spending and revenue', 'https://commission.europa.eu/strategy-and-policy/eu-budget/long-term-eu-budget/2021-2027/spending-and-revenue_en')}
          />
          <Mini
            id="fut-ext-comercio"
            title="Exportaciones y cuenta con el exterior"
            sub="% del PIB"
            series={[
              {lab: 'Exportaciones', c: '#2F9E44', data: expo},
              {lab: 'Cuenta corriente (lo que entra menos lo que sale)', c: '#7048E8', data: cc},
            ]}
            f={pct1}
            x0={1985.5}
            src={L('Banco Mundial', 'https://data.worldbank.org/country/spain')}
          />
          <Mini
            id="fut-ext-defensa"
            title="Gasto en defensa"
            sub="% del PIB (OTAN)"
            series={[{lab: 'Defensa', c: '#495057', data: def}]}
            f={(v) => fmt(v, 2) + ' %'}
            x0={1985.5}
            yMin={0}
            note={
              <p>
                Desde 2014, con la nueva definición de la OTAN; 2025 y 2026 son estimaciones. El compromiso era llegar al 2 % en 2024; en 2025 la OTAN acordó el 3,5 %
                más un 1,5 % en seguridad.
              </p>
            }
            src={L('OTAN, Defence expenditure of NATO countries', 'https://www.nato.int/cps/en/natohq/topics_49198.htm')}
          />
        </>
      ),
    },
    {
      id: 'infraestructuras',
      k: 'infra',
      tema: 'Infraestructuras',
      veredicto: 'Mixto',
      tono: 'matiz',
      resumen: (
        <>
          España construyó en 40 años una de las mayores redes de autovías y de alta velocidad de Europa. Pero desde 2010 invierte mucho menos, por debajo de la
          media europea, y mantener lo construido también cuesta.
        </>
      ),
      mejor: [
        <>Alta velocidad: de {n0(ave['1992'])} km en 1992 a {n0(ult(ave)[1])} km en {ult(ave)[0]}. Autopistas y autovías: de {n0(auto['1986'])} km en 1986 a {n0(ult(auto)[1])} km.</>,
        <>Pasajeros en avión: de {n0(aereo['1993'])} millones en 1993 a {n0(ult(aereo)[1])} millones en {ult(aereo)[0]}.</>,
      ],
      peor: [
        <>
          La inversión pública cayó del {n1(invMax)} % del PIB en {aInvMax} al {n1(invMin)} % en {aInvMin}; en {ult(inv.ES)[0]} está en el {n1(ult(inv.ES)[1])} %, por
          debajo de la UE ({n1(ult(inv.EU27)[1])} %).
        </>,
        <>Se invirtió mucho en grandes obras y menos en trenes de cercanías, agua y mantenimiento, que es lo que usa la gente cada día.</>,
      ],
      hacer: [
        <>Mantener lo que ya hay antes de construir más.</>,
        <>Invertir en lo que se usa a diario: cercanías, autobús, agua y redes eléctricas.</>,
        <>Planes que duren más de una legislatura, para no invertir mucho en los años buenos y nada en los malos.</>,
      ],
      graficas: (
        <>
          <Mini
            id="fut-infra-red"
            title="Autovías y alta velocidad"
            sub="kilómetros en servicio"
            series={[
              {lab: 'Autopistas y autovías', c: '#495057', data: auto},
              {lab: 'Alta velocidad ferroviaria', c: '#C92A2A', data: ave},
            ]}
            f={(v) => n0(v) + ' km'}
            x0={1985.5}
            yMin={0}
            note={<p>Alta velocidad: líneas nuevas y adaptadas (Comisión Europea, datos de la UIC). Autovías: Eurostat.</p>}
            src={L('Eurostat (road_if_motorwa) y Comisión Europea, Statistical Pocketbook', EUROSTAT)}
          />
          <Mini
            id="fut-infra-inversion"
            title="Inversión pública"
            sub="% del PIB"
            series={[
              {lab: 'España', c: '#3B5BDB', data: inv.ES},
              {lab: 'Media de la UE', c: '#868E96', dash: true, data: inv.EU27},
            ]}
            f={pct1}
            x0={1994.5}
            yMin={0}
            note={<p>Formación bruta de capital de las administraciones públicas: carreteras, trenes, hospitales, colegios, equipos.</p>}
            src={L('Eurostat (gov_10a_main, P51G)', EUROSTAT)}
          />
        </>
      ),
    },
  ];
}

function desdeAnio(s: Serie, a: number): Serie {
  return Object.fromEntries(Object.entries(s).filter(([y]) => +y >= a));
}

export {pre};
