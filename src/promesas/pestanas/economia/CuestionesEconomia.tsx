import {ANNUAL, CLASES, COFOG, FISCAL, IPCDIC, PENS, PREV, RETA, SIN_HOGAR, STEPS} from '../../datos';
import {fmt} from '../../lib/formato';
import {Cuestion, Cuestiones} from '../../componentes/Cuestiones';
import {T} from '../../../comun/Glosario';
import extra from '../../datos/economia/cuestiones.json';
import {anios, anterior, maximo, miles, minimo, ultimo} from './series';
import {PENSIONES_A_MANO as PA, TARIFA_PLANA, TRAMOS_RETA} from './cifrasAMano';

/*
  Cuestiones frecuentes sobre el dinero publico, las pensiones y la renta.
  Las cifras salen de las graficas de la pestaña y de sus (i); las dos que
  no estan ahi (presion fiscal de Eurostat con la media de la UE, y el gasto
  en gobiernos, parlamentos, Hacienda y exteriores) estan en
  datos/economia/cuestiones.json con su fuente. Sin partidos: solo datos.
  Los años "de hoy" se leen del ultimo dato de cada serie; los años fijos
  que quedan son referencias historicas (1986, 2008, 2020...).
*/
// Con espacio duro para que la unidad no se quede sola en otra linea
const e0 = (v: number) => fmt(v, 0) + ' €';
const p1 = (v: number) => fmt(v, 1) + ' %';
const mil = (v: number) => fmt(v, 1) + ' mil M€';
const millones = (v: number) => fmt(Math.round(v * 1000), 0) + ' millones de euros';
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Cambio del poder de compra de las pensiones entre dos años: subida de cada año frente al IPC de diciembre anterior (calculo propio) */
function poderCompra(a: number, b: number) {
  let r = 1;
  for (let t = a; t <= b; t++) r *= (1 + PREV[t] / 100) / (1 + IPCDIC[t - 1] / 100);
  return (r - 1) * 100;
}
/** Deficit (gasto menos ingresos) de un año, miles de M€ */
const deficit = (y: string) => FISCAL[y][0] - FISCAL[y][1];
/** Primer año de la racha de deficit que llega hasta el ultimo dato (null si el ultimo año no hubo deficit) */
function deficitDesde() {
  const ys = anios(FISCAL);
  let i = ys.length - 1;
  if (deficit(ys[i]) <= 0) return null;
  while (i > 0 && deficit(ys[i - 1]) > 0) i--;
  return ys[i];
}
/** Ultimo valor de una serie escalonada (IVA, IRPF) */
const ultimoTramo = (k: string) => STEPS[k].at(-1)!;
const MESES: Record<string, string> = {
  ene: 'enero', feb: 'febrero', mar: 'marzo', abr: 'abril', may: 'mayo', jun: 'junio',
  jul: 'julio', ago: 'agosto', sep: 'septiembre', oct: 'octubre', nov: 'noviembre', dic: 'diciembre',
};
/** 'sep 2012' → 'septiembre de 2012'; '2021' → '2021' */
const fechaLarga = (s: string) => s.replace(/^([a-z]{3}) (\d{4})$/, (m, mes, a) => (MESES[mes] ? `${MESES[mes]} de ${a}` : m));
/** Que parte es a de b, en palabras: «más de la mitad», «casi el triple»… */
function proporcion(r: number) {
  if (r >= 2.5 && r < 3) return 'casi el triple';
  if (r >= 1.5 && r < 2) return 'casi el doble';
  if (r >= 1) return `${fmt(r, 1)} veces lo`;
  if (r > 0.5) return 'más de la mitad';
  return `el ${fmt(r * 100, 0)} %`;
}
/** Una serie sin uno de sus años */
const sin = (s: Record<string, number>, k: string) => Object.fromEntries(Object.entries(s).filter(([y]) => y !== k));

export default function CuestionesEconomia() {
  const pf = ANNUAL.pf, deuda = ANNUAL.deuda, smi = ANNUAL.smi, precio = ANNUAL.precio;
  const [aPf, pfU] = ultimo(pf), [aPfMax, pfMax] = maximo(pf);
  const [aDeuda, deudaU] = ultimo(deuda), [aDeudaMax, deudaMax] = maximo(deuda);
  const [aPrecio, precioU] = ultimo(precio);
  const [aF] = ultimo<number[]>(FISCAL), desde = deficitDesde();

  // Presion fiscal de Eurostat: ultimo año con dato de la UE, y el record anterior de España
  const eu = extra.presionFiscalEurostat;
  const [aEu, ueU] = ultimo<number>(eu.ue27), esU: number = (eu.espana as Record<string, number>)[aEu];
  const [aRec, rec] = maximo(sin(eu.espana, aEu));
  const frenteRecord =
    r1(esU) === r1(rec) ? `, igual que el récord de ${aRec}` : esU > rec ? `, por encima del récord anterior (${p1(rec)} en ${aRec})` : `, cerca del récord de ${aRec} (${p1(rec)})`;

  // Gasto por funciones (COFOG): ultimo año y 1995
  const [aCof, cU] = ultimo<Record<string, number[]>>(COFOG), c95 = COFOG['1995'];
  const pctGasto = (c: Record<string, number[]>, k: string) => (c[k][0] / c.total[0]) * 100;
  const social = ['pens', 'prot', 'san', 'edu'].reduce((s, k) => s + pctGasto(cU, k), 0);
  const gob = extra.gobiernoParlamentosHaciendaExteriores, gobPct = (gob.millones / gob.gastoTotalMillones) * 100;
  const intEdu = proporcion(cU.int[0] / cU.edu[0]);
  const iva = ultimoTramo('iva'), irpf = ultimoTramo('irpf'), irpf86 = STEPS.irpf[0];
  const ivaMax = iva[1] >= Math.max(...STEPS.iva.map((t) => t[1]));

  // Pensiones: ultimo dato de cada serie y ultimo año con IPC del año anterior
  const [aPm, mediaU] = ultimo(PENS.media as Record<string, number>), smiPm = smi[aPm] ?? ultimo(smi)[1];
  const [aMinima, minimaU] = ultimo(PENS.minima as Record<string, number>), [, pncU] = ultimo(PENS.pnc as Record<string, number>);
  const aRev = +anios(PREV).filter((t) => IPCDIC[+t - 1] != null).at(-1)!;
  const gastoPct = PENS.gastoPct as Record<string, number>;
  const [aG, gU] = ultimo(gastoPct), [aGMax, gMax] = maximo(gastoPct);
  const ult3 = anios(gastoPct).slice(-3).map((k) => gastoPct[k]), estable = Math.max(...ult3) - Math.min(...ult3) <= 0.3;
  const gastoPA = `${fmt(PA.gastoMillones, 0)} millones de euros${PA.anio === aG ? '' : ` en ${PA.anio}`}`;

  // Renta: ultima encuesta de condiciones de vida
  const [anioEcv, med] = ultimo(CLASES.medianaEurosAnio);
  const mes = (f: number) => e0(Math.round((med * f) / 12));
  const umbral = Math.round((med * 0.6) / 12), pnc12 = Math.round((pncU * 14) / 12);
  // Ingresos del hogar tipico (encuestas 2014 → ultima, ingresos del año anterior) frente a los precios de dic. 2013 → dic. del año anterior (calculo propio)
  let ipcAcum = 1;
  for (let t = 2014; t <= +anioEcv - 1; t++) ipcAcum *= 1 + IPCDIC[t] / 100;
  const subeMediana = (med / CLASES.medianaEurosAnio['2014'] - 1) * 100, subeIpc = (ipcAcum - 1) * 100;
  const mediaEcv = CLASES.media[anioEcv as keyof typeof CLASES.media], bajaEcv = CLASES.baja[anioEcv as keyof typeof CLASES.baja];
  const [, pobU] = ultimo(CLASES.pobreza), [aPobMax, pobMax] = maximo(CLASES.pobreza), pobEsMin = minimo(CLASES.pobreza)[0] === anioEcv;
  const [, sevU] = ultimo(CLASES.pobrezaSevera);
  const phogue = Object.values(CLASES.pobrezaPhogue);
  const aniosPobreza = Math.round((+anioEcv - 1995) / 5) * 5;

  // Personas sin hogar: ultima encuesta y la anterior; plazas de albergue
  const [aSh, vSh] = ultimo(SIN_HOGAR.personas), [aSh0, vSh0] = anterior(SIN_HOGAR.personas);
  const [aCe, vCe] = ultimo(SIN_HOGAR.alojadosMediaDiaria);

  // Autonomos
  const [aBajo, bajoU] = ultimo<number>(RETA.bajo), [aMinR, minimaR] = ultimo<number>(RETA.minima), altoU: number = RETA.alto[aBajo];
  const aAlto0 = anios(RETA.alto)[0];
  const [aAfil, afilU] = ultimo<number>(RETA.afil), afilMax = maximo(RETA.afil)[0] === aAfil;

  return (
    <Cuestiones
      intro={
        <>
          Preguntas que se hace mucha gente sobre impuestos, gasto público, pensiones y renta, respondidas con los datos de las gráficas de arriba.
          Cada respuesta tiene su lado bueno y su lado malo. Aquí no se culpa ni se aplaude a ningún partido: pulsa cada pregunta y, si quieres,
          ve a la gráfica que lo respalda.
        </>
      }
    >
      <Cuestion
        pregunta="¿Pagamos más impuestos que nunca?"
        veredicto="Casi cierto"
        tono="cierto"
        conclusion={
          <>
            Si se mide frente a todo lo que produce el país, estamos {esU >= rec ? 'en máximos' : 'cerca de máximos'}: impuestos y{' '}
            <T k="cotizaciones">cotizaciones</T> fueron el {p1(esU)} del <T k="pib">PIB</T> en {aEu} según Eurostat{frenteRecord}. Con la serie de
            la <T k="ocde">OCDE</T> de la gráfica, el {p1(pfU)} en {aPf}
            {aPf === aPfMax ? ', su máximo' : `, ${pfMax - pfU < 1 ? 'muy cerca de' : 'por debajo de'} su máximo (${p1(pfMax)} en ${aPfMax})`}. Aun
            así, España recauda menos que la media de la Unión Europea ({p1(ueU)}).
          </>
        }
        positivo={[
          <>
            Pagamos menos que la media europea: {p1(esU)} del PIB frente al {p1(ueU)} de la UE en {aEu} (Eurostat).
          </>,
          <>
            El tipo máximo del <T k="irpf">IRPF</T> ({irpf[1]} % desde {irpf[2]}) está lejos del {irpf86[1]} % de {irpf86[2]}.
          </>,
          <>
            Al recaudar más, el agujero de las cuentas se ha reducido: el <T k="deficit">déficit</T> pasó de {mil(deficit('2020'))} en 2020 a{' '}
            {mil(deficit(aF))} en {aF}.
          </>,
          <>Casi dos de cada tres euros que se gastan van a pensiones, sanidad, educación y ayudas (ver la pregunta sobre el gasto).</>,
        ]}
        negativo={[
          <>
            La <T k="presion-fiscal">presión fiscal</T> ha subido casi {fmt(Math.round(pfU - pf['1986']), 0)} puntos del PIB desde 1986 (
            {p1(pf['1986'])} entonces, {p1(pfU)} en {aPf}, OCDE).
          </>,
          <>
            El <T k="iva">IVA</T> general está {ivaMax ? 'en su máximo' : 'en el'}: {iva[1]} % desde {fechaLarga(iva[2])}. Y lo paga igual quien gana
            poco que quien gana mucho.
          </>,
          <>
            Aun así no llega para todo: las administraciones gastan más de lo que ingresan{' '}
            {desde ? `todos los años desde ${desde}` : 'casi todos los años'}.
          </>,
          <>Es una media del país: no dice cuánto paga cada persona, que depende de lo que gana, de dónde vive y de lo que consume.</>,
        ]}
        graficas={[
          {id: 'g-pf', lab: 'Presión fiscal'},
          {id: 'g-iva', lab: 'IVA'},
          {id: 'g-irpf', lab: 'IRPF máximo'},
          {id: 'g-gasto', lab: 'Gasto e ingresos'},
        ]}
      />

      <Cuestion
        pregunta="¿El dinero público se va en políticos?"
        veredicto="Falso"
        tono="falso"
        conclusion={
          <>
            No. En {aCof} las administraciones gastaron unos {fmt(Math.round(cU.total[0]), 0)} mil millones de euros y el {fmt(social, 0)} % fue a
            pensiones, sanidad, educación y ayudas (paro, familia y otras). Todo lo que cuestan los gobiernos, los parlamentos, Hacienda y la
            acción exterior juntos, y no solo sus cargos, fue {fmt(gob.millones, 0)} millones: el {fmt(gobPct, 0)} % del gasto (Eurostat).
          </>
        }
        positivo={[
          <>
            La partida más grande son las pensiones: {millones(cU.pens[0])}, el {fmt(pctGasto(cU, 'pens'), 0)} % de todo el gasto ({aCof}).
          </>,
          <>
            La «Administración general» pesa casi lo mismo que hace {Math.round((+aCof - 1995) / 5) * 5} años: el {p1(pctGasto(c95, 'gen'))} del
            gasto en 1995 y el {p1(pctGasto(cU, 'gen'))} en {aCof}. Y no es solo política: incluye también la investigación básica, la ayuda al
            desarrollo y los servicios comunes de las administraciones.
          </>,
          <>
            Se mide igual en toda la UE (clasificación <T k="cofog">COFOG</T>), así que se puede comparar con otros países.
          </>,
        ]}
        negativo={[
          <>
            Un {fmt(gobPct, 0)} % sigue siendo mucho dinero: {fmt(gob.millones, 0)} millones de euros en un año.
          </>,
          <>
            Los <T k="intereses-de-la-deuda">intereses de la deuda</T> costaron {millones(cU.int[0])} en {aCof}: {intEdu} de lo que se gasta en
            educación ({millones(cU.edu[0])}).
          </>,
          <>Que una partida sea pequeña no dice si se gasta bien: estas cifras no miden la eficiencia, las duplicidades ni la corrupción.</>,
        ]}
        graficas={[
          {id: 'cofog', lab: 'En qué se gasta'},
          {id: 'g-gasto', lab: 'Gasto e ingresos'},
        ]}
      />

      <Cuestion
        pregunta="¿Los pensionistas pierden poder de compra?"
        veredicto="Ahora no"
        tono="matiz"
        conclusion={
          <>
            Depende de los años. Desde 2022 la ley sube las pensiones lo mismo que los precios. Entre 2010 y 2017, en cambio, subieron menos que el{' '}
            <T k="ipc">IPC</T> y perdieron cerca de un {fmt(-poderCompra(2010, 2017), 1)} % de{' '}
            <T k="poder-de-compra">poder de compra</T> (cálculo propio con la gráfica). En {aPm} la pensión media de jubilación es de{' '}
            {e0(mediaU)} al mes, en 14 pagas.
          </>
        }
        positivo={[
          <>
            Con la subida de 2023 ({fmt(PREV['2023'], 1)} %) se recuperó lo perdido con la <T k="inflacion">inflación</T> de 2021 y 2022: de 2023 a{' '}
            {aRev} las pensiones ganaron un {fmt(poderCompra(2023, aRev), 1)} % sobre los precios (cálculo propio).
          </>,
          <>
            Las más bajas han subido más: la <T k="pension-minima">mínima con cónyuge</T>, de {e0(PENS.minima['2022'])} en 2022 a {e0(minimaU)}{' '}
            en {aMinima}; la <T k="pension-no-contributiva">no contributiva</T>, de {e0(PENS.pnc['2022'])} a {e0(pncU)}.
          </>,
          <>
            La pensión media de jubilación ({e0(mediaU)}) {mediaU > smiPm ? 'supera hoy al' : 'sigue por debajo del'}{' '}
            <T k="salario-minimo">salario mínimo</T> ({e0(smiPm)}). En 1986 estaba por debajo ({e0(PENS.media['1986'])} frente a{' '}
            {e0(smi['1986'])}).
          </>,
        ]}
        negativo={[
          <>
            Lo perdido entre 2010 y 2017 no se devolvió del todo: sumando de 2010 a {aRev}, las pensiones quedan un{' '}
            {fmt(-poderCompra(2010, aRev), 1)} % por debajo de los precios (cálculo propio).
          </>,
          <>
            La no contributiva ({e0(pncU)} en 14 pagas, unos {e0(pnc12)} al mes en 12) {pnc12 < umbral ? 'sigue por debajo del' : 'ya supera el'}{' '}
            <T k="umbral-de-pobreza">umbral de pobreza</T> de una persona sola ({mes(0.6)} al mes; cálculo propio).
          </>,
          <>
            La pensión media sube también porque los nuevos jubilados cobran más que los antiguos: no es lo que sube la pensión de cada uno.
          </>,
        ]}
        graficas={[
          {id: 'eco-pension-ipc', lab: 'Pensiones frente a precios'},
          {id: 'eco-pension-cuantia', lab: 'Cuánto se cobra'},
        ]}
      />

      <Cuestion
        pregunta="¿Se podrán seguir pagando las pensiones?"
        veredicto="Sí, con más esfuerzo"
        tono="matiz"
        conclusion={
          <>
            Hoy se pagan todas, pero cuestan cada vez más: el gasto en <T k="pension-contributiva">pensiones contributivas</T> pasó del{' '}
            {p1(gastoPct['2007'])} del PIB en 2007 al {p1(gU)} en {aG} ({gastoPA}). Hay {fmt(PA.numeroMillones, 1)} millones de pensiones, casi el
            doble que en {PA.anioInicio}. Y lo más caro está por llegar: en los próximos años se jubila la generación del{' '}
            <T k="baby-boom">«baby boom»</T>. Que salgan las cuentas depende de decisiones: cuánto se <T k="cotizaciones">cotiza</T>, cuántos
            impuestos se pagan y cómo se calculan las pensiones.
          </>
        }
        positivo={[
          <>
            {estable ? `El gasto lleva tres años estable, en torno al ${p1(gU)} del PIB` : `El gasto está en el ${p1(gU)} del PIB (${aG})`},
            después del pico del {p1(gMax)} en {aGMax}
            {aGMax === '2020' ? ' (cuando el PIB se hundió por la pandemia)' : ''}.
          </>,
          <>
            Los ingresos públicos crecen más que el gasto desde 2020 y el <T k="deficit">déficit</T> ha bajado de {mil(deficit('2020'))} a{' '}
            {mil(deficit(aF))} en {aF}.
          </>,
          <>
            Hay más dinero para pagarlas: los impuestos y cotizaciones pasaron de {mil(FISCAL['2019'][2])} en 2019 a {mil(FISCAL[aF][2])} en {aF}{' '}
            (sin descontar la inflación).
          </>,
        ]}
        negativo={[
          <>
            Ya son la partida más grande del gasto público: el {p1(pctGasto(cU, 'pens'))} en {aCof}, casi tanto como sanidad y educación juntas (
            {p1(pctGasto(cU, 'san') + pctGasto(cU, 'edu'))}).
          </>,
          <>
            Las cuentas públicas no cuadran: hay déficit {desde ? `todos los años desde ${desde}` : 'casi todos los años'} y la{' '}
            <T k="deuda-publica">deuda</T> está en el {p1(deudaU)} del PIB.
          </>,
          <>
            Habrá más jubilados por cada persona que trabaja durante las próximas décadas, según las proyecciones de la <T k="airef">AIReF</T> y la
            Comisión Europea.
          </>,
        ]}
        graficas={[
          {id: 'eco-pension-gasto', lab: 'Gasto en pensiones'},
          {id: 'cofog', lab: 'En qué se gasta'},
          {id: 'g-deuda', lab: 'Deuda'},
        ]}
      />

      <Cuestion
        pregunta="¿La clase media está desapareciendo?"
        veredicto="Falso"
        tono="falso"
        conclusion={
          <>
            Por ingresos, no. En {anioEcv} el {p1(mediaEcv)} de la población vivía en un hogar de clase media, casi lo mismo que en 2004 (
            {p1(CLASES.media['2004'])}). Bajó con la crisis ({p1(CLASES.media['2014'])} en 2014) y se ha recuperado. Lo que sí ha cambiado mucho es
            lo que cuesta una casa.
          </>
        }
        positivo={[
          <>
            La clase baja ha pasado del {p1(CLASES.baja['2014'])} de 2014 al {p1(bajaEcv)} en {anioEcv}.
          </>,
          <>
            Los ingresos del <T k="mediana">hogar típico</T> subieron un {fmt(subeMediana, 0)} % entre las encuestas de 2014 y {anioEcv},{' '}
            {subeMediana > subeIpc ? 'más' : 'menos'} que los precios en ese tiempo ({fmt(subeIpc, 0)} %; cálculo propio con los datos del INE).
          </>,
        ]}
        negativo={[
          <>
            Solo mide ingresos, no patrimonio ni gastos. La vivienda cuesta {fmt(precioU, 0)} €/m² en {aPrecio},{' '}
            {precioU > precio['2008'] ? 'más' : 'menos'} que en el pico de 2008 ({fmt(precio['2008'], 0)} €/m²) y un{' '}
            {fmt((precioU / precio['2014'] - 1) * 100, 0)} % más que en 2014.
          </>,
          <>{Math.round(bajaEcv / 10)} de cada 10 personas siguen en la clase baja.</>,
          <>
            El listón es bajo: una persona sola que ingresa {mes(0.75)} netos al mes ya cuenta como clase media ({anioEcv}).
          </>,
        ]}
        graficas={[
          {id: 'eco-clases', lab: 'Clases según ingresos'},
          {id: 'g-precio', lab: 'Precio de la vivienda'},
        ]}
      />

      <Cuestion
        pregunta="¿Hay más pobreza que antes?"
        veredicto="No, pero no baja"
        tono="matiz"
        conclusion={
          <>
            El <T k="riesgo-de-pobreza">riesgo de pobreza</T> es del {p1(pobU)} ({anioEcv})
            {pobEsMin ? ', la cifra más baja desde que empezó la encuesta en 2004' : ''}. Pero apenas se mueve: desde mediados de los noventa ronda
            a una de cada cinco personas. Lo que sí ha crecido es el número de personas sin hogar.
          </>
        }
        positivo={[
          <>
            La <T k="pobreza-severa">pobreza severa</T> ha {sevU <= CLASES.pobrezaSevera['2015'] ? 'bajado' : 'subido'} del{' '}
            {p1(CLASES.pobrezaSevera['2015'])} en 2015 al {p1(sevU)} en {anioEcv}.
          </>,
          <>
            El riesgo de pobreza está {fmt(pobMax - pobU, 1)} puntos por debajo del pico de {aPobMax} ({p1(pobMax)}).
          </>,
        ]}
        negativo={[
          <>
            Una de cada cinco personas lleva {aniosPobreza} años en riesgo de pobreza: entre el {Math.min(...phogue)} % y el {Math.max(...phogue)} %
            de 1995 a 2001, y el {p1(pobU)} hoy.
          </>,
          <>
            Más personas sin hogar: {fmt(vSh, 0)} en {aSh}, un {fmt((vSh / vSh0 - 1) * 100, 1)} % más que en {aSh0}
            {aSh === '2022' && <>, y {fmt(SIN_HOGAR.enLaCalle2022, 0)} dormían en la calle</>}. Las plazas de albergue ocupadas subieron a{' '}
            {fmt(vCe, 0)} en {aCe}
            {aCe === '2024' ? ', sobre todo en centros para inmigrantes' : ''}.
          </>,
          <>
            Ojo, es <T k="pobreza-relativa">pobreza relativa</T>: se cuenta a quien ingresa menos del 60 % de lo normal ({mes(0.6)} al mes para una
            persona sola en {anioEcv}). Si todos ganan más, el umbral también sube.
          </>,
        ]}
        graficas={[
          {id: 'eco-pobreza', lab: 'Pobreza'},
          {id: 'eco-sin-hogar', lab: 'Personas sin hogar'},
        ]}
      />

      <Cuestion
        pregunta="¿La deuda pública está disparada?"
        veredicto="Alta, pero bajando"
        tono="matiz"
        conclusion={
          <>
            La <T k="deuda-publica">deuda</T> es el {p1(deudaU)} del <T k="pib">PIB</T> ({aDeuda}): {proporcion(deudaU / deuda['2007'])} que en
            2007 ({p1(deuda['2007'])}). Se disparó con la crisis de 2008 y con la pandemia ({p1(deuda['2020'])} en 2020). Desde entonces baja en
            proporción al PIB, sobre todo porque el PIB crece: cada año se sigue gastando más de lo que se ingresa.
          </>
        }
        positivo={[
          <>
            Está {fmt(deudaMax - deudaU, 0)} puntos por debajo del máximo de {aDeudaMax}.
          </>,
          <>
            Pagar <T k="intereses-de-la-deuda">intereses</T> cuesta menos que en los noventa: el {p1(cU.int[1])} del PIB en {aCof}, frente al{' '}
            {p1(c95.int[1])} en 1995, cuando la deuda era mucho menor ({p1(deuda['1995'])}).
          </>,
          <>
            El <T k="deficit">déficit</T> se ha reducido: de {mil(deficit('2020'))} en 2020 a {mil(deficit(aF))} en {aF}.
          </>,
        ]}
        negativo={[
          <>
            Los intereses costaron {millones(cU.int[0])} en {aCof}: {intEdu} de todo el gasto en educación.
          </>,
          <>
            Hay déficit {desde ? `todos los años desde ${desde}` : 'casi todos los años'}, así que la deuda en euros sigue creciendo.
          </>,
          <>
            Con tanta deuda, una subida de los <T k="tipos-de-interes">tipos de interés</T> o una nueva crisis deja menos margen para gastar en
            otras cosas.
          </>,
        ]}
        graficas={[
          {id: 'g-deuda', lab: 'Deuda pública'},
          {id: 'g-gasto', lab: 'Gasto e ingresos'},
          {id: 'cofog', lab: 'En qué se gasta'},
        ]}
      />

      <Cuestion
        pregunta="¿Ser autónomo sale cada vez más caro?"
        veredicto="Depende de lo que ganes"
        tono="matiz"
        conclusion={
          <>
            Desde {+aMinR + 1} cada <T k="autonomo">autónomo</T> paga según lo que gana. Quien gana poco paga menos que antes: unos {e0(bajoU)} al
            mes en {aBajo}, frente a los {e0(minimaR)} de la cuota mínima de {aMinR}. Quien gana más de {miles(TRAMOS_RETA.masDe)} € netos al mes
            paga {e0(altoU)}. Hay {fmt(afilU / 1000, 2)} millones de autónomos ({aAfil}){afilMax ? ', la cifra más alta de la serie' : ''}.
          </>
        }
        positivo={[
          <>
            Quien menos gana paga unos {e0(minimaR - bajoU)} menos al mes que con la antigua cuota mínima.
          </>,
          <>
            Quien empieza tiene una <T k="tarifa-plana">tarifa plana</T> de {TARIFA_PLANA} € al mes.
          </>,
          <>Antes la mayoría pagaba la cuota mínima, ganara lo que ganara; ahora lo que se paga se parece más a lo que se gana.</>,
        ]}
        negativo={[
          <>
            Quien más gana paga cada vez más: el tramo más alto ha pasado de {e0(RETA.alto[aAlto0])} en {aAlto0} a {e0(altoU)} en {aBajo}.
          </>,
          <>
            Su número apenas crece: {fmt(RETA.afil['2008'] / 1000, 2)} millones en 2008 y {fmt(afilU / 1000, 2)} en {aAfil}.
          </>,
          <>Hay que calcular lo que se va a ganar; si al final se gana más, la Seguridad Social reclama la diferencia al año siguiente.</>,
        ]}
        graficas={[
          {id: 'eco-autonomos-cuota', lab: 'Cuota de autónomos'},
          {id: 'eco-autonomos-numero', lab: 'Número de autónomos'},
        ]}
      />
    </Cuestiones>
  );
}
