import {DONDE_NACIERON, POB_INMIG, VIOL, VIOLENCIA as V} from '../../datos';
import {fmt} from '../../lib/formato';
import {Cuestion, Cuestiones} from '../../componentes/Cuestiones';
import {ultimo} from '../inmigracion/ultimo';
import {TIPOS} from './TiposViolencia';

/*
  Preguntas frecuentes sobre la violencia, respondidas con las graficas de esta
  pestaña (datos/violencia/violencia.json y, para la pareja, datos/global/violencia.json).
  Las cifras se leen del ultimo año de cada serie.
*/
type Sexo = 'hombres' | 'mujeres';
const pct = (v: number) => fmt(v, 0) + ' %';
const pct1 = (v: number) => fmt(v, 1) + ' %';
const n0 = (v: number) => fmt(v, 0);

const anios = Object.keys(V.tipos.lesiones.hombres);
const a = anios[anios.length - 1];
const DESDE = '2016';
const vict = (k: string, y: string, s?: Sexo) => (s ? V.tipos[k][s][y] : V.tipos[k].hombres[y] + V.tipos[k].mujeres[y]);
const total = (y: string, s?: Sexo) => TIPOS.reduce((t, x) => t + vict(x.k, y, s), 0);
const sexual = (y: string, s?: Sexo) => vict('agresionSexual', y, s) + vict('conPenetracion', y, s);
const tasa = (y: string) => (total(y) / DONDE_NACIERON.totalPoblacion[y]) * 1e5;
const sube = (k: string) => (vict(k, a) / vict(k, DESDE) - 1) * 100;

const E = V.europa, W = V.mundoHomicidios;
const hom = E.indicadores.homicidios, robos = E.indicadores.robos;
const M = V.macroencuesta2024;

const C = V.condenadosPorSexo, P = V.pareja;
const [aCond] = ultimo<number>(P.condenadosGenero);
const pctHombres = (k: string) => (C[k].hombres[aCond] / (C[k].hombres[aCond] + C[k].mujeres[aCond])) * 100;
const parejaH = P.condenadosGenero[aCond] + P.condenadosDomesticaHombres[aCond], parejaM = P.condenadosDomesticaMujeres[aCond];

const [aMuertes, mujMuertas] = ultimo<number>(VIOL.mujMuertas);
const otrasMuertes = VIOL.otrasMuertes[aMuertes] as number;
const [aProt, vgMuj] = ultimo<number>(VIOL.vgMuj);

const sexMuj = (y: string) => sexual(y, 'mujeres');
const ANTES_LEY = '2021';

const pctExtr = (k: string) => (V.detenidosExtranjeros[k][a] / V.detenidos[k][a]) * 100;
const extrPob: number = POB_INMIG.extranjerosPct[a];

const edadM = V.edad.sexual.mujeres[a] as Record<string, number>;
const menoresM = edadM['0-13 años'] + edadM['14-17 años'];
const totalEdadM = Object.values(edadM).reduce((t, v) => t + v, 0);
const conocidos = M.agresoresViolacion['Amigos o conocidos'] + M.agresoresViolacion.Familiares;

export default function CuestionesViolencia() {
  return (
    <Cuestiones intro="Preguntas que se hace mucha gente sobre la violencia, y frases que se repiten, comparadas con los datos oficiales de esta pestaña. Cada respuesta tiene su parte buena y su parte mala. Lo registrado es solo lo que llega a la policía o al juzgado: cuando eso cambia la respuesta, se dice.">
      <Cuestion
        pregunta="¿España es un país violento?"
        veredicto="No mucho"
        tono="matiz"
        conclusion={
          <>
            En {a} hubo {n0(tasa(a))} víctimas registradas de violencia por cada 100.000 habitantes, una de cada {n0(1e5 / tasa(a))} personas. Comparada
            con la Unión Europea, España tiene <b>pocos homicidios</b> y <b>muchos robos con violencia</b>; con el mundo, muy pocos homicidios.
          </>
        }
        positivo={[
          <>
            {fmt(hom.tasas.ES, 2)} homicidios por cada 100.000 habitantes ({E.anio}), por debajo de la media de la UE ({fmt(hom.mediaUE, 2)}) y muy lejos de
            la media mundial ({fmt(W.mundo, 1)}) o de América ({n0(W.americas)}).
          </>,
          <>La mayor parte de la violencia registrada son lesiones y malos tratos en la familia, no muertes: los homicidios y sus tentativas son el {pct1((vict('homicidios', a) / total(a)) * 100)}.</>,
        ]}
        negativo={[
          <>
            Es el país de la UE con más robos con violencia o intimidación por habitante: {fmt(robos.tasas.ES, 1)} por cada 100.000, más del doble de la
            media ({fmt(robos.mediaUE, 1)}).
          </>,
          <>La violencia registrada por habitante ha subido un {pct((tasa(a) / tasa(DESDE) - 1) * 100)} desde {DESDE}.</>,
        ]}
        graficas={[
          {id: 'vio-tipos', lab: '¿Qué violencia se registra?'},
          {id: 'vio-ue100', lab: 'España frente a la media de la UE'},
        ]}
      />

      <Cuestion
        pregunta="¿Hay cada vez más violencia?"
        veredicto="Se registra más"
        tono="matiz"
        conclusion={
          <>
            Desde {DESDE} las víctimas registradas han pasado de {n0(total(DESDE))} a {n0(total(a))}. Una parte es más violencia y otra que se denuncia más,
            sobre todo en la familia y en la violencia sexual. Con estos datos <b>no se puede separar una cosa de la otra</b>.
          </>
        }
        positivo={[
          <>Los robos con violencia suben poco, un {pct(sube('robosViolencia'))} desde {DESDE}, y España sigue teniendo pocos homicidios.</>,
          <>Que se denuncien más los malos tratos y las agresiones sexuales también es una buena noticia: antes quedaban ocultos.</>,
        ]}
        negativo={[
          <>
            Suben las lesiones (un {pct(sube('lesiones'))}), los malos tratos en la familia ({pct(sube('malosTratos'))}) y, sobre todo, las agresiones
            sexuales: se han multiplicado por {fmt(sexual(a) / sexual(DESDE), 1)}.
          </>,
          <>Los homicidios y sus tentativas casi se han duplicado: {n0(vict('homicidios', DESDE))} víctimas en {DESDE} y {n0(vict('homicidios', a))} en {a}.</>,
        ]}
        graficas={[
          {id: 'vio-tipos', lab: '¿Qué violencia se registra?'},
          {id: 'vio-tasa', lab: 'Víctimas por cada 100.000 habitantes'},
        ]}
      />

      <Cuestion
        pregunta="¿Las mujeres sufren más violencia que los hombres?"
        veredicto="En lo registrado, sí"
        tono="matiz"
        conclusion={
          <>
            Las mujeres son el {pct1((total(a, 'mujeres') / total(a)) * 100)} de las víctimas registradas en {a}. Depende mucho del tipo: <b>ellas sufren casi
            toda la violencia en la familia y la sexual</b>; ellos, la mayoría de las lesiones, los robos y los homicidios.
          </>
        }
        positivo={[
          <>La violencia contra las mujeres se registra cada vez más, y eso permite protegerlas: {n0(vgMuj)} tenían orden de protección por violencia de género en {aProt}.</>,
        ]}
        negativo={[
          <>
            Malos tratos en la familia: {n0(vict('malosTratos', a, 'mujeres'))} mujeres frente a {n0(vict('malosTratos', a, 'hombres'))} hombres.
            Agresiones sexuales: {n0(sexual(a, 'mujeres'))} mujeres frente a {n0(sexual(a, 'hombres'))} hombres.
          </>,
          <>Y es solo lo que se denuncia: en la pareja, solo denuncia el {pct1(M.denunciaPareja)} de las mujeres que sufren violencia.</>,
        ]}
        graficas={[
          {id: 'vio-victimas-sexo', lab: '¿Contra quién?'},
          {id: 'vio-pareja', lab: 'Violencia en la pareja y en la familia'},
        ]}
      />

      <Cuestion
        pregunta="¿Los hombres son más violentos que las mujeres?"
        veredicto="Sí"
        tono="cierto"
        conclusion={
          <>
            Los hombres son la mitad de la población y <b>cometen casi toda la violencia</b>: de los delitos con condena en {aCond}, el{' '}
            {pct(pctHombres('sexuales'))} de los sexuales, el {pct(pctHombres('lesiones'))} de las lesiones y el {pct(pctHombres('roboViolencia'))} de los
            robos con violencia los cometieron hombres.
          </>
        }
        positivo={[
          <>No es algo de todos los hombres: la violencia la comete una minoría, aunque estos datos cuentan delitos, no personas.</>,
          <>Al ser tan concentrada, la prevención puede dirigirse: chicos jóvenes, peleas, pareja.</>,
        ]}
        negativo={[
          <>
            En la pareja y la familia, de cada 100 condenados {n0((parejaH / (parejaH + parejaM)) * 100)} son hombres ({n0(parejaH)} hombres y {n0(parejaM)}{' '}
            mujeres).
          </>,
          <>Los hombres son también la mayoría de las víctimas de lesiones, robos y homicidios: la violencia de hombres recae mucho sobre otros hombres.</>,
        ]}
        graficas={[
          {id: 'vio-autores', lab: '¿Quién la comete?'},
          {id: 'vio-autores-pareja', lab: 'Condenados en la pareja y la familia'},
        ]}
      />

      <Cuestion
        pregunta="¿Los hombres también sufren violencia de su pareja?"
        veredicto="Sí, mucho menos"
        tono="matiz"
        conclusion={
          <>
            Sí, y cuenta como violencia doméstica, porque por ley la violencia de género es solo la de un hombre contra su pareja o expareja. En{' '}
            {aMuertes} fueron asesinadas {n0(mujMuertas)} mujeres por su pareja o expareja, y hubo {n0(otrasMuertes)}{' '}
            {otrasMuertes === 1 ? 'muerte más' : 'muertes más'} en la pareja, casi todas de hombres.
          </>
        }
        positivo={[
          <>Las otras muertes en la pareja, casi todas de hombres, son pocas: entre 1 y 11 al año desde 2009.</>,
        ]}
        negativo={[
          <>
            {n0(P.condenadosDomesticaMujeres[aCond])} mujeres fueron condenadas por violencia doméstica en {aCond}, que incluye la que sufren los hombres
            de su pareja y la de entre familiares.
          </>,
          <>Los hombres denuncian aún menos, y no hay una encuesta como la Macroencuesta que mida lo que les pasa a ellos.</>,
        ]}
        graficas={[
          {id: 'vio-muertes', lab: 'Asesinados por su pareja o expareja'},
          {id: 'vio-autores-pareja', lab: 'Condenados en la pareja y la familia'},
        ]}
      />

      <Cuestion
        pregunta="«La mayoría de las violaciones las cometen desconocidos»"
        veredicto="Falso"
        tono="falso"
        conclusion={
          <>
            Según la Macroencuesta 2024, en las violaciones fuera de la pareja <b>el {pct(conocidos)} de los agresores eran conocidos</b>: amigos y
            conocidos ({pct1(M.agresoresViolacion['Amigos o conocidos'])}) o familiares ({pct1(M.agresoresViolacion.Familiares)}). Solo el{' '}
            {pct(M.agresoresViolacion.Desconocidos)} eran desconocidos.
          </>
        }
        positivo={[
          <>Si el agresor suele ser alguien cercano, la prevención puede llegar a él: en la escuela, en la familia, entre amigos.</>,
        ]}
        negativo={[
          <>
            Por eso casi no se denuncia: solo el {pct1(M.denunciaViolaciones)} de las violaciones. Las de dentro de la pareja, que la encuesta cuenta aparte,
            se suman a estas.
          </>,
          <>
            El {pct((menoresM / totalEdadM) * 100)} de las mujeres víctimas de agresión sexual registradas en {a} eran menores de 18 años.
          </>,
        ]}
        graficas={[
          {id: 'vio-agresores', lab: '¿Quién viola?'},
          {id: 'vio-edad', lab: 'Edad de las víctimas'},
        ]}
      />

      <Cuestion
        pregunta="¿La ley del «solo sí es sí» ha disparado las agresiones sexuales?"
        veredicto="No se puede saber"
        tono="matiz"
        conclusion={
          <>
            Las agresiones sexuales a mujeres registradas <b>ya subían mucho antes de la ley</b> (octubre de 2022): de {n0(sexMuj(DESDE))} en {DESDE} a{' '}
            {n0(sexMuj(ANTES_LEY))} en {ANTES_LEY}. Después siguieron subiendo, hasta {n0(sexMuj(a))} en {a}. La ley juntó el abuso y la agresión en un solo
            delito, así que parte de la subida es un cambio de nombre, no más agresiones.
          </>
        }
        positivo={[
          <>Cada vez se denuncia más, y eso es lo que hace subir la cifra en buena parte.</>,
        ]}
        negativo={[
          <>Aun así, lo que llega a la policía es una parte pequeña: solo se denuncia el {pct1(M.denunciaViolenciaSexual)} de la violencia sexual fuera de la pareja.</>,
        ]}
        graficas={[{id: 'vio-estimado', lab: 'Lo registrado frente a lo que probablemente pasa'}]}
      />

      <Cuestion
        pregunta="¿Los extranjeros cometen más violencia?"
        veredicto="Más detenidos, con matices"
        tono="matiz"
        conclusion={
          <>
            Los extranjeros son el {pct1(extrPob)} de la población y el {pct(pctExtr('lesiones'))} de los detenidos o investigados por lesiones, el{' '}
            {pct(pctExtr('conPenetracion'))} por agresión sexual con penetración y el {pct(pctExtr('robosViolencia'))} por robos con violencia ({a}). Están
            por encima en todos los delitos violentos, pero <b>detenido no es culpable</b>, y la edad y el sexo explican una parte.
          </>
        }
        positivo={[
          <>Comparando a igual edad, la diferencia en condenas baja (pestaña Inmigración).</>,
        ]}
        negativo={[
          <>Aunque se corrija por edad, sigue habiendo más condenas entre extranjeros, y estos datos no permiten explicar el resto.</>,
          <>Nacionalidad no es origen: los nacionalizados cuentan como españoles, y entre los detenidos hay personas que no viven en España.</>,
        ]}
        graficas={[{id: 'vio-extranjeros', lab: 'Detenidos e investigados extranjeros'}]}
      />

      <Cuestion
        pregunta="¿Hay cada vez más delitos con navaja?"
        veredicto="No hay datos"
        tono="matiz"
        conclusion={
          <>
            No hay estadística oficial: el Ministerio del Interior clasifica los delitos por tipo, no por el arma usada. Las cifras que circulan son de
            casos sueltos o de armas intervenidas, que no dicen cuántos delitos hubo.
          </>
        }
        positivo={[<>Los homicidios en España siguen por debajo de la media de la UE.</>]}
        negativo={[
          <>Las lesiones registradas han subido un {pct(sube('lesiones'))} desde {DESDE}, y sin datos por arma no se puede saber cuántas fueron con navaja.</>,
        ]}
      />

      <Cuestion
        pregunta="¿La educación sexual y en consentimiento reduciría la violencia?"
        veredicto="Puede ayudar"
        tono="matiz"
        conclusion={
          <>
            Estos datos no miden su efecto: eso solo se ve comparando lugares o colegios con y sin ella. Pero sí dicen dónde está el problema: la
            violencia sexual casi no se denuncia, la cometen sobre todo conocidos y <b>una de cada tres víctimas es menor</b>, justo la edad de la escuela.
          </>
        }
        positivo={[
          <>El {pct(conocidos)} de las violaciones fuera de la pareja las comete alguien conocido: enseñar a respetar un «no» llega a quien agrede.</>,
          <>Las agresiones sexuales son lo que más crece de lo registrado, y es lo que más tiene que ver con el consentimiento.</>,
        ]}
        negativo={[
          <>
            La mayor parte de la violencia registrada no es sexual: lesiones, robos y malos tratos son el {pct1(((total(a) - sexual(a)) / total(a)) * 100)}.
            La educación sexual sola no la resuelve.
          </>,
          <>Hace falta tiempo: sus efectos se verían en años, y la policía y los juzgados siguen haciendo falta para las víctimas de hoy.</>,
        ]}
        graficas={[
          {id: 'vio-edad', lab: 'Edad de las víctimas'},
          {id: 'vio-agresores', lab: '¿Quién viola?'},
          {id: 'vio-tipos', lab: '¿Qué violencia se registra?'},
        ]}
      />
    </Cuestiones>
  );
}
