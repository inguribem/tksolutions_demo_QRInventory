-- ============================================================
-- Restore standard Supabase grants on the public schema.
--
-- These are normally set up automatically by the Supabase Postgres
-- image and are NOT something our own migrations were responsible
-- for — but a local stack that got restored from an older backup
-- (via `supabase stop` / `supabase start`) ended up missing them,
-- leaving anon/authenticated/service_role with no SELECT/INSERT/
-- UPDATE/DELETE at all on any table in public (RLS policies never
-- even got a chance to run). This migration re-applies them
-- explicitly so a fresh `db reset` or a restored backup can't lose
-- them again. Safe to re-run: GRANT and ALTER DEFAULT PRIVILEGES are
-- both idempotent.
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
