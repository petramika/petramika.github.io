/*
  Pista dibujada a mano: «pulsa aquí» con una flecha fina y punteada que
  apunta hacia abajo, a lo que se puede pulsar. Se dibuja sola al aparecer.
  Quien la usa decide cuando quitarla (al primer clic) y vuelve a salir la
  proxima vez que se entra en la pestaña.
*/
export default function Pista({texto = 'pulsa aquí', lado = 'derecha'}: {texto?: string; lado?: 'derecha' | 'izquierda'}) {
  return (
    <span className={`pista-mano ${lado}`} aria-hidden="true">
      <svg viewBox="0 0 60 70" width="46" height="54">
        {/* Curva de la flecha, de arriba (junto al texto) hacia abajo */}
        <path className="pista-curva" d="M50 6 C 22 10, 10 30, 18 62" />
        {/* Punta */}
        <path className="pista-punta" d="M10 52 L18 63 L26 53" />
      </svg>
      <span className="pista-texto">{texto}</span>
    </span>
  );
}
