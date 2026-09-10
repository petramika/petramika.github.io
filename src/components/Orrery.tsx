import { ReactElement, useMemo, useRef } from 'react';
import { useAnimationFrame, useReducedMotion } from 'motion/react';

/**
 * A very small planetarium. Concentric rings turn around a dark core, and
 * where an orrery would carry planets this one carries a dragonfly, a
 * butterfly, a beetle, a mantis, a sneaker and a piece of nigiri — each
 * riding its own ring.
 *
 * Nothing here is drawn true. The rings are slightly out of round and each
 * one sits a little off the centre, so their slow precession is visible as a
 * wobble rather than as a circle spinning inside itself — a perfect circle
 * rotating about its own centre shows no motion at all.
 */

/** Samples per ring — enough that the out-of-round curve stays smooth */
const POINTS = 120;
const TAU = Math.PI * 2;

interface Orbit {
  /** Mean radius, in the 200-unit viewBox */
  r: number;
  /** Centre offset, so the ring is not concentric with the core */
  cx: number;
  cy: number;
  /** Seeds the out-of-round distortion */
  wobble: number;
  /** Radians per second along the ring */
  speed: number;
  /** Degrees per second the whole ring precesses */
  precess: number;
  /** Where its rider starts */
  phase: number;
  strokeWidth: number;
  rider?: Rider;
  riderScale?: number;
}

type Rider = 'dragonfly' | 'butterfly' | 'beetle' | 'mantis' | 'sneaker' | 'sushi';

/**
 * Inner rings run faster, the way they would in a real orrery, but every
 * period is measured in minutes: the whole piece should look still until you
 * notice it isn't. Precession alternates direction so the stack never locks
 * into one rigid shape.
 */
const ORBITS: Orbit[] = [
  { r: 24, cx: 1.5, cy: -1, wobble: 0.4, speed: TAU / 52, precess: 0.9, phase: 2.1, strokeWidth: 1.3, rider: 'beetle', riderScale: 0.82 },
  { r: 39, cx: -2, cy: 1.5, wobble: 1.9, speed: TAU / 71, precess: -0.65, phase: 0.6, strokeWidth: 1.4, rider: 'sushi', riderScale: 0.86 },
  { r: 54, cx: 2.5, cy: 2, wobble: 3.3, speed: TAU / 92, precess: 0.48, phase: 3.9, strokeWidth: 1.45, rider: 'dragonfly', riderScale: 0.92 },
  { r: 69, cx: -1.5, cy: -2.5, wobble: 4.8, speed: TAU / 116, precess: -0.34, phase: 1.4, strokeWidth: 1.55, rider: 'mantis', riderScale: 0.9 },
  { r: 84, cx: 1, cy: 1, wobble: 5.9, speed: TAU / 143, precess: 0.24, phase: 5.2, strokeWidth: 1.6, rider: 'sneaker', riderScale: 0.88 },
  { r: 98, cx: -1, cy: 2, wobble: 2.6, speed: TAU / 176, precess: -0.17, phase: 3.1, strokeWidth: 1.7, rider: 'butterfly', riderScale: 0.96 },
];

/** The ring's radius at one angle: round, but never quite */
function radiusAt(orbit: Orbit, angle: number) {
  return (
    orbit.r *
    (1 +
      0.03 * Math.sin(3 * angle + orbit.wobble) +
      0.018 * Math.sin(5 * angle - orbit.wobble * 1.7))
  );
}

function pointAt(orbit: Orbit, angle: number) {
  const r = radiusAt(orbit, angle);
  return {
    x: orbit.cx + r * Math.cos(angle),
    y: orbit.cy + r * Math.sin(angle),
  };
}

function ringPath(orbit: Orbit) {
  let d = '';
  for (let i = 0; i <= POINTS; i += 1) {
    const { x, y } = pointAt(orbit, (i / POINTS) * TAU);
    d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

/* -------------------------------------------------------------
   THE RIDERS

   Each is drawn head-up in its own ±10 unit box and scaled down onto its
   ring, so the loop only has to place and turn a single group. At this size
   a filled silhouette reads as the animal and an outline reads as a smudge,
   so the bodies are solid and only the antennae and legs are strokes.
   ------------------------------------------------------------- */

function Dragonfly() {
  return (
    <g fill="currentColor">
      {/* Two pairs of long, near-flat wings — the whole tell of the animal */}
      <ellipse cx="-5.6" cy="-3.6" rx="5.5" ry="1.55" transform="rotate(-13 -5.6 -3.6)" />
      <ellipse cx="5.6" cy="-3.6" rx="5.5" ry="1.55" transform="rotate(13 5.6 -3.6)" />
      <ellipse cx="-4.9" cy="-0.5" rx="4.8" ry="1.35" transform="rotate(11 -4.9 -0.5)" />
      <ellipse cx="4.9" cy="-0.5" rx="4.8" ry="1.35" transform="rotate(-11 4.9 -0.5)" />
      <circle cx="0" cy="-5.6" r="1.5" />
      <ellipse cx="0" cy="-3.1" rx="1.35" ry="2" />
      {/* Abdomen, tapering to a point */}
      <path d="M-0.75 -1.5 L0.75 -1.5 L0.4 8.3 Q0 9.2 -0.4 8.3 Z" />
    </g>
  );
}

function Butterfly() {
  const wings = (
    <>
      <path d="M-0.9 -2.6 C-4.6 -8.4 -9.6 -7.6 -8.7 -2.5 C-8.2 0.6 -4.2 1.4 -0.9 -0.2 Z" />
      <path d="M-0.9 0.6 C-4.7 1.5 -7.5 4.3 -5.4 6.9 C-3.8 8.8 -1.2 6.3 -0.9 2.6 Z" />
    </>
  );
  return (
    <g fill="currentColor">
      {wings}
      <g transform="scale(-1 1)">{wings}</g>
      <ellipse cx="0" cy="0.4" rx="0.85" ry="4.3" />
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M-0.4 -3.7 C-1.7 -6.1 -2.9 -7.3 -4.2 -8" />
        <path d="M0.4 -3.7 C1.7 -6.1 2.9 -7.3 4.2 -8" />
      </g>
    </g>
  );
}

function Beetle() {
  return (
    <g fill="currentColor">
      <g fill="none" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round">
        {/* Legs, three a side, and the short clubbed antennae */}
        <path d="M-2.8 -2.4 L-6.2 -4.4" />
        <path d="M2.8 -2.4 L6.2 -4.4" />
        <path d="M-3.6 0.4 L-7 0.2" />
        <path d="M3.6 0.4 L7 0.2" />
        <path d="M-3.4 3.4 L-6.2 5.4" />
        <path d="M3.4 3.4 L6.2 5.4" />
        <path d="M-1 -6 L-2.6 -8.2" />
        <path d="M1 -6 L2.6 -8.2" />
      </g>
      <ellipse cx="0" cy="-5.1" rx="1.7" ry="1.3" />
      <ellipse cx="0" cy="-2.9" rx="3" ry="2" />
      {/* Elytra as two halves, so the seam is a gap and not a drawn line */}
      <path d="M-0.35 -1.2 C-4.4 -0.8 -4.7 3.6 -2.5 6.7 C-1.5 8 -0.35 7.8 -0.35 6.5 Z" />
      <path d="M0.35 -1.2 C4.4 -0.8 4.7 3.6 2.5 6.7 C1.5 8 0.35 7.8 0.35 6.5 Z" />
    </g>
  );
}

function Mantis() {
  return (
    <g fill="currentColor">
      <g fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
        {/* The folded raptorial forelegs: the shape that names the animal */}
        <path d="M-1.9 -4.4 L-6.4 -3 L-4.2 -0.4" />
        <path d="M1.9 -4.4 L6.4 -3 L4.2 -0.4" />
        {/* Hind legs, angled back */}
        <path d="M-1.6 0.6 L-5.6 2.6 L-4.6 5.4" />
        <path d="M1.6 0.6 L5.6 2.6 L4.6 5.4" />
        {/* Antennae */}
        <path d="M-1.2 -7.2 C-2.4 -8.6 -3.6 -9.2 -4.8 -9.4" />
        <path d="M1.2 -7.2 C2.4 -8.6 3.6 -9.2 4.8 -9.4" />
      </g>
      {/* Triangular head, cocked slightly, then the long neck */}
      <path d="M-2.3 -7.5 L2.3 -7.5 L1.1 -5.2 L-1.1 -5.2 Z" />
      <path d="M-1.05 -5.2 L1.05 -5.2 L1.35 -0.6 L-1.35 -0.6 Z" />
      <path d="M-1.5 -0.8 C1.7 0.4 3 3.6 2.1 7.4 C1.8 8.7 0.2 8.9 -0.4 7.7 C-1.5 5.4 -2.2 2.6 -1.5 -0.8 Z" />
    </g>
  );
}

function Sneaker() {
  return (
    <g fill="currentColor">
      {/* Side profile: sole, upper, laces. The toe lifts, which is most of
          what separates a sneaker from a slipper at this size. */}
      <path d="M-8.2 3.4 C-8.4 5.3 -7 6.2 -5.1 6.2 L6.6 6.2 C8.1 6.2 8.7 5.4 8.7 4.2 C8.7 3.4 8.2 3 7.2 2.9 L-7.2 2.9 C-7.9 2.95 -8.15 2.9 -8.2 3.4 Z" />
      <path d="M-7.7 2.7 C-8 -0.7 -6.7 -2.7 -4.4 -2.9 C-2.1 -3.1 -0.5 -1.5 1.4 -0.2 C3.3 1.1 5.7 1.6 7.5 2 C8.2 2.15 8.5 2.4 8.5 2.7 Z" />
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M-4.4 -1.9 L-2.6 -0.6" />
        <path d="M-2.6 -2.4 L-0.6 -0.9" />
        <path d="M-0.7 -2.2 L1.4 -0.6" />
      </g>
    </g>
  );
}

function Sushi() {
  return (
    <g>
      {/* Nigiri seen from the side: the slab of fish reads solid, the rice
          reads as an outline, so the two never merge into one blob. */}
      <path
        d="M-6.6 1 C-6.6 4.6 -4.5 5.9 0 5.9 C4.5 5.9 6.6 4.6 6.6 1 C6.6 -0.5 4.7 -1.1 0 -1.1 C-4.7 -1.1 -6.6 -0.5 -6.6 1 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      <path
        d="M-7.4 -1.4 C-7.4 -4.6 -4.7 -5.8 0 -5.8 C4.7 -5.8 7.4 -4.6 7.4 -1.5 C7.4 -0.2 4.7 0.4 0 0.4 C-4.7 0.4 -7.4 -0.2 -7.4 -1.4 Z"
        fill="currentColor"
      />
      {/* Band of nori holding the two together */}
      <path d="M-1.7 -0.9 L1.7 -0.9 L1.7 5.75 C0.55 5.9 -0.55 5.9 -1.7 5.75 Z" fill="currentColor" />
    </g>
  );
}

const RIDERS: Record<Rider, () => ReactElement> = {
  dragonfly: Dragonfly,
  butterfly: Butterfly,
  beetle: Beetle,
  mantis: Mantis,
  sneaker: Sneaker,
  sushi: Sushi,
};

export function Orrery() {
  const reduceMotion = useReducedMotion();
  const ringRefs = useRef<(SVGGElement | null)[]>([]);
  const riderRefs = useRef<(SVGGElement | null)[]>([]);

  const paths = useMemo(() => ORBITS.map(ringPath), []);

  useAnimationFrame((elapsed) => {
    const t = reduceMotion ? 0 : elapsed / 1000;

    ORBITS.forEach((orbit, i) => {
      // Ring and rider share one rotating group, so the rider stays welded
      // to its own ring however far the ring has drifted
      ringRefs.current[i]?.setAttribute('transform', `rotate(${(t * orbit.precess).toFixed(3)})`);

      const rider = riderRefs.current[i];
      if (!rider) return;

      const angle = orbit.phase + t * orbit.speed;
      const here = pointAt(orbit, angle);
      const ahead = pointAt(orbit, angle + 0.02);
      // Seen from above, an insect faces the way it is travelling
      const heading =
        (Math.atan2(ahead.y - here.y, ahead.x - here.x) * 180) / Math.PI + 90;

      rider.setAttribute(
        'transform',
        `translate(${here.x.toFixed(2)} ${here.y.toFixed(2)}) rotate(${heading.toFixed(2)}) scale(${orbit.riderScale ?? 0.6})`,
      );
    });
  });

  return (
    <section className="relative z-10 flex w-full items-center justify-center px-6 pb-24 sm:px-12 sm:pb-32">
      <svg
        viewBox="-112 -112 224 224"
        className="block w-[min(84vw,520px)] text-[#141518]"
        aria-hidden="true"
      >
        {ORBITS.map((orbit, i) => {
          const RiderGlyph = orbit.rider ? RIDERS[orbit.rider] : null;
          return (
            <g
              key={orbit.r}
              ref={(el) => {
                ringRefs.current[i] = el;
              }}
            >
              <path
                d={paths[i]}
                fill="none"
                stroke="currentColor"
                strokeWidth={orbit.strokeWidth}
              />
              {RiderGlyph && (
                <g
                  ref={(el) => {
                    riderRefs.current[i] = el;
                  }}
                >
                  {/* Backing copy in the page colour, fattened into a halo:
                      it clears the ring out from under the rider, so the
                      silhouette is never cut in half by its own orbit. */}
                  <g className="orrery-halo">
                    <RiderGlyph />
                  </g>
                  <RiderGlyph />
                </g>
              )}
            </g>
          );
        })}

        {/* The core everything is turning around */}
        <circle cx="0" cy="0" r="8.4" fill="currentColor" />
      </svg>
    </section>
  );
}
