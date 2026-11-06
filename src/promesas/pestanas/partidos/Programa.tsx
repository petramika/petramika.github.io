import type {EleccionPartido} from './datos';

/** Enlace al programa electoral, o donde buscarlo si no esta disponible */
export default function Programa({p}: {p: NonNullable<EleccionPartido['programa']>}) {
  return p.estado === 'disponible' && p.url ? (
    <p className="note" style={{margin: '6px 0 0'}}>
      Programa:{' '}
      <a href={p.url} target="_blank" rel="noopener">
        documento original ↗
      </a>
    </p>
  ) : (
    <p className="note" style={{margin: '6px 0 0'}}>
      Programa no disponible{p.donde ? ' · ' + p.donde : ''}
    </p>
  );
}
