import {METRICS} from '../../datos';
import Grafico from '../../componentes/graficas/Grafico';
import Casas from './Casas';
import GraficasVivienda from './GraficasVivienda';
import CuestionesVivienda from './CuestionesVivienda';

export default function PestanaVivienda() {
  return (
    <section style={{borderTop: 0, paddingTop: 8}}>
      <h2>Vivienda</h2>
      <Casas />
      <div className="charts" id="charts-viv" style={{marginTop: 14}}>
        {['precio', 'viv'].map((k) => (
          <Grafico key={k} m={METRICS.find((m) => m.k === k)!} />
        ))}
        <GraficasVivienda />
      </div>
      <CuestionesVivienda />
    </section>
  );
}
