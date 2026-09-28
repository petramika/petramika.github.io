import { useEffect, useRef } from 'react';
import { useOnScreen } from '../hooks/useOnScreen';
import texts from '../data/texts.json';

const WORDS = Object.values(texts.brain);
const BRISTLES = 16;
const SAMPLES = 36;
const DRAW_S = 0.45;
const HOLD_S = 0.9;
const FADE_S = 3.2;
/** How much of a stroke is left in the ground once it has settled */
const SETTLED = 0.34;

/* The canvas is re-inverted in negative mode, so each mode names what it shows */
const PALETTES = {
  light: {
    paint: ['#d9412b', '#e9a23b', '#2f62c9', '#23906f', '#a8479f', '#1d1d22'],
    ink: '#141518',
  },
  dark: {
    paint: ['#ff5a3c', '#ffb640', '#4f86ff', '#2fc08f', '#d45cc9', '#e9e6df'],
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

/** One dry-brush stroke: bristles fanned across the spine, drawn as far as `reach` */
function paintStroke(
  ctx: CanvasRenderingContext2D,
  s: Stroke,
  reach: number,
  alpha: number,
  shake: number,
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

  ctx.lineCap = 'round';
  ctx.strokeStyle = s.colour;
  for (let b = 0; b < BRISTLES; b += 1) {
    const across = (b / (BRISTLES - 1) - 0.5) * s.width;
    const load = 0.35 + rand() * 0.65;
    // Dry bristles run out early, which is what leaves the streaks
    const runOut = 0.55 + rand() * 0.45;
    const jag = rand() * 10;
    ctx.globalAlpha = alpha * load;
    ctx.lineWidth = (s.width / BRISTLES) * (1.4 + rand() * 1.6);
    ctx.beginPath();
    const end = Math.min(reach, runOut);
    for (let i = 0; i <= SAMPLES; i += 1) {
      const t = (i / SAMPLES) * end;
      const [x, y] = at(t);
      const [nx2, ny2] = at(Math.min(1, t + 0.01));
      const dx = nx2 - x;
      const dy = ny2 - y;
      const len = Math.hypot(dx, dy) || 1;
      // Pressure: the brush lands hard, lifts at the tail
      const press = Math.sin(Math.PI * Math.min(1, t * 1.2 + 0.08)) * 0.5 + 0.5;
      const wobble = Math.sin(t * 38 + jag) * shake + Math.sin(t * 91 + jag * 2) * shake * 0.4;
      const off = across * press + wobble;
      const px = x + (-dy / len) * off;
      const py = y + (dx / len) * off;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Flecks thrown off the end of a stroke made in a hurry
  if (reach > 0.8) {
    ctx.fillStyle = s.colour;
    const [ex, ey] = at(Math.min(reach, 1));
    for (let f = 0; f < 9; f += 1) {
      ctx.globalAlpha = alpha * (0.4 + rand() * 0.5);
      const r = 1 + rand() * s.width * 0.06;
      const d = s.width * (0.3 + rand() * 1.1);
      const a = s.angle + (rand() - 0.5) * 1.6;
      ctx.beginPath();
      ctx.arc(ex + Math.cos(a) * d, ey + Math.sin(a) * d, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (reach > 0.35) {
    const [wx, wy] = at(0.5);
    ctx.save();
    ctx.globalAlpha = alpha * Math.min(1, (reach - 0.35) * 3);
    ctx.translate(wx, wy);
    ctx.rotate(Math.max(-0.5, Math.min(0.5, s.angle)));
    ctx.font = `600 ${s.wordSize}px Caveat, 'Segoe Script', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.fillText(s.word, shake * 0.3, s.width * 0.05);
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
      const angle = (Math.random() - 0.5) * 1.1 + (Math.random() < 0.25 ? Math.PI / 2 : 0);
      const mx = width * (0.12 + Math.random() * 0.76);
      const my = height * (0.15 + Math.random() * 0.7);
      const dx = (Math.cos(angle) * len) / 2;
      const dy = (Math.sin(angle) * len) / 2;
      const bend = (Math.random() - 0.5) * len * 0.5;
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
        width: (small ? 34 : 56) * (0.7 + Math.random() * 0.8),
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
      gctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      gctx.fillRect(0, 0, width, height);
      gctx.globalCompositeOperation = 'source-over';
      if (canBlur) gctx.filter = 'blur(5px)';
      paintStroke(gctx, s, 1, SETTLED, 0, tone().ink);
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

    let raf = 0;
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      if (!onScreen.current) return;
      const now = ms / 1000;
      const negative = document.documentElement.classList.contains('negative-mode');
      if (negative !== mode) {
        mode = negative;
        active = [];
        seedGround();
        nextAt = now + 0.3;
        if (reduced) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(ground, 0, 0, width, height);
        }
      }
      if (reduced) return;

      if (now >= nextAt) {
        active.push(makeStroke(now));
        nextAt = now + 1 + Math.random() * 0.9;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(ground, 0, 0, width, height);

      const ink = tone().ink;
      const done: Stroke[] = [];
      for (const s of active) {
        const age = now - s.born;
        const reach = Math.min(1, age / DRAW_S);
        const fading = Math.max(0, age - DRAW_S - HOLD_S) / FADE_S;
        if (fading >= 1) {
          done.push(s);
          continue;
        }
        const ease = fading * fading * (3 - 2 * fading);
        const alpha = 1 - (1 - SETTLED) * ease;
        // The shaking dies down as the paint settles
        const shake = (s.width * 0.12) * (1 - ease) * (0.6 + 0.4 * Math.sin(now * 23 + s.seed * 9));
        if (canBlur && ease > 0.02) ctx.filter = `blur(${(ease * 5).toFixed(1)}px)`;
        paintStroke(ctx, s, reach, alpha, shake, ink);
        ctx.filter = 'none';
      }
      for (const s of done) settle(s);
      if (done.length) active = active.filter((s) => !done.includes(s));
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
