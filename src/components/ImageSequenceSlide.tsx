import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface SequenceItem {
  src: string;
  alt: string;
}

interface ImageSequenceSlideProps {
  sequence: SequenceItem[];
  chapter: string;
  index: number;
}

const SEQUENCE_FALLBACKS: SequenceItem[] = [
  {
    src: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1600&q=85',
    alt: 'Gotas de lluvia sobre cristal empañado mirando una silueta lejana',
  },
  {
    src: 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?auto=format&fit=crop&w=1600&q=85',
    alt: 'Gotas densas y reflejos de luces en la noche que se difuminan',
  },
  {
    src: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1600&q=85',
    alt: 'Sombras diagonales y luz oblicua en el espacio deshabitado',
  },
];

export function ImageSequenceSlide({ sequence, chapter, index }: ImageSequenceSlideProps) {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isBlurred, setIsBlurred] = useState<boolean>(false);
  const [flashKey, setFlashKey] = useState<number>(0);

  const sectionRef = useRef<HTMLElement>(null);
  // Every timeout the flash schedules, so unmounting mid-flash cancels cleanly
  const timeoutsRef = useRef<number[]>([]);

  const images = useMemo(
    () => SEQUENCE_FALLBACKS.map((fallback, i) => sequence[i] ?? fallback),
    [sequence],
  );

  const later = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timeoutsRef.current.push(id);
  }, []);

  // Fire the flash and swap the image underneath it
  const triggerNextWithFlash = useCallback(
    (targetIndex?: number) => {
      setIsFlashing(true);
      setIsBlurred(true);
      setFlashKey((prev) => prev + 1);

      // Swap at the peak brightness of the flash, so the cut is hidden
      later(() => {
        setActiveIdx((prev) =>
          targetIndex !== undefined ? targetIndex : (prev + 1) % images.length,
        );

        // Then clear the blur out from under the flash curtain
        later(() => setIsBlurred(false), 40);
      }, 130);

      later(() => setIsFlashing(false), 500);
    },
    [images.length, later],
  );

  // Clear anything still pending on unmount
  useEffect(
    () => () => {
      timeoutsRef.current.forEach(window.clearTimeout);
      timeoutsRef.current = [];
    },
    [],
  );

  // Only cycle while the slide is actually on screen — these are large
  // photographs and there is no reason to churn through them off-view.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let intervalId: number | undefined;

    const start = () => {
      if (intervalId !== undefined) return;
      intervalId = window.setInterval(() => triggerNextWithFlash(), 3000);
    };

    const stop = () => {
      if (intervalId === undefined) return;
      window.clearInterval(intervalId);
      intervalId = undefined;
    };

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0.25 },
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
      stop();
    };
  }, [triggerNextWithFlash]);

  return (
    <section
      ref={sectionRef}
      id={`chapter-${chapter}-sequence`}
      onClick={() => triggerNextWithFlash()}
      className="relative w-full h-[88vh] sm:h-[95vh] md:h-screen overflow-hidden bg-[#0a0a0a] flex items-center justify-center select-none cursor-pointer group"
      title="Secuencia flash de 3 imágenes (haz clic para disparar el siguiente flash)"
    >
      {/*
        ALL IMAGES STACKED AT 0 0 (FULL-WIDTH, FULL-HEIGHT) WITH THE BLUR
        TRANSITION SYNCHRONIZED TO THE FLASH
      */}
      <div className="absolute top-0 left-0 w-full h-full">
        {images.map((img, i) => {
          const isActive = activeIdx === i;
          return (
            <div
              key={`seq-img-wrap-${i}`}
              className={`absolute top-0 left-0 w-full h-full will-change-transform ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
              style={{
                filter: isBlurred ? 'blur(26px)' : 'blur(0px)',
                transform: isBlurred ? 'scale(1.04)' : 'scale(1)',
                transition: isBlurred
                  ? 'filter 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease-out, opacity 0.18s ease'
                  : 'filter 0.55s cubic-bezier(0.16, 1, 0.3, 1), transform 0.55s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
              }}
            >
              <img
                src={img.src}
                alt={img.alt}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-full object-cover photo-treatment"
              />
            </div>
          );
        })}
      </div>

      {/* FLASH LAYER: Strobe flash bursting between images (Black in negative, White in positive) */}
      <div
        key={`flash-layer-${flashKey}`}
        className={`flash-burst-overlay absolute top-0 left-0 w-full h-full z-30 pointer-events-none ${
          isFlashing ? 'flash-burst-active' : 'opacity-0'
        }`}
      />

      {/* Atmospheric subtle vignette overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/20 pointer-events-none z-10" />

      {/* Soft atmospheric gradients top and bottom */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#fbfbfb] via-[#fbfbfb]/25 to-transparent pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-[#fbfbfb] via-[#fbfbfb]/30 to-transparent pointer-events-none z-20" />

      {/* Left editorial watermark */}
      <div className="hidden sm:flex absolute left-8 top-1/2 -translate-y-1/2 writing-vertical-left text-[10px] font-editorial-mono uppercase tracking-[0.28em] text-white/50 z-20 pointer-events-none">
        [ {String(index + 1).padStart(2, '0')} // SECUENCIA FLASH ] · CAPÍTULO {chapter}
      </div>

      {/* Right editorial watermark */}
      <div className="hidden sm:flex absolute right-8 top-1/2 -translate-y-1/2 writing-vertical-right text-[10px] font-editorial-mono uppercase tracking-[0.28em] text-white/50 z-20 pointer-events-none">
        TRANSICIÓN RELÁMPAGO CSS · {String(images.length).padStart(2, '0')} FOTOGRAFÍAS
      </div>
    </section>
  );
}
