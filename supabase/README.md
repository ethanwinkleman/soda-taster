# Database

Schema lives in `migrations/`, applied in filename order. There is no `schema.sql` any
more — it was a single hand-maintained file with no record of what had been applied to
which project, which is how a `profiles` table the app queried went missing from it
entirely, and how two ordering bugs shipped.

## A new project

```bash
supabase link --project-ref <ref>
supabase db push
```

Or, without the CLI, paste each file from `migrations/` into the SQL editor **in filename
order**. Order matters — see below.

## An existing project

Every migration is written to be safe to re-apply, so you can simply run them all; the
statements that would collide are guarded. Nothing is dropped and no data is touched.

If you would rather have the CLI treat the existing state as already applied:

```bash
supabase migration list                      # see what the CLI thinks is applied
supabase migration repair --status applied <version>
```

## Adding a migration

```bash
supabase migration new add_widget_flag
```

Then, before pushing:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  ../scripts/verify-migrations.sh
```

That applies every migration to a throwaway database twice. It is not decorative — both
failure modes below have actually shipped, and both are caught by it.

### Order matters

Postgres validates a policy expression and a `LANGUAGE sql` function body at `CREATE`
time, not on first use. A migration that references something defined later fails
immediately on a fresh database, while passing silently on your own machine where the
object already exists.

Two live examples, both fixed:

- `is_stash_member()` was defined *after* the `stashes` policies that call it, so a
  first-ever run died on the very first `CREATE POLICY`.
- `get_public_ratings()` reads `profiles.is_public`, but the `profiles` block sat at the
  end of the file, after that function.

### Re-application matters

Postgres has no `CREATE POLICY IF NOT EXISTS`. Every policy is therefore written as:

```sql
DROP POLICY IF EXISTS "members_view_activity" ON stash_activity;
CREATE POLICY "members_view_activity" ON stash_activity FOR SELECT
  USING (is_stash_member(stash_id));
```

Tables use `CREATE TABLE IF NOT EXISTS`, columns `ADD COLUMN IF NOT EXISTS`, functions
`CREATE OR REPLACE`, indexes `CREATE INDEX IF NOT EXISTS`, and the storage bucket
`ON CONFLICT DO NOTHING`.

### RLS helpers are SECURITY DEFINER on purpose

`is_stash_member` and `shares_stash_with` are `SECURITY DEFINER` so a policy can read the
table it protects without recursing into its own RLS. Reuse that pattern rather than
inlining a subquery into a policy.
