import Icono from '../../componentes/Icono';
import Info from '../../componentes/Info';
import {ICONS} from '../../componentes/iconos';
import {TOPIC_INFO, type Tema as TemaT} from './datos';

/** Argumento a favor o en contra, con su (i) si tiene explicacion */
function Argumento({x}: {x: string}) {
  return (
    <li>
      {x}
      {TOPIC_INFO[x] && (
        <>
          {' '}
          <Info html={TOPIC_INFO[x]} />
        </>
      )}
    </li>
  );
}

/** Lo que se ve al desplegar una propuesta: que significa, pros y contras... (topicBody) */
export default function Tema({T}: {T: TemaT}) {
  return (
    <div className="topic">
      <p className="tq">
        <strong>Qué significa.</strong> {T.q}
      </p>
      <div className="pc">
        <div className="pc-pro">
          <h6>✓ Argumentos a favor</h6>
          <ul>
            {T.pro.map((x, i) => <Argumento key={i} x={x} />)}
          </ul>
        </div>
        <div className="pc-con">
          <h6>✕ Argumentos en contra</h6>
          <ul>
            {T.con.map((x, i) => <Argumento key={i} x={x} />)}
          </ul>
        </div>
      </div>
      {T.pay && (
        <p className="tpay">
          <Icono k="imp" size={16} />
          <span>
            <strong>¿Quién lo paga?</strong> {T.pay}
          </span>
        </p>
      )}
      {T.ej && (
        <p className="tej">
          <strong>Precedente.</strong> {T.ej}
        </p>
      )}
      {T.af && T.af.length > 0 && (
        <div className="taf">
          <span>A qué afecta:</span>
          {T.af.map((k) =>
            ICONS[k] ? (
              <span key={k} className="afi">
                <Icono k={k} size={16} />
                {ICONS[k][0]}
              </span>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
