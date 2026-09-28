import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { EssayItem } from '../types';
import { ImageSequenceSlide } from './ImageSequenceSlide';
import { ScribbleTangle } from './ScribbleTangle';
import { WordGridScene } from './WordGridScene';
import { CrochetTear } from './CrochetTear';
import { Orrery } from './Orrery';
import { BrushFury } from './BrushFury';
import { WordRain } from './WordRain';
import { KintsugiCrackle } from './KintsugiCrackle';
import { StackPanel } from './StackPanel';
import { label, pad, YEAR, texts } from '../data/labels';

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
      className="stack-ground-photo relative w-full h-full overflow-hidden flex items-end justify-start"
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
          decoding="async"
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
        {label(texts.labels.photoEdge, { n: pad(index + 1), title: texts.hero.title, year: YEAR })}
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

  const hasTangle = item.underlay === 'tangle';
  // The grid stands in for the WRITTEN passage, not for the photograph:
  // the essay alternates image and text, so the chapter keeps its picture
  // and the grid takes the place of the prose
  const isTextScene = item.textScene === 'grid';
  const hasCrochet = item.underlay === 'crochet';
  const hasBrain = item.underlay === 'brain';
  // Words fall through the passage and break on the floor of the panel
  const hasRain = item.underlay === 'rain';
  const hasKintsugi = item.underlay === 'kintsugi';
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
      className="relative z-10 h-full flex flex-col items-center justify-center px-6 sm:px-12 py-16 sm:py-24 max-w-5xl mx-auto text-center"
    >
      {hasTangle && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2">
          <ScribbleTangle />
        </div>
      )}

      {hasKintsugi && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2">
          <KintsugiCrackle />
        </div>
      )}

      {/* Words raining down the panel, behind the passage */}
      {hasRain && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2">
          <WordRain />
        </div>
      )}

      {hasBrain && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2">
          <BrushFury />
        </div>
      )}

      {hasCrochet && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2">
          <CrochetTear />
        </div>
      )}

      <motion.div
        style={{ y: textY, opacity: textOpacity, scale: textScale }}
        className="relative z-10 w-full will-change-transform flex flex-col items-center px-4 my-auto"
      >
        <div className={`hidden lg:flex absolute -left-12 xl:-left-20 top-1/2 -translate-y-1/2 writing-vertical-left text-[11px] font-editorial-mono uppercase tracking-[0.3em] ${hasCrochet || hasTangle ? 'text-[#3f3f46] type-halo' : 'text-[#71717a]'} select-none pointer-events-none`}>
          {label(texts.labels.passageLeft, { n: pad(index + 1) })}
        </div>

        <div className={`hidden lg:flex absolute -right-12 xl:-right-20 top-1/2 -translate-y-1/2 writing-vertical-right text-[11px] font-editorial-mono uppercase tracking-[0.3em] ${hasCrochet || hasTangle ? 'text-[#3f3f46] type-halo' : 'text-[#71717a]'} select-none pointer-events-none`}>
          {label(texts.labels.passageRight, { n: pad(index + 1), total })}
        </div>

        {/* High-impact phrase with bold Swiss Grotesque typography */}
        <blockquote
          className={`font-editorial-display font-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.08] md:leading-[1.04] tracking-[-0.04em] max-w-4xl mx-auto mb-8 ${
            'text-[#141518]'
          } ${hasCrochet || hasRain || hasKintsugi || hasBrain || hasTangle ? 'type-halo' : ''}`}
        >
          {item.phrase}
        </blockquote>

        {item.subtext && (
          <p
            className={`font-sans-clean text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-light mb-8 ${
              'text-[#52525b]'
            } ${hasCrochet || hasRain || hasKintsugi || hasBrain || hasTangle ? 'type-halo' : ''}`}
          >
            {item.subtext}
          </p>
        )}
      </motion.div>
    </section>
  );

  // Where this chapter's panels sit in the stack, and which of them are the
  // ends of it: the first has nothing to climb over, the last nothing to hold
  // for.
  const order = index * 3 + 1;
  const isFirstChapter = index === 0;
  const isLastChapter = index === total - 1;

  const passage = isTextScene ? (
    <WordGridScene chapter={item.chapter} index={index} />
  ) : (
    textSlide
  );

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* 1. DIAPOSITIVA VISUAL: SECUENCIA FLASH (CAP IV) O FOTO ESTÁNDAR */}
      {/* ------------------------------------------------------------- */}
      <StackPanel
        id={`fragment-${item.id}`}
        order={order}
        cover={!isFirstChapter}
        panelClassName="stack-ground-photo"
      >
        {hasSequence && item.imageSequence ? (
          <ImageSequenceSlide
            sequence={item.imageSequence}
            chapter={item.chapter}
            index={index}
          />
        ) : (
          <StandardPhotoSlide item={item} index={index} />
        )}
      </StackPanel>

      {/* ------------------------------------------------------------- */}
      {/* 2. DIAPOSITIVA: BLOQUE DE TEXTO CON EFECTO PARALLAX FLOTANTE  */}
      {/* ------------------------------------------------------------- */}
      <StackPanel
        order={order + 1}
        pin={!isLastChapter || hasCoda}
        panelClassName="stack-ground-paper bg-grain"
      >
        {passage}
      </StackPanel>

      {/* ------------------------------------------------------------- */}
      {/* 3. CODA: PLANETARIO DE AROS CON PASAJEROS (CAP VII)            */}
      {/* ------------------------------------------------------------- */}
      {hasCoda && (
        <StackPanel order={order + 2} pin={!isLastChapter}>
          <Orrery />
        </StackPanel>
      )}
    </>
  );
}
