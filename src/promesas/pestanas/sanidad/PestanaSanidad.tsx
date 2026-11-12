import {useEffect, useState} from 'react';
import {SANIDAD} from '../../datos';
import {fmt} from '../../lib/formato';
import Mini from '../../componentes/graficas/Mini';
import Info from '../../componentes/Info';
import {L} from '../../componentes/enlace';
import {Cuestion, Cuestiones} from '../../componentes/Cuestiones';
import COB from '../../datos/sanidad/cobertura.json';
import ESP from '../../datos/sanidad/esperas.json';
import REC from '../../datos/sanidad/recursos.json';
import DEMO from '../../datos/futuro/demografia.json';

/*
  Sanidad: quién paga y quién atiende (pública o privada), cuánto se espera,
  qué opina la gente y con cuántos médicos, enfermeras y camas. Datos en
  datos/sanidad/ (Encuestas de Salud, OCDE/Eurostat, Ministerio de Sanidad,
  INE y BOE).
*/
type Serie = Record<string, number>;
/* eslint-disable @typescript-eslint/no-explicit-any */
const C = (COB as any).cobertura as Record<string, any>;
const G = (COB as any).gasto;
const E = ESP as any;
const R = REC as any;
const POB = DEMO.historia.poblacion as Serie;

const n0 = (v: number) => fmt(v, 0);
const n1 = (v: number) => fmt(v, 1);
const pct1 = (v: number) => fmt(v, 1) + ' %';
const anios = (s: Record<string, unknown>) =>
  Object.keys(s)
    .filter((k) => /^\d{4}$/.test(k))
    .sort();
const ult = (s: Serie): [string, number] => {
  const k = anios(s).at(-1)!;
  return [k, s[k]];
};
const maxDe = (s: Serie): [string, number] => anios(s).reduce<[string, number]>((m, k) => (s[k] > m[1] ? [k, s[k]] : m), ['', -Infinity]);
const solo = (o: Record<string, unknown>): Serie =>
  Object.fromEntries(Object.entries(o).filter(([y, v]) => /^\d{4}$/.test(y) && typeof v === 'number')) as Serie;
const escala = (s: Serie, d: number): Serie => Object.fromEntries(Object.entries(s).map(([y, v]) => [y, v / d]));
/** Cortes de diciembre de las listas de espera, como serie por año */
const diciembre = (o: Record<string, any>, campo: string): Serie =>
  Object.fromEntries(
    Object.entries(o)
      .filter(([k, v]) => k.endsWith('-12') && v?.[campo] != null)
      .map(([k, v]) => [k.slice(0, 4), v[campo] as number]),
  );

const SANIDAD_ENC = 'https://www.sanidad.gob.es/estadEstudios/estadisticas/encuestaNacional/home.htm';
const OCDE_SHA = 'https://data-explorer.oecd.org/';
const SISLE = 'https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/listaEspera.htm';
const BAROMETRO = 'https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/home_BS.htm';
const EUROSTAT_REC = 'https://ec.europa.eu/eurostat/databrowser/view/hlth_rs_prs2/default/table';
const INE_COL = 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176781&menu=resultados&idp=1254735573175';

/** Olas de la Encuesta de Salud con el reparto completo de la cobertura */
const ENCUESTAS = Object.keys(C)
  .filter((y) => C[y].soloPublica != null)
  .sort();
const PRIMERA = ENCUESTAS[0];
const HIST = (COB as any).historica;
const PUB_HIST = HIST.publicaPct as Serie,
  PRIV_HIST = HIST.seguroPrivadoPct as Serie;
/** Antes de las encuestas completas: cobertura pública (registro y OCDE) y, desde 1995, seguro privado individual */
const ANTIGUOS = anios(PUB_HIST).filter((y) => y < PRIMERA);
const OLAS = [...ANTIGUOS, ...ENCUESTAS];
const TROZOS = [
  {k: 'conPublica', lab: 'Con sanidad pública', c: '#748FFC'},
  {k: 'soloPublica', lab: 'Solo la pública', c: '#3B5BDB'},
  {k: 'publicaYPrivada', lab: 'La pública y un seguro privado', c: '#F59F00'},
  {k: 'soloPrivada', lab: 'Solo privada', c: '#E8590C'},
  {k: 'ninguna', lab: 'Ninguna', c: '#ADB5BD'},
  {k: 'sinPublica', lab: 'Sin sanidad pública', c: '#868E96'},
];
const parteAntigua = (y: string, k: string): number => {
  const pub = PUB_HIST[y],
    priv = PRIV_HIST[y];
  if (k === 'sinPublica') return 100 - pub;
  if (priv == null) return k === 'conPublica' ? pub : 0;
  return k === 'soloPublica' ? pub - priv : k === 'publicaYPrivada' ? priv : 0;
};
/** 2003 publica aparte las mutualidades de funcionarios; las demás olas las cuentan dentro de «solo la pública» */
const parte = (y: string, k: string): number =>
  y < PRIMERA ? parteAntigua(y, k) : k === 'soloPublica' ? C[y].soloPublica + (C[y].mutualidades ?? 0) : (C[y][k] ?? 0);
/** El INE da población desde 1976: para 1975 se usa la de 1976 */
const poblacionHacia = (y: string) => POB[y] ?? POB[anios(POB)[0]];
const conPrivado = (y: string) => (C[y].publicaYPrivada ?? 0) + (C[y].soloPrivada ?? 0);

function Cobertura() {
  const ultimo = OLAS[OLAS.length - 1];
  const [ola, setOla] = useState(ultimo);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    if (!play) return;
    const t = setInterval(() => {
      setOla((a) => {
        const i = OLAS.indexOf(a);
        if (i >= OLAS.length - 1) {
          setPlay(false);
          return a;
        }
        return OLAS[i + 1];
      });
    }, 1000);
    return () => clearInterval(t);
  }, [play]);
  const reproducir = () => {
    if (!play && ola === ultimo) setOla(OLAS[0]);
    setPlay(!play);
  };
  const [aG, gPub] = ult(G.espanaPublicoPctTotal as Serie);
  const ue = G.ue27.publicoPctTotal as Serie;
  return (
    <div id="san-cobertura" className="box" style={{marginTop: 12}}>
      <h3>
        ¿Pública o privada?{' '}
        <Info>
          <p>
            Qué cobertura sanitaria tiene la gente según cada Encuesta de Salud: solo la sanidad pública, la pública y además un seguro privado, solo privada o
            ninguna. Los funcionarios con mutualidad (MUFACE, ISFAS, MUGEJU) se cuentan como «solo la pública» si no tienen otro seguro: su sanidad la paga el
            Estado, aunque muchos eligen una aseguradora privada.
          </p>
          <p>
            Antes de {PRIMERA} no hay una encuesta que reparta a toda la población. De 1975 a 1989 se cuenta a las personas con derecho a la sanidad pública
            según el registro del INSALUD; no se sabe cuántas tenían además un seguro privado. De 1995 a 2001 el seguro privado es solo el que se paga uno
            mismo; desde {PRIMERA} se suma el de la empresa, por eso sube de golpe. El dato de 1991 viene de un estudio de la Seguridad Social, sin comprobar en
            la fuente original, y faltan 1990, 1992 y de 1998 a 2000. Las encuestas de 2014 y 2020 solo cuentan a los mayores de 15 años.
          </p>
          <p>
            La sanidad pública no era para todos: en 1975 la Seguridad Social cubría a quienes cotizaban y a sus familias. La Ley General de Sanidad de 1986 y
            la ampliación de 1989 a las personas sin recursos la hicieron casi universal; desde 2018 lo es del todo.
          </p>
          <p className="srcl">
            Fuente: {L('Ministerio de Sanidad e INE, Encuestas Nacionales y Europeas de Salud y Encuesta de Salud de España', SANIDAD_ENC)};{' '}
            {L('INE, Anuario Estadístico (población protegida, INSALUD)', HIST.urlPublica)}; {L('OCDE, Health Statistics', HIST.urlPrivado)}.
          </p>
        </Info>
      </h3>
      {ola >= PRIMERA ? (
        <p className="note">
          En {ola}, <b>{pct1(conPrivado(ola))} de la población tenía un seguro privado</b>, casi siempre además de la pública. En {PRIMERA} era el{' '}
          {pct1(conPrivado(PRIMERA))}:{' '}
          {conPrivado(ultimo) / conPrivado(PRIMERA) >= 2 ? 'el doble' : `${fmt(conPrivado(ultimo) / conPrivado(PRIMERA), 1)} veces más`} en {+ultimo - +PRIMERA}{' '}
          años, y la mayor subida es la de los últimos años. Mientras, el Estado paga el {n0(gPub)} % del gasto sanitario ({aG}), menos que la media de la UE (
          {n0(ult(ue)[1])} %). Pulsa ▶ para verlo año a año desde 1975, el año en que murió Franco.
        </p>
      ) : (
        <p className="note">
          En {ola}, <b>la sanidad pública cubría al {pct1(PUB_HIST[ola])} de la población</b>
          {PUB_HIST[ola] < 99 ? <>: unos {fmt((poblacionHacia(ola) * (100 - PUB_HIST[ola])) / 100 / 1e6, 1)} millones de personas no tenían</> : null}.{' '}
          {PRIV_HIST[ola] != null ? (
            <>
              El {pct1(PRIV_HIST[ola])} pagaba un seguro privado por su cuenta (sin contar el de la empresa, que hasta {PRIMERA} no se preguntaba).
            </>
          ) : (
            <>No hay datos oficiales de cuántos tenían un seguro privado antes de 1995.</>
          )}{' '}
          {ola < '1986'
            ? 'Era la sanidad de la Seguridad Social, para quien cotizaba y su familia; la Ley General de Sanidad de 1986 la abrió a casi todos.'
            : ola < '1990'
              ? 'La Ley General de Sanidad de 1986 la estaba abriendo a todos; en 1989 llegó a las personas sin recursos.'
              : null}
        </p>
      )}
      <div className="tl-anios" role="group" aria-label="Elegir encuesta">
        <button type="button" className="tl-play" onClick={reproducir} aria-label={play ? 'Pausar' : 'Ver encuesta a encuesta'}>
          {play ? '❚❚' : '▶'}
        </button>
        <div className="tl-linea">
          {OLAS.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={a === ola}
              className="clave"
              onClick={() => {
                setPlay(false);
                setOla(a);
              }}
            >
              <i />
              <span>{a}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="stack tl-barra" style={{height: 30, marginTop: 8}}>
        {TROZOS.map((t) => (
          <span key={t.k} style={{flex: parte(ola, t.k), background: t.c}} title={`${t.lab}: ${pct1(parte(ola, t.k))}`} />
        ))}
      </div>
      <div className="statlegend">
        {TROZOS.filter((t) => parte(ola, t.k) > 0).map((t) => (
          <span key={t.k}>
            <i className="sw" style={{background: t.c}} />
            {t.lab}: <b className="num">{pct1(parte(ola, t.k))}</b>
          </span>
        ))}
      </div>
      <dl className="cuenta">
        <div className="half">
          <dt>Pagar dos veces</dt>
          <dd>
            Quien tiene un seguro privado sigue pagando la sanidad pública con sus impuestos: paga dos veces. Lo hace sobre todo para no esperar: para ver al
            especialista, hacerse una prueba u operarse antes.
          </dd>
        </div>
        <div className="ko">
          <dt>Por qué crece</dt>
          <dd>
            Las listas de espera se han más que duplicado desde 2005 y la satisfacción con la sanidad pública está en su punto más bajo. Cuanto más se espera,
            más gente que puede pagarlo se va también a la privada.
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function PestanaSanidad() {
  const quir = diciembre(E.quirurgica, 'pacientes'),
    quirDias = diciembre(E.quirurgica, 'dias'),
    quir6 = diciembre(E.quirurgica, 'pctMas6Meses');
  const consDias = diciembre(E.consultas, 'dias'),
    cons60 = diciembre(E.consultas, 'pctMas60Dias');
  const [aQ, qU] = ult(quir),
    [aQD, qdU] = ult(quirDias),
    [aCD, cdU] = ult(consDias);
  const B = E.barometro;
  const sat = B.satisfaccion as Serie,
    [aSat, satU] = ult(sat),
    [aSatMax, satMax] = maxDe(sat);
  const prim = B.diasEsperaPrimaria as Serie,
    [aPrim, primU] = ult(prim);
  const funciona = B.funcionaBien as Serie,
    empeoran = B.listasEmpeoran as Serie;
  const pub = G.publicoPctPIB as Serie,
    priv = G.privadoPctPIB as Serie,
    tot = G.totalPctPIB as Serie;
  const [aGasto, totU] = ult(tot);
  const ueTot = G.ue27.totalPctPIB as Serie,
    uePub = G.ue27.publicoPctTotal as Serie;
  const bolsillo = G.bolsilloPctGasto as Serie,
    ueBolsillo = G.ue27.bolsilloPctGasto as Serie;
  const perCapita = G.totalPerCapitaEUR as Serie,
    uePerCapita = G.ue27.totalPerCapitaEUR as Serie;
  const med = R.ue.medicos100k,
    enf = R.ue.enfermeros100k,
    camas = R.ue.camas100k;
  const PAISES: [string, string][] = [
    ['ES', 'España'],
    ['DE', 'Alemania'],
    ['FR', 'Francia'],
    ['IT', 'Italia'],
    ['PT', 'Portugal'],
  ];
  const COLORES: Record<string, string> = {
    ES: '#3B5BDB',
    DE: '#F59F00',
    FR: '#7048E8',
    IT: '#2F9E44',
    PT: '#C92A2A',
  };
  const porPais = (o: Record<string, Serie>) =>
    PAISES.filter(([k]) => o[k]).map(([k, lab]) => ({
      lab,
      c: COLORES[k],
      data: o[k],
    }));
  const BASE = '1980';
  const personas = (tasa: Serie): Serie =>
    Object.fromEntries(
      anios(tasa)
        .filter((y) => POB[y])
        .map((y) => [y, (tasa[y] * POB[y]) / 1e5]),
    );
  const medES = personas(med.ES),
    enfES = personas(enf.ES);
  const porCada = (tasa: Serie): Serie => Object.fromEntries(anios(tasa).map((y) => [y, 1e5 / tasa[y]]));
  const habMed = porCada(med.ES),
    habEnf = porCada(enf.ES);
  const [aMedP, medP] = ult(medES),
    [, enfP] = ult(enfES);
  const mas65 = R.colegiados.medicosMas65Pct as Serie,
    medicas = R.colegiados.medicasPct as Serie;
  const camasPub = R.camas.publicas as Serie,
    camasPriv = R.camas.privadas as Serie;
  const pctPrivadas = Object.fromEntries(anios(camasPub).map((y) => [y, (camasPriv[y] / (camasPub[y] + camasPriv[y])) * 100])) as Serie;
  const mir = R.mir.total as Serie,
    mirFam = R.mir.familia as Serie;
  const SI = SANIDAD.indicadores as any[];
  const consultaFamilia = SI[0];

  return (
    <section style={{borderTop: 0, paddingTop: 8}}>
      <h2>
        Sanidad{' '}
        <Info>
          Quién paga la sanidad y quién atiende, cuánto se espera, qué opina la gente y con cuántos médicos, enfermeras y camas se cuenta. Las cifras son del
          Ministerio de Sanidad (Encuestas de Salud, listas de espera, Barómetro Sanitario), la OCDE y Eurostat (gasto y recursos), el INE (colegiados) y el BOE
          (plazas MIR).
        </Info>
      </h2>

      <Cobertura />

      <div className="charts" id="charts-san">
        <Mini
          id="san-plantilla"
          title="¿A cuántas personas toca cada médico y cada enfermera?"
          sub="habitantes de España por cada uno que trabaja"
          series={[
            {lab: 'Por cada médico', c: '#3B5BDB', data: habMed},
            {lab: 'Por cada enfermera', c: '#2F9E44', data: habEnf},
          ]}
          f={(v) => n0(v)}
          x0={1979.5}
          yMin={0}
          note={
            <>
              <p>
                Cuanto más baja la línea, mejor: a cada profesional le tocan menos personas. En {BASE} había un médico por cada {n0(habMed[BASE])} habitantes y
                en {aMedP}, uno por cada {n0(habMed[aMedP])}; una enfermera por cada {n0(habEnf[BASE])} y ahora por cada {n0(ult(habEnf)[1])}.
              </p>
              <p>
                En números: de unos {n0(medES[BASE] / 1000)} mil médicos trabajando en {BASE} a {n0(medP / 1000)} mil en {aMedP}, y de {n0(enfES[BASE] / 1000)}{' '}
                mil a {n0(enfP / 1000)} mil enfermeras, mientras la población pasó de {fmt(POB[BASE] / 1e6, 1)} a {fmt(POB[aMedP] / 1e6, 1)} millones.
              </p>
              <p>
                Son profesionales en activo, no contrataciones de cada año: no hay una estadística oficial de contrataciones tan larga. Hay años sin dato antes
                de 1997.
              </p>
            </>
          }
          src={
            <>
              {L('Eurostat (hlth_rs_prs2)', EUROSTAT_REC)} e {L('INE, Estadística Continua de Población', 'https://www.ine.es/jaxiT3/Tabla.htm?t=56934')}
            </>
          }
        />
        <Mini
          id="san-gasto"
          title="Cuánto se gasta en sanidad"
          sub="% del PIB"
          series={[
            {lab: 'Total', c: '#212529', dash: true, data: tot},
            {lab: 'Público', c: '#3B5BDB', data: pub},
            {lab: 'Privado (bolsillo y seguros)', c: '#E8590C', data: priv},
            {
              lab: 'Total, media de la UE',
              c: '#868E96',
              dash: true,
              data: ueTot,
            },
          ]}
          f={pct1}
          x0={1985.5}
          yMin={0}
          hitos={[{x: 2003, lab: 'Cambio de método'}]}
          note={
            <p>
              Gasto corriente en sanidad: del {n1(tot['1986'])} % del PIB en 1986 al {n1(totU)} % en {aGasto}, con un pico en 2020 por la pandemia. La media de
              la UE está en el {n1(ult(ueTot)[1])} %. Por habitante, España gasta {n0(ult(perCapita)[1])} € al año y la UE {n0(ult(uePerCapita)[1])} €. El salto
              de 2003 es un cambio de método de la OCDE, no más gasto.
            </p>
          }
          src={L('OCDE, System of Health Accounts; Eurostat (hlth_sha11_hf)', OCDE_SHA)}
        />
        <Mini
          id="san-publico"
          title="Qué parte paga el Estado"
          sub="% del gasto sanitario que es público"
          series={[
            {lab: 'España', c: '#3B5BDB', data: G.espanaPublicoPctTotal},
            {lab: 'Media de la UE', c: '#868E96', dash: true, data: uePub},
          ]}
          f={pct1}
          x0={1985.5}
          yMin={50}
          note={
            <p>
              En 1986 el Estado pagaba el {n1(G.espanaPublicoPctTotal['1986'])} % del gasto sanitario; en {aGasto}, el {n1(ult(G.espanaPublicoPctTotal)[1])} %.
              España está entre 7 y 10 puntos por debajo de la media de la UE: aquí una parte mayor sale del bolsillo de la gente.
            </p>
          }
          src={L('OCDE y Eurostat', OCDE_SHA)}
        />
        <Mini
          id="san-bolsillo"
          title="Lo que sale del bolsillo"
          sub="% del gasto sanitario pagado directamente por las familias"
          series={[
            {lab: 'Pago directo, España', c: '#E8590C', data: bolsillo},
            {
              lab: 'Seguros voluntarios, España',
              c: '#F59F00',
              data: G.seguroVoluntarioPctGasto,
            },
            {
              lab: 'Pago directo, media de la UE',
              c: '#868E96',
              dash: true,
              data: ueBolsillo,
            },
          ]}
          f={pct1}
          x0={1990.5}
          yMin={0}
          note={
            <p>
              Pago directo es lo que la gente paga de su bolsillo: dentista, gafas, la parte de los medicamentos, consultas privadas. Es el{' '}
              {n1(ult(bolsillo)[1])} % del gasto en España y el {n1(ult(ueBolsillo)[1])} % en la UE. Los seguros privados pagan otro{' '}
              {n1(ult(G.seguroVoluntarioPctGasto)[1])} %.
            </p>
          }
          src={L('OCDE, System of Health Accounts', OCDE_SHA)}
        />
        <Mini
          id="san-lista"
          title="Esperando una operación"
          sub="miles de personas en lista de espera quirúrgica, cada diciembre"
          series={[{lab: 'Pacientes', c: '#C92A2A', data: escala(quir, 1000)}]}
          f={(v) => n0(v * 1000)}
          x0={2002.5}
          yMin={0}
          hitos={[{x: 2018.9, lab: 'Andalucía cambia de método'}]}
          note={
            <p>
              De {n0(quir['2005'])} personas esperando una operación en diciembre de 2005 a {n0(qU)} en diciembre de {aQ}: más del doble, con una población un
              12 % mayor. Desde junio de 2012 están todas las comunidades; en diciembre de 2018 Andalucía cambió la forma de contar.
            </p>
          }
          src={L('Ministerio de Sanidad, Sistema de Información sobre Listas de Espera (SISLE)', SISLE)}
        />
        <Mini
          id="san-dias"
          title="Días de espera"
          sub="días de media, cada diciembre"
          series={[
            {lab: 'Para operarse', c: '#C92A2A', data: quirDias},
            {
              lab: 'Para el especialista (primera consulta)',
              c: '#7048E8',
              data: consDias,
            },
            {lab: 'Para el médico de cabecera', c: '#2F9E44', data: prim},
          ]}
          f={(v) => n0(v) + ' días'}
          x0={2002.5}
          yMin={0}
          note={
            <>
              <p>
                Para operarse se esperaban {n0(quirDias['2005'])} días de media en 2005 y {n0(qdU)} en {aQD} (el máximo, 170 días en junio de 2020, con la
                pandemia). Para ver al especialista por primera vez, {n0(consDias['2016'])} días en 2016 y {n0(cdU)} en {aCD}. El {n1(ult(quir6)[1])} % de los
                que esperan una operación lleva más de seis meses, y el {n1(ult(cons60)[1])} % de los que esperan especialista, más de dos.
              </p>
              <p>
                Médico de cabecera: días de espera de quienes no consiguen cita en el día, de {fmt(prim['2018'], 1)} en 2018 a {fmt(primU, 1)} en {aPrim}. No
                hay dato de 2020 y 2021 (no se hizo el Barómetro Sanitario) y desde 2022 la encuesta es por teléfono.
              </p>
            </>
          }
          src={
            <>
              {L('Ministerio de Sanidad, SISLE', SISLE)}; cabecera: {L('Barómetro Sanitario', BAROMETRO)}
            </>
          }
        />
        <Mini
          id="san-satisfaccion"
          title="¿Contentos con la sanidad pública?"
          sub="satisfacción con el sistema sanitario público, de 1 a 10"
          series={[{lab: 'Satisfacción', c: '#3B5BDB', data: sat}]}
          f={(v) => fmt(v, 2)}
          x0={2001.5}
          yMin={5}
          note={
            <p>
              Subió hasta {fmt(satMax, 2)} en {aSatMax} y ha bajado a {fmt(satU, 2)} en {aSat}, la más baja de toda la serie. En 2022 el Barómetro pasó de
              entrevistas en persona a telefónicas y se reponderó, lo que también puede mover la cifra.
            </p>
          }
          src={L('Ministerio de Sanidad y CIS, Barómetro Sanitario', BAROMETRO)}
        />
        <Mini
          id="san-opinion"
          title="¿Funciona bien?"
          sub="% de la gente que opina…"
          series={[
            {
              lab: 'Que funciona bien o necesita pocos cambios',
              c: '#2F9E44',
              data: funciona,
            },
            {
              lab: 'Que las listas de espera han empeorado',
              c: '#C92A2A',
              data: empeoran,
            },
          ]}
          f={pct1}
          x0={1996.5}
          yMin={0}
          note={
            <p>
              Los que creen que la sanidad funciona bien o necesita pocos cambios han pasado del {n0(funciona['2019'])} % en 2019 al {n0(ult(funciona)[1])} % en{' '}
              {ult(funciona)[0]}. Los que creen que las listas de espera han empeorado, del {n0(empeoran['2000'])} % en 2000 al {n0(ult(empeoran)[1])} %.
            </p>
          }
          src={L('Ministerio de Sanidad y CIS, Barómetro Sanitario', BAROMETRO)}
        />
        <Mini
          id="san-personal"
          title="Médicos que trabajan"
          sub="por cada 100.000 habitantes"
          series={porPais(med)}
          f={(v) => n0(v)}
          x0={1979.5}
          yMin={0}
          note={
            <p>
              España pasa de {n0(med.ES['1980'])} médicos en activo por cada 100.000 habitantes en 1980 a {n0(ult(med.ES)[1])} en {ult(med.ES)[0]}, casi como
              Alemania ({n0(ult(med.DE)[1])}). Eurostat no publica una media de la UE; de Portugal solo hay dato comparable desde 2021, y de Francia e Italia
              desde 2000. Ojo con el salto de Italia en 2021: sube un tercio de un año a otro en los datos que envía a Eurostat, más de lo que se puede formar
              en un año.
            </p>
          }
          src={L('Eurostat (hlth_rs_prs2)', EUROSTAT_REC)}
        />
        <Mini
          id="san-enfermeras"
          title="Enfermeras que trabajan"
          sub="por cada 100.000 habitantes"
          series={porPais(enf)}
          f={(v) => n0(v)}
          x0={1979.5}
          yMin={0}
          note={
            <p>
              España pasa de {n0(enf.ES['1980'])} enfermeras en activo por cada 100.000 habitantes en 1980 a {n0(ult(enf.ES)[1])} en {ult(enf.ES)[0]}: ha subido
              mucho, pero sigue con menos de la mitad que Alemania ({n0(ult(enf.DE)[1])}).
            </p>
          }
          src={L('Eurostat (hlth_rs_prs2)', EUROSTAT_REC)}
        />
        <Mini
          id="san-mir"
          title="Plazas para formar médicos especialistas"
          sub="plazas MIR ofertadas cada convocatoria"
          series={[
            {lab: 'Todas las especialidades', c: '#3B5BDB', data: mir},
            {lab: 'Medicina de familia', c: '#2F9E44', data: mirFam},
          ]}
          f={(v) => n0(v)}
          x0={2009.5}
          yMin={0}
          note={
            <p>
              De {n0(mir['2010'])} plazas en 2010 a {n0(ult(mir)[1])} en {ult(mir)[0]}. Las de medicina de familia bajaron a {n0(mirFam['2014'])} en 2014 y han
              subido a {n0(ult(mirFam)[1])}. Un médico especialista tarda unos diez años en formarse, así que estas plazas se notan en la próxima década.
            </p>
          }
          src={L('BOE, órdenes anuales de la convocatoria MIR', 'https://www.boe.es/')}
        />
      </div>

      <Cuestiones intro="Frases que se oyen mucho sobre la sanidad, comparadas con los datos oficiales de esta pestaña. Cada respuesta tiene su parte buena y su parte mala.">
        <Cuestion
          pregunta="«La sanidad se está privatizando»"
          veredicto="En parte"
          tono="matiz"
          conclusion={
            <>
              Cada vez más gente paga un seguro privado: el {pct1(conPrivado(OLAS[OLAS.length - 1]))} en {OLAS[OLAS.length - 1]}, frente al{' '}
              {pct1(conPrivado(PRIMERA))} en {PRIMERA}. Pero <b>los hospitales no se han vuelto más privados</b>: las camas privadas son el{' '}
              {n0(ult(pctPrivadas)[1])} % del total, parecido al {n0(pctPrivadas['1980'])} % de 1980. Lo que crece es la gente que paga dos veces para no
              esperar.
            </>
          }
          positivo={[
            <>La pública sigue atendiendo a casi todo el mundo: solo el {pct1(C[OLAS[OLAS.length - 1]].soloPrivada)} tiene únicamente sanidad privada.</>,
            <>
              El gasto público en sanidad ha pasado del {n1(pub['1986'])} % al {n1(ult(pub)[1])} % del PIB desde 1986.
            </>,
          ]}
          negativo={[
            <>
              El Estado paga el {n0(ult(G.espanaPublicoPctTotal)[1])} % del gasto sanitario, por debajo de la media de la UE ({n0(ult(uePub)[1])} %).
            </>,
            <>Quien no puede pagar un seguro depende por completo de unas listas de espera que crecen.</>,
          ]}
          graficas={[
            {id: 'san-cobertura', lab: '¿Pública o privada?'},
            {id: 'san-publico', lab: 'Qué parte paga el Estado'},
          ]}
        />
        <Cuestion
          pregunta="«Las listas de espera no paran de crecer»"
          veredicto="Cierto"
          tono="cierto"
          conclusion={
            <>
              Hay {n0(qU)} personas esperando una operación ({aQ}), más del doble que en 2005, y se espera {n0(qdU)} días de media para operarse y {n0(cdU)}{' '}
              para ver al especialista.
            </>
          }
          positivo={[<>Los días de espera para operarse están por debajo del máximo de la pandemia (170 en junio de 2020).</>]}
          negativo={[
            <>El {n1(ult(quir6)[1])} % de los que esperan una operación lleva más de seis meses.</>,
            <>El médico de cabecera tarda {fmt(primU, 1)} días en dar cita a quien no la consigue en el día, casi el doble que en 2018.</>,
          ]}
          graficas={[
            {id: 'san-lista', lab: 'Esperando una operación'},
            {id: 'san-dias', lab: 'Días de espera'},
          ]}
        />
        <Cuestion
          pregunta="«Faltan médicos»"
          veredicto="Faltan más enfermeras"
          tono="matiz"
          conclusion={
            <>
              Por habitante, España tiene tantos médicos en activo como Alemania, pero menos de la mitad de enfermeras. El problema de los médicos es de reparto
              y de edad: el {n1(ult(mas65)[1])} % de los colegiados tiene 65 años o más, y en atención primaria y en los pueblos cuesta cubrir plazas.
            </>
          }
          positivo={[
            <>
              Las plazas MIR han subido de {n0(mir['2010'])} a {n0(ult(mir)[1])} desde 2010, y las de medicina de familia, a {n0(ult(mirFam)[1])}.
            </>,
          ]}
          negativo={[
            <>Muchos médicos se jubilarán en los próximos años, y formar un especialista lleva una década.</>,
            <>
              Con {n0(ult(enf.ES)[1])} enfermeras por cada 100.000 habitantes, España está muy por debajo de Alemania ({n0(ult(enf.DE)[1])}) o Francia.
            </>,
          ]}
          graficas={[
            {id: 'san-plantilla', lab: 'Personas por médico y por enfermera'},
            {id: 'san-personal', lab: 'Médicos que trabajan'},
            {id: 'san-enfermeras', lab: 'Enfermeras que trabajan'},
            {id: 'san-mir', lab: 'Plazas MIR'},
          ]}
        />
        <Cuestion
          pregunta="«Gastamos menos en sanidad que el resto de Europa»"
          veredicto="Cierto"
          tono="cierto"
          conclusion={
            <>
              España gasta el {n1(totU)} % del PIB en sanidad y la UE el {n1(ult(ueTot)[1])} %. Por habitante, {n0(ult(perCapita)[1])} € frente a{' '}
              {n0(ult(uePerCapita)[1])} €, y una parte mayor la paga la gente de su bolsillo.
            </>
          }
          positivo={[<>Con menos dinero, España tiene una de las esperanzas de vida más altas del mundo (84 años).</>]}
          negativo={[
            <>
              Las familias pagan de su bolsillo el {n1(ult(bolsillo)[1])} % del gasto, más que la media europea ({n1(ult(ueBolsillo)[1])} %).
            </>,
          ]}
          graficas={[
            {id: 'san-gasto', lab: 'Cuánto se gasta'},
            {id: 'san-bolsillo', lab: 'Lo que sale del bolsillo'},
          ]}
        />
        <Cuestion
          pregunta="«Los inmigrantes colapsan la sanidad»"
          veredicto="Falso"
          tono="falso"
          conclusion={
            <>
              Según la Encuesta de Salud de España 2025, los nacidos fuera van <b>menos</b> al médico que los nacidos en España: el{' '}
              {pct1(consultaFamilia.extranjeros)} fue al médico de familia en las últimas cuatro semanas, frente al {pct1(consultaFamilia.espanoles)}, también
              comparando a igual edad ({pct1(consultaFamilia.extranjerosEstandarizadoPorEdad)}). Lo que alarga las listas es sobre todo el envejecimiento.
            </>
          }
          positivo={[<>Son más jóvenes y, de media, necesitan menos atención; muchos además trabajan en la propia sanidad y en los cuidados.</>]}
          negativo={[<>Donde llega mucha gente en poco tiempo, los centros de salud de esa zona sí lo notan si no se refuerzan.</>]}
          graficas={[{id: 'san-lista', lab: 'Esperando una operación'}]}
        />
        <Cuestion
          pregunta="«La gente está contenta con la sanidad pública»"
          veredicto="Cada vez menos"
          tono="matiz"
          conclusion={
            <>
              La satisfacción ha caído de {fmt(satMax, 2)} en {aSatMax} a {fmt(satU, 2)} sobre 10 en {aSat}, la más baja de la serie, y solo el{' '}
              {n0(ult(funciona)[1])} % cree que funciona bien o necesita pocos cambios.
            </>
          }
          positivo={[<>Sigue aprobando: la nota media está por encima de 6.</>]}
          negativo={[<>El {n0(ult(empeoran)[1])} % cree que las listas de espera han empeorado.</>]}
          graficas={[
            {
              id: 'san-satisfaccion',
              lab: '¿Contentos con la sanidad pública?',
            },
            {id: 'san-opinion', lab: '¿Funciona bien?'},
          ]}
        />
        <Cuestion
          pregunta="«Cada vez hay menos camas de hospital»"
          veredicto="Cierto, con matices"
          tono="matiz"
          conclusion={
            <>
              Hay casi la mitad de camas por habitante que en 1980 ({n0(ult(camas.ES)[1])} frente a {n0(camas.ES['1980'])} por cada 100.000), y menos que la
              media de la UE. Pero baja en toda Europa, porque se ingresa menos tiempo y se opera más sin quedarse en el hospital.
            </>
          }
          positivo={[<>Menos días ingresado suele ser mejor para el paciente y más barato.</>]}
          negativo={[<>Con más mayores, hacen falta más camas de media y larga estancia y más cuidados en casa.</>]}
        />
      </Cuestiones>
    </section>
  );
}
