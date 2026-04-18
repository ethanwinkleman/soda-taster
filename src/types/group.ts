import type { CategoryRatings } from './soda';

export interface Group {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
  created_at: string;
}

export interface MemberProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface GroupSoda {
  id: string;
  group_id: string;
  name: string;
  brand: string;
  flavor: string;
  sugar_type: string;
  size: string;
  tags: string[];
  photo: string | null;
  created_by: string;
  created_at: string;
}

export interface GroupSodaRating {
  id: string;
  group_soda_id: string;
  user_id: string;
  ratings: CategoryRatings;
  overall_score: number;
  notes: string;
  date_rated: string;
}

export interface GroupSodaWithData extends GroupSoda {
  memberRatings: GroupSodaRating[];
  favoritedBy: string[]; // user_ids
  avgScore: number | null;
  myRating: GroupSodaRating | null;
}

export interface GroupInventoryItem {
  id: string;
  group_id: string;
  soda_name: string;
  group_soda_id: string | null;
  quantity: number;
  created_by: string;
  last_changed_by: string | null;
  last_changed_at: string | null;
}
