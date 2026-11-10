/*
  Abre el telon de carga (el #telon que viene escrito en el HTML) cuando la
  pagina ya se puede ver bien: fuentes cargadas y lo basico pintado. Se queda
  un minimo para que la apertura se vea y no sea un parpadeo, y nunca mas de
  unos segundos aunque algo se atasque.
*/
const MINIMO_MS = 900;
const MAXIMO_MS = 3500;

const cargada = () =>
  new Promise<void>((ok) => {
    if (document.readyState === 'complete') ok();
    else window.addEventListener('load', () => ok(), {once: true});
  });

export function abrirTelon() {
  const telon = document.getElementById('telon');
  if (!telon) return;
  const listo = Promise.all([document.fonts?.ready, cargada()]);
  const tope = new Promise((ok) => window.setTimeout(ok, MAXIMO_MS));
  Promise.race([listo, tope]).then(() => {
    // performance.now() cuenta desde que se pidio la pagina: el minimo incluye lo que ya se vio
    const falta = Math.max(0, MINIMO_MS - performance.now());
    window.setTimeout(() => {
      requestAnimationFrame(() => telon.classList.add('abre'));
      window.setTimeout(() => telon.remove(), 1500);
    }, falta);
  });
}
