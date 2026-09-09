import texts from '../data/texts.json';

interface EpilogueProps {
  onScrollToTop?: () => void;
}

export function Epilogue({ onScrollToTop }: EpilogueProps) {
  return (
    <footer id="site-footer" className="py-24 px-6 text-center relative border-t border-[#e4e4e7]/60">
      <div className="max-w-xl mx-auto flex flex-col items-center">
        {onScrollToTop && (
          <button
            id="btn-scroll-top"
            onClick={onScrollToTop}
            className="mb-8 text-[11px] uppercase tracking-[0.25em] text-[#71717a] hover:text-[#18181b] transition-colors font-editorial-mono cursor-pointer"
          >
            {texts.epilogue.backToTop}
          </button>
        )}

        <p className="text-[11px] uppercase tracking-[0.25em] text-[#a1a1aa] font-editorial-mono select-none">
          {texts.epilogue.copyright}
        </p>
      </div>
    </footer>
  );
}

