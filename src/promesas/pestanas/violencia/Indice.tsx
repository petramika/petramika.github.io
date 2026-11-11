import {DONDE_NACIERON, VIOLENCIA as V} from '../../datos';
import {fmt} from '../../lib/formato';
import Mini from '../../componentes/graficas/Mini';
import {L} from '../../componentes/enlace';
import {TIPOS, type Serie} from './TiposViolencia';

const EUROSTAT = 'https://ec.europa.eu/eurostat/databrowser/view/crim_off_cat/default/table';
const UNODC =
  'https://unodc.org/unodc/press/releases/2023/December/fifty-two-people-lost-their-lives-to-homicide-globally-every-hour-in-2021--says-new-report-from-unodc.html';
const INTERIOR = 'https://estadisticasdecriminalidad.ses.mir.es/';
const INE_POB = 'https://www.ine.es/jaxiT3/Tabla.htm?t=56936';
const COL_ES = '#E8590C';

type Indicador = {tasas: Record<string, number>; mediaUE: number; espana2024: number | null; puestoEspana: number; paisesConDato: number};
const E = V.europa as {anio: number; paises: Record<string, string>; indicadores: Record<string, Indicador>};
const W = V.mundoHomicidios;

const INDICADORES: {k: string; lab: string; nota: string}[] = [
  {k: 'homicidios', lab: 'Homicidios', nota: 'Es la cifra que mejor se compara entre países: un muerto se registra casi igual en todas partes.'},
  {k: 'robos', lab: 'Robos con violencia', nota: 'Robos con violencia o intimidación, como los tirones o los atracos en la calle.'},
  {k: 'violaciones', lab: 'Violaciones registradas', nota: 'Se compara mal: depende de cuánto se denuncia y de qué cuenta cada ley como violación.'},
  {k: 'violenciaSexual', lab: 'Violencia sexual registrada', nota: 'Los países con más igualdad, como Suecia o Dinamarca, registran más porque se denuncia más y sus leyes son más amplias.'},
];

/** Nivel de España frente a la media de la UE: menos del 80 %, bajo; más del 120 %, alto */
const nivel = (es: number, media: number): {txt: string; cls: string} =>
  es < media * 0.8 ? {txt: 'Bajo', cls: 'ok'} : es > media * 1.2 ? {txt: 'Alto', cls: 'ko'} : {txt: 'Medio', cls: 'half'};

const puestoTxt = (i: Indicador) =>
  i.puestoEspana === i.paisesConDato
    ? `la más alta de ${i.paisesConDato} países`
    : i.puestoEspana === 1
      ? `la más baja de ${i.paisesConDato} países`
      : `puesto ${i.puestoEspana} de ${i.paisesConDato}, contando desde la más baja`;

export function calcTasas() {
  const pob = DONDE_NACIERON.totalPoblacion as Serie;
  const anios = Object.keys(V.tipos.lesiones.hombres).filter((a) => pob[a] != null);
  const victimas = (filtro: (t: (typeof TIPOS)[number]) => boolean): Serie =>
    Object.fromEntries(
      anios.map((a) => [a, TIPOS.filter(filtro).reduce((s, t) => s + V.tipos[t.k].hombres[a] + V.tipos[t.k].mujeres[a], 0)]),
    );
  const porCienMil = (s: Serie): Serie => Object.fromEntries(anios.map((a) => [a, (s[a] / pob[a]) * 1e5]));
  return {
    anios,
    pob,
    total: porCienMil(victimas(() => true)),
    sexual: porCienMil(victimas((t) => !!t.sexual)),
    noSexual: porCienMil(victimas((t) => !t.sexual)),
  };
}

/** Lo que explica el (i) de la caja de arriba sobre la tasa y la comparacion con la UE */
export function NotaIndice() {
  const {anios} = calcTasas();
  const a = anios[anios.length - 1];
  return (
    <>
      <p>
        <b>Tasa:</b> víctimas registradas de cada {a} entre la población a 1 de enero, por cada 100.000 habitantes. Así se puede comparar entre
        años y países aunque cambie la población.
      </p>
      <p>
        <b>Comparación con la UE:</b> delitos registrados por la policía de cada país por cada 100.000 habitantes, {E.anio}, el último año con
        todos los países. La media de la UE es la de toda su población junta (cálculo propio). Nivel: bajo si España está por debajo del 80 % de
        la media, alto si pasa del 120 %.
      </p>
      <p>
        Eurostat avisa de que comparar países con datos policiales es delicado: cada ley define los delitos a su manera, y cada sociedad
        denuncia de forma distinta. Lo más fiable son los homicidios. Para la violencia sexual, más denuncias suele querer decir más confianza
        en la policía, no más violencia.
      </p>
      <p className="srcl">
        Fuentes: {L('Eurostat, delitos registrados por la policía (crim_off_cat)', EUROSTAT)}; {L('UNODC, Global Study on Homicide 2023', UNODC)};{' '}
        {L('Ministerio del Interior', INTERIOR)}; {L('INE, población', INE_POB)}.
      </p>
    </>
  );
}

/** ¿Mucha o poca violencia? Nivel de España frente a la UE en cada delito */
export default function Indice() {
  return (
    <div id="vio-indice">

      <dl className="cuenta">
        {INDICADORES.map(({k, lab, nota}) => {
          const i = E.indicadores[k];
          const es = i.tasas.ES;
          const n = nivel(es, i.mediaUE);
          const seDenunciaPoco = k === 'violaciones' || k === 'violenciaSexual';
          return (
            <div key={k} className={seDenunciaPoco ? undefined : n.cls}>
              <dt>
                {lab}: {n.txt}
              </dt>
              <dd>
                {fmt(es, es < 10 ? 2 : 1)} por cada 100.000 habitantes frente a {fmt(i.mediaUE, i.mediaUE < 10 ? 2 : 1)} de media en la UE ({E.anio},{' '}
                {puestoTxt(i)}). {nota}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/** Graficas que acompañan al indice, para la rejilla de la pestaña */
export function GraficasIndice() {
  const {total, sexual, noSexual} = calcTasas();
  const hom = E.indicadores.homicidios;
  const orden = Object.entries(hom.tasas).sort((x, y) => x[1] - y[1]);
  const [minG, minV] = orden[0], [maxG, maxV] = orden[orden.length - 1];
  const S = (E as unknown as {serie: Record<string, {espana: Serie; mediaUE: Serie; paises: Serie}>}).serie;
  const indiceUE = (k: string): Serie => Object.fromEntries(Object.keys(S[k].espana).map((y) => [y, (S[k].espana[y] / S[k].mediaUE[y]) * 100]));
  const aniosUE = Object.keys(S.homicidios.espana);
  const cien: Serie = Object.fromEntries(aniosUE.map((y) => [y, 100]));
  const colores: Record<string, string> = {homicidios: '#212529', robos: COL_ES, violaciones: '#A61E4D', violenciaSexual: '#E64980'};

  return (
    <>
      <Mini
        id="vio-tasa"
        title="Víctimas por cada 100.000 habitantes"
        sub="víctimas de violencia registradas al año"
        series={[
          {lab: 'Total', c: '#212529', dash: true, data: total},
          {lab: 'No sexual', c: '#748FFC', data: noSexual},
          {lab: 'Sexual', c: '#A61E4D', data: sexual},
        ]}
        f={(v) => fmt(v, 0)}
        x0={2009.5}
        yMin={0}
        hitos={[{x: 2015.5, lab: 'Fin de las faltas'}]}
        note={
          <p>
            Las mismas víctimas de la gráfica de arriba, divididas entre la población a 1 de enero. La caída entre 2014 y 2016 no es menos violencia:
            en julio de 2015 la reforma del Código Penal suprimió las faltas, y dejaron de contarse unas 100.000 faltas de lesiones y malos tratos al
            año. Desde 2016 la población ha crecido unos 2,7 millones, así que la tasa sube menos que el número de víctimas.
          </p>
        }
        src={
          <>
            {L('Ministerio del Interior, tabla 04001', INTERIOR)}; {L('INE, población', INE_POB)}
          </>
        }
      />
      <Mini
        id="vio-homicidios-largo"
        title="Muertes por homicidio desde 1980"
        sub="personas muertas por agresión al año, por sexo de la víctima"
        series={[
          {lab: 'Total', c: '#212529', dash: true, data: V.muertesHomicidio.total},
          {lab: 'Hombres', c: '#1C3FAA', data: V.muertesHomicidio.hombres},
          {lab: 'Mujeres', c: '#A61E4D', data: V.muertesHomicidio.mujeres},
        ]}
        f={(v) => fmt(v, 0)}
        x0={1979.5}
        yMin={0}
        hitos={[{x: 1999, lab: 'Cambio de clasificación'}]}
        note={
          <>
            <p>
              La serie más larga de violencia que hay: muertes por homicidio según los certificados de defunción, desde {Object.keys(V.muertesHomicidio.total)[0]}.
              No es dato policial, así que no coincide con el Ministerio del Interior, pero se puede seguir los 40 años de democracia. En{' '}
              {Object.keys(V.muertesHomicidio.total).at(-1)} murieron {fmt(Object.values(V.muertesHomicidio.total as Serie).at(-1) ?? 0, 0)} personas por
              homicidio, con una población mucho mayor que en los años ochenta.
            </p>
            <p>
              El pico de 2004 son los atentados del 11-M en Madrid. En 1999 la causa de muerte pasa a clasificarse con la CIE-10 (antes, CIE-9): los dos
              periodos se comparan solo aproximadamente. Los hombres son siempre la mayoría de las víctimas, pero las mujeres pesan cada vez más, porque
              los homicidios de hombres han bajado mucho y los de mujeres no.
            </p>
          </>
        }
        src={L('INE, defunciones por causas: agresiones (homicidio), tabla 7947', 'https://www.ine.es/jaxiT3/Tabla.htm?t=7947')}
      />
      <Mini
        id="vio-ue100"
        title="España frente a la media de la UE"
        sub="delitos registrados por habitante, media de la UE = 100"
        series={[
          ...INDICADORES.map(({k, lab}) => ({lab, c: colores[k], data: indiceUE(k)})),
          {lab: 'Media de la UE', c: '#ADB5BD', dash: true, data: cien},
        ]}
        x0={Number(aniosUE[0]) - 0.5}
        yMin={0}
        f={(v) => fmt(v, 0)}
        note={
          <>
          <p>
            Cuánto tiene España de cada delito por habitante cada año si la media de la UE vale 100: por debajo de 100, menos que la media; por
            encima, más. Eurostat publica estos datos desde {aniosUE[0]}; los primeros años faltan algunos países en la violencia sexual, así que la
            media cambia un poco de composición.
            Los robos con violencia más que duplican la media. Las violaciones y la violencia sexual registradas quedan por debajo, pero eso puede
            ser que se denuncia menos: en España solo se denuncia el {fmt(V.macroencuesta2024.denunciaViolenciaSexual, 1)} % de la violencia sexual
            fuera de la pareja.
          </p>
          <p>
            <b>Homicidios:</b> España tuvo {fmt(hom.tasas.ES, 2)} por cada 100.000 habitantes en {E.anio}, el puesto {hom.puestoEspana} de{' '}
            {hom.paisesConDato} empezando por el que menos, frente a {fmt(hom.mediaUE, 2)} de media en la UE. El que menos, {E.paises[minG]} (
            {fmt(minV, 2)}); el que más, {E.paises[maxG]} ({fmt(maxV, 2)}). En {E.anio + 1} España subió a {fmt(hom.espana2024 ?? 0, 2)}. Fuera de la
            UE la distancia es mucho mayor: la media mundial es de {fmt(W.mundo, 1)}, la de Europa {fmt(W.europa, 1)} y la de América {fmt(W.americas, 0)}{' '}
            ({W.anio}, UNODC).
          </p>
          </>
        }
        src={
          <>
            {L('Eurostat, crim_off_cat (cálculo propio de la media de la UE)', EUROSTAT)}; {L('UNODC, Global Study on Homicide 2023', UNODC)}
          </>
        }
      />
    </>
  );
}
