import { useEffect, useRef } from 'react';
import { useOnScreen } from '../hooks/useOnScreen';

/**
 * Dawn over a range, drawn as a survey rather than as a picture: contour
 * lines running over the massifs, and a sea of cloud lying in the valleys
 * between them. The range is Sierra Nevada, roughly read from the west.
 *
 * Two things make it read as landscape and not as pattern.
 *
 * The first is hidden-line removal. Rows are drawn from the horizon
 * forwards, and each one fills everything beneath its own line with the page
 * colour before it is stroked, so a near ridge hides what stands behind it.
 * It is what a plotter does, and nothing else gives solid ground.
 *
 * The second is that the summits are placed in DEPTH as well as across. Each
 * massif is a dome centred at its own distance, so a contour line swells as
 * the rows approach that distance and falls away past it — which is what
 * makes the lines wrap over a shoulder instead of corrugating a wall. Peaks
 * that are identical at every depth, which is what this drawing had first,
 * can only ever produce a woven sheet.
 *
 * Nothing in the rock moves. The range sways a fraction, the way a long lens
 * breathes, and everything else that moves is cloud.
 *
 * The dawn is not on a clock at all: it is on where the chapter sits in the
 * window. Night at the edges, full light when the panel is square in front
 * of you — so the sun is highest exactly when you are looking at it, and
 * goes back down as you leave. Reading the position each frame rather than
 * adding up scroll matters: an accumulator drifts, cannot be reversed
 * honestly, and has no idea whether you are actually looking at any of it.
 *
 * Speeding up a looping sky was the wrong answer to the same question: the
 * light went round and round regardless, and scrolling only turned the dial
 * faster. Cloud still drifts on its own time, because weather does not stop
 * when you do.
 *
 * It is the one thing in the essay drawn in colour, so it does not go
 * through the page's negative: inverting a dawn hands you its complement,
 * which is a sky nobody has ever seen. The canvas is re-inverted like the
 * photographs are, and instead carries two palettes of its own — first light
 * over the cloud sea on the white page, the last of the night on the dark
 * one. Same drawing, same hour, read from either side of the paper.
 */

/** Contour lines from the horizon to the foreground */
const ROWS = 54;
/** Points sampled across each line */
const SAMPLES = 180;
/**
 * Where the horizon sits within the drawing. Better than half the frame is
 * sky: the piece is the dawn, and the range is what the dawn happens behind.
 */
const HORIZON = 0.56;

/**
/**
 * Only the sky moves. The range, the haze and the contour lines are the same
 * drawing throughout — what the scroll brings is the light behind them.
 *
 * Each mode has three skies. The first has no colour in it at all: the page's
 * own value, so the chapter opens as the line drawing it is and nothing more.
 * Then the dawn comes up through it, and by the time the panel is square in
 * front of you it is as good as morning. Scroll back and it goes out again.
 */
const PALETTES = {
  light: {
    skies: [
      // No colour: paper, and a drawing on it
      ['#fbfbfb', '#f7f7f5', '#f3f2ef', '#f1f0ec'],
      // First light
      ['#a9b7e6', '#e7b9ce', '#f9be9e', '#fddcba'],
      // As good as day
      ['#8fb4e8', '#cbd8f0', '#f7dcc0', '#fdf1de'],
    ],
    ground: '#f1f0ed',
    ink: '44, 44, 51',
    mist: '255, 255, 255',
    glow: '255, 238, 206',
  },
  dark: {
    skies: [
      ['#040404', '#050507', '#07070a', '#09090c'],
      ['#060915', '#1f1730', '#472833', '#7c4630'],
      ['#1d3d68', '#4d6f97', '#9a7c62', '#cba47c'],
    ],
    ground: '#0e1017',
    ink: '206, 209, 219',
    mist: '58, 70, 96',
    glow: '255, 168, 84',
  },
};

/** Bends the light up early, so the sky is already giving before dead centre */
const DAWN_EASE = 0.62;

/** Straight-line mix of two #rrggbb, returned as the channels themselves */
function mixHex(a: string, b: string, k: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const va = (pa >> shift) & 255;
    const vb = (pb >> shift) & 255;
    return Math.round(va + (vb - va) * k);
  };
  return `${ch(16)}, ${ch(8)}, ${ch(0)}`;
}

/** The sky at one moment of the dawn, stop by stop */
function skyAt(skies: string[][], dawn: number) {
  const turn = Math.max(0, Math.min(1, dawn)) * (skies.length - 1);
  const step = Math.min(Math.floor(turn), skies.length - 2);
  const k = turn - step;
  return skies[step].map((stop, i) => mixHex(stop, skies[step + 1][i], k));
}

/**
 * The range as it stands over Granada, read west to east: the long rise of
 * the Caballo, the Veleta breaking sharply at its own north face, Mulhacén
 * round and heavier behind it, then the Alcazaba and the fall away east.
 *
 * `u` runs left to right and `z` from the horizon to the foreground, so each
 * summit sits at its own distance as well as its own place along the sky.
 * The two horizontal radii are what matter most: a mountain is not
 * symmetrical, and giving each side its own reach is the whole difference
 * between a row of bumps and a skyline you could recognise — a long shoulder
 * on one side, a face that drops on the other. Heights are relative to
 * Mulhacén, 3479m, the highest ground on the peninsula.
 */
const MASSIFS = [
  { u: 0.06, z: 0.62, ruL: 0.2, ruR: 0.16, rz: 0.32, h: 0.44 }, // Cerro del Caballo
  { u: 0.24, z: 0.4, ruL: 0.19, ruR: 0.13, rz: 0.3, h: 0.63 }, // Tozal del Cartujo
  { u: 0.41, z: 0.33, ruL: 0.21, ruR: 0.09, rz: 0.28, h: 0.93 }, // Veleta: the north face drops
  { u: 0.56, z: 0.47, ruL: 0.14, ruR: 0.19, rz: 0.33, h: 1.0 }, // Mulhacén, round and heavy
  { u: 0.7, z: 0.36, ruL: 0.11, ruR: 0.16, rz: 0.27, h: 0.85 }, // Alcazaba
  { u: 0.85, z: 0.56, ruL: 0.15, ruR: 0.18, rz: 0.3, h: 0.6 }, // Picón de Jerez
  { u: 0.98, z: 0.72, ruL: 0.17, ruR: 0.2, rz: 0.28, h: 0.45 }, // the fall away east
];

/**
 * The height of the ground at one point on one contour. Each massif is a
 * dome in both directions and the range is the highest of them, so ridges
 * meet in valleys rather than blurring through one another.
 */
function terrain(u: number, d: number) {
  let h = 0;
  for (const m of MASSIFS) {
    // Which side of the summit we are on decides how far it reaches
    const du = (u - m.u) / (u < m.u ? m.ruL : m.ruR);
    const dz = (d - m.z) / m.rz;
    h = Math.max(h, m.h * Math.exp(-(du * du + dz * dz)));
  }
  // Roughness scaled by the height, so the valleys stay quiet
  return h + h * (0.06 * Math.sin(u * 31 + d * 9.3) + 0.035 * Math.sin(u * 57 - d * 4.1));
}

/** The top of the cloud sea, in the same units as the ground */
function cloudLine(x: number, t: number) {
  return (
    0.3 +
    0.06 * Math.sin(x / 300 + t * 0.13) +
    0.035 * Math.sin(x / 140 - t * 0.084) +
    0.02 * Math.sin(x / 68 + t * 0.047)
  );
}

export function AlbaTopography() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onScreen = useOnScreen(hostRef);

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

    /*
      Only the newest loop may paint. Fast Refresh keeps an effect with empty
      deps alive across an edit, so the previous generation goes on drawing
      into the same canvas — which is why a fixed version of this drawing
      could stay broken on screen until a full reload, and why it looked like
      the fix had not worked. The marker lives on the DOM node, because a
      reloaded module gets fresh variables but the same node.
    */
    const generation = `${Date.now()}-${Math.random()}`;
    host.dataset.albaGeneration = generation;

    const draw = (t: number, dawn: number) => {
      // The page owns the mode; the drawing only asks which one it is in
      const tone = document.documentElement.classList.contains('negative-mode')
        ? PALETTES.dark
        : PALETTES.light;
      const horizonY = height * HORIZON;
      const depth = height - horizonY;
      // The range sways rather than travels: a pan would walk the summits
      // out of the frame within a minute
      const sway = 0.022 * Math.sin(t * 0.026);

      /*
        A phone gets a stretch of the range, not the whole of it. Squeezing
        seven massifs into 390px crowds every summit against the next and
        the sierra reads as a crumpled ribbon; showing the middle of it at
        the same scale keeps the mountains the size mountains are. The
        vertical eases off with it, or a tall narrow panel builds a wall.
      */
      const aspect = width / height;
      const span = Math.max(0.42, Math.min(1, aspect * 0.55));
      const lift = Math.min(1, 0.58 + aspect * 0.28);

      ctx.clearRect(0, 0, width, height);

      /*
        The sky carries its weight in a band rather than from the very top
        down: fading in from nothing at the edge leaves no hard line anywhere,
        and the lightest part of the drawing ends up being the horizon, which
        is what makes it read as first light.
      */
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
      const stops = [0, 0.32, 0.6, 1];
      skyAt(tone.skies, dawn).forEach((colour, i) =>
        sky.addColorStop(stops[i], `rgb(${colour})`),
      );
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, horizonY + 1);

      /*
        The light itself, banked along the horizon and rising with the dawn.
        The gradient of skies alone changes the hue but not the brightness,
        and a dawn you cannot see arrive is just a different colour.
      */
      const glow = ctx.createLinearGradient(0, horizonY - depth * 0.5, 0, horizonY);
      glow.addColorStop(0, `rgba(${tone.glow}, 0)`);
      glow.addColorStop(1, `rgba(${tone.glow}, ${(0.72 * dawn ** 1.2).toFixed(3)})`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, horizonY - depth * 0.5, width, depth * 0.5 + 1);

      /*
        Ground everywhere below the horizon before a single contour is drawn.
        The far rows are narrower than the near ones, so their fills close
        diagonally to the corners and leave a wedge of nothing at either side
        — holes in the dawn, with the panel showing through them.
      */
      ctx.fillStyle = tone.ground;
      ctx.fillRect(0, horizonY, width, height - horizonY + 2);

      for (let j = 0; j < ROWS; j += 1) {
        const d = j / (ROWS - 1);
        // Rows crowd at the horizon and open out towards the viewer
        const base = horizonY + depth * d ** 1.85;
        const amp = depth * (0.26 + 0.5 * d) * lift;
        // And each is drawn wider than the row behind it
        const spread = 0.84 + 0.5 * d;

        ctx.beginPath();
        for (let i = 0; i <= SAMPLES; i += 1) {
          const across = i / SAMPLES;
          // Which slice of the range this screen is wide enough to hold
          const u = 0.5 + (across - 0.5) * span;
          const x = width / 2 + (across - 0.5) * width * spread;
          const y = base - amp * terrain(u + sway, d);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // Everything under this ridge is ground: fill it with the page, and
        // whatever stood behind it is gone
        ctx.lineTo(width + 2, height + 2);
        ctx.lineTo(-2, height + 2);
        ctx.closePath();
        ctx.fillStyle = tone.ground;
        ctx.fill();

        // Far lines are thin and faint, near ones carry the weight
        ctx.lineWidth = 0.55 + 0.95 * d;
        ctx.strokeStyle = `rgba(${tone.ink}, ${(0.22 + 0.5 * d).toFixed(3)})`;
        ctx.stroke();

        /*
          Aerial haze, one thin veil per row. It has to stay this faint: a
          veil is laid from its own row down to the bottom, so any point in
          the drawing collects one from every row still behind it. At a
          third of an alpha each that arithmetic buries the whole range in
          white within a dozen rows, which is exactly what it did.
        */
        ctx.beginPath();
        ctx.moveTo(-2, height + 2);
        for (let i = 0; i <= SAMPLES; i += 1) {
          const x = (i / SAMPLES) * width;
          ctx.lineTo(x, base - amp * cloudLine(x, t));
        }
        ctx.lineTo(width + 2, height + 2);
        ctx.closePath();
        ctx.fillStyle = `rgba(${tone.mist}, ${(0.03 + 0.05 * d).toFixed(3)})`;
        ctx.fill();
      }

      /*
        And then the cloud sea itself, once, over everything: a single body
        with an undulating surface that drifts, lying at one height the way
        an inversion layer actually does. The summits that stand above it
        were drawn taller than its line and come through; everything below
        drowns, and the foreground — where all this weather is heading — goes
        white.
      */
      const seaD = 0.58;
      const seaBase = horizonY + depth * seaD ** 1.85;
      const seaAmp = depth * (0.26 + 0.5 * seaD) * lift;

      ctx.beginPath();
      ctx.moveTo(-2, height + 2);
      for (let i = 0; i <= SAMPLES; i += 1) {
        const x = (i / SAMPLES) * width;
        ctx.lineTo(x, seaBase - seaAmp * cloudLine(x, t));
      }
      ctx.lineTo(width + 2, height + 2);
      ctx.closePath();

      const sea = ctx.createLinearGradient(0, seaBase - seaAmp * 0.42, 0, height);
      sea.addColorStop(0, `rgba(${tone.mist}, 0.34)`);
      sea.addColorStop(0.45, `rgba(${tone.mist}, 0.74)`);
      sea.addColorStop(1, `rgba(${tone.mist}, 0.95)`);
      ctx.fillStyle = sea;
      ctx.fill();
    };

    /*
      How far into the dawn we are: purely where this panel sits in the
      window. One at dead centre, nothing once it is a whole screen away.
    */
    const dawnNow = () => {
      const box = host.getBoundingClientRect();
      const view = window.innerHeight;
      const centre = box.top + box.height / 2;
      const reach = view / 2 + box.height / 2;
      if (reach <= 0) return 0;
      const away = Math.min(1, Math.abs(centre - view / 2) / reach);
      // Eased so the sky is already giving light on the way in, rather than
      // holding the night until the last moment and flashing
      return (1 - away) ** DAWN_EASE;
    };

    let raf = 0;
    const start = performance.now();

    const loop = (now: number) => {
      if (host.dataset.albaGeneration !== generation) return;
      if (!onScreen.current) {
        raf = requestAnimationFrame(loop);
        return;
      }
      draw(reduced ? 0 : (now - start) / 1000, reduced ? 0.6 : dawnNow());
      raf = requestAnimationFrame(loop);
    };

    if (reduced) {
      draw(0, 0.6);
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [onScreen]);

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
      <canvas ref={canvasRef} className="alba-canvas block h-full w-full" />
    </div>
  );
}
