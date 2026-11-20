-- IRON LEAGUE | REVIEW ONLY. DO NOT EXECUTE WITHOUT EXPLICIT APPROVAL.
-- Future publicly readable profiles, separate from legacy data/players.ts identities.
-- No Discord IDs, auth.users IDs, or account secrets are stored in this public table.
-- New profiles MUST be inserted only by a future admin-only atomic approval RPC.
-- That RPC must check legacy IDs/nicknames, pending application, verified Discord identity,
-- unique auth ownership, and commit profile + link + request state in one transaction.
-- Existing player-discord link tables may be absent in Production. This SQL does not create them.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.player_profiles') IS NOT NULL THEN
    RAISE EXCEPTION 'public.player_profiles already exists. Stop and inspect before migrating.';
  END IF;
END
$$;

CREATE TABLE public.player_profiles (
  id text PRIMARY KEY
    CHECK (char_length(id) BETWEEN 3 AND 63 AND id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nickname text NOT NULL
    CHECK (char_length(nickname) BETWEEN 3 AND 32 AND nickname = btrim(nickname)),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Database-level case-insensitive uniqueness between new profiles only.
-- Legacy-name collision check is still REQUIRED in the future approval RPC.
CREATE UNIQUE INDEX player_profiles_nickname_ci_unique
  ON public.player_profiles ((lower(nickname)));

ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, nickname) ON public.player_profiles TO anon, authenticated;
GRANT ALL ON public.player_profiles TO service_role;

CREATE POLICY public_can_read_approved_player_profiles
  ON public.player_profiles FOR SELECT TO anon, authenticated USING (true);

-- Deliberately no INSERT, UPDATE or DELETE policy for browser users.
-- Future approval must NOT expose service_role or elevated writes to the browser.
COMMIT;

-- After separate approval and manual migration, verify:
-- SELECT tablename, policyname, roles, cmd FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'player_profiles';
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
--   WHERE table_schema = 'public' AND table_name = 'player_profiles';
