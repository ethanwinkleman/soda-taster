# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on port 5174
npm run build    # Generate icons → tsc → vite build
npm run lint     # ESLint across the project
npm run preview  # Preview production build
```

There is no test suite.

## Database setup

Before running the app against a new Supabase project, run `supabase/schema.sql` in the Supabase SQL editor. This creates the four tables (`stashes`, `stash_members`, `stash_sodas`, `stash_soda_ratings`), all RLS policies, and the `lookup_stash_by_code` RPC used by the public join page.

**Environment:** Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Architecture

**Stack:** React 19 + TypeScript + Vite + TailwindCSS v4 + Supabase (auth, DB) + React Router v7 + Framer Motion.

### Unified stash model

Everything belongs to a **stash**. There is no separate personal vs. group concept — a personal stash is simply a stash with one member (the owner). Any stash can be shared via invite code.

```
Stash  →  Soda  →  SodaRating (one per user per soda)
       ↘  StashMember
```

- `stashes` — name, owner_id, join_code
- `stash_members` — stash_id, user_id (owner is inserted as first member on creation)
- `stash_sodas` — stash_id, name, brand, added_by, in_fridge, quantity
- `stash_soda_ratings` — soda_id, user_id, display_name, score (1–5); unique on (soda_id, user_id)

### Ratings

Ratings are a single 1–5 integer score per member per soda. The displayed score is the average across all members' ratings (rounded to one decimal). The breakdown table is shown only when more than one member has rated.

### Data flow

```
Supabase DB
  → Custom hooks (src/hooks/) — own all fetch/CRUD, return { data, loading, mutators }
    → Pages (src/pages/) — consume hooks, handle navigation
      → Components (src/components/) — presentational
```

- `useStashes(userId)` — called once in `AppRoutes` (App.tsx); provides the stash list to `Sidebar` and all stash-management pages
- `useStashSodas(stashId, userId)` — called independently in each of `StashPage`, `AddSodaPage`, and `SodaDetailPage`

No global state manager. State lives in hooks called at the relevant level and props are drilled down.

### Routing

```
/                        → StashesPage   (list + create + join)
/stash/:id               → StashPage     (soda list, settings modal)
/stash/:id/add           → AddSodaPage
/stash/:id/soda/:sodaId  → SodaDetailPage
/join/:code              → JoinStashPage (public — no auth)
/u/:username             → PublicProfilePage (public — no auth)
```

`App.tsx` wraps everything in `BrowserRouter` + `AuthProvider`. Public routes (`/join/:code`, `/u/:username`) are outside `<AuthGate>`. All other routes require a session.

### Join flow

1. User visits `/join/:code` (public) — `JoinStashPage` looks up the stash name via the `lookup_stash_by_code` RPC (SECURITY DEFINER, works unauthenticated).
2. If not signed in: code is saved to `localStorage` under key `pendingStashCode`, then Google OAuth is triggered.
3. After sign-in, `PendingJoinHandler` (rendered inside the authenticated shell) reads the key, calls `joinStash(code)`, and navigates to the stash.

### Supabase integration

`src/lib/supabase.ts` exports only the client. Each hook defines its own inline `fromDb` mappers for snake_case → camelCase conversion. All auth is Google OAuth managed by `AuthContext`.

### Permissions enforced in UI

- Any stash member: add sodas, edit any soda's name/brand, remove any soda, add/update their own rating
- Owner only: rename stash, delete stash, remove members (enforced both in UI and via RLS)
- Members can only delete their own ratings (RTG-05)

### Build notes

`scripts/generate-icons.mjs` runs first during `npm run build` to convert `public/favicon.svg` → PNG formats for Safari. This uses Node's `sharp` package.

ESLint uses the flat config format (ESLint 9), configured in `eslint.config.js`.
