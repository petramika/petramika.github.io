import { useRef } from 'react';
import { useAnimationFrame, useReducedMotion } from 'motion/react';
import { useOnScreen } from '../hooks/useOnScreen';

/**
 * A lava lamp behind the passage: a few large soft masses that drift across
 * each other and keep changing shape, never settling into anything you could
 * call a circle.
 *
 * Each blob is a closed curve sampled in polar coordinates, with three
 * sine terms of different frequency riding on its radius. Because the terms
 * advance at unrelated speeds, the outline is always somewhere between
 * shapes and never repeats — the same trick as the rings in the orrery, but
 * with the wobble turned up until the shape stops being a ring at all.
 *
 * Periods are in the twenties and thirties of seconds, not the minutes the
 * rest of the essay runs on. A boundary this long travels at the speed of
 * its slowest term, and at a minute per cycle it read as a still image.
 *
 * Colour is the one place in the essay that has any, so it does not go
 * through the page's negative: the layer cancels that invert and picks its
 * own palette per mode, a pale periwinkle field on paper and a deep violet
 * one in the dark. Inverting a lavender would have handed us olive.
 */

const POINTS = 96;
const TAU = Math.PI * 2;

interface Blob {
  /** Home position, in the 100 x 100 field */
  cx: number;
  cy: number;
  r: number;
  /** How far it wanders from home, and how long a round trip takes */
  driftX: number;
  driftY: number;
  driftPeriodX: number;
  driftPeriodY: number;
  /** Seconds per cycle for each of the three deformations */
  morph: [number, number, number];
  /** How deep each deformation cuts into the radius */
  depth: [number, number, number];
  seed: number;
  gradient: string;
  opacity: number;
}

/**
 * Four masses, each bigger than the frame and centred at or beyond its
 * edges. That is the whole difference between this and a smudge: what
 * crosses the field is one long, clean curve belonging to a shape too big
 * to see, not a lump of colour floating in the middle. They are also close
 * to opaque, so where two meet you read one passing in front of the other
 * rather than a third muddy colour.
 */
const BLOBS: Blob[] = [
  {
    cx: 12, cy: 8, r: 78, driftX: 16, driftY: 12, driftPeriodX: 52, driftPeriodY: 41,
    morph: [26, 37, 49], depth: [0.13, 0.075, 0.035], seed: 0.6,
    gradient: 'lavaViolet', opacity: 0.95,
  },
  {
    cx: 105, cy: 40, r: 82, driftX: 18, driftY: 14, driftPeriodX: 47, driftPeriodY: 61,
    morph: [31, 43, 55], depth: [0.12, 0.08, 0.04], seed: 2.4,
    gradient: 'lavaBlue', opacity: 0.92,
  },
  {
    cx: 58, cy: 114, r: 86, driftX: 20, driftY: 15, driftPeriodX: 59, driftPeriodY: 44,
    morph: [29, 40, 53], depth: [0.14, 0.07, 0.03], seed: 4.1,
    gradient: 'lavaMauve', opacity: 0.95,
  },
  {
    cx: -8, cy: 86, r: 64, driftX: 15, driftY: 17, driftPeriodX: 38, driftPeriodY: 55,
    morph: [24, 35, 46], depth: [0.15, 0.09, 0.04], seed: 5.7,
    gradient: 'lavaBlue', opacity: 0.9,
  },
];

function blobPath(blob: Blob, t: number) {
  const cx =
    blob.cx + blob.driftX * Math.sin((t * TAU) / blob.driftPeriodX + blob.seed);
  const cy =
    blob.cy + blob.driftY * Math.sin((t * TAU) / blob.driftPeriodY + blob.seed * 1.7);

  let d = '';
  for (let i = 0; i <= POINTS; i += 1) {
    const a = (i / POINTS) * TAU;
    const r =
      blob.r *
      (1 +
        blob.depth[0] * Math.sin(2 * a + blob.seed + (t * TAU) / blob.morph[0]) +
        blob.depth[1] * Math.sin(3 * a - blob.seed * 2 + (t * TAU) / blob.morph[1]) +
        blob.depth[2] * Math.sin(5 * a + blob.seed * 3 - (t * TAU) / blob.morph[2]));
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

export function LavaField() {
  const reduceMotion = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(hostRef);
  const blobRefs = useRef<(SVGPathElement | null)[]>([]);

  useAnimationFrame((elapsed) => {
    if (!onScreen.current) return;
    const t = reduceMotion ? 0 : elapsed / 1000;
    BLOBS.forEach((blob, i) => {
      blobRefs.current[i]?.setAttribute('d', blobPath(blob, t));
    });
  });

  return (
    <div ref={hostRef} className="lava-field pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="lavaBase" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--lava-base-a)" />
            <stop offset="100%" stopColor="var(--lava-base-b)" />
          </linearGradient>
          <linearGradient id="lavaViolet" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="var(--lava-violet-a)" />
            <stop offset="100%" stopColor="var(--lava-violet-b)" />
          </linearGradient>
          <linearGradient id="lavaBlue" x1="0" y1="0.2" x2="1" y2="0.8">
            <stop offset="0%" stopColor="var(--lava-blue-a)" />
            <stop offset="100%" stopColor="var(--lava-blue-b)" />
          </linearGradient>
          <linearGradient id="lavaMauve" x1="0.2" y1="1" x2="0.8" y2="0">
            <stop offset="0%" stopColor="var(--lava-mauve-a)" />
            <stop offset="100%" stopColor="var(--lava-mauve-b)" />
          </linearGradient>

          {/*
            Barely any blur — only enough to take the polygon off the edge.
            At 1.1 it was doing the smudging: the samples are already dense
            enough to read as a smooth curve, and softening a boundary this
            long turns two shapes meeting into one stain.
          */}
          <filter id="lavaSoften" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.35" />
          </filter>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="url(#lavaBase)" />

        <g filter="url(#lavaSoften)">
          {BLOBS.map((blob, i) => (
            <path
              key={`${blob.cx}-${blob.cy}`}
              ref={(el) => {
                blobRefs.current[i] = el;
              }}
              d={blobPath(blob, 0)}
              fill={`url(#${blob.gradient})`}
              opacity={blob.opacity}
            />
          ))}
        </g>
      </svg>

      {/* The field meets the page on the page's own colour, so the passage
          arrives out of the paper instead of out of a pasted-in panel */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[var(--lava-edge)] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--lava-edge)] to-transparent" />
    </div>
  );
}
