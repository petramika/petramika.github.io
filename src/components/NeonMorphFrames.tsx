import { useEffect, useRef } from 'react';
import { useAnimationFrame, useReducedMotion } from 'motion/react';
import { useOnScreen } from '../hooks/useOnScreen';

const TAU = Math.PI * 2;
/* Enough samples that the square corners stay crisp */
const POINTS = 96;
/* Lobes around the ring when the wave is at full amplitude */
const WAVE_LOBES = 6;

interface RingConfig {
  /** Fraction of the 100-unit half-viewBox */
  scale: number;
  /** Radians per second; sign sets the direction */
  spin: number;
  /** Desynchronises this ring's morph from its neighbours */
  phase: number;
  strokeWidth: number;
}

/**
 * Rings run from tight to bleeding off the edge, alternating direction so
 * the stack never locks into a single rigid shape.
 */
const RINGS: RingConfig[] = [
  { scale: 0.3, spin: 0.062, phase: 0, strokeWidth: 0.85 },
  { scale: 0.5, spin: -0.046, phase: 1.1, strokeWidth: 0.95 },
  { scale: 0.72, spin: 0.035, phase: 2.3, strokeWidth: 1.05 },
  { scale: 0.95, spin: -0.026, phase: 3.4, strokeWidth: 1.15 },
  { scale: 1.22, spin: 0.019, phase: 4.6, strokeWidth: 1.25 },
];

/**
 * One parametric family covering all three shapes the piece asks for.
 *
 * A superellipse |x|^n + |y|^n = 1 is a circle at n = 2 and approaches a
 * square as n grows, so animating the exponent morphs between them
 * continuously — no crossfading between separate shapes. Multiplying the
 * radius by a sine of the angle adds the wave on top of whatever the
 * exponent currently is, which is why a ring can be a wavy square.
 *
 * `rotation` is folded in here rather than applied as an SVG transform: the
 * wave crests then travel with the shape, and each ring costs one attribute
 * write per frame instead of two.
 */
function buildRingPath(
  radius: number,
  exponent: number,
  waveAmp: number,
  wavePhase: number,
  rotation: number,
): string {
  let d = '';

  for (let i = 0; i <= POINTS; i++) {
    const angle = (i / POINTS) * TAU;
    // Sample the shape in its own unrotated frame, then place the point
    // at the rotated angle.
    const shapeAngle = angle - rotation;
    const c = Math.cos(shapeAngle);
    const s = Math.sin(shapeAngle);

    const denom = Math.pow(
      Math.pow(Math.abs(c), exponent) + Math.pow(Math.abs(s), exponent),
      1 / exponent,
    );
    const wave = 1 + waveAmp * Math.sin(WAVE_LOBES * shapeAngle + wavePhase);
    const r = (radius / denom) * wave;

    const x = (Math.cos(angle) * r).toFixed(2);
    const y = (Math.sin(angle) * r).toFixed(2);
    d += `${i === 0 ? 'M' : 'L'}${x} ${y}`;
  }

  return `${d}Z`;
}

/** Shape parameters for one ring at time `t` (seconds). */
function ringStateAt(ring: RingConfig, t: number) {
  return {
    // 2 → circle, ~8.8 → square. The two oscillators are deliberately
    // incommensurate so the stack never visibly repeats.
    exponent: 5.4 + 3.4 * Math.cos(t * 0.19 + ring.phase),
    // Waves swell in and fall back out rather than running constantly.
    waveAmp: 0.055 * Math.max(0, Math.sin(t * 0.13 + ring.phase * 0.7)),
    wavePhase: t * 0.5 + ring.phase,
    rotation: t * ring.spin + ring.phase * 0.2,
  };
}

export function NeonMorphFrames() {
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const onScreen = useOnScreen(svgRef);
  // Halo and core share one path string, so the glow tracks the shape exactly
  const haloRefs = useRef<(SVGPathElement | null)[]>([]);
  const coreRefs = useRef<(SVGPathElement | null)[]>([]);
  // Rebuilding five paths and rasterising the bloom is not free, so it only
  // runs while the room is actually on screen.
  const isVisibleRef = useRef(false);

  const paint = (t: number) => {
    RINGS.forEach((ring, i) => {
      const halo = haloRefs.current[i];
      const core = coreRefs.current[i];
      if (!halo || !core) return;

      const { exponent, waveAmp, wavePhase, rotation } = ringStateAt(ring, t);
      const d = buildRingPath(ring.scale * 100, exponent, waveAmp, wavePhase, rotation);

      halo.setAttribute('d', d);
      core.setAttribute('d', d);
    });
  };

  // Static composition when motion is unwelcome — still a shape, just still
  useEffect(() => {
    if (reduceMotion) paint(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      // Start a little before it scrolls in, so nothing pops into place
      { rootMargin: '15% 0px' },
    );

    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useAnimationFrame((elapsed) => {
    if (!onScreen.current) return;
    if (reduceMotion || !isVisibleRef.current) return;
    paint(elapsed / 1000);
  });

  return (
    <svg
      ref={svgRef}
      viewBox="-100 -100 200 200"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        {/*
          Two-pass neon: a wide amber bloom under a thin near-white core.
          The blur stages are grouped onto the whole halo layer rather than
          per ring, so an animating frame rasterises one filter, not five.
        */}
        <filter
          id="neonBloom"
          x="-55%"
          y="-55%"
          width="210%"
          height="210%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="1.4" result="tight" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="mid" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="wide" />
          {/*
            The wide pass is what carried the glow across the whole room and
            tinted it brown. It stays, because a tube with no far falloff
            looks pasted on, but at a fraction of its weight — so the warmth
            dies out close to the glass and the rest of the room is the same
            flat black as the page behind it.
          */}
          <feColorMatrix
            in="wide"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.35 0"
            result="wideFaint"
          />
          <feMerge>
            <feMergeNode in="wideFaint" />
            <feMergeNode in="mid" />
            <feMergeNode in="tight" />
          </feMerge>
        </filter>

        <filter
          id="neonCore"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="0.7" result="soft" />
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/*
        Bloom is the only place colour lives: a muted dark orange, kept low
        enough that it reads as a warm glow hugging the tube rather than a
        wash that turns the whole room brown.
      */}
      <g filter="url(#neonBloom)" opacity="0.34">
        {RINGS.map((ring, i) => (
          <path
            key={`halo-${ring.scale}`}
            ref={(el) => {
              haloRefs.current[i] = el;
            }}
            fill="none"
            stroke="#b35e12"
            strokeWidth={ring.strokeWidth * 2.8}
            strokeLinejoin="round"
          />
        ))}
      </g>

      {/* Neutral white tube, dimming with depth */}
      <g filter="url(#neonCore)">
        {RINGS.map((ring, i) => (
          <path
            key={`core-${ring.scale}`}
            ref={(el) => {
              coreRefs.current[i] = el;
            }}
            fill="none"
            stroke="#f4f4f5"
            strokeWidth={ring.strokeWidth}
            strokeLinejoin="round"
            opacity={1 - i * 0.13}
          />
        ))}
      </g>
    </svg>
  );
}
