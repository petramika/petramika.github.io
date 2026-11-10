/* El modo que se eligio con el boton +/- (si se eligio), antes de pintar nada: asi no parpadea */
try {
  var t = localStorage.getItem('petramika-tema');
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
} catch (e) {
  /* sin almacenamiento: se sigue al sistema */
}
