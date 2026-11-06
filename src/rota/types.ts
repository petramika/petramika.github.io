export type AspectRatio = 'portrait' | 'square' | 'landscape' | 'wide';

export interface EssayItem {
  id: string;
  chapter: string;
  subtitle?: string;
  phrase: string;
  subtext?: string;
  imageSrc: string;
  imageAlt: string;
  aspectRatio: AspectRatio;
  /** Replaces the written passage with a drawn scene, keeping the photo */
  textScene?: 'grid';
  /** Runs a drawn scene under the passage: a line, a field of colour, or rain */
  underlay?: 'tangle' | 'crochet' | 'lava' | 'rain' | 'kintsugi' | 'brain';
  /** Closes the chapter with a drawn scene after the written passage */
  coda?: 'orrery';
  imageSequence?: {
    src: string;
    alt: string;
  }[];
}
