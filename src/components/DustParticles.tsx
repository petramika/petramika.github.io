import { useEffect, useRef } from 'react';

interface DustParticlesProps {
  negativeMode?: boolean;
  density?: number;
}

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  phase: number;
  phaseSpeed: number;
}

export function DustParticles({ negativeMode = true, density = 75 }: DustParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates tracking
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 130, // Repulsion zone radius in pixels
      isActive: false,
    };

    // Calculate count based on viewport size
    const isMobile = width < 768;
    const count = isMobile ? Math.floor(density * 0.5) : density;

    // Initialize dust particles
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const baseVx = (Math.random() - 0.5) * 0.35;
      const baseVy = -0.15 - Math.random() * 0.25; // Gentle upward suspension drift like real dust
      const radius = 0.7 + Math.random() * 1.5; // Micro dust specks
      const baseAlpha = 0.2 + Math.random() * 0.45;

      particles.push({
        x,
        y,
        originX: x,
        originY: y,
        vx: baseVx,
        vy: baseVy,
        baseVx,
        baseVy,
        radius,
        baseAlpha,
        alpha: baseAlpha,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.015 + Math.random() * 0.02,
      });
    }

    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    // Mouse move handler (repels dust motes)
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.isActive = true;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.isActive = false;
    };

    // Touch support for mobile devices
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.isActive = true;
      }
    };

    const handleTouchEnd = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.isActive = false;
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    // Particle color determined by mode:
    // In negative mode: white illuminated dust motes
    // In positive mode: dark graphite / black atmospheric dust
    const rgbColor = negativeMode ? '255, 255, 255' : '20, 21, 24';

    // Physics & render animation loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Shimmer / breathing alpha
        p.phase += p.phaseSpeed;
        p.alpha = p.baseAlpha + Math.sin(p.phase) * 0.15;

        // 2. Mouse Repulsion Physics ("alejan de él")
        if (mouse.isActive) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          const maxDist = mouse.radius;

          if (distSq < maxDist * maxDist && distSq > 0) {
            const dist = Math.sqrt(distSq);
            // Repulsion strength is higher the closer the cursor is
            const force = (1 - dist / maxDist) * 2.2;
            const nx = dx / dist;
            const ny = dy / dist;

            // Push particle away from cursor
            p.vx += nx * force * 0.65;
            p.vy += ny * force * 0.65;
          }
        }

        // 3. Velocity damping & ambient air current restitution
        p.vx = p.vx * 0.94 + p.baseVx * 0.06;
        p.vy = p.vy * 0.94 + p.baseVy * 0.06;

        // Add subtle Brownian air fluctuation
        p.x += p.vx + Math.sin(p.phase * 0.7) * 0.2;
        p.y += p.vy;

        // 4. Wrap around boundaries smoothly
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;

        if (p.y < -10) p.y = height + 10;
        else if (p.y > height + 10) p.y = -10;

        // 5. Render particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgbColor}, ${Math.max(0.05, Math.min(1, p.alpha))})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [negativeMode, density]);

  return (
    <canvas
      ref={canvasRef}
      id="dust-particles-overlay"
      className="dust-particles-canvas fixed inset-0 pointer-events-none z-35 w-full h-full"
      aria-hidden="true"
    />
  );
}
