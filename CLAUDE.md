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

Three constraints, all of which have caused real bugs, so **run `scripts/verify-migrations.sh` before pushing schema changes**. It applies every migration to a throwaway database twice, calls the admin RPCs as both an admin and an ordinary user, then exercises the storage policies as an ordinary `authenticated` role:

- **Order matters.** Postgres validates a policy expression and a `LANGUAGE sql` function body at `CREATE` time, so a migration must come *after* whatever it references — and it fails only on a *fresh* database, passing silently wherever the object already exists. `is_stash_member` was once defined after the policies calling it, and `profiles` after the RPC reading it.
- **Migrations must be re-appliable.** There is no `CREATE POLICY IF NOT EXISTS`, so every policy is preceded by `DROP POLICY IF EXISTS`. Without that they cannot be safely applied to an existing project.
- **A plpgsql body is not checked until it runs.** `RETURNS TABLE (... user_email TEXT)` selecting `auth.users.email` creates without complaint and then fails in the app with *structure of query does not match function result type* — `email` is `CHARACTER VARYING(255)`, and plpgsql wants an exact match. Cast at the SELECT (`u.email::text`). The script's third pass calls each RPC for this reason, and its `auth.users` stub mirrors the real column types, because a stub typed `TEXT` hides the bug completely.

**A storage policy has to read the path, because the path is the only thing naming an owner.** Photos live at `{stash_id}/{soda_id}` in the public `soda-images` bucket, and the original policies asked only `auth.role() = 'authenticated'` — so any signed-in user could write into any collection's folder, and the app uploads with `upsert: true`. Proven as an unprivileged role against the shipped policy: an outsider's `INSERT` into a stash they had never joined **succeeded**. `20260101002200` scopes all three policies with `is_stash_member(soda_image_stash(name))`, and pass 4 of the verifier asserts a member can write, a non-member cannot write, overwrite or delete, and a malformed path is denied rather than raising a cast error. A bare `::uuid` inside a policy *raises* on a malformed name instead of denying it, and Postgres does not promise to evaluate a guarding `AND` first — hence the helper that parses to NULL.

Two things that pass only look right: RLS is not applied to the owner of a table, so asserting as the migrating superuser proves nothing — the pass has to `SET ROLE`. And a denied `UPDATE` or `DELETE` is a **no-op, not an error**, so a check that greps the error text passes whether or not the policy holds; assert on the rows afterwards.

**The bucket is private, and reading is a policy too.** It was public, which is not the same as unguessable: paths are uuids so nothing could be enumerated, but any URL that ever left a member's browser worked for anyone, forever, with no session. `20260101002300` sets `public = false` and adds the SELECT policy — there was none, because a public bucket serves reads without consulting one. Pass 4 asserts a member can read their collection's object, a non-member reads zero, and the bucket is private, because a policy on a public bucket proves nothing.

**Limits belong on the bucket as well as the picker.** `file_size_limit` and `allowed_mime_types` are set in the same migration and mirrored in `lib/imageUpload.ts`. The client half exists to produce a message that names the file; the bucket is the half that holds, because the anon key ships in the bundle. `heic`/`heif` are on the allow-list deliberately: iOS hands one through when a photo is picked from Files rather than Photos, and that upload works today.

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

**Blind rating is enforced by the database, not by the renderer.** `members_view_ratings` hands back your own rating always, and everyone else's only once you have filed yours for that soda (`20260101002000`). Before that, `select('*')` sent every score in the collection and the UI simply declined to draw the sealed ones — so the group verdict was in the network tab, and readable directly with the anon key that ships in the bundle. Proven as an unprivileged role: a member who has not rated reads **0 rows** for that soda and gets `others=WITHHELD, avg=WITHHELD` from the list RPC, then sees `{4.5,2.0}` and the average the moment they rate.

The count is deliberately still visible while blind — "2 ratings hidden" says there is something to be spoiled without saying what. It comes from `soda_rating_count`, a SECURITY DEFINER helper, because a plain `count(*)` under the tightened policy would count only the rows you may read.

**The collection list carries scores, not rating rows.** `stash_soda_list` returns one row per soda — `other_scores numeric[]`, `avg_score`, `rating_count`, your own rating — instead of every rating row with its uuid, rater name, notes and timestamps. Measured on realistic shapes: 200 sodas × 3 raters goes 203 KB → 95 KB (53% smaller), × 6 raters 340 KB → 96 KB (72%). The two places that name people — the detail page's breakdown and the share card — fetch ratings for the one soda they are showing (`useSodaRatings`), and the export fetches the collection's ratings when you press it (`fetchVisibleRatings`). All three come back already sealed by the policy, so there is one rule rather than a client copy of it.

### Organised by how often each thing is actually done

Four jobs, at wildly different frequencies:

| Job | How often | Where it lives |
| --- | --- | --- |
| Rate a soda now · "have we had this?" | constantly | `/stats` — `RateActions`, at the top |
| Check your ratings | sometimes | `/stats` — `StatsPage`, below the actions |
| Create, join, manage a collection | rarely | `/` — `StashesPage`, `/stash/:id` |

**The two frequent jobs are the same interaction.** You type a name; either it comes back with a score against it — *"You 5 · Dana 3.5"*, which is the answer to "have we had this?" — or it does not, and the next line offers to add it. One box, no collection to pick first. That search runs **across every collection**: scoping it would put a step in front of the only two things anyone does often.

Rating happens **inline in the search result**: the row expands, you set the stars, and the reveal (`lib/reveal.ts`) appears in the same row. Opening a page to rate puts a navigation on the most frequent action in the app.

**The summary tiles sit inside the actions block, above the waiting list.** The list is five rows deep, so underneath it "Your numbers" was off the bottom of every phone — measured at 390×844 the heading is at 255px now, where it was below the fold. The chart and the palate stay below the list: those are what you look at once the summary has told you whether it is worth it. The tiles are passed into `RateActions` as a `numbers` prop and drawn only when the search box is empty, because between the box and its results they would be pushing the answer you just asked for down the screen.

**Those actions are a section, not a screen.** They had a tab of their own (`SodasPage` at `/`), and the third pass at this failed the same way as the first two — a screen whose only content is a search box and a shortlist of unrated sodas is, for a household that has rated everything, a screen with nothing on it. `RateActions` is now the top of `/stats`, which is where looking a past rating up already belonged: what you do, then how you are doing. Collections took `/` and the first tab, because owning the shelf is the thing that exists before any of this.

**`useTasteSodas` does not re-implement blind rating.** A plain read of `stash_soda_ratings` returns your own rows always and everyone else's only for sodas you have already rated (`20260101002000`) — exactly the set where showing them is right. No RPC, and no client copy of the rule. It deliberately selects only `soda_id, user_id, display_name, score`: this runs on every search.

Two earlier passes at this did not land, and both failed the same way: they **added** a surface instead of reorganising. A dashboard of lists is still lists, and a new front door on top of an unchanged collection page just made the app bigger. What fixed it was moving things *off* the busy screen — the rating spread and the score tiles were sitting between the filters and the first soda on `/stash/:id`, so the rare job owned the top of the most-used page. The chart moved to `/stats`; the tiles moved below the list, because they are also the way into the inventory and top-rated sheets and deleting them would have cost real functionality.

**Adding a soda has one mode.** `AddSodaPage` used to open in Quick Add, which hid the manufacturer and the photo and turned the submit button into "Add & Next" so you stayed on the form. Full Details is now the only path: the form always shows name, manufacturer, photo and rating, and saving returns to the collection. The branches it removed — `quickMode ? '' : brand`, `quickMode ? null : imageFile` — existed to avoid saving fields the user could not currently see, and with nothing hidden there is nothing to guard.

**A full-width bar does not read as a button.** The collection page's primary action was `w-full` at `text-xs`, which is 12px of tracked-out uppercase across the whole viewport — a banner. It is `size="lg"` now (165×51 at 15px), sized rather than stretched. `Button`'s default `sm` also went from `text-xs` to 13px: the same 12px was on every button in the app.

It sits **in the actions row, to the right of the Group/Mine toggle**, rather than centred on its own line where it read as a section rather than a control. Two things that row has to get right: it renders whether or not the toggle does — the toggle only appears once more than one person has rated, and the primary action cannot come and go with it — and the toggle is `flex-1 min-w-0` so the fixed-width button keeps its size. Measured at 320: toggle 115px, button 165×51, right edge at 304 of 320.

**The back control is one component, `ui/BackButton`.** It was in five places at four different sizes: 44px with no visible edge (`PageHeader`), 32px with an invisible 44 around it (the collection and soda pages), 32px with nothing (`BarcodeResultPage`) and 38px (`BarcodeScanPage`). It is now 44px **visible** and 56px hittable everywhere, with the standard surface — white, hairline border, soft shadow — because a target whose edges you cannot see does not read as a target, which is the same reason the add button stopped being a full-width bar. The extra hit area reaches into the page margin and the title beside it, neither of which is interactive, so it costs nothing; `-ml-2` keeps the chevron optically where the smaller button put it so no page title shifts.

**Every tab needs a desktop twin in the `Sidebar`.** `BottomNav` is `md:hidden`, so a destination that lives only there is unreachable above 768px — and `/stats` was exactly that, which stopped being cosmetic the moment it became the page holding every action in the app. The sidebar's `Ratings` link is the twin; the admin link in the sidebar footer exists for the identical reason (`UserMenu` is `md:hidden` too). The check is not "does the route render at 1440" but "can a desktop user *reach* it without typing the URL": enumerate the visible `a[href]` on a desktop viewport and look for the route.

**The bottom nav is two tabs — Collections, then Ratings — and three is the ceiling.** It was three until the Sodas screen folded into `/stats`. A fourth was tried once, inside a collection, and it overflowed the bar by **83px at 320 and 13px at 390**. Anything added here needs the overflow sweep run again; the bar is `fixed`, so a tab past the edge is invisible rather than scrollable.

### The collections page is the shelf

`StashesPage` (at `/`, with `/collections` redirecting to it so the old URL in anyone's history still lands) is **Your Collections → Your Palate → Recently Tasted**: what you own, then who you are, then what the group did.

It briefly carried two "what now" panels above the list — *Waiting on you* (sodas the group has scored and you have not, which rating unseals) and *In your fridge* — split out of one `home_untasted` read by `lib/homeFeed.ts`. They are gone, along with that module and `UntastedSection`. The ratings tab's waiting list is the **same read, unsplit**, so it is a strict superset of both, and two screens asking for the same thing is worse than one — the same reason onboarding never appears beside an empty state making the same request. Collections is the repo; the actions live under Ratings.

`home_untasted` (`20260101002400`) itself still earns its place: it returns every unrated soda across all of the viewer's collections in one call, rather than a round trip per collection.

- **It returns no score column at all.** Every soda in it is unrated by the viewer and therefore sealed by definition; sending a number would reopen what `20260101002000` closed. Pass 5 of the verifier asserts the signature has no score column, that a member sees their own collections' unrated sodas with the other raters' *count*, that a soda drops off once they rate it, and that a non-member sees nothing.
- **The count comes from `soda_rating_count`**, not `count(*)`: under the blind-rating policy a plain count sees only rows the caller may read, which here is none of them.

**The verifier's `authenticated` role needs usage on the `auth` schema.** Every policy of the form `user_id = auth.uid()` is evaluated as the *calling* role, so without that grant a signed-in caller cannot read its own rows. Supabase grants it; the stub did not, which did not make the tests stricter — it limited passes 4 and 5 to whatever happened to run SECURITY DEFINER, and `home_untasted` failed outright on a database that does not exist.

### Untasted sodas

A soda can be added without a rating — `AddSodaPage` sends `score > 0 ? score : null`, so no rating row is created. It is not a blind soda: `isRevealed` is true at `ratingCount === 0` because there is nothing being withheld, so the card simply draws a dashed em-dash and "0 ratings". Sorting already handles them deliberately (`-1` under "highest rated", `999` under "lowest", so they sink to the bottom either way rather than reading as a 0.5), and the shopping list and the group metrics exclude them.

What was missing was any way to *ask* for them. **Try Next** (`lib/untasted.ts`) is the mirror of Restock: Restock is "rated 4+ and out of stock" — buy this again; Try Next is "you have not rated it" — try this next. Same chip, same banner, same place.

- **Untasted means *you* have not rated it, not that nobody has.** A soda the rest of the group has already scored is the one you most want to get to, and rating it is also what unseals their verdict. Filtering on `ratingCount === 0` would hide exactly those.
- **The two filters are mutually exclusive**, and each turns the other off. Restock needs a rating of 4+ and Try Next needs no rating, so together they can only ever return nothing.
- **The chip is only offered when something is untasted** (or while it is on, so it can be turned off from where it was turned on). A control that always returns nothing is worse than no control.
- Ordering is stock-first via `stockState`, not `inFridge` — a soda can sit in the fridge at quantity 0, and that is out, not something you can open.

**`StarRating` at `size="lg"` is fluid, and has to be.** Five glyphs at a fixed `text-6xl` plus the numeric readout wanted **389px**, and the card holding it offers 254–364px on every common phone — so the score was clipped off the right edge of the screen on all of them, and only fitted at 430px. The size is `clamp(2rem, 11vw, 3.75rem)`: the upper bound keeps the original size once there is room, because the container stops at `max-w-md` and a bare `vw` would keep growing past it on a desktop. The row is `flex-1 min-w-0 justify-between` with the readout `shrink-0`, so spare space goes to the gaps and nothing can be pushed past the edge. Both `SodaDetailPage` and `AddSodaPage` use that size, so one fix covers both.

**The filter row wraps, and has to.** It sits inside `overflow-x-hidden` (the shell in `App.tsx`), so a control past the right edge is not scrolled to — it is invisible, at every width. Adding Try Next as a fourth control pushed it off-screen on every phone *and* on the 420px I had checked at. Anything added to that row wraps or it disappears.

**Sweeping for mobile overflow.** The shell is `overflow-x-hidden`, so anything past the right edge is invisible rather than scrollable — it will never show up as a page that scrolls sideways. The way to find it is to drive the *real* app (only `lib/supabase.ts` and `contexts/AuthContext.tsx` stubbed, so the real `index.html`, router, header and bottom nav are exercised) across every route at 320/375/390 and measure each element's box against the viewport.

Three things make that sweep worth trusting:

- **Fixtures need an unbroken token**, not just a long phrase. A long phrase wraps; `Henryweinhardscraftbeveragecompanyincorporated` and a bare URL are what actually break a layout, and a fixture full of spaces never exercises it.
- **Skip anything inside a horizontally scrollable ancestor.** `/admin`'s table is `min-w-[26rem]` inside `overflow-x-auto` on purpose, and reporting it is a false positive.
- **Skip the parked share card.** `ShareCardButton` keeps a `TastingCard` at `left:-9999px` so html2canvas can rasterise it; that is parked, not clipped.
- **Ask *what* is clipping it.** Everything is clipped, because the shell is `overflow-x-hidden` — so the test is whether the nearest clipping ancestor ends inside the page or at the viewport edge. A `truncate` parent ending inside the page is a designed ellipsis; the shell clipping at the edge is the bug, because there is nothing to scroll to. Without that distinction every `·` inside a truncated line is a finding.
- **A box inside the viewport can still paint its text outside it.** `getBoundingClientRect` returns the box, not the glyphs, so an unbroken token in a non-truncating element reports clean while running off the screen — which is exactly what the unbroken-token fixture exists to produce. `scrollWidth > clientWidth` is what sees it, and the collection title was failing this at every width.

Two things the stub has to be honest about, both of which hid a section rather than breaking one:

- **A component that hides itself needs fixtures past its threshold.** `TasteProfile` returns `null` below five of *your own* ratings, so a fixture with three makes "Your Palate" simply absent — which looks exactly like having deleted it.
- **supabase-js resolves embedded relations in the select string.** `useMyRatings` asks for `score, stash_sodas(name, brand)`; a stub that ignores the select argument hands back rows with no names, and the generated profile comes out empty.

Modals and sheets need opening — none of them is a route, and `/stash/:id` alone leaves Settings, Inventory, Top Rated and the shopping list unmeasured.

**Tap targets use `.tap-44`, not padding.** Measured on a phone, the icon buttons were 20x20 (change photo), 26x26 (edit soda, refresh, delete comment) and 30x30 (the collection menu) — the smallest genuinely hard to land on. The utility in `index.css` centres an invisible pseudo-element of at least 44px over the control, so it grows only the dimension that is short and moves nothing. Padding plus a negative margin does the same thing, but the amount differs per icon and a large negative margin starts stealing taps from the control next to it.

Two deliberate exceptions, both because widening would make things worse: the ten `RatingDistribution` bars are adjacent segments 26px wide, and expanding them to 44 would overlap their neighbours so a tap lands on the wrong bucket; and a native `<select>` ignores `::after`, which is moot because tapping one opens the platform picker.

**A bare text node inside a `flex` element is an anonymous flex item at `min-width: auto`**, whose minimum is the widest unbroken word — so `break-words` on the flex container never gets the chance to break anything. The collection title needed the name wrapped in its own `<span className="min-w-0 break-words">`; the class on the `h1` alone did nothing, and the sweep said so.

**A pseudo-element hit area is invisible to `getBoundingClientRect`.** Measuring tap targets by their box says nothing about `.tap-44`; ask `document.elementFromPoint` how far from the centre a tap still lands on the control. Scroll each one to the middle of the viewport first — `elementFromPoint` returns null outside the viewport, which reads as a 0x0 target and is not a finding.

**Driving an element is not the same as seeing it.** Playwright's `click()` scrolls an off-screen element into view first, so the chip passed every functional check while being invisible to a person. A control's verification needs its box measured against the viewport, not just a successful click.

### Photos

A soda photo is downscaled before it is sent: 1200px on the longest edge, JPEG at 0.82. The app draws these at 36–48px in a list and ~150px on the detail page, and the biggest use is the share card; a 12MP phone photo uploaded whole is several megabytes to render a thumbnail. Quick Add is built for tasting events, which is where the connection is worst, so this is the upload that least wants them.

**The resize happens at the two calls that reach storage — `updateSodaImage` and `uploadHeldImage` — not at the picker.** Those two are the only ways a file gets to the bucket, so covering them covers every path, including a write that was queued offline and resumes in a later session. `lib/imageResize.ts` holds the canvas; the decisions (`fitWithin`, `needsReencode`) are pure and live in `lib/imageUpload.ts` with the tests.

Three things it has to get right:

- **An image already small enough is left exactly as it is.** Re-encoding a small PNG costs quality for no saving and flattens transparency onto black. Measured: a 6 KB flat PNG comes back as the same `File` object.
- **heic is always re-encoded**, whatever its size — iOS hands one through from the Files picker and nothing outside Apple draws one, so JPEG is what makes it displayable at all.
- **A decode failure is not automatically a rejection.** A JPEG the browser could not decode falls back to uploading the original, since it may still render elsewhere; a heic that could not be decoded is rejected, because the app could never have shown it. Both paths verified in a browser.

`fitWithin` rounds rather than floors: flooring a 10000×1 image gives a zero-height canvas, which draws nothing.

**Photos are rendered through signed URLs, and what the row stores is the object path.** A signed URL expires, so persisting one would rot; `storageObjectPath` reads a path back out of whatever `image_url` holds, which is three live shapes — a bare path (what uploads write now), a full public URL (rows written before the bucket was private, so no data migration was needed), and an external URL from a barcode lookup, which is not ours and is rendered exactly as it stands. Signing happens once in `loadSodas` via `createSignedUrls`, so a whole collection is one round trip, and a photo that fails to sign becomes null rather than failing the query — a missing thumbnail beats a collection that will not load.

The TTL is **seven days**, deliberately long. A signed URL cannot be minted offline and the persisted query cache lasts 24 hours, so a one-hour token would render every photo broken on a collection opened from a cold cache without a connection.

**Replacing a photo writes a new object**, named `{stash_id}/{soda_id}-{uploaded_at}.jpg`. Two things depend on that. The service worker matches these `ignoreSearch: true` — it has to, because a signed URL's token changes on every signing and keying by full URL would mean 200 entries of churn and never a cache hit — and with the query ignored, an overwrite at the same path would be invisible to every cache holding the old one, including other members'. The path stays flat under the collection folder: the first segment is what the storage policies read, and what the collection sweep lists.

**Deleting a soda deletes its object too**, and deleting a collection clears its whole folder (its sodas go by cascade, which would otherwise strand every photo at once). Both are best effort and both run *after* the row is gone, in their own `try`: the delete has already succeeded, so a storage hiccup must not roll the list back or report a failure. The collection sweep re-lists from offset 0 each pass, because each pass deletes what it listed and advancing the offset would step over what moved up.

### Long lists

The collection page reveals sodas ten at a time (`useInfiniteScroll`). The whole collection is already in memory — this is not pagination against the database, it is about not mounting several hundred `SodaCard`s at once on a phone.

**The sentinel is a button that an observer also watches, not an observer with a label.** Three ways it stopped dead, all reproduced in a browser against the real page:

- **An effect cannot re-run because a ref was filled.** The observer was attached in an effect that read `useRef`, so a sentinel mounting on a *later* render than the effect's last run was never observed — nothing in the dependency list changes when a node appears. Any render that hides the list while `total` is already known (a loading or empty branch) left the list frozen at the first ten, forever. The sentinel node is state now, so attaching it re-runs the effect.
- **IntersectionObserver reports crossings, not visibility.** After a page loads, a sentinel still on screen produces no second callback, so the list stops one page short of the end — permanently, on any viewport tall enough that the remaining rows do not push it out of view. Measured at 1280×2400: stuck at "20 of 22" with nowhere left to scroll. `visibleCount` is therefore a dependency, so each page re-observes and gets a fresh initial entry.
- **There was no non-scroll path at all.** Keyboard and screen-reader users could not reach past the first ten, and neither could anyone whose observer quietly stopped. Pressing the sentinel calls the same `loadMore`.

Reach for the same shape in any new incremental list: the observer is the nicety, the press is the guarantee.

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

**This has already been forgotten once, and it takes the app down rather than degrading it.** `stash_soda_list` changed `Soda` from `ratings[]` to `otherScores[]` + `ratingCount` without a bump, so the first load after the deploy rehydrated a soda written by the previous build and the charts spread an array that was not there: *Spread syntax requires ...iterable not be null or undefined*, and a blank collection page. The cache outlives the deploy — it is the one piece of state a release cannot migrate — so treat any change to a persisted shape as a `buster` change, and read the arrays defensively anyway, because a bump only takes effect once a client loads the new build.

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
/collections               → redirect to /     (the old URL; one canonical path)
/stats                     → StatsPage         (RateActions, then the numbers)
/stash/:id                 → StashPage         (soda list, settings/inventory/top-rated/shopping-list sheets)
/stash/:id/add             → AddSodaPage       (name, manufacturer, photo, rating)
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
