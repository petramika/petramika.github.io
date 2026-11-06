import type {ReactNode} from 'react';
import {HAY_CASAS, TENENCIA, VIV} from '../../datos';
import {fmt} from '../../lib/formato';
import {T} from '../../../comun/Glosario';
import {Cuestion, Cuestiones} from '../../componentes/Cuestiones';
import {
  alquilerCenso2021,
  alquilerDosIndices,
  anios,
  antes,
  decenasDeMil,
  deCada,
  DESAHUCIOS_AVANCE,
  fechaHoy,
  hogaresNuevos,
  maximo,
  mil,
  minimo,
  PARQUE,
  parte,
  PRECIO,
  PRECIO_PARCIAL,
  primero,
  serpavi,
  ultimo,
  unPct,
  variacion,
  veces,
} from './cuentas';

/*
  Preguntas frecuentes sobre la vivienda, respondidas solo con las graficas
  de esta pestaña (datos/vivienda/*.json, series «precio» y «viv» y las notas
  (i) de cada grafica). Las cifras se leen del ultimo dato de cada serie (ver
  cuentas.ts). Las cuentas marcadas como «cálculo propio» son operaciones
  sencillas con esos datos:
  - Hogares nuevos: hogares de hoy (INE) − hogares del censo (enero de 2021), entre los años que han pasado.
  - Parque: viviendas a final del ultimo año − final de 2020.
  - Compra/alquiler: precio del m² / (alquiler del m² × 12), del ultimo año del alquiler.
  - Entrada: 93,75 m² × precio del m² del ultimo año × 20 %.
  - Pisos turisticos frente a hogares de alquiler: pisos del ultimo año / (hogares del censo de 2021 × % de alquiler del censo).
*/

const C = HAY_CASAS.censo2021, H = HAY_CASAS.hoy, V = HAY_CASAS.viviendas;
const M1 = (n: number) => fmt(n / 1e6, 1);
/** Quita los huecos de las listas con elementos que solo salen si se cumple algo */
const lista = (xs: (ReactNode | false)[]) => xs.filter((x): x is ReactNode => x !== false);

// Casas y hogares
const hoyAnio = fechaHoy().anio;
const nuevos = hogaresNuevos();
const [pqAnio, pqU] = ultimo(PARQUE);
const [, pq1] = antes(PARQUE, 1);
const [vacA0, vacV0] = primero(VIV.vacias), [, vacU] = ultimo(VIV.vacias);

// Pisos turisticos
const [tuA, tuU] = ultimo(VIV.turis), [tuA1, tuU1] = antes(VIV.turis, 1);
const tuVar = variacion(tuU1, tuU);
const tuSobreAlquiler = tuU / alquilerCenso2021();

// Alquiler, compra y tenencia
const SP = serpavi();
const alq2 = alquilerDosIndices();
const [tenA, alqU] = ultimo(TENENCIA.alquiler), [tenA0, alq0] = primero(TENENCIA.alquiler);
const [, alqReducido] = ultimo(TENENCIA.alquilerReducido);
const [compraA, compraIdx] = ultimo(VIV.idxCompra);
const [precioA, precioU] = ultimo(PRECIO), [precioA1, precio1] = antes(PRECIO, 1), [, precio2] = antes(PRECIO, 2);
const [, precioMax] = maximo(PRECIO);
const precioVar = variacion(precio1, precioU), precioVar1 = variacion(precio2, precio1);
const precio08 = PRECIO['2008'];
const entrada = Math.round((93.75 * precioU * 0.2) / 1000) * 1000;

// Esfuerzo y años de sueldo
const [esfA, esfU] = ultimo(VIV.esfuerzo);
const [aniosA, aniosU] = ultimo(VIV.anios), [aniosA2, anios2] = antes(VIV.anios, 2);

// Jovenes
const [edadA, edadU] = ultimo(VIV.edad);
const edadMas = edadU - VIV.edad['2000'];
const [emA, emU] = ultimo(VIV.emanc), [emA0, em0] = primero(VIV.emanc);

// Hipotecas
const [hipoA, hipoU] = ultimo(VIV.hipo), [hipoMaxA, hipoMax] = maximo(VIV.hipo);

// Vivienda protegida
const [vpoA, vpoU] = ultimo(VIV.vpo), [vpoA1, vpo1] = antes(VIV.vpo, 1);
const [vpoMinA, vpoMin] = minimo(VIV.vpo);
const [vpoMaxA, vpoMax] = maximo(VIV.vpo, vpoMinA);
// «El maximo desde 2013»: ultimo año antes de ese maximo con mas viviendas
const vpoDesde = anios(VIV.vpo).filter((a) => +a < +vpoMaxA && VIV.vpo[a] >= vpoMax).at(-1);

// Okupacion
const [okA, okU] = ultimo(VIV.okupa), [okMaxA, okMax] = maximo(VIV.okupa);

// Desahucios
const [desA, desU] = ultimo(VIV.desTot), [desMaxA, desMax] = maximo(VIV.desTot);
const [, hipU] = ultimo(VIV.desHip), [hipMaxA, hipMax] = maximo(VIV.desHip);
const [, desAlqU] = ultimo(VIV.desAlq);
const avance = +DESAHUCIOS_AVANCE.anio > +desA ? DESAHUCIOS_AVANCE : null;

export default function CuestionesVivienda() {
  return (
    <Cuestiones intro="Preguntas que se hace mucha gente sobre la vivienda, respondidas con las gráficas de esta pestaña. Cada respuesta tiene su parte buena y su parte mala. Los «cálculos propios» son cuentas sencillas con esos datos; cuando mezclan fuentes o años distintos, son orientativos.">
      <Cuestion
        pregunta="¿Hay casas para todos?"
        veredicto="En número, sí"
        tono="matiz"
        conclusion={
          <>
            Hay unos {M1(V.total)} millones de viviendas ({V.anio}) para {M1(H.hogares)} millones de <T k="hogar">hogares</T> ({hoyAnio}):{' '}
            <b>sobran unos {M1(V.total - H.hogares)} millones</b> en las que no vive nadie. Pero muchas son segundas residencias o están en pueblos donde
            casi no hay demanda. <b>El problema es dónde están y cuánto cuestan</b>, no cuántas hay.
          </>
        }
        positivo={[
          <>
            No hace falta construir una casa por cada hogar nuevo: en el <T k="censo">censo</T> de 2021 había {fmt(C.vacias / 1e6, 2)} millones de
            viviendas vacías (el {fmt((C.vacias / C.viviendas) * 100, 1)} %).
          </>,
          <>
            Las vacías no van a más:{' '}
            {fmt(vacU, 1) === fmt(vacV0, 1) ? `son el mismo ${fmt(vacU, 1)} % que en ${vacA0}` : `son el ${fmt(vacU, 1)} %, frente al ${fmt(vacV0, 1)} % de ${vacA0}`},
            en torno a 1 de cada 7 en todos los censos.
          </>,
        ]}
        negativo={[
          <>
            Están lejos de donde se busca casa: el {fmt(C.vaciasPorTamano.menos10000.vacias, 0)} % de las vacías está en pueblos de menos de 10.000
            habitantes, donde vive el {fmt(C.vaciasPorTamano.menos10000.poblacion, 0)} % de la gente. Las ciudades de más de 250.000 habitantes tienen el{' '}
            {fmt(C.vaciasPorTamano.mas250000.poblacion, 0)} % de la población y solo el {fmt(C.vaciasPorTamano.mas250000.vacias, 1)} % de las vacías.
          </>,
          <>
            Los hogares crecen más deprisa que las casas: desde el censo de 2021 hay unos {M1(nuevos.total)} millones de hogares más, y el{' '}
            <T k="parque-de-viviendas">parque</T> ha crecido unas {decenasDeMil((pqU - PARQUE['2020']) * 1e6)} viviendas de 2020 a {pqAnio} (cálculo
            propio, con fuentes y fechas distintas: orientativo).
          </>,
          <>Parte de las que «sobran» tienen uso: {M1(C.esporadicas)} millones eran de uso esporádico en 2021, sobre todo segundas residencias.</>,
        ]}
        graficas={[
          {id: 'viv-casas', lab: '¿Hay casas para todos?'},
          {id: 'g-viv', lab: 'Viviendas'},
          {id: 'viv-vacias', lab: 'Viviendas vacías'},
        ]}
      />

      <Cuestion
        pregunta="¿La culpa del precio del alquiler es de los pisos turísticos?"
        veredicto="En parte"
        tono="matiz"
        conclusion={
          <>
            En el conjunto de España los <T k="pisos-turisticos">pisos turísticos</T> son pocos: unos {mil(Math.round(tuU / 1000) * 1000)} en {tuA}, el{' '}
            {fmt((tuU / (pqU * 1e6)) * 100, 1)} % de las viviendas, {veces(C.vacias / tuU, 'menos')} que las vacías del censo de 2021. Pero frente a las
            casas que se alquilan para vivir no son pocos, y se concentran en zonas turísticas, donde sí pueden empujar el precio. Esta pestaña solo tiene
            datos de toda España, no por ciudad o barrio, así que <b>no puede medir cuánto pesan en cada sitio</b>.
          </>
        }
        positivo={lista([
          tuVar < 0 && (
            <>
              Bajan: de {mil(tuU1)} en mayo de {tuA1} a {mil(tuU)} en mayo de {tuA}, un {fmt(-tuVar, 0)} % menos.
            </>
          ),
          <>
            El alquiler no depende solo de ellos: ya subía cada año desde 2015, antes de que empezara esta estadística ({primero(VIV.turis)[0]}).
          </>,
        ])}
        negativo={lista([
          tuVar >= 0 && (
            <>
              Suben: de {mil(tuU1)} en mayo de {tuA1} a {mil(tuU)} en mayo de {tuA}, un {fmt(tuVar, 0)} % más.
            </>
          ),
          <>
            Equivalen a {tuSobreAlquiler >= 0.1 ? 'más de 1 por cada 10' : `unos ${fmt(tuSobreAlquiler * 100, 0)} por cada 100`} hogares que viven de
            alquiler (unos {fmt(alquilerCenso2021() / 1e6, 0)} millones en el censo de 2021; cálculo propio con años distintos). Cada piso que pasa a
            turístico es uno menos para alquilar todo el año.
          </>,
          <>
            Mientras, el alquiler sigue subiendo: el medio pasó de {fmt(SP.v0, 1)} a {fmt(SP.v, 1)} € por m² al mes de {SP.a0} a {SP.a}, un{' '}
            {fmt(SP.subida, 0)} % más.
          </>,
        ])}
        graficas={[
          {id: 'viv-turis', lab: 'Pisos turísticos'},
          {id: 'viv-alquiler', lab: 'Precio del alquiler'},
          {id: 'viv-casas', lab: '¿Hay casas para todos?'},
        ]}
      />

      <Cuestion
        pregunta="¿Es mejor comprar o alquilar?"
        conclusion={
          <>
            Depende de los ahorros, de cuánto tiempo se piense vivir allí y de dónde. Como referencia, en {SP.a} un m² costaba {mil(PRECIO[SP.a])} € para
            comprar y {fmt(SP.v, 1)} € al mes de alquiler: <b>comprar equivalía a unos {fmt(PRECIO[SP.a] / (SP.v * 12), 0)} años de alquiler</b>, sin
            contar impuestos, intereses ni gastos (cálculo propio; son fuentes y viviendas distintas, orientativo). Cada vez más hogares alquilan: el{' '}
            {fmt(alqU, 1)} % en {tenA}, frente al {fmt(alq0, 1)} % en {tenA0}.
          </>
        }
        positivo={[
          <>
            Comprar: quien compró hace años ha visto subir el valor de su casa (el precio de compra ha subido un {fmt(compraIdx - 100, 0)} % de 2015 a{' '}
            {compraA}), y con <T k="tipo-fijo">tipo fijo</T> la cuota no sube aunque suba el mercado.
          </>,
          <>
            Alquilar: no hace falta ahorrar la <T k="entrada">entrada</T> ni atarse a un sitio. Y quien lleva años en el mismo piso paga subidas menores:
            de 2015 a {alq2.anio} el alquiler que pagan todos los inquilinos subió un {fmt(alq2.ipc, 0)} %, frente al {fmt(alq2.ipva, 0)} % del índice con
            los contratos declarados a Hacienda.
          </>,
        ]}
        negativo={[
          <>
            Comprar: con un préstamo del 80 %, hay que tener ahorrado el resto, unos {mil(entrada)} € para una vivienda media en {precioA} (cálculo
            propio, sin impuestos), y la hipoteca se lleva el {fmt(esfU, 0)} % de la renta del hogar el primer año. Los precios también bajan: de 2008 a
            2014 el m² cayó {unPct(-variacion(precio08, PRECIO['2014']))}.
          </>,
          <>
            Alquilar: el alquiler medio por m² subió un {fmt(SP.subida, 0)} % de {SP.a0} a {SP.a}, y al cambiar de piso o renovar se paga el precio del
            momento.
          </>,
        ]}
        graficas={[
          {id: 'viv-compra-alquiler', lab: 'Comprar frente a alquilar'},
          {id: 'g-precio', lab: 'Precio de la vivienda'},
          {id: 'viv-alquiler', lab: 'Precio del alquiler'},
          {id: 'viv-esfuerzo', lab: 'Parte del sueldo para la hipoteca'},
          {id: 'viv-tenencia', lab: 'Propiedad y alquiler'},
        ]}
      />

      <Cuestion
        pregunta="¿Por qué los jóvenes no se van de casa?"
        conclusion={
          <>
            Sobre todo porque la vivienda cuesta mucho frente a lo que se gana: una casa vale {fmt(aniosU, 1)} años de ingresos de un hogar en {aniosA},
            frente a {fmt(VIV.anios['2015'], 1)} en 2015. Pero no solo: en 2000, con la casa a {fmt(VIV.anios['2000'], 1)} años de sueldo, la edad media
            de <T k="emancipacion">emancipación</T> ya era de {fmt(VIV.edad['2000'], 1)} años, y entre 2013 y 2016, con la casa más barata en años,
            siguió subiendo. Esta pestaña no tiene sueldos ni paro de los jóvenes, que también cuentan.
          </>
        }
        positivo={[
          <>
            La edad media no se ha disparado: de {fmt(VIV.edad['2000'], 1)} años en 2000 a {fmt(edadU, 1)} en {edadA},{' '}
            {edadMas < 1 ? 'menos de un año más' : `${fmt(edadMas, 1)} años más`} en {+edadA - 2000} años.
          </>,
          <>
            Hay más alquiler que antes: el {fmt(alqU, 1)} % de los hogares en {tenA}, frente al {fmt(alq0, 1)} % en {tenA0}.
          </>,
        ]}
        negativo={[
          <>Se van unos {fmt(edadU - 26, 0)} años más tarde que la media de la Unión Europea, que ronda los 26.</>,
          <>
            Solo {fmt(emU, 1)} de cada 100 jóvenes de 16 a 29 años vivían fuera de casa de sus padres en {emA}, frente a {fmt(em0, 1)} en {emA0} (2025
            con un método nuevo).
          </>,
          <>
            Entrar es más caro: el alquiler subió un {fmt(SP.subida, 0)} % de {SP.a0} a {SP.a} y la <T k="cuota-hipoteca">cuota de la hipoteca</T> pasó
            del {fmt(VIV.esfuerzo['2021'], 0)} % de la renta en 2021 al {fmt(esfU, 0)} % en {esfA}.
          </>,
        ]}
        graficas={[
          {id: 'viv-edad', lab: 'Edad de emancipación'},
          {id: 'viv-emanc', lab: 'Jóvenes emancipados'},
          {id: 'viv-anios', lab: 'Años de sueldo para comprar'},
          {id: 'viv-alquiler', lab: 'Precio del alquiler'},
        ]}
      />

      <Cuestion
        pregunta="¿Estamos en otra burbuja como la de 2007?"
        veredicto="No igual"
        tono="matiz"
        conclusion={
          <>
            El precio en euros (sin descontar la <T k="inflacion">inflación</T>){' '}
            {precioU >= precio08
              ? `ya está un ${fmt(variacion(precio08, precioU), 0)} % por encima`
              : `está un ${fmt(-variacion(precio08, precioU), 0)} % por debajo`}{' '}
            del máximo de 2008 ({mil(precioU)} €/m² en {precioA} frente a {mil(precio08)}),{' '}
            {precioVar > 0 ? `y sube ${unPct(precioVar)} al año, como en 2005–2006` : `y en el último año ha bajado ${unPct(-precioVar)}`}. Pero{' '}
            <b>hay mucho menos crédito y se construye mucho menos</b> que entonces. Los datos no dicen si los precios van a bajar.
          </>
        }
        positivo={[
          <>
            Hay mucha menos deuda nueva: {mil(hipoU)} hipotecas en {hipoA}, {parte(hipoU / hipoMax)} de las {fmt(hipoMax / 1e6, 2)} millones de{' '}
            {hipoMaxA}.
          </>,
          <>
            Pesa menos en el bolsillo que en el pico: {fmt(aniosU, 1)} años de sueldo frente a {fmt(VIV.anios['2007'], 1)} en 2007, y el {fmt(esfU, 0)} %
            de la renta para la hipoteca frente al {fmt(VIV.esfuerzo['2008'], 0)} % en 2008.
          </>,
          <>
            No se construye en exceso: el <T k="parque-de-viviendas">parque</T> creció unas {decenasDeMil((pqU - pq1) * 1e6)} viviendas en {pqAnio},
            frente a {decenasDeMil((PARQUE['2007'] - PARQUE['2006']) * 1e6)} en 2007.
          </>,
        ]}
        negativo={lista([
          precioVar > 0 && precioVar1 > 0 && (
            <>
              {precioU >= precioMax ? 'Los precios en euros nunca habían estado tan altos, y las' : 'Las'} subidas de {precioA1} ({fmt(precioVar1, 0)} %) y{' '}
              {precioA} ({fmt(precioVar, 0)} %{precioA === PRECIO_PARCIAL.anio ? `, ${PRECIO_PARCIAL.periodo}` : ''}) se parecen a las de 2005–2006.
            </>
          ),
          aniosU > anios2 && (
            <>
              Se vuelve a alejar del sueldo: de {fmt(anios2, 1)} años de ingresos en {aniosA2} a {fmt(aniosU, 1)} en {aniosA}.
            </>
          ),
          <>
            Que se construya poco evita una <T k="burbuja">burbuja</T> de ladrillo, pero deja menos casas nuevas para una demanda que crece.
          </>,
        ])}
        graficas={[
          {id: 'g-precio', lab: 'Precio de la vivienda'},
          {id: 'viv-anios', lab: 'Años de sueldo para comprar'},
          {id: 'viv-esfuerzo', lab: 'Parte del sueldo para la hipoteca'},
          {id: 'viv-compraventas', lab: 'Compraventas e hipotecas'},
          {id: 'g-viv', lab: 'Viviendas'},
        ]}
      />

      <Cuestion
        pregunta="¿Se construye vivienda protegida?"
        veredicto="Poca"
        tono="matiz"
        conclusion={
          <>
            En {vpoA} se terminaron {mil(vpoU)} <T k="vivienda-protegida">viviendas protegidas</T>: {veces(VIV.vpo['1986'] / vpoU, 'menos')} que en 1986 (
            {mil(VIV.vpo['1986'])}) y {parte(vpoU / VIV.vpo['2008'])} que en 2008 ({mil(VIV.vpo['2008'])}).
            {vpoU > vpoMin && ` Desde el mínimo de ${vpoMinA} se ha recuperado algo.`}
          </>
        }
        positivo={lista([
          vpoMaxA !== vpoMinA && (
            <>
              Vuelve a subir: de {mil(vpoMin)} en {vpoMinA} a {mil(vpoMax)} en {vpoMaxA}, {veces(vpoMax / vpoMin, 'más')} y{' '}
              {vpoDesde ? `el máximo desde ${vpoDesde}` : 'el máximo de la serie'}.
            </>
          ),
          <>
            Además, el {fmt(alqReducido, 1)} % de los hogares vive de alquiler por debajo del precio de mercado (alquiler social,{' '}
            <T k="renta-antigua">renta antigua</T>…).
          </>,
        ])}
        negativo={lista([
          <>
            Es muy poco frente a la demanda: desde 2021 hay unos {decenasDeMil(nuevos.alAnio)} hogares nuevos al año, unas{' '}
            {fmt(nuevos.alAnio / vpoU, 0)} veces más que las protegidas de {vpoA} (cálculo propio, orientativo).
          </>,
          vpoU < vpo1 && (
            <>
              En {vpoA} bajaron otra vez respecto a {vpoA1} (de {mil(vpo1)} a {mil(vpoU)}).
            </>
          ),
        ])}
        graficas={[
          {id: 'viv-vpo', lab: 'Viviendas protegidas'},
          {id: 'viv-tenencia', lab: 'Propiedad y alquiler'},
        ]}
      />

      <Cuestion
        pregunta="¿La okupación es un problema masivo?"
        veredicto="No realmente"
        tono="falso"
        conclusion={
          <>
            En {okA} la policía conoció {mil(okU)} casos de <T k="usurpacion">usurpación</T> o <T k="allanamiento">allanamiento</T>: unos {fmt(VIV.okupa10k[okA], 1)} por cada
            10.000 viviendas. Casi todos son de viviendas que no son la casa habitual de nadie; que ocupen la casa donde vive alguien (allanamiento) fueron 515 casos en 2024. Para quien lo sufre es un problema serio, pero <b>es poco frecuente</b>.
          </>
        }
        positivo={lista([
          <>Es raro: afecta cada año a en torno al {fmt(VIV.okupa10k[okA] / 100, 2)} % de las viviendas.</>,
          okU < okMax && (
            <>
              Baja desde el máximo de {okMaxA}: de {mil(okMax)} a {mil(okU)} casos en {okA}, un {fmt(-variacion(okMax, okU), 0)} % menos.
            </>
          ),
        ])}
        negativo={lista([
          okU >= okMax && (
            <>
              Está en su máximo: {mil(okU)} casos en {okA}.
            </>
          ),
          <>
            Ha crecido mucho en una década: {veces(okU / VIV.okupa['2013'], 'más')} que en 2013 ({mil(VIV.okupa['2013'])}).
          </>,
          <>
            Son denuncias conocidas: no cuentan los casos no denunciados ni dicen cuántas viviendas están ocupadas a la vez, ni cuánto tarda en
            resolverse cada caso.
          </>,
        ])}
        graficas={[{id: 'viv-okupa', lab: 'Okupación'}]}
      />

      <Cuestion
        pregunta="¿Sigue habiendo tantos desahucios como en la crisis?"
        veredicto="No, muchos menos"
        tono="falso"
        conclusion={
          <>
            En {desA} hubo {mil(desU)} <T k="lanzamiento">lanzamientos</T>, un {fmt(-variacion(desMax, desU), 0)} % menos que en {desMaxA} (
            {mil(desMax)}). Pero han cambiado: <b>hoy {deCada(desAlqU / desU)} son por no pagar el alquiler</b>, no la hipoteca.
          </>
        }
        positivo={lista([
          <>
            Los desahucios por hipoteca casi han desaparecido: de {mil(hipMax)} en {hipMaxA} a {mil(hipU)} en {desA}, un{' '}
            {fmt(-variacion(hipMax, hipU), 0)} % menos.
          </>,
          avance != null && (
            <>
              {avance.n * 2 < desU ? 'Siguen bajando: ' : ''}
              {mil(avance.n)} en {avance.periodo} de {avance.anio}, {avance.n * 2 < desU ? 'menos' : 'más'} de la mitad del total de {desA}.
            </>
          ),
        ])}
        negativo={[
          <>Aún son unos {fmt(desU / 365, 0)} al día (cálculo propio con el dato de {desA}).</>,
          <>
            Los de alquiler bajan mucho menos: de {mil(VIV.desAlq[desMaxA])} en {desMaxA} a {mil(desAlqU)} en {desA}, {parte(desAlqU / VIV.desAlq[desMaxA])}
            . Con el alquiler subiendo, los inquilinos son hoy los más expuestos.
          </>,
        ]}
        graficas={[
          {id: 'viv-desahucios', lab: 'Desahucios'},
          {id: 'viv-alquiler', lab: 'Precio del alquiler'},
        ]}
      />
    </Cuestiones>
  );
}
