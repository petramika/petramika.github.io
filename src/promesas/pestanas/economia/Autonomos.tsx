import {RETA} from '../../datos';
import {fmt} from '../../lib/formato';
import {INK} from '../../lib/config';
import Mini from '../../componentes/graficas/Mini';
import {L} from '../../componentes/enlace';
import {T} from '../../../comun/Glosario';
import {anios, miles, ultimo} from './series';
import {TARIFA_PLANA, TRAMOS_RETA} from './cifrasAMano';

/* Graficas de autonomos (renderAutonomos del original) */

const e0 = (v: number) => fmt(v, 0) + ' €';
const millones = (miles: number) => fmt(miles / 1000, 2) + ' millones';

export default function Autonomos() {
  const [aMin, vMin] = ultimo<number>(RETA.minima), a0 = anios(RETA.minima)[0];
  const [aBajo, vBajo] = ultimo<number>(RETA.bajo), vAlto: number = RETA.alto[aBajo];
  const [aAfil, vAfil] = ultimo<number>(RETA.afil);
  const mismasTablas = aBajo === TRAMOS_RETA.anio && TRAMOS_RETA.anio !== TRAMOS_RETA.tablasDe;
  return (
    <>
      <Mini
        id="eco-autonomos-cuota"
        title="Cuota de autónomos"
        sub="€ al mes que paga un autónomo a la Seguridad Social"
        series={[
          {lab: 'Cuota mínima (hasta 2022)', c: INK, data: RETA.minima},
          {lab: 'Tramo más bajo (desde 2023)', c: '#2F9E44', dash: true, data: RETA.bajo},
          {lab: 'Tramo más alto (desde 2023)', c: '#E03131', dash: true, data: RETA.alto},
        ]}
        f={(v) => fmt(v, 2) + ' €'}
        x0={1985.5}
        yMin={0}
        note={
          <p>
            Hasta {aMin} cada autónomo elegía su <T k="base-de-cotizacion">base de cotización</T> y la mayoría pagaba la mínima: de{' '}
            {e0(RETA.minima[a0])} al mes en {a0} a {e0(vMin)} en {aMin}. Desde {+aMin + 1} se paga según los ingresos reales: en {aBajo}, unos{' '}
            {e0(vBajo)} al mes si se gana menos de {fmt(TRAMOS_RETA.menosDe, 0)} € netos y {e0(vAlto)} si se ganan más de{' '}
            {miles(TRAMOS_RETA.masDe)} €.{mismasTablas && ` ${aBajo} mantiene las tablas de ${TRAMOS_RETA.tablasDe}.`}{' '}
            <T k="tarifa-plana">Tarifa plana</T> para quien empieza: 50 € (2015–2018), 60 € (2019) y {TARIFA_PLANA} € al mes desde 2023. Cuotas
            calculadas con la base mínima y el tipo que fija el <T k="boe">BOE</T> cada año.
          </p>
        }
        src={
          <>
            {L('BOE, órdenes anuales de cotización', 'https://www.boe.es/buscar/')} y{' '}
            {L('Seguridad Social, cotización por ingresos reales', 'https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/36537')}
          </>
        }
      />
      <Mini
        id="eco-autonomos-numero"
        title="Número de autónomos"
        sub="afiliados al régimen de autónomos, miles (media del año)"
        series={[{lab: 'Autónomos', c: '#AE3EC9', data: RETA.afil}]}
        f={(v) => fmt(v, 0) + ' mil'}
        x0={1985.5}
        note={
          <p>
            De {millones(RETA.afil['1986'])} en 1986 a {millones(RETA.afil['2000'])} en 2000 y {millones(vAfil)} en {aAfil}. El salto de 2008 se
            debe a que ese año entraron en el <T k="reta">régimen</T> los agricultores por cuenta propia. 1986–1999: Boletín de Estadísticas
            Laborales del Ministerio de Trabajo, misma serie (da el mismo dato para 2000).
          </p>
        }
        src={
          <>
            {L('Seguridad Social', 'https://w6.seg-social.es/PXWeb/pxweb/es/Afiliados%20en%20alta%20laboral/Afiliados%20en%20alta%20laboral__Afiliados%20Medios/')} y{' '}
            {L('anuarios del Ministerio de Agricultura', 'https://servicio.mapa.gob.es/estadistica/pags/anuario/2000/AE_2000_05_16.pdf')} (datos del Ministerio de Trabajo)
          </>
        }
      />
    </>
  );
}
