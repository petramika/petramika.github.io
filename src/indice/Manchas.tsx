/*
  Manchas de color en dos esquinas: una grande que asoma desde fuera de la
  pantalla y unas pocas pequeñas alrededor, como satelites. Cambian de forma
  despacio animando border-radius; todo es CSS (ver .manchas en indice.css).
*/
const MANCHAS = [
  'grande arriba',
  'sat arriba s1',
  'sat arriba s2',
  'sat arriba s3',
  'grande abajo',
  'sat abajo s1',
  'sat abajo s2',
  'sat abajo s3',
];

export default function Manchas() {
  return (
    <div className="manchas" aria-hidden="true">
      {MANCHAS.map((c) => (
        <span key={c} className={`mancha ${c}`} />
      ))}
    </div>
  );
}
