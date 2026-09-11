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
 * Ink and paper are the page's own two values, so the whole drawing flips
 * with the negative — see the note beside `.alba-canvas` in the stylesheet
 * for why this canvas has to opt out of the rule that protects photographs.
 */

/** Contour lines from the horizon to the foreground */
const ROWS = 42;
/** Points sampled across each line */
const SAMPLES = 132;
/** Where the horizon sits within the drawing */
const HORIZON = 0.2;
/** Which rows the mist lies in front of */
const MIST_ROWS = [13, 24];

const INK = '20, 21, 24';
const PAPER = '251, 251, 251';

/**
 * The land itself. Layered waves whose phases run at different rates with
 * depth, so no two contours describe the same ridge and the range never
 * repeats into the distance.
 */
function terrain(u: number, d: number, t: number) {
  return (
    Math.sin(u * 3.1 - d * 1.2 - t * 0.021) * 0.42 +
    Math.sin(u * 6.2 + d * 2.1 + t * 0.05) * 0.55 +
    Math.sin(u * 11.3 - d * 3.4 + 1.7) * 0.3 +
    Math.sin(u * 19.7 + d * 5.2 + t * 0.03) * 0.16
  );
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

    const draw = (t: number) => {
      const horizonY = height * HORIZON;
      const depth = height - horizonY;

      ctx.clearRect(0, 0, width, height);

      // First light: the sky carries its weight at the top and lets go as it
      // comes down, so the brightest part of the drawing is the horizon
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0, `rgba(${INK}, 0.13)`);
      sky.addColorStop(1, `rgba(${INK}, 0)`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, horizonY);

      ctx.strokeStyle = `rgba(${INK}, 0.16)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(width, horizonY);
      ctx.stroke();

      for (let j = 0; j < ROWS; j += 1) {
        const d = j / (ROWS - 1);
        // Rows crowd at the horizon and open out towards the viewer
        const base = horizonY + depth * d ** 1.85;
        const amp = depth * (0.1 + 0.36 * d);
        // And each one is drawn wider than the row behind it
        const spread = 0.8 + 0.55 * d;

        ctx.beginPath();
        for (let i = 0; i <= SAMPLES; i += 1) {
          const u = i / SAMPLES;
          const x = width / 2 + (u - 0.5) * width * spread;
          // Normalised into 0..1 so a ridge only ever rises from its line
          const h = (terrain(u * spread * 2.4 + t * 0.014, d, t) + 1.43) / 2.86;
          const y = base - amp * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // Everything under this ridge is ground: fill it with the page, and
        // whatever was drawn behind is gone
        ctx.lineTo(width, height + 2);
        ctx.lineTo(0, height + 2);
        ctx.closePath();
        ctx.fillStyle = `rgb(${PAPER})`;
        ctx.fill();

        // Far lines are thin and faint, near ones carry the weight
        ctx.lineWidth = 0.75 + 1.15 * d;
        ctx.strokeStyle = `rgba(${INK}, ${(0.26 + 0.6 * d).toFixed(3)})`;
        ctx.stroke();

        // Mist sits in the valley it was laid in: rows in front of it are
        // still to come, so they will cut through it the way ridges do
        const mist = MIST_ROWS.indexOf(j);
        if (mist !== -1) {
          const drift = t * (mist === 0 ? 15 : 9);
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let i = 0; i <= SAMPLES; i += 1) {
            const x = (i / SAMPLES) * width;
            const y =
              base -
              amp * 0.22 +
              14 * Math.sin((x + drift) / 230 + mist) +
              7 * Math.sin((x - drift) / 95);
            if (i === 0) ctx.lineTo(0, y);
            else ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height + 2);
          ctx.closePath();
          ctx.fillStyle = `rgba(${PAPER}, 0.62)`;
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
