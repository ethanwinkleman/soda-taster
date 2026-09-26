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

CI enforces that bar rather than a clean exit, via `scripts/lint-baseline.mjs`: it fails when the count goes above `BASELINE`, and when the count drops it says so and passes — lower `BASELINE` there and here in the same commit that fixes the problems. Gating on a clean exit would paint every PR red and teach everyone to ignore CI; dropping lint from CI would let the baseline creep.

**Don't reintroduce `set-state-in-effect`.** Copying a prop or fetched value into state with an effect costs a second render and goes stale. The established fix here is to layer an edit over the source instead:

```ts
const [nameEdit, setNameEdit] = useState<string | null>(null);
const name = nameEdit ?? stash?.name ?? '';   // ?? not ||, so '' and 0 survive
```

`ShareModal`, `StashPage`, `SodaDetailPage` and `BarcodeResultPage` all use this. Two things to watch: a functional updater (`setX(p => !p)`) now receives the raw `null`, not the derived value, so toggles need writing out; and any code that reset the old state (clearing a form after a delete) still works, because writing the edit wins over the source.

`useBarcodeScanner` keeps one suppressed instance with the reasoning inline — deriving there would flash the previous scan's status, and the camera flow can't be exercised in CI.

### Tests

Vitest, no jsdom — the suite covers **pure logic only**, which is where the bugs have actually been. Components are verified by driving the real app in a browser instead.

No jsdom means no DOM globals either: `sessionStorage` is a `ReferenceError`, not an empty store. `chunkRecovery.test.ts` stubs a small in-memory `Storage` with `vi.stubGlobal` rather than pulling in a DOM — reach for that pattern if a module needs one key of storage, and keep anything needing a real document in a browser check instead.

Tested modules, and why each is worth it:

- `lib/score.ts` — averaging and star glyphs. Scores are half-steps, so `'★'.repeat(4.5)` silently renders four glyphs; that shipped once.
- `lib/shoppingList.ts` — who belongs on the list, and the copied/CSV output. The filter has been wrong twice.
- `utils/tasteProfile.ts` — flavour classification and generated prose.
- `lib/flavorNotes.ts` — the descriptor vocabulary, style baselines, and mining notes out of free text. Both halves of the recommendation feature run through this vocabulary, so a typo'd id silently stops matching.
- `lib/rootBeerCatalog.ts` — the curated shelf and the matching. A test asserts every catalog entry is described in the shared vocabulary; that check has already caught one dead note id.
- `lib/appUpdate.ts` — when to check for a new build, and whether reloading right now would throw away what someone is typing. The DOM wiring lives beside it; only these two decisions are tested.
- `lib/errorReporting.ts` — what is worth reporting when the app breaks, and what a path may say. Split from the reporter so the tests do not drag in the Supabase client.
- `lib/pageTransition.ts` — which way a navigation is going, which decides whether a page rises or sinks and whether the fizz plays at all.
- `lib/onboarding.ts` — which of the three first-run steps are done. Derived from the account's own counts, and the derivation is the whole feature (see below).
- `lib/ratingVisibility.ts` — what a viewer is allowed to see before they have rated. Every leak is silent: the number simply appears somewhere it should not, and no one notices until the group has already anchored on it.

This is also why `stockState`/`stars`/`buildShoppingText` live in `lib/` rather than inside `ShoppingListModal`: the component imports them, so the tests exercise exactly what ships. Put new pure logic in `lib/` for the same reason.

**Rule ordering in `FLAVOR_RULES` is load-bearing** — first match wins, so "cherry cola" is a Cola, and `grapefruit` must precede `grape`. All patterns need the `i` flag; two were missing it, which quietly hollowed out the Citrus and Fruit categories for anyone who capitalised a soda name normally.

## Database setup

Schema lives in `supabase/migrations/`, applied in filename order — `supabase db push`, or paste each file into the SQL editor in order. See `supabase/README.md` for adopting them on a project that already has the tables.

Three constraints, all of which have caused real bugs, so **run `scripts/verify-migrations.sh` before pushing schema changes**. It applies every migration to a throwaway database twice, then calls the admin RPCs as both an admin and an ordinary user:

- **Order matters.** Postgres validates a policy expression and a `LANGUAGE sql` function body at `CREATE` time, so a migration must come *after* whatever it references — and it fails only on a *fresh* database, passing silently wherever the object already exists. `is_stash_member` was once defined after the policies calling it, and `profiles` after the RPC reading it.
- **Migrations must be re-appliable.** There is no `CREATE POLICY IF NOT EXISTS`, so every policy is preceded by `DROP POLICY IF EXISTS`. Without that they cannot be safely applied to an existing project.
- **A plpgsql body is not checked until it runs.** `RETURNS TABLE (... user_email TEXT)` selecting `auth.users.email` creates without complaint and then fails in the app with *structure of query does not match function result type* — `email` is `CHARACTER VARYING(255)`, and plpgsql wants an exact match. Cast at the SELECT (`u.email::text`). The script's third pass calls each RPC for this reason, and its `auth.users` stub mirrors the real column types, because a stub typed `TEXT` hides the bug completely.

**Postgres indexes primary keys and UNIQUE constraints — not foreign keys.** Every filter the app runs on a hot path needs its own index or it is a sequential scan whose cost grows with the whole table. `20260101001500_hot_path_indexes.sql` covers the ones the app actually issues; a trailing column of a UNIQUE does not count, which is why `stash_members(user_id)` needed its own even though `UNIQUE(stash_id, user_id)` exists.

Measured on a seeded 1000-user database (60k sodas, 200k activity rows): the collection page's soda query went from a sequential scan discarding 59,970 rows at 5.7 ms to an index scan at 0.21 ms, and the activity feed from 16.4 ms to 0.55 ms. Add an index alongside any new hot-path filter, and check the plan with `EXPLAIN (ANALYZE)` against seeded data rather than an empty table — an empty table always looks fast.

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

### First-run onboarding

`GettingStarted` is a three-step checklist on the collections page: start a collection → add a soda → rate one. That is the loop the app is built around, and someone who stops after the first step sees an empty list, no palate profile, and nothing explaining why.

**Every step is derived from the account's own counts** (`lib/onboarding.ts`), never from a stored "step 2 of 3" cursor. A cursor is wrong in both directions: it re-teaches someone who joined a friend's already-full collection, it stays finished for someone who deleted everything, and it does not exist on a new device where the collections do. Deriving also means the checklist needs no write path at all.

It is deliberately not a modal tour — it sits in the page, each row is the shortcut to the thing it names, and it removes itself once the loop has been completed once. Finishing is the dismissal, so the common case stores nothing; the X button stores `soda-taster-onboarding-dismissed` for people who want it gone early.

It never appears before the first collection exists — the page's empty state already makes that request, and two panels asking for the same thing is worse than one.

**A failed ratings read counts as "has rated", not zero.** The steps are only as good as the counts behind them, and the failure mode of guessing low is telling someone with fifty ratings to go and rate their first soda.

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

### Realtime

The four hooks that subscribe to `postgres_changes` depend on two things no code in this repo used to set, both now in `20260101001600_realtime_publication.sql`:

- **Table membership in the `supabase_realtime` publication.** This was a dashboard toggle, so live updates worked on whichever project someone had flipped it on and silently did nothing anywhere else, a fresh restore from these migrations included.
- **`REPLICA IDENTITY FULL` on `soda_comments`.** A DELETE writes only the primary key to the WAL under the default identity, so a subscription filtered on a non-key column can never match one. `useSodaComments` filters DELETE on `soda_id`, which means a deleted comment stayed on every other member's screen until something else made them refetch. Decoded from a local WAL:

  ```
  default:  table public.soda_comments: DELETE: id[uuid]:'cb75…'
  full:     table public.soda_comments: DELETE: id[uuid]:'7d1b…' soda_id[uuid]:'2222…' body[text]:'second'
  ```

FULL writes the whole old row to the WAL, so apply it only where a filter needs it — the other three subscriptions are unfiltered and do not. **Any new filtered DELETE subscription needs it on that table**, which includes the planned per-collection filtering of `stash_sodas` and `stash_soda_ratings`.

**Every subscription is filtered by collection, and new ones must be.** Supabase authorises `postgres_changes` per subscriber, so an unfiltered listener costs a policy evaluation against every connected client for every row change in that table, plus a refetch for each one that passes. `useStashSodas` and `useStashes` were both unfiltered; they are not now.

`stash_soda_ratings` had no column naming its collection, which is why it could not be filtered. `20260101001700` adds one, derived by a trigger from the soda on every insert and update. **The trigger ignores whatever the client sent** — the column decides which subscribers a change reaches, and a routing key the client can write is a bad thing to leave lying about. Re-deriving unconditionally rather than only `ON UPDATE OF soda_id` is what makes that true, and it means moving a soda between collections takes its ratings' routing with it.

`useStashes` belongs to several collections at once, so it registers one filtered listener per collection on a single channel. That is deliberately not an `in.()` filter: support varies by Realtime version and the failure is silent.

### Offline writes

Quick Add is built for tasting events, which is exactly where signal dies, so the two mutations on that path — `addSoda` and `saveRating` — are **resumable**: TanStack Query pauses them while offline, the persister writes paused mutations into the same `localStorage` blob as the cache, and they replay on reconnect. `OfflineBanner` surfaces the queue.

Three constraints follow, and breaking any of them silently loses writes:

- **`mutationFn` lives at module scope** in `src/lib/offlineMutations.ts`, registered via `queryClient.setMutationDefaults`. A mutation restored from `localStorage` after a reload has no component to close over, so anything hook-scoped is unavailable — everything it needs must travel in the mutation variables.
- **Ids are minted on the client** with `crypto.randomUUID()`. A rating queued offline has to reference a soda that does not exist on the server yet; Postgres accepts an explicit uuid for these primary keys, so the optimistic id is the final id and nothing needs reconciling afterwards. Inserts tolerate a `23505` duplicate so a resumed-but-already-applied write is not an error.
- **`addSoda` is non-blocking and returns `{ sodaId }` synchronously.** Do not `await` it: offline the underlying mutation is paused, so a promise would never settle and the form would hang. Failures surface through `onError` (rollback + toast), not a rejected call.

Variables must be JSON-serialisable, which is why a `File` cannot ride along — photos are held in an in-memory map keyed by soda id and uploaded when the mutation runs. That survives a reconnect within the session but not a reload, where the soda simply keeps no photo.

### Staying up to date

Cache busting was never the hard part — filenames are content-hashed, navigations are network-first, and the worker is generated with `skipWaiting` + `clientsClaim`, so a new worker takes over the moment it is found. What was missing was the *finding*.

vite-plugin-pwa's generated registration is one line: register on window `load`. That makes a page load the only thing that ever asks whether a new version exists, and **an installed PWA resumed from the app switcher is not a page load**. Measured against a real build: an app left open across a deploy saw zero update checks in 45 seconds, and none on returning to the foreground. Force-quitting was the only way to get the latest version, because a cold start was the only thing that re-registered.

`lib/appUpdate.ts` adds the missing half: `registration.update()` when the app comes back to the foreground (at most once a minute — app-switching is constant and each check is a request) and every 15 minutes while it stays open. Everything downstream already existed.

Two things it has to get right, both covered by tests:

- **The first `controllerchange` on an uncontrolled page is the initial claim, not an update.** Reloading for it wastes a round trip on a first-ever visit. Only that first one is exempt — an earlier version of this suppressed them all for the page's lifetime, which meant a first-time visitor never picked up a deploy at all.
- **A reload throws away whatever the page has not written yet.** Ratings save on tap and queued writes survive, but tasting notes live in the textarea and a modal usually has a half-filled form behind it. `isSafeToReload` holds the update back while a text field has focus or a dialog is open, and it is applied on the next `focusout`, foreground, or slow retry.

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

**supabase-js resolves with `{ error }` rather than throwing.** An unchecked call therefore renders a failure as its empty value, which is the single most common bug in this codebase: `editSoda` reported a save that never happened, `loadStashes` showed the "your collection starts here" empty state to people who had collections, `useIsAdmin` told an admin they were not one, and `loadSodas` — the busiest read in the app — drew a collection as empty when the read had failed. Every read and write must act on `error` — `if (error) throw new Error(error.message)` in a query function, so TanStack Query surfaces it.

A hook that can fail should return that error, and the UI must draw three distinct states — loading, failed, empty. Collapsing the first two into the third is what made all three bugs invisible. `useStashes` and `useIsAdmin` both return `{ ..., error }` for this reason.

RLS helpers are `SECURITY DEFINER` functions (`is_stash_member`, `shares_stash_with`) specifically to avoid infinite recursion when a policy needs to read the table it protects. Reuse that pattern rather than inlining a subquery.

### Client error reporting

`@vercel/analytics` reports page views and Web Vitals, not exceptions, so a broken deploy used to reach you through a person noticing. `lib/errorReporter.ts` files what breaks into `client_errors`; `/admin` shows the last seven days grouped by message.

Four rules, all of them load-bearing:

- **The table is append-only from the client.** INSERT is allowed, SELECT is not — the anon key ships in the bundle, and a readable error log is a list of other people's user ids, routes and stack traces. Reading is `admin_recent_errors`, the same boundary the metrics use. Verified as an unprivileged role: a member can file their own error, cannot file one under another user id, and reads zero rows even when SELECT is granted at the table level.
- **Paths are normalised before they are stored**, and the first reason is not grouping: `/join/ABC123` carries a working invite code in the path itself. Ids collapse to `:id` so one broken page is one row rather than one per soda.
- **Length caps live in the database as well as the client.** A client-side cap is a courtesy; anyone holding the anon key can post what they like.
- **Chunk-load failures are filtered out.** `chunkRecovery` already reloads into the new build, so reporting them would fill the table on every deploy with something that needs no action.

`report` never throws — a reporter that can break the app it is watching is worse than none — and a session files at most five distinct messages, so a render loop cannot flood the table.

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
- **Two blank windows used to sit either side of the motion.** `index.html` now paints a CSS-only cup that fills and fizzes before any JavaScript has parsed — measured on Slow 3G, `#root` was empty with nothing on screen for the first ~600 ms. `window.__bootAt` records when that pour started so `AuthGate`'s `FillingCup` resumes from the same level rather than restarting; the two cups are drawn at identical size and position (verified: both centre at the same pixel, and the 30 px spacer under the splash matches the `Logo`'s line box), so it reads as one pour.
- **`Suspense` needs a `fallback`.** Both boundaries had none, so React rendered `null` for the whole route-chunk download — a blank page, measured. `RouteFallback` waits 250 ms via `animation-delay` before fading in, so a fast navigation still looks instant and only a genuinely slow one shows anything.
- **Pages rise and sink rather than sliding sideways** — carbonation goes up, and vertical movement reads as a stack rather than a carousel. A stiff spring settles in about 200 ms, because this fires on every navigation and character has to stay cheap. Direction comes from `navDirection` in `lib/pageTransition.ts`, derived from the navigation type rather than a remembered path: a ref read during render is what the lint rules here forbid, and `POP` already means backwards.
- **`FizzTrail` plays on the way in and never on the way back.** A flourish you see on every navigation stops reading as delight and starts reading as lag, so it is limited to a push into content — arriving home does not count, since that is the most-travelled route in the app. It renders *outside* the animated container and positions itself `fixed`: anchored inside the page it would sit at the bottom of the document, so on any collection longer than a screen the fizz would rise where nobody is looking, and a transformed ancestor makes `fixed` resolve against that element instead of the viewport.
- **Shared-element transitions** via `layoutId` morph a soda card into its detail page (`card`, `thumb`, `name`, `score`). Keep the ids in sync across both files or the morph silently degrades to a cut.

### Dialog focus

`Modal` and the confirm dialog both call `useFocusTrap(panelRef, open)`. It moves focus in, keeps Tab inside, and hands focus back to whatever opened the dialog on close — without it, Tab walks straight out into the page behind the backdrop. Any new dialog needs the same hook plus `role="dialog"`, `aria-modal="true"` and `tabIndex={-1}` on the panel.

Toasts are already announced: sonner renders its own `aria-live="polite"` region, so a `toast.success` reaches a screen reader without extra markup. Don't add a second live region for the same message.

**`MotionConfig reducedMotion="user"` wraps the whole app** in `App.tsx`, so every Framer Motion animation honours the OS setting automatically — transforms and layout morphs drop, opacity fades stay. Tailwind's CSS animations are outside its reach: pair decorative ones with `motion-reduce:animate-none` (as `Skeleton` does). Spinners are deliberately left running, since they are the only signal that something is in progress.

### CI

`.github/workflows/ci.yml` runs on every pull request and every push to `main`: `npm ci` → the lint baseline check → `npm test` → `npm run build` (which is icons → `tsc -b` → `vite build`, so it covers the typecheck too).

Nothing ran on a PR before it existed — Vercel deployed previews and that was all — which is how eight failing tests reached `main` and stayed there. If you add a check, add it here too, or it will only run for whoever remembers.

### Build notes

`scripts/generate-icons.mjs` runs first during `npm run build` to convert `public/favicon.svg` → PNG formats for Safari. This uses Node's `sharp` package.

`vite-plugin-pwa` runs with `registerType: 'autoUpdate'` and generates a service worker, so a production build precaches the app shell.

**The social card (`public/og.png`) is committed, not built.** Its source is `scripts/og-template.html` — a standalone 1200×630 page that inlines the Cherry Fizz palette, for the same reason `TastingCard` does: it is rasterised rather than served by Tailwind. `node scripts/generate-og.mjs` re-shoots it, and needs `npm i -D playwright` (deliberately not a project dependency — one asset uses it). `CHROMIUM_PATH` points at a browser you already have; `OG_FONT_DIR` inlines local woff2 files when fonts.googleapis.com is unreachable.

Two traps it now guards against: `document.fonts.check()` returns `true` for a family that never loaded, so the script asserts against `document.fonts` itself and aborts rather than shipping a card set in a fallback face; and a `file://` page is an opaque origin whose webfonts never load at all, hence the throwaway HTTP server. `og.png` is excluded from the Workbox precache in `vite.config.ts` — scrapers fetch it, the app never does.

ESLint uses the flat config format (ESLint 9), configured in `eslint.config.js`.
