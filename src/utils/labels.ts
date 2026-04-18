import type { FlavorTag, SugarType, SodaSize } from '../types/soda';

/** Returns a display label for any tag — preset or custom. */
export function getTagLabel(tag: string): string {
  return (TAG_LABELS as Record<string, string>)[tag] ?? tag;
}

export const TAG_LABELS: Record<FlavorTag, string> = {
  cola: 'Cola',
  citrus: 'Citrus',
  cherry: 'Cherry',
  'black-cherry': 'Black Cherry',
  vanilla: 'Vanilla',
  'root-beer': 'Root Beer',
  'cream-soda': 'Cream Soda',
  grape: 'Grape',
  orange: 'Orange',
  'lemon-lime': 'Lemon Lime',
  ginger: 'Ginger',
  other: 'Other',
};

export const SUGAR_LABELS: Record<SugarType, string> = {
  sugar: 'Cane Sugar',
  hfcs: 'HFCS',
  'zero-sugar': 'Zero Sugar',
  diet: 'Diet',
};

export const SIZE_LABELS: Record<SodaSize, string> = {
  can: 'Can',
  bottle: 'Bottle',
  fountain: 'Fountain',
};

export function computeOverallScore(ratings: {
  taste: number;
  sweetness: number;
  carbonation: number;
  aftertaste: number;
  packaging: number;
}): number {
  // Weighted: taste 35%, aftertaste 25%, carbonation 20%, sweetness 15%, packaging 5%
  const weighted =
    ratings.taste * 0.35 +
    ratings.aftertaste * 0.25 +
    ratings.carbonation * 0.2 +
    ratings.sweetness * 0.15 +
    ratings.packaging * 0.05;
  return Math.round(weighted * 10) / 10;
}
