import type {ReactNode} from 'react';
import {ANNUAL, DECRETOS, EMPLEO, ENV, INMIG, MEDIA, POB_INMIG, VIOLENCIA as V, VIV} from '../../datos';
import {fmt} from '../../lib/formato';
import Icono from '../../componentes/Icono';
import Info from '../../componentes/Info';
import DEMO from '../../datos/futuro/demografia.json';
import SOST from '../../datos/futuro/sostenibilidad.json';

/*
  Tema por tema: para cada area de la web, que va a mejor, que va a peor y que
  se podria hacer. Las cifras salen de los JSON de la web; las soluciones son
  propuestas que se discuten en España, no una evaluacion de su efecto.
*/
type Serie = Record<string, number>;
/* eslint-disable @typescript-eslint/no-explicit-any */
const H = (DEMO as any).historia as Record<string, Serie>;
const P = (DEMO as any).proyeccionINE as Record<string, Serie>;
const S = SOST as any;
const n0 = (v: number) => fmt(v, 0);
const n1 = (v: number) => fmt(v, 1);
const anios = (s: Serie) => Object.keys(s).filter((k) => /^\d{4}$/.test(k)).sort();
const ult = (s: Serie): [string, number] => {
  const k = anios(s).at(-1)!;
  return [k, s[k]];
};
const maxDe = (s: Serie): [string, number] => anios(s).reduce<[string, number]>((m, k) => (s[k] > m[1] ? [k, s[k]] : m), ['', -Infinity]);
const minDe = (s: Serie): [string, number] => anios(s).reduce<[string, number]>((m, k) => (s[k] < m[1] ? [k, s[k]] : m), ['', Infinity]);

type Tema = {k: string; tema: string; mejor: ReactNode[]; peor: ReactNode[]; hacer: ReactNode[]};
/** Pone el subtema delante de cada punto cuando una tarjeta junta dos */
const pre = (sub: string, xs: ReactNode[]): ReactNode[] =>
  xs.map((x) => (
    <>
      <b>{sub}:</b> {x}
    </>
  ));

function victimas(y: string) {
  return Object.values(V.tipos as Record<string, {hombres: Serie; mujeres: Serie}>).reduce((t, x) => t + x.hombres[y] + x.mujeres[y], 0);
}

export default function TemaPorTema() {
  const paro = ANNUAL.paro as Serie, deuda = ANNUAL.deuda as Serie;
  const [aParo, paroU] = ult(paro), [aParoMax, paroMax] = maxDe(paro);
  const [aDeuda, deudaU] = ult(deuda), [aDeudaMax, deudaMax] = maxDe(deuda);
  const mujeres = EMPLEO.m as Serie, mujeresAnt = EMPLEO.mAnt as Serie;
  const [aM, mU] = ult(mujeres);
  const anioSueldo = VIV.anios as Serie, [aAS, asU] = ult(anioSueldo);
  const turis = VIV.turis as Serie, [aT, tU] = ult(turis), [aTMax, tMax] = maxDe(turis);
  const des = VIV.desTot as Serie, [aDes, desU] = ult(des), [aDesMax, desMax] = maxDe(des);
  const vpo = VIV.vpo as Serie, [aVpo, vpoU] = ult(vpo);
  const ratioUE = S.salarios.pibPerCapitaReal;
  const ue = (y: string) => (ratioUE.ES[y] / ratioUE.UE27[y]) * 100;
  const fmi = S.deuda.fmi.serie as Serie;
  const nac = H.nacimientos, [aNac, nacU] = ult(nac);
  const fuera = POB_INMIG.pctNacidosFueraEspanoles as Serie;
  const irr = INMIG.irrB as Serie, [aIrr, irrU] = ult(irr);
  const dec = DECRETOS.porAnio as Serie, [aDec, decU] = ult(dec);
  const conf = MEDIA.confianza as Serie, [aConf, confU] = ult(conf), [aConfMax, confMax] = maxDe(conf);
  const preoc = MEDIA.preocupa as Serie, [aPre, preU] = ult(preoc);
  const rsf = MEDIA.rsf as Serie, [aRsf, rsfU] = ult(rsf), [aRsfMejor, rsfMejor] = minDe(rsf);
  const ren = ENV.renREE as Serie, [aRen, renU] = ult(ren);
  const gei = ENV.gei as Serie, [aGei, geiU] = ult(gei), [aGeiMax, geiMax] = maxDe(gei);
  const tasa = (y: string) => (victimas(y) / H.poblacion[y]) * 1e5;
  const resueltos = (y: string) => (V.esclarecidos.robosViolencia[y] / V.conocidos.robosViolencia[y]) * 100;
  const sexual = (y: string) => V.tipos.agresionSexual.mujeres[y] + V.tipos.conPenetracion.mujeres[y];
  const ultV = anios(V.tipos.lesiones.hombres).at(-1)!;

  const TEMAS: Tema[] = [
    {
      k: 'trab',
      tema: 'Trabajo',
      mejor: [
        <>El paro ha bajado del {n1(paroMax)} % de {aParoMax} al {n1(paroU)} % en {aParo}.</>,
        <>
          Trabajan muchas más mujeres: del {n0(mujeresAnt['2001'] ?? 0)} % en 2001 al {n0(mU)} % en {aM}.
        </>,
      ],
      peor: [
        <>Aun así, el paro sigue entre los más altos de Europa y en cada crisis pasa del 20 %.</>,
        <>La renta por habitante cae del {n0(ue('2000'))} % al {n0(ue('2024'))} % de la media de la UE (2000–2024): más empleo, pero no más productivo.</>,
      ],
      hacer: [
        <>Formación profesional ligada a lo que piden las empresas.</>,
        <>Más inversión en tecnología, también en IA, para que cada empleo produzca y pague más.</>,
        <>Conciliación (horarios, escuela de 0 a 3 años) para que trabaje quien quiera.</>,
      ],
    },
    {
      k: 'viv',
      tema: 'Vivienda',
      mejor: [
        <>
          Los desahucios han bajado de {n0(desMax)} en {aDesMax} a {n0(desU)} en {aDes}.
        </>,
        <>
          Los pisos turísticos bajan: de {n0(tMax)} en {aTMax} a {n0(tU)} en {aT}.
        </>,
      ],
      peor: [
        <>
          Un piso cuesta {n1(asU)} años de sueldo ({aAS}), frente a {n1(anioSueldo['1987'])} en 1987.
        </>,
        <>Faltan unas {n0(S.vivienda.deficitBdE.cifra)} viviendas desde 2021 y la vivienda protegida ha caído a {n0(vpoU)} al año ({aVpo}).</>,
      ],
      hacer: [
        <>Construir más donde vive la gente, sobre todo vivienda de precio limitado y de alquiler social.</>,
        <>Hacer atractivos los pueblos y ciudades medianas: teletrabajo, sanidad, colegios.</>,
        <>Mejor transporte público para que lo barato quede cerca del trabajo, y sacar casas vacías al alquiler.</>,
      ],
    },
    {
      k: 'imp',
      tema: 'Economía e impuestos',
      mejor: [
        <>
          La deuda baja desde el máximo de {aDeudaMax} ({n0(deudaMax)} %) al {n0(deudaU)} % en {aDeuda}, y el FMI la ve en el {n0(fmi['2031'])} % en 2031.
        </>,
        <>La economía crece (un 2,8 % en 2025) y eso solo ya ayuda a que la deuda pese menos.</>,
      ],
      peor: [
        <>Sigue siendo más del doble que en 2007, y los intereses suben: del 2,4 % al 4 % del PIB en 2036 según la Comisión Europea.</>,
        <>La Comisión, sin nuevas medidas, la ve volver a subir desde 2028 por el envejecimiento.</>,
      ],
      hacer: [
        <>Ahorrar en los años buenos para tener margen en la próxima crisis.</>,
        <>Revisar en qué se gasta y qué funciona, además de recaudar mejor.</>,
        <>Crecer por productividad: con más PIB, la misma deuda pesa menos.</>,
      ],
    },
    {
      k: 'pen',
      tema: 'Pensiones',
      mejor: [
        <>
          Se vive más: {n1(H.esperanzaVida['2024'])} años de esperanza de vida en 2024, frente a {n1(H.esperanzaVida['1986'])} en 1986.
        </>,
        <>La pensión media ha crecido más que los precios: se ha multiplicado por 2,2 en términos reales desde 1986.</>,
      ],
      peor: [
        <>
          Habrá {n0(P.dependencia['2050'])} mayores por cada 100 en edad de trabajar en 2050 (hoy {n0(H.dependencia['2025'])}).
        </>,
        <>El gasto en pensiones pasaría del 13 % al 17 % del PIB en 2050 (Comisión Europea).</>,
      ],
      hacer: [
        <>Más gente trabajando y jubilación más flexible.</>,
        <>Ahorro de empresa para la jubilación, además de la pública.</>,
        <>Producir más por persona: es lo que permite pagar más pensiones con menos trabajadores.</>,
      ],
    },
    {
      k: 'soc',
      tema: 'Servicios sociales',
      mejor: [<>En {aNac} nacieron {n0(nacU)} niños, algo más que el año anterior, y el INE supone que la fecundidad sube un poco.</>],
      peor: [
        <>
          {fmt(H.fecundidad['2024'], 2)} hijos por mujer (2024), muy lejos de los 2,1 que mantienen una población: de los más bajos del mundo.
        </>,
        <>Mueren más de los que nacen cada año desde 2017.</>,
      ],
      hacer: [
        <>Vivienda asequible para que la gente se emancipe antes de los 30.</>,
        <>Permisos y escuela de 0 a 3 años gratis; ayudas por hijo.</>,
        <>Horarios que permitan criar sin dejar de trabajar.</>,
      ],
    },
    {
      k: 'der',
      tema: 'Derechos y sociedad',
      mejor: [
        ...pre('Inmigración', [
        <>
          Uno de cada tres nacidos fuera ya es español ({n0(ult(fuera)[1])} %, {ult(fuera)[0]}), y las que vienen tienen cada vez menos hijos, como las
          españolas.
        </>,
        <>Sin ella, la población ya estaría bajando: es la que sostiene el número de trabajadores.</>,
        ]),
        ...pre('Violencia', [
        <>Pocos homicidios: por debajo de la media de la UE y unas ocho veces menos que la media mundial.</>,
        <>
          Se resuelven más robos con violencia: del {n0(resueltos('2010'))} % en 2010 al {n0(resueltos(ultV))} % en {ultV}. Y se denuncia más la
          violencia sexual.
        </>,
        ]),
      ],
      peor: [
        ...pre('Inmigración', [
        <>
          Los que viven en situación irregular han pasado de {n1((irr['2017'] ?? 0) * 1000)} mil en 2017 a unos {n0(irrU * 1000)} mil en {aIrr} (Funcas).
        </>,
        <>Están por encima de su peso entre los detenidos por delitos violentos, también por edad y sexo.</>,
        ]),
        ...pre('Violencia', [
        <>
          Las víctimas registradas por habitante han subido de {n0(tasa('2016'))} a {n0(tasa(ultV))} por cada 100.000 (2016–{ultV}).
        </>,
        <>
          Las agresiones sexuales a mujeres registradas se han multiplicado por {n1(sexual(ultV) / sexual('2016'))} desde 2016, y una de cada tres víctimas
          es menor.
        </>,
        ]),
      ],
      hacer: [
        ...pre('Inmigración', [
        <>Vías legales de llegada ligadas al trabajo, para que menos gente quede sin papeles.</>,
        <>Idioma, formación y empleo desde el primer año.</>,
        <>Repartir mejor dónde se vive, con vivienda y servicios.</>,
        ]),
        ...pre('Violencia', [
        <>Educación en consentimiento y en relaciones sanas desde el colegio.</>,
        <>Que denunciar sea fácil y rápido, con juzgados que respondan pronto.</>,
        <>Prevención con los chicos jóvenes, que son la mayoría de los que agreden.</>,
        ]),
      ],
    },
    {
      k: 'inst',
      tema: 'Instituciones',
      mejor: [
        ...pre('Política', [
<>Las elecciones y los cambios de gobierno siguen siendo pacíficos y por votación, desde 1977.</>
        ]),
        ...pre('Medios', [
        <>
          España sube en libertad de prensa: puesto {n0(rsfU)} en {aRsf} (el mejor, {n0(rsfMejor)} en {aRsfMejor}).
        </>,
        ]),
      ],
      peor: [
        ...pre('Política', [
        <>
          Se gobierna cada vez más por decreto ley: {n0(dec['1986'])} en 1986 y {n0(decU)} en {aDec}. Más legislaturas cortas y repeticiones electorales.
        </>,
        ]),
        ...pre('Medios', [
        <>
          Solo el {n0(confU)} % confía en las noticias ({aConf}); en {aConfMax} era el {n0(confMax)} %.
        </>,
        <>
          El {n0(preU)} % teme no distinguir lo real de lo falso en internet ({aPre}).
        </>,
        ]),
      ],
      hacer: [
        ...pre('Política', [
<>Pactos de Estado en lo que dura más de una legislatura: pensiones, vivienda, educación.</>, <>Presupuestos aprobados a tiempo.</>
        ]),
        ...pre('Medios', [
        <>Enseñar en el colegio a contrastar fuentes y detectar bulos.</>,
        <>Apoyar a los verificadores y la transparencia en la publicidad institucional.</>,
        ]),
      ],
    },
    {
      k: 'env',
      tema: 'Medio ambiente',
      mejor: [
        <>
          Las renovables dan el {n0(renU)} % de la electricidad ({aRen}). Las emisiones han bajado de {n0(geiMax)} millones de toneladas en {aGeiMax} a{' '}
          {n0(geiU)} en {aGei}.
        </>,
      ],
      peor: [<>Siguen por encima de las de 1990, y el calor, la sequía y las danas pesan cada vez más.</>],
      hacer: [<>Seguir con las renovables y la red eléctrica, transporte público y adaptar ciudades y campo al calor y al agua.</>],
    },
  ];

  return (
    <div id="fut-temas" style={{marginTop: 22}}>
      <h3>
        Tema por tema: qué va a mejor, qué va a peor y qué se podría hacer{' '}
        <Info>
          <p>
            Lo que va a mejor y a peor sale de las gráficas de toda la web. Lo que se podría hacer son propuestas que se discuten en España y en otros
            países; ninguna tiene garantizado su efecto, y muchas se pueden combinar.
          </p>
        </Info>
      </h3>
      <div className="fut-temas">
        {TEMAS.map((t) => (
          <div key={t.tema} className="fut-tema">
            <span className="fut-pill">
              <Icono k={t.k} size={14} />
              {t.tema}
            </span>
            <div className="fut-col ok">
              <b>Va a mejor</b>
              <ul>
                {t.mejor.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="fut-col ko">
              <b>Va a peor</b>
              <ul>
                {t.peor.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="fut-col sol">
              <b>Qué se podría hacer</b>
              <ul>
                {t.hacer.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
