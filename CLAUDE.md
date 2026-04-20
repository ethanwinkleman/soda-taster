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

## Architecture

**Stack:** React 19 + TypeScript + Vite + TailwindCSS v4 + Supabase (auth, DB, realtime) + React Router v7 + Framer Motion.

**Environment:** Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### Data scoping: personal vs. shared

The app has two parallel feature sets that mirror each other:

- **Personal** (`/sodas`, `/favorites`, `/fridges`, `/insights`) — scoped to the current user's Supabase auth ID.
- **Group/shared** (`/groups/:id`, `/shared/:groupId/*`) — scoped to a group; multiple members rate the same soda independently.

Group sodas (`GroupSoda`) and personal sodas (`SodaEntry`) are separate entities stored in separate tables, linked only by concept. A soda must be added to a group explicitly via `GroupAddSodaPage`.

### Data flow

```
Supabase DB
  → Custom hooks (src/hooks/) — own all fetch/CRUD logic and return { data, loading, error, mutators }
    → Pages (src/pages/) — consume hooks, handle navigation and layout
      → Components (src/components/) — presentational, receive props only
```

Each hook corresponds to a table/feature:
- `useSodas` — personal ratings
- `useGroups` / `useGroupSodas` / `useGroupInventory` — shared stash
- `useInventory` — personal fridge
- `useProfile` — user display name, username, public/private toggle

No global state manager (no Redux/Zustand). State lives in hooks; hooks are called at the page/app level and props are drilled down.

### Supabase integration

`src/lib/supabase.ts` exports the Supabase client and `fromDb`/`toDb` mapper functions that translate between snake_case DB columns and camelCase TypeScript types. All hooks import from here. Auth is Google OAuth managed by `AuthContext` (`src/contexts/AuthContext.tsx`).

### Routing & layout

`App.tsx` wraps everything in `BrowserRouter` + `AuthProvider`. Public routes (`/u/:username`, `/join/:code`) are outside `<AuthGate>`. All other routes require a session.

The shell layout (sidebar on desktop, `BottomNav` on mobile) is rendered inside the authenticated section. Page transitions use `framer-motion` keyed on the current pathname.

### Scoring

Overall score = Taste × 0.35 + Aftertaste × 0.25 + Carbonation × 0.20 + Sweetness × 0.15 + Packaging × 0.05. Defined in `src/utils/labels.ts:calculateOverallScore`.

### Build notes

`scripts/generate-icons.mjs` runs first during `npm run build` to convert `public/favicon.svg` → PNG formats needed for Safari. This is a Node script using `sharp`.

The ESLint config (`eslint.config.js`) uses flat config format (ESLint 9).
