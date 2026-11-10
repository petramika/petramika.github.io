import {useEffect, useState} from 'react';
import './tema.css';

/*
  Modo claro / oscuro, el mismo en toda la web. Sin eleccion, cada pagina
  sigue al sistema (prefers-color-scheme); al pulsar el boton se fija en
  <html data-theme="light|dark"> y se recuerda para todas las paginas. Un
  script en el <head> de cada HTML lo aplica antes de pintar, para que no
  parpadee. El CSS de cada pagina define sus colores para los dos casos:

    @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { …oscuro… } }
    :root[data-theme="dark"] { …oscuro… }
*/
const CLAVE = 'petramika-tema';
const sistema = () => window.matchMedia('(prefers-color-scheme: dark)');

export const esOscuro = () => {
  const fijado = document.documentElement.dataset.theme;
  return fijado ? fijado === 'dark' : sistema().matches;
};

function fijar(oscuro: boolean) {
  const t = oscuro ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(CLAVE, t);
  } catch {
    /* sin almacenamiento: vale para esta visita */
  }
}

/** El de ROTA: el circulo medio lleno y «+ / -», arriba a la derecha de la cabecera */
export default function BotonTema() {
  const [oscuro, setOscuro] = useState(esOscuro);

  useEffect(() => {
    const m = sistema();
    const cambia = () => setOscuro(esOscuro());
    m.addEventListener('change', cambia);
    // Si se cambia en otra pestaña de la web, esta tambien
    const otra = (e: StorageEvent) => {
      if (e.key !== CLAVE || !e.newValue) return;
      document.documentElement.dataset.theme = e.newValue;
      cambia();
    };
    window.addEventListener('storage', otra);
    return () => {
      m.removeEventListener('change', cambia);
      window.removeEventListener('storage', otra);
    };
  }, []);

  return (
    <button
      type="button"
      className={`boton-tema${oscuro ? ' oscuro' : ''}`}
      aria-pressed={oscuro}
      aria-label={oscuro ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}
      title={oscuro ? 'Modo oscuro (+ / -)' : 'Modo claro (+ / -)'}
      onClick={() => {
        fijar(!oscuro);
        setOscuro(!oscuro);
      }}
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 18a6 6 0 0 0 0-12v12z" fill="currentColor" />
      </svg>
      <span>+ / -</span>
    </button>
  );
}
