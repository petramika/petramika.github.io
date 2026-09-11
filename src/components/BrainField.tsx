import { useRef } from 'react';
import { useAnimationFrame, useReducedMotion } from 'motion/react';
import { useOnScreen } from '../hooks/useOnScreen';
import texts from '../data/texts.json';

/**
 * A brain, drawn rather than pictured, with its parts named for what this
 * chapter is actually looking through: head, intuition, soul, heart, body.
 * The names are handwritten, and lower case: these are not anatomy, they are
 * somebody's own labels for where a person might still be kept.
 *
 * The silhouette is four pieces, not one. An earlier pass ran a single curve
 * all the way round and the underside came out as a bulb — the thing that
 * makes a brain read as a brain is the temporal lobe hanging separately
 * below, with the fissure between it and the rest. Drawing them as two
 * shapes puts that line there for free.
 *
 * Each region is a generous blob cut to the silhouette rather than a piece
 * cut to fit its neighbours. Their borders then fall where two curves cross,
 * which is both organic and impossible to misalign; tiled by hand they would
 * leave hairlines wherever the arithmetic was a pixel out.
 *
 * The folds are long meandering lines run across the whole box and clipped,
 * so each one enters and leaves wherever the shape happens to be. And the
 * colour keeps drifting over the regions, so the parts go on bleeding into
 * one another — which is the honest position for a chapter about not being
 * able to tell where a memory is kept.
 */

/*
 * The box is a good deal wider than the brain. The names sit outside the
 * drawing and a handwritten word runs long, so the frame has to hold the
 * writing too — cut to the brain, the labels lost their first and last
 * letters and `corazon` arrived as `razon`.
 */
const W = 470;
const H = 218;
const TAU = Math.PI * 2;

/** The cerebrum: the dome, with its underside arcing up into the fissure */
const CEREBRUM =
  'M32 100 C20 80 28 52 52 40 C60 22 88 13 106 26 C118 11 150 11 162 29 ' +
  'C184 25 204 43 204 66 C214 79 211 99 197 107 C199 121 187 133 171 131 ' +
  'C160 120 150 110 132 106 C112 102 90 102 72 106 C56 110 44 110 32 100 Z';

/** The temporal lobe, hanging below it and pointing forward */
const TEMPORAL =
  'M38 112 C52 106 74 108 92 112 C112 116 130 114 146 119 C158 125 160 137 151 145 ' +
  'C138 154 110 155 90 150 C68 145 46 136 38 126 C33 120 33 115 38 112 Z';

/** The cerebellum, tucked under the back */
const CEREBELLUM =
  'M152 126 C173 122 191 133 189 148 C186 162 162 166 150 154 C143 146 145 130 152 126 Z';

/** And the stem, leaving the frame */
const STEM = 'M130 139 C127 152 133 168 143 176 L158 176 C147 163 145 151 148 139 Z';

interface Region {
  /** Key into texts.brain */
  name: keyof typeof texts.brain;
  /** The blob that claims this part of the shape */
  shape: string;
  colour: string;
  /** Where its line lands, and where its name sits */
  point: [number, number];
  label: [number, number];
  anchor: 'start' | 'end';
}

const REGIONS: Region[] = [
  {
    name: 'soul',
    shape: 'M196 88 m-52 0 a52 52 0 1 0 104 0 a52 52 0 1 0 -104 0',
    colour: 'var(--brain-soul)',
    point: [196, 92],
    label: [262, 92],
    anchor: 'start',
  },
  {
    name: 'intuition',
    shape: 'M150 50 m-56 0 a56 56 0 1 0 112 0 a56 56 0 1 0 -112 0',
    colour: 'var(--brain-intuition)',
    point: [152, 42],
    label: [262, 24],
    anchor: 'start',
  },
  {
    name: 'head',
    shape: 'M70 72 m-64 0 a64 64 0 1 0 128 0 a64 64 0 1 0 -128 0',
    colour: 'var(--brain-head)',
    point: [58, 62],
    label: [-26, 34],
    anchor: 'end',
  },
  {
    name: 'heart',
    shape: TEMPORAL,
    colour: 'var(--brain-heart)',
    point: [86, 130],
    label: [-26, 158],
    anchor: 'end',
  },
  {
    name: 'body',
    shape: CEREBELLUM,
    colour: 'var(--brain-body)',
    point: [170, 146],
    label: [262, 172],
    anchor: 'start',
  },
];

interface Blob {
  cx: number;
  cy: number;
  r: number;
  drift: [number, number];
  period: [number, number];
  morph: [number, number, number];
  depth: [number, number, number];
  seed: number;
  opacity: number;
}

/** The colour that keeps moving over the regions, mixing them at the seams */
const BLOBS: Blob[] = [
  { cx: 60, cy: 50, r: 86, drift: [22, 16], period: [52, 41], morph: [26, 37, 49], depth: [0.13, 0.075, 0.035], seed: 0.6, opacity: 0.42 },
  { cx: 190, cy: 46, r: 90, drift: [24, 18], period: [47, 61], morph: [31, 43, 55], depth: [0.12, 0.08, 0.04], seed: 2.4, opacity: 0.38 },
  { cx: 120, cy: 168, r: 94, drift: [26, 19], period: [59, 44], morph: [29, 40, 53], depth: [0.14, 0.07, 0.03], seed: 4.1, opacity: 0.4 },
  { cx: 20, cy: 140, r: 72, drift: [20, 21], period: [38, 55], morph: [24, 35, 46], depth: [0.15, 0.09, 0.04], seed: 5.7, opacity: 0.36 },
];

const FOLDS = 12;
const FOLD_POINTS = 64;

function blobPath(blob: Blob, t: number) {
  const cx = blob.cx + blob.drift[0] * Math.sin((t * TAU) / blob.period[0] + blob.seed);
  const cy = blob.cy + blob.drift[1] * Math.sin((t * TAU) / blob.period[1] + blob.seed * 1.7);

  let d = '';
  for (let i = 0; i <= 72; i += 1) {
    const a = (i / 72) * TAU;
    const r =
      blob.r *
      (1 +
        blob.depth[0] * Math.sin(2 * a + blob.seed + (t * TAU) / blob.morph[0]) +
        blob.depth[1] * Math.sin(3 * a - blob.seed * 2 + (t * TAU) / blob.morph[1]) +
        blob.depth[2] * Math.sin(5 * a + blob.seed * 3 - (t * TAU) / blob.morph[2]));
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
}

function foldPath(index: number, t: number) {
  const base = 14 + ((index + 0.5) / FOLDS) * 150;
  const seed = index * 1.7;
  let d = '';

  for (let i = 0; i <= FOLD_POINTS; i += 1) {
    const u = i / FOLD_POINTS;
    const x = 20 + u * 200;
    const y =
      base +
      12 * Math.sin(u * 7.5 + seed + t * 0.09) +
      6.5 * Math.sin(u * 15.5 - seed * 2 + t * 0.06) +
      3 * Math.sin(u * 29 + seed * 3 - t * 0.04);
    d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

/**
 * The line from a name to the part it names. Curved, and bowed away from the
 * drawing: a straight rule would read as a diagram, and this is not one.
 */
function leader([lx, ly]: [number, number], [px, py]: [number, number]) {
  const from = lx < 130 ? lx + 26 : lx - 26;
  const midX = (from + px) / 2;
  const midY = (ly + py) / 2;
  // Bowed perpendicular to its own run, so every line curves its own way
  const bow = (py - ly) * 0.22;
  return `M${from} ${ly} Q${midX + bow} ${midY - Math.abs(px - from) * 0.12} ${px} ${py}`;
}

export function BrainField() {
  const reduceMotion = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(hostRef);
  const blobRefs = useRef<(SVGPathElement | null)[]>([]);
  const foldRefs = useRef<(SVGPathElement | null)[]>([]);

  useAnimationFrame((elapsed) => {
    if (!onScreen.current) return;
    const t = reduceMotion ? 0 : elapsed / 1000;
    BLOBS.forEach((blob, i) => blobRefs.current[i]?.setAttribute('d', blobPath(blob, t)));
    for (let i = 0; i < FOLDS; i += 1) {
      foldRefs.current[i]?.setAttribute('d', foldPath(i, t));
    }
  });

  return (
    <div
      ref={hostRef}
      className="brain-field pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      <svg viewBox={`-112 -14 ${W} ${H}`} className="block w-[min(94vw,900px)]">
        <defs>
          <clipPath id="brainClip">
            <path d={CEREBRUM} />
            <path d={TEMPORAL} />
            <path d={CEREBELLUM} />
            <path d={STEM} />
          </clipPath>
        </defs>

        <g clipPath="url(#brainClip)">
          {/* The stem takes the colour of what it comes out of */}
          <path d={STEM} fill="var(--brain-body)" />

          {REGIONS.map((region) => (
            <path key={region.name} d={region.shape} fill={region.colour} />
          ))}

          {/* Colour drifting over all of them, so the parts keep bleeding */}
          <g style={{ mixBlendMode: 'soft-light' }}>
            {BLOBS.map((blob, i) => (
              <path
                key={`${blob.cx}-${blob.cy}`}
                ref={(el) => {
                  blobRefs.current[i] = el;
                }}
                d={blobPath(blob, 0)}
                fill="var(--brain-drift)"
                opacity={blob.opacity}
              />
            ))}
          </g>

          <g fill="none" stroke="var(--brain-fold)" strokeWidth="1.4" strokeLinecap="round" opacity="0.45">
            {Array.from({ length: FOLDS }, (_, i) => (
              <path
                key={i}
                ref={(el) => {
                  foldRefs.current[i] = el;
                }}
                d={foldPath(i, 0)}
              />
            ))}
          </g>
        </g>

        {/* The outline over the top, holding it all in */}
        <g fill="none" stroke="var(--brain-fold)" strokeWidth="1.8" strokeLinejoin="round">
          <path d={CEREBRUM} />
          <path d={TEMPORAL} />
          <path d={CEREBELLUM} />
          <path d={STEM} />
        </g>

        {/* And the names, each on its own curve */}
        <g className="brain-labels">
          {REGIONS.map((region) => (
            <g key={`label-${region.name}`}>
              <path
                d={leader(region.label, region.point)}
                fill="none"
                stroke="currentColor"
                strokeWidth="0.9"
                opacity="0.5"
              />
              <circle cx={region.point[0]} cy={region.point[1]} r="2" fill="currentColor" opacity="0.6" />
              <text
                x={region.label[0]}
                y={region.label[1]}
                textAnchor={region.anchor}
                dominantBaseline="middle"
                fontSize="17"
                letterSpacing="0.005em"
                fill="currentColor"
              >
                {texts.brain[region.name]}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
