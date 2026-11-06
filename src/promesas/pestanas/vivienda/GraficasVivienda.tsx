import {HAY_CASAS, TENENCIA, VIV} from '../../datos';
import {fmt} from '../../lib/formato';
import {INK} from '../../lib/config';
import Mini from '../../componentes/graficas/Mini';
import {L} from '../../componentes/enlace';
import {T} from '../../../comun/Glosario';
import {alquilerCenso2021, alquilerDosIndices, DESAHUCIOS_AVANCE, maximo, mil, PARQUE, PRECIO_PARCIAL, primero, SERPAVI_PISO, serpavi, ultimo} from './cuentas';

/* Graficas pequeñas de vivienda (housingCharts del original) */
const n0 = (v: number) => fmt(v, 0);

/* Ultimos datos que se citan en las notas (i) */
const [okAnio, okN] = ultimo(VIV.okupa);
const [compraAnio] = ultimo(VIV.idxCompra);
const alq2 = alquilerDosIndices();
const SP = serpavi();
// La estimacion del alquiler: el ultimo dato oficial subido lo que subio el indice del INE ese año
const [spEstAnio] = ultimo(VIV.serpaviEstimado);
// Años sin dato oficial de alquiler, del siguiente al estimado hasta hoy
const hoy = new Date().getFullYear();
const spSinDato = hoy > +spEstAnio ? [...new Set([String(+spEstAnio + 1), String(hoy)])] : [];
const [tenAnio] = ultimo(TENENCIA.propiedad);
const ten = (s: Record<string, number>) => fmt(s[tenAnio], 1);
const [aniosAnio, aniosV] = ultimo(VIV.anios);
const [desAnio, desV] = ultimo(VIV.desTot);
const [desMaxAnio, desMax] = maximo(VIV.desTot);
const [hipMaxAnio, hipMax] = maximo(VIV.desHip);
const [, hipV] = ultimo(VIV.desHip);
const [vpoAnio, vpoV] = ultimo(VIV.vpo);
const [hipoMaxAnio, hipoMax] = maximo(VIV.hipo);
const [notMaxAnio, notMax] = maximo(VIV.compraNotarios);
const [emancAnio, emancV] = ultimo(VIV.emanc);
// Pisos turisticos sobre el parque de viviendas en los tres ultimos años (parque del mismo año o el ultimo que haya)
const turisPct = Object.keys(VIV.turis)
  .slice(-3)
  .map((a) => (VIV.turis[a] / ((PARQUE[a] ?? ultimo(PARQUE)[1]) * 1e6)) * 100);
const turisRango = [...new Set([Math.min(...turisPct), Math.max(...turisPct)].map((v) => fmt(v, 1)))].join('–');
// Solo los años desde `y` (los censos empiezan antes que la grafica)
const desde = (d: Record<string, number>, y: number) => Object.fromEntries(Object.entries(d).filter(([k]) => +k >= y));

const SERPAVI = 'https://publicaciones.transportes.gob.es/downloadcustom/sample/3953';
const BDE = 'https://www.bde.es/webbe/es/estadisticas/compartido/datos/csv/si_1_5.csv';

export default function GraficasVivienda() {
  return (
    <>
      <Mini
        id="viv-compra-alquiler"
        title="Comprar frente a alquilar"
        sub="cuánto ha subido cada uno (2015 = 100)"
        series={[
          {lab: 'Precio de compra', c: INK, data: VIV.idxCompra},
          {lab: 'Alquiler (índice del INE con los contratos declarados)', c: '#E8590C', data: VIV.idxAlq},
          {lab: 'Alquiler que pagan todos los inquilinos (IPC)', c: '#E8590C', dash: true, data: VIV.idxAlqIpc},
        ]}
        f={(v) => fmt(v, 1)}
        x0={1985.5}
        yMin={0}
        note={
          <p>
            Si una línea vale 120, ese precio es un 20 % más caro que en 2015. Compra: <T k="valor-tasado">valor tasado</T> medio del Ministerio de
            Vivienda, que empieza en {primero(VIV.idxCompra)[0]}
            {compraAnio === PRECIO_PARCIAL.anio ? ` (${compraAnio} ${PRECIO_PARCIAL.meses})` : ''}; entre 1995 y 2007 se triplicó. Alquiler, línea
            continua: <T k="ipva">Índice de Precios de Vivienda en Alquiler</T> del INE ({primero(VIV.idxAlq)[0]}–{ultimo(VIV.idxAlq)[0]}),
            con los contratos declarados a Hacienda. Alquiler, línea discontinua: la parte de alquiler del <T k="ipc">IPC</T> (
            {primero(VIV.idxAlqIpc)[0]}–{ultimo(VIV.idxAlqIpc)[0]}), que sigue lo que pagan todos los inquilinos, también los de contratos antiguos que
            solo suben con el IPC; por eso sube menos (de 2015 a {alq2.anio}, un {fmt(alq2.ipc, 0)} % frente al {fmt(alq2.ipva, 0)} %). Son dos índices
            distintos y no se empalman. De 1986 a 2001 se ha sacado con la calculadora de variaciones del IPC del INE. En euros, el alquiler medio era de
            7,8 €/m² al mes en 2022 (unos 569 € al mes), según el Ministerio de Vivienda.
          </p>
        }
        src={
          <>
            {L('Ministerio de Vivienda', 'https://apps.fomento.gob.es/BoletinOnline2/sedal/35101000.XLS')}, {L('INE, IPVA', 'https://www.ine.es/jaxiT3/Tabla.htm?t=59057')},{' '}
            {L('INE, IPC de la vivienda en alquiler', 'https://www.ine.es/jaxiT3/Tabla.htm?t=24079')}, {L('INE, calculadora de variaciones del IPC', 'https://www.ine.es/varipc/')},{' '}
            {L('Ministerio de Vivienda, SERPAVI 2022', SERPAVI)}
          </>
        }
      />
      <Mini
        id="viv-alquiler"
        title="Precio del alquiler"
        sub="€ por m² al mes (vivienda colectiva)"
        series={[
          {lab: 'Alquiler (Ministerio de Vivienda)', c: '#E8590C', data: VIV.serpavi},
          {lab: `${spEstAnio}: estimación con el índice del INE`, c: '#E8590C', dash: true, data: VIV.serpaviEstimado},
        ]}
        f={(v) => fmt(v, 1) + ' €/m²'}
        x0={2014.5}
        note={
          <p>
            Sistema Estatal de Referencia del Precio del Alquiler, con los contratos declarados a Hacienda (sin País Vasco). En {SP.a}, último año
            publicado{SP.a === SERPAVI_PISO.anio ? ` (${SERPAVI_PISO.edicion})` : ''}, un piso medio costaba {fmt(SP.v, 1)} € por m² al mes
            {SP.a === SERPAVI_PISO.anio ? `, unos ${SERPAVI_PISO.euros} € al mes` : ''}, un {fmt(SP.subida, 0)} % más que en {SP.a0}.
            {+spEstAnio > +SP.a && (
              <>
                {' '}
                {spEstAnio} es una estimación: el dato de {SP.a} subido lo que subió ese año el <T k="ipva">índice de precios del alquiler</T> del INE (
                {fmt(VIV.ipvaVar[spEstAnio], 1)} %).
              </>
            )}
            {spSinDato.length > 0 && ` ${spSinDato.join(' y ')} aún no ${spSinDato.length > 1 ? 'tienen' : 'tiene'} dato oficial:`} Hacienda tarda unos
            dos años en tener los contratos; los portales de anuncios publican precios pedidos, que suelen ser más altos que los firmados. Antes de{' '}
            {SP.a0} no hay precio oficial en euros; cómo ha subido desde 1986 (en índice, no en euros) está en «Comprar frente a alquilar».
          </p>
        }
        src={L('Ministerio de Vivienda, SERPAVI', SERPAVI)}
      />
      <Mini
        id="viv-tenencia"
        title="Viviendas en propiedad y en alquiler"
        sub="% de hogares, según cómo tienen la vivienda en la que viven"
        series={[
          {lab: 'En propiedad', c: INK, data: TENENCIA.propiedad},
          {lab: 'De alquiler', c: '#E8590C', data: TENENCIA.alquiler},
          {lab: 'Cedida gratis', c: '#868E96', dash: true, data: TENENCIA.cesion},
          {lab: 'En propiedad (censos)', c: INK, dash: true, data: desde(TENENCIA.censoPropiedad, 1986)},
          {lab: 'De alquiler (censos)', c: '#E8590C', dash: true, data: desde(TENENCIA.censoAlquiler, 1986)},
        ]}
        f={(v) => fmt(v, 1) + ' %'}
        x0={1985.5}
        yMin={0}
        note={
          <p>
            En {tenAnio}, {ten(TENENCIA.propiedad)} de cada 100 <T k="hogar">hogares</T> vivían en una casa suya y {ten(TENENCIA.alquiler)} de alquiler (
            {ten(TENENCIA.alquilerMercado)} a precio de mercado y {ten(TENENCIA.alquilerReducido)} por debajo, como los alquileres sociales o de{' '}
            <T k="renta-antigua">renta antigua</T>); el resto, en una vivienda cedida gratis por familiares o la empresa. En {primero(TENENCIA.alquiler)[0]}{' '}
            vivían de alquiler {fmt(primero(TENENCIA.alquiler)[1], 1)} de cada 100. Las líneas continuas son la encuesta anual del INE (desde{' '}
            {primero(TENENCIA.propiedad)[0]}); las discontinuas de propiedad y alquiler, los <T k="censo">censos</T>, que cuentan todas las viviendas
            principales y no se empalman con la encuesta. Según los censos, la propiedad subió del {fmt(TENENCIA.censoPropiedad['1981'], 1)} % en 1981 al{' '}
            {fmt(TENENCIA.censoPropiedad['2001'], 1)} % en 2001 y bajó al {fmt(TENENCIA.censoPropiedad['2021'], 1)} % en 2021; el alquiler bajó del{' '}
            {fmt(TENENCIA.censoAlquiler['1981'], 1)} % en 1981 al {fmt(TENENCIA.censoAlquiler['2001'], 1)} % en 2001 y volvió al{' '}
            {fmt(TENENCIA.censoAlquiler['2021'], 1)} % en 2021. En número: el censo de 2021 contó {fmt(HAY_CASAS.censo2021.hogares / 1e6, 1)} millones de
            hogares, unos {fmt(alquilerCenso2021() / 1e6, 0)} millones de ellos de alquiler. Esto cuenta solo las viviendas donde vive alguien; las vacías y
            las segundas residencias están en «¿Hay casas para todos?».
          </p>
        }
        src={
          <>
            {L('INE, Encuesta de Condiciones de Vida (tabla 9996)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=9996')}, {L('INE, censos de 1981 a 2021 (recogidos por el Banco de España)', BDE)}
          </>
        }
      />
      <Mini
        id="viv-anios"
        title="Años de sueldo para comprar una casa"
        sub="precio de una vivienda / renta bruta anual de un hogar"
        series={[{lab: 'Años', c: INK, data: VIV.anios}]}
        f={(v) => fmt(v, 1) + ' años'}
        x0={1986.5}
        yMin={0}
        note={
          <p>
            En 1997 una vivienda costaba {fmt(VIV.anios['1997'], 1)} años de ingresos de un hogar; en 2007, {fmt(VIV.anios['2007'], 1)} años; en{' '}
            {aniosAnio}, {fmt(aniosV, 1)}. Es una <T k="vivienda-libre">vivienda libre</T> de 93,75 m² frente a la renta del{' '}
            <T k="mediana">hogar mediano</T>.
          </p>
        }
        src={L('Banco de España, indicadores del mercado de la vivienda', BDE)}
      />
      <Mini
        id="viv-esfuerzo"
        title="Parte del sueldo que se va en la hipoteca"
        sub="% de la renta del hogar, primer año de hipoteca"
        series={[{lab: 'Esfuerzo', c: '#AE3EC9', data: VIV.esfuerzo}]}
        f={(v) => fmt(v, 1) + ' %'}
        x0={1986.5}
        yMin={0}
        note={
          <p>
            Es el <T k="esfuerzo-financiero">esfuerzo financiero</T> teórico. Supone un préstamo del 80 % del precio. Depende del precio y también de los{' '}
            <T k="tipos-de-interes">tipos de interés</T>: por eso fue altísimo en 1990 ({fmt(VIV.esfuerzo['1990'], 0)} %), bajó con el euro y volvió a subir
            en 2007 y desde 2023.
          </p>
        }
        src={L('Banco de España', BDE)}
      />
      <Mini
        id="viv-okupa"
        title="Okupación"
        sub="hechos conocidos de usurpación y allanamiento de inmuebles al año"
        series={[{lab: 'Hechos', c: '#E03131', data: VIV.okupa}]}
        bars
        f={(v, x) => n0(v) + (x != null && VIV.okupa10k[x] ? ` · ${fmt(VIV.okupa10k[x], 1)} por cada 10.000 viviendas` : '')}
        x0={2009.5}
        yMin={0}
        note={
          <p>
            Son denuncias conocidas por la policía, no viviendas ocupadas a la vez. En {okAnio} fueron {mil(okN)}: unas {fmt(VIV.okupa10k[okAnio], 0)} por
            cada 10.000 viviendas ({fmt(VIV.okupa10k[okAnio] / 100, 2)} %). Casi todas son <T k="usurpacion">usurpación</T> (viviendas que no son la casa
            habitual de nadie); el <T k="allanamiento">allanamiento</T> de una vivienda habitada fueron 515 casos en 2024. Los años 2010–2012 pueden estar
            infrarrepresentados.
          </p>
        }
        src={
          <>
            {L('Ministerio del Interior, Sistema Estadístico de Criminalidad', 'https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/px/Datos11/l0/11001.px')},{' '}
            {L('respuesta del Gobierno en el Congreso (2025)', 'https://www.congreso.es/entradap/l15p/e5/e_0059393_n_000.pdf')}
          </>
        }
      />
      <Mini
        id="viv-desahucios"
        title="Desahucios"
        sub="lanzamientos practicados por los juzgados al año"
        series={[
          {lab: 'Total', c: INK, data: VIV.desTot},
          {lab: 'Por no pagar el alquiler', c: '#E8590C', data: VIV.desAlq},
          {lab: 'Por no pagar la hipoteca', c: '#3B5BDB', data: VIV.desHip},
        ]}
        f={n0}
        x0={2012.5}
        yMin={0}
        note={
          <p>
            De {mil(desMax)} en {desMaxAnio} a {mil(desV)} en {desAnio}. Hoy la mayoría son por alquiler: los de hipoteca han caído de {mil(hipMax)} en{' '}
            {hipMaxAnio} a {mil(hipV)}.
            {+DESAHUCIOS_AVANCE.anio > +desAnio &&
              ` En ${DESAHUCIOS_AVANCE.periodo} de ${DESAHUCIOS_AVANCE.anio} hubo ${mil(DESAHUCIOS_AVANCE.n)}.`}{' '}
            No hay serie completa antes de 2013: hasta entonces el <T k="cgpj">CGPJ</T> solo contaba los <T k="lanzamiento">lanzamientos</T> de los
            servicios comunes, que no existen en todos los <T k="partido-judicial">partidos judiciales</T> y no se pueden sumar a estos.
          </p>
        }
        src={L('Consejo General del Poder Judicial', 'https://www.poderjudicial.es/cgpj/es/Temas/Estadistica-Judicial/Estudios-e-Informes/Efecto-de-la-Crisis-en-los-organos-judiciales/')}
      />
      <Mini
        id="viv-vacias"
        title="Viviendas vacías"
        sub="% del total de viviendas en cada censo"
        series={[{lab: 'Vacías', c: '#E03131', data: VIV.vacias}]}
        bars
        f={(v, x) => fmt(v, 1) + ' %' + (x != null && VIV.vaciasN[x] ? ` · ${n0(VIV.vaciasN[x])} viviendas` : '')}
        x0={1987}
        x1={2025}
        yMin={0}
        note="Siempre en torno a 1 de cada 7 viviendas. En 2021 el INE las midió por consumo eléctrico, un método nuevo que no es del todo comparable con los censos anteriores."
        src={L('INE, censos de 1991 a 2021', 'https://www.ine.es/prensa/np775.pdf')}
      />
      <Mini
        id="viv-vpo"
        title="Viviendas protegidas"
        sub="viviendas protegidas terminadas (con calificación definitiva) al año"
        series={[{lab: 'Viviendas', c: '#2F9E44', data: VIV.vpo}]}
        bars
        f={n0}
        x0={1985.5}
        yMin={0}
        note={
          <p>
            En 1986 se terminaron {mil(VIV.vpo['1986'])}, más que <T k="vivienda-libre">viviendas libres</T> (73.005); en 1991 ya eran{' '}
            {mil(VIV.vpo['1991'])}. Más de 85.000 en 1997 y unas 68.000 en 2008. Tras la crisis cayeron a menos de 5.000 en 2017. En {vpoAnio} fueron{' '}
            {mil(vpoV)}. Los años 2003–2005 son estimaciones del Ministerio. 1986–1990: serie histórica de{' '}
            <T k="vivienda-protegida">viviendas protegidas</T> terminadas del Observatorio de Vivienda y Suelo, el mismo dato que la{' '}
            <T k="calificacion-definitiva">calificación definitiva</T>.
          </p>
        }
        src={
          <>
            {L('Ministerio de Vivienda', 'https://apps.fomento.gob.es/BoletinOnline2/sedal/31306000.XLS')},{' '}
            {L('Observatorio de Vivienda y Suelo, Boletín especial Vivienda Social 2024 (tabla 1.1)', 'https://publicaciones.transportes.gob.es/downloadcustom/sample/3749')}
          </>
        }
      />
      <Mini
        id="viv-compraventas"
        title="Compraventas e hipotecas"
        sub="viviendas al año"
        series={[
          {lab: 'Hipotecas sobre viviendas', c: '#3B5BDB', data: VIV.hipo},
          {lab: 'Compraventas de viviendas', c: INK, data: VIV.compra},
          {lab: 'Compraventas ante notario, 2004–2007 (Ministerio)', c: INK, dash: true, data: VIV.compraNotarios},
        ]}
        f={n0}
        x0={2002.5}
        yMin={0}
        note={
          <p>
            Hipotecas y compraventas (líneas continuas) son del INE, con lo inscrito en los <T k="registro-de-la-propiedad">registros de la propiedad</T>:
            las hipotecas desde 2003 y las compraventas desde 2007, cuando empieza esa estadística. La línea discontinua son las compraventas firmadas ante
            notario que cuenta el Ministerio de Vivienda desde 2004: es otra fuente y no se empalma (en 2007, {mil(VIV.compraNotarios['2007'])} frente a{' '}
            {mil(VIV.compra['2007'])} del INE).{' '}
            {notMaxAnio === hipoMaxAnio
              ? `El máximo fue en ${hipoMaxAnio}: ${mil(notMax)} compraventas ante notario y ${fmt(hipoMax / 1e6, 2)} millones de hipotecas.`
              : `El máximo de compraventas ante notario fue en ${notMaxAnio} (${mil(notMax)}) y el de hipotecas en ${hipoMaxAnio} (${fmt(hipoMax / 1e6, 2)} millones).`}
          </p>
        }
        src={
          <>
            {L('INE, transmisiones de derechos de la propiedad e hipotecas', 'https://www.ine.es/jaxiT3/Tabla.htm?t=6150')},{' '}
            {L('Ministerio de Vivienda, transacciones inmobiliarias', 'https://cdn.mivau.gob.es/portal-web-mivau/Datos_MIVAU/CSV/VDP003_01.csv')}
          </>
        }
      />
      <Mini
        id="viv-edad"
        title="Edad a la que los jóvenes se van de casa"
        sub="edad media de emancipación"
        series={[{lab: 'Edad', c: '#AE3EC9', data: VIV.edad}]}
        f={(v) => fmt(v, 1) + ' años'}
        x0={1999.5}
        note={
          <p>
            La media en la Unión Europea ronda los 26 años. <T k="eurostat">Eurostat</T> la calcula con la <T k="epa">Encuesta de Población Activa</T>{' '}
            desde 2000; marca cambios de método en 2005 y 2021.
          </p>
        }
        src={L('Eurostat', 'https://ec.europa.eu/eurostat/databrowser/view/yth_demo_030/default/table')}
      />
      <Mini
        id="viv-emanc"
        title="Jóvenes emancipados"
        sub="% de jóvenes de 16 a 29 años que viven fuera de casa de sus padres"
        series={[{lab: 'Emancipados', c: '#AE3EC9', data: VIV.emanc}]}
        f={(v) => fmt(v, 1) + ' %'}
        x0={2012.5}
        yMin={0}
        note={
          <p>
            En {emancAnio}, solo {fmt(emancV, 1)} de cada 100 jóvenes de 16 a 29 años estaba <T k="emancipacion">emancipado</T>. 2014 y 2015 sin dato
            comparable; 2025 con metodología nueva.
          </p>
        }
        src={L('Consejo de la Juventud de España, Observatorio de Emancipación', 'https://www.cje.org/download/313/ano-2025/23618/2025-balance-general.pdf')}
      />
      <Mini
        id="viv-turis"
        title="Pisos turísticos"
        sub="viviendas de uso turístico"
        series={[{lab: 'Pisos turísticos', c: '#F59F00', data: VIV.turis}]}
        bars
        f={n0}
        x0={2019.5}
        yMin={0}
        note={
          <p>
            Un {turisRango} % de todas las viviendas. Datos de agosto hasta 2024 y de mayo desde 2025 (el INE cambió el mes de referencia).{' '}
            <T k="estadistica-experimental">Estadística experimental</T> del INE.
          </p>
        }
        src={L('INE, viviendas turísticas', 'https://www.ine.es/jaxiT3/Tabla.htm?t=39364')}
      />
    </>
  );
}
