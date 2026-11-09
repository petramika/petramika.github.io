import {useId, useMemo, useState} from 'react';
import {sugerir, type Sugerencia} from './buscar';

/*
  Caja de busqueda con sugerencias mientras se escribe (hasta 7): filosofos,
  corrientes, lugares y temas. Se mueve con las flechas, Enter elige y Esc
  cierra. Elegir un filosofo abre su ficha; un tema activa su filtro; lo demas
  se escribe en la caja.
*/
type Props = {
  valor: string;
  cambiar: (v: string) => void;
  todas: Sugerencia[];
  elegir: (s: Sugerencia) => void;
};

export default function Buscador({valor, cambiar, todas, elegir}: Props) {
  const [abierta, setAbierta] = useState(false);
  const [activa, setActiva] = useState(-1);
  const id = useId();
  const lista = useMemo(() => sugerir(valor, todas), [valor, todas]);
  const ver = abierta && lista.length > 0;

  const tomar = (s: Sugerencia) => {
    elegir(s);
    setAbierta(false);
    setActiva(-1);
  };

  return (
    <div className="buscador">
      <input
        type="search"
        className="buscar"
        placeholder="Buscar: Kant, estoicismo, Grecia…"
        value={valor}
        role="combobox"
        aria-label="Buscar filósofo"
        aria-expanded={ver}
        aria-controls={id}
        aria-autocomplete="list"
        aria-activedescendant={ver && activa >= 0 ? `${id}-${activa}` : undefined}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          cambiar(e.target.value);
          setAbierta(true);
          setActiva(-1);
        }}
        onFocus={() => setAbierta(true)}
        onBlur={() => setTimeout(() => setAbierta(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && lista.length) {
            e.preventDefault();
            setAbierta(true);
            setActiva((a) => (a + 1) % lista.length);
          } else if (e.key === 'ArrowUp' && lista.length) {
            e.preventDefault();
            setActiva((a) => (a <= 0 ? lista.length - 1 : a - 1));
          } else if (e.key === 'Enter' && ver && activa >= 0) {
            e.preventDefault();
            tomar(lista[activa]);
          } else if (e.key === 'Escape' && ver) {
            e.stopPropagation();
            setAbierta(false);
          }
        }}
      />
      {ver && (
        <ul className="sugerencias" id={id} role="listbox" aria-label="Sugerencias">
          {lista.map((s, i) => (
            <li
              key={s.clave}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === activa}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiva(i)}
              onClick={() => tomar(s)}
            >
              <span className="sug-texto">{s.texto}</span>
              {s.detalle && <span className="sug-detalle">{s.detalle}</span>}
              <span className="sug-tipo">{s.tipo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
