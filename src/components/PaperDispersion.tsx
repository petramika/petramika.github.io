import { motion, useTransform, MotionValue } from 'motion/react';
import userPaperBall1 from '../assets/images/user_paper_ball_1.png';
import userPaperBall2 from '../assets/images/user_paper_ball_2.png';
import userPaperBall3 from '../assets/images/user_paper_ball_3.png';

interface PaperItemConfig {
  id: string;
  imageSrc: string;
  alt: string;
  // Starting position in SVG coords (viewBox 0 0 1200 900)
  startX: number;
  startY: number;
  width: number;
  height: number;
  // Dispersion vector toward the screen edges
  targetDeltaX: number;
  targetDeltaY: number;
  // Rotations
  initialRotate: number;
  targetRotate: number;
  // Scale
  initialScale: number;
  targetScale: number;
}

// 3 instances of the user-provided crumpled paper ball, levitating with zero shadow
const THREE_PAPERS_CONFIG: PaperItemConfig[] = [
  {
    id: 'paper-left',
    imageSrc: userPaperBall1,
    alt: 'Pelota de papel arrugado sin sombras hacia la izquierda',
    startX: 460,
    startY: 550,
    width: 210,
    height: 210,
    targetDeltaX: -650,
    targetDeltaY: -220,
    initialRotate: -12,
    targetRotate: -105,
    initialScale: 1,
    targetScale: 2.25,
  },
  {
    id: 'paper-right',
    imageSrc: userPaperBall2,
    alt: 'Pelota de papel arrugado sin sombras hacia la derecha',
    startX: 740,
    startY: 540,
    width: 220,
    height: 220,
    targetDeltaX: 660,
    targetDeltaY: -210,
    initialRotate: 18,
    targetRotate: 115,
    initialScale: 1.02,
    targetScale: 2.35,
  },
  {
    id: 'paper-bottom',
    imageSrc: userPaperBall3,
    alt: 'Pelota de papel arrugado sin sombras hacia abajo',
    startX: 600,
    startY: 640,
    width: 200,
    height: 200,
    targetDeltaX: 20,
    targetDeltaY: 480,
    initialRotate: 5,
    targetRotate: -75,
    initialScale: 0.98,
    targetScale: 2.15,
  },
];

interface SinglePaperProps {
  config: PaperItemConfig;
  progress: MotionValue<number>;
}

function SinglePaper({ config, progress }: SinglePaperProps) {
  // Motion transforms driven by scroll progress (0 to 1)
  const x = useTransform(progress, [0, 1], [config.startX, config.startX + config.targetDeltaX]);
  const y = useTransform(progress, [0, 1], [config.startY, config.startY + config.targetDeltaY]);
  const rotate = useTransform(progress, [0, 1], [config.initialRotate, config.targetRotate]);
  const scale = useTransform(progress, [0, 1], [config.initialScale, config.targetScale]);
  // Opacity: stays solid while growing, then gracefully dissolves as it approaches full scale
  const opacity = useTransform(progress, [0, 0.45, 0.85, 1], [1, 0.92, 0.2, 0]);

  return (
    <motion.g
      style={{
        x,
        y,
        rotate,
        scale,
        opacity,
        transformOrigin: '0px 0px',
      }}
      className="will-change-transform select-none"
      whileHover={{
        scale: 1.1,
        rotate: config.initialRotate + 10,
        transition: { duration: 0.2 },
      }}
    >
      {/* 
        Pure transparent PNGs: only the crumpled paper ball exists,
        completely transparent around the edges with zero rectangular box and zero shadows.
      */}
      <image
        href={config.imageSrc}
        x={-config.width / 2}
        y={-config.height / 2}
        width={config.width}
        height={config.height}
        preserveAspectRatio="xMidYMid meet"
        className="paper-ball-image"
        style={{ mixBlendMode: 'multiply' }}
      />
    </motion.g>
  );
}

interface PaperDispersionProps {
  progress: MotionValue<number>;
}

export function PaperDispersion({ progress }: PaperDispersionProps) {
  return (
    <div
      id="paper-dispersion-layer"
      className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1200 900"
        className="w-full h-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Render exactly 3 papers fusing into the white background */}
        {THREE_PAPERS_CONFIG.map((cfg) => (
          <SinglePaper key={cfg.id} config={cfg} progress={progress} />
        ))}
      </svg>
    </div>
  );
}
