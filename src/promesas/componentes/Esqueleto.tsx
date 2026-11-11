/** Hueco gris con la forma de una pestaña (titulo, recuadro y graficas) mientras se dibuja o se descarga */
export default function Esqueleto() {
  return (
    <section style={{borderTop: 0, paddingTop: 8}} aria-busy="true" aria-label="Cargando">
      <div className="esq esq-titulo" />
      <div className="esq esq-caja" />
      <div className="charts">
        {[0, 1, 2].map((i) => (
          <div key={i} className="esq esq-grafica" />
        ))}
      </div>
    </section>
  );
}
