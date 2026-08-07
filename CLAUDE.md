# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Vite default, port 5173)
npm run build    # Generate icons → tsc -b → vite build
npm run lint     # ESLint across the project
npm run preview  # Preview production build
```

There is no test suite. `npm run lint` currently reports a **baseline of 22 problems (14 errors, 8 warnings)** — mostly `react-hooks/set-state-in-effect` and `exhaustive-deps`. Treat that number as the bar: don't add to it, and don't count it as a regression you caused.

## Database setup

Before running the app against a new Supabase project, run `supabase/schema.sql` in the Supabase SQL editor. It creates every table, RLS policy, RPC, and the `soda-images` storage bucket.

The file is written as an append-only migration log: new features add a `-- ── Section ──` block at the end using `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, so re-running the whole file is safe. Follow that convention when adding schema.

**Environment:** requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. (`*.local` is gitignored.)

## Architecture

**Stack:** React 19 + TypeScript + Vite + TailwindCSS v4 + Supabase (auth, DB, storage) + React Router v7 + Framer Motion + TanStack Query + `vite-plugin-pwa`.

### Unified stash model

Everything belongs to a **stash**. There is no separate personal vs. group concept — a personal stash is simply a stash with one member (the owner). Any stash can be shared via invite code.

```
Stash  →  Soda  →  SodaRating (one per user per soda)
       ↘  StashMember        ↘  SodaComment (one level of replies)
       ↘  StashActivity
```

Tables in `supabase/schema.sql`:

- `stashes` — name, owner_id, join_code, icon, accent_color
- `stash_members` — stash_id, user_id, is_favorite (owner is inserted as first member on creation)
- `stash_sodas` — stash_id, name, brand, added_by, in_fridge, quantity, image_url
- `stash_soda_ratings` — soda_id, user_id, display_name, score, notes; unique on (soda_id, user_id)
- `stash_activity` — append-only feed; `soda_id` is deliberately **not** a FK and `soda_name` is a snapshot, so entries survive soda deletion (ACT-07)
- `soda_comments` — body (≤500 chars), parent_id for one level of replies
- `profiles` — username, is_public, display_name, avatar_url; auto-created from Google metadata on first load

### Ratings

Scores are `NUMERIC(3,1)` in **half steps from 0.5 to 5.0** — `StarRating` maps a pointer position across the whole strip to the nearest half. Ratings also carry an optional free-text `notes` field (≤300 chars). The displayed score is the average across all members' ratings, rounded to one decimal. The breakdown table is shown only when more than one member has rated.

Anything formatting a score for display must handle halves (see `stars()` in `ShoppingListModal.tsx`).

### Data flow

```
Supabase DB
  → Custom hooks (src/hooks/) — own all fetch/CRUD, return { data, loading, mutators }
    → Pages (src/pages/) — consume hooks, handle navigation
      → Components (src/components/) — presentational
```

Hooks: `useStashes`, `useStashSodas`, `useSodaComments`, `useStashActivity`, `useMyRatings`, `useProfile`, `useBarcodeScanner`, `usePullToRefresh`.

### Caching (TanStack Query)

There is no Redux/Zustand-style store, but **TanStack Query is the shared cache layer** — hooks are not independent fetchers. `App.tsx` wraps the app in `PersistQueryClientProvider` with a `localStorage` persister (`key: 'soda-taster-rq'`, `gcTime`/`maxAge` 24 h, `buster: 'v1'`), so a warm cache paints instantly on relaunch.

Conventions used by `useStashes` and `useStashSodas`, worth matching in new hooks:

- Query keys are `['stashes', userId]` and `['stash-sodas', stashId, userId]`; `staleTime` is 5 min and 3 min respectively.
- Mutators patch the cache optimistically via `queryClient.setQueryData`, snapshot the previous value, and roll back in a `catch`.
- A Supabase realtime channel subscribes to the relevant tables and **debounce-invalidates** the query (150–300 ms) so other members' changes refetch in the background.

Because the cache is keyed and shared, calling `useStashSodas` in several components (`StashPage`, `AddSodaPage`, `SodaDetailPage`, `BarcodeScanPage`, `BarcodeResultPage`, `useSodaComments`) does **not** cause duplicate round-trips.

Bump `buster` in `App.tsx` when a change makes previously persisted cache shapes invalid.

### Routing

```
/                          → StashesPage       (list + create + join)
/stash/:id                 → StashPage         (soda list, settings/inventory/top-rated/shopping-list sheets)
/stash/:id/add             → AddSodaPage       (Quick Add / Full Details modes)
/stash/:id/scan            → BarcodeScanPage
/stash/:id/scan/result     → BarcodeResultPage
/stash/:id/activity        → StashActivityPage
/stash/:id/soda/:sodaId    → SodaDetailPage
*                          → NotFoundPage
/join/:code                → JoinStashPage     (public — no auth)
/u/:username               → PublicProfilePage (public — no auth)
```

`App.tsx` wraps everything in `PersistQueryClientProvider` → `BrowserRouter` → `AuthProvider` → `ConfirmProvider`. Public routes (`/join/:code`, `/u/:username`) sit outside `<AuthGate>`; everything else requires a session. All pages are `lazy()`-loaded.

### Join flow

1. User visits `/join/:code` (public) — `JoinStashPage` looks up the stash name via the `lookup_stash_by_code` RPC (SECURITY DEFINER, works unauthenticated).
2. If not signed in: code is saved to `localStorage` under key `pendingStashCode`, then Google OAuth is triggered.
3. After sign-in, `PendingJoinHandler` (rendered inside the authenticated shell) reads the key, calls `joinStash(code)`, and navigates to the stash.

### Supabase integration

`src/lib/supabase.ts` exports only the client. Each hook defines its own inline `fromDb` mappers for snake_case → camelCase conversion. All auth is Google OAuth managed by `AuthContext`.

RLS helpers are `SECURITY DEFINER` functions (`is_stash_member`, `shares_stash_with`) specifically to avoid infinite recursion when a policy needs to read the table it protects. Reuse that pattern rather than inlining a subquery.

### Permissions enforced in UI

- Any stash member: add sodas, edit any soda's name/brand, remove any soda, add/update their own rating, comment
- Owner only: rename stash, delete stash, remove members (enforced both in UI and via RLS)
- Members can only delete their own ratings (RTG-05) and their own comments

## Design system — "Cherry Fizz"

Tokens live in the `@theme` block of `src/index.css`. Tailwind's default palettes are **remapped**, so the utility names lie: `sky-*` is cherry pink/red (`sky-500` = `#ff3d78`), `gray-*` is a warm cream → plum-black ramp, `cyan-*` is fizz teal, and `amber-400/500` is the citrus pop used for stars and trophies. There are also `rating-1`…`rating-5` tokens for the sequential score ramp.

Conventions:

- `font-display` is Fredoka (max weight **700** — never `font-black`), `font-sans` is Plus Jakarta Sans.
- Headings are `font-display font-bold`. Body/caption text is not italic; the old newspaper `font-black italic` styling has been fully removed.
- Surfaces are `rounded-2xl` with `border border-gray-200 dark:border-gray-700` and a soft shadow: `shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)]`.
- Primary buttons carry a cherry glow: `shadow-[0_4px_14px_-4px_rgba(255,61,120,0.35)]`.
- Avatars/icon badges are `rounded-full`/`rounded-xl` with `bg-gradient-to-br from-sky-500 to-cyan-500 text-white`.
- Copy voice is plain and friendly ("Members", "Top Rated", "Delete Collection") — not the retired editorial voice ("Correspondents", "Distinguished Sodas", "Dissolve Collection").

`TastingCard.tsx` is the one exception to Tailwind: it is rasterised by `html2canvas` for share images, so it inlines the palette as hex constants. Keep those in sync with the tokens.

Use the `z-(--z-*)` scale from `index.css` (`sticky`/`header`/`modal`/`confirm`) rather than raw z-index numbers.

### Build notes

`scripts/generate-icons.mjs` runs first during `npm run build` to convert `public/favicon.svg` → PNG formats for Safari. This uses Node's `sharp` package.

`vite-plugin-pwa` runs with `registerType: 'autoUpdate'` and generates a service worker, so a production build precaches the app shell.

ESLint uses the flat config format (ESLint 9), configured in `eslint.config.js`.
