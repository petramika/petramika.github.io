import {ProveedorGlosario, T} from '../comun/Glosario';
import Pie from '../comun/Pie';
import {GLOSARIO} from './datos/glosario';
import {lazy, Suspense, useDeferredValue} from 'react';
import Esqueleto from './componentes/Esqueleto';
import {TipProvider} from './componentes/Tip';
import {EstadoProvider, PESTANAS, useEstado} from './estado';
import {LEGS} from './datos';
import {yr} from './lib/formato';
import PestanaGlobal from './pestanas/global/PestanaGlobal';
import PestanaEconomia from './pestanas/economia/PestanaEconomia';
import PestanaVivienda from './pestanas/vivienda/PestanaVivienda';
import PestanaInmigracion from './pestanas/inmigracion/PestanaInmigracion';
import PestanaMedios from './pestanas/medios/PestanaMedios';
import PestanaViolencia from './pestanas/violencia/PestanaViolencia';
import BotonTema from '../comun/tema';

// Partidos lleva medio mega de programas: se descarga solo al abrir la pestaña
const PestanaPartidos = lazy(() => import('./pestanas/partidos/PestanaPartidos'));

function Pestanas() {
  const {tab, setTab} = useEstado();
  // La pestaña nueva se dibuja en segundo plano: mientras, su esqueleto
  const vista = useDeferredValue(tab);
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Secciones">
        {PESTANAS.map(([id, nombre]) => (
          <button key={id} type="button" role="tab" id={`t-${id}`} aria-selected={tab === id} aria-controls={`tab-${id}`} onClick={() => setTab(id)}>
            {nombre}
          </button>
        ))}
      </div>

      <div id={`tab-${tab}`} role="tabpanel" aria-labelledby={`t-${tab}`}>
        {vista !== tab && <Esqueleto />}
        {vista === tab && <Contenido tab={tab} />}
      </div>
    </>
  );
}

function Contenido({tab}: {tab: ReturnType<typeof useEstado>['tab']}) {
  return (
    <>
        {tab === 'global' && <PestanaGlobal />}
        {tab === 'partidos' && (
          <Suspense fallback={<Esqueleto />}>
            <PestanaPartidos />
          </Suspense>
        )}
        {tab === 'economia' && <PestanaEconomia />}
        {tab === 'vivienda' && <PestanaVivienda />}
        {tab === 'inmigracion' && <PestanaInmigracion />}
        {tab === 'violencia' && <PestanaViolencia />}
        {tab === 'medios' && <PestanaMedios />}
    </>
  );
}

// Primera y última legislatura de los datos, para la cabecera (hoy: III a XV, 1986–2026)
const PRIMERA = LEGS[0], ULTIMA = LEGS[LEGS.length - 1];

export default function App() {
  return (
    <EstadoProvider>
      <ProveedorGlosario glosario={GLOSARIO}>
      <TipProvider>
        <div className="wrap">
          <BotonTema />
          <header className="top">
            <div className="eyebrow">
              Congreso de los Diputados · Legislaturas {PRIMERA.num} a {ULTIMA.num} · {yr(PRIMERA.a)}–{yr(ULTIMA.b)}
            </div>
            <h1>España política en datos</h1>
            <p>
              Cada <T k="legislatura">legislatura</T> desde {yr(PRIMERA.a)}: quién gobernó y con quién, qué prometió, qué se aprobó y qué no, y cómo
              cambiaron el paro, la <T k="deuda-publica">deuda</T>, el <T k="salario-minimo">salario mínimo</T>, la población y la vivienda entre una
              elección y la siguiente.
            </p>
          </header>

          <Pestanas />

          <footer className="reflect" aria-labelledby="reflect-h">
            <h2 id="reflect-h">Antes de cerrar esta página</h2>
            <p>
              La información se ha sacado de aquí:{' '}
              <a href="fuentes.html" target="_blank" rel="noopener">
                <strong>todas las fuentes, sección por sección</strong>
              </a>
              . Aun así, es una aproximación: cifras redondeadas, promesas resumidas y valoraciones que otra persona haría de otra manera. La verdad
              completa no existe; existen datos de una veracidad que desconocemos, contextos y puntos de vista. Y si tienes más curiosidad de por qué
              empezó esto:{' '}
              <a href="sobre-la-autora.html" target="_blank" rel="noopener">
                <strong>sobre la autora</strong>
              </a>
              .
            </p>
          </footer>
        </div>
        <Pie marca="España política en datos" />
      </TipProvider>
      </ProveedorGlosario>
    </EstadoProvider>
  );
}
