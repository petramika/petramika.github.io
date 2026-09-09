import { motion, useScroll, useSpring } from 'motion/react';

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      id="scroll-progress-indicator"
      className="fixed top-0 left-0 right-0 h-[2px] bg-[#18181b] origin-left z-50 pointer-events-none"
      style={{ scaleX }}
    />
  );
}
