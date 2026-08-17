# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite default, port 5173)
npm run build      # Generate icons → tsc -b → vite build
npm run lint       # ESLint across the project
npm test           # Vitest, single run
npm run test:watch # Vitest, watch mode
npm run preview    # Preview production build
```

`npm run lint` currently reports a **baseline of 11 problems (7 errors, 4 warnings)** — mostly `exhaustive-deps` and `react-refresh/only-export-components`. Treat that number as the bar: don't add to it, and don't count it as a regression you caused.

**Don't reintroduce `set-state-in-effect`.** Copying a prop or fetched value into state with an effect costs a second render and goes stale. The established fix here is to layer an edit over the source instead:

```ts
const [nameEdit, setNameEdit] = useState<string | null>(null);
const name = nameEdit ?? stash?.name ?? '';   // ?? not ||, so '' and 0 survive
```

`ShareModal`, `StashPage`, `SodaDetailPage` and `BarcodeResultPage` all use this. Two things to watch: a functional updater (`setX(p => !p)`) now receives the raw `null`, not the derived value, so toggles need writing out; and any code that reset the old state (clearing a form after a delete) still works, because writing the edit wins over the source.

`useBarcodeScanner` keeps one suppressed instance with the reasoning inline — deriving there would flash the previous scan's status, and the camera flow can't be exercised in CI.

### Tests

Vitest, no jsdom — the suite covers **pure logic only**, which is where the bugs have actually been. Components are verified by driving the real app in a browser instead.

Tested modules, and why each is worth it:

- `lib/score.ts` — averaging and star glyphs. Scores are half-steps, so `'★'.repeat(4.5)` silently renders four glyphs; that shipped once.
- `lib/shoppingList.ts` — who belongs on the list, and the copied/CSV output. The filter has been wrong twice.
- `utils/tasteProfile.ts` — flavour classification and generated prose.

This is also why `stockState`/`stars`/`buildShoppingText` live in `lib/` rather than inside `ShoppingListModal`: the component imports them, so the tests exercise exactly what ships. Put new pure logic in `lib/` for the same reason.

**Rule ordering in `FLAVOR_RULES` is load-bearing** — first match wins, so "cherry cola" is a Cola, and `grapefruit` must precede `grape`. All patterns need the `i` flag; two were missing it, which quietly hollowed out the Citrus and Fruit categories for anyone who capitalised a soda name normally.

## Database setup

Schema lives in `supabase/migrations/`, applied in filename order — `supabase db push`, or paste each file into the SQL editor in order. See `supabase/README.md` for adopting them on a project that already has the tables.

Two constraints, both of which have caused real bugs, so **run `scripts/verify-migrations.sh` before pushing schema changes**. It applies every migration to a throwaway database twice and catches both:

- **Order matters.** Postgres validates a policy expression and a `LANGUAGE sql` function body at `CREATE` time, so a migration must come *after* whatever it references — and it fails only on a *fresh* database, passing silently wherever the object already exists. `is_stash_member` was once defined after the policies calling it, and `profiles` after the RPC reading it.
- **Migrations must be re-appliable.** There is no `CREATE POLICY IF NOT EXISTS`, so every policy is preceded by `DROP POLICY IF EXISTS`. Without that they cannot be safely applied to an existing project.

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

Tables, created across `supabase/migrations/`:

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

### Offline writes

Quick Add is built for tasting events, which is exactly where signal dies, so the two mutations on that path — `addSoda` and `saveRating` — are **resumable**: TanStack Query pauses them while offline, the persister writes paused mutations into the same `localStorage` blob as the cache, and they replay on reconnect. `OfflineBanner` surfaces the queue.

Three constraints follow, and breaking any of them silently loses writes:

- **`mutationFn` lives at module scope** in `src/lib/offlineMutations.ts`, registered via `queryClient.setMutationDefaults`. A mutation restored from `localStorage` after a reload has no component to close over, so anything hook-scoped is unavailable — everything it needs must travel in the mutation variables.
- **Ids are minted on the client** with `crypto.randomUUID()`. A rating queued offline has to reference a soda that does not exist on the server yet; Postgres accepts an explicit uuid for these primary keys, so the optimistic id is the final id and nothing needs reconciling afterwards. Inserts tolerate a `23505` duplicate so a resumed-but-already-applied write is not an error.
- **`addSoda` is non-blocking and returns `{ sodaId }` synchronously.** Do not `await` it: offline the underlying mutation is paused, so a promise would never settle and the form would hang. Failures surface through `onError` (rollback + toast), not a rejected call.

Variables must be JSON-serialisable, which is why a `File` cannot ride along — photos are held in an in-memory map keyed by soda id and uploaded when the mutation runs. That survives a reconnect within the session but not a reload, where the soda simply keeps no photo.

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

### Admin analytics

`/admin` shows aggregate metrics to a designated super admin. Two things matter:

- **The admin flag lives in `app_admins`, not `profiles`.** `update_own_profile` lets a user update their own `profiles` row with no column restriction, so a `profiles.is_admin` column would let anyone promote themselves with one API call. `app_admins` has a SELECT-own-row policy and *no* write policies, so membership is grantable only from the SQL editor:

  ```sql
  INSERT INTO app_admins (user_id) SELECT id FROM auth.users WHERE email = 'you@example.com';
  ```

- **The RPCs are the security boundary, not the route.** `admin_daily_metrics`, `admin_summary_metrics` and `admin_top_sodas` each `RAISE EXCEPTION` unless `is_app_admin()`. `useIsAdmin` only decides whether to *offer* the link — the anon key ships in the bundle, so a client-side check protects nothing.

Charts are hand-rolled inline SVG (`MetricChart`) rather than a charting dependency; the page is `lazy()`-loaded so ordinary users never download it.

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

### Motion

The app is meant to feel carbonated, so motion is part of the design rather than decoration. Conventions:

- **Everything tappable gives way.** `Button` and `BottomNav` use `whileTap={{ scale: 0.97 }}` on a stiff spring; `SodaCard` and the collection cards match. A new interactive element without press feedback will feel dead next to them.
- **Lists stagger in** at `staggerChildren: 0.03–0.04` with a 6–8px rise. Used by the soda list, collections, activity feed and public profile.
- **`FloatingBubbles`** is the signature motif — an ambient rise behind a `CupSoda` icon. It belongs in empty states and placeholders, *not* in list rows: four looping animations per row gets expensive and noisy fast.
- **Shared-element transitions** via `layoutId` morph a soda card into its detail page (`card`, `thumb`, `name`, `score`). Keep the ids in sync across both files or the morph silently degrades to a cut.

**`MotionConfig reducedMotion="user"` wraps the whole app** in `App.tsx`, so every Framer Motion animation honours the OS setting automatically — transforms and layout morphs drop, opacity fades stay. Tailwind's CSS animations are outside its reach: pair decorative ones with `motion-reduce:animate-none` (as `Skeleton` does). Spinners are deliberately left running, since they are the only signal that something is in progress.

### Build notes

`scripts/generate-icons.mjs` runs first during `npm run build` to convert `public/favicon.svg` → PNG formats for Safari. This uses Node's `sharp` package.

`vite-plugin-pwa` runs with `registerType: 'autoUpdate'` and generates a service worker, so a production build precaches the app shell.

ESLint uses the flat config format (ESLint 9), configured in `eslint.config.js`.
