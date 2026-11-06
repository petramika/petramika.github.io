import Detalle from './Detalle';
import Graficos from './Graficos';
import Legislaturas from './Legislaturas';
import Vistazo from './Vistazo';

/* Pestaña Global. El balance de promesas por partido vive ahora en Partidos, en «¿Los partidos cumplen lo que prometen?». */
export default function PestanaGlobal() {
  return (
    <>
      <Vistazo />
      <Legislaturas />
      <Detalle />
      <Graficos />
    </>
  );
}
