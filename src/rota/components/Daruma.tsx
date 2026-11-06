import { useCallback, useEffect, useRef } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';

interface DarumaProps {
  size?: number;
}

type Gesture = 'rock' | 'hop' | 'turn';

/** Weighted so rocking stays the default and a full turn is a treat */
const GESTURES: Gesture[] = ['rock', 'rock', 'rock', 'hop', 'hop', 'turn'];

const HOP_PEAK = 5.5;

/** Body centre in viewBox units, and how far a feature rides across it */
const CX = 32;
const CY = 30;
/**
 * Kept under the body's ~17-unit half-width. Translating and squeezing a
 * whole patch is only a linearisation of the real spherical projection, so
 * a wide feature still overshoots the silhouette near the limb — the clip
 * path below is what actually contains it.
 */
const SURFACE_R = 12;

const BODY_PATH =
  'M32 7C41 7 47.5 13.5 49 22c2.5 12 3 31-17 31S11.5 34 15 22C16.5 13.5 23 7 32 7Z';

/**
 * Faux-3D daruma that animates itself, unprompted — nothing here is driven
 * by the scroll.
 *
 * A real daruma is bottom-weighted: push it and it always rights itself,
 * overshooting a couple of times on the way back ("nanakorobi yaoki" —
 * seven times down, eight times up). That physics is the spine of it:
 *
 *  - at irregular intervals it picks a gesture — a rock, a couple of mini
 *    hops, or a full turn on its base;
 *  - a deliberately under-damped spring supplies the wobble on the return,
 *    so one short push yields several seconds of settling.
 *
 * THE TURN IS THE 3D PART. Rotating the flat SVG on its Y axis would only
 * ever look like a spinning card, because a card's silhouette changes as it
 * turns. A round object's does not — so instead the body and the specular
 * highlight stay completely still, and the FEATURES travel across the
 * surface: a feature at longitude θ lands at sin(θ) × radius and is squeezed
 * horizontally by cos(θ), which is where it would fall on a real sphere. A
 * fixed highlight over a moving surface is what the eye reads as volume.
 */
export function Daruma({ size = 30 }: DarumaProps) {
  const reduceMotion = useReducedMotion();

  // The doll's only inputs, all self-generated
  const idleKick = useMotionValue(0);
  const hop = useMotionValue(0);
  const spin = useMotionValue(0);

  // Low damping is the point: this is what produces the righting wobble.
  const tilt = useSpring(idleKick, { stiffness: 90, damping: 7, mass: 0.9 });

  const frontRef = useRef<SVGGElement>(null);
  const backRef = useRef<SVGGElement>(null);

  /**
   * Projects both hemispheres onto the fixed body for the current spin and
   * lean. Written straight to attributes: it has to stay in lockstep with
   * the spring, and there is nothing here for React to re-render.
   */
  const applySurface = useCallback(() => {
    const front = frontRef.current;
    const back = backRef.current;
    if (!front || !back) return;

    const theta = (spin.get() * Math.PI) / 180;
    const sin = Math.sin(theta);
    const cos = Math.cos(theta);
    // Leaning shifts the near face slightly, as a nearer layer should
    const lean = tilt.get() * -0.16;

    // Scale about the feature's own centre, after it has travelled
    const project = (offset: number, squeeze: number) =>
      `translate(${(CX + offset).toFixed(2)} ${CY}) scale(${Math.max(squeeze, 0.001).toFixed(4)} 1) translate(${-CX} ${-CY})`;

    const facingFront = cos > 0;

    front.setAttribute('opacity', facingFront ? '1' : '0');
    front.setAttribute('transform', project(SURFACE_R * sin + lean, cos));

    // The back sits half a turn away: mirrored travel, mirrored squeeze
    back.setAttribute('opacity', facingFront ? '0' : '1');
    back.setAttribute('transform', project(-SURFACE_R * sin + lean, -cos));
  }, [spin, tilt]);

  useMotionValueEvent(spin, 'change', applySurface);
  useMotionValueEvent(tilt, 'change', applySurface);
  useEffect(applySurface, [applySurface]);

  // The highlight is a fixed light source — it only answers the lean, never
  // the spin. That is the cue that sells the sphere.
  const glintParallax = useTransform(tilt, (t) => t * -0.34);

  // Shadow reacts to leaning off the base and to lifting off the ground
  const shadowScaleX = useTransform(
    [tilt, hop],
    ([t, h]: number[]) =>
      (1 - Math.min(Math.abs(t), 16) / 34) * (1 - Math.min(Math.abs(h), HOP_PEAK) / 11),
  );
  const shadowOpacity = useTransform(
    [tilt, hop],
    ([t, h]: number[]) =>
      (0.34 - Math.min(Math.abs(t), 16) / 70) *
      (1 - Math.min(Math.abs(h), HOP_PEAK) / 8),
  );
  const shadowX = useTransform(tilt, (t) => t * 0.12);

  useEffect(() => {
    if (reduceMotion) return;

    let timeoutId: number;
    // One entry per motion value; starting a new animation on a value
    // cancels its own previous one, so this stays bounded.
    const running: Record<string, { stop: () => void } | undefined> = {};

    const perform = (gesture: Gesture) => {
      const direction = Math.random() > 0.5 ? 1 : -1;

      if (gesture === 'rock') {
        // Quick shove, then let the spring do the righting
        running.kick = animate(idleKick, [0, direction * (6 + Math.random() * 5), 0], {
          duration: 1.3,
          times: [0, 0.2, 1],
          ease: 'easeOut',
        });
        return;
      }

      if (gesture === 'hop') {
        // Three decaying hops: fast up, slower at the apex, fast down
        running.hop = animate(hop, [0, -HOP_PEAK, 0, -2.6, 0, -1, 0], {
          duration: 1.5,
          times: [0, 0.16, 0.34, 0.48, 0.62, 0.74, 1],
          ease: ['easeOut', 'easeIn', 'easeOut', 'easeIn', 'easeOut', 'easeIn'],
        });
        // Landing knocks it off balance a little
        running.kick = animate(idleKick, [0, direction * 3.5, 0], {
          duration: 1.5,
          ease: 'easeInOut',
        });
        return;
      }

      // A full turn on its base, easing out of and back into rest
      running.spin = animate(spin, spin.get() + direction * 360, {
        duration: 2,
        ease: [0.5, 0, 0.25, 1],
      });
    };

    const schedule = () => {
      // Irregular cadence so it never reads as a metronome
      timeoutId = window.setTimeout(
        () => {
          perform(GESTURES[Math.floor(Math.random() * GESTURES.length)]);
          schedule();
        },
        2000 + Math.random() * 3000,
      );
    };

    schedule();

    return () => {
      window.clearTimeout(timeoutId);
      Object.values(running).forEach((control) => control?.stop());
    };
  }, [hop, idleKick, reduceMotion, spin]);

  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: size, height: size }}
      title="Daruma — siete veces caes, ocho veces te levantas"
    >
      {/* Contact shadow lives outside the figure so it stays on the ground */}
      <motion.div
        className="daruma-contact-shadow absolute left-1/2 bottom-[1px] -translate-x-1/2 rounded-[50%] bg-[#141518] blur-[1.5px]"
        style={{
          width: size * 0.52,
          height: size * 0.1,
          scaleX: shadowScaleX,
          opacity: shadowOpacity,
          x: shadowX,
        }}
        aria-hidden="true"
      />

      <motion.svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="daruma-figure relative block overflow-visible"
        style={{ rotate: tilt, y: hop }}
        aria-hidden="true"
      >
        <defs>
          {/* Off-centre light source is what gives the body its roundness */}
          <radialGradient id="darumaBody" cx="36%" cy="26%" r="82%">
            <stop offset="0%" stopColor="#e86353" />
            <stop offset="42%" stopColor="#cf2f22" />
            <stop offset="78%" stopColor="#a71a11" />
            <stop offset="100%" stopColor="#750f09" />
          </radialGradient>

          <radialGradient id="darumaFace" cx="42%" cy="32%" r="78%">
            <stop offset="0%" stopColor="#fffaf0" />
            <stop offset="65%" stopColor="#f3e7d3" />
            <stop offset="100%" stopColor="#dcc9ad" />
          </radialGradient>

          {/* Rim light down the shadowed edge — sells the curvature */}
          <linearGradient id="darumaRim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff9d8f" stopOpacity="0" />
            <stop offset="45%" stopColor="#ff9d8f" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ff9d8f" stopOpacity="0" />
          </linearGradient>

          {/* Nothing painted on the doll may cross its own outline */}
          <clipPath id="darumaSurface">
            <path d={BODY_PATH} />
          </clipPath>
        </defs>

        {/* ---- Body. Never rotates: a sphere keeps its outline ---------- */}
        <path d={BODY_PATH} fill="url(#darumaBody)" />

        {/* Occlusion at the base, so it looks like it's resting on weight */}
        <ellipse cx="32" cy="50" rx="17" ry="4.5" fill="#5e0b06" opacity="0.35" />

        {/* The clip carries no transform, so it stays pinned to the body
            while the hemispheres slide underneath it. */}
        <g clipPath="url(#darumaSurface)">
          {/* ---- NEAR HEMISPHERE: face and belly ------------------------- */}
          <g ref={frontRef}>
            <ellipse cx="32" cy="27" rx="13.6" ry="12.2" fill="url(#darumaFace)" />

            {/*
              One eye painted, one blank: the wish has been made and is still
              waiting. Convention fills the daruma's OWN left eye first — the
              one on the viewer's right — and the other once it comes true.
            */}
            <ellipse
              cx="26.2"
              cy="26.4"
              rx="3.5"
              ry="4.3"
              fill="#fdfaf4"
              stroke="#2a1a12"
              strokeWidth="1.15"
            />

            <ellipse
              cx="37.8"
              cy="26.4"
              rx="3.5"
              ry="4.3"
              fill="#1c110c"
              stroke="#2a1a12"
              strokeWidth="1.15"
            />
            {/* Catchlight, placed to agree with the body's light source */}
            <ellipse cx="36.5" cy="24.6" rx="1.15" ry="0.85" fill="#fdfaf4" opacity="0.7" />

            {/* Heavy brows */}
            <path
              d="M21.4 19.6c2.4-2.4 6.3-2.2 8.2.3"
              stroke="#241611"
              strokeWidth="2.3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M34.4 19.9c1.9-2.5 5.8-2.7 8.2-0.3"
              stroke="#241611"
              strokeWidth="2.3"
              strokeLinecap="round"
              fill="none"
            />

            {/* Moustache */}
            <path
              d="M26.4 33.6c2.6 2.2 8.6 2.2 11.2 0"
              stroke="#241611"
              strokeWidth="1.9"
              strokeLinecap="round"
              fill="none"
            />

            {/* Gold belly panel */}
            <g opacity="0.92">
              <ellipse
                cx="32"
                cy="44.5"
                rx="7.8"
                ry="5.2"
                fill="none"
                stroke="#e9c463"
                strokeWidth="1.35"
              />
              <path
                d="M28.6 43.4h6.8M30 46.4h4"
                stroke="#e9c463"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </g>
          </g>

          {/* ---- FAR HEMISPHERE: bare lacquer and the spine seam --------- */}
          <g ref={backRef} opacity="0">
            <path
              d="M32 8.5v43"
              stroke="#5e0b06"
              strokeWidth="1"
              opacity="0.4"
              strokeLinecap="round"
            />
            <ellipse
              cx="32"
              cy="40"
              rx="9"
              ry="6.5"
              fill="none"
              stroke="#e9c463"
              strokeWidth="1.1"
              opacity="0.55"
            />
            <path
              d="M28.5 38.6h7M29.5 41.6h5"
              stroke="#e9c463"
              strokeWidth="1.05"
              strokeLinecap="round"
              opacity="0.55"
            />
          </g>
        </g>

        {/* Rim light reads from both sides */}
        <path
          d="M49 22c2.5 12 3 31-17 31"
          stroke="url(#darumaRim)"
          strokeWidth="1.7"
          fill="none"
        />

        {/*
          Specular highlight, outside both hemispheres: the light does not
          travel with the surface, so this stays put through a whole turn.
        */}
        <motion.ellipse
          cx="21.5"
          cy="15.5"
          rx="5.4"
          ry="3.4"
          fill="#ffffff"
          opacity="0.3"
          transform="rotate(-30 21.5 15.5)"
          style={{ x: glintParallax }}
        />
      </motion.svg>
    </div>
  );
}
