export interface Stash {
  id: string;
  name: string;
  ownerId: string;
  joinCode: string;
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
  ratings: SodaRating[];
  avgScore: number | null;
  myRating: SodaRating | null;
}

export interface SodaRating {
  id: string;
  sodaId: string;
  userId: string;
  displayName: string;
  score: number;
  createdAt: string;
}

export type SortOption = 'highest' | 'lowest' | 'newest' | 'oldest' | 'name';
