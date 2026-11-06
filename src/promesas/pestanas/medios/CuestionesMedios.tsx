import {MEDIA} from '../../datos';
import {fmt} from '../../lib/formato';
import {Cuestion, Cuestiones} from '../../componentes/Cuestiones';
import {L} from '../../componentes/enlace';
import {T} from '../../../comun/Glosario';
import {
  aniosCon, cap, comparaVeces, desde, enLetra, ent, masMenos, maximo, minimo, NATIVOS, num1, pares, penultimo, primerAnioPorEncima, primero, proporcion,
  ultimo, veces, type Serie,
} from './serie';

/*
  Cuestiones frecuentes sobre medios e informacion. Solo usa cifras que ya
  estan en las graficas de la pestaña o en sus (i). Ni partidos ni medios
  concretos: esta pagina no los clasifica. Las cifras que salen de
  medios.json se calculan; las de estudios (CIS, INE, Media Pluralism
  Monitor, Eurobarometro, InfoAdex 2026...) van a mano con su año.
*/

const EGM = MEDIA.egm as Record<string, Serie>;
const PUBLI = MEDIA.publi as Record<string, Serie>;
const FUENTE = MEDIA.fuente as Record<string, Serie>;
const REDES = MEDIA.redes as Record<string, Serie>;
const INST = MEDIA.publiInst as Serie;

// Publicidad institucional
const [anioInst, inst] = ultimo(INST);
const [anioInstMax, instMax] = maximo(INST);
const [, instMin] = minimo(INST);
const aniosInstMin = aniosCon(INST, instMin);
// El pico despues del minimo (el ultimo año con el minimo)
const anioUltMin = pares(INST).filter(([, v]) => v === instMin).at(-1)![0];
const [anioRepunte, repunte] = maximo(desde(INST, Number(anioUltMin) + 1));

// Diarios (OJD y EGM)
const [anioDif0, dif0] = primero(MEDIA.difusion);
const [anioDif1, dif1] = ultimo(MEDIA.difusion);
const [anioEgm, papel] = ultimo(EGM.diarios);
const [anioPapelMax, papelMax] = maximo(EGM.diarios);
const [anioNet0, net0] = primero(EGM.diariosNet);
const [anioNet, net] = ultimo(EGM.diariosNet);
const [anioNetMax, netMax] = maximo(EGM.diariosNet);
const [anioNativos0, nativos0] = primero(NATIVOS);
const [anioNativos, nativos] = ultimo(NATIVOS);
const [anioPubliDiarios, publiDiarios] = ultimo(PUBLI.diarios);
const [anioPubliDiariosMax, publiDiariosMax] = maximo(PUBLI.diarios);

// Television
const [, tv] = ultimo(EGM.tv);
const [anioFuente, tvFuente] = ultimo(FUENTE.tv);
const [anioTvFuenteMax, tvFuenteMax] = maximo(FUENTE.tv);
const [, redesFuente] = ultimo(FUENTE.redes);
const [anioRedesMax, redesMax] = maximo(FUENTE.redes);
const [anioTvNueva, tvNueva] = ultimo(PUBLI.tvNueva);
const anioCruce = primerAnioPorEncima(PUBLI.internet, PUBLI.tv);
const [anioTvMax, tvMax] = maximo(PUBLI.tv);
const [anioTvAnt, tvAnt] = ultimo(PUBLI.tv);

// Redes
const [anioIg0, ig0] = primero(REDES.Instagram);
const [anioIg, ig] = ultimo(REDES.Instagram);
const [anioTt0, tt0] = primero(REDES.TikTok);
const [, tt] = ultimo(REDES.TikTok);

// Confianza y preocupacion
const [anioConfia, confia] = ultimo(MEDIA.confianza);
const [anioConfiaMax, confiaMax] = maximo(MEDIA.confianza);
const confia2022 = Object.values(desde(MEDIA.confianza, 2022));
const [anioPreocupa, preocupa] = ultimo(MEDIA.preocupa);
const [anioPreocupaMax, preocupaMax] = maximo(MEDIA.preocupa);
const preocupaEsMax = preocupa === preocupaMax;

// Reporteros Sin Fronteras (puesto: menos es mejor)
const [anioRsf, rsf] = ultimo(MEDIA.rsf);
const [, rsfAntes] = penultimo(MEDIA.rsf);
const [anioRsfMejor, rsfMejor] = minimo(MEDIA.rsf);
const [anioRsfPeor, rsfPeor] = maximo(MEDIA.rsf);
const rsfPares = pares(MEDIA.rsf).slice(0, -1);
const rsfIgual = rsfPares.find(([, v]) => v === rsf)?.[0];
// Tramo seguido mas largo de años con peor puesto que el actual
const rsfRacha = rsfPares.reduce<{mejor: [string, string] | null; ini: string | null; fin: string | null; n: number; max: number}>(
  (acc, [y, v]) => {
    if (v > rsf) {
      acc.ini ??= y;
      acc.fin = y;
      acc.n++;
      if (acc.n > acc.max) [acc.max, acc.mejor] = [acc.n, [acc.ini, y]];
    } else [acc.ini, acc.fin, acc.n] = [null, null, 0];
    return acc;
  },
  {mejor: null, ini: null, fin: null, n: 0, max: 0},
).mejor;
const rsfCambio = rsf - rsfAntes;
const rsfPierde = rsfCambio > 0;
const rsfComparado = [
  rsfIgual && `el mismo que en ${rsfIgual}`,
  rsfRacha && Number(rsfRacha[1]) - Number(rsfRacha[0]) >= 2 && `mejor que en todos los años entre ${rsfRacha[0]} y ${rsfRacha[1]}`,
].filter(Boolean).join(' y ');
const rsfTrasMejor =
  rsf === rsfMejor
    ? `Es su mejor puesto de toda la serie.`
    : anioRsfMejor === penultimo(MEDIA.rsf)[0]
      ? `Pero en ${anioRsf} bajó ${enLetra(rsf - rsfMejor)} puestos desde su mejor marca (${rsfMejor}, en ${anioRsfMejor}).`
      : `Su mejor marca fue el ${rsfMejor}, en ${anioRsfMejor}.`;

// Pagan
const [anioPagan, pagan] = ultimo(MEDIA.pagan);
const [anioPagan0] = primero(MEDIA.pagan);
const [anioPaganMax, paganMax] = maximo(MEDIA.pagan);
const [, paganMin] = minimo(MEDIA.pagan);

export default function CuestionesMedios() {
  return (
    <Cuestiones intro="Preguntas que se hace mucha gente sobre los medios, respondidas solo con los datos de las gráficas de arriba. Cada respuesta tiene su lado bueno y su lado malo. Aquí no se juzga a ningún medio ni a ningún partido.">
      <Cuestion
        pregunta="¿Los medios están comprados por el Gobierno?"
        veredicto="Comprados no; influidos, en parte sí"
        tono="matiz"
        conclusion={
          <>
            Comprar a todo el sector con publicidad no es posible con lo que gasta el Gobierno central: {fmt(inst, 1)} M€ en{' '}
            <T k="publicidad-institucional">campañas</T> en {anioInst}. Pero la influencia política existe por otras vías. La más directa es{' '}
            <b>
              <T k="rtve">RTVE</T>
            </b>
            , la radio y televisión públicas: su <T k="consejo-de-administracion-rtve">consejo</T> lo elige el Parlamento y, desde el{' '}
            {L('Real Decreto-ley 5/2024', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-21699')}, si no hay acuerdo de dos tercios basta la{' '}
            <T k="mayoria-absoluta">mayoría absoluta</T> del Congreso para nombrar a 11 de sus 15 miembros; es decir, la mayoría que sostiene al
            Gobierno. Lo mismo pasa, con cada Gobierno autonómico, en las televisiones públicas de las comunidades. La Comisión Europea ve riesgo
            alto en la independencia de los medios públicos de España.
          </>
        }
        positivo={[
          <>El gasto en publicidad del Gobierno central se publica cada año, campaña a campaña, en los informes de La Moncloa: cualquiera puede revisarlo.</>,
          anioInstMax === anioInst ? (
            <>Es el máximo de la serie, pero se publica: {fmt(inst, 1)} M€ en {anioInst}.</>
          ) : (
            <>
              Lejos del máximo: en {anioInstMax} fueron {fmt(instMax, 1)} M€, {veces(instMax, inst, 'más')} que en {anioInst} (sin descontar la{' '}
              <T k="inflacion">inflación</T>).
            </>
          ),
          <>
            El riesgo para la independencia política del conjunto de los medios ha bajado algo: 49 % en 2026, frente al 54 % de 2015 (
            <T k="media-pluralism-monitor">Media Pluralism Monitor</T>).
          </>,
        ]}
        negativo={[
          <>El consejo de RTVE lo nombra en la práctica la mayoría parlamentaria del momento: desde 2024, si no hay dos tercios, ya no hace falta pactar con la oposición.</>,
          <>Riesgo alto para la independencia de los medios públicos: 67 % en 2023 y 2024, según el Media Pluralism Monitor, que recoge el Informe sobre el Estado de Derecho de la Comisión Europea.</>,
          <>
            La publicidad del Gobierno ha vuelto a subir: de {fmt(instMin, 1)} M€ en {aniosInstMin} a {fmt(repunte, 1)} M€ en {anioRepunte}
            {anioRepunte !== anioInst && <> y {fmt(inst, 1)} M€ en {anioInst}</>}. Y solo es el Gobierno central: comunidades y ayuntamientos también
            anuncian y tienen sus propias televisiones públicas.
          </>,
          <>Para un medio pequeño que vive de anuncios, la publicidad pública puede pesar mucho. Estos datos no dicen cómo se reparte entre medios.</>,
          <>En 2022, el 61 % creía que los medios sufren presión política y el 57 %, presión de empresas (Digital News Report).</>,
        ]}
        graficas={[
          {id: 'med-publi-inst', lab: 'Publicidad institucional'},
          {id: 'med-publicidad', lab: 'Dónde va la publicidad'},
          {id: 'med-libertad', lab: 'Libertad de prensa'},
        ]}
      />

      <Cuestion
        pregunta="¿Ya nadie lee periódicos?"
        veredicto="No realmente"
        tono="matiz"
        conclusion={
          <>
            El papel se hunde: de {fmt(dif0, 1)} millones de ejemplares al día en {anioDif0} a {fmt(dif1, 1)} millones en {anioDif1}. Solo el{' '}
            {num1(papel)} % lee un diario en papel cada día ({anioEgm}), cuando en {anioPapelMax} era el {num1(papelMax)} %. Pero los diarios se
            siguen leyendo, ahora en internet: el {num1(net)} % lo hace cada día, {comparaVeces(net, papel)} que en papel.
          </>
        }
        positivo={[
          <>
            Leer un diario por internet ha pasado de casi nadie en {anioNet0} ({num1(net0)} %) a {fmt(Math.round(net / 10), 0)} de cada 10 personas
            en {anioNet}.
          </>,
          <>
            Han nacido muchos medios en internet: unos {ent(nativos0)} en {anioNativos0} y {ent(nativos)} en {anioNativos}, casi la mitad de las
            webs de noticias.
          </>,
        ]}
        negativo={[
          net < netMax ? (
            <>
              La lectura de diarios por internet también baja desde {anioNetMax}: del {num1(netMax)} % al {num1(net)} % en {anioNet}.
            </>
          ) : (
            <>La lectura de diarios por internet no compensa del todo la caída del papel.</>
          ),
          <>
            Menos dinero para hacer periodismo: la publicidad en diarios de papel pasó de {ent(publiDiariosMax)} M€ en {anioPubliDiariosMax} a{' '}
            {ent(publiDiarios)} M€ en {anioPubliDiarios}, {veces(publiDiariosMax, publiDiarios, 'menos')}.
          </>,
          <>Entre 2008 y 2015 cerraron 375 medios en España y se perdieron unos 12.200 empleos.</>,
        ]}
        graficas={[
          {id: 'med-audiencia', lab: 'Audiencia diaria'},
          {id: 'med-nativos', lab: 'Medios nativos digitales'},
        ]}
      />

      <Cuestion
        pregunta="¿Ya nadie ve la tele?"
        veredicto="Falso"
        tono="falso"
        conclusion={
          <>
            La televisión llega cada día a {fmt(Math.round(tv / 10), 0)} de cada 10 personas ({num1(tv)} % en {anioEgm}); hasta 2016 eran casi 9.
            Para informarse, la usó el {fmt(tvFuente, 0)} % de los <T k="internauta">internautas</T> en la última semana ({anioFuente}):{' '}
            {masMenos(tvFuente, redesFuente)} las redes sociales ({fmt(redesFuente, 0)} %).
          </>
        }
        positivo={[
          <>Sigue llegando a casi todo el mundo, también a quien apenas usa internet.</>,
          <>Sigue atrayendo mucho dinero de los anunciantes: {ent(tvNueva)} M€ en {anioTvNueva} contando su parte digital.</>,
        ]}
        negativo={[
          <>
            Como fuente de noticias pierde peso: del {fmt(tvFuenteMax, 0)} % de los internautas en {anioTvFuenteMax} al {fmt(tvFuente, 0)} % en{' '}
            {anioFuente}.
          </>,
          <>
            {anioCruce ? <>En {anioCruce} internet ya recibía más publicidad que la televisión, que</> : <>La televisión</>} en {anioTvMax} llegó a{' '}
            {ent(tvMax)} M€ y en {anioTvAnt} recibió {ent(tvAnt)} M€.
          </>,
        ]}
        graficas={[
          {id: 'med-audiencia', lab: 'Audiencia diaria'},
          {id: 'med-fuente', lab: 'Fuente de noticias'},
          {id: 'med-publicidad', lab: 'Dónde va la publicidad'},
        ]}
      />

      <Cuestion
        pregunta="¿Ya nos informamos sobre todo por redes sociales?"
        veredicto="No del todo"
        tono="matiz"
        conclusion={
          <>
            {cap(proporcion(redesFuente))} de los internautas se informó por redes en la última semana ({fmt(redesFuente, 0)} % en {anioFuente}). Es
            mucho, pero {masMenos(redesFuente, redesMax)} en {anioRedesMax} ({fmt(redesMax, 0)} %) y {masMenos(redesFuente, tvFuente)} por la
            televisión ({fmt(tvFuente, 0)} %). Lo que cambia es la red: Facebook baja y suben Instagram y TikTok.
          </>
        }
        positivo={[
          <>
            Las redes como fuente de noticias no crecen desde {anioRedesMax}: del {fmt(redesMax, 0)} % al {fmt(redesFuente, 0)} %.
          </>,
          <>
            El 84,3 % apoya que existan <T k="verificador">verificadores</T> que desmientan <T k="bulo">bulos</T> (CIS, mayo de 2026).
          </>,
        ]}
        negativo={[
          <>
            Crecen las redes de vídeo: Instagram pasa del {fmt(ig0, 0)} % en {anioIg0} al {fmt(ig, 0)} % en {anioIg} y TikTok, del {fmt(tt0, 0)} % en{' '}
            {anioTt0} al {fmt(tt, 0)} %. Lo que se ve lo elige un <T k="algoritmo">algoritmo</T>. (El salto de 2026 puede deberse en parte a un
            cambio en la encuesta.)
          </>,
          <>
            El {fmt(preocupa, 0)} % teme no distinguir lo real de lo falso en internet ({anioPreocupa}), por encima de la media mundial de 2026 (62
            %).
          </>,
          <>
            En 2025, el 52 % se sintió expuesto a <T k="desinformacion">desinformación</T> a menudo en la última semana; la media de la UE es el 36 %
            (Eurobarómetro).
          </>,
        ]}
        graficas={[
          {id: 'med-fuente', lab: 'Fuente de noticias'},
          {id: 'med-redes', lab: 'Redes para informarse'},
          {id: 'med-confianza', lab: 'Miedo a los bulos'},
        ]}
      />

      <Cuestion
        pregunta="¿Hay menos libertad de prensa que antes?"
        veredicto="No en conjunto"
        tono="matiz"
        conclusion={
          <>
            Según Reporteros Sin Fronteras, España está en el puesto {rsf} de 180 en {anioRsf}
            {rsfComparado && <>: {rsfComparado}</>} (el peor, el {rsfPeor} en {anioRsfPeor}). {rsfTrasMejor} Es un puesto frente a otros países, y
            el índice cambió de método en 2013 y en 2022.
          </>
        }
        positivo={[
          <>{anioRsfMejor} fue el mejor puesto de toda la serie.</>,
          <>El riesgo para la independencia política de los medios baja: del 54 % en 2015 al 49 % en 2026 (Media Pluralism Monitor).</>,
        ]}
        negativo={[
          rsfPierde ? (
            <>
              En {anioRsf} España perdió {enLetra(rsfCambio)} {rsfCambio === 1 ? 'puesto' : 'puestos'} en un año.
            </>
          ) : (
            <>Sigue lejos de los primeros puestos: en {anioRsf}, el {rsf}.</>
          ),
          <>El Media Pluralism Monitor, que cita la Comisión Europea, ve riesgo alto en la independencia de los medios públicos: 67 % en 2023 y 2024.</>,
          <>
            La gente no los ve libres: en 2016 solo el 24 % creía que sus medios están libres de presión política o comercial (media de la UE, 38 %;{' '}
            <T k="eurobarometro">Eurobarómetro</T>).
          </>,
        ]}
        graficas={[{id: 'med-libertad', lab: 'Libertad de prensa'}]}
      />

      <Cuestion
        pregunta="¿Por qué ya no nos fiamos de las noticias? ¿Por los bulos?"
        veredicto="Los datos apuntan a eso"
        tono="cierto"
        conclusion={
          <>
            Solo {proporcion(confia)} se fía de las noticias la mayor parte del tiempo ({fmt(confia, 0)} % en {anioConfia}); en {anioConfiaMax} era{' '}
            {proporcion(confiaMax)} ({fmt(confiaMax, 0)} %). Ninguna encuesta puede probar la causa, pero lo que sube a la vez es el miedo a la{' '}
            <T k="desinformacion">desinformación</T>: el {fmt(preocupa, 0)} % teme no distinguir lo real de lo falso en internet
            {preocupaEsMax ? ', el máximo de la serie y' : ` (máximo: ${fmt(preocupaMax, 0)} % en ${anioPreocupaMax}),`} muy por encima de la media
            mundial (62 % en 2026); y en 2025 el 52 % dijo toparse con desinformación a menudo, frente al 36 % de media en la UE. A eso se suma que 6
            de cada 10 creen que los medios sufren presión política (2022).
          </>
        }
        positivo={[
          <>
            La caída se ha frenado: desde 2022 la confianza está entre el {fmt(Math.min(...confia2022), 0)} % y el {fmt(Math.max(...confia2022), 0)} %.
          </>,
          <>La gente quiere defenderse de los bulos: el 84,3 % apoya que existan verificadores (CIS, mayo de 2026).</>,
        ]}
        negativo={[
          <>{cap(proporcion(100 - confia))} no se fían de las noticias: es terreno abonado para que circulen bulos.</>,
          <>
            {preocupaEsMax
              ? `La preocupación por distinguir lo real de lo falso está en su máximo (${fmt(preocupa, 0)} %)`
              : `La preocupación por distinguir lo real de lo falso sigue alta (${fmt(preocupa, 0)} %)`}
            , y la exposición a desinformación (52 % en 2025) es de las más altas de la UE.
          </>,
          <>Mucha gente se cansa y desconecta: el 37 % evita las noticias a veces o a menudo (2026).</>,
          <>En 2022, el 61 % creía que los medios sufren presión política y el 57 %, presión de empresas.</>,
        ]}
        graficas={[
          {id: 'med-confianza', lab: 'Confianza y miedo a los bulos'},
          {id: 'med-libertad', lab: 'Libertad de prensa'},
        ]}
      />

      <Cuestion
        pregunta="¿La inteligencia artificial está cambiando cómo nos informamos?"
        veredicto="Sí, y muy rápido"
        tono="cierto"
        conclusion={
          <>
            Casi 4 de cada 10 personas de 16 a 74 años usaron <T k="ia-generativa">IA generativa</T> (ChatGPT, Gemini…) en los últimos tres meses:
            el 37,9 % en 2025 según el {L('INE', 'https://www.ine.es/dyngs/Prensa/TICH2025.htm')}. Entre los de 35 a 44 años, el 43,8 %; entre los
            de 16 a 24, el 75,6 %. Solo el 8 % dice usarla <b>para informarse de la actualidad</b> (Digital News Report 2026), casi el doble que un
            año antes, pero esa cifra solo cuenta a quien reconoce usar un <T k="chatbot">chatbot</T> para noticias: no incluye las respuestas de
            IA que ya salen en los buscadores ni todo lo que se le pregunta sin pensar que es «informarse».
          </>
        }
        positivo={[
          <>
            Para informarse de la actualidad, la mayoría sigue yendo a la televisión ({fmt(tvFuente, 0)} %) y a las redes ({fmt(redesFuente, 0)} %),
            donde puede ver quién publica cada cosa.
          </>,
          <>Hay cautela: el 47 % se siente incómodo con noticias hechas sobre todo con IA (Digital News Report, 2025).</>,
        ]}
        negativo={[
          <>
            Se extiende muy deprisa: 3 de cada 4 jóvenes de 16 a 24 años ya la usan (INE, 2025), y el 14 % de los de 18 a 24 la usa para informarse
            cada semana (2026).
          </>,
          <>Aprende de lo que hay en internet, bulos incluidos, puede equivocarse con total seguridad y no siempre dice de dónde saca lo que cuenta.</>,
          <>Si responde sin llevar a la fuente, los medios pierden visitas y publicidad, y con ellas dinero para hacer periodismo.</>,
          <>No hay datos oficiales de cuánta gente se informa con resúmenes de IA sin saberlo: el 8 % seguramente se queda corto.</>,
        ]}
        graficas={[
          {id: 'med-redes', lab: 'Redes para informarse'},
          {id: 'med-fuente', lab: 'Fuente de noticias'},
        ]}
      />

      <Cuestion
        pregunta="¿Ya nadie paga por las noticias?"
        veredicto="Casi nadie"
        tono="cierto"
        conclusion={
          <>
            En {anioPagan} pagó por noticias en internet el {fmt(pagan, 0)} % de los internautas. Nunca ha pasado del {fmt(paganMax, 0)} % (
            {anioPaganMax}). La mayoría se informa gratis, así que los medios viven sobre todo de la publicidad.
          </>
        }
        positivo={[
          <>Casi todo el mundo puede informarse sin pagar.</>,
          <>
            No se ha hundido: se mueve entre el {fmt(paganMin, 0)} % y el {fmt(paganMax, 0)} % desde {anioPagan0}.
          </>,
          <>La publicidad digital crece: en 2025 fue el 55 % de la inversión en medios (3.494 M€, InfoAdex 2026).</>,
        ]}
        negativo={[
          pagan < paganMax ? (
            <>
              Del {fmt(paganMax, 0)} % de {anioPaganMax} ha bajado al {fmt(pagan, 0)} % en {anioPagan}.
            </>
          ) : (
            <>Aun en su mejor año, solo paga el {fmt(pagan, 0)} %.</>
          ),
          <>Si los medios dependen de anunciantes, públicos o privados, les es más difícil ser independientes de ellos.</>,
          <>Parte del dinero de la publicidad en internet se lo llevan buscadores y redes sociales, que no hacen periodismo.</>,
        ]}
        graficas={[
          {id: 'med-pagan', lab: 'Pagan por noticias'},
          {id: 'med-publicidad', lab: 'Dónde va la publicidad'},
          {id: 'med-publi-inst', lab: 'Publicidad institucional'},
        ]}
      />
    </Cuestiones>
  );
}
