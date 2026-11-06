import {PARTIES, type Partido} from './datos';

/** Años que se pueden elegir: de las primeras elecciones democraticas (1977) a hoy */
const HASTA = new Date().getFullYear();
export const ANIOS = Array.from({length: HASTA - 1977 + 1}, (_, i) => 1977 + i);
export type Rango = [number, number];
export const RANGO_TODO: Rango = [ANIOS[0], ANIOS[ANIOS.length - 1]];

type Props = {rango: Rango; cambiar: (r: Rango) => void; visibles: number};

/**
  "Existentes entre [año] y [año]": los partidos que existieron en algun
  momento de ese periodo (fundados antes de que acabe y no desaparecidos
  antes de que empiece).
*/
export const existeEntre = (p: Partido, [desde, hasta]: Rango) => p.fundado <= hasta && (p.disuelto ?? Infinity) >= desde;
export default function FiltroAnios({rango: [desde, hasta], cambiar, visibles}: Props) {
  const todo = desde === RANGO_TODO[0] && hasta === RANGO_TODO[1];
  return (
    <div className="bfilter">
      <label>
        Existentes entre{' '}
        <select value={desde} onChange={(e) => cambiar([+e.target.value, hasta])} aria-label="Existentes desde">
          {ANIOS.filter((a) => a <= hasta).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>
      <label>
        y{' '}
        <select value={hasta} onChange={(e) => cambiar([desde, +e.target.value])} aria-label="Existentes hasta">
          {ANIOS.filter((a) => a >= desde).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>
      <span className="note" style={{margin: 0}} aria-live="polite">
        {visibles} de {PARTIES.length} partidos
      </span>
      {!todo && (
        <button type="button" className="golink" style={{marginTop: 0}} onClick={() => cambiar(RANGO_TODO)}>
          Ver todos
        </button>
      )}
    </div>
  );
}
