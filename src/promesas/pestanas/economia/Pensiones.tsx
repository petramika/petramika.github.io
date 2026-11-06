import {ANNUAL, IPCDIC, PENS, PREV} from '../../datos';
import {fmt} from '../../lib/formato';
import {INK} from '../../lib/config';
import Mini from '../../componentes/graficas/Mini';
import {L} from '../../componentes/enlace';
import {T} from '../../../comun/Glosario';
import {huecos, lista} from './series';
import {PENSIONES_A_MANO as PA} from './cifrasAMano';

/* Graficas de pensiones (renderPensions del original) */

export default function Pensiones() {
  const ipcSub = Object.fromEntries(Object.keys(PREV).filter((t) => IPCDIC[+t - 1] != null).map((t) => [t, IPCDIC[+t - 1]]));
  const sinDato = huecos(PENS.media);
  return (
    <>
      <Mini
        id="eco-pension-cuantia"
        title="Cuánto se cobra de pensión"
        sub="€ al mes, 14 pagas"
        series={[
          {lab: 'Media de jubilación', c: INK, data: PENS.media},
          {lab: 'Mínima con cónyuge', c: '#3B5BDB', data: PENS.minima},
          {lab: 'No contributiva', c: '#E8590C', data: PENS.pnc},
          {lab: 'Salario mínimo', c: '#868E96', dash: true, data: ANNUAL.smi},
        ]}
        f={(v) => fmt(v, 0) + ' €'}
        x0={1985.5}
        yMin={0}
        note={
          <p>
            La pensión media sube también porque los nuevos jubilados han <T k="cotizaciones">cotizado</T> más que los antiguos, no solo por la{' '}
            <T k="revalorizacion">revalorización</T>. 1986–2009: media anual; desde 2010: dato de diciembre.
            {sinDato.length > 0 && ` ${lista(sinDato)} sin dato oficial comparable.`}
          </p>
        }
        src={
          <>
            {L('Seguridad Social (IEF 2023, Libro de pensiones oct. 2026)', 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST23/e558ff85-1ef3-4c85-b609-8ffb8567c923')}
            , Anuarios del INE con datos del Ministerio de Trabajo y decretos de revalorización del BOE
          </>
        }
      />
      <Mini
        id="eco-pension-ipc"
        title="Pensiones frente a precios"
        sub="% cada año"
        series={[
          {lab: 'Subida de las pensiones', c: INK, data: PREV},
          {lab: 'IPC del año anterior', c: '#E03131', dash: true, data: ipcSub},
        ]}
        f={(v) => fmt(v, 1) + ' %'}
        x0={1985.5}
        note={
          <>
          <p>
            Cuando la línea negra queda por debajo de la roja, las pensiones subieron menos que los precios del año anterior. Pasó sobre todo entre
            2010 y 2017 (congelación de 2011 y subidas del 0,25 %) y con la <T k="inflacion">inflación</T> de 2021–2022.
          </p>
          <p>
            En 2011 la subida general se congeló (solo subieron las pensiones mínimas). El 1,3 % de ese año es la compensación por la inflación de
            2010, que se pagó y se sumó a la pensión.
          </p>
          </>
        }
        src={
          <>
            {L('BOE, decretos anuales de revalorización', 'https://www.boe.es/buscar/')} e {L('INE, IPC', 'https://www.ine.es/jaxiT3/Tabla.htm?t=76134')}
          </>
        }
      />
      <Mini
        id="eco-pension-gasto"
        title="Gasto en pensiones contributivas"
        sub="% del PIB"
        series={[{lab: 'Gasto', c: '#3B5BDB', data: PENS.gastoPct}]}
        bars
        f={(v) => fmt(v, 2) + ' %'}
        x0={1997.5}
        yMin={0}
        note={
          <p>
            {fmt(PA.numeroMillones, 1)} millones de <T k="pension-contributiva">pensiones contributivas</T> en {PA.anio}, frente a{' '}
            {fmt(PA.numeroInicioMillones, 1)} millones en {PA.anioInicio}. En {PA.anio} el gasto fue de {fmt(PA.gastoMillones, 0)} millones de euros.
          </p>
        }
        src={
          <>
            {L('Seguridad Social (Informe Económico-Financiero 2023 y Boletín de Información Estadística)', 'https://www.seg-social.es/descarga/es/Proy2023SNT3')}
            ; PIB del INE
          </>
        }
      />
    </>
  );
}
