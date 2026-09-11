import { useEffect, useRef } from 'react';

/**
 * A single hand-drawn line that keeps changing its mind: it drifts sideways
 * and breathes between a tight, tall wave and an almost flat ripple, so
 * slowly that you only notice the shape moved if you look away and come back.
 * Nothing about it is regular — the crests come out uneven, the wavelength
 * stretches and bunches, and the whole stroke wanders off its own baseline.
 *
 * It is blurred and sits behind the type, so the passage above stays readable
 * while the line keeps moving underneath it.
 *
 * Bring the cursor near it and the line snaps: a gap opens where the pointer
 * is, the two severed ends flick apart, a few splinters scatter, and once the
 * cursor leaves it heals back together — much more slowly than it broke.
 *
 * The whole thing is driven by one rAF loop writing the `d` attribute
 * directly, never through React state, so the page keeps its frames while the
 * wave is redrawn point by point.
 */

const HEIGHT = 780;
/** Distance in px from the line at which the pointer is close enough to cut */
const REACH = 155;
/** Horizontal sampling resolution of the curve */
const STEP = 4;
/** How far along the line the snap is felt after the cut */
const TAIL = 200;

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Layered sines standing in for noise: smooth, seamless, never repeating */
function wobble(x: number) {
  return (
    (Math.sin(x * 0.013 + 1.7) * 0.55 +
      Math.sin(x * 0.0297 + 4.2) * 0.27 +
      Math.sin(x * 0.0071 - 2.1) * 0.44) /
    1.26
  );
}

/** Half the thickness of the stroke at its heaviest */
const WEIGHT = 8;

export function WaveLine() {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const leftRef = useRef<SVGPathElement>(null);
  const rightRef = useRef<SVGPathElement>(null);
  const shardsRef = useRef<SVGGElement>(null);

  // Live pointer state, kept out of React so the loop can read it every frame
  const pointer = useRef({ x: 0, near: false });

  useEffect(() => {
    const host = hostRef.current;
    const svg = svgRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    const shards = shardsRef.current;
    if (!host || !svg || !left || !right || !shards) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = host.clientWidth || 1200;
    const observer = new ResizeObserver(() => {
      width = host.clientWidth || width;
      svg.setAttribute('viewBox', `0 0 ${width} ${HEIGHT}`);
    });
    observer.observe(host);
    svg.setAttribute('viewBox', `0 0 ${width} ${HEIGHT}`);

    const mid = HEIGHT / 2;
    const shardNodes = Array.from(shards.querySelectorAll('line'));

    /*
      Only the newest loop may write. Fast Refresh keeps an effect with empty
      deps alive across an edit, so the previous generation would go on
      writing its own idea of the path into the reused nodes — which is how
      an old open polyline ended up being filled as a row of lobes. The
      marker lives on the DOM node rather than in a module variable, because
      a reloaded module gets a fresh copy of its variables but the same node.
    */
    const generation = `${Date.now()}-${Math.random()}`;
    host.dataset.waveGeneration = generation;

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    // 0 = whole line, 1 = fully severed
    let broken = 0;
    // Where the cut sits; chases the pointer instead of teleporting to it
    let cutX = width / 2;

    const draw = (now: number) => {
      if (host.dataset.waveGeneration !== generation) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!reduced) elapsed += dt;

      // Two slow, mismatched cycles: the amplitude and the wavelength never
      // come back around together, so the line never repeats a shape exactly
      const ampBase = 150 + 48 * Math.sin((elapsed * Math.PI * 2) / 34);
      const wavelength = 250 + 75 * Math.sin((elapsed * Math.PI * 2) / 53 + 1.3);
      const phase = elapsed * 0.16;
      const k = (Math.PI * 2) / wavelength;

      const wants = pointer.current.near ? 1 : 0;
      // Snapping is sudden, mending is patient
      const rate = wants > broken ? 11 : 1.5;
      broken += (wants - broken) * (1 - Math.exp(-rate * dt));
      if (broken < 0.001) broken = 0;

      if (pointer.current.near) {
        const chase = 1 - Math.exp(-7 * dt);
        cutX += (pointer.current.x - cutX) * chase;
      }
      cutX = Math.max(TAIL * 0.5, Math.min(width - TAIL * 0.5, cutX));

      const p = easeInOut(Math.min(broken, 1));
      const gap = 54 * p;
      const leftEnd = Math.max(0, cutX - gap / 2);
      const rightStart = Math.min(width, cutX + gap / 2);

      /**
       * How tall the wave is AT THIS POINT along the line, not just at this
       * moment. Crests come out at full height in one stretch and nearly
       * flat in the next, which is what keeps the line from reading as a
       * wave machine. The periods are the whole point: at a couple of
       * hundred pixels you get tall and short crests side by side on one
       * screen, where before the height was modulated over some 800px and
       * the line looked uniform.
       */
      const ampAt = (x: number) => {
        const n =
          0.55 * Math.sin(x / 210 + elapsed * 0.11) +
          0.3 * Math.sin(x / 95 - elapsed * 0.07) +
          0.15 * Math.sin(x / 47 + elapsed * 0.05);
        return ampBase * (0.22 + 0.78 * (0.5 + 0.5 * n));
      };

      /**
       * The line as it would be with no cut: crests of uneven height, a
       * wavelength that bunches and stretches along the way, and a baseline
       * that never quite settles — a stroke drawn by a hand, not a plotter.
       */
      const heightAt = (x: number) => {
        // Fed into the PHASE rather than into the position: a sine added to
        // the phase makes the wavelength itself stretch and bunch along the
        // line, so no two cycles come out the same width. Its slope stays
        // positive at this depth, so the curve never folds back on itself.
        const theta = x * k + 2.6 * Math.sin(x / 300 + elapsed * 0.04) + phase;
        const baseline =
          26 * Math.sin(x * 0.0026 + elapsed * 0.07) +
          11 * Math.sin(x * 0.0017 - elapsed * 0.05);
        return mid + baseline + ampAt(x) * Math.sin(theta);
      };

      /**
       * Each half is drawn as a filled ribbon rather than a stroke, so the
       * weight can breathe along the length the way a marker does under
       * changing pressure — and so both severed ends can taper to a point
       * instead of stopping on a flat cap.
       *
       * Both halves also recoil away from the cut, one down and one up, with
       * the kick dying out over TAIL px so the rest of the line stays calm.
       */
      const buildHalf = (from: number, to: number, cutAt: 'end' | 'start') => {
        if (to - from < STEP * 2) return '';
        const dir = cutAt === 'end' ? 1 : -1;

        const xs: number[] = [];
        for (let x = from; x < to; x += STEP) xs.push(x);
        xs.push(to);

        const spine = xs.map((x) => {
          const dist = cutAt === 'end' ? to - x : x - from;
          const kick =
            dist < TAIL ? dir * p * 44 * (1 - Math.max(dist, 0) / TAIL) ** 2 : 0;
          const fromCut = cutAt === 'end' ? to - x : x - from;
          const fromEdge = cutAt === 'end' ? x - from : to - x;
          // Pressure varies slowly along the stroke, then both ends thin out
          const pressure = 0.62 + 0.38 * wobble(x * 0.34 + elapsed * 5);
          const taper =
            Math.sqrt(Math.min(1, fromCut / 30)) *
            Math.sqrt(Math.min(1, fromEdge / 46));
          return { x, y: heightAt(x) + kick, h: WEIGHT * pressure * taper };
        });

        const top: string[] = [];
        const bottom: string[] = [];
        for (let i = 0; i < spine.length; i += 1) {
          const prev = spine[Math.max(0, i - 1)];
          const next = spine[Math.min(spine.length - 1, i + 1)];
          const dx = next.x - prev.x;
          const dy = next.y - prev.y;
          const len = Math.hypot(dx, dy) || 1;
          // Offset along the true normal, so steep crests keep their weight
          const nx = (-dy / len) * spine[i].h;
          const ny = (dx / len) * spine[i].h;
          top.push(`${(spine[i].x + nx).toFixed(1)} ${(spine[i].y + ny).toFixed(1)}`);
          bottom.push(`${(spine[i].x - nx).toFixed(1)} ${(spine[i].y - ny).toFixed(1)}`);
        }

        return `M${top[0]} L${top.slice(1).join(' L')} L${bottom
          .reverse()
          .join(' L')} Z`;
      };

      left.setAttribute('d', buildHalf(0, leftEnd, 'end'));
      right.setAttribute('d', buildHalf(rightStart, width, 'start'));

      // Splinters only exist during the break itself: they peak halfway open
      // and are gone by the time the gap is fully formed
      const flash = reduced ? 0 : Math.max(0, Math.sin(Math.PI * Math.min(broken, 1)));
      shards.setAttribute('opacity', (flash * 0.5).toFixed(3));
      const shardBase = heightAt(cutX);
      shardNodes.forEach((node, i) => {
        const dir = i % 2 === 0 ? -1 : 1;
        const spread = (1 + i * 0.6) * 11 * p;
        const x = cutX + dir * spread;
        const y = shardBase + dir * (7 + i * 6) * p;
        const tilt = dir * (12 + i * 9) * p;
        node.setAttribute('x1', (x - 6).toFixed(1));
        node.setAttribute('y1', (y - tilt * 0.12).toFixed(1));
        node.setAttribute('x2', (x + 6).toFixed(1));
        node.setAttribute('y2', (y + tilt * 0.12).toFixed(1));
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    const onPointerMove = (event: PointerEvent) => {
      const box = host.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      pointer.current.x = x;
      pointer.current.near =
        x >= 0 && x <= box.width && Math.abs(y - box.height / 2) < REACH;
    };
    const onPointerLeave = () => {
      pointer.current.near = false;
    };

    // The band sits behind the type, so the listeners go on the window and
    // the geometry decides what counts as "near" — a pointer-events target
    // would have to sit on top of the text to receive anything.
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="wave-line pointer-events-none relative w-full"
      style={{ height: HEIGHT }}
      aria-hidden="true"
    >
      <svg
        ref={svgRef}
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 1200 ${HEIGHT}`}
        fill="none"
        className="block overflow-visible"
      >
        <g fill="#141518" stroke="none">
          <path ref={leftRef} d="" />
          <path ref={rightRef} d="" />
        </g>
        <g ref={shardsRef} stroke="#141518" strokeWidth={4} strokeLinecap="round" opacity={0}>
          <line x1="0" y1="0" x2="0" y2="0" />
          <line x1="0" y1="0" x2="0" y2="0" />
          <line x1="0" y1="0" x2="0" y2="0" />
          <line x1="0" y1="0" x2="0" y2="0" />
        </g>
      </svg>
    </div>
  );
}
