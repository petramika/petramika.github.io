import { useRef, useState } from 'react';
import { useMotionValueEvent, useScroll } from 'motion/react';

interface WordGridSceneProps {
  chapter: string;
  index: number;
}

/** How many times the border pattern re-rolls across one pass of the scene */
const STEPS = 5;

interface WordSpec {
  text: string;
  /** Type size in the grid's own scale */
  size: number;
  rotate?: number;
  vertical?: boolean;
  /** Held back until the scroll brings it in */
  late?: boolean;
}

interface Cell {
  id: string;
  /** [start, span] on a 6 x 4 grid — verified to tile with no gaps */
  col: [number, number];
  row: [number, number];
  align: 'start' | 'center' | 'end';
  words: WordSpec[];
}

/**
 * Hand-authored so the composition reads as designed rather than generated:
 * a word repeats at the same size or smaller, never larger, and only a few
 * cells carry a heavy lead word so the page keeps a clear focal order.
 */
const CELLS: Cell[] = [
  {
    id: 'A',
    col: [1, 2],
    row: [1, 2],
    align: 'start',
    words: [
      { text: 'TRAUMA', size: 46 },
      { text: 'TRAUMA', size: 42, rotate: -4 },
      { text: 'TRAUMA', size: 36, rotate: -9, late: true },
      { text: 'TRAUMA', size: 30, rotate: -14, late: true },
    ],
  },
  {
    id: 'B',
    col: [3, 2],
    row: [1, 1],
    align: 'center',
    words: [{ text: 'mentiras', size: 20 }],
  },
  {
    id: 'C',
    col: [5, 2],
    row: [1, 2],
    align: 'center',
    words: [
      { text: 'miedo', size: 38, vertical: true },
      { text: 'miedo', size: 38, vertical: true },
      { text: 'rabia', size: 30, vertical: true, late: true },
      { text: 'rabia', size: 22, vertical: true, late: true },
    ],
  },
  {
    id: 'D',
    col: [3, 1],
    row: [2, 2],
    align: 'center',
    words: [
      { text: 'queja', size: 18, rotate: -22 },
      { text: 'mentiras', size: 18, rotate: -22, late: true },
    ],
  },
  {
    id: 'E',
    col: [4, 1],
    row: [2, 2],
    align: 'center',
    words: [
      { text: 'DOLOR.', size: 34 },
      { text: 'dolor.', size: 17, late: true },
      { text: 'dolor.', size: 13, late: true },
    ],
  },
  {
    id: 'F',
    col: [1, 1],
    row: [3, 2],
    align: 'end',
    words: [
      { text: 'dolor', size: 15 },
      { text: 'dolor', size: 13, late: true },
      { text: 'dolor', size: 11, late: true },
      { text: 'dolor', size: 9, late: true },
    ],
  },
  {
    id: 'G',
    col: [2, 1],
    row: [3, 1],
    align: 'center',
    words: [{ text: 'rabia', size: 26 }],
  },
  {
    id: 'H',
    col: [5, 2],
    row: [3, 1],
    align: 'center',
    words: [
      { text: 'mentiras', size: 22 },
      { text: 'mentiras', size: 22, late: true },
    ],
  },
  {
    id: 'I',
    col: [2, 1],
    row: [4, 1],
    align: 'center',
    words: [{ text: 'miedo', size: 16, rotate: 12 }],
  },
  {
    id: 'J',
    col: [3, 2],
    row: [4, 1],
    align: 'center',
    words: [
      { text: 'QUEJA', size: 30 },
      { text: 'queja', size: 15, late: true },
    ],
  },
  {
    id: 'K',
    col: [5, 2],
    row: [4, 1],
    align: 'start',
    words: [
      { text: 'dolor', size: 13 },
      { text: 'mentiras', size: 13, late: true },
      { text: 'dolor', size: 10, late: true },
    ],
  },
];

/**
 * Deterministic pseudo-random: the same (cell, edge, step) always yields the
 * same value, so a pattern is stable while you sit still and only changes
 * when the scroll crosses into the next step. A live RNG would flicker on
 * every render.
 */
function hash(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

type Edge = 'top' | 'right' | 'bottom' | 'left';
const EDGES: Edge[] = ['top', 'right', 'bottom', 'left'];

interface EdgeSpec {
  edge: Edge;
  /** Fraction of the side the line covers, and where it starts */
  length: number;
  offset: number;
}

/** Not every side is drawn, and the ones that are may be partial brackets */
function edgesFor(cellIndex: number, step: number): EdgeSpec[] {
  const base = cellIndex * 31 + step * 7;

  return EDGES.map((edge, e) => {
    const seed = base + e * 13;
    if (hash(seed) < 0.42) return null;

    // Mostly full sides, sometimes a short bracket
    const partial = hash(seed + 101) < 0.45;
    const length = partial ? 0.26 + hash(seed + 202) * 0.3 : 1;
    const offset = partial ? hash(seed + 303) * (1 - length) : 0;

    return { edge, length, offset };
  }).filter((spec): spec is EdgeSpec => spec !== null);
}

function edgeStyle({ edge, length, offset }: EdgeSpec): React.CSSProperties {
  const thickness = 2;
  const pct = (v: number) => `${v * 100}%`;

  if (edge === 'top' || edge === 'bottom') {
    return {
      [edge]: 0,
      left: pct(offset),
      width: pct(length),
      height: thickness,
    };
  }
  return {
    [edge]: 0,
    top: pct(offset),
    height: pct(length),
    width: thickness,
  };
}

/**
 * Chapter II's visual slot: a disordered grid of the words the chapter is
 * made of.
 *
 * Everything is drawn in the page's ink colour, so the negative-mode filter
 * flips the whole thing on its own — black on white becomes white on black
 * without a single conditional.
 */
export function WordGridScene({ chapter, index }: WordGridSceneProps) {
  const sceneRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ['start end', 'end start'],
  });

  // Discrete steps, so the pattern re-rolls a handful of times per pass
  // instead of thrashing on every scroll event
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const next = Math.min(STEPS - 1, Math.max(0, Math.floor(p * STEPS)));
    setStep((current) => (current === next ? current : next));
  });

  return (
    <section
      ref={sceneRef}
      id={`chapter-${chapter}-grid`}
      className="relative w-full min-h-screen flex items-center justify-center px-4 sm:px-8 py-16"
      aria-label={`Capítulo ${chapter}: miedo, mentiras, trauma, dolor, rabia, queja`}
    >
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-6 grid-rows-4 gap-2 sm:gap-3 h-[74vh] min-h-[440px]">
          {CELLS.map((cell, i) => {
            const specs = edgesFor(i, step);
            // Each cell settles at its own intensity, and lifts on hover
            const emphasis = 0.42 + hash(i * 17 + step * 5) * 0.58;

            return (
              <div
                key={cell.id}
                className="word-grid-cell relative overflow-hidden p-2 sm:p-3"
                style={{
                  gridColumn: `${cell.col[0]} / span ${cell.col[1]}`,
                  gridRow: `${cell.row[0]} / span ${cell.row[1]}`,
                  ['--cell-emphasis' as string]: emphasis.toFixed(3),
                }}
              >
                {specs.map((spec) => (
                  <span
                    key={spec.edge}
                    aria-hidden="true"
                    className="absolute bg-[#141518] transition-opacity duration-700 ease-out"
                    style={edgeStyle(spec)}
                  />
                ))}

                <div
                  className={`relative h-full flex ${
                    cell.words[0]?.vertical ? 'flex-row gap-1' : 'flex-col'
                  } ${
                    cell.align === 'start'
                      ? 'items-start justify-start'
                      : cell.align === 'end'
                        ? 'items-end justify-end'
                        : 'items-center justify-center'
                  }`}
                >
                  {cell.words.map((word, w) => (
                    <span
                      key={`${word.text}-${w}`}
                      className={`word-grid-word font-editorial-display font-black text-[#141518] leading-[0.94] whitespace-nowrap ${
                        word.late ? 'word-grid-late' : ''
                      } ${word.vertical ? 'writing-vertical-270' : ''}`}
                      style={{
                        fontSize: `clamp(9px, ${word.size / 10}vw, ${word.size * 1.6}px)`,
                        transform: word.rotate ? `rotate(${word.rotate}deg)` : undefined,
                      }}
                    >
                      {word.text}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-[10px] font-editorial-mono uppercase tracking-[0.3em] text-[#71717a] select-none">
          [ {String(index + 1).padStart(2, '0')} // INVENTARIO ] · CAPÍTULO {chapter}
        </p>
      </div>
    </section>
  );
}
