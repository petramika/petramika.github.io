import Pie from '../../comun/Pie';
import {useState} from 'react';
import D from '../datos/fuentes/fuentes.json';
// El mismo JSON, publicado como fichero para descargarlo tal cual
import urlJson from '../datos/fuentes/fuentes.json?url';
import BotonTema from '../../comun/tema';

/* De donde salen los datos: metodo, datos dudosos y fuentes por seccion, con buscador. */
type Fuente = {nombre: string; url: string; tipo: string; nota?: string};
type Bloque = {dato: string; detalle?: string; verificado?: string; fuentes: Fuente[]};

function Verificado({v}: {v?: string}) {
  if (!v) return null;
  const c = /^sí$/.test(v) ? 'ok' : /sí|oficial|según|parcial/.test(v) ? 'half' : '';
  return <span className={`chip ${c}`}>Verificado: {v}</span>;
}

export default function Fuentes() {
  const [q, setQ] = useState('');
  const busca = q.toLowerCase().trim();
  const coincide = (b: Bloque) => !busca || JSON.stringify(b).toLowerCase().includes(busca);

  return (
    <div className="wrap">
      <BotonTema />
      <div className="top">
        <div className="eyebrow">España política en datos</div>
      </div>
      <h1>De dónde salen los datos</h1>
      <p className="note">
        Todas las fuentes, sección por sección. Prioridad a organismos oficiales (INE, Banco de España, BOE, Agencia Tributaria, Ministerios,
        Eurostat, OCDE, CIS). Cuando no hay dato oficial se indica si la fuente es académica, de un verificador, del sector o de prensa. Los mismos
        datos están en formato abierto en <a href={urlJson} download="fuentes.json">fuentes.json</a>. Actualizado:{' '}
        <span className="num">{D.actualizado}</span>.
      </p>
      <div className="filter">
        <label htmlFor="q" className="note">Buscar:</label>
        <input id="q" type="search" placeholder="paro, IVA, BOE, inmigración…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div id="out">
        <h2>Cómo se han hecho los cálculos</h2>
        <div className="box">
          <ul>{D.metodo.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
        <h2>Datos que no son 100 % seguros</h2>
        <div className="box warn">
          <ul>{D.no_seguros.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>

        {D.secciones.map((s) => {
          const bs = (s.bloques as Bloque[]).filter(coincide);
          if (!bs.length) return null;
          return (
            <section key={s.seccion}>
              <h2>{s.seccion}</h2>
              {bs.map((b, i) => (
                <div key={i} className="blk">
                  <div className="bh">
                    <h3>{b.dato}</h3>
                    <Verificado v={b.verificado} />
                  </div>
                  {b.detalle && <p className="det">{b.detalle}</p>}
                  <ul className="srcs">
                    {b.fuentes.map((f, j) => (
                      <li key={j}>
                        <span className={`t ${f.tipo === 'oficial' ? 'oficial' : ''}`}>{f.tipo}</span>
                        <span>
                          <a href={f.url} target="_blank" rel="noopener">{f.nombre}</a>
                          {f.nota && <span className="sn">{f.nota}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          );
        })}
      </div>
      <Pie marca="España política en datos" />
    </div>
  );
}
