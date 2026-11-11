import {useEffect, useState} from 'react';
import {MEDIA} from '../../datos';
import {fmt} from '../../lib/formato';
import {pares, type Serie} from './serie';

/** Colores pensados para el fondo oscuro de «La era de la desinformación» */
const MEDIOS: {k: string; lab: string; c: string}[] = [
  {k: 'tv', lab: 'Televisión', c: '#748FFC'},
  {k: 'internet', lab: 'Internet', c: '#20C997'},
  {k: 'radio', lab: 'Radio', c: '#F59F00'},
  {k: 'diariosNet', lab: 'Diarios en internet', c: '#96F2D7'},
  {k: 'diarios', lab: 'Diarios en papel', c: '#ADB5BD'},
];

const egm = MEDIA.egm as Record<string, Serie>;
const anios = pares(egm.tv).map(([a]) => Number(a));

/** Audiencia diaria de cada medio, año a año, con su linea de tiempo */
export default function AudienciaAnual() {
  const ultimo = anios[anios.length - 1];
  const [anio, setAnio] = useState(ultimo);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    if (!play) return;
    const t = setInterval(() => {
      setAnio((a) => {
        const i = anios.indexOf(a);
        if (i >= anios.length - 1) {
          setPlay(false);
          return a;
        }
        return anios[i + 1];
      });
    }, 500);
    return () => clearInterval(t);
  }, [play]);
  const reproducir = () => {
    if (!play && anio >= ultimo) setAnio(anios[0]);
    setPlay(!play);
  };

  const y = String(anio);
  const presentes = MEDIOS.map((m) => ({...m, v: egm[m.k][y]})).filter((m): m is (typeof MEDIOS)[number] & {v: number} => m.v != null);
  return (
    <div id="med-audiencia-anual" className="era-audiencia">
      <p className="era-f">Qué medios usó cada día la gente de 14 años o más ({anio}). Pulsa ▶ para verlo desde {anios[0]}:</p>
      <div className="tl-anios era-tl" role="group" aria-label="Elegir año">
        <button type="button" className="tl-play" onClick={reproducir} aria-label={play ? 'Pausar' : 'Ver la evolución año a año'}>
          {play ? '❚❚' : '▶'}
        </button>
        <div className="tl-linea">
          {anios.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={a === anio}
              className={a % 10 === 0 || a === anios[0] || a === ultimo ? 'clave' : undefined}
              onClick={() => {
                setPlay(false);
                setAnio(a);
              }}
            >
              <i />
              <span>{a}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="stack tl-barra" style={{height: 30}}>
        {presentes.map((m) => (
          <span key={m.k} style={{flex: m.v, background: m.c}} title={`${m.lab}: ${fmt(m.v, 1)} % de la población`} />
        ))}
      </div>
      <div className="statlegend">
        {MEDIOS.map((m) => {
          const v = egm[m.k][y];
          return (
            <span key={m.k}>
              <i className="sw" style={{background: m.c}} />
              {m.lab}: <b className="num">{v == null ? '—' : fmt(v, 1) + ' %'}</b>
            </span>
          );
        })}
      </div>
      <p className="era-fuente">
        Cada trozo es proporcional a la audiencia de su medio; al lado, el % de la población que lo usó el día anterior. Una persona usa varios, así
        que los porcentajes no suman 100. Mide si se usa el medio, no si se usa para informarse. Fuente: EGM (AIMC).
      </p>
    </div>
  );
}
