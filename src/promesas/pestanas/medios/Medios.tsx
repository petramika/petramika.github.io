import {MEDIA} from '../../datos';
import {fmt} from '../../lib/formato';
import Mini from '../../componentes/graficas/Mini';
import {L} from '../../componentes/enlace';
import {T} from '../../../comun/Glosario';
import {comparaVeces, ent, masMenos, maximo, minimo, NATIVOS, num1, penultimo, primerAnioPorEncima, primero, proporcion, ultimo, veces, type Serie} from './serie';

/*
  Las graficas de medios, todas en una rejilla y ordenadas por el primer año
  con dato, de la mas antigua a la mas reciente. Las cifras sueltas que antes
  iban en recuadros estan ahora en la (i) de la grafica a la que pertenecen.
  Las cifras de las (i) que salen de medios.json se calculan; las de estudios
  (DNR, CIS, Eurobarometro, Media Pluralism Monitor, Maldita...) van a mano
  con su año.
*/

// Color de cada medio en las graficas (presentacion, no datos)
const MEDIA_COL = {tv: '#3B5BDB', prensa: '#868E96', online: '#0B7A75', redes: '#E8590C', diarios: '#868E96', internet: '#0B7A75', radio: '#F59F00'};

const pct = (v: number) => fmt(v, 0) + ' %';
const DNR = L('Digital News Report España (Reuters Institute y Universidad de Navarra)', 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/spain');
const ARMENTIA = 'https://indexcomunicacion.es/index.php/indexcomunicacion/article/download/725/899/6317';
// Marco General de los Medios en España 2026 (AIMC), con la serie del EGM desde 1980
const AIMC_MARCO = 'https://www.aimc.es/a1mc-c0nt3nt/uploads/2026/02/Marco_General_Medios_2026.pdf';

// Color de cada red social en su grafica
const COLOR_RED: Record<string, string> = {
  Instagram: '#AE3EC9', Facebook: '#1C7ED6', WhatsApp: '#2F9E44', YouTube: '#E03131', TikTok: '#212529', 'X/Twitter': '#868E96',
};

/* ---- Cifras de los textos, leidas de medios.json ---- */
const EGM = MEDIA.egm as Record<string, Serie>;
const PUBLI = MEDIA.publi as Record<string, Serie>;
const FUENTE = MEDIA.fuente as Record<string, Serie>;
const REDES = MEDIA.redes as Record<string, Serie>;
const deCada10 = (v: number) => fmt(Math.round(v / 10), 0);

// Audiencia (EGM)
const [anioEgm, tvUlt] = ultimo(EGM.tv);
const [anioInternet0] = primero(EGM.internet);
const [, internetUlt] = ultimo(EGM.internet);
const [anioPapelMax, papelMax] = maximo(EGM.diarios);
const [, papelUlt] = ultimo(EGM.diarios);
const [, netUlt] = ultimo(EGM.diariosNet);

// Publicidad (InfoAdex), clasificacion antigua y nueva
const anioCruce = primerAnioPorEncima(PUBLI.internet, PUBLI.tv);
const [anioPubliAnt, internetAnt] = ultimo(PUBLI.internet);
const tvAnt = PUBLI.tv[anioPubliAnt];
const diariosAnt = PUBLI.diarios[anioPubliAnt];
const [anioDiarios0, diarios0] = maximo(PUBLI.diarios);
const [anioNueva0] = primero(PUBLI.tvNueva);
const [anioNueva, internetNueva] = ultimo(PUBLI.internetNueva);
const tvNueva = PUBLI.tvNueva[anioNueva];

// Reporteros Sin Fronteras (puesto: menos es mejor)
const [anioRsf, rsf] = ultimo(MEDIA.rsf);
const [, rsfAntes] = penultimo(MEDIA.rsf);
const [anioRsfMejor, rsfMejor] = minimo(MEDIA.rsf);
const textoRsf =
  rsf === rsfMejor
    ? `En ${anioRsf} España alcanzó su mejor puesto (${rsf} de 180).`
    : `En ${anioRsfMejor} España alcanzó su mejor puesto (${rsfMejor} de 180); en ${anioRsf} ${rsf > rsfAntes ? 'bajó al' : rsf < rsfAntes ? 'subió al' : 'siguió en el'} ${rsf}.`;

// Nativos digitales (serie cerrada)
const [anioNativos] = ultimo(NATIVOS);

// Fuente de noticias (DNR)
const [anioPrensa0, prensa0] = primero(FUENTE.prensa);
const [anioPrensa, prensaUlt] = ultimo(FUENTE.prensa);
const [anioRedesFuente, redesFuente] = ultimo(FUENTE.redes);
const [anioRedesMax, redesMax] = maximo(FUENTE.redes);

// Pagan por noticias (DNR)
const [anioPagan, paganUlt] = ultimo(MEDIA.pagan);
const [anioPaganMax, paganMax] = maximo(MEDIA.pagan);
const [, paganMin] = minimo(MEDIA.pagan);

// Confianza y preocupacion (DNR)
const [anioConfia, confia] = ultimo(MEDIA.confianza);
const [anioConfiaMax, confiaMax] = maximo(MEDIA.confianza);
const [, preocupa] = ultimo(MEDIA.preocupa);
const [anioPreocupaMax, preocupaMax] = maximo(MEDIA.preocupa);

// Redes para informarse (DNR)
const [anioFb0, fb0] = primero(REDES.Facebook);
const [anioFbMin, fbMin] = minimo(REDES.Facebook);
const [anioIg0, ig0] = primero(REDES.Instagram);
const [anioIg, igUlt] = ultimo(REDES.Instagram);
const [anioTt0, tt0] = primero(REDES.TikTok);
const [, ttUlt] = ultimo(REDES.TikTok);

export default function Medios() {
  return (
    <div id="media" className="charts">
      <Mini
        id="med-audiencia"
        title="Audiencia diaria de cada medio"
        sub="% de la población de 14 años o más que lo usó el día anterior (EGM)"
        series={[
          {lab: 'Televisión', c: MEDIA_COL.tv, data: MEDIA.egm.tv},
          {lab: 'Radio', c: MEDIA_COL.radio, data: MEDIA.egm.radio},
          {lab: 'Internet', c: MEDIA_COL.internet, data: MEDIA.egm.internet},
          {lab: 'Diarios en papel', c: MEDIA_COL.diarios, data: MEDIA.egm.diarios},
          {lab: 'Diarios en internet', c: MEDIA_COL.diarios, dash: true, data: MEDIA.egm.diariosNet},
        ]}
        f={(v) => fmt(v, 1) + ' %'}
        x0={1985.5}
        yMin={0}
        note={
          <>
            <p>
              La serie más larga de qué medios usa la gente. La televisión llegaba cada día a cerca de 9 de cada 10 personas hasta 2016; en {anioEgm},
              a {deCada10(tvUlt)}. Internet pasa de casi nadie en {anioInternet0} a {deCada10(internetUlt)} de cada 10 en {anioEgm}. La lectura de
              diarios en papel tocó techo en {anioPapelMax} ({fmt(Math.round(papelMax), 0)} de cada 100) y en {anioEgm} es {num1(papelUlt)}; la de
              diarios por internet ya es {comparaVeces(netUlt, papelUlt)}.
            </p>
            <p>
              Es la encuesta de <T k="audiencia">audiencias</T> de referencia del sector (<T k="egm">EGM</T>, de AIMC). Radio y televisión:{' '}
              <T k="audiencia-acumulada">audiencia acumulada</T> del día anterior. Diarios: lectura el día anterior. Internet: uso el día anterior
              (desde {anioInternet0}). Desde 2018 los lectores del PDF o visor digital cuentan como papel; antes, como internet. Mide si se usa el
              medio, no si se usa para informarse.
            </p>
          </>
        }
        src={L('Marco General de los Medios en España 2026, AIMC (EGM)', AIMC_MARCO)}
      />
      <Mini
        id="med-publicidad"
        title="Dónde se invierte la publicidad"
        sub="millones de € al año: toda la publicidad de empresas y administraciones, por medio"
        series={[
          {lab: 'Televisión', c: MEDIA_COL.tv, data: MEDIA.publi.tv},
          {lab: 'Internet', c: MEDIA_COL.internet, data: MEDIA.publi.internet},
          {lab: 'Diarios en papel', c: MEDIA_COL.diarios, data: MEDIA.publi.diarios},
          {lab: 'Televisión con su parte digital (clasificación nueva)', c: MEDIA_COL.tv, dash: true, data: MEDIA.publi.tvNueva},
          {lab: 'Diarios y dominicales con su web (clasificación nueva)', c: MEDIA_COL.diarios, dash: true, data: MEDIA.publi.diariosNueva},
          {lab: 'Buscadores, redes y otras webs (clasificación nueva)', c: MEDIA_COL.internet, dash: true, data: MEDIA.publi.internetNueva},
        ]}
        f={(v) => fmt(v, 0) + ' M€'}
        x0={1994}
        x1={2026.5}
        yMin={0}
        note={
          <>
            <p>
              Es toda la publicidad que se paga en España (empresas, marcas y administraciones), no la de un partido ni la del Gobierno: el color de
              fondo solo indica qué partido gobernaba cada año. La publicidad es el principal ingreso de muchos medios.
              {anioCruce && <> En {anioCruce} internet ya recibía más dinero que la televisión.</>} En {anioPubliAnt} recibió {ent(internetAnt)} M€,
              frente a {ent(tvAnt)} de la televisión y {ent(diariosAnt)} de los diarios en papel, {veces(diarios0, diariosAnt, 'menos')} que
              en {anioDiarios0}.
            </p>
            <p>
              Desde su estudio de 2025, <T k="infoadex">InfoAdex</T> suma a cada medio su parte digital (la web de un diario cuenta como diario) y
              separa buscadores y redes sociales, así que esas cifras (líneas discontinuas, desde {anioNueva0}) no se empalman con las anteriores.
              Con esa clasificación, buscadores, redes sociales y otras webs recibieron {ent(internetNueva)} M€ en {anioNueva},{' '}
              {masMenos(internetNueva, tvNueva)} la televisión ({ent(tvNueva)} M€ con su parte digital). Según el estudio InfoAdex 2026, sumando
              las webs de diarios, televisiones y demás medios, lo digital fue en 2025 el 55 % de la inversión en{' '}
              <T k="medios-controlados">medios controlados</T> (3.494 M€); IAB Spain y PwC, con otra metodología, lo sitúan en 6.211 M€. InfoAdex
              empezó en 1994: antes no hay una serie comparable.
            </p>
          </>
        }
        src={
          <>
            {L('InfoAdex, recogido en Armentia y Marín (2020)', ARMENTIA)} (1995–2019); 2020–2022:{' '}
            {L('InfoAdex 2023, en Datos Claves de la aea', 'https://newsletters.anunciantes.com/744/assets/Datos-Claves-2022.pdf')}; 2023:{' '}
            {L('InfoAdex 2024, vía MarketingDirecto', 'https://www.marketingdirecto.com/marketing-general/inversion-publicitaria-2023-informe-de-infoadex')} y{' '}
            {L('Reason Why', 'https://www.reasonwhy.es/actualidad/estudio-infoadex-2024-inversion-publicitaria-graficos')}; clasificación nueva:{' '}
            {L('InfoAdex 2025, en Datos Claves de la aea', 'https://www.newsletters.anunciantes.com/792/assets/Anunciantes_Datos_Claves_2025.pdf')} y{' '}
            {L('resumen InfoAdex 2026', 'https://media.timtul.com/media/lafede/Resumen%20Estudio%20de%20Inversiones%202026_20260211151142.pdf')}; IAB:{' '}
            {L('IAB Spain', 'https://www.puromarketing.com/66/216793/inversion-publicitaria-digital-marca-nuevo-maximo-2025-62112-millones-euros-crecimiento')}
          </>
        }
      />
      <Mini
        id="med-libertad"
        title="Libertad de prensa: puesto de España en el mundo"
        sub="clasificación de Reporteros Sin Fronteras (1 = mejor; arriba es mejor)"
        series={[{lab: 'Puesto', c: '#0B7A75', data: MEDIA.rsf}]}
        invert
        f={(v) => 'puesto ' + fmt(v, 0)}
        x0={2001.5}
        yMin={20}
        note={
          <>
            <p>{textoRsf} El índice cambió de método en 2013 y en 2022.</p>
            <p>
              En 2016 solo el 24 % de los españoles creía que sus medios están libres de presión política o comercial; media de la UE, 38 % (
              <T k="eurobarometro">Eurobarómetro</T> Especial 452). En 2022, el 61 % creía que sufren presión política y el 57 %, empresarial (
              {L('Digital News Report, Universidad de Navarra', 'https://en.unav.edu/web/digital-news-report/entradas/-/blogs/la-independencia-de-los-medios-espanoles-ante-los-grupos-de-presion-bajo-sospecha')}).
            </p>
            <p>
              Riesgo para la independencia política de los medios: 49 % en 2026, frente al 54 % de 2015 (
              {L('Media Pluralism Monitor, Instituto Universitario Europeo', 'https://cmpf.eui.eu/country/spain/')}). Riesgo alto en la independencia de los
              medios públicos en 2023 y 2024: 67 % (Media Pluralism Monitor, recogido en el Informe sobre el <T k="estado-de-derecho">Estado de Derecho</T> de la Comisión Europea).
            </p>
          </>
        }
        src={L('Reporteros Sin Fronteras', 'https://rsf.org/es/pais/espa%C3%B1a')}
      />
      <Mini
        id="med-nativos"
        title="Medios nativos digitales"
        sub="medios de noticias que nacieron en internet"
        series={[{lab: 'Medios nativos digitales', c: MEDIA_COL.online, data: NATIVOS}]}
        bars
        f={(v) => fmt(v, 0) + ' medios'}
        x0={2004.5}
        yMin={0}
        note={
          <>
            {(MEDIA.nativos as [string, string, string][]).map(([y, v, t]) => (
              <p key={y}>
                {y}: {v} {t}.
              </p>
            ))}
            <p>
              Son recuentos de estudios distintos, así que el número exacto puede variar según cómo se cuente un medio. No hay un recuento publicado
              posterior a {anioNativos}.
            </p>
          </>
        }
        src={
          <>
            {L('Salaverría et al. (2018)', 'https://nuevaepoca.revistalatinacs.org/index.php/revista/article/download/527/793')},{' '}
            {L('Negredo et al. (2020)', 'https://cogitatiopress.com/mediaandcommunication/article/view/2738')} y{' '}
            {L('Negredo et al. (2023)', 'https://analisi.cat/article/view/v68-negredo-et-al')}
          </>
        }
      />
      <Mini
        id="med-publi-inst"
        title="Publicidad institucional del Estado"
        sub="millones de € al año en campañas del Gobierno central"
        series={[{lab: 'Gasto', c: '#AE3EC9', data: MEDIA.publiInst}]}
        bars
        f={(v) => fmt(v, 1) + ' M€'}
        x0={2005.5}
        yMin={0}
        note={
          <>
            Es el dinero que la <T k="administracion-general-del-estado">Administración General del Estado</T> paga a medios por sus campañas. Desde
            2008 algunas entidades públicas pasaron a contar aparte como publicidad comercial, así que la serie no es del todo homogénea.
          </>
        }
        src={L('Informes anuales de publicidad y comunicación institucional, La Moncloa', 'https://www.lamoncloa.gob.es/serviciosdeprensa/cpci/Paginas/PlanesEInformes.aspx')}
      />
      <Mini
        id="med-fuente"
        title="Fuente de noticias en la última semana"
        sub="% de internautas que la usaron"
        series={[
          {lab: 'Televisión', c: MEDIA_COL.tv, data: MEDIA.fuente.tv},
          {lab: 'Internet (incluye redes)', c: MEDIA_COL.online, data: MEDIA.fuente.online},
          {lab: 'Redes sociales', c: MEDIA_COL.redes, data: MEDIA.fuente.redes},
          {lab: 'Prensa en papel', c: MEDIA_COL.prensa, dash: true, data: MEDIA.fuente.prensa},
        ]}
        f={pct}
        x0={2012.5}
        yMin={0}
        note={`La prensa en papel ha pasado de ${fmt(prensa0, 0)} a ${fmt(prensaUlt, 0)} de cada 100 personas en ${Number(anioPrensa) - Number(anioPrensa0)} años. Las redes sociales ya informan a ${proporcion(redesFuente)}.`}
        src={DNR}
      />
      <Mini
        id="med-pagan"
        title="Personas que pagan por noticias en internet"
        sub="% de internautas"
        series={[{lab: 'Pagan', c: '#495057', data: MEDIA.pagan}]}
        f={pct}
        x0={2013.5}
        yMin={0}
        note={`Cuántas personas pagaron en el último año por noticias en internet: una suscripción, una donación o un pago suelto. Se ha movido siempre entre ${fmt(paganMin, 0)} y ${fmt(paganMax, 0)} de cada 100 (máximo en ${anioPaganMax}) y en ${anioPagan} es ${fmt(paganUlt, 0)}. La mayoría se informa gratis, así que los medios dependen sobre todo de la publicidad.`}
        src={DNR}
      />
      <Mini
        id="med-confianza"
        title="Confianza y miedo a los bulos"
        sub="% de internautas"
        series={[
          {lab: 'Confía en las noticias la mayor parte del tiempo', c: '#2F9E44', data: MEDIA.confianza},
          {lab: 'Le preocupa distinguir lo real de lo falso en internet', c: '#E03131', data: MEDIA.preocupa},
        ]}
        f={pct}
        x0={2014.5}
        yMin={0}
        note={
          <>
            <p>
              En {anioConfiaMax} confiaba {proporcion(confiaMax)}; en {anioConfia}, {proporcion(confia)}.{' '}
              {preocupa === preocupaMax ? (
                <>La preocupación por los <T k="bulo">bulos</T> alcanza su máximo: {fmt(preocupa, 0)} de cada 100</>
              ) : (
                <>
                  La preocupación por los <T k="bulo">bulos</T> está en {fmt(preocupa, 0)} de cada 100 (máximo: {fmt(preocupaMax, 0)} en{' '}
                  {anioPreocupaMax})
                </>
              )}{' '}
              (la media mundial en 2026 era 62).
            </p>
            <p>
              81,9 de cada 100 están preocupados por los bulos y el 84,3 % apoya que existan <T k="verificador">verificadores</T> (CIS, mayo de
              2026, citado por prensa). En 2025, el 52 % se sintió expuesto a <T k="desinformacion">desinformación</T> a menudo en la última semana;
              la media de la UE es el 36 % (
              {L('Eurobarómetro, vía Euronews', 'https://es.euronews.com/next/2026/02/02/crece-europa-exposicion-percibida-desinformacion-los-bulos-que-paises-sufren-mas')}).
            </p>
            <p>
              Maldito Bulo desmintió 4.245 bulos entre 2017 y 2022, con el pico en 2020 (
              {L('Blanco-Herrero et al., 2024', 'https://revistas.ucm.es/index.php/ESMP/article/view/96593')}): unos 800 sobre la COVID-19 entre marzo y
              diciembre de 2020 ({L('Maldita.es', 'https://maldita.es/clima/20211021/informe-desinformacion-covid19-cambioclimatico-violenciadegenero')}) y
              133 sobre la DANA de Valencia en 2024 (
              {L('Maldita.es', 'https://maldita.es/malditobulo/20241120/bulos-y-desinformaciones-sobre-el-paso-de-la-dana-en-el-este-y-sur-de-espana-en-octubre-de-2024/')}).
            </p>
          </>
        }
        src={<>{DNR}. 2019 y 2021, citas secundarias; 2020 sin dato</>}
      />
      <Mini
        id="med-redes"
        title="Redes sociales para informarse"
        sub="% de internautas que la usó para noticias en la última semana"
        series={Object.entries(REDES).map(([n, data]) => ({lab: n, c: COLOR_RED[n] ?? '#495057', data}))}
        f={pct}
        x0={2018.5}
        yMin={0}
        hitos={[{x: 2022.91, lab: 'Llega ChatGPT (nov. 2022)'}]}
        note={
          <>
            <p>
              Facebook era la gran red para informarse ({fmt(fb0, 0)} de cada 100 en {anioFb0}) y cayó hasta {fmt(fbMin, 0)} en {anioFbMin}.
              Instagram pasa de {fmt(ig0, 0)} en {anioIg0} a {fmt(igUlt, 0)} en {anioIg} y TikTok, de {fmt(tt0, 0)} en {anioTt0} a {fmt(ttUlt, 0)}.
            </p>
            <p>
              La línea discontinua marca la llegada de ChatGPT (30 de noviembre de 2022), el punto de partida de la IA al alcance de todos. Pero la
              caída de Facebook empieza antes, así que la IA no la explica. Pesa más que <T k="meta">Meta</T> haya ido quitando peso a las noticias
              en Facebook (en 2018 cambió el <T k="algoritmo">algoritmo</T> para priorizar a amigos y familia; en 2024 anunció que deja de invertir
              en noticias), que la gente se haya ido a redes de vídeo (Instagram, TikTok) y que cada vez más personas eviten las noticias (37 % en
              2026, Digital News Report). En total, las redes como fuente de noticias pasan de {fmt(redesMax, 0)} en {anioRedesMax} a{' '}
              {fmt(redesFuente, 0)} en {anioRedesFuente}.
            </p>
            <p>
              La IA empieza a asomar: en 2026 el 8 % usó un <T k="chatbot">chatbot</T> (ChatGPT, Gemini…) para informarse en la última semana, casi
              el doble que en 2025, y el 14 % entre los de 18 a 24 años. Aún es poco frente a las redes.
            </p>
            <p>
              Cada año el informe da solo las seis redes más usadas para noticias en España: TikTok no entra hasta {anioTt0} (en 2022 la sexta era
              Telegram, 7 %). Desde 2021 la encuesta incluye a quien no consumió noticias en el último mes, lo que rebaja algo las cifras. Las de 2026
              salen de una segunda encuesta en marzo (1.000 personas) porque las redes se presentaron mal en la primera; el salto de 2025 a 2026 puede
              deberse en parte a eso.
            </p>
          </>
        }
        src={
          <>
            {DNR}; 2019–2025:{' '}
            {L('informes anuales del Digital News Report (página de España)', 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025/spain')}; IA:{' '}
            {L('DNR España 2026, «La IA informativa en España»', 'https://www.unav.edu/web/digital-news-report/entradas/-/blogs/la-ia-informativa-en-espana-uso-minoritario-e-instrumental')}; Meta:{' '}
            {L('2018', 'https://about.fb.com/news/2018/01/news-feed-fyi-bringing-people-closer-together/')} y{' '}
            {L('2024', 'https://about.fb.com/news/2024/02/update-on-facebook-news-us-australia/')}
          </>
        }
      />
    </div>
  );
}
