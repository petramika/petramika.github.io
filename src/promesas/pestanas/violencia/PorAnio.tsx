import {POB_INMIG, VIOLENCIA as V} from '../../datos';
import {fmt} from '../../lib/formato';
import Mini from '../../componentes/graficas/Mini';
import {L} from '../../componentes/enlace';
import {COL, TIPOS, red, type Serie} from './TiposViolencia';

/*
  Graficas de la pestaña que siguen cada dato año a año: una linea por tipo de
  delito (o por grupo), desde el primer año con datos.
*/
type Sexo = 'hombres' | 'mujeres';
const pctF = (v: number) => fmt(v, 1) + ' %';
const enMilesF = (v: number) => fmt(Math.round(v * 1000), 0);
const INTERIOR = 'https://estadisticasdecriminalidad.ses.mir.es/';
const MACRO24 = 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/igualdad/Paginas/2025/031225-macroencuesta-violencia-genero.aspx';
const MACRO24_SEX = 'https://violenciagenero.igualdad.gob.es/wp-content/uploads/Capitulo-16.-VSx-fuera-pareja.pdf';
const MACRO19 = 'https://violenciagenero.igualdad.gob.es/wp-content/uploads/Principales_Resultados_Macroencuesta2019.pdf';

const ANIOS = Object.keys(V.tipos.lesiones.hombres).sort();
const A0 = ANIOS[0], A = ANIOS[ANIOS.length - 1];
const X0 = Number(A0) - 0.5;
const FALTAS = {x: 2015.5, lab: 'Fin de las faltas'};
const vict = (k: string, y: string, s?: Sexo): number => (s ? V.tipos[k][s][y] : V.tipos[k].hombres[y] + V.tipos[k].mujeres[y]);
const total = (y: string, s?: Sexo) => TIPOS.reduce((t, x) => t + vict(x.k, y, s), 0);
const sexual = (y: string, s?: Sexo) => vict('agresionSexual', y, s) + vict('conPenetracion', y, s);
/** Serie {año: valor} con una funcion del año, solo donde da un numero */
const serie = (anios: string[], f: (y: string) => number | null | undefined): Serie =>
  Object.fromEntries(anios.map((y) => [y, f(y)]).filter((p): p is [string, number] => p[1] != null && Number.isFinite(p[1])));
const enMiles = (s: Serie): Serie => Object.fromEntries(Object.entries(s).map(([y, v]) => [y, v / 1000]));

const DETENIDOS: {k: string; lab: string; c: string}[] = [
  {k: 'robosViolencia', lab: 'Robos con violencia', c: '#868E96'},
  {k: 'conPenetracion', lab: 'Agresión sexual con penetración', c: '#A61E4D'},
  {k: 'agresionSexual', lab: 'Agresión sexual sin penetración', c: '#E64980'},
  {k: 'malosTratos', lab: 'Malos tratos en la familia', c: '#F59F00'},
  {k: 'homicidios', lab: 'Homicidios y tentativas', c: '#212529'},
  {k: 'lesiones', lab: 'Lesiones', c: '#748FFC'},
];

/** ¿Contra quién? Parte de mujeres entre las víctimas de cada tipo */
export function ContraQuien() {
  const pctM = (k: string) => serie(ANIOS, (y) => (vict(k, y, 'mujeres') / vict(k, y)) * 100);
  const pctTotal = serie(ANIOS, (y) => (total(y, 'mujeres') / total(y)) * 100);
  return (
    <Mini
      id="vio-victimas-sexo"
      title="¿Contra quién? Parte de mujeres entre las víctimas"
      sub="% de mujeres entre las víctimas de cada tipo (el resto, hombres)"
      series={[
        ...TIPOS.filter((t) => t.k !== 'otrosPersonas').map((t) => ({lab: t.lab, c: t.c, data: pctM(t.k)})),
        {lab: 'Toda la violencia', c: '#212529', dash: true, data: pctTotal},
      ]}
      f={pctF}
      x0={X0}
      yMin={0}
      hitos={[FALTAS]}
      note={
        <>
          <p>
            Qué parte de las víctimas de cada tipo son mujeres; el resto son hombres, así que por encima del 50 % hay más mujeres y por debajo, más
            hombres. Las mujeres son la gran mayoría de las víctimas de malos tratos en la familia ({pctF((vict('malosTratos', A, 'mujeres') / vict('malosTratos', A)) * 100)} en{' '}
            {A}) y de agresiones sexuales; los hombres, de las lesiones, los robos y los homicidios. En toda la violencia registrada, las mujeres han pasado
            del {pctF(pctTotal[A0])} en {A0} al {pctF(pctTotal[A])} en {A}.
          </p>
          <p>Se deja fuera «otros contra las personas», que hasta 2015 incluía las faltas y luego casi desaparece.</p>
        </>
      }
      src={L('Ministerio del Interior, tabla 04001 (victimizaciones por sexo)', INTERIOR)}
    />
  );
}

const C = V.condenadosPorSexo, P = V.pareja;
const AUTORES: {k: string; lab: string; c: string}[] = [
  {k: 'sexuales', lab: 'Delitos sexuales', c: '#A61E4D'},
  {k: 'tratoDegradante', lab: 'Malos tratos habituales', c: '#F59F00'},
  {k: 'pareja', lab: 'Violencia en la pareja y la familia', c: '#E64980'},
  {k: 'homicidios', lab: 'Homicidios y asesinatos', c: '#212529'},
  {k: 'roboViolencia', lab: 'Robos con violencia', c: '#868E96'},
  {k: 'lesiones', lab: 'Lesiones', c: '#748FFC'},
  {k: 'todos', lab: 'Todos los delitos', c: '#1C3FAA'},
];
const condenados = (k: string, y: string): {h: number; m: number} | null => {
  if (k === 'pareja') {
    const g = P.condenadosGenero[y], dh = P.condenadosDomesticaHombres[y], dm = P.condenadosDomesticaMujeres[y];
    return g != null && dh != null && dm != null ? {h: g + dh, m: dm} : null;
  }
  if (k === 'homicidios') {
    const h1 = C.homicidio.hombres[y], h2 = C.asesinato.hombres[y], m1 = C.homicidio.mujeres[y], m2 = C.asesinato.mujeres[y];
    return h1 != null && h2 != null ? {h: h1 + h2, m: m1 + m2} : null;
  }
  const h = C[k]?.hombres[y], m = C[k]?.mujeres[y];
  return h != null && m != null ? {h, m} : null;
};
const ANIOS_COND = Object.keys(C.todos.hombres).sort();
export const pctHombres = (k: string, y: string) => {
  const c = condenados(k, y);
  return c ? (c.h / (c.h + c.m)) * 100 : null;
};

/** ¿Quién la comete? Parte de hombres entre los condenados */
export function QuienComete() {
  const aC = ANIOS_COND[ANIOS_COND.length - 1];
  const ph = (k: string) => fmt(pctHombres(k, aC) ?? 0, 0);
  return (
    <Mini
      id="vio-autores"
      title="¿Quién la comete? Parte de hombres entre los condenados"
      sub="% de hombres entre los condenados por cada delito (el resto, mujeres)"
      series={AUTORES.map((a) => ({lab: a.lab, c: a.c, dash: a.k === 'todos', data: serie(ANIOS_COND, (y) => pctHombres(a.k, y))}))}
      f={pctF}
      x0={Number(ANIOS_COND[0]) - 0.5}
      yMin={50}
      hitos={[{x: 2015.5, lab: 'Se cuentan los delitos leves'}]}
      note={
        <>
          <p>
            Delitos por los que alguien fue condenado en sentencia firme cada año, según el sexo del condenado. Los hombres son la mitad de la población,
            pero cometen casi toda la violencia, y apenas cambia en {ANIOS_COND.length} años: en {aC}, el {ph('sexuales')} % de los delitos sexuales, el{' '}
            {ph('homicidios')} % de los homicidios y asesinatos y el {ph('lesiones')} % de las lesiones. En todos los delitos, también los no violentos, el{' '}
            {ph('todos')} %.
          </p>
          <p>
            Antes de 2013 el INE no separa homicidios, malos tratos habituales ni robos con violencia, y la violencia en la pareja y la familia empieza
            en 2015. Desde 2016 se cuentan también los delitos leves (antes faltas): baja algo la parte de hombres en lesiones porque entran más
            mujeres.
          </p>
          <p>
            <b>Violencia en la pareja y la familia:</b> condenados por violencia de género (por ley solo un hombre contra su pareja o expareja) más
            condenados por violencia doméstica. <b>Malos tratos habituales</b> es lo que el INE llama «trato degradante y violencia». Cuenta delitos, no
            personas.
          </p>
        </>
      }
      src={
        <>
          {L('INE, Estadística de Condenados (tabla 25998 y serie 2007–2012)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=25998')};{' '}
          {L('INE, Estadística de Violencia Doméstica y de Género (tablas 28196 y 34969)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=34969')}
        </>
      }
    />
  );
}

const pctExtr = (k: string, y: string) => (V.detenidosExtranjeros[k][y] / V.detenidos[k][y]) * 100;

/** Detenidos e investigados extranjeros */
export function Extranjeros() {
  const pob = serie(ANIOS, (y) => POB_INMIG.extranjerosPct[y]);
  return (
    <Mini
      id="vio-extranjeros"
      title="Detenidos e investigados extranjeros"
      sub="% de extranjeros entre los detenidos o investigados por cada delito"
      series={[
        ...DETENIDOS.map((d) => ({lab: d.lab, c: d.c, data: serie(ANIOS, (y) => pctExtr(d.k, y))})),
        {lab: 'Extranjeros en la población', c: '#E8590C', dash: true, data: pob},
      ]}
      f={pctF}
      x0={X0}
      yMin={0}
      note={
        <>
          <p>
            Qué parte de las personas detenidas o investigadas por cada delito tiene nacionalidad extranjera. En {A} los extranjeros eran el{' '}
            {pctF(pob[A])} de la población, y el {fmt(pctExtr('lesiones', A), 0)} % de los detenidos por lesiones, el {fmt(pctExtr('conPenetracion', A), 0)}{' '}
            % por agresión sexual con penetración y el {fmt(pctExtr('robosViolencia', A), 0)} % por robos con violencia. En {A0}: el {pctF(pob[A0])} de la
            población y el {fmt(pctExtr('conPenetracion', A0), 0)} % por agresión sexual con penetración.
          </p>
          <p>
            <b>Para leerlo bien:</b> detenido o investigado no es culpable, y a quien no tiene domicilio fijo se le detiene más que se le cita. Los
            extranjeros son más jóvenes y más hombres que la media, que es cuando más se delinque en cualquier país. Entre los detenidos hay personas
            que no viven en España (turistas, gente de paso). Y nacionalidad no es origen: los nacionalizados cuentan como españoles. Las condenas
            comparadas a igual edad están en la pestaña Inmigración.
          </p>
        </>
      }
      src={
        <>
          {L('Ministerio del Interior, tablas 03001 y 03005 (detenciones e investigados)', INTERIOR)}; población:{' '}
          {L('INE, Estadística Continua de Población', 'https://www.ine.es/jaxiT3/Tabla.htm?t=56936')}
        </>
      }
    />
  );
}

const pctResuelto = (k: string, y: string) => (V.esclarecidos[k][y] / V.conocidos[k][y]) * 100;

/** Casos resueltos */
export function Resueltos() {
  return (
    <Mini
      id="vio-resueltos"
      title="Casos resueltos"
      sub="% de los hechos conocidos que la policía esclarece"
      series={DETENIDOS.map((d) => ({lab: d.lab, c: d.c, data: serie(ANIOS, (y) => pctResuelto(d.k, y))}))}
      f={pctF}
      x0={X0}
      yMin={0}
      note={
        <p>
          Un hecho está esclarecido cuando la policía identifica al autor o lo detiene, aunque luego no haya condena. Los malos tratos en la familia y
          los homicidios casi siempre se resuelven, porque se conoce al agresor. Los robos con violencia, cometidos sobre todo por desconocidos, se
          resolvían en el {fmt(pctResuelto('robosViolencia', A0), 0)} % de los casos en {A0} y en el {fmt(pctResuelto('robosViolencia', A), 0)} % en {A}.
        </p>
      }
      src={L('Ministerio del Interior, tablas 01001 y 02001 (hechos conocidos y esclarecidos)', INTERIOR)}
    />
  );
}

const menores = (g: Record<string, number>) => {
  const t = Object.entries(g).filter(([e]) => e !== 'Edad desconocida').reduce((s, [, v]) => s + v, 0);
  return ((g['0-13 años'] + g['14-17 años']) / t) * 100;
};

/** Edad de las víctimas: parte de menores */
export function Edad() {
  const sM = serie(ANIOS, (y) => menores(V.edad.sexual.mujeres[y]));
  const sH = serie(ANIOS, (y) => menores(V.edad.sexual.hombres[y]));
  const ns = serie(ANIOS, (y) => {
    const m = V.edad.noSexual.mujeres[y], h = V.edad.noSexual.hombres[y];
    return menores(Object.fromEntries(Object.keys(m).map((e) => [e, m[e] + h[e]])));
  });
  return (
    <Mini
      id="vio-edad"
      title="Víctimas menores de edad"
      sub="% de menores de 18 años entre las víctimas"
      series={[
        {lab: 'Hombres, violencia sexual', c: COL.sexHombres, data: sH},
        {lab: 'Mujeres, violencia sexual', c: COL.sexMujeres, data: sM},
        {lab: 'Violencia no sexual (ambos sexos)', c: COL.noSexHombres, data: ns},
      ]}
      f={pctF}
      x0={X0}
      yMin={0}
      hitos={[FALTAS]}
      note={
        <>
          <p>
            En {A}, el {fmt(sM[A], 0)} % de las mujeres víctimas de agresión sexual eran menores de 18 años (
            {fmt(V.edad.sexual.mujeres[A]['0-13 años'] + V.edad.sexual.mujeres[A]['14-17 años'], 0)} niñas y chicas); entre los hombres, el {fmt(sH[A], 0)}{' '}
            %: la mayoría de los chicos que sufren violencia sexual son niños. En la violencia no sexual, los menores son el {fmt(ns[A], 0)} %. Lleva así
            desde {A0}: una de cada tres víctimas de violencia sexual, o más, es menor.
          </p>
          <p>
            La Macroencuesta 2024 apunta lo mismo desde otro lado: el {fmt(V.macroencuesta2024.enLaInfancia, 1)} % de las mujeres sufrió violencia sexual en
            la infancia.
          </p>
        </>
      }
      src={
        <>
          {L('Ministerio del Interior, tabla 04001 (victimizaciones por edad y sexo)', INTERIOR)}; {L('Macroencuesta 2024', MACRO24)}
        </>
      }
    />
  );
}

/** Lo registrado frente a lo que probablemente pasa */
export function Estimado() {
  const M = V.macroencuesta2024, M19 = V.macroencuesta2019;
  const sM = serie(ANIOS, (y) => sexual(y, 'mujeres'));
  const noSex = serie(ANIOS, (y) => total(y) - sexual(y));
  const e24 = serie(ANIOS, (y) => sM[y] / (M.denunciaViolenciaSexual / 100));
  const e19 = serie(ANIOS, (y) => sM[y] / (M19.denuncian / 100));
  return (
    <Mini
      id="vio-estimado"
      title="Lo registrado frente a lo que probablemente pasa"
      sub="miles de víctimas al año"
      series={[
        {lab: 'Violencia no sexual registrada', c: COL.noSexHombres, data: enMiles(noSex)},
        {lab: 'Violencia sexual a mujeres registrada', c: COL.sexMujeres, data: enMiles(sM)},
        {lab: `Estimada, si denuncia el ${fmt(M.denunciaViolenciaSexual, 1)} % (Macroencuesta 2024)`, c: COL.sexMujeres, dash: true, data: enMiles(e24)},
        {lab: `Estimada, si denuncia el ${M19.denuncian} % (Macroencuesta 2019)`, c: '#E64980', dash: true, data: enMiles(e19)},
      ]}
      f={enMilesF}
      x0={X0}
      yMin={0}
      hitos={[FALTAS]}
      note={
        <>
          <p>
            La estimación divide lo registrado cada año entre la parte que se denuncia según la Macroencuesta: el {fmt(M.denunciaViolenciaSexual, 1)} % de las
            mujeres que sufrieron violencia sexual fuera de la pareja lo denunció (ella u otra persona) según la de 2024, y el {M19.denuncian} % según la
            de 2019. Se usa el mismo porcentaje para todos los años, porque solo hay esas dos encuestas; si cada vez se denuncia más, la estimación de
            los primeros años se queda corta y la de los últimos, larga.
          </p>
          <p>
            Es una aproximación para ver el orden de magnitud: en {A}, entre {fmt(red(e19[A], 10000), 0)} y {fmt(red(e24[A], 10000), 0)} agresiones sexuales
            a mujeres, frente a {fmt(red(noSex[A], 1000), 0)} víctimas de violencia no sexual registradas. Esos porcentajes son de mujeres a lo largo de su
            vida, no de agresiones en un año, y la violencia no sexual tampoco se denuncia siempre. De las violaciones se denuncia el{' '}
            {fmt(M.denunciaViolaciones, 1)} %: las {fmt(vict('conPenetracion', A, 'mujeres'), 0)} registradas en {A} serían unas{' '}
            {fmt(red(vict('conPenetracion', A, 'mujeres') / (M.denunciaViolaciones / 100), 1000), 0)}.
          </p>
          <p>Ninguno de estos datos mide el efecto de la educación sexual o de la policía: eso solo se ve comparando lugares con y sin ellas.</p>
        </>
      }
      src={
        <>
          {L('Ministerio del Interior, Sistema Estadístico de Criminalidad', INTERIOR)}; {L('Macroencuesta 2024, capítulo 16', MACRO24_SEX)};{' '}
          {L('Macroencuesta 2019', MACRO19)}
        </>
      }
    />
  );
}
