import {T} from '../../../comun/Glosario';
import Info from '../../componentes/Info';
import Grafico from '../../componentes/graficas/Grafico';
import Mini from '../../componentes/graficas/Mini';
import {ACC, EMPLEO, ENV, LEGS, METRICS, VIOL} from '../../datos';
import {fmt, yr} from '../../lib/formato';
import {L} from '../../componentes/enlace';
import {anios, aproximado, entero, lista, maximo, suma, ultimo} from './ayudas';

/*
  "Cuarenta años en gráficos": los indicadores generales, empleo por sexo,
  violencia y accidentes laborales, y medio ambiente (renderCharts,
  genderChart, safetyCharts y envCharts en el original).

  Las cifras de las notas se leen de los JSON (ultimo dato, maximo...). Lo
  que no esta en los JSON va escrito a mano con su año, y lo que hay que
  revisar en cada actualizacion esta junto en A_MANO.
*/
const n0 = (v: number) => fmt(v, 0);

/*
  A mano: datos que no estan en los JSON o que dicen hasta cuando llega un
  año a medias. Revisar al actualizar los datos.
*/
const A_MANO = {
  // EPA: el ultimo año es la media de los trimestres publicados
  empleoParcial: {anio: '2026', txt: 'media de los tres primeros trimestres'},
  // Ministerio de Igualdad: mujMuertas2026 llega hasta este dia; total desde 2003 a esa fecha
  violenciaHasta: '30 de octubre',
  violenciaIgualdadTotal: '1.385 hasta octubre de 2026',
  // CGPJ: desglose del resto de muertes en la pareja (suma 121), de 2009 a 2025
  otrasMuertesDesglose: {hasta: '2025', txt: '103 hombres asesinados por una mujer, 14 hombres por un hombre y 4 mujeres por una mujer'},
  // CGPJ: denuncias por violencia de genero
  denuncias: 'los juzgados recibieron 204.342 denuncias por violencia de género en 2025 (126.293 en 2007)',
  // Ministerio de Trabajo, avance del año en curso
  muertesAvance: {anio: 2026, txt: 'De enero a agosto de 2026 fueron 405.'},
  // Eurostat COFOG 05: gestion de residuos, en millones
  residuos: {anio: '2024', v: 8852},
  // Red Eléctrica: el año en curso llega hasta este dia
  renovablesParcial: {anio: '2026', hasta: '6 de noviembre'},
};

// Hombres y mujeres del mismo año, sea de la serie actual o de las anteriores
const empleoAnio = (x: number) => (EMPLEO.h[x] != null ? [EMPLEO.h[x], EMPLEO.m[x]] : [EMPLEO.hAnt[x], EMPLEO.mAnt[x]]);

function EmpleoPorSexo() {
  const [anio, h] = ultimo(EMPLEO.h), m = EMPLEO.m[anio];
  const parcial = anio === A_MANO.empleoParcial.anio ? ` ${anio}, ${A_MANO.empleoParcial.txt}.` : '';
  return (
    <Mini
      title="Hombres y mujeres que trabajan"
      sub="% de personas de 16 a 64 años que tienen empleo, por sexo"
      series={[
        {lab: 'Hombres', c: '#3B5BDB', data: EMPLEO.h},
        {lab: 'Mujeres', c: '#C2255C', data: EMPLEO.m},
        {lab: 'Hombres, series anteriores del INE (1988–2001)', c: '#3B5BDB', dash: true, data: EMPLEO.hAnt},
        {lab: 'Mujeres, series anteriores del INE (1988–2001)', c: '#C2255C', dash: true, data: EMPLEO.mAnt},
      ]}
      f={(v, x) => {
        const [h, m] = x != null ? empleoAnio(x) : [undefined, undefined];
        return fmt(v, 1) + ' %' + (h != null && m != null ? ` · diferencia: ${fmt(h - m, 1)} puntos` : '');
      }}
      x0={1987.5}
      yMin={0}
      note={
        <p>
          Solo cuenta a quien está en edad de trabajar: de 16 a 64 años, sin menores ni jubilados. Cada línea es el porcentaje sobre su propio sexo,
          así que da igual que haya más hombres o más mujeres. En 1988 trabajaban {entero(EMPLEO.hAnt['1988'])} de cada 100 hombres y{' '}
          {entero(EMPLEO.mAnt['1988'])} de cada 100 mujeres; en 2002, {entero(EMPLEO.h['2002'])} y {entero(EMPLEO.m['2002'])}; en {anio}, {entero(h)} y {entero(m)}. Las
          líneas discontinuas salen de las series antiguas de la <T k="epa">EPA</T> (ocupados y población por edad y sexo): 1988–1995 con el método
          de entonces y 1996–2001 recalculada por el <T k="ine">INE</T> con el método de 2005. Desde 2002 la serie es la actual, con otra base de
          población, así que en 1996 y en 2002 hay saltos de método. La serie detallada empieza en el segundo trimestre de 1987, por eso el primer
          año completo es 1988.{parcial}
        </p>
      }
      src={
        <>
          {L('INE, Encuesta de Población Activa', 'https://www.ine.es/jaxiT3/Tabla.htm?t=65306')}
          {' y '}
          {L(
            'series 1987–2001',
            'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176918&menu=resultados&idp=1254735976595',
          )}
        </>
      }
    />
  );
}

// Personas que mueren al dia: 614 al año → «casi dos personas mueren»
function porDia(alAnio: number) {
  const d = alAnio / 365, n = Math.round(d), palabra = ['ninguna', 'una', 'dos', 'tres', 'cuatro', 'cinco'][n] ?? String(n);
  const cuanto = d < n - 0.05 ? 'casi ' : d > n + 0.05 ? 'más de ' : '';
  return n === 1 ? `${cuanto}una persona muere` : `${cuanto}${palabra} personas mueren`;
}

function Seguridad() {
  const primerAnio = anios(VIOL.mujMuertas)[0], [anioIgualdad, igualdad] = ultimo(VIOL.mujMuertas2026);
  const otras = anios(VIOL.otrasMuertes), otrasDesde = otras[0], otrasHasta = otras.at(-1)!, nOtras = suma(VIOL.otrasMuertes);
  const desglose = A_MANO.otrasMuertesDesglose;
  const [anioProt, vg] = ultimo(VIOL.vgMuj);
  const [maxAnio, maxAcc] = maximo(ACC.total), [anioInd, ind] = ultimo(ACC.indice);
  const [anioMort, mort] = ultimo(ACC.mort);
  return (
    <>
      <Mini
        title="Muertes a manos de la pareja o expareja"
        sub="personas asesinadas al año, por sexo de la víctima"
        series={[
          {lab: 'Mujeres asesinadas por su pareja o expareja (hombre)', c: '#C2255C', data: VIOL.mujMuertas},
          {lab: 'Resto: casi todos hombres asesinados por su pareja', c: '#3B5BDB', data: VIOL.otrasMuertes},
          {
            lab: `Mujeres, ${anioIgualdad} hasta el ${A_MANO.violenciaHasta} (provisional, Ministerio de Igualdad)`,
            c: '#C2255C',
            dash: true,
            data: VIOL.mujMuertas2026,
          },
        ]}
        f={n0}
        x0={2002.5}
        yMin={0}
        note={
          <p>
            La violencia de género es, por ley (Ley Orgánica 1/2004), la de un hombre contra una mujer que es o fue su pareja. El recuento oficial
            empieza en {primerAnio}. Desde {primerAnio} han sido asesinadas {entero(suma(VIOL.mujMuertas))} mujeres según el <T k="cgpj">CGPJ</T> (
            {A_MANO.violenciaIgualdadTotal} según el Ministerio de Igualdad). El punto de {anioIgualdad} es el dato provisional del Ministerio hasta
            el {A_MANO.violenciaHasta} ({entero(igualdad)} mujeres): el año aún no ha terminado. La línea azul recoge el resto de muertes en la pareja:
            entre {otrasDesde} y {otrasHasta} fueron {entero(nOtras)}
            {otrasHasta === desglose.hasta
              ? `, de ellas ${desglose.txt}.`
              : ` (de 2009 a ${desglose.hasta}: ${desglose.txt}).`}
          </p>
        }
        src={
          <>
            {L(
              'CGPJ, informes de víctimas mortales en la pareja',
              'https://www.poderjudicial.es/stfls/SALA%20DE%20PRENSA/DOCUMENTOS%20DE%20INTERES/Informe%20Muertes%20Violencia%20de%20G%C3%A9nero%20y%20Dom%C3%A9stica%202025.pdf',
            )}
            {' y '}
            {L('Ministerio de Igualdad', 'https://violenciagenero.igualdad.gob.es/violenciaencifras/victimasmortales/fichamujeres/')}
          </>
        }
      />
      <Mini
        title="Víctimas con orden de protección"
        sub="personas al año con orden de protección o medidas cautelares"
        series={[
          {lab: 'Mujeres, violencia de género (pareja)', c: '#C2255C', data: VIOL.vgMuj},
          {lab: 'Mujeres, violencia en la familia', c: '#E599B5', data: VIOL.vdMuj},
          {lab: 'Hombres, violencia en la familia', c: '#3B5BDB', data: VIOL.vdHom},
        ]}
        f={n0}
        x0={2010.5}
        yMin={0}
        note={`La violencia en la familia («violencia doméstica») es la que se produce entre familiares, como padres, hijos o hermanos, sin contar la de género en la pareja. En ${anioProt}: ${entero(vg)} mujeres víctimas de violencia de género y, en el ámbito familiar, ${entero(VIOL.vdMuj[anioProt])} mujeres y ${entero(VIOL.vdHom[anioProt])} hombres. Además, ${A_MANO.denuncias}.`}
        src={
          <>
            {L('INE, Estadística de Violencia Doméstica y Violencia de Género', 'https://www.ine.es/jaxiT3/Tabla.htm?t=28195')}
            {' y '}
            {L('CGPJ, denuncias', 'https://www.poderjudicial.es/cgpj/es/Temas/Violencia-domestica-y-de-genero/')}
          </>
        }
      />
      <Mini
        title="Accidentes laborales"
        sub="accidentes con baja durante la jornada de trabajo, al año"
        series={[{lab: 'Accidentes', c: '#F59F00', data: ACC.total}]}
        bars
        f={(v, x) => n0(v) + (x != null && ACC.indice[x] ? ` · ${fmt(ACC.indice[x], 0)} por cada 100.000 trabajadores` : '')}
        x0={1987.5}
        yMin={0}
        note={
          <p>
            El máximo fue en {maxAnio} ({entero(maxAcc)}). Por cada 100.000 trabajadores, han bajado de unos 7.500 en 2000 a {entero(ind)} en {anioInd}. Hay
            cambios de método en 1988, 2006, 2016 y 2019 (este año entraron los <T k="autonomo">autónomos</T>).
          </p>
        }
        src={L('Ministerio de Trabajo, Estadística de Accidentes de Trabajo', 'https://www.mites.gob.es/es/estadisticas/monograficas_anuales/EAT/2025/index.htm')}
      />
      <Mini
        title="Muertes en accidentes laborales"
        sub="personas fallecidas al año en accidentes durante la jornada"
        series={[{lab: 'Fallecidos', c: '#495057', data: ACC.mort}]}
        f={n0}
        x0={1987.5}
        yMin={0}
        note={`De ${entero(ACC.mort['1990'])} en 1990 a ${entero(mort)} en ${anioMort}: ${porDia(mort)} cada día trabajando. Desde 2016 cuenta como mortal cualquier muerte en el año siguiente al accidente, lo que sube algo las cifras.${+anioMort < A_MANO.muertesAvance.anio ? ' ' + A_MANO.muertesAvance.txt : ''}`}
        src={L('Ministerio de Trabajo, Estadística de Accidentes de Trabajo', 'https://www.mites.gob.es/es/estadisticas/monograficas_anuales/EAT/2025/index.htm')}
      />
    </>
  );
}

// «un 39 % menos» / «un 4 % más»
const comparado = (v: number, base: number) => `un ${fmt(Math.abs((v / base - 1) * 100), 0)} % ${v < base ? 'menos' : 'más'}`;

function MedioAmbiente() {
  const [anioGasto, gasto] = ultimo(ENV.gasto), res = A_MANO.residuos;
  const gastoTxt =
    anioGasto === res.anio
      ? `En ${anioGasto} fueron ${entero(gasto)} millones: más de la mitad (${entero(res.v)}) para gestionar residuos; el resto, aguas residuales, biodiversidad y paisaje, contaminación e investigación.`
      : `En ${anioGasto} fueron ${entero(gasto)} millones. En ${res.anio}, más de la mitad (${entero(res.v)} millones) fue para gestionar residuos; el resto, aguas residuales, biodiversidad y paisaje, contaminación e investigación.`;

  // Renovables: los dos ultimos años completos (el año en curso va aparte)
  const ren = ENV.renREE, renParcial = A_MANO.renovablesParcial;
  const renAnios = anios(ren), renCompletos = renAnios.filter((a) => a !== renParcial.anio).slice(-2);
  const renPct = lista(renCompletos.map((a) => fmt(ren[a], 1) + ' %'));
  const renTxt = renCompletos.every((a) => ren[a] > 50)
    ? `En ${lista(renCompletos)} más de la mitad de la electricidad ya fue renovable (${renPct}).`
    : `En ${lista(renCompletos)} fue renovable el ${renPct} de la electricidad.`;

  // Solar: cuanto ha crecido desde 2018 y en que año paso a la eolica
  const fv2018 = ENV.fv['2018'], [, fvU] = ultimo(ENV.fv);
  const supera = anios(ENV.fv).find((a) => ENV.eol[a] != null && ENV.fv[a] > ENV.eol[a]);

  // Emisiones: el ultimo año es un avance; se compara el anterior
  const gei = ENV.gei, geiAnios = anios(gei), geiAvance = geiAnios.at(-1)!, geiRef = geiAnios.at(-2)!, [geiMaxAnio, geiMax] = maximo(gei);

  return (
    <>
      <Mini
        title="Gasto público en medio ambiente"
        sub="millones de € al año (todas las administraciones)"
        series={[{lab: 'Gasto', c: '#2F9E44', data: ENV.gasto}]}
        bars
        f={(v, x) => fmt(v, 0) + ' M€' + (x != null && ENV.gastoPct[x] != null ? ` · ${fmt(ENV.gastoPct[x], 2)} % del PIB` : '')}
        x0={1994.5}
        x1={2025.5}
        yMin={0}
        note={
          <p>
            Siempre en torno al 1 % del <T k="pib">PIB</T>. {gastoTxt} {anioGasto} es provisional.
          </p>
        }
        src={L('Eurostat, gasto público por funciones (COFOG 05)', 'https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table')}
      />
      <Mini
        title="Electricidad renovable"
        sub="% de la electricidad generada en España que viene de renovables"
        series={[
          {lab: `Red Eléctrica (${renAnios[0]}–${renAnios.at(-1)})`, c: '#2F9E44', data: ENV.renREE},
          {lab: 'Eurostat, otro método (1990–2006)', c: '#2F9E44', dash: true, data: ENV.renEU},
        ]}
        f={(v) => fmt(v, 1) + ' %'}
        x0={1989.5}
        yMin={0}
        note={`${renTxt} Antes de 2007 el dato es de Eurostat, con otro método que da 2–3 puntos menos. Los altibajos dependen mucho de si el año fue lluvioso (hidráulica).${ren[renParcial.anio] != null ? ` ${renParcial.anio}, hasta el ${renParcial.hasta}.` : ''}`}
        src={
          <>
            {L('Red Eléctrica de España', 'https://www.ree.es/es/datos/generacion')}
            {' y '}
            {L('Eurostat', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_peh/default/table')}
          </>
        }
      />
      <Mini
        title="Paneles solares y molinos de viento"
        sub="potencia instalada, en gigavatios (GW)"
        series={[
          {lab: 'Solar fotovoltaica', c: '#F59F00', data: ENV.fv},
          {lab: 'Eólica', c: '#3B5BDB', data: ENV.eol},
          {lab: 'Solar fotovoltaica, Eurostat (1990–2009)', c: '#F59F00', dash: true, data: ENV.fvEU},
          {lab: 'Eólica, Eurostat (1990–2002)', c: '#3B5BDB', dash: true, data: ENV.eolEU},
        ]}
        // Por debajo de 1 GW se escribe en MW, si no los primeros años saldrían como 0,0
        f={(v) => (v < 1 ? fmt(v * 1000, 0) + ' MW' : fmt(v, 1) + ' GW')}
        x0={1989.5}
        yMin={0}
        note={
          <p>
            La solar se multiplicó por {aproximado(fvU / fv2018)} desde 2018 (de {fmt(fv2018, 1)} a {fmt(fvU, 1)} <T k="gigavatio">GW</T>)
            {supera ? ` y en ${supera} superó a la eólica` : ''}. Entre 2013 y 2018 apenas creció. La eólica despegó a finales de los noventa: de casi
            nada en 1995 a 10 GW en 2005. Sin contar los paneles de <T k="autoconsumo">autoconsumo</T> en tejados, que suman unos 8 GW más. Las líneas
            continuas son de Red Eléctrica (eólica desde 2003 y solar desde 2010, que antes iba sumada a «otras renovables»); las discontinuas, de
            Eurostat, que mide de otra forma y da cifras algo distintas (en 2003, 5,9 GW de eólica frente a 5,5 de Red Eléctrica).
          </p>
        }
        src={
          <>
            {L('Red Eléctrica, Informe del Sistema Eléctrico', 'https://www.sistemaelectrico-ree.es/es/informe-del-sistema-electrico/potencia-instalada')}
            {', '}
            {L('informes anuales 2003–2012', 'https://www.ree.es/es/datos/publicaciones/informe-anual-sistema')}
            {' y '}
            {L('Eurostat', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_inf_epcrw/default/table')}
          </>
        }
      />
      <Mini
        title="Gases de efecto invernadero"
        sub="millones de toneladas de CO₂ equivalente al año"
        series={[{lab: 'Emisiones', c: '#495057', data: ENV.gei}]}
        f={(v) => fmt(v, 1) + ' Mt'}
        x0={1989.5}
        yMin={0}
        note={`El máximo fue en ${geiMaxAnio} (${entero(geiMax)} Mt). En ${geiRef} se emitió ${comparado(gei[geiRef], gei['2005'])} que en 2005 y ${comparado(gei[geiRef], gei['1990'])} que en 1990. ${geiAvance} es un avance del Ministerio.`}
        src={
          <>
            {L(
              'Ministerio para la Transición Ecológica, Inventario Nacional',
              'https://www.miteco.gob.es/content/dam/miteco/es/calidad-y-evaluacion-ambiental/temas/sistema-espanol-de-inventario-sei-/resumen-Inventario-GEI-2026.pdf',
            )}
            {' y '}
            {L('Eurostat', 'https://ec.europa.eu/eurostat/databrowser/view/env_air_gge/default/table')}
          </>
        }
      />
    </>
  );
}

export default function Graficos() {
  return (
    <section>
      <div className="eyebrow">
        {yr(LEGS[0].a)}–{yr(LEGS[LEGS.length - 1].b)}
      </div>
      <h2>
        Cuarenta años en gráficos{' '}
        <Info>
          El color de fondo indica el partido que presidía el Gobierno. Las líneas verticales marcan los grandes acontecimientos. La franja de abajo dice
          cuánto subió o bajó cada indicador en cada <T k="legislatura">legislatura</T>: verde si mejoró, rojo si empeoró, gris si solo cambió. Pulsa
          un gráfico para ir a esa legislatura.
        </Info>
      </h2>
      <div className="charts" id="charts">
        {METRICS.filter((m) => m.g === 'eco' && !m.kpiOnly).map((m) => (
          <Grafico key={m.k} m={m} />
        ))}
        <EmpleoPorSexo />
        <Seguridad />
        <MedioAmbiente />
      </div>
    </section>
  );
}
