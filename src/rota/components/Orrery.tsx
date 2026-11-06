import { ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { useAnimationFrame, useReducedMotion } from 'motion/react';
import { useOnScreen } from '../hooks/useOnScreen';
import texts from '../data/texts.json';
import { WHEEL, mix, throughTheNegative, RESTING_INK } from '../data/wheel';

/**
 * A very small planetarium. Concentric rings turn around a dark core, and
 * where an orrery would carry planets this one carries a laptop, a brain,
 * a book, a lemon, a camera and a kiss — each riding its own ring.
 *
 * Nothing here is drawn true. The rings are slightly out of round and each
 * one sits a little off the centre, so their slow precession is visible as a
 * wobble rather than as a circle spinning inside itself — a perfect circle
 * rotating about its own centre shows no motion at all.
 *
 * Press the letter at the centre and a ring nobody asked for comes out of
 * it, with what the whole essay has been circling written along it. The rest
 * of the orrery draws back to make room.
 *
 * Put the cursor on a ring and that ring speeds up. Which ring the cursor is
 * on is worked out from the geometry rather than from hit testing: the rings
 * are a couple of units thick, so landing on one with a mouse would be
 * hopeless. The pointer is taken back into each ring's own unrotated frame
 * and compared against the radius the ring has at that angle.
 */

/** Samples per ring — enough that the out-of-round curve stays smooth */
const POINTS = 120;
const TAU = Math.PI * 2;
/** The viewBox is VIEW units across, centred on zero */
const VIEW = 244;
/** How near the line the cursor has to be, in viewBox units, to take it */
const GRAB = 11;
/** How much faster a ring runs while the cursor is on it */
const BOOST = 4.5;
/** The ring that is not there until it is asked for */
const WISH: Orbit = {
  r: 105,
  cx: 0,
  cy: 0,
  wobble: 3.7,
  speed: TAU / 210,
  precess: 0.12,
  phase: 0,
  strokeWidth: 0.9,
};

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

type Rider = 'laptop' | 'brain' | 'book' | 'lemon' | 'camera' | 'kiss';

/**
 * Inner rings run faster, the way they would in a real orrery, but every
 * period is measured in minutes: the whole piece should look still until you
 * notice it isn't. Precession alternates direction so the stack never locks
 * into one rigid shape.
 */
const ORBITS: Orbit[] = [
  { r: 24, cx: 1.5, cy: -1, wobble: 0.4, speed: TAU / 52, precess: 0.9, phase: 2.1, strokeWidth: 1.3, rider: 'laptop', riderScale: 0.82 },
  { r: 39, cx: -2, cy: 1.5, wobble: 1.9, speed: TAU / 71, precess: -0.65, phase: 0.6, strokeWidth: 1.4, rider: 'brain', riderScale: 0.86 },
  { r: 54, cx: 2.5, cy: 2, wobble: 3.3, speed: TAU / 92, precess: 0.48, phase: 3.9, strokeWidth: 1.45, rider: 'book', riderScale: 0.92 },
  { r: 69, cx: -1.5, cy: -2.5, wobble: 4.8, speed: TAU / 116, precess: -0.34, phase: 1.4, strokeWidth: 1.55, rider: 'lemon', riderScale: 0.9 },
  { r: 84, cx: 1, cy: 1, wobble: 5.9, speed: TAU / 143, precess: 0.24, phase: 5.2, strokeWidth: 1.6, rider: 'camera', riderScale: 0.88 },
  { r: 98, cx: -1, cy: 2, wobble: 2.6, speed: TAU / 176, precess: -0.17, phase: 3.1, strokeWidth: 1.7, rider: 'kiss', riderScale: 0.96 },
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

function Laptop() {
  return (
    <g fill="currentColor">
      {/* Open lid with the screen knocked out, then the base in front */}
      <path fillRule="evenodd" d="M-6.6 -6.4 L6.6 -6.4 Q7.4 -6.4 7.4 -5.6 L7.4 2.6 L-7.4 2.6 L-7.4 -5.6 Q-7.4 -6.4 -6.6 -6.4 Z M-6 -5 L6 -5 L6 1.4 L-6 1.4 Z" />
      <path d="M-9.4 3.4 L9.4 3.4 L8.4 5.6 Q8.1 6.1 7.4 6.1 L-7.4 6.1 Q-8.1 6.1 -8.4 5.6 Z" />
    </g>
  );
}

function Brain() {
  return (
    <g>
      <path
        d="M-0.4 -7.4 C-2.4 -8.6 -5.2 -7.8 -5.6 -5.6 C-7.8 -5.4 -8.8 -3 -7.8 -1.2 C-9.2 0.2 -8.8 3 -6.8 3.6 C-6.8 5.8 -4.6 7.2 -2.6 6.4 C-1.8 7.6 -0.4 7.4 -0.4 6.6 Z"
        fill="currentColor"
      />
      <path
        d="M0.4 -7.4 C2.4 -8.6 5.2 -7.8 5.6 -5.6 C7.8 -5.4 8.8 -3 7.8 -1.2 C9.2 0.2 8.8 3 6.8 3.6 C6.8 5.8 4.6 7.2 2.6 6.4 C1.8 7.6 0.4 7.4 0.4 6.6 Z"
        fill="currentColor"
      />
      {/* Folds cut in with the page colour */}
      <g fill="none" stroke="#fbfbfb" strokeWidth="0.75" strokeLinecap="round">
        <path d="M-5.4 -3.4 C-4 -3.8 -3 -2.8 -3.2 -1.4" />
        <path d="M-6 1.2 C-4.6 0.6 -3.2 1.4 -3.2 2.8" />
        <path d="M5.4 -3.4 C4 -3.8 3 -2.8 3.2 -1.4" />
        <path d="M6 1.2 C4.6 0.6 3.2 1.4 3.2 2.8" />
      </g>
    </g>
  );
}

function Book() {
  return (
    <g fill="currentColor">
      {/* Open, seen from above: two pages dipping to the spine */}
      <path d="M-0.6 -4.6 C-3 -6.4 -6.2 -6.6 -9 -5.6 L-9 5.2 C-6.2 4.2 -3 4.4 -0.6 6.2 Z" />
      <path d="M0.6 -4.6 C3 -6.4 6.2 -6.6 9 -5.6 L9 5.2 C6.2 4.2 3 4.4 0.6 6.2 Z" />
      <g fill="none" stroke="#fbfbfb" strokeWidth="0.6" strokeLinecap="round">
        <path d="M-7.4 -2.6 C-5.6 -3.2 -3.8 -3 -2.2 -2.2" />
        <path d="M-7.4 0 C-5.6 -0.6 -3.8 -0.4 -2.2 0.4" />
        <path d="M7.4 -2.6 C5.6 -3.2 3.8 -3 2.2 -2.2" />
        <path d="M7.4 0 C5.6 -0.6 3.8 -0.4 2.2 0.4" />
      </g>
    </g>
  );
}

function Lemon() {
  return (
    <g fill="currentColor">
      {/* The pointed ends are what keep it from reading as an egg */}
      <path d="M-8.6 0 C-7.4 -1.2 -6.4 -5.4 0 -5.4 C6.4 -5.4 7.4 -1.2 8.6 0 C7.4 1.2 6.4 5.4 0 5.4 C-6.4 5.4 -7.4 1.2 -8.6 0 Z" />
      <path d="M5.2 -5.2 C6.6 -8.2 9 -8.6 9.6 -7.8 C9 -6.2 7.4 -5 5.2 -5.2 Z" />
      <ellipse cx="-2.6" cy="-2.2" rx="2.2" ry="0.8" fill="#fbfbfb" opacity="0.7" />
    </g>
  );
}

function Camera() {
  return (
    <g>
      <path
        fillRule="evenodd"
        d="M-8.2 -3.8 L-3.4 -3.8 L-2.2 -6 L2.2 -6 L3.4 -3.8 L8.2 -3.8 Q9 -3.8 9 -3 L9 5.2 Q9 6 8.2 6 L-8.2 6 Q-9 6 -9 5.2 L-9 -3 Q-9 -3.8 -8.2 -3.8 Z M-3.4 1.5 A3.4 3.4 0 1 0 3.4 1.5 A3.4 3.4 0 1 0 -3.4 1.5 Z"
        fill="currentColor"
      />
      <circle cx="0" cy="1.5" r="1.7" fill="currentColor" />
      <rect x="5.2" y="-2.6" width="2" height="1.1" rx="0.3" fill="#fbfbfb" />
    </g>
  );
}

function Kiss() {
  return (
    <g fill="currentColor">
      {/* Lips: the cupid's bow on top, a fuller lower lip, a seam between */}
      <path d="M-9 0 C-6.6 -2.4 -4.2 -5.2 -1.8 -4.6 C-1 -4.4 -0.5 -3.8 0 -3.2 C0.5 -3.8 1 -4.4 1.8 -4.6 C4.2 -5.2 6.6 -2.4 9 0 C6 0.4 3 -0.4 0 0.2 C-3 -0.4 -6 0.4 -9 0 Z" />
      <path d="M-9 0.8 C-6 1.2 -3 0.8 0 1.1 C3 0.8 6 1.2 9 0.8 C7 3.8 4 5.6 0 5.6 C-4 5.6 -7 3.8 -9 0.8 Z" />
    </g>
  );
}

const RIDERS: Record<Rider, () => ReactElement> = {
  laptop: Laptop,
  brain: Brain,
  book: Book,
  lemon: Lemon,
  camera: Camera,
  kiss: Kiss,
};

export function Orrery() {
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const onScreen = useOnScreen(svgRef);
  const wishRef = useRef<SVGGElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const skyRef = useRef<SVGGElement>(null);
  const wishScaleRef = useRef<SVGGElement>(null);
  /*
    The drawing back is scaled here rather than in CSS. A CSS transform on an
    SVG group is measured from that group's own bounding box unless the box
    is redeclared, and these rings are each deliberately off centre, so their
    box is not the middle of anything — scaling about it walked the whole
    orrery sideways. An SVG scale() is always about user space, and user
    space here is the centre by construction.
  */
  const zoom = useRef({ sky: 1, wish: 0.86 });
  const [wished, setWished] = useState(false);
  const ringRefs = useRef<(SVGGElement | null)[]>([]);
  const riderRefs = useRef<(SVGGElement | null)[]>([]);

  const paths = useMemo(() => ORBITS.map(ringPath), []);
  const wishPath = useMemo(() => ringPath(WISH), []);

  // Where the cursor is, in viewBox units, kept out of React so the loop can
  // read it every frame
  const pointer = useRef({ x: 0, y: 0, inside: false });

  /**
   * Each ring carries its own angle rather than deriving one from the clock.
   * A ring that can change speed has to accumulate: read the position off
   * elapsed time instead and the ring jumps the moment its rate changes.
   */
  const state = useRef(
    ORBITS.map((orbit) => ({ angle: orbit.phase, spin: 0, boost: 1 })),
  );
  const lastTime = useRef(0);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onMove = (event: PointerEvent) => {
      const box = svg.getBoundingClientRect();
      if (!box.width || !box.height) return;
      // The viewBox is square and centred on zero, so this is one scale away
      pointer.current.x = ((event.clientX - box.left) / box.width) * VIEW - VIEW / 2;
      pointer.current.y = ((event.clientY - box.top) / box.height) * VIEW - VIEW / 2;
      pointer.current.inside = true;
    };
    const onLeave = () => {
      pointer.current.inside = false;
    };

    svg.addEventListener('pointermove', onMove, { passive: true });
    svg.addEventListener('pointerleave', onLeave);
    return () => {
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  /*
    The dust over the whole page takes its colour from this, so the scene has
    to say when it is here. Written on the document, and only when it changes.
  */
  const announced = useRef(false);

  /*
    The core borrows a colour from the dust's wheel now and then, so there is
    something asking to be pressed without anything saying so. It settles for
    good once the ring is out: a hint that carries on hinting after it has
    been taken reads as decoration.
  */
  const hint = useRef({ tint: 0, from: WHEEL[0], to: WHEEL[4], hold: 0, span: 1 });

  useAnimationFrame((elapsed) => {
    if (announced.current !== onScreen.current) {
      announced.current = onScreen.current;
      if (onScreen.current) document.documentElement.dataset.scene = 'orrery';
      else if (document.documentElement.dataset.scene === 'orrery') {
        delete document.documentElement.dataset.scene;
      }
    }

    if (!onScreen.current) {
      // Keep the clock with it, or the rings jump on the way back
      lastTime.current = elapsed / 1000;
      return;
    }
    const now = elapsed / 1000;
    const dt = reduceMotion ? 0 : Math.min(now - lastTime.current, 0.05);
    lastTime.current = now;

    // Which ring is the cursor on? The nearest one it is close enough to
    let held = -1;
    if (pointer.current.inside && !reduceMotion) {
      let best = GRAB;
      ORBITS.forEach((orbit, i) => {
        // Back into the ring's own frame: undo its rotation, then measure
        // from its own off-centre middle
        const spin = -state.current[i].spin;
        const cos = Math.cos(spin);
        const sin = Math.sin(spin);
        const px = pointer.current.x * cos - pointer.current.y * sin - orbit.cx;
        const py = pointer.current.x * sin + pointer.current.y * cos - orbit.cy;
        const gap = Math.abs(Math.hypot(px, py) - radiusAt(orbit, Math.atan2(py, px)));
        if (gap < best) {
          best = gap;
          held = i;
        }
      });
    }

    ORBITS.forEach((orbit, i) => {
      const st = state.current[i];
      // Eased in and out, so a ring gathers and loses pace instead of
      // snapping between two speeds as the cursor crosses it
      const target = i === held ? BOOST : 1;
      st.boost += (target - st.boost) * (1 - Math.exp(-5 * dt));
      st.angle += orbit.speed * st.boost * dt;
      st.spin += ((orbit.precess * Math.PI) / 180) * st.boost * dt;

      // Ring and rider share one rotating group, so the rider stays welded
      // to its own ring however far the ring has drifted
      ringRefs.current[i]?.setAttribute(
        'transform',
        `rotate(${((st.spin * 180) / Math.PI).toFixed(3)})`,
      );

      const rider = riderRefs.current[i];
      if (!rider) return;

      const here = pointAt(orbit, st.angle);
      const ahead = pointAt(orbit, st.angle + 0.02);
      const heading =
        (Math.atan2(ahead.y - here.y, ahead.x - here.x) * 180) / Math.PI + 90;

      rider.setAttribute(
        'transform',
        `translate(${here.x.toFixed(2)} ${here.y.toFixed(2)}) rotate(${heading.toFixed(2)}) scale(${orbit.riderScale ?? 0.6})`,
      );
    });

    const z = zoom.current;
    const ease = 1 - Math.exp(-3.2 * dt);
    z.sky += ((wished ? 0.88 : 1) - z.sky) * ease;
    z.wish += ((wished ? 1 : 0.86) - z.wish) * ease;
    skyRef.current?.setAttribute('transform', `scale(${z.sky.toFixed(4)})`);
    wishScaleRef.current?.setAttribute('transform', `scale(${z.wish.toFixed(4)})`);

    const core = coreRef.current;
    if (core) {
      const h = hint.current;
      h.hold -= dt;
      if (h.hold <= 0) {
        h.from = h.to;
        h.to = WHEEL[Math.floor(Math.random() * WHEEL.length)];
        // Never the same interval twice, or it reads as a pulse
        h.span = 1.8 + Math.random() * 2.6;
        h.hold = h.span;
      }
      const wanted = wished ? 0 : 1;
      h.tint += (wanted - h.tint) * (1 - Math.exp(-1.6 * dt));

      const negative = document.documentElement.classList.contains('negative-mode');
      const resting = negative ? RESTING_INK.dark : RESTING_INK.light;
      /*
        Measured against THIS crossfade's own length, and smoothed at both
        ends. Reading it against a fixed span was the jump: each interval is
        a different length, so a fade would start partway through and the
        colour snapped. Smoothstep takes care of the rest — matching the
        value at the joins is not enough, the rate has to match too or the
        eye catches the corner.
      */
      const k = 1 - Math.max(0, h.hold) / h.span;
      const hue = mix(h.from, h.to, k * k * (3 - 2 * k));
      core.setAttribute(
        'fill',
        `rgb(${throughTheNegative(mix(resting, hue, h.tint * 0.85), negative)})`,
      );
    }

    // The wish turns too, slower than anything else out there
    wishRef.current?.setAttribute(
      'transform',
      `rotate(${(((now * WISH.precess * 180) / Math.PI) % 360).toFixed(3)})`,
    );
  });

  useEffect(() => {
    return () => {
      if (document.documentElement.dataset.scene === 'orrery') {
        delete document.documentElement.dataset.scene;
      }
    };
  }, []);

  return (
    <section className="relative z-10 flex h-full w-full items-center justify-center px-6 py-16 sm:px-12 sm:py-24">
      <svg
        ref={svgRef}
        /*
          Room for the wish. Its ring reaches 110 units out and the writing
          on it stands another five and a half above that, which the old
          112-unit frame cut clean through. The rendered width grows by the
          same proportion, so everything else is exactly the size it was.
        */
        viewBox="-122 -122 244 244"
        className="block w-[min(88vw,566px)] text-[#141518]"
        aria-hidden="true"
      >
        <defs>
          <path id="orrery-wish-path" d={wishPath} />
        </defs>

        {/* The wish: a ring that is not there until the letter is pressed */}
        <g className={`orrery-wish ${wished ? 'is-out' : ''}`} aria-hidden={!wished}>
          <g ref={wishScaleRef}>
            <g ref={wishRef}>
          <path
            d={wishPath}
            fill="none"
            stroke="currentColor"
            strokeWidth={WISH.strokeWidth}
            opacity="0.45"
          />
          <text fontSize="7.4" letterSpacing="0.14em" fill="currentColor">
            <textPath href="#orrery-wish-path" startOffset="1%">
              {texts.orrery.wish}
            </textPath>
          </text>
            </g>
          </g>
        </g>

        <g ref={skyRef}>
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

        </g>

        {/* The core everything is turning around, with the initial cut out
            of it. The letter is painted in the page's own paper rather than
            drawn on top: knocked out of the disc it reads as part of the
            core, and paper is the one value that flips on its own — under
            the negative it lands on the page's black without a second rule. */}
        <g
          className="orrery-core"
          role="button"
          tabIndex={0}
          aria-label={texts.orrery.wish}
          onClick={() => setWished((was) => !was)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setWished((was) => !was);
            }
          }}
        >
          <circle ref={coreRef} cx="0" cy="0" r="10.4" fill="currentColor" />
          <text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="13"
            fontWeight="900"
            letterSpacing="-0.04em"
            fill="#fbfbfb"
            className="font-editorial-display"
          >
            A
          </text>
        </g>
      </svg>
    </section>
  );
}
