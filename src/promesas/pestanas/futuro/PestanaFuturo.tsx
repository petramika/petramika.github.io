import type {ReactNode} from 'react';
import {ANNUAL, DECRETOS, EMPLEO, ENV, HAY_CASAS, INMIG, MEDIA, MIGRACIONES, POB_INMIG, VIOLENCIA as V, VIV} from '../../datos';
import {fmt} from '../../lib/formato';
import Mini from '../../componentes/graficas/Mini';
import Barras from '../../componentes/graficas/Barras';
import Icono from '../../componentes/Icono';
import Info from '../../componentes/Info';
import {L} from '../../componentes/enlace';
import type {Tono} from '../../componentes/Cuestiones';
import DEMO from '../../datos/futuro/demografia.json';
import SOST from '../../datos/futuro/sostenibilidad.json';
import IA from '../../datos/futuro/ia-crisis.json';
import {masTemas} from './MasTemas';
import {sectorPublico} from './SectorPublico';

/*
  Pestaña escondida (se abre con el año final de la cabecera o con #futuro).
  Arriba, las cifras que más han cambiado en 40 años; al pulsar una se abre su
  tema. Debajo, un desplegable por tema con su tendencia (a mejor, a peor o
  mixto), qué va a mejor, qué va a peor, qué se podría hacer y sus graficas,
  con las proyecciones oficiales en discontinua.
  Sus datos viven en datos/futuro/ y solo se descargan al abrirla.
*/
type Serie = Record<string, number>;
/* eslint-disable @typescript-eslint/no-explicit-any */
const H = (DEMO as any).historia as Record<string, Serie>;
const P = (DEMO as any).proyeccionINE as Record<string, Serie>;
const EUROSTAT = (DEMO as any).eurostat;
const S = SOST as any;
const C = (IA as any).crisis;
const I = (IA as any).ia;

const n0 = (v: number) => fmt(v, 0);
const n1 = (v: number) => fmt(v, 1);
const pct1 = (v: number) => fmt(v, 1) + ' %';
const escala = (s: Serie, d: number): Serie => Object.fromEntries(Object.entries(s).map(([y, v]) => [y, v / d]));
const desde = (s: Serie, a: number, b = 9999): Serie => Object.fromEntries(Object.entries(s).filter(([y]) => +y >= a && +y <= b));
const anios = (s: Serie) => Object.keys(s).filter((k) => /^\d{4}$/.test(k)).sort();
const ult = (s: Serie): [string, number] => {
  const k = anios(s).at(-1)!;
  return [k, s[k]];
};
const maxDe = (s: Serie): [string, number] => anios(s).reduce<[string, number]>((m, k) => (s[k] > m[1] ? [k, s[k]] : m), ['', -Infinity]);
const minDe = (s: Serie): [string, number] => anios(s).reduce<[string, number]>((m, k) => (s[k] < m[1] ? [k, s[k]] : m), ['', Infinity]);
const solo = (o: Record<string, unknown>): Serie =>
  Object.fromEntries(Object.entries(o).filter(([y, v]) => /^\d{4}$/.test(y) && typeof v === 'number')) as Serie;

const INE_PROY = 'https://www.ine.es/dyngs/Prensa/PROP20262076.htm';
const INE_IDB = 'https://www.ine.es/dynt3/inebase/es/index.htm?padre=1894';
const PROY = {x: 2025.5, lab: 'Proyección'};

const ORDEN = ['derechos', 'economia', 'trabajo', 'instituciones', 'educacion', 'sanidad', 'autonomias', 'exterior', 'pensiones', 'infraestructuras', 'ambiente', 'vivienda'];

type Tema = {
  id: string;
  k: string;
  tema: string;
  veredicto: string;
  tono: Tono;
  resumen: ReactNode;
  mejor: ReactNode[];
  peor: ReactNode[];
  hacer: ReactNode[];
  /** Algo propio del tema antes de las graficas (tarjetas de soluciones, listas) */
  extra?: ReactNode;
  graficas?: ReactNode;
};

/** Pone el subtema delante de cada punto cuando un tema junta dos */
const pre = (sub: string, xs: ReactNode[]): ReactNode[] =>
  xs.map((x) => (
    <>
      <strong>{sub}:</strong> {x}
    </>
  ));

/** Abre el desplegable de un tema y baja hasta él */
function abrirTema(id: string) {
  const el = document.getElementById(`fut-t-${id}`) as HTMLDetailsElement | null;
  if (!el) return;
  el.open = true;
  el.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
}

function Lista({titulo, clase, xs}: {titulo: string; clase: string; xs: ReactNode[]}) {
  return (
    <div className={`fut-col ${clase}`}>
      <b>{titulo}</b>
      <ul>
        {xs.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

function Desplegable({t}: {t: Tema}) {
  return (
    <details className="faq-q fut-q" id={`fut-t-${t.id}`}>
      <summary>
        <span className="faq-p fut-qt">
          <Icono k={t.k} size={18} />
          {t.tema}
        </span>
        <span className={`veredicto ${t.tono}`}>{t.veredicto}</span>
      </summary>
      <div className="faq-body">
        <p className="faq-concl">
          <b>En resumen:</b> {t.resumen}
        </p>
        <div className="fut-3">
          <Lista titulo="Va a mejor" clase="ok" xs={t.mejor} />
          <Lista titulo="Va a peor" clase="ko" xs={t.peor} />
          <Lista titulo="Qué se podría hacer" clase="sol" xs={t.hacer} />
        </div>
        {t.extra}
        {t.graficas && <div className="charts">{t.graficas}</div>}
      </div>
    </details>
  );
}

function victimas(y: string) {
  return Object.values(V.tipos as Record<string, {hombres: Serie; mujeres: Serie}>).reduce((t, x) => t + x.hombres[y] + x.mujeres[y], 0);
}

export default function PestanaFuturo() {
  // Población y pensiones
  const [aH, pct65H] = ult(H.pct65);
  const [aNac, nacU] = ult(H.nacimientos);
  const [aSaldo, saldoU] = ult(H.saldoNatural);
  const eu2050 = EUROSTAT?.poblacion?.['2050'] as number | undefined;
  const AR = S.pensiones.ageingReport2024;
  const soporte = escala(AR.ratioSoporte_cotizantesPor100pensionistas as Serie, 100);
  // Economía
  const deuda = ANNUAL.deuda as Serie, [aDeuda, deudaU] = ult(deuda), [aDeudaMax, deudaMax] = maxDe(deuda);
  const pf = ANNUAL.pf as Serie;
  const fmi = S.deuda.fmi.serie as Serie, com = S.deuda.comision.serie as Serie;
  const intereses = S.deuda.intereses.comisionDSM2025_gasto_intereses_pctPIB as Serie;
  const pib = S.salarios.pibPerCapitaReal;
  const ratioUE: Serie = Object.fromEntries(Object.keys(pib.ES).filter((y) => pib.UE27[y]).map((y) => [y, (pib.ES[y] / pib.UE27[y]) * 100]));
  const pibCrec = solo(C.crecimientoPIB), paroLargo = solo(C.paroAnual);
  const negativos = Object.entries(pibCrec).filter(([, v]) => v < 0).map(([y]) => y);
  // Trabajo
  const paro = ANNUAL.paro as Serie, [aParo, paroU] = ult(paro), [aParoMax, paroMax] = maxDe(paro);
  const [aM, mU] = ult(EMPLEO.m as Serie);
  const adop = solo(I.adopcionEmpresasINE);
  const E = I.exposicion as any[];
  const cifra = (fuente: string, texto: string) => E.find((e) => e.fuente.startsWith(fuente) && e.dato.includes(texto))?.cifra as number | undefined;
  const funcas = E.find((e) => e.cifra < 0);
  const expo: {lab: string; v: number | undefined}[] = [
    {lab: 'España, expuestos a la IA generativa (OCDE, 2024)', v: cifra('OCDE, Job', 'expuestos')},
    {lab: 'España, riesgo alto de automatización (OCDE, 2024)', v: cifra('OCDE, Job', 'alto riesgo')},
    {lab: 'España, ocupaciones de riesgo alto con toda la tecnología (OCDE, 2023)', v: cifra('OCDE, Employment', 'alto riesgo')},
    {lab: 'España, exposición media-alta y alta (BBVA Research)', v: cifra('BBVA', 'exposición')},
    {lab: 'Países ricos, expuestos (FMI)', v: cifra('FMI', 'Empleo en ocupaciones de alta exposición')},
    {lab: 'Países ricos, donde la IA podría sustituir (FMI)', v: cifra('FMI', 'baja complementariedad')},
    {lab: 'Países ricos, donde la IA ayudaría (FMI)', v: cifra('FMI', 'alta complementariedad')},
    {lab: 'Mundo, expuestos a la IA generativa (OIT)', v: cifra('OIT', 'mundial')},
  ];
  // Vivienda
  const aniosSueldo = VIV.anios as Serie, [aAS, asU] = ult(aniosSueldo);
  const vpo = VIV.vpo as Serie, [aVpo, vpoU] = ult(vpo);
  const term = S.vivienda.terminadas.total as Serie;
  const hog = S.vivienda.hogaresNuevos.aumentoAnual as Serie;
  const turis = VIV.turis as Serie, [aT, tU] = ult(turis), [aTMax, tMax] = maxDe(turis);
  const des = VIV.desTot as Serie, [aDes, desU] = ult(des), [aDesMax, desMax] = maxDe(des);
  // Derechos y sociedad
  const fuera = {...(POB_INMIG.nacidosFueraPctAntes as Serie), ...(POB_INMIG.nacidosFueraPct as Serie)};
  const [aFuera, fueraU] = ult(fuera);
  const espanoles = POB_INMIG.pctNacidosFueraEspanoles as Serie;
  const irr = INMIG.irrB as Serie, [aIrr, irrU] = ult(irr);
  const ultV = anios(V.tipos.lesiones.hombres).at(-1)!;
  const tasa = (y: string) => (victimas(y) / H.poblacion[y]) * 1e5;
  const resueltos = (y: string) => (V.esclarecidos.robosViolencia[y] / V.conocidos.robosViolencia[y]) * 100;
  const sexual = (y: string) => V.tipos.agresionSexual.mujeres[y] + V.tipos.conPenetracion.mujeres[y];
  // Instituciones
  const dec = DECRETOS.porAnio as Serie, [aDec, decU] = ult(dec);
  const conf = MEDIA.confianza as Serie, [aConf, confU] = ult(conf), [aConfMax, confMax] = maxDe(conf);
  const preoc = MEDIA.preocupa as Serie, [aPre, preU] = ult(preoc);
  const rsf = MEDIA.rsf as Serie, [aRsf, rsfU] = ult(rsf), [aRsfMejor, rsfMejor] = minDe(rsf);
  // Medio ambiente
  const ren = ENV.renREE as Serie, [aRen, renU] = ult(ren);
  const gei = ENV.gei as Serie, [aGei, geiU] = ult(gei), [aGeiMax, geiMax] = maxDe(gei);

  const CIFRAS: {id: string; k: string; tema: string; v: string; txt: string; src: string}[] = [
    {id: 'vivienda', k: 'viv', tema: 'Vivienda', v: `${n1(aniosSueldo['1987'])} → ${n1(asU)}`, txt: `años de sueldo para comprar un piso (1987 → ${aAS})`, src: 'Banco de España e INE'},
    {id: 'economia', k: 'imp', tema: 'Economía e impuestos', v: `${n0(deuda['1986'])} % → ${n0(deudaU)} %`, txt: `deuda pública sobre el PIB (1986 → ${aDeuda}); en 2007 era el ${n0(deuda['2007'])} %`, src: 'Banco de España'},
    {id: 'pensiones', k: 'pen', tema: 'Pensiones', v: `${n0(H.pct65['1986'])} % → ${n0(pct65H)} %`, txt: `población de 65 años o más (1986 → ${aH}); ${n0(P.pct65['2050'])} % en 2050`, src: 'INE'},
    {id: 'pensiones', k: 'pen', tema: 'Pensiones', v: `${n0(H.nacimientos['1976'] / 1000)} mil → ${n0(nacU / 1000)} mil`, txt: `nacimientos al año (1976 → ${aNac})`, src: 'INE'},
    {id: 'derechos', k: 'der', tema: 'Derechos y sociedad', v: `${n1(fuera['1981'])} % → ${n1(fueraU)} %`, txt: `población nacida fuera de España (1981 → ${aFuera})`, src: 'INE'},
    {id: 'vivienda', k: 'viv', tema: 'Vivienda', v: `${n0(vpo['1986'] / 1000)} mil → ${n0(vpoU / 1000)} mil`, txt: `viviendas protegidas al año (1986 → ${aVpo})`, src: 'Ministerio de Vivienda'},
    {id: 'vivienda', k: 'viv', tema: 'Vivienda', v: `${n0(term['2006'] / 1000)} mil → ${n0(ult(term)[1] / 1000)} mil`, txt: `viviendas terminadas al año (2006 → ${ult(term)[0]})`, src: 'Ministerio de Vivienda'},
    {id: 'economia', k: 'imp', tema: 'Economía e impuestos', v: `${n0(ratioUE['2000'])} % → ${n0(ult(ratioUE)[1])} %`, txt: `renta por habitante sobre la media de la UE (2000 → ${ult(ratioUE)[0]})`, src: 'Eurostat'},
  ];

  const SOLUCIONES_EDAD: [string, string, string][] = [
    ['soc', 'Que nazcan más niños', `Hoy hay ${fmt(H.fecundidad['2024'], 2)} hijos por mujer. Ayudan los permisos, la escuela de 0 a 3 años gratis, las ayudas por hijo y, sobre todo, la vivienda: quien se va de casa a los ${n0(ult(VIV.edad as Serie)[1])} años tiene hijos tarde y menos.`],
    ['trab', 'Que trabaje más gente', `Trabajan el ${n0(mU)} % de las mujeres y el ${n0(ult(EMPLEO.h as Serie)[1])} % de los hombres en edad de trabajar, y el paro sigue en torno al 10 %. Cada persona más trabajando es una más que cotiza.`],
    ['pen', 'Trabajar más años, si se quiere', 'Jubilación flexible y poder cobrar parte de la pensión mientras se trabaja; ligar la edad de jubilación a cuánto se vive.'],
    ['imp', 'Ahorro para la jubilación además de la pública', 'Planes de pensiones de empresa, como en Países Bajos o Suecia: la pensión pública sigue siendo la base y se suma un ahorro propio.'],
    ['eco', 'Producir más por persona', 'Con menos trabajadores por jubilado, las pensiones dependen de que cada uno produzca y gane más. La tecnología ayuda, pero también sustituye puestos: solo sirve si lo que se gana llega a sueldos y cotizaciones.'],
    ['eur', 'Que vuelvan los que se fueron', `Hay ${fmt(ult(MIGRACIONES.espanolesExterior as Serie)[1] / 1e6, 1)} millones de españoles viviendo fuera; ${n0(ult(MIGRACIONES.espanolesExteriorNacidosEspana as Serie)[1] / 1000)} mil nacieron en España.`],
    ['san', 'Envejecer con salud', 'Prevención y cuidados en casa: más años con buena salud significan más gente que puede seguir activa y menos gasto en hospitales.'],
  ];

  const SP = sectorPublico();
  const TEMAS: Tema[] = [
    {
      id: 'derechos',
      k: 'der',
      tema: 'Derechos y sociedad',
      veredicto: 'Mixto',
      tono: 'matiz',
      resumen: (
        <>
          La inmigración sostiene la población y cada vez más de los que llegan se hacen españoles, pero crece la irregularidad. La violencia más grave sigue
          baja, mientras la registrada sube, sobre todo la sexual, en parte porque se denuncia más. Más detalle en las pestañas Inmigración y Violencia.
        </>
      ),
      mejor: [
        ...pre('Inmigración', [
          <>Uno de cada tres nacidos fuera ya es español ({n0(ult(espanoles)[1])} %, {ult(espanoles)[0]}), y las que vienen tienen cada vez menos hijos, como las españolas.</>,
          <>Sin ella, la población ya estaría bajando: es la que sostiene el número de trabajadores.</>,
        ]),
        ...pre('Violencia', [
          <>Pocos homicidios: por debajo de la media de la UE y unas ocho veces menos que la media mundial.</>,
          <>Se resuelven más robos con violencia: del {n0(resueltos('2010'))} % en 2010 al {n0(resueltos(ultV))} % en {ultV}, y se denuncia más la violencia sexual.</>,
        ]),
      ],
      peor: [
        ...pre('Inmigración', [
          <>Los que viven en situación irregular han pasado de {n0((irr['2017'] ?? 0) * 1000)} mil en 2017 a unos {n0(irrU * 1000)} mil en {aIrr} (Funcas).</>,
          <>Están por encima de su peso entre los detenidos por delitos violentos, también por edad y sexo.</>,
        ]),
        ...pre('Violencia', [
          <>Las víctimas registradas por habitante han subido de {n0(tasa('2016'))} a {n0(tasa(ultV))} por cada 100.000 (2016–{ultV}).</>,
          <>Las agresiones sexuales a mujeres registradas se han multiplicado por {n1(sexual(ultV) / sexual('2016'))} desde 2016, y una de cada tres víctimas es menor.</>,
        ]),
      ],
      hacer: [
        ...pre('Inmigración', [
          <>Vías legales de llegada ligadas al trabajo, para que menos gente quede sin papeles.</>,
          <>Idioma, formación y empleo desde el primer año, y repartir mejor dónde se vive.</>,
        ]),
        ...pre('Violencia', [
          <>Educación en consentimiento y en relaciones sanas desde el colegio.</>,
          <>Que denunciar sea fácil y rápido, con juzgados que respondan pronto, y prevención con los chicos jóvenes.</>,
        ]),
      ],
    },
    {
      id: 'economia',
      k: 'imp',
      tema: 'Economía e impuestos',
      veredicto: 'Mixto',
      tono: 'matiz',
      resumen: (
        <>
          La economía crece y la deuda baja desde 2020, pero sigue en el {n0(deudaU)} % del PIB, los intereses suben y la renta por habitante se aleja de la
          europea. Vendrá alguna crisis, porque siempre vienen (una cada 8 a 12 años), y empezaría con mucho menos margen que la de 2008.
        </>
      ),
      mejor: [
        <>La deuda baja desde el máximo de {aDeudaMax} ({n0(deudaMax)} %) al {n0(deudaU)} % en {aDeuda}, y el FMI la ve en el {n0(fmi['2031'])} % en 2031.</>,
        <>La economía crece: un {fmt(pibCrec['2025'] ?? 0, 1)} % en 2025, y no ha habido recesión desde 2020.</>,
      ],
      peor: [
        <>
          Sigue siendo más del doble que en 2007, y los intereses suben: del {fmt(intereses['2024'], 1)} % al {fmt(intereses['2036'], 1)} % del PIB en 2036
          según la Comisión Europea, que la ve volver a subir desde 2028 si no se toman medidas.
        </>,
        <>La renta por habitante cae del {n0(ratioUE['2000'])} % al {n0(ult(ratioUE)[1])} % de la media de la UE (2000–{ult(ratioUE)[0]}): crecemos porque hay más gente, no porque cada uno produzca más.</>,
        <>La presión fiscal sube despacio: del {n0(pf['1986'])} % al {n0(ult(pf)[1])} % del PIB.</>,
      ],
      hacer: [
        <>Ahorrar en los años buenos para tener margen en la próxima crisis.</>,
        <>Revisar en qué se gasta y qué funciona, además de recaudar mejor.</>,
        <>
          Crecer por productividad: empresas más grandes, menos papeleo, formación e inversión. Con más PIB, la misma deuda pesa menos, siempre que la mejora
          no se quede solo en beneficios y llegue también a sueldos.
        </>,
      ],
      extra: (
        <p className="note">
          <b>Qué es la deuda, en sencillo:</b> el Estado gasta más de lo que ingresa y pide prestada la diferencia vendiendo bonos (a bancos, fondos, el
          Banco Central Europeo y particulares). No se devuelve nunca del todo: cada bono que vence se paga con otro nuevo, como una hipoteca que se renueva.
          Lo que se paga cada año son los intereses, con los impuestos de todos. El peligro llega si los que prestan desconfían y piden más interés, como en
          2012.
        </p>
      ),
      graficas: (
        <>
          <Mini
            id="fut-deuda"
            title="Deuda pública"
            sub="% del PIB (proyecciones en discontinua)"
            series={[
              {lab: 'Hasta hoy', c: '#C92A2A', data: deuda},
              {lab: 'FMI', c: '#C92A2A', dash: true, data: desde(fmi, +aDeuda + 1)},
              {lab: 'Comisión Europea, sin nuevas medidas', c: '#868E96', dash: true, data: desde(com, +aDeuda + 1)},
            ]}
            f={pct1}
            x0={1985.5}
            yMin={0}
            hitos={[{x: 2008, lab: 'Crisis de 2008'}]}
            note={
              <p>
                Del {n0(deuda['1986'])} % del PIB en 1986 al {n0(deuda['2007'])} % en 2007; se disparó con las crisis de 2008 y de 2020 ({n0(deuda['2020'])} % en
                2020). Cada crisis la sube de golpe y en los años buenos baja muy despacio. AIReF, a largo plazo y sin cambios de política, habla de en torno al
                129 % en 2050 (cifra de sus resúmenes: no se pudo leer el documento original).
              </p>
            }
            src={
              <>
                Banco de España; {L('FMI, World Economic Outlook', S.deuda.fmi.url)}; {L('Comisión Europea, Debt Sustainability Monitor 2025', S.deuda.comision.url)}
              </>
            }
          />
          <Mini
            id="fut-renta"
            title="España se aleja de la renta media europea"
            sub="PIB real por habitante de España, % de la media de la UE"
            series={[{lab: 'España / UE', c: '#F59F00', data: ratioUE}]}
            f={pct1}
            x0={1999.5}
            note={<p>Entre 2000 y 2024 la renta por habitante creció un 21 % en España y un 32 % en la UE.</p>}
            src={L('Eurostat, PIB real por habitante (sdg_08_10)', pib.url)}
          />
          <Mini
            id="fut-pib"
            title="Crecimiento de la economía"
            sub="% de crecimiento real del PIB cada año"
            series={[{lab: 'PIB', c: '#3B5BDB', data: pibCrec}]}
            bars
            f={(v) => fmt(v, 1) + ' %'}
            x0={1970.5}
            note={
              <>
                <p>
                  Desde 1971 la economía cayó en {negativos.length} años: {negativos.join(', ')}. Las recesiones que fecha la Asociación Española de Economía:
                </p>
                <ul className="fut-lista">
                  {(C.recesiones as any[]).map((r) => (
                    <li key={r.nombre}>
                      <b>{r.nombre}</b> ({r.inicio}–{r.fin}):{' '}
                      {r.caidaPIB != null ? `el PIB cayó un ${fmt(-r.caidaPIB, 1)} %` : 'sin dato publicado de la caída del PIB'}
                      {r.paroMax ? `; paro máximo ${fmt(r.paroMax.valor, 1)} % (${r.paroMax.periodo})` : ''}.
                    </li>
                  ))}
                </ul>
              </>
            }
            src={L('Banco Mundial (datos del INE) y Comité de Fechado del Ciclo de la AEE', 'https://www.asesec.org/CFCweb/')}
          />
        </>
      ),
    },
    {
      id: 'trabajo',
      k: 'trab',
      tema: 'Trabajo',
      veredicto: 'Mixto',
      tono: 'matiz',
      resumen: (
        <>
          El paro baja y trabajan muchas más mujeres, pero el paro sigue siendo de los más altos de Europa. Con la IA, de momento no hay despidos: la señal a
          vigilar es que se contrate menos a los jóvenes para los trabajos de oficina que la IA ya hace.
        </>
      ),
      mejor: [
        <>El paro ha bajado del {n1(paroMax)} % de {aParoMax} al {n1(paroU)} % en {aParo}.</>,
        <>Trabajan muchas más mujeres: del {n0((EMPLEO.mAnt as Serie)['2001'] ?? 0)} % en 2001 al {n0(mU)} % en {aM}.</>,
        <>Casi 9 de cada 10 empresas que usan IA no han cambiado su plantilla (Banco de España, 2026).</>,
      ],
      peor: [
        <>En cada crisis el paro pasa del 20 %.</>,
        <>Una cuarta parte de las grandes empresas cree que tendrá menos plantilla por la IA en tres años.</>,
        ...(funcas ? [<>Previsión de Funcas: pérdida neta de unos {n0(-funcas.cifra / 1000)} mil empleos entre 2025 y 2035.</>] : []),
      ],
      hacer: [
        <>
          <strong>Formar mejor, no solo más.</strong> España tiene muchos universitarios en trabajos que no piden su título y le faltan técnicos: más FP dual
          (en la empresa) y reciclaje a lo largo de la vida, para quien cambia de trabajo o pierde tareas por la IA.
        </>,
        <>
          <strong>Hacer atractivos los oficios que faltan:</strong> construcción, campo, cuidados, transporte. Cuesta encontrar gente porque son duros, pagan poco o
          son temporales; atrae más subir sueldos, dar estabilidad y seguridad y prestigiarlos que obligar a nadie.
        </>,
        <>
          <strong>Buenas condiciones también sin título:</strong> no todo empleo necesita estudios largos, pero todos necesitan un sueldo digno, horarios
          razonables y contrato estable.
        </>,
        <>
          <strong>Tecnología, con cuidado:</strong> hace que cada empleo produzca más, pero también sustituye puestos. Sirve si lo que se gana llega a sueldos,
          jornada y cotizaciones, y si quien pierde su puesto tiene a dónde ir.
        </>,
        <>Conciliación (horarios, escuela de 0 a 3 años) para que trabaje quien quiera.</>,
      ],
      graficas: (
        <>
          <Mini
            id="fut-paro"
            title="Paro en cada crisis"
            sub="% de la población activa, media anual"
            series={[{lab: 'Paro', c: '#E03131', data: paroLargo}]}
            f={(v) => fmt(v, 1) + ' %'}
            x0={1969.5}
            yMin={0}
            note={<p>Más del 20 % en 1985, en 1994 y en 2013. En 2020 subió menos porque los ERTE no cuentan como paro.</p>}
            src={L('Banco Mundial e INE (EPA)', 'https://data.worldbank.org/indicator/SL.UEM.TOTL.NE.ZS?locations=ES')}
          />
          <Barras
            id="fut-ia-expo"
            title="Empleos expuestos a la IA"
            sub="% del empleo, según cada organismo"
            series={[{lab: 'Empleo', c: '#7048E8'}]}
            filas={expo.filter((e) => e.v != null).map((e) => ({lab: e.lab, vals: [e.v!]}))}
            f={pct1}
            max={100}
            note={
              <p>
                «Expuesto» no quiere decir que se vaya a perder: quiere decir que la IA puede hacer una parte de sus tareas. España tiene un 27,4 % de
                trabajadores expuestos, como la media de la OCDE, pero solo un 5,9 % con riesgo alto de automatización, la mitad que la OCDE. El FMI calcula que
                en los países ricos el 60 % de los empleos está expuesto: en la mitad la IA ayudaría al trabajador y en la otra mitad podría sustituirlo.
              </p>
            }
            src={L('OCDE, FMI, OIT y BBVA Research', 'https://www.imf.org/en/Publications/staff-discussion-notes/Issues/2024/01/14/Gen-AI-Artificial-Intelligence-and-the-Future-of-Work-542379')}
          />
          <Mini
            id="fut-ia-empresas"
            title="Empresas que usan IA"
            sub="% de las empresas de 10 o más empleados"
            series={[{lab: 'Empresas', c: '#7048E8', data: adop}]}
            bars
            f={pct1}
            x0={2022.5}
            yMin={0}
            note={
              <>
                <p>
                  Del {pct1(adop['2023'])} en 2023 al {pct1(adop['2026'])} en 2026. El dato de 2026 no se compara del todo con los anteriores porque el INE
                  cambió la clasificación de actividades.
                </p>
                <p>
                  <b>Lo que se ha visto hasta ahora:</b>
                </p>
                <ul className="fut-lista">
                  {(I.efectosObservados as any[]).map((e) => (
                    <li key={e.fuente}>
                      <b>{e.fuente.split(/[,(']/)[0].trim()}</b> ({String(e.fecha).slice(0, 7)}): {e.resumen}{' '}
                      {e.url && (
                        <a href={e.url} target="_blank" rel="noopener">
                          Fuente ↗
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            }
            src={L('INE, Encuesta sobre el uso de TIC en las empresas', 'https://www.ine.es/dyngs/Prensa/ETICCE20251T2026.htm')}
          />
        </>
      ),
    },
    {
      id: 'instituciones',
      k: 'inst',
      tema: 'Instituciones',
      veredicto: 'Va a peor',
      tono: 'falso',
      resumen: (
        <>
          La democracia sigue funcionando por votación, pero se gobierna cada vez más por decreto y cada vez menos gente se fía de las noticias. España no tiene
          demasiados empleados públicos comparada con Europa, pero sí cada vez más ministros, altos cargos y asesores.
        </>
      ),
      mejor: [
        ...pre('Política', [<>Las elecciones y los cambios de gobierno siguen siendo pacíficos y por votación, desde 1977.</>]),
        ...pre('Medios', [
          <>
            En libertad de prensa está mejor que en los años 2000: puesto {n0(rsfU)} de 180 en {aRsf} (cuanto más bajo, mejor), frente a puestos entre el 33 y
            el 44 de 2003 a 2016. Su mejor puesto fue el {n0(rsfMejor)}, en {aRsfMejor}.
          </>,
        ]),
        ...pre('Administración', SP.mejor),
      ],
      peor: [
        ...pre('Política', [<>Se gobierna cada vez más por decreto ley: {n0(dec['1986'])} en 1986 y {n0(decU)} en {aDec}. Más legislaturas cortas y repeticiones electorales.</>]),
        ...pre('Medios', [
          <>Solo el {n0(confU)} % confía en las noticias ({aConf}); en {aConfMax} era el {n0(confMax)} %.</>,
          <>El {n0(preU)} % teme no distinguir lo real de lo falso en internet ({aPre}).</>,
          <>En libertad de prensa, en {aRsf} bajó seis puestos respecto a {aRsfMejor}.</>,
        ]),
        ...pre('Administración', SP.peor),
      ],
      hacer: [
        ...pre('Política', [<>Pactos de Estado en lo que dura más de una legislatura: pensiones, vivienda, educación; y presupuestos aprobados a tiempo.</>]),
        ...pre('Medios', [<>Enseñar en el colegio a contrastar fuentes y detectar bulos, y apoyar a los verificadores.</>]),
        ...pre('Administración', SP.hacer),
      ],
      graficas: SP.graficas,
    },
    {
      id: 'pensiones',
      k: 'pen',
      tema: 'Pensiones',
      veredicto: 'Va a peor',
      tono: 'falso',
      resumen: (
        <>
          Lo más seguro de todo: en 2050 casi uno de cada tres tendrá 65 años o más y habrá {n0(P.dependencia['2050'])} mayores por cada 100 en edad de
          trabajar (hoy {n0(H.dependencia[aH])}). Pensiones, sanidad y cuidados van a costar bastante más, gobierne quien gobierne. La discusión de verdad es
          cómo se paga. Y nacen la mitad de niños que en 1976: desde 2017 mueren más personas de las que nacen, y la población solo crece porque llega
          gente de fuera.
        </>
      ),
      mejor: [
        ...pre('Envejecimiento', [
          <>Se vive más: {n1(H.esperanzaVida['2024'])} años de esperanza de vida en 2024, frente a {n1(H.esperanzaVida['1986'])} en 1986.</>,
          <>La pensión media ha crecido más que los precios: se ha multiplicado por 2,2 en términos reales desde 1986.</>,
        ]),
        ...pre('Natalidad', [<>En {aNac} nacieron {n0(nacU)} niños, algo más que el año anterior, y el INE supone que la fecundidad sube un poco.</>]),
      ],
      peor: [
        ...pre('Envejecimiento', [
          <>Los mayores de 65 pasan del {pct1(H.pct65['1986'])} en 1986 al {pct1(pct65H)} hoy y al {pct1(P.pct65['2050'])} en 2050.</>,
          <>El gasto en pensiones pasaría del {fmt(AR.serie['2022'], 1)} % al {fmt(AR.serie['2050'], 1)} % del PIB en 2050, y habrá {fmt(soporte['2050'], 2)} cotizantes por pensionista.</>,
        ]),
        ...pre('Natalidad', [
          <>{fmt(H.fecundidad['2024'], 2)} hijos por mujer (2024), muy lejos de los 2,1 que mantienen una población: de los más bajos del mundo.</>,
          <>En {aSaldo} murieron {n0(-saldoU)} personas más de las que nacieron; en 2050 serían {n0(-P.saldoNatural['2050'])}.</>,
        ]),
      ],
      hacer: [
        ...pre('Natalidad', [
<>Vivienda y alquiler asequible para que la gente se emancipe antes de los 30.</>,
        <>Permisos y escuela de 0 a 3 años gratis; ayudas por hijo.</>,
        <>Horarios que permitan criar sin dejar de trabajar.</>,
        ]),
        <>Para las pensiones, las siete ideas de abajo: ninguna basta sola, y casi todas tardan años en notarse.</>,
      ],
      extra: (
        <>
          <p className="fut-sol-intro">Qué se puede hacer, además de que llegue gente de fuera:</p>
          <div className="fut-sol">
            {SOLUCIONES_EDAD.map(([k, tit, txt]) => (
              <div key={tit} className="fut-sol-c">
                <span className="fut-sol-t">
                  <Icono k={k} size={16} />
                  {tit}
                </span>
                <span>{txt}</span>
              </div>
            ))}
          </div>
          <p className="note" style={{marginTop: 8}}>
            Sin inmigración, la población bajaría igualmente: las proyecciones del INE ya cuentan con que lleguen cientos de miles de personas al año.
          </p>
        </>
      ),
      graficas: (
        <>
          <Mini
            id="fut-mayores"
            title="Cada vez más mayores"
            sub="% de la población (proyección del INE en discontinua)"
            series={[
              {lab: '65 años o más', c: '#C2255C', data: desde(H.pct65, 1976)},
              {lab: '65 o más, proyección', c: '#C2255C', dash: true, data: P.pct65},
              {lab: '80 años o más', c: '#7048E8', data: desde(H.pct80, 1976)},
              {lab: '80 o más, proyección', c: '#7048E8', dash: true, data: P.pct80},
            ]}
            f={pct1}
            x0={1975.5}
            yMin={0}
            hitos={[PROY]}
            note={
              <p>
                Es lo más seguro de toda la página: los que tendrán 65 años en 2050 ya han nacido, y la migración o la natalidad lo mueven poco. Los mayores de
                80 pasan del {pct1(H.pct80['1986'])} en 1986 al {pct1(P.pct80['2050'])} en 2050. Proyección del INE 2026–2076, publicada en junio de 2026.
              </p>
            }
            src={
              <>
                {L('INE, Indicadores Demográficos Básicos', INE_IDB)}; {L('INE, Proyecciones de Población 2026–2076', INE_PROY)}
              </>
            }
          />
          <Mini
            id="fut-dependencia"
            title="Mayores por cada 100 en edad de trabajar"
            sub="personas de 65 o más por cada 100 de 16 a 64 años"
            series={[
              {lab: 'Hasta hoy', c: '#E8590C', data: desde(H.dependencia, 1976)},
              {lab: 'Proyección del INE', c: '#E8590C', dash: true, data: P.dependencia},
            ]}
            f={n1}
            x0={1975.5}
            yMin={0}
            hitos={[PROY]}
            note={
              <p>
                Es la cuenta de fondo de las pensiones y la sanidad: menos gente trabajando por cada jubilado, aunque la proyección ya cuenta con que llegue
                mucha gente de fuera.
              </p>
            }
            src={L('INE, Indicadores Demográficos Básicos y Proyecciones 2026–2076', INE_PROY)}
          />
          <Mini
            id="fut-pensiones"
            title="Gasto en pensiones"
            sub="% del PIB, proyección de la Comisión Europea (Ageing Report 2024)"
            series={[{lab: 'Pensiones públicas, bruto', c: '#7048E8', dash: true, data: solo(AR.serie)}]}
            f={(v) => fmt(v, 1) + ' %'}
            x0={2021.5}
            yMin={0}
            note={
              <p>
                Del {fmt(AR.serie['2022'], 1)} % del PIB en 2022 al {fmt(AR.serie['2050'], 1)} % en 2050, ya contando la reforma de 2021–2023: unos 4 puntos más,
                parecido a todo lo que hoy se gasta en educación (4,1 %). Incluye todas las pensiones públicas, por eso sale más que el 10,8 % de las
                contributivas de la pestaña Economía. Cotizantes por pensionista: {fmt(soporte['2022'], 2)} en 2022, {fmt(soporte['2050'], 2)} en 2050 y{' '}
                {fmt(soporte['2070'], 2)} en 2070. AIReF (según sus resúmenes) proyecta algo menos, en torno al 16 % en 2050.
              </p>
            }
            src={L('Comisión Europea, 2024 Ageing Report', AR.url)}
          />
          <Mini
            id="fut-nacimientos"
            title="Nacen menos de los que mueren"
            sub="miles al año (proyección del INE en discontinua)"
            series={[
              {lab: 'Nacimientos', c: '#2F9E44', data: escala(desde(H.nacimientos, 1976), 1000)},
              {lab: 'Nacimientos, proyección', c: '#2F9E44', dash: true, data: escala(P.nacimientos, 1000)},
              {lab: 'Defunciones', c: '#212529', data: escala(desde(H.defunciones, 1976), 1000)},
              {lab: 'Defunciones, proyección', c: '#212529', dash: true, data: escala(P.defunciones, 1000)},
            ]}
            f={(v) => n0(v * 1000)}
            x0={1975.5}
            yMin={0}
            hitos={[PROY]}
            note={
              <p>
                El INE supone que la fecundidad sube un poco, de {fmt(H.fecundidad['2024'], 2)} hijos por mujer en 2024 a {fmt(P.fecundidad['2050'], 2)} en
                2050, y aun así las muertes superan a los nacimientos cada vez más.
              </p>
            }
            src={L('INE (Movimiento Natural de la Población y Proyecciones 2026–2076); Eurostat demo_gind', INE_PROY)}
          />
          <Mini
            id="fut-poblacion"
            title="Una población que solo crece por la inmigración"
            sub="millones de habitantes a 1 de enero"
            series={[
              {lab: 'Hasta hoy', c: '#3B5BDB', data: escala(desde(H.poblacion, 1976), 1e6)},
              {lab: 'Proyección del INE', c: '#3B5BDB', dash: true, data: escala(P.poblacion, 1e6)},
            ]}
            f={(v) => fmt(v, 1) + ' M'}
            x0={1975.5}
            hitos={[PROY]}
            note={
              <p>
                De {fmt(H.poblacion['1986'] / 1e6, 1)} millones en 1986 a {fmt(ult(H.poblacion)[1] / 1e6, 1)} hoy y {fmt(P.poblacion['2050'] / 1e6, 1)} en 2050
                según el INE, que supone que cada año llegan más de los que se van (unos {n0(P.saldoMigratorioSupuesto['2026'] / 1000)} mil netos en 2026 y{' '}
                {n0(P.saldoMigratorioSupuesto['2050'] / 1000)} mil en 2050).
                {eu2050 != null && ` Eurostat, que supone menos migración, proyecta ${fmt(eu2050 / 1e6, 1)} millones en 2050.`}
              </p>
            }
            src={L('INE, Proyecciones de Población 2026–2076', INE_PROY)}
          />
        </>
      ),
    },
    {
      id: 'ambiente',
      k: 'env',
      tema: 'Medio ambiente',
      veredicto: 'Va a mejor',
      tono: 'cierto',
      resumen: (
        <>
          La electricidad es cada vez más renovable y las emisiones han bajado mucho desde 2007. Lo que pesa cada vez más es adaptarse al calor, la sequía y las
          danas.
        </>
      ),
      mejor: [
        <>Las renovables dan el {n0(renU)} % de la electricidad ({aRen}). Las emisiones han bajado de {n0(geiMax)} millones de toneladas en {aGeiMax} a {n0(geiU)} en {aGei}.</>,
      ],
      peor: [<>Siguen por encima de las de 1990, y el calor, la sequía y las danas pesan cada vez más.</>],
      hacer: [<>Seguir con las renovables y la red eléctrica, transporte público y adaptar ciudades y campo al calor y al agua.</>],
    },
    {
      id: 'vivienda',
      k: 'viv',
      tema: 'Vivienda',
      veredicto: 'Va a peor',
      tono: 'falso',
      resumen: (
        <>
          El cambio más grande y el que más se nota en la vida de la gente. Cada año se forman más del doble de hogares que casas se construyen, así que
          faltan casas y suben los precios y los alquileres mucho más que los sueldos: un piso cuesta {n1(asU)} años de sueldo y los jóvenes se van de casa a
          los 30.
        </>
      ),
      mejor: [
        <>Los desahucios han bajado de {n0(desMax)} en {aDesMax} a {n0(desU)} en {aDes}.</>,
        <>Los pisos turísticos bajan: de {n0(tMax)} en {aTMax} a {n0(tU)} en {aT}.</>,
      ],
      peor: [
        <>Un piso cuesta {n1(asU)} años de sueldo ({aAS}), frente a {n1(aniosSueldo['1987'])} en 1987.</>,
        <>Faltan unas {n0(S.vivienda.deficitBdE.cifra)} viviendas desde 2021, y la vivienda protegida ha caído de {n0(vpo['1986'])} al año en 1986 a {n0(vpoU)} en {aVpo}.</>,
        <>Hay {fmt(HAY_CASAS.censo2021.vacias / 1e6, 1)} millones de casas vacías, pero casi la mitad está en pueblos de menos de 10.000 habitantes, lejos del trabajo.</>,
      ],
      hacer: [
        <>No hay una sola solución, sino varias que suman.</>,
        <>Construir más donde vive la gente, sobre todo vivienda de precio limitado y de alquiler social.</>,
        <>Hacer atractivos los pueblos y ciudades medianas: teletrabajo, sanidad, colegios.</>,
        <>Mejor transporte público para que lo barato quede cerca del trabajo, y sacar casas vacías al alquiler.</>,
      ],
      graficas: (
        <Mini
          id="fut-vivienda"
          title="Se construye mucho menos de lo que se necesita"
          sub="miles al año: viviendas terminadas y hogares nuevos"
          series={[
            {lab: 'Viviendas terminadas', c: '#2F9E44', data: escala(term, 1000)},
            {lab: 'Hogares nuevos', c: '#E03131', data: escala(hog, 1000)},
          ]}
          f={(v) => n0(v * 1000)}
          x0={2005.5}
          yMin={0}
          note={
            <>
              <p>
                <b>El problema, en sencillo:</b> cada año hay muchos más hogares nuevos que casas nuevas. Hogares nuevos son parejas que se independizan, gente
                que se separa, personas mayores que viven solas y familias que llegan de fuera: más de 200.000 al año. Casas nuevas se terminan unas 90.000 o
                100.000 al año, cuando en 2006 se terminaron {n0(term['2006'])}.
              </p>
              <p>
                <b>Qué pasa cuando faltan casas:</b> muchos buscan y hay pocas, así que suben los precios de compra y de alquiler, y los sueldos no suben igual.
                Por eso la gente se independiza tarde (a los {n0(ult(VIV.edad as Serie)[1])} años de media) y solo el {n1(ult(VIV.emanc as Serie)[1])} % de los
                jóvenes de 16 a 29 años vive fuera de casa de sus padres.
              </p>
            </>
          }
          src={
            <>
              {L('Ministerio de Vivienda, viviendas terminadas', S.vivienda.terminadas.urls?.[0] ?? 'https://www.mivau.gob.es')};{' '}
              {L('INE, hogares', 'https://www.ine.es/jaxiT3/Tabla.htm?t=60131')}; {L('Banco de España, Informe Anual 2025', S.vivienda.deficitBdE.url)}
            </>
          }
        />
      ),
    },
  ];

  return (
    <section style={{borderTop: 0, paddingTop: 8}}>
      <h2>
        Lo que viene{' '}
        <Info>
          <p>
            Una página aparte, sin enlace en la barra de pestañas. Junta lo que ha cambiado de verdad en estos 40 años con lo que dicen las proyecciones
            oficiales: INE para la población, Fondo Monetario Internacional y Comisión Europea para la deuda, Comisión Europea para las pensiones, Banco de
            España para la vivienda, y OCDE, FMI, OIT, Banco de España y otros para la inteligencia artificial.
          </p>
          <p>
            Una proyección no es una profecía: dice qué pasaría si se cumplen sus supuestos (cuántos niños nacen, cuánta gente llega, que no cambien las leyes).
            Por eso las líneas futuras van discontinuas. Lo que va a mejor y a peor sale de los datos; las soluciones son propuestas que se discuten en España y
            en otros países, sin efecto garantizado, y la tendencia de cada tema es una lectura propia.
          </p>
        </Info>
      </h2>

      <div className="box" id="fut-cambios" style={{marginTop: 12}}>
        <h3>Lo que sí ha cambiado muchísimo</h3>
        <p className="note">
          La mayoría de los indicadores se mueven poco de una década a otra: el paro sube y baja con las crisis, la violencia registrada va y viene, la presión
          fiscal sube despacio. Pero unos pocos se han desbordado, y casi todos apuntan a lo mismo: <b>un país más viejo, más endeudado, donde vivir cuesta mucho
          más y que necesita a quien llega de fuera para crecer</b>. Pulsa una cifra para ver su tema.
        </p>
        <div className="tiles">
          {CIFRAS.map((c) => (
            <button key={c.txt} type="button" className="tile fut-tile" onClick={() => abrirTema(c.id)}>
              <span className="fut-pill">
                <Icono k={c.k} size={14} />
                {c.tema}
              </span>
              <span className="big num">{c.v}</span>
              <span>{c.txt}</span>
              <span className="srcl">{c.src}</span>
            </button>
          ))}
        </div>
        <dl className="cuenta">
          <div className="ok">
            <dt>Lo que casi no se mueve</dt>
            <dd>
              Los homicidios (entre 300 y 400 muertes al año desde 1980, con mucha más población), quién sufre cada tipo de violencia, o la presión fiscal, que
              sube despacio (del {n0(pf['1986'])} % al {n0(ult(pf)[1])} % del PIB en casi 40 años). El paro baja en los años buenos, pero siempre vuelve a niveles
              muy altos para Europa. Ahí no hay un disparate: hay problemas crónicos.
            </dd>
          </div>
        </dl>
      </div>

      <section className="faq" aria-label="Tema por tema" id="fut-temas">
        <h2>Tema por tema</h2>
        <p className="faq-intro">
          Qué va a mejor, qué va a peor y qué se podría hacer en cada tema, con sus gráficas y las proyecciones oficiales. Pulsa cada uno para abrirlo.
        </p>
        {[...TEMAS, ...masTemas()].sort((a, b) => ORDEN.indexOf(a.id) - ORDEN.indexOf(b.id)).map((t) => (
          <Desplegable key={t.id} t={t} />
        ))}
      </section>
    </section>
  );
}
