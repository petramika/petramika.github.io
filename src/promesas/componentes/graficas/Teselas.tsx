import type {ReactNode} from 'react';

/** Fila de cifras grandes con su texto y su fuente (tiles en el original). */
export default function Teselas({list}: {list: [ReactNode, string, ReactNode][]}) {
  return (
    <div className="tiles">
      {list.map(([v, t, src], i) => (
        <div key={i} className="tile">
          <span className="big num">{v}</span>
          <span>{t}</span>
          <span className="srcl">{src}</span>
        </div>
      ))}
    </div>
  );
}
