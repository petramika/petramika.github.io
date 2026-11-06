import type {ReactNode} from 'react';

/*
  «Cuestiones frecuentes»: el bloque final de cada pestaña (menos Global).
  Cada pregunta va plegada; al abrirla se ve la conclusion, lo positivo y
  lo negativo, enlaces a las graficas de la pestaña que la respaldan y,
  si hace falta, graficas propias dentro.

  Uso:
    <Cuestiones intro="...">
      <Cuestion pregunta="¿...?" veredicto="Falso" tono="falso"
        conclusion={...} positivo={[...]} negativo={[...]}
        graficas={[{id: 'g-paro', lab: 'Paro'}]}>
        (graficas opcionales)
      </Cuestion>
    </Cuestiones>
*/
export type Tono = 'falso' | 'matiz' | 'cierto';

export function Cuestiones({intro, children}: {intro?: ReactNode; children: ReactNode}) {
  return (
    <section className="faq" aria-label="Cuestiones frecuentes">
      <h2>Cuestiones frecuentes</h2>
      {intro && <p className="faq-intro">{intro}</p>}
      {children}
    </section>
  );
}

/** Lleva a una grafica de la pagina (por su id) y la resalta un momento. No toca el hash: lo usa la navegacion. */
export function IrAGrafica({id, children}: {id: string; children: ReactNode}) {
  const ir = () => {
    const el = document.getElementById(id);
    if (!el) return;
    // Si la grafica esta dentro de una pregunta plegada, se abre
    const det = el.closest('details');
    if (det && !det.open) det.open = true;
    el.scrollIntoView({behavior: 'smooth', block: 'center'});
    el.classList.add('destacada');
    setTimeout(() => el.classList.remove('destacada'), 1800);
  };
  return (
    <button type="button" onClick={ir}>
      {children} ↗
    </button>
  );
}

type CuestionProps = {
  pregunta: string;
  /** Respuesta corta en una palabra o dos: «Falso», «No realmente», «Cierto»… */
  veredicto?: string;
  tono?: Tono;
  /** En resumidas cuentas */
  conclusion: ReactNode;
  positivo: ReactNode[];
  negativo: ReactNode[];
  /** Graficas de la pestaña que respaldan la respuesta */
  graficas?: {id: string; lab: string}[];
  /** Graficas propias de la pregunta (se ven al abrirla) */
  children?: ReactNode;
};

export function Cuestion({pregunta, veredicto, tono = 'matiz', conclusion, positivo, negativo, graficas, children}: CuestionProps) {
  return (
    <details className="faq-q">
      <summary>
        <span className="faq-p">{pregunta}</span>
        {veredicto && <span className={`veredicto ${tono}`}>{veredicto}</span>}
      </summary>
      <div className="faq-body">
        <p className="faq-concl">
          <b>En resumen:</b> {conclusion}
        </p>
        <div className="faq-pn">
          <div className="faq-pos">
            <h4>Lo positivo</h4>
            <ul>
              {positivo.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="faq-neg">
            <h4>Lo negativo</h4>
            <ul>
              {negativo.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
        {graficas && graficas.length > 0 && (
          <p className="faq-ver">
            Ver en las gráficas:{' '}
            {graficas.map((g) => (
              <IrAGrafica key={g.id} id={g.id}>
                {g.lab}
              </IrAGrafica>
            ))}
          </p>
        )}
        {children && <div className="charts dos">{children}</div>}
      </div>
    </details>
  );
}
