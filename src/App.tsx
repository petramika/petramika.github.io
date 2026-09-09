import { useState, useEffect } from 'react';
import { EssayItem } from './types';
import { INITIAL_ESSAY_ITEMS } from './data/defaultItems';
import texts from './data/texts.json';
import { Navigation } from './components/Navigation';
import { HeroSection } from './components/HeroSection';
import { StorySlide } from './components/StorySlide';
import { Epilogue } from './components/Epilogue';
import { ScrollProgress } from './components/ScrollProgress';
import { DustParticles } from './components/DustParticles';

export default function App() {
  const [items] = useState<EssayItem[]>(INITIAL_ESSAY_ITEMS);

  // Negative film mode state: default to true as requested by user
  const [negativeMode, setNegativeMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rota_negative_mode');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // fallback
    }
    return true;
  });

  // Synchronize negativeMode with HTML root class
  useEffect(() => {
    try {
      if (negativeMode) {
        document.documentElement.classList.add('negative-mode');
      } else {
        document.documentElement.classList.remove('negative-mode');
      }
      localStorage.setItem('rota_negative_mode', String(negativeMode));
    } catch {
      // ignore
    }
  }, [negativeMode]);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#fbfbfb] text-[#141518] relative selection:bg-[#18181b] selection:text-[#fbfbfb] font-sans-clean bg-grain">
      {/* Floating atmospheric dust particles with cursor repulsion */}
      <DustParticles negativeMode={negativeMode} />

      {/* Scroll indicator bar */}
      <ScrollProgress />

      {/* Top navigation with Negative mode toggle & scroll-reactive daruma */}
      <Navigation
        negativeMode={negativeMode}
        onToggleNegativeMode={() => setNegativeMode(!negativeMode)}
      />

      <main className="relative">
        {/* Hero introduction with ROTA animation and First Text Slide */}
        <HeroSection
          introPhrase={texts.hero.introPhrase}
          introSubtext={texts.hero.introSubtext}
        />

        {/* Narrative slide presentation */}
        <div id="narrative-stream" className="relative w-full">
          {items.map((item, index) => (
            <StorySlide
              key={item.id}
              item={item}
              index={index}
              total={items.length}
            />
          ))}
        </div>

        {/* Minimal Copyright Footer */}
        <Epilogue onScrollToTop={handleScrollToTop} />
      </main>
    </div>
  );
}
