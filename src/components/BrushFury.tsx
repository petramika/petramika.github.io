import { useEffect, useRef } from 'react';
import { useOnScreen } from '../hooks/useOnScreen';
import texts from '../data/texts.json';

const WORDS = Object.values(texts.brain);
const TRACKS = 28;
const SAMPLES = 40;
const DRAW_S = 0.25;
const HOLD_S = 0.6;
const FADE_S = 2.8;
/** How much of a stroke is left in the ground once it has settled */
const SETTLED = 0.34;

/* The canvas is re-inverted in negative mode, so each mode names what it shows */
const PALETTES = {
  light: {
    paint: ['#d9412b', '#e9a23b', '#2f62c9', '#23906f', '#a8479f', '#1f7fa8'],
    ink: '#141518',
  },
  dark: {
    paint: ['#ff5a3c', '#ffb640', '#4f86ff', '#2fc08f', '#d45cc9', '#3fb6e8'],
    ink: '#f3f1ec',
  },
};

type Stroke = {
  born: number;
  colour: string;
  word: string;
  wordSize: number;
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  width: number;
  seed: number;
  angle: number;
  layer?: HTMLCanvasElement;
};

function rng(seed: number) {
  let a = Math.floor(seed * 4294967296) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One flat watercolour stroke: a band laid by a wide brush, painted as far as `reach` */
function paintStroke(
  ctx: CanvasRenderingContext2D,
  s: Stroke,
  reach: number,
  alpha: number,
  ink: string,
) {
  const rand = rng(s.seed);
  const at = (t: number) => {
    const u = 1 - t;
    return [
      u * u * s.x0 + 2 * u * t * s.cx + t * t * s.x1,
      u * u * s.y0 + 2 * u * t * s.cy + t * t * s.y1,
    ];
  };
  const nx = -Math.sin(s.angle);
  const ny = Math.cos(s.angle);
  const along = (t: number, across: number) => {
    const [x, y] = at(t);
    return [x + nx * across, y + ny * across];
  };

  ctx.strokeStyle = s.colour;
  ctx.fillStyle = s.colour;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';

  // The body of the wash, uneven along its length
  ctx.beginPath();
  const half = s.width / 2;
  const bodyEnd = Math.min(reach, 0.84);
  for (let i = 0; i <= SAMPLES; i += 1) {
    const t = 0.06 + (i / SAMPLES) * (bodyEnd - 0.06);
    const [x, y] = along(t, -half * (0.92 + 0.08 * Math.sin(t * 17 + s.seed * 9)));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = SAMPLES; i >= 0; i -= 1) {
    const t = 0.06 + (i / SAMPLES) * (bodyEnd - 0.06);
    const [x, y] = along(t, half * (0.9 + 0.1 * Math.sin(t * 13 + s.seed * 5)));
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.globalAlpha = alpha * 0.2;
  ctx.fill();

  // Bristle tracks: ragged at the ends, running dry towards the tail
  for (let b = 0; b < TRACKS; b += 1) {
    const f = b / (TRACKS - 1);
    const across = (f - 0.5) * s.width;
    // Pigment gathers along the two edges of the band
    const edge = Math.abs(f - 0.5) * 2;
    const start = rand() * rand() * 0.14;
    const end = Math.min(reach, 0.78 + rand() * 0.22);
    ctx.lineWidth = (s.width / TRACKS) * (1.3 + rand());
    ctx.globalAlpha = alpha * (0.05 + rand() * 0.07 + edge ** 4 * 0.2);
    ctx.beginPath();
    let down = false;
    for (let i = 0; i <= SAMPLES; i += 1) {
      const t = start + (i / SAMPLES) * (end - start);
      const dry = t > 0.62 && rand() < (t - 0.62) * 1.6;
      if (dry) {
        down = false;
        continue;
      }
      const [x, y] = along(t, across);
      if (!down) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      down = true;
    }
    ctx.stroke();
  }

  // Where water fell off the brush: a few drops and a pale bloom
  if (reach >= 1) {
    for (let d = 0; d < 7; d += 1) {
      const t = rand();
      const [x, y] = along(t, (rand() < 0.5 ? -1 : 1) * s.width * (0.65 + rand() * 0.9));
      const r = 1.2 + rand() * s.width * (rand() < 0.2 ? 0.16 : 0.06);
      ctx.globalAlpha = alpha * (0.12 + rand() * 0.22);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (reach > 0.35) {
    const [wx, wy] = at(0.5);
    ctx.save();
    ctx.globalAlpha = alpha * 0.85 * Math.min(1, (reach - 0.35) * 3);
    ctx.translate(wx, wy);
    ctx.rotate(Math.max(-0.5, Math.min(0.5, s.angle)));
    ctx.font = `600 ${s.wordSize}px Caveat, 'Segoe Script', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.fillText(s.word, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function BrushFury() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onScreen = useOnScreen(hostRef);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ground = document.createElement('canvas');
    const gctx = ground.getContext('2d');
    if (!gctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Canvas blur is missing on older Safari; there the fade is alpha alone
    ctx.filter = 'blur(1px)';
    const canBlur = ctx.filter === 'blur(1px)';
    ctx.filter = 'none';

    let width = 0;
    let height = 0;
    let dpr = 1;
    let active: Stroke[] = [];
    let wordIndex = 0;
    let colourIndex = 0;
    let nextAt = 0;
    let mode: boolean | null = null;

    const tone = () =>
      document.documentElement.classList.contains('negative-mode') ? PALETTES.dark : PALETTES.light;

    const makeStroke = (now: number): Stroke => {
      const pal = tone().paint;
      const small = width < 768;
      const len = width * (small ? 0.55 : 0.38) * (0.8 + Math.random() * 0.5);
      const angle = (Math.random() - 0.5) * 0.5;
      const mx = width * (0.12 + Math.random() * 0.76);
      const my = height * (0.15 + Math.random() * 0.7);
      const dx = (Math.cos(angle) * len) / 2;
      const dy = (Math.sin(angle) * len) / 2;
      const bend = (Math.random() - 0.5) * len * 0.08;
      const stroke: Stroke = {
        born: now,
        colour: pal[colourIndex % pal.length],
        word: WORDS[wordIndex % WORDS.length],
        wordSize: small ? 30 : 44,
        x0: mx - dx,
        y0: my - dy,
        cx: mx - Math.sin(angle) * bend,
        cy: my + Math.cos(angle) * bend,
        x1: mx + dx,
        y1: my + dy,
        width: (small ? 44 : 78) * (0.7 + Math.random() * 0.6),
        seed: Math.random(),
        angle: angle > Math.PI / 4 ? angle - Math.PI / 2 : angle,
      };
      wordIndex += 1;
      colourIndex += 1 + Math.floor(Math.random() * 2);
      return stroke;
    };

    const settle = (s: Stroke) => {
      // Older paint sinks a little further each time a new layer goes down
      gctx.globalCompositeOperation = 'destination-out';
      gctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      gctx.fillRect(0, 0, width, height);
      gctx.globalCompositeOperation = 'source-over';
      if (canBlur) gctx.filter = 'blur(5px)';
      paintStroke(gctx, s, 1, SETTLED, tone().ink);
      gctx.filter = 'none';
    };

    const seedGround = () => {
      gctx.clearRect(0, 0, width, height);
      for (let i = 0; i < 5; i += 1) settle(makeStroke(0));
    };

    const resize = () => {
      width = host.clientWidth || 1200;
      height = host.clientHeight || 800;
      dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);
      for (const c of [canvas, ground]) {
        c.width = Math.round(width * dpr);
        c.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      active = [];
      mode = null;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    // Finished strokes are sealed into a layer of their own, so fading one
    // costs a single copy per frame rather than repainting its bristles
    const pool: HTMLCanvasElement[] = [];
    const seal = (s: Stroke) => {
      const layer = pool.pop() ?? document.createElement('canvas');
      layer.width = canvas.width;
      layer.height = canvas.height;
      const lctx = layer.getContext('2d');
      if (!lctx) return;
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintStroke(lctx, s, 1, 1, tone().ink);
      s.layer = layer;
      // Its softened trace goes into the ground straight away, under the sharp one
      settle(s);
    };

    let raf = 0;
    let idle = false;
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      if (!onScreen.current) return;
      const now = ms / 1000;
      const negative = document.documentElement.classList.contains('negative-mode');
      if (negative !== mode) {
        mode = negative;
        for (const s of active) if (s.layer) pool.push(s.layer);
        active = [];
        seedGround();
        nextAt = now + 0.3;
        idle = false;
      }
      if (reduced) {
        if (!idle) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(ground, 0, 0, width, height);
          idle = true;
        }
        return;
      }

      if (now >= nextAt) {
        active.push(makeStroke(now));
        nextAt = now + 1.2 + Math.random() * 1;
        idle = false;
      }
      if (idle) return;

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(ground, 0, 0, width, height);

      const ink = tone().ink;
      const kept: Stroke[] = [];
      for (const s of active) {
        const age = now - s.born;
        if (age < DRAW_S) {
          paintStroke(ctx, s, age / DRAW_S, 1, ink);
          kept.push(s);
          continue;
        }
        if (!s.layer) seal(s);
        const fading = Math.max(0, age - DRAW_S - HOLD_S) / FADE_S;
        if (fading >= 1) {
          if (s.layer) pool.push(s.layer);
          continue;
        }
        ctx.globalAlpha = 1 - fading * fading * (3 - 2 * fading);
        if (s.layer) ctx.drawImage(s.layer, 0, 0, width, height);
        ctx.globalAlpha = 1;
        kept.push(s);
      }
      active = kept;
      if (!active.length) idle = true;
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [onScreen]);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
