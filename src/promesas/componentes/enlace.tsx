/** Enlace a una fuente externa, en otra pestaña (L(texto, url) en el original). */
export const L = (t: string, u: string) => (
  <a href={u} target="_blank" rel="noopener">
    {t}
  </a>
);
