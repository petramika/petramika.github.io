import Info from '../../componentes/Info';
import {L} from '../../componentes/enlace';
import {HAY_CASAS} from '../../datos';
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

export default function Casas() {
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
            El reparto de la barra (vacías, uso esporádico…) es del censo de 2021, el último que lo mide: se hizo con el consumo de luz, un método
            nuevo de 2021. Vacía es la que gasta menos que 15 días de uso al año; de uso esporádico, la que se usa de 1 a 3 meses (sobre todo
            segundas residencias). El próximo censo será el de 2031.
          </p>
          <p className="srcl">
            Fuentes: {L('INE, población en viviendas familiares por edad (tabla 60124)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=60124')},{' '}
            {L('INE, hogares por tamaño (tabla 60131)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=60131')},{' '}
            {L('Ministerio de Vivienda, parque de viviendas', 'https://apps.fomento.gob.es/BoletinOnline2/sedal/33100500.XLS')} y{' '}
            {L('INE, Censo de Población y Viviendas 2021', 'https://ine.es/prensa/censo_2021_jun.pdf')}.
          </p>
        </Info>
      </h3>
      <p className="note">
        {cuando} viven en una casa <b>{M(H.adultos)} de adultos</b> y {M(H.menores)} de menores. Hay unos {M(V.total)} de
        viviendas: <b>{fmt(porAdulto, 2)} por adulto</b>, una por cada {fmt(1 / porAdulto, 1)} adultos.
      </p>
      <p className="note" style={{marginTop: 10}}>
        Para qué se usaban las viviendas en el <T k="censo">censo</T> de 2021, el último que lo mide:
      </p>
      <div className="stack" style={{height: 30, marginTop: 6}}>
        <span style={{flex: C.principales, background: '#2F9E44'}} title={`Viviendas donde vive un hogar: ${fmt(C.principales / 1e6, 2)} millones`} />
        <span style={{flex: C.vacias, background: '#E03131'}} title={`Vacías: ${fmt(C.vacias / 1e6, 2)} millones`} />
        <span style={{flex: C.esporadicas, background: '#F59F00'}} title={`Uso esporádico: ${fmt(C.esporadicas / 1e6, 2)} millones`} />
        <span style={{flex: C.restoNoPrincipales, background: '#ADB5BD'}} title={`Resto de viviendas no principales: ${fmt(C.restoNoPrincipales / 1e6, 2)} millones`} />
      </div>
      <div className="statlegend">
        <span>
          <i className="sw" style={{background: '#2F9E44'}} />
          Donde vive un hogar: <b className="num">{M(C.principales)}</b>
        </span>
        <span>
          <i className="sw" style={{background: '#E03131'}} />
          Vacías: <b className="num">{M(C.vacias)}</b> ({fmt((C.vacias / C.viviendas) * 100, 1)} %)
        </span>
        <span>
          <i className="sw" style={{background: '#F59F00'}} />
          Uso esporádico, 1–3 meses al año: <b className="num">{M(C.esporadicas)}</b>
        </span>
        <span>
          <i className="sw" style={{background: '#ADB5BD'}} />
          Resto no principales: <b className="num">{M(C.restoNoPrincipales)}</b>
        </span>
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
