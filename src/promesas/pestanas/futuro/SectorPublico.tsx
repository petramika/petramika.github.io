import type {ReactNode} from 'react';
import {fmt} from '../../lib/formato';
import Mini from '../../componentes/graficas/Mini';
import {L} from '../../componentes/enlace';
import SP from '../../datos/futuro/sector-publico.json';

type Serie = Record<string, number>;

const n0 = (v: number) => fmt(v, 0);
const n1 = (v: number) => fmt(v, 1);
const pct1 = (v: number) => `${n1(v)} %`;
const ult = (s: Serie): [string, number] => {
  const a = Object.keys(s).sort().at(-1)!;
  return [a, s[a]];
};
const miles = (s: Serie): Serie => Object.fromEntries(Object.entries(s).map(([a, v]) => [a, v / 1000]));

const E = SP.empleo_pct.paises as Record<string, Serie>;
const POR1000 = SP.empleo_pct.por_1000 as Record<string, Serie>;
const ES = SP.empleo_es.pct as Serie;
const R = SP.remuneracion.paises as Record<string, Serie>;
const ADM = SP.por_administracion.data as Record<string, Serie>;
const MIN = SP.ministros.es as Serie;
const OTROS = SP.ministros.otros as Record<string, number>;
const ALTOS = SP.altos_cargos.altos as Serie;
const ASES = SP.altos_cargos.asesores as Serie;
const C = SP.concejales;

export function sectorPublico(): {mejor: ReactNode[]; peor: ReactNode[]; hacer: ReactNode[]; graficas: ReactNode} {
  const [aE, eES] = ult(E.ES), [aCH, eCH] = ult(E.CH), [, eOCDE] = ult(E.OCDE);
  const [aP, pES] = ult(POR1000.ES), [aPCH, pCH] = ult(POR1000.CH);
  const [aR, rES] = ult(R.ES), [, rUE] = ult(R.UE27), [, rCH] = ult(R.CH), [, rDE] = ult(R.DE);
  const [aAdm, total] = ult(ADM.Total);
  const educSanidad = (ADM.CCAA[aAdm] + ADM.Universidades[aAdm]) / total;
  const minRajoy = MIN['2013'];
  const [aAl, altosU] = ult(ALTOS), [aAs, asesU] = ult(ASES);
  const sube = (a: number, b: number) => n0((b / a - 1) * 100);

  const mejor = [
    <>
      Empleados públicos: el {n1(eES)} % de los que trabajan ({aE}), por debajo de la media de la OCDE ({n1(eOCDE)} %) y de Francia ({n1(E.FR[aE])} %) o
      Suecia ({n1(E.SE[aE])} %).
    </>,
    <>
      Frente a Suiza: en % del empleo España tiene más ({n1(eES)} % frente a {n1(eCH)} % en {aCH}), pero por habitante es casi lo mismo: {n0(pES)} por cada
      1.000 en {aP} y {n0(pCH)} en Suiza en {aPCH}. La diferencia es que en Suiza trabaja más gente.
    </>,
    <>
      Sueldos públicos: el {n1(rES)} % del PIB ({aR}), en la media de la UE ({n1(rUE)} %). Suiza gasta el {n1(rCH)} % y Alemania el {n1(rDE)} %.
    </>,
    <>
      Concejales: unos {n0(C.ES / 1000)} mil, {n0(C.ES_100k)} por cada 100.000 habitantes; Italia tiene {n0(C.IT_100k)} y Francia {n0(C.FR_100k)}, con{' '}
      {n0(C.municipios.FR / 1000)} mil municipios frente a {n0(C.municipios.ES / 1000)} mil.
    </>,
  ];
  const peor = [
    <>
      Ministerios: {OTROS.ES_mismo_criterio} desde 2020, frente a {n0(minRajoy)} con Rajoy. Suiza tiene {OTROS.CH}; Alemania, Italia y Portugal, {OTROS.DE};
      Francia, {OTROS.FR}. De los países comparados, solo Suecia ({OTROS.SE}) y Dinamarca ({OTROS.DK}) tienen más.
    </>,
    <>
      Altos cargos del Estado: de {n0(ALTOS['2015'])} en 2015 a {n0(altosU)} en {aAl} (+{sube(ALTOS['2015'], altosU)} %). Asesores de los ministerios: de{' '}
      {n0(ASES['2015'])} a {n0(asesU)} en {aAs} (+{sube(ASES['2015'], asesU)} %).
    </>,
  ];
  const hacer = [
    <>
      Separar las dos cosas: el {n0(educSanidad * 100)} % de los {fmt(total / 1e6, 2)} millones de empleados públicos trabaja en las comunidades y universidades,
      sobre todo en colegios y hospitales. Recortar ahí es tener peor sanidad y educación.
    </>,
    <>Donde sí hay margen es en lo que decide cada Gobierno: número de ministerios, altos cargos y asesores. Se podría fijar un límite por ley; en Suiza la Constitución fija 7.</>,
    <>Medir qué hace cada organismo, digitalizar trámites y cubrir las jubilaciones donde hace falta gente (sanidad, educación) y no donde la tecnología ya hace el trabajo.</>,
  ];

  const graficas = (
    <>
      <Mini
        id="fut-inst-empleo"
        title="Empleados públicos, España y otros países"
        sub="% del empleo total en las administraciones públicas"
        series={[
          {lab: 'España', c: '#3B5BDB', data: E.ES},
          {lab: 'Suiza', c: '#C92A2A', data: E.CH},
          {lab: 'Alemania', c: '#868E96', data: E.DE},
          {lab: 'Francia', c: '#F08C00', data: E.FR},
          {lab: 'Suecia', c: '#2F9E44', data: E.SE},
          {lab: 'Media de la OCDE', c: '#495057', dash: true, data: E.OCDE},
        ]}
        f={pct1}
        x0={2006.5}
        yMin={0}
        note={
          <p>
            Solo administraciones (Estado, comunidades, ayuntamientos y Seguridad Social), sin empresas públicas. Suiza no tiene datos de 2009 y 2010, y el salto entre
            2008 y 2011 puede ser un cambio de método. Por cada 1.000 habitantes: España {n0(pES)} ({aP}), Suiza {n0(pCH)} ({aPCH}), Alemania{' '}
            {n0(POR1000.DE[aP])}, Francia {n0(POR1000.FR[aP])}, Suecia {n0(POR1000.SE[aP])}.
          </p>
        }
        src={L(SP.empleo_pct.fuente, SP.empleo_pct.url)}
      />
      <Mini
        id="fut-inst-empleo-es"
        title="Empleados públicos en España desde 1977"
        sub="% de los que trabajan"
        series={[{lab: 'Asalariados del sector público', c: '#3B5BDB', data: ES}]}
        f={pct1}
        x0={1976.5}
        yMin={0}
        note={
          <p>
            Incluye empresas públicas, por eso sale algo más alto que la comparación con otros países. Hay cambios de método en 1987, 1996 y 2002. En{' '}
            {ult(SP.empleo_es.miles as Serie)[0]}, {fmt(ult(SP.empleo_es.miles as Serie)[1] / 1000, 2)} millones de personas.
          </p>
        }
        src={L(SP.empleo_es.fuente, SP.empleo_es.url)}
      />
      <Mini
        id="fut-inst-admin"
        title="Dónde trabajan los empleados públicos"
        sub="miles de personas, a 1 de enero"
        series={[
          {lab: 'Comunidades autónomas', c: '#3B5BDB', data: miles(ADM.CCAA)},
          {lab: 'Ayuntamientos y diputaciones', c: '#2F9E44', data: miles(ADM['Entidades locales'])},
          {lab: 'Estado', c: '#C92A2A', data: miles(ADM.Estado)},
          {lab: 'Universidades', c: '#F08C00', data: miles(ADM.Universidades)},
        ]}
        f={(v) => n0(v)}
        x0={2005.5}
        yMin={0}
        hitos={[{x: 2023, lab: 'método'}]}
        note={
          <p>
            El Estado incluye Fuerzas Armadas, Policía Nacional y Guardia Civil; las comunidades, profesores y sanitarios. Desde 2023 se cuentan todos los contratos
            temporales y se deja fuera a jueces y fiscales, lo que sube el total en unas 250.000 personas de golpe. En 2012 las universidades también cambian de método.
          </p>
        }
        src={L('Función Pública, Boletín Estadístico del Personal', SP.por_administracion.url)}
      />
      <Mini
        id="fut-inst-sueldos"
        title="Lo que se paga en sueldos públicos"
        sub="% del PIB"
        series={[
          {lab: 'España', c: '#3B5BDB', data: R.ES},
          {lab: 'Media de la UE', c: '#495057', dash: true, data: R.UE27},
          {lab: 'Suiza', c: '#C92A2A', data: R.CH},
          {lab: 'Alemania', c: '#868E96', data: R.DE},
          {lab: 'Francia', c: '#F08C00', data: R.FR},
          {lab: 'Dinamarca', c: '#2F9E44', data: R.DK},
        ]}
        f={pct1}
        x0={1994.5}
        yMin={0}
        src={L(SP.remuneracion.fuente, SP.remuneracion.url)}
      />
      <Mini
        id="fut-inst-ministros"
        title="Ministros en el Gobierno"
        sub="miembros del Consejo de Ministros a final de cada año"
        series={[{lab: 'España', c: '#3B5BDB', data: MIN}]}
        f={(v) => n0(v)}
        x0={1976.5}
        yMin={0}
        note={
          <p>
            Cuenta vicepresidentes y ministros sin cartera, sin contar al presidente. Ministros al frente de un ministerio a 1 de enero de 2026: España{' '}
            {OTROS.ES_mismo_criterio}, Dinamarca {OTROS.DK}, Suecia {OTROS.SE}, Francia {OTROS.FR}, Reino Unido {OTROS.UK}, Alemania {OTROS.DE}, Italia {OTROS.IT},
            Portugal {OTROS.PT}, Países Bajos {OTROS.NL} y Suiza {OTROS.CH} (ONU Mujeres y Unión Interparlamentaria).
          </p>
        }
        src={L(SP.ministros.fuente, SP.ministros.url)}
      />
      <Mini
        id="fut-inst-altos"
        title="Altos cargos y asesores del Estado"
        sub="personas"
        series={[
          {lab: 'Altos cargos (diciembre)', c: '#C92A2A', data: ALTOS},
          {lab: 'Asesores de los ministerios (enero)', c: '#F08C00', data: ASES},
        ]}
        f={(v) => n0(v)}
        x0={2014.5}
        yMin={0}
        note={
          <p>
            Altos cargos: ministros, secretarios de Estado, directores generales, delegados del Gobierno y quienes dirigen organismos del Estado; no incluye comunidades
            ni ayuntamientos. Falta 2018; {aAl} es mayo. Asesores: personal eventual de confianza de los ministerios, sobre todo en Presidencia.
          </p>
        }
        src={L(SP.altos_cargos.fuente, SP.altos_cargos.url)}
      />
    </>
  );

  return {mejor, peor, hacer, graficas};
}
