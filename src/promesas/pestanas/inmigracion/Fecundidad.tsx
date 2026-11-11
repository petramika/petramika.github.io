import {FEC_ORIGEN} from '../../datos';
import {fmt} from '../../lib/formato';
import Mini from '../../componentes/graficas/Mini';
import {L} from '../../componentes/enlace';
import {COL_ES, COL_EX2} from './colores';
import {T} from '../../../comun/Glosario';

/*
  Hijos por mujer según dónde nació la madre (cálculo propio con datos del
  INE) frente a los hijos por mujer en su país de origen (Banco Mundial).
  Responde a «¿tienen muchos más hijos los inmigrantes?».
*/
type Fila = Record<string, number | null>;
/** Años (claves de cuatro cifras) de un objeto, de menor a mayor */
const anios = (o: Fila) => Object.keys(o).filter((k) => /^\d{4}$/.test(k)).sort();
/** Países de la gráfica: los que más bebés tienen en España (y Honduras, de los que más llegan ahora) */
const PAISES: {k: string; c: string}[] = [
  {k: 'Marruecos', c: '#2F9E44'},
  {k: 'Colombia', c: '#F59F00'},
  {k: 'Venezuela', c: '#C2255C'},
  {k: 'Rumanía', c: '#7048E8'},
  {k: 'Honduras', c: '#0B7A75'},
];
/** Solo los años (sin los campos de recuento) */
const serie = (o: Fila, desde?: string): Record<string, number> =>
  Object.fromEntries(anios(o).filter((y) => !desde || y >= desde).map((y) => [y, o[y] as number]));
const MNP_MICRO = 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177007&menu=resultados&secc=1254736195442&idp=1254735573002';

/** Datos que comparten la gráfica y la cuestión «Nos están sustituyendo» */
export function fecundidadOrigen() {
  const E = FEC_ORIGEN.enEspana, S = FEC_ORIGEN.enSuPais;
  const [a0, a] = [anios(E.nacidasEspana)[0], anios(E.nacidasEspana).at(-1)!];
  const [p0, p] = [anios(S.paises.Marruecos)[0], anios(S.paises.Marruecos).at(-1)!];
  // Parte de las mujeres de 15 a 49 años que nació fuera (último año)
  const mujeresFuera = E.nacidasFuera.mujeres15a49Ultimo / (E.nacidasFuera.mujeres15a49Ultimo + E.nacidasEspana.mujeres15a49Ultimo);
  return {E, S, a0, a, p0, p, pctMujeresFuera: mujeresFuera * 100, censoMarruecos: FEC_ORIGEN.marruecosCenso2024};
}

const f2 = (v: number) => fmt(v, 2);

export default function GraficaFecundidad() {
  const {E, S, a0, a, p0, p, censoMarruecos} = fecundidadOrigen();
  const pais = (k: string): Fila => E.porPais[k];
  const grupo = (k: string): Fila => E.porGrupo[k];
  const comp = E.comprobacion;
  return (
    <Mini
      id="inm-fecundidad"
      title="Hijos por mujer según su origen"
      sub="mujeres que viven en España según dónde nacieron (continua) y en su país de origen (discontinua)"
      series={[
        {lab: 'Nacidas en España', c: COL_ES, data: serie(E.nacidasEspana)},
        {lab: 'Nacidas fuera (todas)', c: COL_EX2, data: serie(E.nacidasFuera)},
        ...PAISES.flatMap(({k, c}) => [
          {lab: `${k}, en España`, c, data: serie(pais(k))},
          {lab: `${k}, en su país`, c, dash: true, data: serie(S.paises[k], a0)},
        ]),
      ]}
      f={f2}
      x0={Number(a0) - 0.5}
      yMin={0}
      note={
        <>
          <p>
            <T k="fecundidad">Hijos por mujer</T>. Para que una población se mantenga sin inmigración hacen falta unos 2,1 (
            <T k="reemplazo-generacional">nivel de reemplazo</T>). En {a}, las mujeres nacidas en España tuvieron {f2(E.nacidasEspana[a])} y
            las nacidas fuera {f2(E.nacidasFuera[a])}. Por zonas: África {f2(grupo('África')[a])}, Asia {f2(grupo('Asia')[a])}, Sudamérica{' '}
            {f2(grupo('Sudamérica')[a])}, Centroamérica y Caribe {f2(grupo('Centroamérica y Caribe')[a])}, resto de la UE{' '}
            {f2(grupo('Resto de la UE')[a])}.
          </p>
          <p>
            De los grupos grandes, las que más hijos tienen son las nacidas en Marruecos ({f2(pais('Marruecos')[a])}), aunque en {a0} eran{' '}
            {f2(pais('Marruecos')[a0]!)}. Las nacidas fuera en conjunto han pasado de {f2(E.nacidasFuera[a0])} a {f2(E.nacidasFuera[a])} en{' '}
            {+a - +a0} años. Las latinoamericanas
            tienen aquí menos hijos que en su país: las venezolanas, {f2(pais('Venezuela')[a])} frente a {f2(S.paises.Venezuela[p])} en Venezuela.
          </p>
          <p>
            En los países de origen también bajan: Marruecos ha pasado de {f2(S.paises.Marruecos[p0])} hijos por mujer en {p0} a{' '}
            {f2(S.paises.Marruecos[p])} en {p} según la ONU, y su censo de {censoMarruecos.anio} da{' '}
            {f2(censoMarruecos.valor)}. Honduras, de {f2(S.paises.Honduras[p0])} a {f2(S.paises.Honduras[p])}.
          </p>
          <p>
            Cada año desde {a0}. En los países de origen, la ONU estima hasta {p}. Las nacidas fuera bajan de {f2(E.nacidasFuera[a0])} a{' '}
            {f2(E.nacidasFuera[a])}, y de los países de la gráfica la mayor caída es la de las marroquíes, que se acercan cada vez más a lo que se tiene en Marruecos.
          </p>
          <p>
            Cálculo propio: bebés nacidos en España según la edad y el país de nacimiento de la madre (<T k="microdatos">microdatos</T> del INE),
            entre las mujeres de 15 a 49 años que viven aquí. Con el mismo método sale {f2(comp[`totalCalculado${a}`])} para toda España, igual
            que el dato oficial ({f2(comp[`totalINE${a}`])}). Se cuenta por país de nacimiento, no por nacionalidad, para que una mujer no cambie de
            grupo al hacerse española. Solo cuentan los hijos nacidos en España: los que tuvieron antes de llegar no están. Las madres cuyo país el INE deja en blanco por
            anonimato se cuentan como nacidas fuera.
          </p>
        </>
      }
      src={
        <>
          {L('INE, microdatos de nacimientos', MNP_MICRO)} y {L('población por país de nacimiento (tabla 56937)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=56937')};
          países: {L('Banco Mundial (ONU, World Population Prospects 2024)', S.url)}; {L('censo de Marruecos 2024 (HCP)', censoMarruecos.url)}
        </>
      }
    />
  );
}
