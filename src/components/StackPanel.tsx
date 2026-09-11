import { ReactNode, useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

/**
 * One panel in the stack. Instead of the essay scrolling past as a column of
 * sections, each panel holds still while the next one climbs over it — so a
 * chapter arrives ON TOP of the one before rather than after it.
 *
 * The mechanism is a runway twice the height of the panel:
 *
 *   runway  200svh   ── the scroll this panel owns
 *     panel 100svh   ── sticky at the top, so it has 100svh of pinning
 *   next runway      ── pulled up 100svh, so it starts rising exactly when
 *                       this panel starts holding
 *
 * The negative margin is the whole trick: it makes the next panel's rise and
 * this panel's hold the same 100svh of scroll. Without it the two happen one
 * after the other, which is the sequential, blog-like reading we had. Net
 * document height per panel is still 100svh, so nothing gets longer.
 *
 * While it holds, the panel recedes — losing light, which is what turns
 * "covered" into "underneath".
 *
 * It recedes WITHOUT scaling, and that is deliberate. Scaling a panel by a
 * fraction puts its edges on fractional pixels, and negative mode inverts
 * the whole page: `invert()` over an antialiased edge is the classic white
 * fringe, because the edge pixel is semi-transparent and inverting it with
 * premultiplied alpha pushes the value towards white. That is the hairline
 * that kept showing up along the photographs as they shrank — the three
 * conditions only ever met there. Depth comes from the light instead, which
 * costs no geometry: nothing here lands off the pixel grid.
 */

interface StackPanelProps {
  children: ReactNode;
  /** Paint order. Later panels have to sit over earlier ones. */
  order: number;
  /** Rises over the panel before it. False only for the first of the stack. */
  cover?: boolean;
  /** Holds while the next panel rises. False for the last of the stack, which
   *  has nothing coming to cover it and would otherwise pause on nothing. */
  pin?: boolean;
  /** The panel's own opaque ground: a transparent panel shows the one under it */
  panelClassName?: string;
  id?: string;
}

export function StackPanel({
  children,
  order,
  cover = true,
  pin = true,
  panelClassName = 'stack-ground-paper bg-grain',
  id,
}: StackPanelProps) {
  const runwayRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ['start start', 'end start'],
  });

  // The hold is the first half of the runway, so the whole recede has to be
  // spent inside it — by the time the progress passes 0.5 the panel is fully
  // covered and anything further would never be seen.
  const dim = useTransform(scrollYProgress, [0, 0.5], pin ? [0, 0.46] : [0, 0]);

  return (
    <div
      ref={runwayRef}
      id={id}
      // `isolate` keeps each panel's inner z-indexes to itself: without it a
      // z-10 caption inside one panel outranks the panel stacked above it.
      className="relative isolate w-full"
      style={{
        height: pin ? '200svh' : '100svh',
        marginTop: cover ? '-100svh' : undefined,
        zIndex: order,
      }}
    >
      <div className="sticky top-0 h-[100svh] w-full">
        {/*
          The panel's own ground, bleeding a pixel past the top and bottom so
          a fractional svh can never leave a hairline where two panels meet.
        */}
        <div
          className={`absolute inset-x-0 -top-px -bottom-px overflow-hidden ${panelClassName}`}
        >
          {children}

          {/* The lip of the arriving panel, shaded on its own top edge */}
          <div className="stack-contact pointer-events-none absolute inset-x-0 top-0 z-20 h-28" />

          {/* Depth, not shade: the panel losing light is what reads as it
              dropping behind the one arriving. Painted from CSS, because
              under the page's negative a black veil turns into a white one
              and would brighten the panel it is meant to sink. */}
          <motion.div
            style={{ opacity: dim }}
            className="stack-recede pointer-events-none absolute inset-0 z-30"
          />
        </div>
      </div>
    </div>
  );
}
