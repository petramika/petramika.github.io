import {T} from '../../../comun/Glosario';
import {PARTY, type Legislatura} from '../../datos';

/* Legislaturas sin investidura: quien mandaba y como fueron las votaciones (enfBlock y voteBar). */

type Votacion = {who: string; d: string; si: number; no: number; abs: number; need: string};

function BarraVoto({v}: {v: Votacion}) {
  const aus = 350 - v.si - v.no - v.abs, pct = (n: number) => ((n / 350) * 100).toFixed(2) + '%';
  const seg = (n: number, c: string, t: string) => (n ? <span style={{width: pct(n), background: c}} title={`${t}: ${n}`} /> : null);
  return (
    <div className="vote">
      <div className="vote-top">
        <strong>
          {v.who} · {v.d}
        </strong>
        <span className="chip ko">✕ No investido</span>
      </div>
      <div className="vbar">
        {seg(v.si, 'var(--ok)', 'Sí')}
        {seg(v.no, 'var(--ko)', 'No')}
        {seg(v.abs, 'var(--wip-bar)', 'Abstención')}
        {seg(aus, 'var(--line)', 'Ausentes')}
        <i style={{left: pct(176)}} />
      </div>
      <div className="vleg">
        <span><i className="sw" style={{background: 'var(--ok)'}} />Sí <b className="num">{v.si}</b></span>
        <span><i className="sw" style={{background: 'var(--ko)'}} />No <b className="num">{v.no}</b></span>
        <span><i className="sw" style={{background: 'var(--wip-bar)'}} />Abstención <b className="num">{v.abs}</b></span>
        <span className="note" style={{margin: 0}}>{v.need} · la línea marca 176</span>
      </div>
    </div>
  );
}

export default function EnFunciones({l}: {l: Legislatura}) {
  const e = l.enf, c = PARTY[e.p].c;
  return (
    <>
      <h2>Entonces, ¿quién mandaba?</h2>
      <div className="enf" style={{borderColor: c}}>
        <div className="enf-who">
          <span className="tag gov" style={{background: c}}>{PARTY[e.p].n}</span>
          <strong style={{fontSize: 20}}>Gobierno en funciones de {e.who}</strong>
        </div>
        <div className="enf-days">
          <span className="num big">{e.dias}</span>
          <span>
            días en funciones
            <br />
            <span className="note" style={{margin: 0}}>del {e.desde} al {e.hasta}</span>
          </span>
        </div>
        <p className="note" style={{maxWidth: 'none'}}>{e.nota}</p>
      </div>
      <div className="can">
        <div className="box">
          <h3 style={{color: 'var(--ok)'}}>✓ Lo que sí puede hacer</h3>
          <ul>
            <li>Gestionar el día a día: pagar pensiones, nóminas y servicios</li>
            <li>Aprobar <T k="real-decreto-ley">decretos-ley</T> si hay urgencia</li>
            <li>Usar los <T k="presupuestos">Presupuestos</T> prorrogados del año anterior</li>
            <li>Representar a España en la UE y fuera</li>
          </ul>
        </div>
        <div className="box">
          <h3 style={{color: 'var(--ko)'}}>✕ Lo que no puede hacer</h3>
          <ul>
            <li>Presentar Presupuestos nuevos</li>
            <li>Presentar proyectos de ley al Congreso</li>
            <li>
              Sufrir una <T k="mocion-de-censura">moción de censura</T> ni pedir una <T k="cuestion-de-confianza">cuestión de confianza</T>
            </li>
            <li>Convocar elecciones por su cuenta</li>
          </ul>
        </div>
      </div>
      <p className="note">Lo dice la Ley 50/1997 del Gobierno (artículo 21): un <T k="en-funciones">Gobierno en funciones</T> se limita al «despacho ordinario de los asuntos públicos».</p>
      <h3 style={{marginTop: 24}}>
        Las votaciones de <T k="investidura">investidura</T>
      </h3>
      <div className="votes">
        {l.votes.map((v: Votacion, i: number) => (
          <BarraVoto key={i} v={v} />
        ))}
      </div>
      <h3 style={{marginTop: 24}}>Qué pasó, paso a paso</h3>
      <ol className="tl">
        {l.events.map(([d, k, t]: [string, string, string], i: number) => (
          <li key={i}>
            <span className="tl-d num">{d}</span>
            <span className="tl-k">{k}</span>
            <span className="tl-t">{t}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
