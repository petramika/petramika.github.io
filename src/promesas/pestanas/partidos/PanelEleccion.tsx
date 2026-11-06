import {esProxima, PEL, type Partido} from './datos';
import ListaPropuestas from './ListaPropuestas';
import Programa from './Programa';
import {proleOf} from './rol';
import {escanosTxt, tituloEleccion} from './textos';

/** Por que no hay datos de un partido en una eleccion */
function motivoAusencia(P: Partido, id: string): [string, string?] {
  const i = PEL.findIndex((x) => x[0] === id), anio = parseInt(id);
  const pos = P.elections.map((x) => PEL.findIndex((y) => y[0] === x.e)).filter((j) => j >= 0);
  // Si ya se presento antes (o despues), existia aunque el año de fundacion diga otra cosa (EH Bildu, Junts...)
  if (anio < P.fundado && !pos.some((j) => j < i)) return [`Aún no existía (se fundó en ${P.fundado}).`, P.fundadoNota];
  if (P.disuelto && anio > P.disuelto && !pos.some((j) => j > i)) return [`Ya no existía (desapareció en ${P.disuelto}).`, P.disueltoNota];
  if (esProxima(id)) return ['No se presenta a estas elecciones generales.'];
  return ['No se presentó a estas elecciones generales.'];
}

/** Lo que se ve en el panel lateral al pulsar una columna del grafico de escaños: todo sobre ese partido en esa eleccion */
export default function PanelEleccion({P, id}: {P: Partido; id: string}) {
  const e = P.elections.find((x) => x.e === id), up = esProxima(id);

  if (!e) {
    const [motivo, nota] = motivoAusencia(P, id);
    return (
      <>
        <p>{motivo}</p>
        {nota && <p className="note">{nota}</p>}
      </>
    );
  }

  const role = proleOf(P, e), seats = escanosTxt(e), n = (e.items || []).length;
  return (
    <>
      <div className="ptl-tags">
        <span className={`chip ${role.cls}`}>{role.t}</span>
        {seats && <span className="chip neutral num">{seats}</span>}
      </div>
      {e.as && <p className="note" style={{margin: '10px 0 0'}}>{up ? 'Se presenta' : 'Se presentó'} como {e.as}.</p>}
      {up ? (
        <p className="note" style={{margin: '6px 0 0'}}>Próximas elecciones: aún no hay resultado.</p>
      ) : (
        !e.seats && e.vote == null && id !== 'sin_generales' && <p className="note" style={{margin: '6px 0 0'}}>Se presentó pero no obtuvo escaño.</p>
      )}
      {e.programa && <Programa p={e.programa} />}
      <h3 className="lat-sec">
        {n ? `${n} ${n === 1 ? 'propuesta' : 'propuestas'}` : 'Propuestas'}
      </h3>
      <ListaPropuestas items={e.items || []} />
    </>
  );
}
