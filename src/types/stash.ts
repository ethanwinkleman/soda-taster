export interface Stash {
  id: string;
  name: string;
  icon: string | null;
  ownerId: string;
  joinCode: string;
  createdAt: string;
  isFavorite: boolean;
  sodaCount: number;
  accentColor: string | null;
  lastTastedAt: string | null;
  newActivityCount: number;
}

export interface RecentRatingActivity {
  sodaId: string | null;
  sodaName: string;
  stashId: string;
  score: number | null;
  displayName: string;
  createdAt: string;
}

export interface StashMember {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface Soda {
  id: string;
  stashId: string;
  name: string;
  brand: string;
  addedBy: string;
  inFridge: boolean;
  quantity: number;
  imageUrl: string | null;
  createdAt: string;
  /**
   * Everyone else's scores — numbers only, and empty until the group is revealed to
   * you. The database withholds them rather than the UI hiding them, so a blind
   * verdict is not sitting in the network tab.
   */
  otherScores: number[];
  /** Every rating including your own. Shown while blind: a count spoils nothing. */
  ratingCount: number;
  /** The group average, or null while blind. */
  avgScore: number | null;
  myRating: SodaRating | null;
  commentCount: number;
}

export interface SodaRating {
  id: string;
  sodaId: string;
  userId: string;
  displayName: string;
  score: number;
  notes: string | null;
  createdAt: string;
}

export type SortOption = 'highest' | 'lowest' | 'newest' | 'oldest' | 'name';
