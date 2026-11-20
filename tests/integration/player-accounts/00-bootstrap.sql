-- Iron League / LOCAL ONLY. Mock the smallest required Supabase Auth surface.
-- Executed only in a fresh il_smoke_* database by run-local-tests.ps1.
DO $$
BEGIN
  IF current_database() NOT LIKE 'il_smoke_%' THEN
    RAISE EXCEPTION 'STOP: not an ephemeral Iron League smoke database';
  END IF;
  IF current_setting('port') <> '55432'
     OR current_setting('listen_addresses') <> '127.0.0.1'
     OR current_setting('data_directory') NOT LIKE '%17-IronLeagueTest/data' THEN
    RAISE EXCEPTION 'STOP: wrong local PostgreSQL cluster';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE TABLE auth.identities (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_id text NOT NULL
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

-- These are fake local users only, not actual Supabase Auth accounts.
INSERT INTO auth.users (id) VALUES
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333'),
  ('44444444-4444-4444-8444-444444444444'),
  ('55555555-5555-4555-8555-555555555555');
INSERT INTO auth.identities (user_id, provider, provider_id) VALUES
  ('11111111-1111-4111-8111-111111111111', 'discord', '123456789012345678'),
  ('22222222-2222-4222-8222-222222222222', 'discord', '223456789012345678'),
  ('33333333-3333-4333-8333-333333333333', 'discord', '323456789012345678'),
  ('44444444-4444-4444-8444-444444444444', 'discord', '423456789012345678'),
  ('55555555-5555-4555-8555-555555555555', 'discord', '523456789012345678');
\echo PASS: isolated mock Supabase Auth bootstrap
