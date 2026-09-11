import { useEffect, useRef } from 'react';

/**
 * Dawn drawn as a survey rather than as a picture: a field of ridges read
 * off in contour lines, with mist moving through the valleys between them.
 *
 * The depth is real, not faked with a gradient. Rows are drawn from the far
 * horizon forwards, and each row fills everything beneath its own line with
 * the page colour before it is stroked — so a near ridge hides the ones
 * behind it. That single rule is what turns a stack of wavy lines into a
 * landscape; it is the same hidden-line removal a plotter does, and nothing
 * else here produces the sense of solid ground.
 *
 * Perspective comes from three things moving together as a row comes
 * forward: the rows spread apart towards the bottom, each row is drawn
 * wider than the one behind it, and the peaks grow. Any one of them alone
 * reads as a pattern.
 *
 * The range is built from a handful of peaks combined with max(), not from
 * waves added together. Summed sines give a woven mesh where every line
 * looks like every other one; taking the highest of a few bumps gives
 * summits, shoulders and valleys — silhouettes that cut into each other the
 * way ridges seen from a distance do.
 *
 * Behind it all the sun climbs out from behind the range, leaves through the
 * top of the sky and comes round again. It is drawn before the ridges, so
 * they take a bite out of it on the way up.
 *
 * Ink and paper are the page's own two values, so the whole drawing flips
 * with the negative — see the note beside `.alba-canvas` in the stylesheet
 * for why this canvas has to opt out of the rule that protects photographs.
 */

/** Contour lines from the horizon to the foreground */
const ROWS = 30;
/** Points sampled across each line */
const SAMPLES = 150;
/** Where the horizon sits within the drawing */
const HORIZON = 0.5;
/** Which rows the mist lies in front of */
const MIST_ROWS = [9, 17];
/** Seconds for the sun to rise, leave the sky and come round again */
const SUN_PERIOD = 54;

const INK = '20, 21, 24';
const PAPER = '251, 251, 251';

/** A summit: where it stands, how wide it lies and how high it goes */
const PEAKS = [
  { at: 0.08, width: 0.19, height: 0.72, sway: 0.9 },
  { at: 0.24, width: 0.13, height: 1.0, sway: 1.6 },
  { at: 0.38, width: 0.17, height: 0.58, sway: 1.1 },
  { at: 0.52, width: 0.11, height: 0.86, sway: 2.1 },
  { at: 0.66, width: 0.2, height: 0.66, sway: 0.7 },
  { at: 0.79, width: 0.12, height: 0.94, sway: 1.4 },
  { at: 0.93, width: 0.16, height: 0.61, sway: 1.9 },
];

/** Sky, in fractions of the drawing: where each cloud sits and how it drifts */
const CLOUDS = [
  { at: 0.18, y: 0.3, width: 0.15, lift: 0.05, lines: 6, speed: 0.011 },
  { at: 0.58, y: 0.19, width: 0.19, lift: 0.065, lines: 7, speed: 0.007 },
  { at: 0.86, y: 0.37, width: 0.12, lift: 0.04, lines: 5, speed: 0.015 },
];

/**
 * The land at one point along one contour. Each summit is a smooth bump and
 * the range is the highest of them, so ridges meet in valleys instead of
 * blurring through each other. Nearer contours see the peaks shifted a
 * little further across — the parallax of walking towards a range.
 */
function terrain(u: number, d: number, t: number) {
  let h = 0;
  for (const peak of PEAKS) {
    const at = peak.at + (d - 0.5) * 0.06 + Math.sin(t * 0.05 + peak.sway) * 0.012;
    const reach = (u - at) / peak.width;
    h = Math.max(h, peak.height * Math.exp(-reach * reach));
  }
  // Just enough roughness that no slope comes out perfectly smooth
  return h + 0.05 * Math.sin(u * 26 + d * 4.1) + 0.03 * Math.sin(u * 41 - t * 0.1);
}

export function AlbaTopography() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = host.clientWidth || 1200;
      height = host.clientHeight || 600;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      // One transform for the whole drawing: everything below is in CSS px
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const drawSun = (t: number, horizonY: number) => {
      const radius = Math.min(width, height) * 0.1;
      const phase = (t % SUN_PERIOD) / SUN_PERIOD;
      // Slow off the horizon and quicker as it clears: dawn takes its time
      const climb = phase ** 1.45;
      const from = horizonY + radius * 1.1;
      const to = -radius * 1.5;
      const y = from + (to - from) * climb;
      const x = width * 0.62;

      for (let ring = 0; ring < 3; ring += 1) {
        ctx.beginPath();
        ctx.arc(x, y, radius * (1 - ring * 0.17), 0, Math.PI * 2);
        ctx.lineWidth = ring === 0 ? 1.5 : 1;
        ctx.strokeStyle = `rgba(${INK}, ${(0.42 - ring * 0.12).toFixed(3)})`;
        ctx.stroke();
      }
    };

    const drawClouds = (t: number) => {
      for (const cloud of CLOUDS) {
        // Drifting, and round again from the other side
        const cx = (((cloud.at + t * cloud.speed) % 1.34) - 0.17) * width;
        const cy = cloud.y * height;

        for (let i = 0; i < cloud.lines; i += 1) {
          const up = i / (cloud.lines - 1);
          const half = cloud.width * width * (1 - 0.74 * up);
          const y = cy - cloud.lift * height * up;
          ctx.beginPath();
          ctx.moveTo(cx - half, y);
          // A flattened arc: the contour of something with no edges
          ctx.quadraticCurveTo(cx, y - half * 0.26, cx + half, y);
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(${INK}, ${(0.3 - up * 0.16).toFixed(3)})`;
          ctx.stroke();
        }
      }
    };

    const draw = (t: number) => {
      const horizonY = height * HORIZON;
      const depth = height - horizonY;

      ctx.clearRect(0, 0, width, height);

      /*
        The sky carries its weight in a band rather than from the very top
        down: fading in from nothing at the edge means the drawing has no
        hard line anywhere, and the brightest part of it is the horizon,
        which is what makes it read as first light.
      */
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0, `rgba(${INK}, 0)`);
      sky.addColorStop(0.34, `rgba(${INK}, 0.1)`);
      sky.addColorStop(1, `rgba(${INK}, 0)`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, horizonY);

      drawSun(t, horizonY);
      drawClouds(t);

      for (let j = 0; j < ROWS; j += 1) {
        const d = j / (ROWS - 1);
        // Rows crowd at the horizon and open out towards the viewer
        const base = horizonY + depth * d ** 1.7;
        const amp = depth * (0.34 + 0.66 * d);
        // And each one is drawn wider than the row behind it
        const spread = 0.86 + 0.42 * d;

        ctx.beginPath();
        for (let i = 0; i <= SAMPLES; i += 1) {
          const u = i / SAMPLES;
          const x = width / 2 + (u - 0.5) * width * spread;
          const y = base - amp * terrain(u, d, t);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // Everything under this ridge is ground: fill it with the page, and
        // whatever was drawn behind is gone
        ctx.lineTo(width + 2, height + 2);
        ctx.lineTo(-2, height + 2);
        ctx.closePath();
        ctx.fillStyle = `rgb(${PAPER})`;
        ctx.fill();

        // Far lines are thin and faint, near ones carry the weight
        ctx.lineWidth = 0.7 + 1.1 * d;
        ctx.strokeStyle = `rgba(${INK}, ${(0.24 + 0.6 * d).toFixed(3)})`;
        ctx.stroke();

        // Mist settles in the valley it was laid in: the rows still to come
        // will cut through it the way ridges cut through cloud
        const mist = MIST_ROWS.indexOf(j);
        if (mist !== -1) {
          const drift = t * (mist === 0 ? 13 : 8);
          ctx.beginPath();
          ctx.moveTo(-2, height);
          for (let i = 0; i <= SAMPLES; i += 1) {
            const x = (i / SAMPLES) * width;
            const y =
              base -
              amp * 0.1 +
              13 * Math.sin((x + drift) / 240 + mist) +
              6 * Math.sin((x - drift) / 95);
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width + 2, height + 2);
          ctx.closePath();
          ctx.fillStyle = `rgba(${PAPER}, 0.6)`;
          ctx.fill();
        }
      }
    };

    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      draw(reduced ? 0 : (now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };

    if (reduced) {
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
      <canvas ref={canvasRef} className="alba-canvas block h-full w-full" />
    </div>
  );
}
