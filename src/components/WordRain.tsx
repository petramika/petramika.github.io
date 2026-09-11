import { useEffect, useRef } from 'react';
import texts from '../data/texts.json';
import { useOnScreen } from '../hooks/useOnScreen';

/**
 * A rain of the words the chapter is about losing. They fall from random
 * points along the top, swaying like something light, and when they reach
 * the floor they break: the letters come apart, land, and then melt —
 * drips run down off them, the bodies sink onto the floor and spread, and
 * nothing is left.
 *
 * Melting is a collapse, never a stretch. An earlier pass scaled the
 * letters UP as they melted and let them keep the spin from the impact,
 * which read as the letters standing up and growing rather than giving
 * way. Now nothing rotates, the glyph loses its height onto its own
 * baseline, and what moves downward are the drips.
 *
 * The rain is arrhythmic on purpose. A word every N seconds reads as a
 * machine; here the gap between drops is random, they sometimes come two or
 * three at once, and every so often there is a long pause with nothing at
 * all. That silence is as much the effect as the falling.
 *
 * Words are built out of one span per letter, laid out by the browser once
 * and measured; from then on everything is transforms written straight to
 * the nodes from a single rAF loop, never through React state.
 */

const WORDS: string[] = texts.wordRain;

/**
 * px/s². Real gravity at a typical screen density would be some 37000 px/s²
 * and a word would cross the panel in a fifth of a second — there and gone
 * before it could be read. This is slow enough to read a word the whole way
 * down, close to two seconds for a full-height drop, while still visibly
 * gathering speed: falling at a constant rate reads as drifting.
 */
const GRAVITY = 520;
/** How far the baseline stops short of the bottom edge: just enough that
 *  the drips have somewhere to run before the panel clips them */
const FLOOR_INSET = 6;
/**
 * Where the baseline sits inside a line box of line-height 1. Words land on
 * their baseline rather than on the bottom of their box: the box carries the
 * font's descent whether or not the word has anything hanging into it, so
 * landing on it left `amor` floating and `juntos` sitting lower, each by a
 * different amount at each font size.
 */
const BASELINE = 0.82;
/** Seconds a letter takes to melt away once it has landed */
const MELT_TIME = 1.15;
/** Enough that a burst never runs the page out of nodes */
const MAX_WORDS = 12;

interface Letter {
  el: HTMLSpanElement;
  /** The glyph itself, which collapses while the drips hanging off the
   *  outer span keep their length */
  glyph: HTMLSpanElement;
  /** Where the letter sits inside its word, from the one layout pass */
  home: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  landed: boolean;
  melt: number;
  /** How far each of this letter's two drips runs, in em */
  dripA: number;
  dripB: number;
}

interface Word {
  wrap: HTMLDivElement;
  letters: Letter[];
  x: number;
  y: number;
  vy: number;
  height: number;
  /** Distance from the top of the word down to its baseline */
  baseline: number;
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
  age: number;
  broken: boolean;
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function WordRain() {
  const hostRef = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(hostRef);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let width = host.clientWidth || 1200;
    let height = host.clientHeight || 800;
    const observer = new ResizeObserver(() => {
      width = host.clientWidth || width;
      height = host.clientHeight || height;
    });
    observer.observe(host);

    const words: Word[] = [];
    let raf = 0;
    let last = performance.now();
    // A first drop soon, but not the instant the section is reached
    let spawnTimer = 0.6;

    const spawn = () => {
      if (words.length >= MAX_WORDS) return;

      const wrap = document.createElement('div');
      wrap.className = 'word-rain-word';
      // Big screens get bigger words; on a phone they stay out of the way
      const room = Math.max(0.68, Math.min(1, width / 900));
      wrap.style.fontSize = `${(26 + Math.random() * 30) * room}px`;

      const letters: Letter[] = [];
      for (const ch of pick(WORDS)) {
        const el = document.createElement('span');
        el.className = 'word-rain-letter';
        // The glyph sits in a span of its own so it can sink onto the floor
        // without dragging the drips down with it
        const glyph = document.createElement('span');
        glyph.className = 'word-rain-glyph';
        glyph.textContent = ch === ' ' ? '\u00A0' : ch;
        el.appendChild(glyph);
        // Two drips per letter, each starting somewhere different along it
        el.style.setProperty('--drip-x1', `${18 + Math.random() * 22}%`);
        el.style.setProperty('--drip-x2', `${54 + Math.random() * 24}%`);
        wrap.appendChild(el);
      }

      host.appendChild(wrap);

      // The one and only layout read: after this the word is pure transform
      const wordWidth = wrap.offsetWidth;
      const wordHeight = wrap.offsetHeight;
      Array.from(wrap.children).forEach((node) => {
        const el = node as HTMLSpanElement;
        letters.push({
          el,
          glyph: el.firstElementChild as HTMLSpanElement,
          home: el.offsetLeft,
          x: el.offsetLeft,
          y: 0,
          vx: 0,
          vy: 0,
          rot: 0,
          spin: 0,
          landed: false,
          melt: 0,
          dripA: 0.22 + Math.random() * 0.42,
          dripB: 0.14 + Math.random() * 0.34,
        });
      });

      words.push({
        wrap,
        letters,
        // Anywhere along the top, not just the middle
        x: 8 + Math.random() * Math.max(1, width - wordWidth - 16),
        y: -wordHeight - Math.random() * 140,
        vy: Math.random() * 50,
        height: wordHeight,
        baseline: wordHeight * BASELINE,
        swayAmp: 8 + Math.random() * 16,
        swayFreq: 0.8 + Math.random() * 1.1,
        swayPhase: Math.random() * Math.PI * 2,
        age: 0,
        broken: false,
      });
    };

    /** The word hits the floor: the letters stop being a word */
    const shatter = (word: Word) => {
      word.broken = true;
      const middle = (word.letters.length - 1) / 2;

      word.letters.forEach((letter, i) => {
        // Absolute from here on, so each letter can go its own way
        letter.el.style.position = 'absolute';
        letter.el.style.left = '0';
        letter.el.style.top = '0';
        // Nudged apart from the point of impact and lifted a little
        letter.vx = (i - middle) * (26 + Math.random() * 34) + (Math.random() - 0.5) * 40;
        letter.vy = -(90 + Math.random() * 130);
        // Only some of them turn. A word where every letter tumbles reads as
        // debris; a word where a few come to rest at an angle reads as
        // something that broke.
        letter.spin = Math.random() < 0.45 ? (Math.random() - 0.5) * 380 : 0;
      });
    };

    const frame = (now: number) => {
      if (!onScreen.current) {
        // Held where they are, not fast-forwarded on the way back
        last = now;
        raf = requestAnimationFrame(frame);
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        // Mostly one, often two, now and then three
        const roll = Math.random();
        const burst = roll < 0.68 ? 1 : roll < 0.93 ? 2 : 3;
        for (let i = 0; i < burst; i += 1) spawn();

        spawnTimer = 0.55 + Math.random() * 1.7;
        // And every so often, nothing at all for a while
        if (Math.random() < 0.16) spawnTimer += 1.8 + Math.random() * 2.6;
      }

      const floor = height - FLOOR_INSET;

      for (let i = words.length - 1; i >= 0; i -= 1) {
        const word = words[i];
        word.age += dt;

        if (!word.broken) {
          word.vy += GRAVITY * dt;
          word.y += word.vy * dt;
          const sway =
            Math.sin(word.age * word.swayFreq + word.swayPhase) * word.swayAmp;
          word.wrap.style.transform = `translate3d(${(word.x + sway).toFixed(1)}px, ${word.y.toFixed(1)}px, 0)`;

          if (word.y + word.baseline >= floor) {
            word.y = floor - word.baseline;
            word.wrap.style.transform = `translate3d(${word.x.toFixed(1)}px, ${word.y.toFixed(1)}px, 0)`;
            shatter(word);
          }
          continue;
        }

        // Broken: the wrap holds still and every letter runs its own physics.
        // The wrap was placed so the word is already sitting on the floor, so
        // a letter is home when it comes back to where it started.
        let alive = 0;

        for (const letter of word.letters) {
          if (letter.melt >= 1) continue;
          alive += 1;

          if (!letter.landed) {
            letter.vy += GRAVITY * dt;
            letter.x += letter.vx * dt;
            letter.y += letter.vy * dt;
            letter.rot += letter.spin * dt;

            if (letter.y >= 0) {
              letter.y = 0;
              letter.landed = true;
              letter.spin = 0;
              // It settles at an angle rather than snapping upright: fold
              // whatever it spun through into half a turn, then tip it no
              // further than onto its side. A letter that barely turned
              // stays near straight; one that went round lands over.
              const folded = (((letter.rot % 360) + 540) % 360) - 180;
              letter.rot = Math.max(-48, Math.min(48, folded * 0.3));
            }
          } else {
            letter.melt = Math.min(1, letter.melt + dt / MELT_TIME);
          }

          const m = letter.melt;
          // The drips come first and run the whole way down; the body only
          // starts giving way once something is already running off it
          const drip = Math.min(1, m / 0.5);
          const collapse = Math.max(0, (m - 0.12) / 0.88);
          // Holds its colour while it melts, then goes quickly at the end
          const fade = m < 0.5 ? 1 : 1 - ((m - 0.5) / 0.5) ** 1.6;

          letter.el.style.opacity = fade.toFixed(3);
          letter.el.style.transform = `translate3d(${(letter.x - letter.home).toFixed(1)}px, ${letter.y.toFixed(1)}px, 0)`;
          letter.el.style.setProperty('--drip-a', `${(letter.dripA * drip).toFixed(3)}em`);
          letter.el.style.setProperty('--drip-b', `${(letter.dripB * drip).toFixed(3)}em`);
          // Sinking onto its own baseline and spreading as it goes, and it
          // keeps whatever angle it came to rest at. Scale is written AFTER
          // the rotation so it still reads in the parent's frame: the letter
          // stays tilted while it melts straight down.
          letter.glyph.style.transform =
            `scale(${(1 + collapse * 0.34).toFixed(3)}, ${(1 - collapse * 0.86).toFixed(3)})` +
            ` rotate(${letter.rot.toFixed(1)}deg)`;
        }

        if (alive === 0) {
          word.wrap.remove();
          words.splice(i, 1);
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      words.forEach((word) => word.wrap.remove());
    };
  }, [onScreen]);

  return (
    <div
      ref={hostRef}
      className="word-rain pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    />
  );
}
