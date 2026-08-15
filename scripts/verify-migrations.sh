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
CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS
  $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
CREATE TABLE IF NOT EXISTS storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN DEFAULT false);
CREATE TABLE IF NOT EXISTS storage.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT REFERENCES storage.buckets(id),
  name TEXT
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
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

echo
psql -At "$TEST_URL" -c "SELECT 'tables:   ' || count(*) FROM pg_tables WHERE schemaname='public'"
psql -At "$TEST_URL" -c "SELECT 'policies: ' || count(*) FROM pg_policies WHERE schemaname IN ('public','storage')"
psql -At "$TEST_URL" -c "SELECT 'functions:' || count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace"
echo
echo "✓ migrations are ordered correctly and safe to re-apply"
