import {COFOG, METRICS} from '../../datos';
import Info from '../../componentes/Info';
import Grafico from '../../componentes/graficas/Grafico';
import {T} from '../../../comun/Glosario';
import Cofog from './Cofog';
import Pensiones from './Pensiones';
import Autonomos from './Autonomos';
import RentaYPobreza from './RentaYPobreza';
import CuestionesEconomia from './CuestionesEconomia';
import {ultimo} from './series';

// Graficas grandes de la seccion, en este orden; detras van pensiones y autonomos
const MONEY_ORDER = ['gasto', 'deuda', 'pf', 'iva', 'irpf', 'smi', 'precio'];
// El ultimo año del gasto por funciones que da Eurostat es siempre provisional
const [ultimoCofog] = ultimo(COFOG);

export default function PestanaEconomia() {
  return (
    <section style={{borderTop: 0, paddingTop: 8}}>
      <h2>
        El dinero público en 40 años{' '}
        <Info>
          Cuánto gastan y cuánto ingresan las administraciones, en qué se gasta, cuánto se debe y cuántos impuestos pagamos. El color de fondo
          indica el partido que presidía el Gobierno. La franja de abajo de cada gráfico dice cuánto cambió en cada{' '}
          <T k="legislatura">legislatura</T>.
          <br />
          <br />
          <strong>Pensiones.</strong> Una pensión no se queda congelada: cada año el Gobierno la sube por ley (la «revalorización»). Desde 2022
          sube lo mismo que los precios (<T k="ipc">IPC</T> medio); antes dependía de cada Gobierno, y en algunos años subió menos que los precios,
          así que los pensionistas perdieron <T k="poder-de-compra">poder de compra</T>.
        </Info>
      </h2>

      <h3 style={{marginTop: 14}}>
        En qué se gasta el dinero público{' '}
        <Info>
          Gasto de todas las administraciones (Estado, comunidades, ayuntamientos y Seguridad Social) por funciones. Fuente: <T k="eurostat">Eurostat</T>,
          clasificación <T k="cofog">COFOG</T>, con datos de la <T k="igae">IGAE</T>. El dato de {ultimoCofog} es provisional. Pasa el cursor por
          cada color para ver la cifra.
        </Info>
      </h3>
      <Cofog />
      <h3 style={{marginTop: 26}}>Cuarenta años de dinero público</h3>
      <div className="charts" id="charts-tax">
        {MONEY_ORDER.map((k) => (
          <Grafico key={k} m={METRICS.find((m) => m.k === k)!} />
        ))}
        <Pensiones />
        <Autonomos />
      </div>
      <RentaYPobreza />
      <CuestionesEconomia />
    </section>
  );
}
