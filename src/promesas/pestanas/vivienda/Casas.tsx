import {useEffect, useState} from 'react';
import Info from '../../componentes/Info';
import {L} from '../../componentes/enlace';
import {HAY_CASAS, VIV} from '../../datos';
import {fmt} from '../../lib/formato';
import {T} from '../../../comun/Glosario';
import {fechaHoy} from './cuentas';

/*
  ¿Hay casas para todos? La cuenta se hace con adultos y hogares, no con
  habitantes: los menores viven con su familia y casi nadie vive una persona
  por casa. Personas y hogares de 2026, viviendas de 2025 y el reparto de las
  vacias del censo de 2021, el ultimo que las mide (datos/vivienda/hay-casas.json).
*/
const {hoy: H, viviendas: V, censo2021: C} = HAY_CASAS;
const M = (n: number) => fmt(n / 1e6, 1) + ' M';

type Censo = {viviendas: number; principales: number; vacias: number; secundarias: number; otras: number};
const CENSOS = HAY_CASAS.censos as Record<string, Censo>;
/** Años sin censo: viviendas del Ministerio (final del año anterior) y hogares del INE (1 de enero) */
const ESTIMADOS = HAY_CASAS.estimados as Record<string, {viviendas: number; hogares: number}>;
const ANIOS_CENSO = [...Object.keys(CENSOS), ...Object.keys(ESTIMADOS)].map(Number).sort((a, b) => a - b);
const TURIS = VIV.turis as Record<string, number>;
const RAYADO = 'repeating-linear-gradient(135deg, #E03131 0 6px, #F59F00 6px 12px)';

export default function Casas() {
  const ultimoCenso = ANIOS_CENSO[ANIOS_CENSO.length - 1];
  const [censo, setCenso] = useState(ultimoCenso);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    if (!play) return;
    const t = setInterval(() => {
      setCenso((a) => {
        const i = ANIOS_CENSO.indexOf(a);
        if (i >= ANIOS_CENSO.length - 1) {
          setPlay(false);
          return a;
        }
        return ANIOS_CENSO[i + 1];
      });
    }, 1100);
    return () => clearInterval(t);
  }, [play]);
  const reproducir = () => {
    if (!play && censo >= ultimoCenso) setCenso(ANIOS_CENSO[0]);
    setPlay(!play);
  };
  const cs = CENSOS[censo];
  const est = ESTIMADOS[censo];
  const nuevo = censo >= 2021;
  const turis = est ? TURIS[censo] ?? 0 : 0;
  const totalViv = cs ? cs.viviendas : est.viviendas;
  const sinHogar = est ? est.viviendas - est.hogares : 0;
  const trozos = (
    cs
      ? [
          {k: 'principales', lab: 'Donde vive un hogar', n: cs.principales, c: '#2F9E44'},
          {k: 'vacias', lab: 'Vacías', n: cs.vacias, c: '#E03131'},
          {k: 'secundarias', lab: nuevo ? 'Uso esporádico, 1–3 meses al año' : 'Secundarias (vacaciones, fines de semana)', n: cs.secundarias, c: '#F59F00'},
          {k: 'otras', lab: nuevo ? 'Resto no principales' : 'Otro tipo', n: cs.otras, c: '#ADB5BD'},
        ]
      : [
          {k: 'principales', lab: 'Donde vive un hogar', n: est.hogares, c: '#2F9E44'},
          {k: 'sin', lab: 'Vacías, de uso esporádico y otras (sin separar)', n: sinHogar - turis, c: RAYADO},
          {k: 'turis', lab: 'Pisos turísticos', n: turis, c: '#AE3EC9'},
        ]
  ).filter((x) => x.n >= 1000);
  const porAdulto = V.total / H.adultos;
  const adultosPorHogar = H.adultos / H.hogares;
  const faltarian = H.adultos - V.total;
  // Aproximado: viviendas de final de 2025 menos hogares de mediados de 2026
  const sinNadie = V.total - H.hogares;
  const enCentros = Math.round((C.poblacion - C.personasEnViviendas) / 1e4) * 1e4;
  // «A mediados de 2026» si el dato es de 1 de julio; si no, la fecha tal cual
  const hoy = fechaHoy();
  const cuando = hoy.julio ? `A mediados de ${hoy.anio}` : `A ${H.fecha}`;

  return (
    <div id="viv-casas" className="box casas" style={{marginTop: 12}}>
      <h3>
        ¿Hay casas para todos?{' '}
        <Info>
          <p>
            Personas y hogares: INE, a {H.fecha} (dato provisional). Se cuentan las personas que viven en una vivienda; quedan fuera las que viven
            en residencias, cuarteles, conventos o prisiones (unas {fmt(enCentros, 0)} en 2021). Los menores de 18 años se apartan porque viven con
            su familia y no buscan casa. Viviendas: estimación del Ministerio de Vivienda a final de {V.anio}. Como son fechas y fuentes distintas,
            las viviendas «sobrantes» son una aproximación.
          </p>
          <p>
            El reparto de la barra sale de los censos de 1991, 2001, 2011 y 2021. Hasta 2011, los agentes del censo clasificaban cada vivienda en
            principal, secundaria (vacaciones, fines de semana) o vacía. En 2021 se hizo con el consumo de luz, un método nuevo: vacía es la que gasta
            menos que 15 días de uso al año; de uso esporádico, la que se usa de 1 a 3 meses (sobre todo segundas residencias). Por eso 2021 no se
            compara del todo con los anteriores, aunque el porcentaje de vacías sale parecido en todos.
          </p>
          <p>
            De 2022 en adelante no hay censo, así que la barra es una estimación propia: viviendas que calcula el Ministerio a 31 de diciembre del
            año anterior menos hogares del INE a 1 de enero (en cada hogar vive al menos una persona de forma habitual). Lo que queda son viviendas
            sin nadie que viva en ellas todo el año: vacías, segundas residencias y otras, juntas. Dentro se separan los pisos turísticos que cuenta
            el INE en mayo de cada año. Con fuentes distintas, es orientativo. En 2021 las dos fuentes casi coinciden con el censo.
          </p>
          <p className="srcl">
            Fuentes: {L('INE, población en viviendas familiares por edad (tabla 60124)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=60124')},{' '}
            {L('INE, hogares por tamaño (tabla 60131)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=60131')},{' '}
            {L('Ministerio de Vivienda, parque de viviendas', 'https://apps.fomento.gob.es/BoletinOnline2/sedal/33100500.XLS')} y{' '}
            {L('INE, Censo de Población y Viviendas 2021', 'https://ine.es/prensa/censo_2021_jun.pdf')},{' '}
            {L('Censo 2011', 'https://www.ine.es/prensa/np775.pdf')} y{' '}
            {L('Censo 2001, con la variación desde 1991', 'https://www.ine.es/prodyser/pubweb/pub_otras/espXXI_completo.pdf')}; estimación:{' '}
            {L('Ministerio de Vivienda, parque de viviendas', 'https://apps.fomento.gob.es/BoletinOnline2/sedal/33100500.XLS')},{' '}
            {L('INE, hogares (tabla 60131)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=60131')} y{' '}
            {L('INE, viviendas turísticas (tabla 39364)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=39364')}.
          </p>
        </Info>
      </h3>
      <p className="note">
        {cuando} viven en una casa <b>{M(H.adultos)} de adultos</b> y {M(H.menores)} de menores. Hay unos {M(V.total)} de
        viviendas: <b>{fmt(porAdulto, 2)} por adulto</b>, una por cada {fmt(1 / porAdulto, 1)} adultos.
      </p>
      <p className="note" style={{marginTop: 10}}>
        {cs ? (
          <>
            Para qué se usaban las viviendas en el <T k="censo">censo</T> de {censo}: <b>{M(cs.viviendas)} de viviendas</b>, el{' '}
            {fmt((cs.vacias / cs.viviendas) * 100, 1)} % vacías.
          </>
        ) : (
          <>
            <b>Estimación</b> a 1 de enero de {censo}: <b>{M(est.viviendas)} de viviendas</b> y {M(est.hogares)} de hogares, así que en unos{' '}
            {M(sinHogar)} ({fmt((sinHogar / est.viviendas) * 100, 1)} %) no vive nadie de forma habitual. Sin censo no se puede saber cuántas
            están vacías y cuántas son segundas residencias.
          </>
        )}{' '}
        Pulsa ▶ para verlo desde {ANIOS_CENSO[0]}.
      </p>
      <div className="tl-anios" role="group" aria-label="Elegir censo">
        <button type="button" className="tl-play" onClick={reproducir} aria-label={play ? 'Pausar' : 'Verlo año a año'}>
          {play ? '❚❚' : '▶'}
        </button>
        <div className="tl-linea">
          {ANIOS_CENSO.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={a === censo}
              className="clave"
              onClick={() => {
                setPlay(false);
                setCenso(a);
              }}
            >
              <i />
              <span>{a}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="stack tl-barra" style={{height: 30, marginTop: 8}}>
        {trozos.map((x) => (
          <span key={x.k} style={{flex: x.n, background: x.c}} title={`${x.lab}: ${fmt(x.n / 1e6, 2)} millones`} />
        ))}
      </div>
      <div className="statlegend">
        {trozos.map((x) => (
          <span key={x.k}>
            <i className="sw" style={{background: x.c}} />
            {x.lab}: <b className="num">{M(x.n)}</b> ({fmt((x.n / totalViv) * 100, 1)} %)
          </span>
        ))}
      </div>

      <dl className="cuenta">
        <div className="ko">
          <dt>Si cada adulto viviera solo</dt>
          <dd>
            Harían falta {M(H.adultos)} de viviendas: <b>faltarían {M(faltarian)}</b>.
          </dd>
        </div>
        <div className="ok">
          <dt>Como vivimos hoy</dt>
          <dd>
            {fmt(adultosPorHogar, 1)} adultos por <T k="hogar">hogar</T> de media: parejas, familias, pisos compartidos, padres que viven con sus hijos mayores… y{' '}
            {M(H.hogaresUnipersonales)} de personas que viven solas. Hacen falta {M(H.hogares)} de viviendas y <b>sobran unos {M(sinNadie)}</b> en
            las que no vive nadie.
          </dd>
        </div>
        <div className="half">
          <dt>¿Y si tengo 35 años y busco casa?</dt>
          <dd>
            En número hay de sobra: solo con las {M(C.vacias)} de vacías que contó el censo podría independizarse mucha más gente sin construir
            nada.
            Pero no están
            donde hacen falta: el {fmt(C.vaciasPorTamano.menos10000.vacias, 0)} % de las vacías está en pueblos de menos de 10.000 habitantes, donde
            vive el {fmt(C.vaciasPorTamano.menos10000.poblacion, 0)} % de la población; las ciudades de más de 250.000 habitantes, con el{' '}
            {fmt(C.vaciasPorTamano.mas250000.poblacion, 0)} % de la gente, solo tienen el {fmt(C.vaciasPorTamano.mas250000.vacias, 1)} %.{' '}
            <b>El problema no es cuántas hay, sino dónde están y cuánto cuestan</b>: mira «Años de sueldo para comprar una casa» y «Precio del
            alquiler» más abajo.
          </dd>
        </div>
      </dl>
    </div>
  );
}
