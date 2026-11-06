import {useCallback, useState} from 'react';
import Icono from '../../componentes/Icono';
import Lateral from '../../componentes/Lateral';
import {PEL, type Partido} from './datos';
import EscanosPartido from './EscanosPartido';
import PanelEleccion from './PanelEleccion';
import {tituloEleccion} from './textos';

/**
  Cabecera del partido y su grafico de escaños. Cada columna se pulsa y abre
  un panel lateral con todo lo de esa eleccion (papel, escaños, programa y
  propuestas), con flechas para ir a la anterior o la siguiente. Se monta de
  nuevo al cambiar de partido, asi que el panel se cierra solo.
*/
export default function FichaPartido({P, pista, quitarPista}: {P: Partido; pista: boolean; quitarPista: () => void}) {
  const [elegida, setElegida] = useState<string | null>(null);
  const cerrar = useCallback(() => setElegida(null), []);
  const nP = P.elections.reduce((a, e) => a + (e.items || []).filter((i) => i.src === 'p').length, 0);
  const nM = P.elections.reduce((a, e) => a + (e.items || []).filter((i) => i.src === 'm').length, 0);
  // Columnas del grafico (todas las elecciones) y, aparte, lo propuesto fuera de las generales
  const ids = PEL.map(([id]) => id);
  const fuera = P.elections.find((e) => e.e === 'sin_generales' && (e.items || []).length);
  const pos = elegida ? ids.indexOf(elegida) : -1;

  return (
    <>
      <div id="par-ficha" className="phero" style={{borderColor: P.color}}>
        <h2>{P.n}</h2>
        <p className="note" style={{margin: '4px 0 0'}}>{P.d}</p>
        {P.web && P.web.length ? (
          <div className="plinks">
            <Icono k="eur" size={15} />
            <span>Web oficial:</span>
            {P.web.map(([t, u]) => (
              <a key={u} href={u} target="_blank" rel="noopener">
                {t}
              </a>
            ))}
          </div>
        ) : (
          <div className="plinks">
            <span>Sin web oficial activa.</span>
          </div>
        )}
        <div className="pstat">
          <span>
            <i className="sdot p" style={{pointerEvents: 'none'}} />
            {nP} propuestas del programa
          </span>
          <span>
            <i className="sdot m" style={{pointerEvents: 'none'}} />
            {nM} de prensa
          </span>
        </div>
        <div className="escanos-cab">
          <div className="eyebrow">Escaños en el Congreso</div>
        </div>
        <EscanosPartido
          P={P}
          pista={pista}
          elegida={elegida}
          elegir={(id) => {
            quitarPista();
            setElegida(elegida === id ? null : id);
          }}
        />
        {fuera && (
          <button type="button" className="fuera-gen" onClick={() => setElegida('sin_generales')}>
            Propuestas fuera de las elecciones generales ({(fuera.items || []).length}) ›
          </button>
        )}
      </div>
      {elegida && (
        <Lateral antetitulo={P.n} titulo={tituloEleccion(elegida)} color={P.color} cerrar={cerrar}>
          <PanelEleccion P={P} id={elegida} />
          {pos >= 0 && (
            <nav className="lat-nav" aria-label="Otras elecciones">
              {pos > 0 ? (
                <button type="button" onClick={() => setElegida(ids[pos - 1])}>
                  ‹ {tituloEleccion(ids[pos - 1]).replace(/^.*elecciones de /, '')}
                </button>
              ) : (
                <span />
              )}
              {pos < ids.length - 1 && (
                <button type="button" onClick={() => setElegida(ids[pos + 1])}>
                  {tituloEleccion(ids[pos + 1]).replace(/^.*elecciones de /, '')} ›
                </button>
              )}
            </nav>
          )}
        </Lateral>
      )}
    </>
  );
}
