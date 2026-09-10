import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { EssayItem } from '../types';
import { ImageSequenceSlide } from './ImageSequenceSlide';
import { NeonMorphFrames } from './NeonMorphFrames';
import { WordGridScene } from './WordGridScene';
import { WaveLine } from './WaveLine';
import { Orrery } from './Orrery';
import { LavaField } from './LavaField';

interface StorySlideProps {
  item: EssayItem;
  index: number;
  total: number;
}

function StandardPhotoSlide({
  item,
  index,
}: {
  item: EssayItem;
  index: number;
}) {
  const imageSlideRef = useRef<HTMLDivElement>(null);

  // Parallax calculations for the FULL-BLEED PHOTOGRAPHIC SLIDE
  const { scrollYProgress: imageScroll } = useScroll({
    target: imageSlideRef,
    offset: ['start end', 'end start'],
  });

  const photoY = useTransform(imageScroll, [0, 1], [-80, 80]);
  const photoScale = useTransform(imageScroll, [0, 0.5, 1], [1.12, 1, 1.08]);
  const imageOverlayOpacity = useTransform(imageScroll, [0, 0.5, 1], [0.35, 0.1, 0.35]);

  return (
    <section
      ref={imageSlideRef}
      className="relative w-full h-[88vh] sm:h-[95vh] md:h-screen overflow-hidden bg-[#0f1013] flex items-end justify-start"
    >
      {/* Parallax moving image */}
      <motion.div
        style={{ y: photoY, scale: photoScale }}
        className="absolute inset-0 w-full h-[125%] -top-[12%] will-change-transform"
      >
        <img
          src={item.imageSrc}
          alt={item.imageAlt}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover photo-treatment"
        />
      </motion.div>

      {/* Dynamic ambient exposure overlay */}
      <motion.div
        style={{ opacity: imageOverlayOpacity }}
        className="absolute inset-0 bg-black pointer-events-none"
      />

      {/* Rotated vertical edge label on photographic slide */}
      <div className="hidden sm:flex absolute left-8 top-1/2 -translate-y-1/2 writing-vertical-left text-[10px] font-editorial-mono uppercase tracking-[0.25em] text-white/50 z-10 pointer-events-none select-none">
        [ {String(index + 1).padStart(2, '0')} // ARCHIVO VISUAL ] · ROTA 2026
      </div>

      {/* Soft edge atmospheric gradients */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#fbfbfb] via-[#fbfbfb]/25 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#fbfbfb] via-[#fbfbfb]/30 to-transparent pointer-events-none" />
    </section>
  );
}

export function StorySlide({
  item,
  index,
  total,
}: StorySlideProps) {
  const textSlideRef = useRef<HTMLDivElement>(null);

  const hasSequence = Boolean(
    item.imageSequence && item.imageSequence.length >= 2
  );

  // The neon room is a dark space, so the type has to flip with it
  const isNeon = item.backdrop === 'neon';
  // The grid stands in for the WRITTEN passage, not for the photograph:
  // the essay alternates image and text, so the chapter keeps its picture
  // and the grid takes the place of the prose
  const isTextScene = item.textScene === 'grid';
  // A drawn line runs under the passage, so the type steps back to let it
  // show through from below
  const hasWave = item.underlay === 'wave';
  // A drifting field of colour fills the whole slide behind the passage
  const hasLava = item.underlay === 'lava';
  // The chapter closes on a drawn scene rather than on white space
  const hasCoda = item.coda === 'orrery';

  // Parallax calculations for the DEDICATED FLOATING TEXT SLIDE
  const { scrollYProgress: textScroll } = useScroll({
    target: textSlideRef,
    offset: ['start end', 'end start'],
  });

  const textY = useTransform(textScroll, [0, 0.5, 1], [65, 0, -65]);
  const textOpacity = useTransform(textScroll, [0, 0.25, 0.75, 1], [0.15, 1, 1, 0.15]);
  const textScale = useTransform(textScroll, [0, 0.5, 1], [0.96, 1, 0.98]);

  const textSlide = (
    <section
      ref={textSlideRef}
      className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 py-16 sm:py-24 max-w-5xl mx-auto text-center"
    >
      {/* Full-bleed field of slowly deforming colour, behind everything */}
      {hasLava && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2">
          <LavaField />
        </div>
      )}

      {/* Full-bleed drawn line, blurred and running below the type */}
      {hasWave && (
        <div className="pointer-events-none absolute left-1/2 top-[62%] z-0 w-screen -translate-x-1/2 -translate-y-1/2">
          <WaveLine />
        </div>
      )}

      <motion.div
        style={{ y: textY, opacity: textOpacity, scale: textScale }}
        className="relative z-10 w-full will-change-transform flex flex-col items-center my-auto px-4"
      >
        {/* Rotated vertical side text on desktop — the same mid grey reads
            on paper and in the dark room, so it needs no variant */}
        <div className="hidden lg:flex absolute -left-12 xl:-left-20 top-1/2 -translate-y-1/2 writing-vertical-left text-[11px] font-editorial-mono uppercase tracking-[0.3em] text-[#71717a] select-none pointer-events-none">
          [ {String(index + 1).padStart(2, '0')} // MANIFIESTO ] · CAPÍTULO VISUAL
        </div>

        <div className="hidden lg:flex absolute -right-12 xl:-right-20 top-1/2 -translate-y-1/2 writing-vertical-right text-[11px] font-editorial-mono uppercase tracking-[0.3em] text-[#71717a] select-none pointer-events-none">
          COORD. {String(index + 1).padStart(2, '0')}.{total} · ARCHIVO PERMANENTE [ + ]
        </div>

        {/* High-impact phrase with bold Swiss Grotesque typography */}
        <blockquote
          className={`font-editorial-display font-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.08] md:leading-[1.04] tracking-[-0.04em] max-w-4xl mb-8 ${
            isNeon ? 'text-[#f4f4f5]' : 'text-[#141518]'
          } ${hasWave ? 'wave-type' : ''}`}
        >
          {item.phrase}
        </blockquote>

        {item.subtext && (
          <p
            className={`font-sans-clean text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl font-light mb-8 ${
              isNeon ? 'text-[#a1a1aa]' : 'text-[#52525b]'
            } ${hasWave ? 'wave-type' : ''}`}
          >
            {item.subtext}
          </p>
        )}
      </motion.div>
    </section>
  );

  return (
    <div id={`fragment-${item.id}`} className="relative w-full">
      {/* ------------------------------------------------------------- */}
      {/* 1. DIAPOSITIVA VISUAL: SECUENCIA FLASH (CAP IV) O FOTO ESTÁNDAR */}
      {/* ------------------------------------------------------------- */}
      {hasSequence && item.imageSequence ? (
        <ImageSequenceSlide
          sequence={item.imageSequence}
          chapter={item.chapter}
          index={index}
        />
      ) : (
        <StandardPhotoSlide
          item={item}
          index={index}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. DIAPOSITIVA: BLOQUE DE TEXTO CON EFECTO PARALLAX FLOTANTE  */}
      {/* El capítulo marcado como 'neon' se lee dentro de una sala     */}
      {/* oscura con marcos de luz que giran y se transforman.          */}
      {/* ------------------------------------------------------------- */}
      {isTextScene ? (
        <WordGridScene chapter={item.chapter} index={index} />
      ) : isNeon ? (
        <div className="neon-room relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden bg-[#040404]">
          <NeonMorphFrames />

          {/* Darkens the middle so the bloom never fights the type. Neutral
              grey, not a warm black — a tinted scrim is what made the whole
              room read brown. */}
          <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(4,4,4,0.82)_0%,rgba(4,4,4,0.5)_38%,rgba(4,4,4,0.14)_68%,transparent_100%)]" />

          {/* The room ends where the page does. Fading both edges to the
              page's own black means the glow never runs into the join, so
              the section reads as neon floating in the same darkness rather
              than as a panel dropped onto it. These invert with the room,
              so they land on the paper colour on the light page too. */}
          <div className="absolute inset-x-0 top-0 h-48 z-[2] pointer-events-none bg-gradient-to-b from-[#040404] via-[#040404]/72 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-48 z-[2] pointer-events-none bg-gradient-to-t from-[#040404] via-[#040404]/72 to-transparent" />

          {textSlide}
        </div>
      ) : (
        textSlide
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. CODA: PLANETARIO DE AROS CON PASAJEROS (CAP VII)            */}
      {/* ------------------------------------------------------------- */}
      {hasCoda && <Orrery />}
    </div>
  );
}
