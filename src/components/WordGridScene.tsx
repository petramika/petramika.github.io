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
  /**
   * Percentage of the CELL's own width (cqw), never of the viewport. Sizes
   * in vw ignore the grid's max-width, so on a wide screen the type kept
   * growing after the cells had stopped and words spilled over each other.
   */
  size: number;
  rotate?: number;
  vertical?: boolean;
  /** Held further back until the scroll or the cursor brings it forward */
  late?: boolean;
}

interface Cell {
  id: string;
  /** [start, span] on the 6 x 4 desktop grid */
  col: [number, number];
  row: [number, number];
  /** [start, span] on the 2 x 9 phone grid */
  mCol: [number, number];
  mRow: [number, number];
  align: 'start' | 'center' | 'end';
  words: WordSpec[];
}

/**
 * Both tilings are hand-authored and verified to cover their grid with no
 * gaps and no overlaps. Every repeat is the same size as its lead word or
 * smaller, never larger, so each cell keeps one clear focal point.
 */
const CELLS: Cell[] = [
  {
    id: 'A',
    col: [1, 2],
    row: [1, 2],
    mCol: [1, 2],
    mRow: [1, 2],
    align: 'start',
    words: [
      { text: 'TRAUMA', size: 20 },
      { text: 'TRAUMA', size: 18, rotate: -4 },
      { text: 'TRAUMA', size: 15.5, rotate: -9, late: true },
      { text: 'TRAUMA', size: 13, rotate: -14, late: true },
    ],
  },
  {
    id: 'B',
    col: [3, 2],
    row: [1, 1],
    mCol: [1, 1],
    mRow: [3, 1],
    align: 'center',
    words: [{ text: 'mentiras', size: 13 }],
  },
  {
    id: 'C',
    col: [5, 2],
    row: [1, 2],
    mCol: [2, 1],
    mRow: [3, 2],
    align: 'center',
    words: [
      { text: 'miedo', size: 17, vertical: true },
      { text: 'miedo', size: 17, vertical: true },
      { text: 'rabia', size: 13, vertical: true, late: true },
      { text: 'rabia', size: 10, vertical: true, late: true },
    ],
  },
  {
    id: 'D',
    col: [3, 1],
    row: [2, 2],
    mCol: [1, 1],
    mRow: [4, 1],
    align: 'center',
    words: [
      { text: 'queja', size: 14, rotate: -22 },
      { text: 'mentiras', size: 14, rotate: -22, late: true },
    ],
  },
  {
    id: 'E',
    col: [4, 1],
    row: [2, 2],
    mCol: [1, 1],
    mRow: [5, 2],
    align: 'center',
    words: [
      { text: 'DOLOR.', size: 20 },
      { text: 'dolor.', size: 11, late: true },
      { text: 'dolor.', size: 8.5, late: true },
    ],
  },
  {
    id: 'F',
    col: [1, 1],
    row: [3, 2],
    mCol: [2, 1],
    mRow: [5, 1],
    align: 'end',
    words: [
      { text: 'dolor', size: 22 },
      { text: 'dolor', size: 18, late: true },
      { text: 'dolor', size: 15, late: true },
      { text: 'dolor', size: 12, late: true },
    ],
  },
  {
    id: 'G',
    col: [2, 1],
    row: [3, 1],
    mCol: [2, 1],
    mRow: [6, 1],
    align: 'center',
    words: [{ text: 'rabia', size: 24 }],
  },
  {
    id: 'H',
    col: [5, 2],
    row: [3, 1],
    mCol: [1, 2],
    mRow: [7, 1],
    align: 'center',
    words: [
      { text: 'mentiras', size: 15 },
      { text: 'mentiras', size: 15, late: true },
    ],
  },
  {
    id: 'I',
    col: [2, 1],
    row: [4, 1],
    mCol: [1, 1],
    mRow: [8, 1],
    align: 'center',
    words: [{ text: 'miedo', size: 22, rotate: 12 }],
  },
  {
    id: 'J',
    col: [3, 2],
    row: [4, 1],
    mCol: [2, 1],
    mRow: [8, 1],
    align: 'center',
    words: [
      { text: 'QUEJA', size: 17 },
      { text: 'queja', size: 9, late: true },
    ],
  },
  {
    id: 'K',
    col: [5, 2],
    row: [4, 1],
    mCol: [1, 2],
    mRow: [9, 1],
    align: 'start',
    words: [
      { text: 'mentiras', size: 14 },
      { text: 'dolor', size: 12, late: true },
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

/**
 * Geometry for one side. Every side is always rendered — an earlier version
 * mounted and unmounted them, which meant the CSS transition never had two
 * states to move between and the lines snapped in and out.
 */
function edgeState(cellIndex: number, edgeIndex: number, step: number) {
  const seed = cellIndex * 31 + step * 7 + edgeIndex * 13;
  const visible = hash(seed) >= 0.42;

  // Mostly full sides, sometimes a short bracket
  const partial = hash(seed + 101) < 0.45;
  const length = partial ? 0.26 + hash(seed + 202) * 0.3 : 1;
  const offset = partial ? hash(seed + 303) * (1 - length) : 0;

  return { visible, length, offset };
}

function edgeStyle(edge: Edge, length: number, offset: number): React.CSSProperties {
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const thickness = 2;

  if (edge === 'top' || edge === 'bottom') {
    return { [edge]: 0, left: pct(offset), width: pct(length), height: thickness };
  }
  return { [edge]: 0, top: pct(offset), height: pct(length), width: thickness };
}

/**
 * Chapter II's text slot: a disordered grid of the words the chapter is
 * made of, standing in for the written passage.
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
      className="relative w-full min-h-screen flex items-center justify-center px-4 sm:px-8 py-20"
      aria-label={`Capítulo ${chapter}: miedo, mentiras, trauma, dolor, rabia, queja`}
    >
      <div className="w-full max-w-6xl">
        <div className="word-grid">
          {CELLS.map((cell, i) => {
            // Each cell settles at its own intensity, and lifts on hover
            const emphasis = 0.42 + hash(i * 17 + step * 5) * 0.58;

            return (
              <div
                key={cell.id}
                className="word-grid-cell relative overflow-hidden p-2 sm:p-3"
                style={
                  {
                    '--cell-col': `${cell.col[0]} / span ${cell.col[1]}`,
                    '--cell-row': `${cell.row[0]} / span ${cell.row[1]}`,
                    '--cell-col-mobile': `${cell.mCol[0]} / span ${cell.mCol[1]}`,
                    '--cell-row-mobile': `${cell.mRow[0]} / span ${cell.mRow[1]}`,
                    '--cell-emphasis': emphasis.toFixed(3),
                  } as React.CSSProperties
                }
              >
                {EDGES.map((edge, e) => {
                  const { visible, length, offset } = edgeState(i, e, step);
                  const horizontal = edge === 'top' || edge === 'bottom';

                  return (
                    <span
                      key={edge}
                      aria-hidden="true"
                      data-visible={visible}
                      className={`word-grid-edge ${
                        horizontal ? 'word-grid-edge-h' : 'word-grid-edge-v'
                      }`}
                      style={{
                        ...edgeStyle(edge, length, offset),
                        // Staggered so a re-roll ripples rather than snaps
                        transitionDelay: `${((i * 53 + e * 121) % 9) * 45}ms`,
                      }}
                    />
                  );
                })}

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
                        fontSize: `max(9px, ${word.size}cqw)`,
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
