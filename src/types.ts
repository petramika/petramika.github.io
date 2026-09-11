export type AspectRatio = 'portrait' | 'square' | 'landscape' | 'wide';

export interface EssayItem {
  id: string;
  chapter: string;
  subtitle?: string;
  phrase: string;
  subtext?: string;
  dateOrPlace?: string;
  imageSrc: string;
  imageAlt: string;
  aspectRatio: AspectRatio;
  /** Renders the text slide inside the dark neon room instead of on paper */
  backdrop?: 'neon';
  /** Replaces the written passage with a drawn scene, keeping the photo */
  textScene?: 'grid';
  /** Runs a drawn scene under the passage: a line, a field of colour, or rain */
  underlay?: 'wave' | 'lava' | 'rain' | 'alba' | 'brain';
  /** Closes the chapter with a drawn scene after the written passage */
  coda?: 'orrery';
  imageSequence?: {
    src: string;
    alt: string;
  }[];
}
