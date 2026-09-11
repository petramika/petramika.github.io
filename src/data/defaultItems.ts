import { EssayItem } from '../types';
import texts from './texts.json';

// Dynamically load photographs from src/assets/anne
const anneImages = import.meta.glob('../assets/anne/*.{JPG,jpg,jpeg,png,webp,PNG}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function getAnnePhoto(name: string, fallback: string): string {
  for (const [key, value] of Object.entries(anneImages)) {
    const fileName = key.split('/').pop();
    if (fileName && fileName.toLowerCase() === name.toLowerCase()) {
      return value;
    }
  }
  return fallback;
}

export const INITIAL_ESSAY_ITEMS: EssayItem[] = texts.chapters.map((ch) => {
  const { imageSequence: _rawSeq, ...restCh } = ch;
  const aspectRatio = restCh.aspectRatio as 'landscape' | 'portrait' | 'square' | 'wide';

  if (ch.chapter === 'I') {
    return {
      ...restCh,
      aspectRatio,
      backdrop: 'neon',
      imageSrc: getAnnePhoto('1.JPG', 'https://images.unsplash.com/photo-1516541196182-6bdb0516ed27?auto=format&fit=crop&w=1400&q=85'),
    };
  }
  if (ch.chapter === 'II') {
    return {
      ...restCh,
      aspectRatio,
      textScene: 'grid',
      imageSrc: getAnnePhoto('2.JPG', 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1200&q=85'),
    };
  }
  if (ch.chapter === 'III') {
    return {
      ...restCh,
      aspectRatio,
      underlay: 'rain',
      imageSrc: getAnnePhoto('3.JPG', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85'),
    };
  }
  if (ch.chapter === 'IV') {
    const seq = ch.imageSequence || [];
    return {
      ...restCh,
      aspectRatio,
      underlay: 'wave',
      imageSrc: getAnnePhoto('4-1.JPG', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=85'),
      imageSequence: [
        {
          src: getAnnePhoto('4-1.JPG', 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1600&q=85'),
          alt: seq[0]?.alt || 'Fotograma 04.1 — Primera imagen de la secuencia',
        },
        {
          src: getAnnePhoto('4-2.JPG', 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?auto=format&fit=crop&w=1600&q=85'),
          alt: seq[1]?.alt || 'Fotograma 04.2 — Segunda imagen de la secuencia',
        },
        {
          src: getAnnePhoto('4-3.JPG', 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1600&q=85'),
          alt: seq[2]?.alt || 'Fotograma 04.3 — Tercera imagen de la secuencia',
        },
      ],
    };
  }
  if (ch.chapter === 'V') {
    return {
      ...restCh,
      aspectRatio,
      underlay: 'alba',
      imageSrc: getAnnePhoto('5.JPG', 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1400&q=85'),
    };
  }
  if (ch.chapter === 'VI') {
    // La secuencia vive aqui y no en el V: dos flashes seguidos se pisaban
    const seq = ch.imageSequence || [];
    return {
      ...restCh,
      aspectRatio,
      underlay: 'brain',
      imageSrc: getAnnePhoto('6-1.JPG', 'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?auto=format&fit=crop&w=1200&q=85'),
      imageSequence: [
        {
          src: getAnnePhoto('6-1.JPG', 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1600&q=85'),
          alt: seq[0]?.alt || 'Fotograma 06.1 — Primera imagen de la secuencia',
        },
        {
          src: getAnnePhoto('6-2.JPG', 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1600&q=85'),
          alt: seq[1]?.alt || 'Fotograma 06.2 — Segunda imagen de la secuencia',
        },
      ],
    };
  }
  return {
    ...restCh,
    aspectRatio,
    coda: 'orrery',
    imageSrc: getAnnePhoto('7.JPG', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1400&q=85'),
  };
});

