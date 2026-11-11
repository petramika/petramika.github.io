import {useEffect, useState, type ReactNode} from 'react';
import {DONDE_NACIERON, VIOLENCIA as V} from '../../datos';
import {fmt} from '../../lib/formato';
import Info from '../../componentes/Info';
import {L} from '../../componentes/enlace';

export type Serie = Record<string, number>;
export const enMiles = (s: Serie): Serie => Object.fromEntries(Object.entries(s).map(([a, v]) => [a, v / 1000]));
export const red = (v: number, a: number) => Math.round(v / a) * a;

export const COL = {
  noSexHombres: '#748FFC',
  sexHombres: '#1C3FAA',
  noSexMujeres: '#F06595',
  sexMujeres: '#A61E4D',
  total: '#212529',
  abortos: '#2B8A3E',
};

/** Tipos de violencia con victimas registradas, en el orden de la barra */
export const TIPOS: {k: string; lab: string; c: string; sexual?: boolean}[] = [
  {k: 'lesiones', lab: 'Lesiones', c: '#748FFC'},
  {k: 'malosTratos', lab: 'Malos tratos en la familia', c: '#F59F00'},
  {k: 'robosViolencia', lab: 'Robos con violencia o intimidación', c: '#868E96'},
  {k: 'otrosPersonas', lab: 'Otros contra las personas', c: '#CED4DA'},
  {k: 'homicidios', lab: 'Homicidios y tentativas', c: '#212529'},
  {k: 'agresionSexual', lab: 'Agresión sexual sin penetración', c: '#E64980', sexual: true},
  {k: 'conPenetracion', lab: 'Agresión sexual con penetración', c: '#A61E4D', sexual: true},
];

const anios = Object.keys(V.tipos.lesiones.hombres).map(Number);
const pctTxt = (v: number) => fmt(v, 1) + ' %';
const INTERIOR = 'https://estadisticasdecriminalidad.ses.mir.es/';

/** Cabecera de la pestaña: tipos de violencia registrada en un año, con linea de tiempo */
export default function TiposViolencia({children, nota}: {children?: ReactNode; nota?: ReactNode}) {
  const ultimo = anios[anios.length - 1];
  const [anio, setAnio] = useState(ultimo);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    if (!play) return;
    const t = setInterval(() => {
      setAnio((a) => {
        if (a >= ultimo) {
          setPlay(false);
          return a;
        }
        return a + 1;
      });
    }, 800);
    return () => clearInterval(t);
  }, [play, ultimo]);
  const reproducir = () => {
    if (!play && anio >= ultimo) setAnio(anios[0]);
    setPlay(!play);
  };

  const y = String(anio);
  const n = (k: string, s?: 'hombres' | 'mujeres') => (s ? V.tipos[k][s][y] : V.tipos[k].hombres[y] + V.tipos[k].mujeres[y]);
  const trozos = TIPOS.map((t) => ({...t, n: n(t.k)}));
  const total = trozos.reduce((s, t) => s + t.n, 0);
  const pct = (v: number) => (v / total) * 100;
  const pob: number | undefined = DONDE_NACIERON.totalPoblacion[y];
  const tasa = pob ? (total / pob) * 1e5 : null;
  const hom = V.europa.indicadores.homicidios, W = V.mundoHomicidios;

  return (
    <div id="vio-tipos" className="box" style={{marginTop: 12}}>
      <h3>
        ¿Qué violencia se registra?{' '}
        <Info>
          <p>
            Víctimas de cada tipo de violencia que registran Policía Nacional, Guardia Civil, policías autonómicas y locales, desde {anios[0]}. Cuenta
            víctimas, no personas: quien sufre dos delitos en un año cuenta dos veces. Se dejan fuera las pocas víctimas de sexo desconocido. No se
            cuentan las amenazas ni las coacciones.
          </p>
          <ul>
            <li>
              <b>Lesiones:</b> herir o dañar la salud física o mental de otra persona cuando necesita atención médica: un puñetazo en una pelea, una
              paliza, una herida con arma, una mutilación (artículos 147 a 156 del Código Penal). Si quien pega es la pareja o un familiar y la lesión
              es leve, cuenta como malos tratos en la familia.
            </li>
            <li>
              <b>Malos tratos en la familia:</b> pegar o maltratar a la pareja, la expareja o un familiar (padres, hijos, hermanos), aunque no deje
              lesión (artículo 153). Incluye la violencia de género.
            </li>
            <li>
              <b>Robos con violencia o intimidación:</b> quitarle algo a alguien con fuerza o amenazas: tirones, atracos, robos con navaja.
            </li>
            <li>
              <b>Otros contra las personas:</b> el resto de delitos contra la vida y la integridad. Hasta 2015 recogía también las faltas de lesiones y
              de malos tratos, unas 100.000 al año: cuando la reforma del Código Penal de julio de 2015 suprimió las faltas, casi desaparecen. Por
              eso el total cae entre 2014 y 2016 sin que haya menos violencia.
            </li>
            <li>
              <b>Homicidios y tentativas:</b> matar o intentar matar a alguien a propósito (homicidio y asesinato, consumados o no).
            </li>
            <li>
              <b>Agresión sexual:</b> cualquier acto sexual sin consentimiento, desde tocamientos; con penetración es violación. Desde la Ley 10/2022
              ya no se separa el abuso de la agresión.
            </li>
          </ul>
          {nota}
          <p className="srcl">Fuente: {L('Ministerio del Interior, Sistema Estadístico de Criminalidad (tabla 04001, victimizaciones)', INTERIOR)}</p>
        </Info>
      </h3>
      <p className="note">
        {tasa != null ? (
          <>
            En {anio} hubo <b>{fmt(tasa, 0)} víctimas registradas de violencia por cada 100.000 habitantes</b>: el {fmt(tasa / 1000, 2)} % de la
            población, una de cada {fmt(Math.round(1e5 / tasa), 0)} personas.
          </>
        ) : (
          <>
            En {anio} la policía registró <b>{fmt(total, 0)} víctimas de violencia</b>.
          </>
        )}{' '}
        Comparada con el resto de Europa, España tiene <b>pocos homicidios</b> y <b>muchos robos con violencia</b>. Con el mundo, la diferencia es
        enorme: {fmt(hom.tasas.ES, 2)} homicidios por cada 100.000 habitantes ({V.europa.anio}) frente a {fmt(W.mundo, 1)} de media mundial y{' '}
        {fmt(W.americas, 0)} en América ({W.anio}). Pulsa ▶ para ver cómo cambia año a año.
        {anio <= 2015 && ' Hasta 2015 «otros contra las personas» incluye las faltas, que luego desaparecen: no lo compares con los años siguientes.'}
      </p>

      <div className="tl-anios" role="group" aria-label="Elegir año">
        <button type="button" className="tl-play" onClick={reproducir} aria-label={play ? 'Pausar' : 'Ver la evolución año a año'}>
          {play ? '❚❚' : '▶'}
        </button>
        <div className="tl-linea">
          {anios.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={a === anio}
              className={a % 5 === 0 || a === anios[0] || a === ultimo ? 'clave' : undefined}
              onClick={() => {
                setPlay(false);
                setAnio(a);
              }}
            >
              <i />
              <span>{a}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="stack tl-barra" style={{height: 30, marginTop: 8}}>
        {trozos.map((t) => (
          <span key={t.k} style={{flex: t.n, background: t.c}} title={`${t.lab}: ${fmt(t.n, 0)} (${pctTxt(pct(t.n))})`} />
        ))}
      </div>
      <div className="statlegend">
        {trozos.map((t) => (
          <span key={t.k}>
            <i className="sw" style={{background: t.c}} />
            {t.lab}: <b className="num">{pctTxt(pct(t.n))}</b> ({fmt(t.n, 0)})
          </span>
        ))}
      </div>


      {children}
    </div>
  );
}
