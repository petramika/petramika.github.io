import Info from '../../componentes/Info';
import Medios from './Medios';
import AudienciaAnual from './AudienciaAnual';
import CuestionesMedios from './CuestionesMedios';
import {T} from '../../../comun/Glosario';
import {MEDIA} from '../../datos';
import {fmt} from '../../lib/formato';
import {maximo, ultimo} from './serie';

// Cifras del recuadro, siempre del ultimo dato de medios.json
const [anioPreocupa, preocupa] = ultimo(MEDIA.preocupa);
const preocupaEsMaximo = maximo(MEDIA.preocupa)[1] === preocupa;

export default function PestanaMedios() {
  return (
    <section style={{borderTop: 0, paddingTop: 8}}>
      <h2>
        Cómo nos informamos, y cuánto nos fiamos{' '}
        <Info>
          No existe una medida de «cuánta información verdadera y cuánta falsa» ha circulado en España en 40 años: nadie lo ha contado así. Lo que
          sí hay son indicadores con fuente: cuántos medios hay y cuánta gente los lee, dónde se informa la gente, cuánto se fía, cuántos{' '}
          <T k="bulo">bulos</T> desmienten los <T k="verificador">verificadores</T>, cuánto gasta el Gobierno en publicidad en los medios y qué
          dicen los índices independientes de libertad de prensa. Esta página no clasifica medios concretos.
        </Info>
      </h2>
      <aside className="era" aria-label="La era de la desinformación">
        <p className="era-k">
          La era de la desinformación{' '}
          <Info titulo="Qué dicen los filósofos de la desinformación" antetitulo="Para pensar">
            <p>
              <b>Byung-Chul Han</b> (1959–), filósofo coreano que vive en Alemania, llama a nuestra época «infocracia» (en su libro «Infocracia»,
              2021). Recibimos tanta información, tan deprisa y en trozos tan pequeños, que ya no la pensamos: la consumimos. No da tiempo a
              comprobar ni a discutir con calma, y lo que más se difunde no es lo más cierto, sino lo que más emociona. Para él, el exceso de
              información no nos hace más sabios, sino que deshace la verdad en ruido.
            </p>
            <p>
              <b>Hannah Arendt</b> (1906–1975) ya lo avisó en «Verdad y política» (1967): cuando las mentiras sustituyen a los hechos de forma
              constante, el peligro no es que acabemos creyéndonos la mentira, sino que perdamos la capacidad de distinguir lo verdadero de lo
              falso, que es lo que nos permite orientarnos en el mundo. Sin hechos compartidos, decía, no hay forma de discutir ni de decidir juntos.
            </p>
            <p>
              Los dos coinciden en algo: el problema no es solo cada bulo, sino que nos cansemos de buscar la verdad y nos quedemos con lo que nos
              da la razón.
            </p>
            <p className="srcl">
              <a href="/historia-filosofia-tldr/#byung-chul-han">Byung-Chul Han</a> y <a href="/historia-filosofia-tldr/#hannah-arendt">Hannah Arendt</a> en
              Filosofía comprimida ↗ · Resumen propio de sus ideas, no citas literales.
            </p>
          </Info>
        </p>
        <p className="era-q">
          Nunca hemos tenido tanta información al alcance de la mano y, sin embargo, cuando más falta nos hace estar bien informados, más difícil
          es encontrar información fiable: el <b className="num">{fmt(preocupa, 0)} %</b> teme no distinguir lo real de lo falso en internet (
          {preocupaEsMaximo ? 'máximo histórico, ' : ''}
          {anioPreocupa}).
        </p>
        <AudienciaAnual />
        <p className="era-f">
          Más canales no significa más información: significa más ruido. Por eso importa preguntarse siempre quién dice algo, de dónde lo saca y
          quién gana si nos lo creemos.
        </p>
      </aside>
      <Medios />
      <CuestionesMedios />
    </section>
  );
}
