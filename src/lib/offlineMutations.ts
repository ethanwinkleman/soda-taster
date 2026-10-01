import type { QueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { imageRejection } from './imageUpload';
import { prepareImageForUpload } from './imageResize';
import { newSodaImagePath } from './imageUrls';
import { logActivity } from './activity';

/**
 * Writes that must survive a bad connection.
 *
 * Quick Add exists for tasting events, which is exactly where signal dies, so the
 * two mutations on that path are registered as resumable. TanStack Query pauses a
 * mutation while offline, the persister writes paused mutations to localStorage, and
 * the client resumes them on reconnect — including after a reload, which is why the
 * mutationFn lives at module scope rather than closing over hook state.
 *
 * Ids are generated on the client so a rating queued offline can reference a soda
 * that does not exist on the server yet. Postgres accepts an explicit uuid for these
 * primary keys, so the optimistic id is the final id and nothing needs reconciling.
 */

export const ADD_SODA_KEY = ['soda', 'add'];
export const SAVE_RATING_KEY = ['rating', 'save'];

export interface AddSodaVars {
  sodaId: string;
  stashId: string;
  userId: string;
  name: string;
  brand: string;
  score: number | null;
  displayName: string;
  externalImageUrl?: string | null;
}

export interface SaveRatingVars {
  sodaId: string;
  stashId: string;
  userId: string;
  score: number;
  displayName: string;
  notes: string | null;
  isUpdate: boolean;
  sodaName?: string;
}

/**
 * Photos picked while offline. A File cannot be serialised into the persisted queue,
 * so it is held here and uploaded when the mutation actually runs. Survives a
 * reconnect within the session; a reload drops it and the soda simply keeps no photo.
 */
const pendingImages = new Map<string, File>();

export function holdImageFor(sodaId: string, file: File) {
  pendingImages.set(sodaId, file);
}

async function uploadHeldImage(stashId: string, sodaId: string) {
  const file = pendingImages.get(sodaId);
  if (!file) return null;
  // A held photo was checked when it was picked, but this runs on resume — possibly in
  // a later session — and the soda is better off with no photo than with a write the
  // bucket will refuse.
  if (imageRejection(file)) {
    pendingImages.delete(sodaId);
    return null;
  }
  // Downscaled at the moment of sending rather than when it was picked: this may run on
  // a resumed connection, which is the link that least wants four megabytes.
  const prepared = await prepareImageForUpload(file);
  pendingImages.delete(sodaId);
  if ('error' in prepared) return null;
  const path = newSodaImagePath(stashId, sodaId);
  const { error } = await supabase.storage
    .from('soda-images')
    .upload(path, prepared.file, { upsert: true, contentType: prepared.file.type });
  if (error) return null;
  // The path, not a URL. The bucket is private, so a URL has to be signed at read time
  // and would expire long before some of these rows are looked at again.
  return path;
}

async function addSodaFn(v: AddSodaVars) {
  const { error } = await supabase.from('stash_sodas').insert({
    id: v.sodaId,
    stash_id: v.stashId,
    name: v.name,
    brand: v.brand,
    added_by: v.userId,
  });
  // A resumed mutation may have already inserted before the reply was lost; that is
  // fine, the row is keyed by our own uuid, so treat a duplicate as success.
  if (error && error.code !== '23505') throw new Error(error.message);

  const imageUrl = (await uploadHeldImage(v.stashId, v.sodaId)) ?? v.externalImageUrl ?? null;
  if (imageUrl) {
    await supabase.from('stash_sodas').update({ image_url: imageUrl }).eq('id', v.sodaId);
  }

  if (v.score !== null) {
    await supabase.from('stash_soda_ratings').upsert(
      { soda_id: v.sodaId, user_id: v.userId, display_name: v.displayName, score: v.score },
      { onConflict: 'soda_id,user_id' },
    );
  }

  await logActivity({
    stashId: v.stashId, userId: v.userId, displayName: v.displayName,
    action: 'soda_added', sodaId: v.sodaId, sodaName: v.name,
  });

  return { sodaId: v.sodaId };
}

async function saveRatingFn(v: SaveRatingVars) {
  const { error } = await supabase.from('stash_soda_ratings').upsert(
    { soda_id: v.sodaId, user_id: v.userId, display_name: v.displayName, score: v.score, notes: v.notes },
    { onConflict: 'soda_id,user_id' },
  );
  if (error) throw new Error(error.message);

  await logActivity({
    stashId: v.stashId, userId: v.userId, displayName: v.displayName,
    action: v.isUpdate ? 'rating_updated' : 'rating_added',
    sodaId: v.sodaId, sodaName: v.sodaName, score: v.score,
  });

  return { sodaId: v.sodaId };
}

/**
 * Registered against the client itself (not a component) so a mutation restored from
 * localStorage after a reload can still find its function.
 */
export function registerOfflineMutations(queryClient: QueryClient) {
  queryClient.setMutationDefaults(ADD_SODA_KEY, {
    mutationFn: (vars: AddSodaVars) => addSodaFn(vars),
    retry: 3,
  });
  queryClient.setMutationDefaults(SAVE_RATING_KEY, {
    mutationFn: (vars: SaveRatingVars) => saveRatingFn(vars),
    retry: 3,
  });
}
