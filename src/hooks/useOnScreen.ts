import { RefObject, useEffect, useRef } from 'react';

/**
 * Whether an element is anywhere near the window, reported into a ref rather
 * than into state.
 *
 * The ref is the point. Every animated scene in the essay runs its own frame
 * loop, and they all keep running whether or not their panel is on screen —
 * the neon room, the lava field, the word rain, the orrery, the wave and the
 * dawn, all at once, all the time. Reading a ref lets each loop bail out in
 * its first line without the component re-rendering, which is the difference
 * between pausing work and adding some.
 *
 * The margin is generous on purpose: a scene should already be running by the
 * time its panel arrives, not start the moment it is seen.
 */
export function useOnScreen(
  target: RefObject<Element | null>,
  margin = '25%',
): RefObject<boolean> {
  // Starts true, so nothing sits dark for the frame before the observer has
  // had anything to say
  const onScreen = useRef(true);

  useEffect(() => {
    const element = target.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen.current = entry.isIntersecting;
      },
      { rootMargin: margin },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [target, margin]);

  return onScreen;
}
