export type SugarType = 'sugar' | 'hfcs' | 'zero-sugar' | 'diet';
export type SodaSize = 'can' | 'bottle' | 'fountain';
export type FlavorTag =
  | 'cola'
  | 'citrus'
  | 'cherry'
  | 'black-cherry'
  | 'vanilla'
  | 'root-beer'
  | 'cream-soda'
  | 'grape'
  | 'orange'
  | 'lemon-lime'
  | 'ginger'
  | 'other';

export interface CategoryRatings {
  taste: number;
  sweetness: number;
  carbonation: number;
  aftertaste: number;
  packaging: number;
}

export interface SodaEntry {
  id: string;
  name: string;
  brand: string;
  flavor: string;
  sugarType: SugarType;
  size: SodaSize;
  notes: string;
  photo: string | null; // base64 data URL
  ratings: CategoryRatings;
  overallScore: number;
  tags: string[]; // preset FlavorTag slugs or arbitrary custom strings
  isFavorite: boolean;
  dateRated: string; // ISO string
}

export type SortOption = 'highest' | 'lowest' | 'newest' | 'oldest';
