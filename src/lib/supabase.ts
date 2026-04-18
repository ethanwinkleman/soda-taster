import { createClient } from '@supabase/supabase-js';
import type { SodaEntry } from '../types/soda';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── DB row ↔ SodaEntry mappers ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromDb(row: any): SodaEntry {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    flavor: row.flavor ?? '',
    sugarType: row.sugar_type,
    size: row.size,
    notes: row.notes ?? '',
    photo: row.photo ?? null,
    ratings: row.ratings,
    overallScore: row.overall_score,
    tags: row.tags ?? [],
    isFavorite: row.is_favorite ?? false,
    dateRated: row.date_rated,
  };
}

export function toDb(soda: SodaEntry, userId: string) {
  return {
    id: soda.id,
    user_id: userId,
    name: soda.name,
    brand: soda.brand,
    flavor: soda.flavor,
    sugar_type: soda.sugarType,
    size: soda.size,
    notes: soda.notes,
    photo: soda.photo,
    ratings: soda.ratings,
    overall_score: soda.overallScore,
    tags: soda.tags,
    is_favorite: soda.isFavorite,
    date_rated: soda.dateRated,
  };
}
