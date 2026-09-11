import { useEffect, useMemo, useRef } from 'react';
import { MotionValue } from 'motion/react';

/**
 * Paper giving way as you scroll. Down the middle of the opening spread the
 * seam parts in two; at the edges of the screen the page is torn out of
 * whatever it was bound into, its margin left ragged. Both run from the top
 * down, widest where they began and closing to nothing at the front, with
 * the dark underneath showing through and a few fibres still holding across
 * the gap until they don't.
 *
 * One component, every placement. The drawing is the same in all of them —
 * void between two lines, a lit edge on each, fibres at the front — and all
 * that changes is where those two lines run: either side of a centre seam,
 * or the screen's edge and a line creeping in from it.
 *
 * It works in ALONG and ACROSS rather than in x and y, and maps to the two
 * at the last moment. That is what lets the same tear run down a seam on a
 * wide screen and across one on a phone, where the halves are stacked and
 * the seam between them is horizontal, without a second copy of any of it.
 *
 * The edge is built by midpoint displacement rather than from waves: you
 * halve the line, push the middle aside, halve again with a smaller push,
 * and so on. That self-similarity is what paper does — a tear is jagged at
 * every scale at once — where a sine is only ever jagged at one, and reads
 * as a decorative squiggle however much you fiddle with it.
 *
 * The two edges are the same line moved apart, never two drawn lines. They
 * were one edge a moment ago, so anything else shows up immediately as
 * wrong.
 */

/** Points down the seam. One more than a power of two, for the halving */
const POINTS = 129;
/** How far the edge wanders from the straight seam, in px */
const WANDER = 9;
/** How far a seam opens at its widest, in px */
const MAX_GAP = 30;
/** How far into the page an edge is torn away, in px */
const MAX_DEPTH = 34;
/** Where in the scroll the tear starts and finishes running */
const FROM = 0.18;
const TO = 0.68;

/** Deterministic noise: the same tear every visit, not a new one per frame */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Midpoint displacement down the seam, normalised to roughly -1..1 */
function tornEdge() {
  const rand = seeded(20260911);
  const dev = new Array<number>(POINTS).fill(0);
  let step = POINTS - 1;
  let scale = 1;

  while (step > 1) {
    const half = step / 2;
    for (let i = half; i < POINTS; i += step) {
      dev[i] = (dev[i - half] + dev[i + half]) / 2 + (rand() - 0.5) * scale;
    }
    step = half;
    // Each round pushes less: the big swerves first, then the roughness
    scale *= 0.58;
  }

  const peak = Math.max(...dev.map(Math.abs)) || 1;
  return dev.map((v) => v / peak);
}

interface PaperTearProps {
  /** The spread's own scroll progress, 0 as it enters to 1 as it leaves */
  progress: MotionValue<number>;
  /** A seam parting down the middle, or the page torn along one of its edges */
  at?: 'seam' | 'left' | 'right';
  /** Which way the tear runs. The opening is always across it */
  orientation?: 'vertical' | 'horizontal';
  /** How far it opens at its widest, in px, when the default is too much */
  reach?: number;
  /**
   * Where across the panel the seam actually runs, as a fraction. Halfway is
   * only right when the two halves are equal, which they are side by side
   * and are not stacked: on a phone one half is taller than the other, and a
   * seam drawn down the middle tears through the middle of the text instead
   * of along the join.
   */
  seamAt?: number;
}

export function PaperTear({
  progress,
  at: placement = 'seam',
  orientation = 'vertical',
  reach: reachProp,
  seamAt = 0.5,
}: PaperTearProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const voidRef = useRef<SVGPathElement>(null);
  const leftRef = useRef<SVGPathElement>(null);
  const rightRef = useRef<SVGPathElement>(null);
  const fibresRef = useRef<SVGGElement>(null);

  const edge = useMemo(tornEdge, []);

  useEffect(() => {
    const host = hostRef.current;
    const hole = voidRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    const fibres = fibresRef.current;
    if (!host || !hole || !left || !right || !fibres) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = host.clientWidth || 900;
    let height = host.clientHeight || 700;
    const observer = new ResizeObserver(() => {
      width = host.clientWidth || width;
      height = host.clientHeight || height;
    });
    observer.observe(host);

    const fibreNodes = Array.from(fibres.querySelectorAll('path'));

    let raf = 0;
    const start = performance.now();

    const frame = (now: number) => {
      const t = reduced ? 0 : (now - start) / 1000;

      // How far along the seam it has given way
      const p = progress.get();
      const front = Math.max(0, Math.min(1, (p - FROM) / (TO - FROM)));

      const seam = placement === 'seam';
      const vertical = orientation === 'vertical';
      const alongExtent = vertical ? height : width;
      const acrossExtent = vertical ? width : height;
      const reach = reachProp ?? (seam ? MAX_GAP : MAX_DEPTH);

      /** The only place the tear has to know about x and y */
      const pt = (along: number, across: number) =>
        vertical
          ? `${across.toFixed(1)} ${along.toFixed(1)}`
          : `${along.toFixed(1)} ${across.toFixed(1)}`;

      const openAt = (at: number) => {
        if (front <= 0 || at >= front) return 0;
        // Widest where it started, closing to nothing at the front — which
        // is the shape of every tear, and the reason it reads as tearing
        // rather than as a gap that was always there
        const along = 1 - at / front;
        const tremble = 1 + 0.035 * Math.sin(t * 5.5 + at * 22);
        return reach * along ** 0.75 * tremble;
      };

      const outerPts: string[] = [];
      const innerPts: string[] = [];

      for (let i = 0; i < POINTS; i += 1) {
        const at = i / (POINTS - 1);
        const along = at * alongExtent;
        const open = openAt(at);
        const wander = edge[i] * WANDER;

        if (seam) {
          // Two edges of one line, moved apart
          const spine = acrossExtent * seamAt + wander;
          outerPts.push(pt(along, spine - open / 2));
          innerPts.push(pt(along, spine + open / 2));
        } else {
          // The screen's edge, and the torn line creeping in from it. The
          // wander fades out where the opening is small, or the line would
          // still be wriggling through paper that has not given way yet
          const side = placement === 'left' ? 1 : -1;
          const anchor = placement === 'left' ? 0 : acrossExtent;
          outerPts.push(pt(along, anchor));
          innerPts.push(
            pt(along, anchor + side * (open + wander * 0.55 * Math.min(1, open / 6))),
          );
        }
      }

      // Only a seam shows paper on both sides; an edge tear has the screen
      // on one of them, and a line drawn there would be a border
      left.setAttribute('d', seam ? `M${outerPts[0]} L${outerPts.slice(1).join(' L')}` : '');
      right.setAttribute('d', `M${innerPts[0]} L${innerPts.slice(1).join(' L')}`);
      // The dark under the page: down one edge and back up the other
      hole.setAttribute(
        'd',
        `M${outerPts[0]} L${outerPts.slice(1).join(' L')} L${innerPts
          .slice()
          .reverse()
          .join(' L')} Z`,
      );

      /*
        Fibres hold on just behind the front, where the gap is still narrow,
        and let go as it opens past them. They are the whole point: paper
        does not part cleanly, and the last thread going is what makes a tear
        feel like something being lost rather than something being cut.
      */
      fibreNodes.forEach((node, i) => {
        const at = front - 0.012 - i * 0.017;
        const gap = openAt(at);
        if (at <= 0 || gap <= 0.5 || gap > 15) {
          node.setAttribute('opacity', '0');
          return;
        }
        const along = at * alongExtent;
        const wander = edge[Math.round(at * (POINTS - 1))] * WANDER;
        const mid = seam
          ? acrossExtent * seamAt + wander
          : placement === 'left'
            ? gap / 2
            : acrossExtent - gap / 2;
        const sag = 2 + gap * 0.22 + Math.sin(t * 4 + i * 2.1) * 1.1;
        node.setAttribute('opacity', (1 - gap / 15).toFixed(3));
        node.setAttribute(
          'd',
          `M${pt(along, mid - gap / 2)} Q${pt(along + sag, mid)} ${pt(along, mid + gap / 2)}`,
        );
      });

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [edge, progress, placement, orientation, reachProp, seamAt]);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 z-20"
      aria-hidden="true"
    >
      <svg className="h-full w-full" preserveAspectRatio="none">
        {/* What is under the page */}
        <path ref={voidRef} d="" fill="#141518" />

        {/* The torn edges themselves, caught in the light */}
        <g fill="none" stroke="#fbfbfb" strokeWidth="1.4" strokeLinejoin="round">
          <path ref={leftRef} d="" />
          <path ref={rightRef} d="" />
        </g>

        <g ref={fibresRef} fill="none" stroke="#fbfbfb" strokeWidth="1" strokeLinecap="round">
          <path d="" />
          <path d="" />
          <path d="" />
          <path d="" />
          <path d="" />
        </g>
      </svg>
    </div>
  );
}
