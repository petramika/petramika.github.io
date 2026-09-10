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
  /** Runs a drawn line, or a drifting field of colour, under the passage */
  underlay?: 'wave' | 'lava';
  /** Closes the chapter with a drawn scene after the written passage */
  coda?: 'orrery';
  imageSequence?: {
    src: string;
    alt: string;
  }[];
}
