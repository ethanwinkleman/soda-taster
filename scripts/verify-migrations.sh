#!/usr/bin/env bash
#
# Applies every migration in order against a throwaway database, twice.
#
# The first pass catches ordering bugs: Postgres validates policy expressions and
# LANGUAGE sql function bodies at CREATE time, so a migration that references something
# defined later fails immediately. Both such bugs have shipped here before.
#
# The second pass catches non-idempotent statements. CREATE POLICY has no IF NOT EXISTS,
# so every policy needs a DROP first — otherwise the migrations cannot be re-applied and
# cannot safely be baselined onto a project that already has the objects.
#
# The third pass calls the SECURITY DEFINER RPCs. A plpgsql body is not checked against
# its own RETURNS TABLE declaration until it runs, so a column typed TEXT that selects
# auth.users.email (varchar) creates cleanly and fails only in the app. It also asserts
# that a non-admin caller is refused, since that check is the security boundary.
#
# The fourth pass exercises the storage policies as an ordinary `authenticated` role.
# Photo objects live at `{stash_id}/{soda_id}`, so the policies have to read the path;
# a check that only asks whether the caller is signed in lets anyone overwrite anyone
# else's photo, which is what shipped. Policies are not enforced for the table owner, so
# this has to SET ROLE — asserting as the migrating superuser proves nothing.
#
# Usage:
#   DATABASE_URL=postgresql://user:pass@localhost:5432/postgres ./scripts/verify-migrations.sh
#
# Any throwaway Postgres will do — `supabase start`, a docker container, or a local
# install. The script creates and drops its own database and never touches yours.

set -euo pipefail

: "${DATABASE_URL:?set DATABASE_URL to a Postgres you do not mind connecting to}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"
TEST_DB="soda_taster_migration_check"
ADMIN_URL="$DATABASE_URL"

# Swap only the database name, leaving any query string intact — socket-style URLs put
# host=/var/run/postgresql in the query, and naive trimming eats it.
url_base="${DATABASE_URL%%\?*}"
url_query=""
[ "$url_base" != "$DATABASE_URL" ] && url_query="?${DATABASE_URL#*\?}"
TEST_URL="${url_base%/*}/$TEST_DB$url_query"

STUBS=$(cat <<'SQL'
-- Supabase provides these; stand them up so plain Postgres can run the migrations.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
-- Column types matter as much as the columns: email is CHARACTER VARYING(255) on a
-- real project, and a function declaring it TEXT fails at call time, not CREATE time.
CREATE TABLE IF NOT EXISTS auth.users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              CHARACTER VARYING(255),
  created_at         TIMESTAMPTZ DEFAULT now(),
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS
  $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
-- file_size_limit and allowed_mime_types exist on a real project and a migration sets
-- them; without them here the UPDATE that applies the caps would fail unnoticed.
CREATE TABLE IF NOT EXISTS storage.buckets (
  id TEXT PRIMARY KEY, name TEXT, public BOOLEAN DEFAULT false,
  file_size_limit BIGINT, allowed_mime_types TEXT[]
);
CREATE TABLE IF NOT EXISTS storage.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT REFERENCES storage.buckets(id),
  name TEXT
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- Supabase's role for a signed-in caller. Pass 4 becomes this role, because RLS is not
-- applied to the owner of a table.
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
SQL
)

cleanup() {
  psql -q "$ADMIN_URL" -c "DROP DATABASE IF EXISTS $TEST_DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "→ creating $TEST_DB"
cleanup
psql -q "$ADMIN_URL" -c "CREATE DATABASE $TEST_DB" >/dev/null
echo "$STUBS" | psql -q -v ON_ERROR_STOP=1 "$TEST_URL" >/dev/null

apply_all() {
  local pass="$1" failed=0
  for f in "$MIGRATIONS"/*.sql; do
    # NOTICEs are expected — they are what IF NOT EXISTS emits. Only ERRORs matter.
    if err=$(psql -q -v ON_ERROR_STOP=1 "$TEST_URL" -f "$f" 2>&1 | grep -E "ERROR" || true); [ -n "$err" ]; then
      echo "  ✗ $(basename "$f")"
      echo "$err" | sed 's/^/      /'
      failed=1
    fi
  done
  if [ "$failed" -ne 0 ]; then
    echo "✗ pass $pass failed"
    exit 1
  fi
  echo "  ✓ pass $pass: $(ls "$MIGRATIONS"/*.sql | wc -l | tr -d ' ') migrations, no errors"
}

echo "→ pass 1: fresh database (catches ordering bugs)"
apply_all 1
echo "→ pass 2: re-applied (catches non-idempotent statements)"
apply_all 2

ADMIN_ID="11111111-1111-1111-1111-111111111111"
OTHER_ID="22222222-2222-2222-2222-222222222222"

echo "→ pass 3: calling the RPCs (catches result types and the admin gate)"

psql -q -v ON_ERROR_STOP=1 "$TEST_URL" >/dev/null <<SQL
INSERT INTO auth.users (id, email) VALUES ('$ADMIN_ID', 'admin@example.test')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, email) VALUES ('$OTHER_ID', 'member@example.test')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO app_admins (user_id) VALUES ('$ADMIN_ID') ON CONFLICT (user_id) DO NOTHING;
SQL

rpc_failed=0
for call in \
  "admin_summary_metrics()" \
  "admin_daily_metrics(30, 'UTC')" \
  "admin_top_sodas(10)" \
  "admin_user_activity(25)" \
  "admin_recent_errors(7, 20)"
do
  if err=$(psql -q -v ON_ERROR_STOP=1 -At "$TEST_URL" \
      -c "SET request.jwt.claim.sub = '$ADMIN_ID'" \
      -c "SELECT * FROM $call" 2>&1 | grep -E "ERROR|DETAIL" || true); [ -n "$err" ]; then
    echo "  ✗ $call"
    echo "$err" | sed 's/^/      /'
    rpc_failed=1
  else
    echo "  ✓ $call"
  fi
done

# The gate is the whole reason these functions are SECURITY DEFINER — an ordinary caller
# must be refused, not merely shown less.
for call in "admin_summary_metrics()" "admin_user_activity(25)" "admin_recent_errors(7, 20)"; do
  refused=$(psql -q -At "$TEST_URL" \
    -c "SET request.jwt.claim.sub = '$OTHER_ID'" \
    -c "SELECT * FROM $call" 2>&1 | grep -c "admin only" || true)
  if [ "$refused" -eq 0 ]; then
    echo "  ✗ $call did NOT refuse a non-admin caller"
    rpc_failed=1
  else
    echo "  ✓ $call refuses a non-admin"
  fi
done

if [ "$rpc_failed" -ne 0 ]; then
  echo "✗ pass 3 failed"
  exit 1
fi

echo "→ pass 4: storage policies as an ordinary authenticated role"

MEMBER_ID="33333333-3333-3333-3333-333333333333"
OUTSIDER_ID="44444444-4444-4444-4444-444444444444"
STASH_ID="55555555-5555-5555-5555-555555555555"

psql -q -v ON_ERROR_STOP=1 "$TEST_URL" >/dev/null <<SQL
INSERT INTO auth.users (id, email) VALUES ('$MEMBER_ID', 'member2@example.test')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, email) VALUES ('$OUTSIDER_ID', 'outsider@example.test')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO stashes (id, name, owner_id, join_code)
  VALUES ('$STASH_ID', 'Photos', '$MEMBER_ID', 'PHOTO1') ON CONFLICT (id) DO NOTHING;
INSERT INTO stash_members (stash_id, user_id) VALUES ('$STASH_ID', '$MEMBER_ID')
  ON CONFLICT (stash_id, user_id) DO NOTHING;
GRANT USAGE ON SCHEMA public, storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
SQL

storage_failed=0

MINE="$STASH_ID/mine.jpg"

# Runs one statement as `authenticated` with the given subject.
as_user() {
  psql -q -At "$TEST_URL" \
    -c "SET request.jwt.claim.sub = '$1'" \
    -c "SET request.jwt.claim.role = 'authenticated'" \
    -c "SET ROLE authenticated" \
    -c "$2" 2>&1 || true
}

# Row state, read back as the owner. A denied UPDATE or DELETE is a *no-op*, not an
# error — asserting on the error text alone passes whether or not the policy holds.
objects_at() { psql -q -At "$TEST_URL" -c "SELECT count(*) FROM storage.objects WHERE name = '$1'"; }

expect_objects() {
  local label="$1" path="$2" want="$3" out="$4" got
  got=$(objects_at "$path")
  if [ "$got" != "$want" ]; then
    echo "  ✗ $label — expected $want object(s) at $path, found $got"
    [ -n "$out" ] && echo "$out" | sed 's/^/      /'
    storage_failed=1
  else
    echo "  ✓ $label"
  fi
}

out=$(as_user "$MEMBER_ID" "INSERT INTO storage.objects (bucket_id, name) VALUES ('soda-images', '$MINE')")
expect_objects "a member uploads into their own collection" "$MINE" 1 "$out"

out=$(as_user "$OUTSIDER_ID" "INSERT INTO storage.objects (bucket_id, name) VALUES ('soda-images', '$STASH_ID/theirs.jpg')")
expect_objects "a non-member cannot upload into it" "$STASH_ID/theirs.jpg" 0 "$out"

# What `upsert: true` meant under the old policy: replacing a photo that is not yours.
out=$(as_user "$OUTSIDER_ID" "UPDATE storage.objects SET bucket_id = 'soda-images' WHERE name = '$MINE'")
expect_objects "a non-member cannot overwrite an existing photo" "$MINE" 1 "$out"

out=$(as_user "$OUTSIDER_ID" "DELETE FROM storage.objects WHERE name = '$MINE'")
expect_objects "a non-member cannot delete one" "$MINE" 1 "$out"

# A path whose first segment is not a uuid must be denied, not raise a cast error.
malformed=$(as_user "$MEMBER_ID" "INSERT INTO storage.objects (bucket_id, name) VALUES ('soda-images', 'not-a-uuid/x.jpg')")
if echo "$malformed" | grep -q "invalid input syntax"; then
  echo "  ✗ a malformed path raised a cast error instead of being denied"
  echo "$malformed" | sed 's/^/      /'
  storage_failed=1
else
  expect_objects "a malformed path is denied" "not-a-uuid/x.jpg" 0 "$malformed"
fi

caps=$(psql -At "$TEST_URL" -c "SELECT coalesce(file_size_limit::text,'none') || ' / ' || coalesce(array_length(allowed_mime_types,1)::text,'none') FROM storage.buckets WHERE id='soda-images'")
if [ "${caps%% *}" = "none" ] || [ "${caps##* }" = "none" ]; then
  echo "  ✗ the bucket carries no size limit or mime allow-list ($caps)"
  storage_failed=1
else
  echo "  ✓ bucket caps applied (bytes / mime types: $caps)"
fi

if [ "$storage_failed" -ne 0 ]; then
  echo "✗ pass 4 failed"
  exit 1
fi

echo
psql -At "$TEST_URL" -c "SELECT 'tables:   ' || count(*) FROM pg_tables WHERE schemaname='public'"
psql -At "$TEST_URL" -c "SELECT 'policies: ' || count(*) FROM pg_policies WHERE schemaname IN ('public','storage')"
psql -At "$TEST_URL" -c "SELECT 'functions:' || count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace"
echo
echo "✓ migrations are ordered, re-appliable, their RPCs run and refuse non-admins,"
echo "  and photo uploads are confined to the collection that owns them"
