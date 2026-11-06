import {useEffect, useState} from 'react';
import {DONDE_NACIERON as D, POB_INMIG as P} from '../../datos';
import {fmt} from '../../lib/formato';
import Info from '../../componentes/Info';
import Mini from '../../componentes/graficas/Mini';
import {L} from '../../componentes/enlace';
import {COL_ES, COL_EX} from './colores';
import {T} from '../../../comun/Glosario';
import {claves, mesAnio, ultimo} from './ultimo';

/*
  Cabecera de la pestaña: ¿donde nacieron? (barra por pais, como «¿Hay casas
  para todos?» en Vivienda, con su resumen y sus puntos) y la grafica de la
  poblacion nacida fuera desde 1981, que va en la rejilla de la pestaña.
*/
const ECP = 'https://www.ine.es/dyngs/Prensa/ECP2T26.htm';
const pctTxt = (v: number) => fmt(v, 1) + ' %';
type Pais = {pais: string; n: number; pctEspanoles: number};

// Colores fijos por pais (el mismo pais, el mismo color en todos los años)
const COLORES_PAIS = ['#3B5BDB', '#0B7A75', '#E8590C', '#AE3EC9', '#2F9E44', '#F59F00', '#1C7ED6', '#C2255C', '#5C940D', '#7048E8', '#D9480F', '#0C8599', '#862E9C', '#E67700', '#495057'];

/** Años con dato completo (total, nacidos fuera y cada pais): la linea de tiempo llega sola al ultimo */
const anios: number[] = claves(D.nacidosFuera)
  .map(Number)
  .filter((a) => D.totalPoblacion[a] != null && D.paises.every((p: string) => D.porPais[p][a] != null));

/** «1 de julio de 2026» a partir de '2026-07-01' */
const diaMesAnio = (f: string) => `${+f.slice(8, 10)} de ${mesAnio(f)}`;

/** ¿Donde nacieron? Barra por pais de nacimiento con linea de tiempo desde 2002 hasta el ultimo año publicado */
export function DondeNacieron() {
  const u = P.ultimoDato, pp = P.porPais;
  const anioPP = pp.fecha.slice(0, 4);
  const ultimo = anios[anios.length - 1];
  const [anio, setAnio] = useState(ultimo);
  const [play, setPlay] = useState(false);

  // Reproducir: avanza un año cada 0,8 s y se para al final
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
  const fuera: number = D.nacidosFuera[y];
  const paises: {pais: string; n: number; c: string}[] = D.paises.map((p: string, i: number) => ({pais: p, n: D.porPais[p][y], c: COLORES_PAIS[i]}));
  const resto = fuera - paises.reduce((t, p) => t + p.n, 0);
  const trozos = [...paises, {pais: 'Resto', n: resto, c: '#ADB5BD'}];
  const ordenados = [...paises].sort((x, z) => z.n - x.n);
  const pct = (n: number) => (n / fuera) * 100;
  const top3 = ordenados.slice(0, 3);
  const top3De10 = Math.round(top3.reduce((t, p) => t + pct(p.n), 0) / 10);
  const pctPob = (fuera / D.totalPoblacion[y]) * 100;
  const espPct = P.pctNacidosFueraEspanoles[y] as number | undefined;

  const espDe = (nombre: string) => [...pp.destacados, ...pp.paises].find((d: Pais) => d.pais === nombre)!.pctEspanoles;
  const marruecos = pp.paises[0] as Pais;
  return (
    <div id="inm-paises" className="box" style={{marginTop: 12}}>
      <h3>
        ¿Dónde nacieron?{' '}
        <Info>
          <p>
            Personas que viven en España y nacieron en otro país, según su país de nacimiento, a 1 de enero de cada año desde {anios[0]}. Se muestran
            los {D.paises.length} países que alguna vez han estado entre los diez primeros; el resto va en gris. El desglose por país de {ultimo + 1}{' '}
            aún no está publicado (sale a finales de año); los totales de {mesAnio(u.fecha)} son provisionales. Antes de 2002 el{' '}
            <T k="ine">INE</T> no tiene una serie por país comparable.
          </p>
          <p>
            «Nacido fuera» no es lo mismo que «extranjero»: muchos ya tienen la nacionalidad española, porque se han{' '}
            <T k="nacionalizacion">nacionalizado</T> o porque son hijos
            y nietos de españoles que emigraron.
          </p>
          <p className="srcl">
            Fuentes: {L('INE, Estadística Continua de Población por país de nacimiento (tabla 56937)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=56937')},{' '}
            {L('nacionalidad de los nacidos fuera (tabla 79273)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=79273')},{' '}
            {L(`Censo anual de población ${anioPP} (tabla 68525)`, 'https://www.ine.es/jaxiT3/Tabla.htm?t=68525')} y{' '}
            {L('nota de 1 de julio de 2026', ECP)}.
          </p>
        </Info>
      </h3>
      <p className="note">
        En {anio} vivían en España <b>{fmt(fuera / 1e6, 2)} millones de personas nacidas en otro país</b>, el {pctTxt(pctPob)} de la población
        {espPct != null && (
          <>
            ; el <b>{fmt(espPct, 0)} %</b> de ellas ya tenía la nacionalidad española
          </>
        )}
        . Los países más comunes: {top3.map((p) => `${p.pais} (${pctTxt(pct(p.n))})`).join(', ')}. Pulsa ▶ para ver cómo cambia el reparto
        año a año.
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
        {trozos.map((p) => (
          <span key={p.pais} style={{flex: p.n, background: p.c}} title={`${p.pais}: ${fmt(p.n, 0)} (${pctTxt(pct(p.n))})`} />
        ))}
      </div>
      <div className="statlegend">
        {trozos.map((p) => (
          <span key={p.pais}>
            <i className="sw" style={{background: p.c}} />
            {p.pais}: <b className="num">{pctTxt(pct(p.n))}</b>
          </span>
        ))}
      </div>
      {espPct != null && (
        <>
          <p className="note" style={{marginTop: 12}}>De todos los nacidos fuera, cuántos tenían ya la nacionalidad española ({anio}):</p>
          <div className="stack tl-barra" style={{height: 18, marginTop: 6}}>
            <span style={{flex: espPct, background: COL_ES}} />
            <span style={{flex: 100 - espPct, background: COL_EX}} />
          </div>
          <div className="statlegend">
            <span>
              <i className="sw" style={{background: COL_ES}} />
              Ya españoles: <b className="num">{pctTxt(espPct)}</b>
            </span>
            <span>
              <i className="sw" style={{background: COL_EX}} />
              Extranjeros: <b className="num">{pctTxt(100 - espPct)}</b>
            </span>
          </div>
        </>
      )}

      <dl className="cuenta">
        <div>
          <dt>Un país de mezcla</dt>
          <dd>
            No todos los que vienen de fuera son de {top3[0].pais}, {top3[1].pais} o {top3[2].pais}: esos tres países juntos solo son {top3De10} de
            cada 10 nacidos fuera ({anio}). El resto nació en otros muchos países de Europa, América, África y Asia, y el reparto cambia con los años.
            España es un país muy diverso y una cultura de mezcla.
          </dd>
        </div>
        <div className="ok">
          <dt>¿Nacer fuera es ser extranjero?</dt>
          <dd>
            Tampoco: <b>uno de cada tres ya es español</b> ({anioPP}). En algunos países son mayoría, porque son hijos y nietos de emigrantes españoles: Suiza (
            {fmt(espDe('Suiza'), 0)} %), Ecuador ({fmt(espDe('Ecuador'), 0)} %), Cuba ({fmt(espDe('Cuba'), 0)} %) o Francia ({fmt(espDe('Francia'), 0)} %). Los
            nacidos en Rumanía ({fmt(espDe('Rumanía'), 0)} %) o el Reino Unido ({fmt(espDe('Reino Unido'), 0)} %) apenas <T k="nacionalizacion">se nacionalizan</T>: como europeos, no
            lo necesitan. Entre los nacidos en Marruecos, el {fmt(marruecos.pctEspanoles, 0)} %.
          </dd>
        </div>
        <div className="half">
          <dt>¿Ha cambiado mucho?</dt>
          <dd>
            Muchísimo y muy rápido: en 1981 los nacidos fuera eran el {pctTxt(P.nacidosFueraPctAntes['1981'])} (y 7 de cada 10 eran españoles), en 2002
            el {pctTxt(P.nacidosFueraPct['2002'])} y en {mesAnio(u.fecha)} el {pctTxt(u.nacidosFueraPct)} ({fmt(u.nacidosFuera / 1e6, 1)} millones, dato
            provisional). <b>Es uno de los mayores cambios de la España reciente</b>: mira «Población nacida fuera y extranjera» justo debajo.
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function GraficaPoblacion() {
  const u = P.ultimoDato;
  const [anioU] = ultimo(P.nacidosFueraPct);
  return (
    <Mini
      id="inm-poblacion"
      title="Población nacida fuera y extranjera"
      sub="% de la población que vive en España"
      series={[
        {lab: 'Nacidos fuera de España', c: COL_EX, data: P.nacidosFueraPct},
        {lab: 'Con nacionalidad extranjera', c: COL_ES, data: P.extranjerosPct},
        {lab: 'Nacidos fuera (censos y padrón)', c: COL_EX, dash: true, data: P.nacidosFueraPctAntes},
        {lab: 'Extranjeros (censos y padrón)', c: COL_ES, dash: true, data: P.extranjerosPctAntes},
      ]}
      f={pctTxt}
      x0={1979.5}
      yMin={0}
      note={
        <>
          <p>
            Dos formas de contar: <b>nacidos fuera</b> (dónde nació cada persona) y <b>extranjeros</b> (qué pasaporte tiene). La diferencia son los
            nacidos fuera que tienen nacionalidad española: los que se han nacionalizado y los hijos y nietos de emigrantes españoles nacidos en
            Francia, Suiza, Alemania, Venezuela, Argentina o Cuba.
          </p>
          <p>
            El gran salto llega entre 2000 y 2008 (de un {pctTxt(P.nacidosFueraPctAntes['2000'])} a un {pctTxt(P.nacidosFueraPct['2008'])} de nacidos
            fuera). Con la crisis baja hasta 2015 (muchos se marchan o se nacionalizan) y desde 2016 vuelve a subir. El {diaMesAnio(u.fecha)}:{' '}
            {fmt(u.nacidosFuera, 0)} nacidos fuera ({pctTxt(u.nacidosFueraPct)}) y {fmt(u.extranjeros, 0)} extranjeros ({pctTxt(u.extranjerosPct)}), de{' '}
            {fmt(u.total, 0)} habitantes. {fmt(u.nacidosEnEspanaExtranjeros, 0)} extranjeros nacieron en España.
          </p>
          <p>
            Discontinua: 1981 y 1991 salen de los <T k="censo">censos</T> (1 de marzo) y 1998–2001, del <T k="padron">padrón</T>, que contaba de más
            a los extranjeros (en 2002 daba un 6,2 % de nacidos fuera frente al {pctTxt(P.nacidosFueraPct['2002'])} de la serie actual). Desde 2002,
            Estadística Continua de Población a 1 de enero; {anioU} es provisional. Entre 1982 y 1997 no hay datos anuales comparables.
          </p>
        </>
      }
      src={
        <>
          {L('INE, Estadística Continua de Población (tabla 79273)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=79273')} y{' '}
          {L('nota de 1 de julio de 2026', ECP)}; {L('INE, padrón continuo 1998–2001', 'https://www.ine.es/jaxiT3/Tabla.htm?t=36784')}; Censos de{' '}
          {L('1981', 'https://www.ine.es/jaxi/files/_px/es/csv_bdsc/t20/e243/e01/a1981/l0/01010.csv_bdsc')} y{' '}
          {L('1991', 'https://www.ine.es/jaxi/files/_px/es/csv_bdsc/t20/e243/e01/a1991/l0/00011.csv_bdsc')}
        </>
      }
    />
  );
}
