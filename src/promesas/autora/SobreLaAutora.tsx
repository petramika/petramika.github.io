import {ProveedorGlosario, Texto} from '../../comun/Glosario';
import Pie from '../../comun/Pie';
import {GLOSARIO} from '../datos/glosario';
import GraficaReformas from './GraficaReformas';
import Info from '../componentes/Info';
import textos from '../datos/autora/textos.json';
import BotonTema from '../../comun/tema';

/* Sobre la autora: por que existe la web y que preguntarse antes de votar. Los textos estan en datos/autora/textos.json. */
/** Una pregunta puede llevar una (i) larga que se abre en el panel lateral */
type Pregunta = string | {texto: string; infoEtiqueta: string; infoTitulo: string; info: string[]; infoEnlace?: {texto: string; url: string}; grafica?: string};

export default function SobreLaAutora() {
  return (
    <ProveedorGlosario glosario={GLOSARIO}>
    <div className="wrap">
      <BotonTema />
      <div className="top">
        <div className="eyebrow">España política en datos</div>
      </div>
      <h1>Sobre la autora</h1>

      {/* El texto, en dos columnas como un periodico; acaba con el cierre */}
      <div className="texto-cols">
        {textos.intro.map((p, i) => (
          <p key={i} className="lead">{p}</p>
        ))}
        {textos.cierre.map((p, i) => (
          <p key={'c' + i} className="lead">
            {p}
          </p>
        ))}
      </div>

      {/* Las preguntas a un lado y los consejos al otro */}
      <div className="dos-cols">
        <section>
          <h2>{textos.preguntasTitulo}</h2>
          <ul className="tips">
            {(textos.preguntas as Pregunta[]).map((q, i) =>
              typeof q === 'string' ? (
                <li key={i}>{q}</li>
              ) : (
                <li key={i}>
                  <span>
                    {q.texto}{' '}
                    <Info etiqueta={q.infoEtiqueta} titulo={q.infoTitulo} antetitulo="Para pensar" ancho={380}>
                      {q.info.map((p, j) => (
                        <p key={j}>{p}</p>
                      ))}
                      {q.grafica === 'reformas' && <GraficaReformas />}
                      {q.infoEnlace && (
                        <p className="srcl">
                          <a href={q.infoEnlace.url}>{q.infoEnlace.texto} ↗</a>
                        </p>
                      )}
                    </Info>
                  </span>
                </li>
              ),
            )}
          </ul>
        </section>
        <section>
          <h2>{textos.consejosTitulo}</h2>
          <ul className="tips">
            {/* Los consejos pueden llevar palabras del glosario: [[democracia]] */}
            {textos.consejos.map((c, i) => (
              <li key={i}>
                <span>
                  <Texto>{c}</Texto>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <Pie marca="España política en datos" />
    </div>
    </ProveedorGlosario>
  );
}
