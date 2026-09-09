import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';

interface BookSpiralSceneProps {
  phrase: string;
  chapter: string;
  index: number;
}

/* Geometry tuned so the full phrase winds round without a single collision */
const CENTRE = { x: 500, y: 348 };
const SPIRAL = {
  r0: 82,
  /** Radius gained per radian */
  k: 26,
  /** Ellipse, not a circle — the ring reads as tilted away from the reader */
  sx: 1.14,
  sy: 0.82,
  fontSize: 24,
  gap: 30,
  /** Fraction of the tangent angle the type follows; full tilt is unreadable */
  damp: 0.26,
};

interface Seat {
  word: string;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  /** 0 at the gutter, 1 at the outermost word */
  t: number;
}

/**
 * Seats the words along an Archimedean spiral, spaced by ARC LENGTH rather
 * than by index.
 *
 * Even angular spacing collides badly: Spanish words here run from two to
 * eleven characters, so a fixed step either overlaps the long ones or leaves
 * gaping holes after the short ones. On a spiral r = r0 + k·θ the arc is
 * ds ≈ r·dθ, so advancing by dθ = needed_width / r gives every word exactly
 * the room it asks for, and the angular step tightens on its own as the
 * radius grows.
 */
function seatWords(phrase: string): Seat[] {
  const words = phrase.split(/\s+/).filter(Boolean);
  const widthOf = (word: string, scale: number) =>
    word.length * SPIRAL.fontSize * 0.52 * scale;

  const seats: Seat[] = [];
  let theta = -Math.PI / 2; // first word heads straight up out of the gutter

  for (let i = 0; i < words.length; i++) {
    const t = words.length > 1 ? i / (words.length - 1) : 0;
    const radius = SPIRAL.r0 + SPIRAL.k * (theta + Math.PI / 2);
    const scale = 0.86 + t * 0.34;

    seats.push({
      word: words[i],
      x: CENTRE.x + Math.cos(theta) * radius * SPIRAL.sx,
      y: CENTRE.y + Math.sin(theta) * radius * SPIRAL.sy,
      rotate: (theta + Math.PI / 2) * (180 / Math.PI) * SPIRAL.damp,
      scale,
      t,
    });

    const next = words[i + 1];
    if (!next) break;
    const needed =
      widthOf(words[i], scale) / 2 + SPIRAL.gap + widthOf(next, scale) / 2;
    theta += needed / Math.max(radius, 40);
  }

  return seats;
}

interface SpiralWordProps {
  seat: Seat;
  /** 0 = every word still inside the book, 1 = whole spiral unwound */
  unfurl: MotionValue<number>;
  floatDelay: number;
}

function SpiralWord({ seat, unfurl, floatDelay }: SpiralWordProps) {
  // Each word waits its turn, so the phrase unwinds outward from the gutter
  const progress = useTransform(unfurl, (u) => {
    const start = seat.t * 0.55;
    return Math.min(1, Math.max(0, (u - start) / 0.45));
  });

  // Travels from the gutter to its seat, so it reads as leaving the book
  const x = useTransform(progress, [0, 1], [CENTRE.x, seat.x]);
  const y = useTransform(progress, [0, 1], [CENTRE.y, seat.y]);
  const scale = useTransform(progress, [0, 1], [0.4, seat.scale]);
  const rotate = useTransform(progress, [0, 1], [0, seat.rotate]);
  const opacity = useTransform(progress, [0, 0.25, 1], [0, 0.55, 1]);

  return (
    <motion.g style={{ x, y, opacity }}>
      {/* Position and drift are separate layers so neither overwrites the
          other's transform */}
      <motion.g style={{ scale, rotate }}>
        <g
          className="spiral-word"
          style={{ animationDelay: `${floatDelay.toFixed(2)}s` }}
        >
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={SPIRAL.fontSize}
            className="font-editorial-display fill-[#141518]"
          >
            {seat.word}
          </text>
        </g>
      </motion.g>
    </motion.g>
  );
}

/**
 * Chapter II's scene: the phrase spirals out of a book and winds back in.
 *
 * Scroll drives the unwinding rather than a timer — the whole essay is read
 * by scrolling, so the words leave the book as you arrive and are drawn back
 * into it as you pass. The gentle float on top is pure CSS, which keeps
 * twenty-odd looping animations off the main thread.
 */
export function BookSpiralScene({ phrase, chapter, index }: BookSpiralSceneProps) {
  const sceneRef = useRef<HTMLElement>(null);
  const seats = seatWords(phrase);

  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ['start end', 'end start'],
  });

  // Out on the way in, back in on the way out
  const unfurl = useTransform(scrollYProgress, [0.1, 0.44, 0.62, 0.95], [0, 1, 1, 0]);

  return (
    <section
      ref={sceneRef}
      id={`chapter-${chapter}-book`}
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
    >
      <svg
        viewBox="0 0 1000 680"
        className="w-full max-w-6xl"
        aria-label={`Capítulo ${chapter}: las palabras salen del libro en espiral`}
        role="img"
      >
        {/* ---- The words, behind the book, so they emerge from inside it -- */}
        <g>
          {seats.map((seat, i) => (
            <SpiralWord
              key={`${seat.word}-${i}`}
              seat={seat}
              unfurl={unfurl}
              // Irregular offsets keep the drift from pulsing in unison
              floatDelay={(i * 0.37) % 4.2}
            />
          ))}
        </g>

        {/* ---- The open book, drawn over the gutter the words come from --- */}
        <g transform={`translate(${CENTRE.x} ${CENTRE.y + 12})`}>
          {/* Page block, two leaves in slight perspective */}
          <path
            d="M0 34 C-26 14 -74 2 -128 -2 L-128 -46 C-74 -42 -26 -30 0 -10 Z"
            fill="#fbfbfb"
            stroke="#141518"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M0 34 C26 14 74 2 128 -2 L128 -46 C74 -42 26 -30 0 -10 Z"
            fill="#fbfbfb"
            stroke="#141518"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Open leaves */}
          <path
            d="M0 -10 C-26 -30 -74 -42 -128 -46 C-96 -74 -44 -88 0 -74 Z"
            fill="#fbfbfb"
            stroke="#141518"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M0 -10 C26 -30 74 -42 128 -46 C96 -74 44 -88 0 -74 Z"
            fill="#fbfbfb"
            stroke="#141518"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Spine */}
          <path
            d="M0 -74 V-10"
            stroke="#141518"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* Ruled lines, fading toward the gutter */}
          <g stroke="#141518" strokeWidth="1.4" strokeLinecap="round" opacity="0.28">
            <path d="M-108 -50 C-78 -46 -42 -38 -16 -24" />
            <path d="M-100 -58 C-72 -55 -40 -48 -18 -36" />
            <path d="M108 -50 C78 -46 42 -38 16 -24" />
            <path d="M100 -58 C72 -55 40 -48 18 -36" />
          </g>
        </g>

        {/* Chapter marker, in the same register as the other slides */}
        <text
          x="500"
          y="646"
          textAnchor="middle"
          fontSize="15"
          letterSpacing="4"
          className="font-editorial-mono fill-[#71717a]"
        >
          [ {String(index + 1).padStart(2, '0')} // EL ECO ] · CAPÍTULO {chapter}
        </text>
      </svg>
    </section>
  );
}
