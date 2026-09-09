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
  imageSequence?: {
    src: string;
    alt: string;
  }[];
}
