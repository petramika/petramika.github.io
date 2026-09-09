import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import paperBall1 from '../assets/images/user_paper_ball_1.png';
import paperBall2 from '../assets/images/user_paper_ball_2.png';
import paperBall3 from '../assets/images/user_paper_ball_3.png';

interface LoaderProps {
  /** Extra images to wait for, on top of the loader's own paper */
  sources?: string[];
  onFinished: () => void;
}

/** Long enough that the tear is a reveal and not a flicker */
const MIN_VISIBLE_MS = 1500;
/** A stalled image must never trap the reader behind the veil */
const MAX_WAIT_MS = 10000;

/**
 * The tear, as percentages across the viewport. Hand-tuned rather than
 * random so the teeth stay irregular in a way that reads as torn paper
 * instead of a sawtooth — and so it looks the same on every load.
 *
 * Both halves are clipped along these exact points, which is what makes the
 * two edges mate perfectly before they part.
 */
const TEAR: [number, number][] = [
  [0, 49.5],
  [5, 45.8],
  [9, 51.4],
  [14, 46.6],
  [19, 52.8],
  [24, 47.2],
  [28, 53.1],
  [33, 48.4],
  [38, 52.2],
  [43, 46.2],
  [48, 51.8],
  [53, 45.9],
  [57, 50.9],
  [62, 46.4],
  [67, 52.6],
  [72, 47.8],
  [77, 53.4],
  [81, 48.2],
  [86, 52.1],
  [91, 46.8],
  [96, 51.6],
  [100, 48.6],
];

const point = ([x, y]: [number, number]) => `${x}% ${y}%`;

/* Top half: across the top edge, then right-to-left back along the tear */
const TOP_CLIP = `polygon(0% 0%, 100% 0%, ${[...TEAR].reverse().map(point).join(', ')})`;
/* Bottom half: left-to-right along the tear, then around the bottom edge */
const BOTTOM_CLIP = `polygon(${TEAR.map(point).join(', ')}, 100% 100%, 0% 100%)`;

function preload(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    // Resolve on failure too — a broken image is not a reason to hang
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

export function Loader({ sources = [], onFinished }: LoaderProps) {
  const [isOpening, setIsOpening] = useState(false);

  // Hold the page still while the veil is up
  useEffect(() => {
    document.body.style.overflowY = 'hidden';
    return () => {
      document.body.style.overflowY = '';
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let holdId: number;
    const startedAt = Date.now();

    const waitForImages = Promise.all(
      [paperBall1, paperBall2, paperBall3, ...sources].map(preload),
    );
    const timeout = new Promise<void>((resolve) => {
      window.setTimeout(resolve, MAX_WAIT_MS);
    });

    Promise.race([waitForImages, timeout]).then(() => {
      if (cancelled) return;
      // Let the paper finish at least one slow pass before tearing open
      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
      holdId = window.setTimeout(() => {
        if (!cancelled) setIsOpening(true);
      }, remaining);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(holdId);
    };
    // sources is stable for the life of the loader
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const veilTransition = { duration: 1.15, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <div
      className="loader-veil fixed inset-0 z-100 pointer-events-none overflow-hidden"
      role="status"
      aria-label="Cargando"
    >
      {/* Upper half of the torn curtain */}
      <motion.div
        className="absolute inset-0 bg-[#0a0a0c]"
        style={{ clipPath: TOP_CLIP, WebkitClipPath: TOP_CLIP }}
        initial={{ y: 0 }}
        animate={isOpening ? { y: '-100%' } : { y: 0 }}
        transition={veilTransition}
      />

      {/* Lower half, parting the other way */}
      <motion.div
        className="absolute inset-0 bg-[#0a0a0c]"
        style={{ clipPath: BOTTOM_CLIP, WebkitClipPath: BOTTOM_CLIP }}
        initial={{ y: 0 }}
        animate={isOpening ? { y: '100%' } : { y: 0 }}
        transition={veilTransition}
        onAnimationComplete={() => {
          if (isOpening) onFinished();
        }}
      />

      {/*
        The crumpled paper, turning on itself between the two halves.
        Fade and spin live on separate elements so the endless rotation
        never fights the one-shot exit.
      */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={isOpening ? { opacity: 0, scale: 0.86 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeIn' }}
      >
        <motion.img
          src={paperBall1}
          alt=""
          aria-hidden="true"
          className="block w-[110px] sm:w-[140px] select-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 11, ease: 'linear', repeat: Infinity }}
        />
      </motion.div>
    </div>
  );
}
