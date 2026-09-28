import { useEffect, useRef } from 'react';
import { useOnScreen } from '../hooks/useOnScreen';

/* The canvas is re-inverted in negative mode, so each mode names what it shows */
const PALETTES = {
  light: { outer: '#e4e3e0', light: '#fbfbfb', ink: '20, 21, 24' },
  dark: { outer: '#0c0c0d', light: '#1c1c1e', ink: '236, 234, 229' },
};
const GOLD = [210, 163, 71];
/** Segments of fresh line still carrying the gold before they dry to ink */
const TRAIL = 70;
/** Dried segments are laid down in batches of this many */
const DRY = 12;
const STEP = 3.6;
const CELL = 36;

type Point = { x: number; y: number };

function mixInk(ink: string, k: number) {
  const c = ink.split(',').map(Number);
  return `rgb(${GOLD.map((g, i) => Math.round(g + (c[i] - g) * k)).join(', ')})`;
}

export function ScribbleTangle() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onScreen = useOnScreen(hostRef);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const paper = document.createElement('canvas');
    const pctx = paper.getContext('2d');
    if (!pctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let oval = { cx: 0, cy: 0, rx: 1, ry: 1 };
    let cols = 0;
    let density: Uint16Array = new Uint16Array(0);
    let budget = 0;
    let drawn = 0;
    let mode: boolean | null = null;

    // The invisible pencil
    let pen: Point = { x: 0, y: 0 };
    let heading = 0;
    let turn = 0.2;
    let trail: Point[] = [];

    const tone = () =>
      document.documentElement.classList.contains('negative-mode') ? PALETTES.dark : PALETTES.light;

    const inOval = (x: number, y: number) =>
      ((x - oval.cx) / oval.rx) ** 2 + ((y - oval.cy) / oval.ry) ** 2;

    const cellAt = (x: number, y: number) =>
      Math.max(0, Math.floor(y / CELL)) * cols + Math.max(0, Math.min(cols - 1, Math.floor(x / CELL)));

    // Dried line goes down as one polyline, so no joins bead up where it overlaps
    const commit = (pts: Point[]) => {
      if (pts.length < 2) return;
      pctx.beginPath();
      pctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) pctx.lineTo(pts[i].x, pts[i].y);
      pctx.stroke();
      // Keep the last point, so the next piece starts where this one stopped
      if (trail.length) trail.unshift(pts[pts.length - 1]);
    };

    // Where the hand is drifting to: somewhere the tangle is still thin
    let target: Point = { x: 0, y: 0 };
    let targetAge = 0;
    let stretch = 0;
    const pickTarget = () => {
      let bestScore = Infinity;
      for (let k = 0; k < 12; k += 1) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        if (inOval(x, y) < 1.15) continue;
        const score = (density[cellAt(x, y)] ?? 0) + Math.hypot(x - pen.x, y - pen.y) / 60;
        if (score < bestScore) {
          bestScore = score;
          target = { x, y };
        }
      }
      targetAge = 0;
      stretch = Math.random() * Math.PI;
    };

    /** One small move of the pencil: never lifted, looping as it drifts */
    const step = () => {
      // The turn drifts, so loops tighten, open out and spiral rather than repeat
      turn += (Math.random() - 0.5) * 0.08;
      const size = Math.abs(turn);
      if (size < 0.03 || size > 0.3) turn = Math.sign(turn || 1) * (0.04 + Math.random() * 0.22);
      if (Math.random() < 0.005) turn = -turn;
      heading += turn;

      // A hand draws ovals, not circles: the stroke runs longer one way round
      const len = STEP * (1 + 0.45 * Math.sin(2 * heading + stretch));
      const tx = target.x - pen.x;
      const ty = target.y - pen.y;
      const td = Math.hypot(tx, ty) || 1;
      const drift = 1.3;
      let x = pen.x + Math.cos(heading) * len + (tx / td) * drift + (Math.random() - 0.5) * 0.5;
      let y = pen.y + Math.sin(heading) * len + (ty / td) * drift + (Math.random() - 0.5) * 0.5;

      if (inOval(x, y) < 0.92) {
        // Pushed back out of the light, still on the same line
        const out = Math.atan2((y - oval.cy) / oval.ry, (x - oval.cx) / oval.rx);
        x = pen.x + Math.cos(out) * STEP;
        y = pen.y + Math.sin(out) * STEP;
        if (targetAge > 60) pickTarget();
      }

      const next = { x, y };
      trail.push(next);
      if (trail.length > TRAIL + DRY) commit(trail.splice(0, DRY));
      pen = next;
      drawn += 1;
      density[cellAt(x, y)] += 1;
      targetAge += 1;
      if (td < 30 || targetAge > 700 || density[cellAt(x, y)] > 110) pickTarget();
    };

    const drawFigure = (t: typeof PALETTES.light) => {
      const { cx, cy, ry } = oval;
      const s = ry;
      const headY = cy - 0.32 * s;
      const faceRx = 0.12 * s;
      const faceRy = 0.155 * s;
      pctx.lineCap = 'round';
      pctx.lineJoin = 'round';

      // Long dark hair: one mass framing the face, then strands over it
      const fr = faceRx;
      const top = headY - faceRy * 1.25;
      const fall = headY + 0.5 * s;
      const side = (dir: number) => {
        pctx.bezierCurveTo(cx + dir * fr * 1.7, top, cx + dir * fr * 2.05, headY - faceRy * 0.2, cx + dir * fr * 2, headY + 0.2 * s);
        pctx.lineTo(cx + dir * fr * 2.05, fall);
        pctx.lineTo(cx + dir * fr * 1.1, fall - 0.02 * s);
        pctx.bezierCurveTo(cx + dir * fr * 1.05, headY + 0.2 * s, cx + dir * fr * 1.05, headY, cx + dir * fr * 0.9, headY - faceRy * 0.55);
      };
      pctx.fillStyle = `rgba(${t.ink}, 0.88)`;
      pctx.beginPath();
      pctx.moveTo(cx, top);
      side(-1);
      pctx.quadraticCurveTo(cx, headY - faceRy * 1.05, cx + fr * 0.9, headY - faceRy * 0.55);
      pctx.bezierCurveTo(cx + fr * 1.05, headY, cx + fr * 1.05, headY + 0.2 * s, cx + fr * 1.1, fall - 0.02 * s);
      pctx.lineTo(cx + fr * 2.05, fall);
      pctx.lineTo(cx + fr * 2, headY + 0.2 * s);
      pctx.bezierCurveTo(cx + fr * 2.05, headY - faceRy * 0.2, cx + fr * 1.7, top, cx, top);
      pctx.fill();

      pctx.strokeStyle = `rgba(${t.light === PALETTES.light.light ? '251, 251, 251' : '12, 12, 13'}, 0.35)`;
      pctx.lineWidth = 0.7;
      pctx.lineCap = 'round';
      pctx.lineJoin = 'round';
      pctx.beginPath();
      for (let k = 0; k < 40; k += 1) {
        const dir = k % 2 === 0 ? -1 : 1;
        const u = Math.random();
        const x0 = cx + dir * fr * (0.2 + u * 1.2);
        pctx.moveTo(x0, top + faceRy * 0.25 * u);
        pctx.quadraticCurveTo(cx + dir * fr * (1.4 + u * 0.55), headY, cx + dir * fr * (1.2 + u * 0.8), fall - Math.random() * 0.08 * s);
      }
      pctx.stroke();

      // The body: shoulders and arms, running off the bottom of the light
      pctx.lineWidth = 1.4;
      pctx.strokeStyle = `rgba(${t.ink}, 0.9)`;
      const shoulderY = headY + 0.3 * s;
      const bodyW = 0.33 * s;
      pctx.beginPath();
      pctx.moveTo(cx - bodyW * 0.95, cy + 0.95 * s);
      pctx.bezierCurveTo(cx - bodyW * 1.05, shoulderY + 0.25 * s, cx - bodyW, shoulderY, cx - bodyW * 0.55, shoulderY - 0.01 * s);
      pctx.lineTo(cx + bodyW * 0.55, shoulderY - 0.01 * s);
      pctx.bezierCurveTo(cx + bodyW, shoulderY, cx + bodyW * 1.05, shoulderY + 0.25 * s, cx + bodyW * 0.95, cy + 0.95 * s);
      // Arms, inside the outline
      pctx.moveTo(cx - bodyW * 0.72, shoulderY + 0.2 * s);
      pctx.lineTo(cx - bodyW * 0.7, cy + 0.9 * s);
      pctx.moveTo(cx + bodyW * 0.72, shoulderY + 0.2 * s);
      pctx.lineTo(cx + bodyW * 0.7, cy + 0.9 * s);
      pctx.stroke();

      // Neck
      pctx.beginPath();
      pctx.moveTo(cx - faceRx * 0.42, headY + faceRy * 0.85);
      pctx.lineTo(cx - faceRx * 0.42, shoulderY - 0.01 * s);
      pctx.moveTo(cx + faceRx * 0.42, headY + faceRy * 0.85);
      pctx.lineTo(cx + faceRx * 0.42, shoulderY - 0.01 * s);
      pctx.stroke();

      // And the face, left empty
      pctx.fillStyle = t.light;
      pctx.beginPath();
      pctx.ellipse(cx, headY, faceRx, faceRy, 0, 0, Math.PI * 2);
      pctx.fill();
      pctx.stroke();
    };

    const build = () => {
      const t = tone();
      pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pctx.fillStyle = t.outer;
      pctx.fillRect(0, 0, width, height);

      const rx = Math.min(width * 0.36, height * 0.3);
      const ry = Math.min(rx * 1.4, height * 0.42);
      oval = { cx: width / 2, cy: height * 0.56, rx, ry };

      // The light the figure stands in
      pctx.save();
      pctx.translate(oval.cx, oval.cy);
      pctx.scale(1, ry / rx);
      const glow = pctx.createRadialGradient(0, 0, rx * 0.7, 0, 0, rx * 1.12);
      glow.addColorStop(0, t.light);
      glow.addColorStop(1, t.outer);
      pctx.fillStyle = glow;
      pctx.beginPath();
      pctx.arc(0, 0, rx * 1.12, 0, Math.PI * 2);
      pctx.fill();
      pctx.restore();

      drawFigure(t);

      pctx.strokeStyle = `rgba(${t.ink}, 0.5)`;
      pctx.lineWidth = 0.9;
      pctx.lineCap = 'round';

      cols = Math.ceil(width / CELL);
      density = new Uint16Array(cols * Math.ceil(height / CELL) + 1);
      budget = Math.round((width * height) / 55);
      drawn = 0;
      pen = { x: Math.random() * width, y: height * (Math.random() < 0.5 ? 0.12 : 0.9) };
      trail = [];
      pickTarget();
      // A little of it is already there when the chapter arrives
      const head = Math.round(budget * (reduced ? 0.6 : 0.06));
      for (let i = 0; i < head; i += 1) step();
      const rest = trail;
      trail = [];
      commit(rest);
    };

    const resize = () => {
      width = host.clientWidth || 1200;
      height = host.clientHeight || 800;
      dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);
      for (const c of [canvas, paper]) {
        c.width = Math.round(width * dpr);
        c.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mode = null;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    // The cursor takes the pencil; two seconds of stillness hands it back
    const HANDBACK_MS = 2000;
    const hand = { x: 0, y: 0, at: -Infinity, fresh: false };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !onScreen.current) return;
      const box = host.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      if (x < 0 || y < 0 || x > box.width || y > box.height) return;
      const now = performance.now();
      // Taking the pencil up again: it goes to the hand, it does not draw its way there
      if (now - hand.at >= HANDBACK_MS) hand.fresh = true;
      hand.x = x;
      hand.y = y;
      hand.at = now;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const follow = () => {
      if (hand.fresh) {
        hand.fresh = false;
        const rest = trail;
        trail = [];
        commit(rest);
        pen = { x: hand.x, y: hand.y };
        trail.push(pen);
        return;
      }
      const dx = hand.x - pen.x;
      const dy = hand.y - pen.y;
      const dist = Math.hypot(dx, dy);
      const n = Math.floor(dist / STEP);
      for (let i = 1; i <= n; i += 1) {
        const next = { x: pen.x + (dx / dist) * STEP, y: pen.y + (dy / dist) * STEP };
        trail.push(next);
        if (trail.length > TRAIL + DRY) commit(trail.splice(0, DRY));
        pen = next;
        density[cellAt(next.x, next.y)] += 1;
      }
      // Back under its own steam, it carries on the way the hand was going
      if (n > 0) heading = Math.atan2(dy, dx);
    };

    let raf = 0;
    let settled = false;
    let pace = 1;
    let paceTo = 1;
    let paceUntil = 0;
    let carry = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!onScreen.current) return;
      const negative = document.documentElement.classList.contains('negative-mode');
      if (negative !== mode) {
        mode = negative;
        build();
        settled = false;
      }
      const t = tone();

      if (now - hand.at < HANDBACK_MS) {
        follow();
        settled = false;
        targetAge = 1e9;
      } else if (!reduced && drawn < budget) {
        // Bursts and pauses, and the hand tiring as the tangle fills
        // Mostly slow, now and then a little quicker, then slow again
        if (now > paceUntil) {
          const quick = Math.random() < 0.3;
          paceTo = quick ? 1 + Math.random() * 0.5 : 0.3 + Math.random() * 0.35;
          paceUntil = now + (quick ? 700 + Math.random() * 900 : 1800 + Math.random() * 2600);
        }
        pace += (paceTo - pace) * 0.03;
        const tiring = 1.2 - (drawn / budget) * 0.6;
        carry += (width < 768 ? 1.4 : 2) * pace * tiring;
        for (; carry >= 1; carry -= 1) step();
      } else if (!settled) {
        // Out of pencil: the last of the gold dries where it lies
        const rest = trail;
        trail = [];
        commit(rest);
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(paper, 0, 0, width, height);
      if (!trail.length) {
        settled = drawn >= budget || reduced;
        return;
      }

      // The fresh line: gold at the pencil, drying to ink behind it
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const chunk = 10;
      for (let i = 0; i < trail.length - 1; i += chunk) {
        const k = 1 - i / trail.length;
        ctx.strokeStyle = mixInk(t.ink, k * 0.9);
        ctx.lineWidth = 1.1 + (1 - k) * 0.9;
        ctx.beginPath();
        ctx.moveTo(trail[i].x, trail[i].y);
        for (let j = i + 1; j <= Math.min(trail.length - 1, i + chunk); j += 1) ctx.lineTo(trail[j].x, trail[j].y);
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointer);
    };
  }, [onScreen]);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
