import type {ReactNode} from 'react';
import {LEGS, PARTY, TURNOUT, type Legislatura} from '../../datos';
import {L} from '../../componentes/enlace';
import Barras from '../../componentes/graficas/Barras';
import Balance from '../global/Balance';
import {Cuestion, Cuestiones} from '../../componentes/Cuestiones';
import {TEAL} from '../../lib/config';
import {fmt, rateOf, yr} from '../../lib/formato';
import {T} from '../../../comun/Glosario';
import {ELEC, PARTIES, PEL, PROXIMA, CIS_CUANDO} from './datos';
import {VotoBlanco} from './VotoBlanco';

/*
  Cuestiones frecuentes de la pestaña de partidos: lo que se suele oir sobre
  los partidos y las elecciones, contestado solo con los datos de la web
  (resultados de cada eleccion, participacion, propuestas y promesas de
  cada Gobierno). Todas las cifras se calculan aqui a partir de esos datos,
  con el mismo criterio para todos los partidos.

  Los textos van en lenguaje de calle: pocas cifras, redondeadas («7 de cada
  10») y con ejemplos; el detalle exacto queda en las graficas y en su (i).
*/

type Promesa = [string, ...unknown[]];

const pct = (v: number, d = 1) => fmt(v, d) + ' %';
const mill = (v: number) => fmt(v / 1e6, 1) + ' millones';
/** 76 → «8» (de cada 10) */
const de10 = (v: number) => fmt(Math.round(v / 10), 0);
/** "jun 1986", "abr 2019"... */
const fecha = (id: string) => PEL.find((x) => x[0] === id)?.[2] ?? id;
const legDe = (id: string) => LEGS.find((l) => l.id === id)!;
/** [escaños, % de voto] de una lista en una eleccion (resultados de la legislatura) */
const res = (id: string, p: string) => {
  const r = legDe(id).res.find((x) => x[0] === p);
  return {esc: r?.[1] ?? 0, voto: r?.[2] ?? 0};
};
const partido = (k: string) => PARTIES.find((p) => p.key === k)!;
const HOY = new Date().toISOString().slice(0, 10), AHORA = new Date().getFullYear();
const escanosDe = (k: string, id: string) => partido(k).elections.find((e) => e.e === id)?.seats ?? null;
/** Nombre corto del presidente: «Zapatero», «Rajoy»… */
const CORTO: Record<string, string> = {'José María Aznar': 'Aznar', 'José Luis Rodríguez Zapatero': 'Zapatero', 'Mariano Rajoy': 'Rajoy', 'Pedro Sánchez': 'Sánchez'};
const corto = (p: string) => {
  const n = p.split(' → ')[0].replace(' (en funciones)', '');
  return CORTO[n] ?? n;
};

const FUENTE_ELEC = (
  <>
    {L('Junta Electoral Central (BOE)', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-18907')} y{' '}
    {L('Ministerio del Interior', 'https://infoelectoral.interior.gob.es')}
  </>
);
const BIG = ['PP', 'AP', 'PSOE'];
// Listas nacionalistas o regionalistas en los resultados (los «otros» no se desglosan)
const REG = ['CiU', 'PNV', 'HB', 'CC', 'ERC', 'BNG', 'Amaiur', 'Bildu', 'DL', 'CDC', 'JxCat', 'Junts'];
const REG_FICHAS = ['PNV', 'CIU', 'ERC', 'JUNTS', 'BILDU', 'CC', 'BNG'];

/* ---------- 1. Cumplimiento de cada Gobierno (mismo calculo que la pestaña Global) ---------- */
type Gob = {lab: string; p: string; pres: string; prom: Promesa[]; tipo: 'abs' | 'min' | 'coal'};
const tipoDe = (l: Legislatura): Gob['tipo'] => (/absoluta/.test(l.form) ? 'abs' : /coalici/.test(l.form) ? 'coal' : 'min');
const GOBS: Gob[] = LEGS.filter((l) => !l.failed).flatMap((l) => {
  // La legislatura en curso llega hasta hoy si aun no tiene fecha de fin
  const fin = l.current && !l.b ? AHORA : yr(l.b);
  if (l.prom2)
    return [
      {lab: `${yr(l.a)}–${yr(l.split!)} · ${l.gov} · ${l.form.split(';')[0]}`, p: l.gov, pres: corto(l.pres), prom: l.prom, tipo: tipoDe(l)},
      {lab: `${yr(l.split!)}–${fin} · PSOE · en minoría (tras la moción de censura)`, p: 'PSOE', pres: 'Sánchez', prom: l.prom2.l, tipo: 'min' as const},
    ];
  return [{lab: `${yr(l.a)}–${fin} · ${l.mandato.map((m) => PARTY[m].n).join(' + ')} · ${l.form.split(/[·(]/)[0].trim()}`, p: l.gov, pres: corto(l.pres), prom: l.prom, tipo: tipoDe(l)}];
  // Una legislatura recien estrenada aun no tiene promesas que valorar
}).filter((g) => rateOf(g.prom) != null);
const tasa = (g: Gob[]) => rateOf(g.flatMap((x) => x.prom))!;
const conTasa = GOBS.map((g) => ({...g, r: rateOf(g.prom)!}));
const peor = conTasa.reduce((a, b) => (b.r < a.r ? b : a)), mejor = conTasa.reduce((a, b) => (b.r > a.r ? b : a));
const nProm = GOBS.reduce((a, g) => a + g.prom.length, 0);
const porTipo = (t: Gob['tipo']) => tasa(GOBS.filter((g) => g.tipo === t));
const nGob = (p: string) => GOBS.filter((g) => g.p === p);
const sinMayoria = (p: string) => nGob(p).filter((g) => g.tipo !== 'abs').length;
// Ultima legislatura ya terminada (hoy, la XV de 2023)
const legAnterior = LEGS.filter((l) => !l.failed && l.b && l.b <= HOY).at(-1)!;
const nPromSinAprobar = legAnterior.prom.filter((p: Promesa) => p[0] === 'n').length;

/* ---------- 2. PP y PSOE: temas de sus propuestas ---------- */
function temas(k: string) {
  const m: Record<string, number> = {};
  partido(k).elections.forEach((e) => (e.items || []).forEach((i) => i.topic && (m[i.topic] = (m[i.topic] || 0) + 1)));
  return m;
}
const T_PP = temas('PP'), T_PSOE = temas('PSOE');
const comunes = Object.keys(T_PP).filter((t) => T_PSOE[t]).length;
/** En cuantas elecciones propuso un partido algo de ese tema, y en cuantas tiene propuestas */
const veces = (k: string, t: string) => partido(k).elections.filter((e) => (e.items || []).some((i) => i.topic === t)).length;
const conProp = (k: string) => partido(k).elections.filter((e) => (e.items || []).length).length;

/* ---------- 3. Votos y escaños ---------- */
const EJEMPLOS: [string, string][] = [
  ['2008', 'IU'], ['2008', 'PNV'], ['2011', 'UPyD'], ['2011', 'Amaiur'], ['2019N', 'Cs'], ['2019N', 'ERC'], ['2023', 'PP'],
];
const pacma2016 = partido('PACMA').elections.find((e) => e.e === '2016')!;
// Cuantas veces mas % de escaños que de votos saca la lista mas votada
const primas = ELEC.map((id) => {
  const r = legDe(id).res[0];
  return r[1] / 3.5 / (r[2] ?? 1);
});
const primaSiempre = Math.min(...primas) > 1;

/* ---------- 4. Participacion ---------- */
const PART = ELEC.filter((id) => TURNOUT[id]).map((id) => {
  const [censo, votantes] = TURNOUT[id] as [number, number];
  return {id, censo, votantes, r: (votantes / censo) * 100};
});
const partOrden = [...PART].sort((a, b) => a.r - b.r);
const pMin = partOrden[0], pMax = partOrden.at(-1)!, tresBajas = partOrden.slice(0, 3).sort((a, b) => ELEC.indexOf(a.id) - ELEC.indexOf(b.id));
const pPrimera = PART[0], pUltima = PART.at(-1)!;
const pRecord = PART.reduce((a, b) => (b.votantes > a.votantes ? b : a));
const anioUlt = yr(legDe(pUltima.id).a);
/** Las tres con menos participacion son 2016, nov 2019 y 2023: dos repeticiones y una en julio */
const tresBajasHoy = tresBajas.map((x) => x.id).join() === '2016,2019N,2023';
const abstUlt = 100 - pUltima.r;
// De 9 adultos en una comida familiar, cuantos no votaron en la ultima
const noVotan9 = Math.round((abstUlt * 9) / 100);

/* ---------- 5. Bipartidismo ---------- */
const BIP = ELEC.map((id) => {
  const r = legDe(id).res.filter((x) => BIG.includes(x[0]));
  const dos = [...legDe(id).res].filter((x) => x[0] !== 'OT').sort((a, b) => (b[2] ?? 0) - (a[2] ?? 0)).slice(0, 2).every((x) => BIG.includes(x[0]));
  return {id, voto: r.reduce((a, x) => a + (x[2] ?? 0), 0), esc: r.reduce((a, x) => a + x[1], 0), dos};
});
const bipMax = BIP.reduce((a, b) => (b.voto > a.voto ? b : a)), bipMin = BIP.reduce((a, b) => (b.voto < a.voto ? b : a)), bipUlt = BIP.at(-1)!;
const anioBipUlt = yr(legDe(bipUlt.id).a);
const bipSube = bipUlt.id !== bipMin.id && bipUlt.voto > bipMin.voto;
const ultimaAbs = [...LEGS].reverse().find((l) => /absoluta/.test(l.form))!;
// Primera eleccion sin mayoria absoluta tras la ultima que la tuvo
const sinAbsDesde = yr(LEGS[LEGS.indexOf(ultimaAbs) + 1].a);
const fallidas = LEGS.filter((l) => l.failed);
const coaliciones = LEGS.filter((l) => /coalici/.test(l.form));
// «Desde 2020 gobiernan dos partidos juntos»: solo mientras el ultimo Gobierno siga siendo de coalicion
const sigueCoalicion = /coalici/.test(LEGS.filter((l) => !l.failed).at(-1)!.form);
/** Estimacion del CIS para la proxima eleccion (null si ya no hay eleccion pendiente o no hay dato) */
const cis = (k: string) => (PROXIMA ? partido(k).elections.find((e) => e.e === PROXIMA)?.cis ?? null : null);
const cisBig = cis('PP') != null && cis('PSOE') != null ? cis('PP')! + cis('PSOE')! : null;

/* ---------- 6. Partidos nuevos ---------- */
function trayectoria(k: string) {
  const els = partido(k).elections.filter((e) => ELEC.includes(e.e));
  const max = els.reduce((a, e) => ((e.seats ?? 0) > (a.seats ?? 0) ? e : a), els[0]);
  return {max: max.seats ?? 0, maxE: max.e, en2023: els.find((e) => e.e === '2023')};
}
const NUEVOS = ['CDS', 'UPYD', 'CS', 'PODEMOS', 'VOX'].map((k) => ({k, ...trayectoria(k)}));
const pnvSiempre = ELEC.every((id) => (escanosDe('PNV', id) ?? 0) > 0);
/** Cuantas elecciones seguidas, contando desde la ultima, lleva un partido con diputados */
const seguidas = (k: string) => {
  let n = 0;
  for (const id of [...ELEC].reverse()) {
    if (!(escanosDe(k, id) ?? 0)) break;
    n++;
  }
  return n;
};
const NUM = ['', '', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const voxSeguidas = seguidas('VOX');

/* ---------- 7. Nacionalistas y regionalistas ---------- */
const GOB_ESC = LEGS.filter((l) => !l.failed).map((l) => ({
  l,
  gob: l.res.filter((x) => l.mandato.includes(x[0])).reduce((a, x) => a + x[1], 0),
  reg: l.res.filter((x) => REG.includes(x[0])).reduce((a, x) => a + x[1], 0),
}));
const conMayoria = GOB_ESC.filter((g) => /absoluta/.test(g.l.form));
const conApoyos = LEGS.filter((l) => l.apoyos);
function areaAutonomias(keys: string[]) {
  let a = 0, n = 0;
  keys.forEach((k) => partido(k).elections.forEach((e) => (e.items || []).forEach((i) => (n++, i.area === 'Autonomías' && a++))));
  return (a / n) * 100;
}
const autReg = areaAutonomias(REG_FICHAS), autGrandes = areaAutonomias(['PP', 'PSOE']);
const r23 = (p: string) => res('2023', p).esc;

/** Boton en el texto: elige un partido arriba y baja hasta su ficha */
function VerPartido({k, elegir, children}: {k: string; elegir: (k: string) => void; children?: ReactNode}) {
  const ir = () => {
    elegir(k);
    requestAnimationFrame(() => document.getElementById('par-ficha')?.scrollIntoView({behavior: 'smooth', block: 'start'}));
  };
  return (
    <button
      type="button"
      onClick={ir}
      style={{appearance: 'none', background: 'none', border: 0, padding: 0, font: 'inherit', fontWeight: 600, color: 'var(--ink)', textDecoration: 'underline', cursor: 'pointer'}}
    >
      {children ?? partido(k).n} ↗
    </button>
  );
}

export default function CuestionesPartidos({elegir}: {elegir: (k: string) => void}) {
  const V = ({k, children}: {k: string; children?: ReactNode}) => <VerPartido k={k} elegir={elegir}>{children}</VerPartido>;
  const cs = res('2019N', 'Cs'), erc = res('2019N', 'ERC'), iu = res('2008', 'IU'), pnv = res('2008', 'PNV');
  const upyd = res('2011', 'UPyD'), vox = res('2019A', 'Vox'), pod = res('2015', 'Podemos'), pp23 = res('2023', 'PP');
  const nv = Object.fromEntries(NUEVOS.map((x) => [x.k, x]));
  const g93 = GOB_ESC.find((g) => g.l.id === '1993')!, ciu93 = res('1993', 'CiU').esc;
  const enf = fallidas.map((l) => l.enf?.dias).filter(Boolean) as number[];
  const noVotaron = pUltima.censo - pUltima.votantes;

  return (
    <Cuestiones
      intro={
        <>
          Lo que se oye en la calle, en el bar o en el grupo de WhatsApp sobre los partidos y las elecciones, contestado con datos y en cristiano.
          Pulsa una pregunta: verás la respuesta corta, lo bueno y lo malo, y las gráficas para comprobarlo tú. Las cifras exactas están en
          cada gráfica y en su (i).
        </>
      }
    >
      {/* 1 */}
      <Cuestion
        pregunta="¿Los partidos cumplen lo que prometen?"
        veredicto="En buena parte"
        tono="matiz"
        conclusion={
          <>
            Más de lo que se suele pensar. De cada 10 promesas que se pueden comprobar, los Gobiernos sacan adelante unas {de10(tasa(GOBS))}{' '}
            (las hechas a medias cuentan como media). El que menos, {peor.pres} en {peor.lab.split(' · ')[0]}, en plena crisis: más o menos la
            mitad. El que más, {mejor.pres} en {mejor.lab.split(' · ')[0]}: {de10(mejor.r)} de cada 10. Pero hay trampa: solo se pueden comprobar las
            promesas concretas («subiremos el salario mínimo»), no las vagas («mejoraremos la sanidad»). Y solo puede cumplir quien gobierna.
          </>
        }
        positivo={[
          <>Hasta el Gobierno que menos cumplió sacó adelante casi una de cada dos promesas.</>,
          <>
            Quien gobierna sin depender de nadie (<T k="mayoria-absoluta">mayoría absoluta</T>) cumple más: unas {de10(porTipo('abs'))} de cada 10, frente a unas{' '}
            {de10(porTipo('min'))} cuando necesita a otros partidos.
          </>,
          <>No hace falta fiarse de nadie: cada promesa enlaza a la ley del BOE o al dato oficial, en la pestaña Global.</>,
        ]}
        negativo={[
          <>
            Algunas de las decisiones más gordas no estaban en ningún programa, así que nadie las votó: apoyar la guerra de Irak (2003), cambiar la
            Constitución para que pagar la deuda vaya primero (2011) o la <T k="amnistia">amnistía</T> (2024).
          </>,
          <>Cuando el Gobierno necesita a otros, muchas promesas se quedan en el cajón: en la última <T k="legislatura">legislatura</T>, {nPromSinAprobar} leyes prometidas llegaron al Congreso y no se aprobaron a tiempo.</>,
          <>
            No vale para decir «el PP cumple más que el PSOE»: el PP ha gobernado más veces con la mesa para él solo, y el PSOE casi siempre
            necesitando a otros ({sinMayoria('PSOE')} de sus {nGob('PSOE').length} etapas).
          </>,
        ]}
        graficas={[{id: 'par-escanos', lab: 'Escaños y propuestas de cada elección'}]}
      >
        <Balance dentro />
      </Cuestion>

      {/* 2 */}
      <Cuestion
        pregunta="¿PP y PSOE son lo mismo?"
        veredicto="No en lo que proponen"
        tono="falso"
        conclusion={
          <>
            No. Cada uno tira hacia un lado: el <V k="PP" /> casi siempre promete bajar el <T k="irpf">IRPF</T> (lo que te quitan de la nómina; en {veces('PP', 'bajar_irpf')}{' '}
            de sus {conProp('PP')} programas) y el <V k="PSOE" />, subir el <T k="salario-minimo">salario mínimo</T> (en {veces('PSOE', 'smi')} de {conProp('PSOE')}). Coinciden en
            {comunes * 2 < Math.min(Object.keys(T_PP).length, Object.keys(T_PSOE).length) ? ' menos de la mitad' : ' parte'} de los temas, y a veces
            proponen justo lo contrario. En lo que más se parecen es en otra cosa: los dos, al gobernar, han hecho cosas que no prometieron.
          </>
        }
        positivo={[
          <>Votar a uno u otro cambia cosas que notas en casa: lo que te retienen de la nómina, el salario mínimo, la ley del colegio de tus hijos.</>,
          <>En lo gordo se han puesto de acuerdo, y eso da estabilidad: entrar en el euro, el <T k="pacto-de-toledo">Pacto de Toledo</T> para las pensiones o, en 2023, <T k="aval">avales</T> para que los jóvenes puedan comprar piso.</>,
        ]}
        negativo={[
          <>Como proponen lo contrario, cada Gobierno deshace lo del anterior: los dos han prometido cambiar la ley educativa del otro, y el PSOE prometió tres veces (2015, 2016 y 2019) cambiar la <T k="reforma-laboral">reforma laboral</T> del PP.</>,
          <>Los dos han tomado decisiones importantes que no estaban en su programa (mira la pregunta anterior).</>,
        ]}
        graficas={[
          {id: 'par-elegir', lab: 'Elegir partido'},
          {id: 'par-escanos', lab: 'Escaños y propuestas de cada elección'},
        ]}
      />

      {/* 3 */}
      <Cuestion
        pregunta="¿Votar a un partido pequeño es tirar el voto?"
        veredicto="Depende de dónde"
        tono="matiz"
        conclusion={
          <>
            Depende de dónde vivas y de dónde estén sus votantes. Los diputados no se reparten con el total de España, sino provincia a provincia: en
            Soria se eligen 2 y en Madrid 37. Un partido con muchos votos en pocas provincias saca diputados; uno con un poco en todas partes, casi
            ninguno. En 2008, IU tuvo tres veces más votos que el PNV y sacó un tercio de sus diputados ({iu.esc} frente a {pnv.esc}).
          </>
        }
        positivo={[
          <>Si un partido nuevo convence a 1 de cada 10 votantes, entra con fuerza: Podemos sacó {pod.esc} diputados en 2015 y Vox {vox.esc} en abril de 2019.</>,
          <>Si tu partido es fuerte en tu provincia, tu voto cuenta casi igual que el de cualquiera: ERC sacó {erc.esc} diputados con menos de 4 de cada 100 votos (noviembre de 2019).</>,
          <>Unos pocos diputados pueden decidir quién gobierna (mira «¿Los nacionalistas deciden los Gobiernos?»).</>,
        ]}
        negativo={[
          <>
            Si votas a un partido pequeño que no es fuerte en tu provincia, lo más probable es que tu voto no saque a nadie: PACMA tuvo más de 1 de
            cada 100 votos de España en 2016 y ningún diputado; UPyD ({fecha('2011')}) y Ciudadanos ({fecha('2019N')}) sacaron muchos menos diputados
            de los que les tocarían por votos.
          </>,
          primaSiempre ? (
            <>
              El que gana siempre sale premiado: en 2023 el PP tuvo 1 de cada 3 votos y casi 4 de cada 10 diputados. Pasa en todas las elecciones
              desde 1986.
            </>
          ) : (
            <>El que gana suele salir premiado: en 2023 el PP tuvo 1 de cada 3 votos y casi 4 de cada 10 diputados.</>
          ),
        ]}
        graficas={[{id: 'par-escanos', lab: 'Escaños del partido elegido'}]}
      >
        <Barras
          title="Votos frente a diputados"
          sub="De cada 100 votos y de cada 100 diputados, cuántos se llevó"
          series={[
            {lab: '% de votos', c: '#868E96'},
            {lab: '% de diputados', c: TEAL},
          ]}
          filas={[
            ...EJEMPLOS.map(([id, p]) => {
              const r = res(id, p);
              return {lab: `${PARTY[p].n} · ${fecha(id)}`, vals: [r.voto, (r.esc / 350) * 100]};
            }),
            {lab: `PACMA · ${fecha('2016')}`, vals: [pacma2016.vote ?? 0, 0]},
          ]}
          f={(v) => pct(v)}
          note={
            <p>
              % de <T k="voto-valido">votos válidos</T> de cada lista; % de diputados = escaños entre 350 (cálculo propio). En 2008, IU: {pct(iu.voto)} y{' '}
              {iu.esc} escaños; PNV: {pct(pnv.voto)} y {pnv.esc}. UPyD 2011: {pct(upyd.voto)} y {upyd.esc}. Ciudadanos, noviembre de 2019: {pct(cs.voto)} y{' '}
              {cs.esc}. PACMA 2016: {pct(pacma2016.vote ?? 0, 2)} y ninguno. PP 2023: {pct(pp23.voto)} y {pp23.esc}. La lista más votada saca entre{' '}
              {fmt(Math.min(...primas), 2)} y {fmt(Math.max(...primas), 2)} veces su % de votos en escaños desde 1986. El reparto es provincia a provincia
              (52 <T k="circunscripcion">circunscripciones</T>, Ceuta y Melilla incluidas) con la <T k="ley-dhondt">ley D'Hondt</T>; para entrar hace
              falta al menos el 3 % de los votos válidos de la provincia.
            </p>
          }
          src={FUENTE_ELEC}
        />
      </Cuestion>

      {/* 4 */}
      <Cuestion
        pregunta="¿Cada vez vota menos gente?"
        veredicto="No siempre, pero baja"
        tono="matiz"
        conclusion={
          <>
            Va a rachas: suelen votar unas 7 de cada 10 personas que pueden, a veces algo más y a veces algo menos.{' '}
            {tresBajasHoy ? (
              <>
                Lo que sí es verdad es que las tres elecciones con menos gente votando son las últimas: {tresBajas.map((x) => fecha(x.id)).join(', ')}.
                Dos de ellas fueron <T k="repeticion-electoral">repeticiones</T>, porque nadie consiguió formar Gobierno, y la de 2023 fue en pleno julio.
              </>
            ) : (
              <>Las tres elecciones con menos gente votando han sido: {tresBajas.map((x) => fecha(x.id)).join(', ')}.</>
            )}
          </>
        }
        positivo={[
          pMin.r >= 200 / 3 ? (
            <>Nunca ha votado menos de 2 de cada 3 personas con derecho a voto.</>
          ) : pMin.r >= 63 ? (
            <>Incluso en la que menos ({fecha(pMin.id)}) votaron casi 2 de cada 3 personas con derecho a voto.</>
          ) : (
            <>Nunca ha votado menos de {fmt(Math.floor(pMin.r / 10), 0)} de cada 10 personas con derecho a voto.</>
          ),
          <>La gente vuelve cuando quiere: tras el bajón de 2016, en {fecha(pRecord.id)} votaron más personas que nunca ({mill(pRecord.votantes)}).</>,
          <>Como hay más población, hoy vota más gente que en 1986, aunque sea un porcentaje parecido.</>,
        ]}
        negativo={[
          <>
            En {anioUlt} {noVotan9 === 3 ? 'se quedó en casa una de cada tres' : `se quedaron en casa ${fmt(Math.round(abstUlt), 0)} de cada 100`}{' '}
            personas que podían votar: en una comida familiar de 9 adultos, {noVotan9} no votaron.
          </>,
          <>Los que no votan dejan que decidan los demás: todos los diputados se reparten igual (mira la pregunta siguiente).</>,
        ]}
      >
        <Barras
          title="Participación en las elecciones generales"
          sub="De cada 100 personas con derecho a voto, cuántas votaron"
          series={[{lab: 'Participación', c: TEAL}]}
          filas={PART.map((x) => ({lab: fecha(x.id), vals: [x.r]}))}
          f={(v) => pct(v)}
          max={100}
          note={
            <p>
              Votantes entre <T k="censo-electoral">censo electoral</T>, que incluye a los españoles que viven en el extranjero. Mínimo: {pct(pMin.r)} (
              {fecha(pMin.id)}); máximo: {pct(pMax.r)} ({fecha(pMax.id)}). Votantes: {mill(pPrimera.votantes)} en 1986 y {mill(pUltima.votantes)} en{' '}
              {anioUlt}; no votaron {mill(noVotaron)}. Las <T k="repeticion-electoral">repeticiones electorales</T> fueron en junio de 2016 (tras las de
              diciembre de 2015) y noviembre de 2019 (tras las de abril).
            </p>
          }
          src={L('Junta Electoral Central, resultados en el BOE', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-18907')}
        />
      </Cuestion>

      {/* 5: no votar, en blanco, nulo */}
      <VotoBlanco />

      {/* 6 */}
      <Cuestion
        pregunta="¿Se acabó el bipartidismo?"
        veredicto="A medias"
        tono="matiz"
        conclusion={
          <>
            A medias. Durante 30 años PP y PSOE se lo repartían casi todo: en {fecha(bipMax.id)}, de cada 10 votos, {de10(bipMax.voto)} eran para uno
            de los dos, y se quedaban con {de10(bipMax.esc / 3.5)} de cada 10 diputados. En {fecha(bipMin.id)} bajaron a menos de la mitad de los votos
            {bipSube
              ? `, y en ${anioBipUlt} volvieron a subir (unos ${de10(bipUlt.voto)} de cada 10)`
              : bipUlt.id !== bipMin.id ? `; en ${anioBipUlt}, unos ${de10(bipUlt.voto)} de cada 10` : ''}
            .{BIP.every((x) => x.dos) ? ' Siempre han sido los dos más votados. ' : ' '}
            Lo que sí se acabó es gobernar solo: desde {sinAbsDesde} nadie consigue la mitad más uno de los diputados
            {sigueCoalicion ? ', y desde 2020 gobiernan dos partidos juntos' : ''}.
          </>
        }
        positivo={[
          <>Más gente ve en el Congreso a alguien que piensa como ella: en {fecha(bipMin.id)} más de la mitad votó a otros partidos.</>,
          <>Nadie tiene las manos libres: el Gobierno tiene que pactar cada ley con otros.</>,
        ]}
        negativo={[
          <>
            Formar Gobierno se ha vuelto un lío: dos veces hubo que repetir las elecciones, y el Gobierno estuvo casi un año (
            {Math.max(...enf)} días) «<T k="en-funciones">en funciones</T>», es decir, sin poder aprobar presupuestos ni leyes nuevas.
          </>,
          <>Sin mayoría, aprobar unos presupuestos o una ley exige convencer a varios partidos a la vez, y a veces no sale.</>,
        ]}
        graficas={[{id: 'par-escanos', lab: 'Escaños del partido elegido'}]}
      >
        <Barras
          title="PP y PSOE juntos"
          sub="De cada 100 votos y de cada 100 diputados, cuántos sumaban. En 1986, AP en lugar del PP"
          series={[
            {lab: '% de votos', c: '#868E96'},
            {lab: '% de diputados', c: TEAL},
          ]}
          filas={BIP.map((x) => ({lab: fecha(x.id), vals: [x.voto, (x.esc / 350) * 100]}))}
          f={(v) => pct(v)}
          max={100}
          note={
            <p>
              Suma de los dos partidos; % de diputados = escaños entre 350 (cálculo propio). Máximo: {pct(bipMax.voto)} y {bipMax.esc} escaños (
              {fecha(bipMax.id)}); mínimo: {pct(bipMin.voto)} y {bipMin.esc} ({fecha(bipMin.id)}); {anioBipUlt}: {pct(bipUlt.voto)} y {bipUlt.esc}. Sin{' '}
              <T k="investidura">investidura</T> y con repetición: {fallidas.map((l) => yr(l.a)).join(' y ')}, con Gobiernos en funciones de{' '}
              {enf.join(' y ')} días. Gobiernos de <T k="coalicion">coalición</T>: {coaliciones.length}.
              {cisBig != null && (
                <>
                  {' '}
                  El <T k="cis">CIS</T> de {CIS_CUANDO.largo} les da juntos un {pct(cisBig)} de estimación de voto.
                </>
              )}
            </p>
          }
          src={FUENTE_ELEC}
        />
      </Cuestion>

      {/* 7 */}
      <Cuestion
        pregunta="¿Los partidos nuevos duran poco?"
        veredicto="Muchos, no todos"
        tono="matiz"
        conclusion={
          <>
            Muchos suben como la espuma y se desinflan igual de rápido. El <V k="CDS" /> llegó a {nv.CDS.max} diputados y en 1993 se quedó sin ninguno;{' '}
            <V k="CS">Ciudadanos</V> pasó de {nv.CS.max} a {escanosDe('CS', '2019N')} en solo siete meses (2019) y en 2023 ni se presentó; <V k="UPYD" />{' '}
            desapareció del Congreso en 2015. Otros aguantan: <V k="VOX" />{' '}
            {voxSeguidas >= 2 ? `lleva ${NUM[voxSeguidas] ?? voxSeguidas} elecciones seguidas con diputados` : 'ha tenido diputados'}, y{' '}
            <V k="PODEMOS" /> sigue, aunque cada pocos años con otro nombre y dentro de otra <T k="coalicion-electoral">coalición</T>.
          </>
        }
        positivo={[
          <>Un partido nuevo puede entrar con fuerza y cambiarlo todo: en 2015, Podemos y Ciudadanos metieron entre los dos más de 100 diputados en su primera vez.</>,
          <>Si un partido no convence, la gente lo deja caer: nadie tiene el sitio asegurado.</>,
        ]}
        negativo={[
          <>Las caídas son brutales: Ciudadanos perdió más de 8 de cada 10 diputados en siete meses.</>,
          <>Tanto cambio de nombre y de coalición (Unidos Podemos, Unidas Podemos, Sumar…) hace difícil saber a quién estás votando.</>,
          <>Mientras, los de siempre siguen ahí: el PNV {pnvSiempre ? 'ha sacado diputados en todas las elecciones' : 'casi siempre ha sacado diputados'} desde 1986.</>,
        ]}
        graficas={[
          {id: 'par-elegir', lab: 'Elegir partido'},
          {id: 'par-escanos', lab: 'Escaños del partido elegido'},
        ]}
      >
        <Barras
          title="Escaños de algunos partidos nuevos"
          sub="Su mejor resultado y lo que tenían en 2023"
          series={[
            {lab: 'Mejor resultado', c: '#868E96'},
            {lab: 'Elecciones de 2023', c: TEAL},
          ]}
          filas={NUEVOS.map((x) => ({
            lab: `${x.k === 'PODEMOS' ? 'Unidos Podemos' : partido(x.k).n} (${fecha(x.maxE)})${x.k === 'PODEMOS' ? ' · en 2023, dentro de Sumar' : x.k === 'CS' ? ' · no se presentó en 2023' : ''}`,
            vals: [x.max, x.k === 'PODEMOS' ? null : x.en2023?.seats ?? 0],
          }))}
          f={(v) => fmt(v, 0)}
          note={
            <p>
              Mejor resultado en escaños en unas generales (entre paréntesis, cuándo). En 2015, Podemos y sus <T k="confluencia">confluencias</T>{' '}
              sacaron {pod.esc} y Ciudadanos {res('2015', 'Cs').esc}. Vox: 0 en 2015 y 2016; {escanosDe('VOX', '2019A')}, {escanosDe('VOX', '2019N')} y{' '}
              {escanosDe('VOX', '2023')} después. Ciudadanos perdió {nv.CS.max - (escanosDe('CS', '2019N') ?? 0)} de sus {nv.CS.max} escaños entre abril y
              noviembre de 2019. Podemos: su mejor resultado es el de Unidos Podemos (con IU y confluencias) en 2016; en 2023 fue dentro de la coalición
              Sumar ({r23('Sumar')} escaños de toda la coalición). CDS y UPyD ya no existían en 2023.
            </p>
          }
          src={FUENTE_ELEC}
        />
      </Cuestion>

      {/* 8 */}
      <Cuestion
        pregunta="¿Los nacionalistas deciden los Gobiernos?"
        veredicto="Cuando no hay mayoría"
        tono="matiz"
        conclusion={
          <>
            Cuando nadie gana con <T k="mayoria-absoluta">la mitad más uno</T> (176 de 350 diputados), el Gobierno necesita que otros le presten sus votos, y muchas veces son
            partidos catalanes, vascos o canarios. Es como una comunidad de vecinos en la que nadie tiene mayoría: el que tiene los dos votos que
            faltan pide algo a cambio. Desde 1986 solo ha habido {conMayoria.length} Gobiernos con mayoría propia; los demás han necesitado ayuda. En
            2023, ni la izquierda (PSOE y Sumar, {r23('PSOE') + r23('Sumar')}) ni la derecha (PP y Vox, {r23('PP') + r23('Vox')}) llegaban a 176 sin ellos.
          </>
        }
        positivo={[
          <>Han pactado con los dos grandes: con el PSOE ({conApoyos.filter((l) => l.gov === 'PSOE').map((l) => yr(l.a)).join(', ')}) y con el PP ({conApoyos.filter((l) => l.gov === 'PP').map((l) => yr(l.a)).join(', ')}). No es cosa de un solo bando.</>,
          <>Obligan a negociar, y los votantes de esas comunidades ven atendido lo suyo.</>,
        ]}
        negativo={[
          <>
            Con muy pocos diputados consiguen mucho: en 1993 a Felipe González le faltaban {176 - g93.gob} diputados y CiU tenía{' '}
            {ciu93 === 176 - g93.gob ? 'justo esos' : ciu93}.
          </>,
          <>
            Piden sobre todo para su comunidad: unas {de10(autReg)} de cada 10 de sus propuestas son de autonomías (dinero, <T k="competencias">competencias</T>…), frente a
            menos de 1 de cada 10 en PP y PSOE. Y si no vives allí, no los puedes votar ni castigar.
          </>,
        ]}
        graficas={[
          {id: 'par-elegir', lab: 'Elegir partido'},
          {id: 'par-escanos', lab: 'Escaños y propuestas de cada elección'},
        ]}
      >
        <Barras
          title="Diputados del Gobierno y de los nacionalistas"
          sub="Tras cada elección. Para gobernar solo hacen falta 176"
          series={[
            {lab: 'Partido o coalición del Gobierno', c: '#495057'},
            {lab: 'Nacionalistas y regionalistas', c: TEAL},
          ]}
          filas={GOB_ESC.map((g) => ({lab: `${yr(g.l.a)} · ${g.l.mandato.map((m) => PARTY[m].n).join(' + ')}`, vals: [g.gob, g.reg]}))}
          f={(v) => fmt(v, 0)}
          max={200}
          note={
            <p>
              <T k="mayoria-absoluta">Mayoría absoluta</T> en {conMayoria.map((g) => yr(g.l.a)).join(', ')}. Apoyos:{' '}
              {conApoyos.map((l) => `${l.apoyos} con el ${l.gov} en ${yr(l.a)}`).join('; ')}. Nacionalistas y regionalistas: CiU, PNV, HB, CC, ERC, BNG,
              Amaiur, EH Bildu, DL, CDC y Junts; no incluye los partidos pequeños que los resultados agrupan como «otros». De sus propuestas recogidas
              aquí, el {pct(autReg, 0)} trata de autonomías, frente al {pct(autGrandes, 0)} en PP y PSOE (cálculo propio). En 2016, el Gobierno del PP; en
              2018 pasó al PSOE tras la <T k="mocion-de-censura">moción de censura</T>.
            </p>
          }
          src={FUENTE_ELEC}
        />
      </Cuestion>
    </Cuestiones>
  );
}
