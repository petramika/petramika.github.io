import { useRef, useState } from 'react';
import { label, pad, texts } from '../data/labels';
import { useMotionValueEvent, useScroll } from 'motion/react';
import { WHEEL } from '../data/wheel';

interface WordGridSceneProps {
  chapter: string;
  index: number;
}


interface WordSpec {
  /** Key into texts.wordGrid: the layout points at the copy, never holds it */
  word: keyof typeof texts.wordGrid;
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
  /** Shouted. Case is typography here, so it stays out of the copy */
  upper?: boolean;
  /** Closed with a full stop, for the same reason */
  stop?: boolean;
}

/** The word as it is set: copy from the JSON, case and punctuation from here */
function setWord(spec: WordSpec): string {
  const base = texts.wordGrid[spec.word];
  return (spec.upper ? base.toUpperCase() : base) + (spec.stop ? '.' : '');
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
      { word: 'trauma', upper: true, size: 20 },
      { word: 'trauma', upper: true, size: 18, rotate: -4 },
      { word: 'trauma', upper: true, size: 15.5, rotate: -9, late: true },
      { word: 'trauma', upper: true, size: 13, rotate: -14, late: true },
    ],
  },
  {
    id: 'B',
    col: [3, 2],
    row: [1, 1],
    mCol: [1, 1],
    mRow: [3, 1],
    align: 'center',
    words: [{ word: 'mentiras', size: 13 }],
  },
  {
    id: 'C',
    col: [5, 2],
    row: [1, 2],
    mCol: [2, 1],
    mRow: [3, 2],
    align: 'center',
    words: [
      { word: 'miedo', size: 17, vertical: true },
      { word: 'miedo', size: 17, vertical: true },
      { word: 'rabia', size: 13, vertical: true, late: true },
      { word: 'rabia', size: 10, vertical: true, late: true },
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
      { word: 'queja', size: 14, rotate: -22 },
      { word: 'mentiras', size: 14, rotate: -22, late: true },
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
      { word: 'dolor', upper: true, stop: true, size: 20 },
      { word: 'dolor', stop: true, size: 11, late: true },
      { word: 'dolor', stop: true, size: 8.5, late: true },
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
      { word: 'dolor', size: 22 },
      { word: 'dolor', size: 18, late: true },
      { word: 'dolor', size: 15, late: true },
      { word: 'dolor', size: 12, late: true },
    ],
  },
  {
    id: 'G',
    col: [2, 1],
    row: [3, 1],
    mCol: [2, 1],
    mRow: [6, 1],
    align: 'center',
    words: [{ word: 'rabia', size: 24 }],
  },
  {
    id: 'H',
    col: [5, 2],
    row: [3, 1],
    mCol: [1, 2],
    mRow: [7, 1],
    align: 'center',
    words: [
      { word: 'mentiras', size: 15 },
      { word: 'mentiras', size: 15, late: true },
    ],
  },
  {
    id: 'I',
    col: [2, 1],
    row: [4, 1],
    mCol: [1, 1],
    mRow: [8, 1],
    align: 'center',
    words: [{ word: 'miedo', size: 22, rotate: 12 }],
  },
  {
    id: 'J',
    col: [3, 2],
    row: [4, 1],
    mCol: [2, 1],
    mRow: [8, 1],
    align: 'center',
    words: [
      { word: 'queja', upper: true, size: 17 },
      { word: 'queja', size: 9, late: true },
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
      { word: 'mentiras', size: 14 },
      { word: 'dolor', size: 12, late: true },
      { word: 'dolor', size: 10, late: true },
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

/** Papers the wall has been hung with over the years */
const PAPERS = ['stripes', 'dots', 'diamonds', 'flowers', 'checks', 'kraft'] as const;

/** A word's colour: the dust's wheel, darkened so it reads as ink on paper */
function ink(cellIndex: number, wordIndex: number): string {
  const rgb = WHEEL[Math.floor(hash(cellIndex * 41 + wordIndex * 23) * WHEEL.length)];
  const [r, g, b] = rgb.split(',').map((v) => Math.round(Number(v) * 0.72));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Where each paper lets go from, and which way it curls */
const CORNERS = [
  { origin: '0% 0%', axis: '1, -1, 0' },
  { origin: '100% 0%', axis: '1, 1, 0' },
  { origin: '0% 100%', axis: '-1, -1, 0' },
  { origin: '100% 100%', axis: '-1, 1, 0' },
];

/**
 * Chapter II's text slot: an old wall hung with paper over paper. The newest
 * layer comes away as the page is read, curling off its corner and falling,
 * and the words are what was on the wall underneath. Scrolling back up
 * pastes it back.
 */
export function WordGridScene({ chapter, index }: WordGridSceneProps) {
  const sceneRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ['start end', 'end start'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const rounded = Math.round(p * 100) / 100;
    setProgress((current) => (current === rounded ? current : rounded));
  });

  // Each paper has its own moment, in a scattered order across the wall
  const order = CELLS.map((_, i) => i).sort((a, b) => hash(a * 7 + 3) - hash(b * 7 + 3));

  return (
    <section
      ref={sceneRef}
      id={`chapter-${chapter}-grid`}
      className="relative w-full h-full flex items-center justify-center px-4 sm:px-8 py-10 sm:py-20"
      aria-label={`Capítulo ${chapter}: miedo, mentiras, trauma, dolor, rabia, queja`}
    >
      <div className="w-full h-full min-h-0 max-w-6xl">
        <div className="paper-wall word-grid">
          {CELLS.map((cell, i) => {
            const rank = order.indexOf(i);
            const peeled = progress > 0.3 + rank * 0.03;
            const under = PAPERS[(i * 5 + 1) % PAPERS.length];
            const over = PAPERS[(i * 5 + 4) % PAPERS.length];
            const corner = CORNERS[Math.floor(hash(i * 13 + 1) * CORNERS.length)];

            return (
              <div
                key={cell.id}
                className="word-grid-cell paper-cell relative"
                style={
                  {
                    '--cell-col': `${cell.col[0]} / span ${cell.col[1]}`,
                    '--cell-row': `${cell.row[0]} / span ${cell.row[1]}`,
                    '--cell-col-mobile': `${cell.mCol[0]} / span ${cell.mCol[1]}`,
                    '--cell-row-mobile': `${cell.mRow[0]} / span ${cell.mRow[1]}`,
                    '--peel-origin': corner.origin,
                    '--peel-axis': corner.axis,
                    '--peel-tilt': `${((hash(i * 29) - 0.5) * 40).toFixed(1)}deg`,
                    '--peel-drift': `${((hash(i * 31) - 0.5) * 60).toFixed(0)}%`,
                  } as React.CSSProperties
                }
              >
                <div className={`paper paper-${under} absolute inset-0 overflow-hidden p-2 sm:p-3`}>
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
                        key={`${word.word}-${w}`}
                        className={`paper-word font-editorial-display font-black leading-[0.94] whitespace-nowrap ${
                          word.late ? 'opacity-70' : ''
                        } ${word.vertical ? 'writing-vertical-270' : ''}`}
                        style={{
                          color: ink(i, w),
                          fontSize: `max(9px, ${word.size}cqw)`,
                          transform: word.rotate ? `rotate(${word.rotate}deg)` : undefined,
                        }}
                      >
                        {setWord(word)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="paper-flap" data-peeled={peeled} aria-hidden="true">
                  <div className="paper-sheet">
                    <div className={`paper paper-face paper-${over}`} />
                    <div className="paper-back" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-[10px] font-editorial-mono uppercase tracking-[0.3em] text-[#71717a] select-none">
          {label(texts.labels.gridEdge, { n: pad(index + 1), chapter })}
        </p>
      </div>
    </section>
  );
}
