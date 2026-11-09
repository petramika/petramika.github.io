import Pie from '../../comun/Pie';
import texts from '../data/texts.json';

interface EpilogueProps {
  onScrollToTop?: () => void;
}

export function Epilogue({ onScrollToTop }: EpilogueProps) {
  return (
    <div id="site-footer" className="relative">
      {onScrollToTop && (
        <div className="flex justify-center pt-16">
          <button
            id="btn-scroll-top"
            onClick={onScrollToTop}
            className="text-[11px] uppercase tracking-[0.25em] text-[#71717a] hover:text-[#18181b] transition-colors font-editorial-mono cursor-pointer"
          >
            {texts.epilogue.backToTop}
          </button>
        </div>
      )}
      {/* El mismo pie que el resto de la web; la marca cierra el ensayo igual que lo abrio */}
      <Pie marca={texts.hero.title} fuente="var(--font-display)" />
    </div>
  );
}
