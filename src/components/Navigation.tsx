import { Contrast } from 'lucide-react';
import { Daruma } from './Daruma';
import texts from '../data/texts.json';

interface NavigationProps {
  negativeMode?: boolean;
  onToggleNegativeMode?: () => void;
}

export function Navigation({ negativeMode, onToggleNegativeMode }: NavigationProps) {
  return (
    <header
      id="main-navigation"
      className="fixed top-0 left-0 right-0 z-50 bg-[#fbfbfb]/90 backdrop-blur-md border-b border-[#e9e9eb]/80 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand / Title */}
        <div className="flex items-center space-x-3">
          <span className="font-serif-display text-xl tracking-[0.2em] font-light text-[#141518] uppercase select-none">
            {texts.hero.title}
          </span>
        </div>

        {/* Right actions: scroll-reactive daruma + negative mode toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Daruma />

          {onToggleNegativeMode && (
            <button
              id="btn-toggle-negative"
              onClick={onToggleNegativeMode}
              aria-label={negativeMode ? 'Desactivar efecto negativo' : 'Activar efecto negativo'}
              title={negativeMode ? 'Modo negativo activo (+ / -)' : 'Modo positivo activo (+ / -)'}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-xs font-editorial-mono transition-all duration-200 border cursor-pointer ${
                negativeMode
                  ? 'bg-[#18181b] text-white border-[#18181b] shadow-xs'
                  : 'bg-white/80 text-[#52525b] border-[#e4e4e7] hover:border-[#a1a1aa] hover:text-[#18181b]'
              }`}
            >
              <Contrast size={13} className="shrink-0" />
              <span className="text-[11px] font-editorial-mono font-medium tracking-wider select-none">
                {texts.navigation.contrastToggleLabel || '+ / -'}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
