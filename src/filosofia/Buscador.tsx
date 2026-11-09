import {useId, useMemo, useRef, useState} from 'react';
import {sugerir, type Sugerencia} from './buscar';

/*
  Busqueda de varios terminos a la vez. Mientras se escribe salen hasta 7
  sugerencias (filosofos, corrientes, lugares y temas). Al elegir una, o al
  pulsar Enter con texto libre, el termino se queda como una pastilla y se
  puede escribir otro: salen los filosofos que cumplen cualquiera. Cada
  pastilla se quita con su ✕ o con la tecla de borrar con la caja vacia.
*/
export type Termino = {clave: string; texto: string; tipo: string};

type Props = {
  valor: string;
  cambiar: (v: string) => void;
  terminos: Termino[];
  anadir: (s: Sugerencia | {clave: string; texto: string; tipo: string}) => void;
  quitar: (clave: string) => void;
  todas: Sugerencia[];
};

export default function Buscador({valor, cambiar, terminos, anadir, quitar, todas}: Props) {
  const [abierta, setAbierta] = useState(false);
  const [activa, setActiva] = useState(-1);
  const id = useId();
  const caja = useRef<HTMLInputElement>(null);
  const yaEstan = useMemo(() => new Set(terminos.map((t) => t.clave)), [terminos]);
  const lista = useMemo(() => sugerir(valor, todas, 12).filter((s) => !yaEstan.has(s.clave)).slice(0, 7), [valor, todas, yaEstan]);
  const ver = abierta && lista.length > 0;

  const tomar = (s: Sugerencia) => {
    anadir(s);
    setActiva(-1);
    caja.current?.focus();
  };

  return (
    <div className="buscador" onClick={() => caja.current?.focus()}>
      {terminos.map((t) => (
        <span key={t.clave} className="busca-pastilla" title={t.tipo}>
          {t.texto}
          <button
            type="button"
            aria-label={`Quitar ${t.texto}`}
            onClick={(e) => {
              e.stopPropagation();
              quitar(t.clave);
            }}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        ref={caja}
        type="search"
        className="buscar"
        placeholder={terminos.length ? 'Añadir otro…' : 'Buscar: Kant, estoicismo, Grecia… (puedes añadir varios)'}
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
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (ver && activa >= 0) tomar(lista[activa]);
            else if (valor.trim()) anadir({clave: 't:' + valor.trim().toLowerCase(), texto: valor.trim(), tipo: 'Texto'});
          } else if (e.key === 'Backspace' && !valor && terminos.length) {
            quitar(terminos[terminos.length - 1].clave);
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
              onClick={(e) => {
                e.stopPropagation();
                tomar(s);
              }}
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
