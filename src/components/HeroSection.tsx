import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { PaperDispersion } from './PaperDispersion';
import { PaperTear } from './PaperTear';
import texts from '../data/texts.json';

interface HeroSectionProps {
  introPhrase?: string;
  introSubtext?: string;
}

export function HeroSection({
  introPhrase = texts.hero.introPhrase,
  introSubtext = texts.hero.introSubtext,
}: HeroSectionProps) {
  const heroRef = useRef<HTMLElement>(null);
  const introTextRef = useRef<HTMLDivElement>(null);
  // Stacked on a phone, the two halves are not the same height, so where the
  // seam between them runs has to be measured rather than assumed
  const spreadRef = useRef<HTMLDivElement>(null);
  const firstHalfRef = useRef<HTMLDivElement>(null);
  const [seamAt, setSeamAt] = useState(0.5);

  useEffect(() => {
    const spread = spreadRef.current;
    const half = firstHalfRef.current;
    if (!spread || !half) return;

    const measure = () => {
      const total = spread.offsetHeight;
      if (total > 0) setSeamAt(half.offsetHeight / total);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(spread);
    observer.observe(half);
    return () => observer.disconnect();
  }, []);

  // Parallax calculations for the HERO COVER SLIDE
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const contentY = useTransform(heroScroll, [0, 1], [0, 140]);
  const contentOpacity = useTransform(heroScroll, [0, 0.6, 0.95], [1, 0.6, 0]);

  // Parallax calculations for the DEDICATED INTRO TEXT SLIDE (Texto 1)
  const { scrollYProgress: textScroll } = useScroll({
    target: introTextRef,
    offset: ['start end', 'end start'],
  });

  const textY = useTransform(textScroll, [0, 0.5, 1], [65, 0, -65]);
  const textOpacity = useTransform(textScroll, [0, 0.25, 0.75, 1], [0.15, 1, 1, 0.15]);
  const textScale = useTransform(textScroll, [0, 0.5, 1], [0.96, 1, 0.98]);

  // Letters of the title (defaults to "ROTA")
  const letters = (texts.hero.title || 'ROTA').split('');

  return (
    <div className="relative w-full">
      {/* ------------------------------------------------------------- */}
      {/* 1. DIAPOSITIVA: PORTADA ROTA ESTILO MANIFIESTO EDITORIAL SUIZO */}
      {/* ------------------------------------------------------------- */}
      <section
        id="hero-intro"
        ref={heroRef}
        className="relative w-screen h-screen overflow-hidden flex flex-col items-center justify-center bg-[#fbfbfb] left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]"
      >
        {/* Subtle architectural grain */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.035)_1px,transparent_0)] bg-[size:24px_24px] pointer-events-none" />

        {/* Top Technical Editorial Bar (Swiss Lab style) */}
        <header className="absolute top-0 inset-x-0 px-6 sm:px-12 py-5 flex items-center justify-between text-[11px] font-editorial-mono uppercase tracking-wider text-[#71717a] border-b border-[#e4e4e7]/60 select-none z-30">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-[#141518]">ESTADO:</span>
            <span className="text-[#a1a1aa]">{texts.hero.status}</span>
          </div>
          <div className="hidden md:flex items-center space-x-6 text-[10px] tracking-[0.2em]">
            <span>© {new Date().getFullYear()} {texts.hero.title} LABS</span>
            <span className="text-[#d4d4d8]">|</span>
            <span>{texts.hero.editorialTag}</span>
          </div>
          <div className="text-[10px] tracking-[0.2em]">
            <span>{texts.hero.archiveTag}</span>
          </div>
        </header>

        {/* Left Side Rotated Text Ribbon */}
        <div className="hidden md:flex absolute left-6 sm:left-10 top-1/2 -translate-y-1/2 writing-vertical-left text-[11px] font-editorial-mono uppercase tracking-[0.28em] text-[#71717a] select-none pointer-events-none z-30">
          <span className="hover:text-[#141518] transition-colors">
            {texts.hero.leftRibbon}
          </span>
        </div>

        {/* Right Side Rotated Text Ribbon */}
        <div className="hidden md:flex absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 writing-vertical-right text-[11px] font-editorial-mono uppercase tracking-[0.28em] text-[#71717a] select-none pointer-events-none z-30">
          <span className="hover:text-[#141518] transition-colors">
            {texts.hero.rightRibbon}
          </span>
        </div>

        {/* "ROTA" OVERLAY WITH SWISS GROTESQUE EDITORIAL TYPOGRAPHY */}
        <motion.div
          style={{ y: contentY, opacity: contentOpacity }}
          className="relative z-10 flex flex-col items-center justify-center text-center px-4 select-none will-change-transform"
        >
          <div
            className="flex items-center justify-center space-x-1 sm:space-x-3 md:space-x-4 my-1"
            aria-label="ROTA"
          >
            {letters.map((char, index) => (
              <motion.span
                key={`rota-char-${index}`}
                initial={{
                  opacity: 0,
                  y: 40,
                  scale: 0.9,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                transition={{
                  duration: 1.1,
                  delay: 0.15 + index * 0.14,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{
                  scale: 1.04,
                  y: -2,
                  transition: { duration: 0.2 },
                }}
                className="inline-block font-editorial-display font-black text-8xl sm:text-[11rem] md:text-[15rem] lg:text-[19rem] text-[#141518] tracking-[-0.05em] leading-[0.88] cursor-default select-none"
              >
                {char}
              </motion.span>
            ))}
          </div>
        </motion.div>

      </section>

      {/*
        The falling paper lives BETWEEN the two spreads, not inside the cover.
        Inside it, the cover's own clipping cut the ball off at a hard edge
        halfway down; out here it can carry on past and go behind the spread
        below, which is what a thing falling out of frame actually does.
      */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-screen">
        <PaperDispersion progress={heroScroll} />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. DIAPOSITIVA: PRIMER TEXTO — SPLIT EDITORIAL SUIZO          */}
      {/* Mitad izquierda: introPhrase rotada / vertical                */}
      {/* Mitad derecha: introSubtext centrada horizontal y verticalmente */}
      {/* ------------------------------------------------------------- */}
      <section
        id="intro-text-slide"
        ref={introTextRef}
        className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-8 lg:px-12 py-16 sm:py-24 max-w-7xl mx-auto"
      >
        {/* The page itself, torn out along both margins of the screen. It
            bites less deep on a phone, where 34px of a 390px screen would be
            eating the text rather than framing it. */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2">
          <div className="hidden md:block">
            <PaperTear progress={textScroll} at="left" />
            <PaperTear progress={textScroll} at="right" />
          </div>
          <div className="md:hidden">
            <PaperTear progress={textScroll} at="left" reach={14} />
            <PaperTear progress={textScroll} at="right" reach={14} />
          </div>
        </div>
        <motion.div
          style={{ y: textY, opacity: textOpacity, scale: textScale }}
          className="relative w-full will-change-transform"
        >
          {/* Outer Editorial Container with Swiss grid border */}
          <div ref={spreadRef} className="w-full grid grid-cols-1 md:grid-cols-2 border border-[#141518]/15 bg-white/80 backdrop-blur-xs min-h-[75vh] md:min-h-[82vh] shadow-xs relative overflow-hidden">
            {/* The seam between the halves gives way as the spread is read.
                Only where the seam is vertical — stacked on a phone, the two
                halves sit one over the other and there is nothing to part. */}
            <div className="hidden md:block absolute inset-0 z-20">
              <PaperTear progress={textScroll} />
            </div>
            <div className="md:hidden absolute inset-0 z-20">
              <PaperTear progress={textScroll} orientation="horizontal" reach={22} seamAt={seamAt} />
            </div>
            
            {/* ----------------- MITAD IZQUIERDA ----------------- */}
            {/* Frase principal rotada 90° hacia la izquierda con tipografía de cartel */}
            <div ref={firstHalfRef} className="relative flex flex-col items-center justify-center p-8 sm:p-10 md:p-12 lg:p-16 bg-[#fafafa]/70 overflow-hidden min-h-[40vh] md:min-h-[82vh]">
              {/* Micro badge superior izquierdo */}
              <div className="absolute top-6 left-6 flex items-center space-x-2 text-[10px] font-editorial-mono uppercase tracking-[0.25em] text-[#71717a] select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#141518]" />
                <span>{texts.hero.leftBadge}</span>
              </div>

              {/* Contenedor central de la frase rotada 90° hacia la izquierda */}
              <div className="my-auto w-full flex items-center justify-center py-8 md:py-4">
                <blockquote
                  className="font-editorial-display font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-[#141518] tracking-[-0.04em] leading-[1.02] select-none text-left cursor-default transition-all duration-300 hover:scale-[1.01] writing-vertical-270 h-[52vh] sm:h-[58vh] md:h-[62vh] max-h-[640px]"
                  title={introPhrase}
                >
                  {introPhrase}
                </blockquote>
              </div>

              {/* Pie de columna izquierda */}
              <div className="absolute bottom-6 left-6 text-[10px] font-editorial-mono uppercase tracking-[0.25em] text-[#a1a1aa] select-none">
                {texts.hero.leftFooter}
              </div>
            </div>

            {/* ----------------- MITAD DERECHA ----------------- */}
            {/* Centrado horizontal y verticalmente */}
            <div className="relative flex flex-col items-center justify-center text-center p-8 sm:p-12 lg:p-16 bg-white/50 min-h-[45vh] md:min-h-[82vh]">
              {/* Micro badge superior derecha */}
              <div className="absolute top-6 right-6 text-[10px] font-editorial-mono uppercase tracking-[0.25em] text-[#71717a] select-none">
                {texts.hero.rightBadge}
              </div>

              {/* Contenido centrado vertical y horizontalmente */}
              <div className="my-auto max-w-md lg:max-w-lg mx-auto flex flex-col items-center justify-center py-6">
                {/* Identificador editorial */}
                <span className="font-editorial-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#71717a] mb-8 bg-[#f4f4f5] px-3.5 py-1 rounded-full border border-[#e4e4e7] select-none">
                  {texts.hero.rightPill}
                </span>

                {/* Subtexto centrado con gran legibilidad y elegancia */}
                <p className="font-editorial-display font-normal text-xl sm:text-2xl md:text-3xl text-[#141518] leading-relaxed sm:leading-[1.4] tracking-[-0.02em] mb-8">
                  {introSubtext}
                </p>
              </div>

              {/* Pie de columna derecha */}
              <div className="absolute bottom-6 right-6 text-[10px] font-editorial-mono uppercase tracking-[0.25em] text-[#a1a1aa] select-none hidden sm:block">
                {texts.hero.rightFooter}
              </div>
            </div>

          </div>
        </motion.div>
      </section>
    </div>
  );
}
