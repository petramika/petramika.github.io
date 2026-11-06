import {L} from '../../componentes/enlace';
import Barras from '../../componentes/graficas/Barras';
import {Cuestion} from '../../componentes/Cuestiones';
import type {ReactNode} from 'react';
import {T} from '../../../comun/Glosario';
import {fmt} from '../../lib/formato';
import BN from '../../datos/partidos/blanco-nulo.json';
import {PARTIES, PEL} from './datos';

/*
  «No votar o votar en blanco no sirve»: que pasa de verdad con cada opcion.
  Datos de la Junta Electoral Central (BOE) y articulos de la LOREG.
*/
const LOREG = 'https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672';
const STC_CDS = 'https://www.boe.es/diario_boe/txt.php?id=BOE-T-1993-21436';
const D = BN.datos as unknown as Record<string, [number, number, number, number]>;
const fecha = (id: string) => PEL.find((x) => x[0] === id)?.[2] ?? id;
const ids = PEL.map(([id]) => id).filter((id) => D[id]);
const ult = ids.at(-1)!;
const [bU, nU, , vU] = D[ult];
const pctDe = (n: number, t: number) => (n / t) * 100;
// Blancos y nulos en la ultima eleccion, de cada 100 votantes
const bnDe100 = Math.round(pctDe(bU + nU, vU));

// Escaños en Blanco: su mejor resultado y si alguna vez ha sacado escaño
const EB = PARTIES.find((p) => p.key === 'EB')!.elections.filter((e) => e.vote != null);
const ebMejor = EB.reduce((a, e) => ((e.vote ?? 0) > (a.vote ?? 0) ? e : a));
const ebNunca = EB.every((e) => !e.seats);

type Fila = [cls: 'si' | 'no' | 'poco', texto: string];
const OPCIONES: {titulo: string; que: ReactNode; filas: Fila[]; efecto: string}[] = [
  {
    titulo: 'Quedarte en casa',
    que: <>No vas a votar (<T k="abstencion">abstención</T>).</>,
    filas: [
      ['no', 'Cuenta como que has votado'],
      ['no', 'Da diputados a alguien'],
      ['no', 'Cambia el listón del 3 %'],
      ['no', 'Da dinero a algún partido'],
    ],
    efecto: 'Deciden los demás. Solo se nota en la cifra de participación.',
  },
  {
    titulo: 'Voto nulo',
    que: 'Papeleta tachada, rota o con algo escrito, sin sobre, dos papeletas de partidos distintos o una que no es la oficial.',
    filas: [
      ['si', 'Cuenta como que has ido a votar'],
      ['no', 'Es un voto válido'],
      ['no', 'Da diputados a alguien'],
      ['no', 'Da dinero a algún partido'],
    ],
    efecto: 'Como quedarte en casa, pero constas como votante. Nadie sabe por qué lo anulaste.',
  },
  {
    titulo: 'Voto en blanco',
    que: 'Sobre vacío, sin papeleta dentro.',
    filas: [
      ['si', 'Cuenta como que has ido a votar'],
      ['si', 'Es un voto válido'],
      ['no', 'Da diputados a alguien'],
      ['poco', 'Sube un poquito el listón del 3 %'],
      ['no', 'Da dinero a algún partido'],
    ],
    efecto: 'Dice «he venido, pero no me convence nadie». Pone un poco más difícil entrar a los partidos pequeños.',
  },
  {
    titulo: 'Votar a un partido',
    que: 'Su papeleta, dentro del sobre.',
    filas: [
      ['si', 'Cuenta como que has ido a votar'],
      ['si', 'Es un voto válido'],
      ['si', 'Da diputados, si el partido llega'],
      ['si', 'Sube el listón del 3 %'],
      ['si', 'Da 0,81 € al partido, si saca diputado'],
    ],
    efecto: 'Es la única forma de decidir quién se sienta en el Congreso.',
  },
];

export function VotoBlanco() {
  return (
    <Cuestion
      pregunta="¿No votar o votar en blanco no sirve de nada?"
      veredicto="No quita diputados"
      tono="matiz"
      conclusion={
        <>
          Los 350 diputados se reparten siempre, vote mucha o poca gente. Ni quedarte en casa, ni el <T k="voto-nulo">voto nulo</T>, ni el{' '}
          <T k="voto-en-blanco">voto en blanco</T> dejan un
          asiento vacío ni le quitan diputados a nadie: los asientos se reparten entre los que sí votan a un partido. Si mañana votara solo 1 de
          cada 10, esos pocos elegirían a los 350. Entre una opción y otra cambia poco, pero cambia:
        </>
      }
      positivo={[
        <>
          El voto en blanco y el nulo se cuentan y se publican: dejan constancia de que fuiste y nadie te convenció. Son pocos:{' '}
          {bnDe100 <= 1 ? 'una' : `unas ${bnDe100}`} de cada 100 personas que van a votar.
        </>,
        <>
          Ni el blanco ni el nulo dan dinero a nadie. En cambio, cada voto a un partido que saca diputado le da 0,81 € de dinero público, y cada
          diputado, 21.167,64 € (cantidades de 2023).
        </>,
        <>
          Si quieres de verdad un asiento vacío, hay un partido, Escaños en Blanco, que promete dejar sin ocupar los que gane.
          {ebNunca ? ' Nunca ha sacado ninguno: ' : ' '}su mejor resultado fue en {fecha(ebMejor.e).slice(-4)}, con{' '}
          {ebMejor.e === '2011' ? 'unos 98.000 votos (4 de cada 1.000)' : `${fmt(Math.round((ebMejor.vote ?? 0) * 10), 0)} de cada 1.000 votos`}.
        </>,
      ]}
      negativo={[
        <>No quita ni un diputado. Y cuanta menos gente vota, más pesa el voto de los que sí van: deciden por ti.</>,
        <>
          El voto en blanco no es neutral: perjudica a los partidos pequeños. En Madrid, en 1993, al CDS le faltaron 438 votos para llegar al <T k="liston-3">3 %</T>;
          sin contar los votos en blanco lo habría superado. Lo llevó a los tribunales y perdió: la ley dice que el blanco es voto válido.
        </>,
      ]}
    >
      <div className="chart" style={{padding: 12, gridColumn: '1/-1'}}>
        <div className="voto-opc">
          {OPCIONES.map((o) => (
            <div key={o.titulo} className="voto-card">
              <h4>{o.titulo}</h4>
              <p className="que">{o.que}</p>
              <ul>
                {o.filas.map(([c, t]) => (
                  <li key={t} className={c}>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="efecto">{o.efecto}</p>
            </div>
          ))}
        </div>
        <p className="note" style={{margin: 0}}>
          ✓ sí · ✕ no · ≈ un poco. El listón del 3 %: en cada provincia, un partido necesita al menos 3 de cada 100 <T k="voto-valido">votos válidos</T> para optar a
          diputados, y el voto en blanco cuenta como válido. En las municipales el listón es el 5 %. En el Senado se vota a personas, sin listón:
          el voto en blanco ahí no cambia nada. Fuente: {L('Ley Orgánica del Régimen Electoral General', LOREG)} (artículos 96, 108, 162, 163, 175 y 180).
        </p>
      </div>
      <Barras
        ancha
        title="Votos en blanco y nulos"
        sub="De cada 100 personas que fueron a votar al Congreso"
        series={[
          {lab: 'En blanco', c: '#ADB5BD'},
          {lab: 'Nulos', c: '#495057'},
        ]}
        filas={ids.map((id) => ({lab: fecha(id), vals: [pctDe(D[id][0], D[id][3]), pctDe(D[id][1], D[id][3])]}))}
        f={(v) => fmt(v, 1) + ' %'}
        note={
          <>
            <p>
              En {fecha(ult)}: {fmt(bU, 0)} votos en blanco ({fmt(pctDe(bU, vU), 1)} %) y {fmt(nU, 0)} nulos ({fmt(pctDe(nU, vU), 1)} %), de{' '}
              {fmt(vU, 0)} votantes. Totales de toda España, con los españoles que viven fuera.
            </p>
            <p>
              El caso del CDS: en Madrid, en 1993, tuvo 93.347 votos de 3.126.150 válidos (2,986 %). Sin los 30.554 votos en blanco habría tenido el
              3,015 %. El Tribunal Supremo y el {L('Tribunal Constitucional (STC 265/1993)', STC_CDS)} confirmaron que el blanco cuenta como válido.
            </p>
            <p>
              Las tablas oficiales de 1986 a 1996 no cuadran del todo (los totales publicados tienen pequeños descuadres, y en 1986 el voto en blanco
              aún no se contaba igual en todas las provincias); úsalas como orientación.
            </p>
          </>
        }
        src={
          <>
            Junta Electoral Central, resultados publicados en el BOE ({ids.map((id, i) => (
              <span key={id}>
                {i > 0 && ', '}
                {L(fecha(id), BN.fuentes[id as keyof typeof BN.fuentes])}
              </span>
            ))}
            )
          </>
        }
      />
    </Cuestion>
  );
}
