import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';

interface BookEchoSceneProps {
  phrase: string;
  subtext?: string;
  chapter: string;
  index: number;
}

const VIEWBOX = { w: 1000, h: 820 };
/** The gutter the words leave from and return to */
const BOOK = { x: 238, y: 400 };

const SERPENTINE = {
  yTop: 74,
  yBottom: 748,
  xMid: 686,
  amp: 196,
  waves: 2.15,
  fontSize: 22,
  /**
   * Hard cap on the tilt. An earlier version aligned each word to the
   * tangent of its path, which ran past 90° and left whole words upside
   * down. Following the curve is worth nothing if the text stops reading.
   */
  maxTilt: 13,
};

interface Seat {
  word: string;
  x: number;
  y: number;
  rotate: number;
  /** 0 at the first word, 1 at the last */
  t: number;
}

/**
 * Lays the phrase down the right-hand side as a slow vertical wave.
 *
 * Reading order is plain top-to-bottom, and the horizontal offset between
 * neighbours means the 30px line step never crowds: verified at zero
 * overlaps for this phrase, with nothing straying over the book.
 */
function seatWords(phrase: string): Seat[] {
  const words = phrase.split(/\s+/).filter(Boolean);

  return words.map((word, i) => {
    const t = words.length > 1 ? i / (words.length - 1) : 0;
    const phase = t * Math.PI * 2 * SERPENTINE.waves;
    const tilt = -Math.cos(phase) * SERPENTINE.maxTilt;

    return {
      word,
      x: SERPENTINE.xMid + Math.sin(phase) * SERPENTINE.amp,
      y: SERPENTINE.yTop + t * (SERPENTINE.yBottom - SERPENTINE.yTop),
      rotate: Math.max(-SERPENTINE.maxTilt, Math.min(SERPENTINE.maxTilt, tilt)),
      t,
    };
  });
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);

  return matches;
}

/** The open book, drawn at the origin so callers can place it */
function OpenBook({ scale = 1 }: { scale?: number }) {
  return (
    <g transform={`scale(${scale})`} strokeLinejoin="round" strokeLinecap="round">
      {/* Page block under each leaf, giving the book its thickness */}
      <path
        d="M-150 26 L-150 40 C-92 38 -32 50 0 70 L0 56 C-32 36 -92 24 -150 26 Z"
        fill="#fbfbfb"
        stroke="#141518"
        strokeWidth="3"
      />
      <path
        d="M150 26 L150 40 C92 38 32 50 0 70 L0 56 C32 36 92 24 150 26 Z"
        fill="#fbfbfb"
        stroke="#141518"
        strokeWidth="3"
      />

      {/* The two open leaves, sloping down to meet at the spine */}
      <path
        d="M0 -6 C-32 -26 -92 -38 -150 -36 L-150 26 C-92 24 -32 36 0 56 Z"
        fill="#fbfbfb"
        stroke="#141518"
        strokeWidth="3"
      />
      <path
        d="M0 -6 C32 -26 92 -38 150 -36 L150 26 C92 24 32 36 0 56 Z"
        fill="#fbfbfb"
        stroke="#141518"
        strokeWidth="3"
      />

      {/* Spine */}
      <path d="M0 -6 V56" stroke="#141518" strokeWidth="2.6" fill="none" />

      {/* Ruled lines, lifting off the page toward the outer edge */}
      <g stroke="#141518" strokeWidth="1.5" fill="none" opacity="0.26">
        <path d="M-28 30 C-64 22 -108 14 -136 14" />
        <path d="M-28 16 C-64 8 -108 0 -136 0" />
        <path d="M-28 2 C-64 -6 -108 -14 -136 -14" />
        <path d="M28 30 C64 22 108 14 136 14" />
        <path d="M28 16 C64 8 108 0 136 0" />
        <path d="M28 2 C64 -6 108 -14 136 -14" />
      </g>
    </g>
  );
}

interface EchoWordProps {
  seat: Seat;
  /** 0 = still inside the book, 1 = out on the wave */
  unfurl: MotionValue<number>;
  floatDelay: number;
}

function EchoWord({ seat, unfurl, floatDelay }: EchoWordProps) {
  // Staggered by position, so the phrase spills out in reading order
  const progress = useTransform(unfurl, (u) => {
    const start = seat.t * 0.5;
    return Math.min(1, Math.max(0, (u - start) / 0.5));
  });

  const x = useTransform(progress, [0, 1], [BOOK.x, seat.x]);
  const y = useTransform(progress, [0, 1], [BOOK.y, seat.y]);
  const scale = useTransform(progress, [0, 1], [0.35, 1]);
  const rotate = useTransform(progress, [0, 1], [0, seat.rotate]);
  const opacity = useTransform(progress, [0, 0.3, 1], [0, 0.5, 1]);

  return (
    <motion.g style={{ x, y, opacity }}>
      {/* Placement and drift stay on separate layers so neither transform
          overwrites the other */}
      <motion.g style={{ scale, rotate }}>
        <g className="echo-word" style={{ animationDelay: `${floatDelay.toFixed(2)}s` }}>
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={SERPENTINE.fontSize}
            className="font-editorial-display fill-[#141518]"
          >
            {seat.word}
          </text>
        </g>
      </motion.g>
    </motion.g>
  );
}

/** Phone layout: the book reads as an illustration, the phrase as type */
function CompactBookEcho({ phrase, subtext, chapter, index }: BookEchoSceneProps) {
  return (
    <section
      id={`chapter-${chapter}-book`}
      className="relative w-full min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center"
    >
      <svg viewBox="-190 -80 380 170" className="w-56 mb-12" role="presentation">
        <OpenBook />
      </svg>

      <blockquote className="font-editorial-display font-black text-3xl sm:text-4xl text-[#141518] leading-[1.08] tracking-[-0.04em] max-w-xl mb-6">
        {phrase}
      </blockquote>

      {subtext && (
        <p className="font-sans-clean text-base text-[#52525b] leading-relaxed max-w-md font-light">
          {subtext}
        </p>
      )}

      <span className="mt-12 text-[10px] font-editorial-mono uppercase tracking-[0.3em] text-[#71717a]">
        [ {String(index + 1).padStart(2, '0')} // EL ECO ] · CAPÍTULO {chapter}
      </span>
    </section>
  );
}

function SerpentineBookEcho({ phrase, subtext, chapter, index }: BookEchoSceneProps) {
  const sceneRef = useRef<HTMLElement>(null);
  const seats = seatWords(phrase);

  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ['start end', 'end start'],
  });

  // Out of the book on the way in, drawn back into it on the way out
  const unfurl = useTransform(scrollYProgress, [0.1, 0.44, 0.62, 0.95], [0, 1, 1, 0]);

  return (
    <section
      ref={sceneRef}
      id={`chapter-${chapter}-book`}
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden px-6"
    >
      <svg
        viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
        className="w-full max-w-6xl"
        role="img"
        aria-label={`Capítulo ${chapter}. ${phrase}`}
      >
        {/* The book, holding the left half of the spread */}
        <g transform={`translate(${BOOK.x} ${BOOK.y})`}>
          <OpenBook />
        </g>

        {subtext && (
          <foreignObject x="48" y="516" width="380" height="180">
            <p className="font-sans-clean text-[15px] leading-relaxed text-[#52525b] font-light">
              {subtext}
            </p>
          </foreignObject>
        )}

        {/* The phrase, snaking down the right */}
        <g aria-hidden="true">
          {seats.map((seat, i) => (
            <EchoWord
              key={`${seat.word}-${i}`}
              seat={seat}
              unfurl={unfurl}
              // Irregular offsets stop the drift pulsing in unison
              floatDelay={(i * 0.37) % 4.2}
            />
          ))}
        </g>

        <text
          x="48"
          y="742"
          fontSize="14"
          letterSpacing="4"
          className="font-editorial-mono fill-[#71717a]"
        >
          [ {String(index + 1).padStart(2, '0')} // EL ECO ] · CAPÍTULO {chapter}
        </text>
      </svg>
    </section>
  );
}

/**
 * Chapter II's scene: the book on the left, the phrase spilling out of it
 * and snaking down the right.
 *
 * This scene IS the chapter — the phrase is not repeated as a text slide
 * underneath. On a phone the wave would shrink the type past reading size,
 * so narrow screens get the book as an illustration with the phrase set
 * normally beneath it.
 */
export function BookEchoScene(props: BookEchoSceneProps) {
  const isCompact = useMediaQuery('(max-width: 767px)');

  return isCompact ? <CompactBookEcho {...props} /> : <SerpentineBookEcho {...props} />;
}
