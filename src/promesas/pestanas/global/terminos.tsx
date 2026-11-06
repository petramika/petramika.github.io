import type {ReactNode} from 'react';
import {T} from '../../../comun/Glosario';

/*
  Palabras del glosario dentro de textos que vienen de los JSON (etiquetas
  del detalle de cada legislatura).
*/

/** Indicador → clave del glosario, para la etiqueta de su tarjeta */
export const TERMINO_INDICADOR: Record<string, string> = {
  paro: 'tasa-de-paro',
  deuda: 'deuda-publica',
  smi: 'salario-minimo',
  iva: 'iva',
  irpf: 'irpf-maximo',
  pf: 'presion-fiscal',
  part: 'participacion-electoral',
  ipc: 'subida-de-precios',
  anios: 'anios-de-sueldo',
  edad: 'edad-de-emancipacion',
};

const FRASES: Record<string, string> = {
  'mayoría absoluta': 'mayoria-absoluta',
  'gobierno de coalición': 'coalicion',
  'moción de censura': 'mocion-de-censura',
  'sin investidura': 'investidura',
  'en minoría': 'gobierno-en-minoria',
  'cortes disueltas': 'cortes-disueltas',
};
const BUSCA = new RegExp(`(${Object.keys(FRASES).join('|')})`, 'i');

/** «En minoría; moción de censura en 2018» con «En minoría» y «moción de censura» marcadas */
export function conTerminos(txt: string): ReactNode {
  return txt.split(BUSCA).map((parte, i) =>
    i % 2 ? (
      <T key={i} k={FRASES[parte.toLowerCase()]}>
        {parte}
      </T>
    ) : (
      parte
    ),
  );
}
