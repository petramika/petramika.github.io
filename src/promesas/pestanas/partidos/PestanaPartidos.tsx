import {useState} from 'react';
import Info from '../../componentes/Info';
import {T} from '../../../comun/Glosario';
import ChipsPartidos from './ChipsPartidos';
import CuestionesPartidos from './CuestionesPartidos';
import {PARTIES, type Partido} from './datos';
import FichaPartido from './FichaPartido';
import FiltroAnios, {existeEntre, RANGO_TODO, type Rango} from './FiltroAnios';

// Como pSel2 en el original: el partido elegido (y el filtro de años) se recuerdan al cambiar de pestaña y volver
let elegidoAntes = 'PSOE';
let rangoAntes: Rango = RANGO_TODO;

/** Pestaña "Partidos y programas": que proponia cada partido en cada eleccion */
export default function PestanaPartidos() {
  const [sel, setSel] = useState(elegidoAntes);
  const [rango, setRango] = useState(rangoAntes);
  // La pista «pulsa aquí» sale al entrar en la pestaña y se va al primer clic en una barra
  const [pista, setPista] = useState(true);
  const elegir = (key: string) => setSel((elegidoAntes = key));
  const cambiarRango = (r: Rango) => setRango((rangoAntes = r));
  const P = PARTIES.find((p) => p.key === sel) || PARTIES[0];
  const visible = (p: Partido) => existeEntre(p, rango);
  const visibles = PARTIES.filter(visible).length;

  return (
    <section style={{borderTop: 0, paddingTop: '8px'}}>
      <h2>
        Qué proponía cada partido{' '}
        <Info>
          Las propuestas más visibles del programa de cada partido en cada elección, tenga o no <T k="escano">escaños</T>. Solo quien gobierna puede cumplirlas:
          cuando un partido llegó al Gobierno, verás un enlace a su balance de cumplimiento.
        </Info>
      </h2>
      <div id="par-elegir">
        <FiltroAnios rango={rango} cambiar={cambiarRango} visibles={visibles} />
        <ChipsPartidos sel={sel} elegir={elegir} visible={visible} />
      </div>
      {/* Si el partido elegido queda fuera del filtro, se sigue viendo su ficha con este aviso */}
      {!visible(P) && (
        <p className="note">
          {P.n} {P.disuelto ? `existió de ${P.fundado} a ${P.disuelto}` : `se fundó en ${P.fundado}`}: queda fuera de los años elegidos, pero se sigue
          mostrando hasta que elijas otro partido.
        </p>
      )}
      <div id="pview">
        {/* Con key, al cambiar de partido se cierran los desplegables, como al repintar en el original */}
        <FichaPartido key={P.key} P={P} pista={pista} quitarPista={() => setPista(false)} />
      </div>
      <CuestionesPartidos elegir={elegir} />
    </section>
  );
}
