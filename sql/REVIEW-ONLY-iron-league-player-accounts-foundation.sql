-- IRON LEAGUE | REVIEW ONLY | COMBINED NEW-PLAYER FOUNDATION v5.2 | SERVER-ONLY REQUEST WRITES
-- DO NOT EXECUTE IN PRODUCTION UNTIL SEPARATELY AUTHORIZED AND REVIEWED.
-- Requires review of auth Before User Created hook, Discord provider, RLS grants and backup.
-- PRECONDITION: all 6 target tables and all 5 targeted functions must be absent.
-- This SOURCE TEMPLATE is deliberately NON-EXECUTABLE; the generator replaces a STOP guard.
-- The GENERATED SQL SNAPSHOT IS EXECUTABLE. It does not run automatically.
-- Do not execute the generated snapshot before independent review and authorization.
-- The generated snapshot must be verified against data/players.ts before execution.
-- DO NOT RUN OLD REVIEW-ONLY-player-profile-requests.sql or
-- REVIEW-ONLY-dynamic-player-profiles.sql in addition to this file.
-- This migration never touches historical matches, divisions, seasons or legacy data/players.ts.

BEGIN;

DO $$
DECLARE
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'player_profiles','player_profile_creation_requests',
    'player_discord_links','player_discord_link_requests',
    'il_legacy_players','il_pending_player_request_slots'
  ] LOOP
    IF to_regclass('public.' || v_name) IS NOT NULL THEN
      RAISE EXCEPTION 'STOP: table public.% already exists', v_name;
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'admin_approve_new_player_profile','admin_decide_player_discord_link',
      'il_guard_pending_player_request_slot',
      'il_reject_legacy_profile_collision','il_validate_discord_link_target'
    )
  ) THEN
    RAISE EXCEPTION 'STOP: targeted function already exists';
  END IF;
END $$;

-- Historical player IDs and nicknames come from data/players.ts. They are
-- mirrored ONLY for independent database validation; the website continues
-- to use its existing static registry and immutable tournament history.
-- No browser role may SELECT or modify this snapshot.
CREATE TABLE public.il_legacy_players (
  id text PRIMARY KEY,
  nickname text NOT NULL,
  nickname_key text GENERATED ALWAYS AS (lower(normalize(btrim(nickname), NFC))) STORED
);
-- An immutable snapshot must not contain two legacy identities with the same normalized nickname.
CREATE UNIQUE INDEX il_legacy_players_nickname_key_idx
  ON public.il_legacy_players(nickname_key);
ALTER TABLE public.il_legacy_players ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.il_legacy_players FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.il_legacy_players TO service_role;

-- OFFLINE GENERATION POINT: the source template contains a blocking statement.
-- The generator replaces it with a seeded INSERT and row-count assertion.
DO $$ BEGIN RAISE EXCEPTION 'STOP: legacy registry not seeded; generate a reviewed SQL snapshot first'; END $$; -- IL_LEGACY_SNAPSHOT_PLACEHOLDER

CREATE TABLE public.player_profiles (
  id text PRIMARY KEY
    CHECK (char_length(id) BETWEEN 3 AND 63 AND id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nickname text NOT NULL CHECK (
    char_length(nickname) BETWEEN 3 AND 32 AND nickname = btrim(nickname)
    AND nickname = normalize(nickname, NFC)
    AND nickname ~ '^[[:alnum:]_. -]+$'
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX player_profiles_nickname_ci_unique
  ON public.player_profiles ((lower(normalize(nickname, NFC))));
-- Legacy ID/nickname collisions are checked inside PostgreSQL, not only
-- by a client-supplied list. This also protects direct service_role writes.
CREATE FUNCTION public.il_reject_legacy_profile_collision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.il_legacy_players l
    WHERE lower(l.id) = lower(NEW.id)
      OR l.nickname_key = lower(normalize(btrim(NEW.nickname), NFC))
  ) THEN
    RAISE EXCEPTION 'Legacy player ID or nickname collision';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.il_reject_legacy_profile_collision()
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER il_no_legacy_profile_collision
  BEFORE INSERT OR UPDATE OF id, nickname ON public.player_profiles
  FOR EACH ROW EXECUTE FUNCTION public.il_reject_legacy_profile_collision();

ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, nickname) ON public.player_profiles TO anon, authenticated;
GRANT ALL ON public.player_profiles TO service_role;
CREATE POLICY public_can_read_approved_player_profiles
  ON public.player_profiles FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.player_discord_links (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id text NOT NULL UNIQUE,
  discord_user_id text NOT NULL UNIQUE CHECK (discord_user_id ~ '^[0-9]{15,22}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- A link must reference an existing *trusted* identity in PostgreSQL.
-- Legacy request approvals are checked against the legacy snapshot below.
-- This trigger also blocks direct privileged writes with unknown player IDs.
CREATE FUNCTION public.il_validate_discord_link_target()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.il_legacy_players l WHERE l.id = NEW.player_id)
     AND NOT EXISTS (SELECT 1 FROM public.player_profiles p WHERE p.id = NEW.player_id) THEN
    RAISE EXCEPTION 'Unknown player profile';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.il_validate_discord_link_target()
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER il_discord_link_target_exists
  BEFORE INSERT OR UPDATE OF player_id ON public.player_discord_links
  FOR EACH ROW EXECUTE FUNCTION public.il_validate_discord_link_target();

ALTER TABLE public.player_discord_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_discord_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_discord_links TO authenticated;
GRANT ALL ON public.player_discord_links TO service_role;
CREATE POLICY linked_user_reads_only_own_link
  ON public.player_discord_links FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = auth_user_id);
-- No INSERT/UPDATE/DELETE permissions for browser roles.

CREATE TABLE public.player_discord_link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id text NOT NULL CHECK (char_length(player_id) BETWEEN 1 AND 128),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decision_reason text,
  CONSTRAINT link_decision_consistency CHECK (
    (status = 'pending' AND decided_at IS NULL AND decision_reason IS NULL) OR
    (status = 'approved' AND decided_at IS NOT NULL AND decision_reason IS NULL) OR
    (status = 'rejected' AND decided_at IS NOT NULL
      AND char_length(decision_reason) BETWEEN 5 AND 500)
  )
);
CREATE UNIQUE INDEX one_pending_link_request_per_auth_user
  ON public.player_discord_link_requests(auth_user_id) WHERE status = 'pending';
CREATE INDEX link_requests_admin_queue
  ON public.player_discord_link_requests(status, created_at);
ALTER TABLE public.player_discord_link_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_discord_link_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_discord_link_requests TO authenticated;
-- Browser roles cannot INSERT: only server-side service_role may create requests
-- after validating the Supabase Auth user and Discord identity and feature gates.
GRANT ALL ON public.player_discord_link_requests TO service_role;
CREATE POLICY applicant_reads_only_own_link_requests
  ON public.player_discord_link_requests FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = auth_user_id);

CREATE TABLE public.player_profile_creation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  desired_nickname text NOT NULL CHECK (
    char_length(desired_nickname) BETWEEN 3 AND 32
    AND desired_nickname = btrim(desired_nickname)
    AND desired_nickname = normalize(desired_nickname, NFC)
    AND desired_nickname ~ '^[[:alnum:]_. -]+$'
  ),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decision_reason text,
  approved_player_id text UNIQUE REFERENCES public.player_profiles(id),
  CONSTRAINT profile_request_decision_consistency CHECK (
    (status = 'pending' AND decided_at IS NULL AND decision_reason IS NULL
      AND approved_player_id IS NULL) OR
    (status = 'approved' AND decided_at IS NOT NULL AND decision_reason IS NULL
      AND approved_player_id IS NOT NULL) OR
    (status = 'rejected' AND decided_at IS NOT NULL
      AND char_length(decision_reason) BETWEEN 5 AND 500 AND approved_player_id IS NULL)
  )
);
CREATE UNIQUE INDEX one_pending_profile_request_per_auth_user
  ON public.player_profile_creation_requests(auth_user_id) WHERE status = 'pending';
CREATE INDEX profile_requests_admin_queue
  ON public.player_profile_creation_requests(status, created_at);
ALTER TABLE public.player_profile_creation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_profile_creation_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_profile_creation_requests TO authenticated;
-- Browser roles cannot INSERT: only server-side service_role may create requests
-- after validating the Supabase Auth user and Discord identity and feature gates.
GRANT ALL ON public.player_profile_creation_requests TO service_role;
CREATE POLICY applicant_reads_only_own_profile_requests
  ON public.player_profile_creation_requests FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = auth_user_id);

-- Database-enforced cross-table invariant: a Supabase auth user may have
-- at most one pending account request, regardless of its type. A unique key
-- on a *shared* table is concurrency safe even for simultaneous inserts.
-- The slot is created/deleted in the same transaction as the request; an
-- aborted INSERT/UPDATE rolls the slot change back automatically.
-- This is an internal-only table. Browser roles cannot query or modify it.
CREATE TABLE public.il_pending_player_request_slots (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  request_kind text NOT NULL CHECK (request_kind IN ('link','profile')),
  request_id uuid NOT NULL UNIQUE
);
ALTER TABLE public.il_pending_player_request_slots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.il_pending_player_request_slots FROM PUBLIC, anon, authenticated;
-- Intentionally no browser policies/grants; trigger uses its owner's rights.

CREATE FUNCTION public.il_guard_pending_player_request_slot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_kind text;
BEGIN
  IF TG_TABLE_SCHEMA <> 'public' THEN
    RAISE EXCEPTION 'Unexpected request schema';
  END IF;
  IF TG_TABLE_NAME = 'player_discord_link_requests' THEN
    v_kind := 'link';
  ELSIF TG_TABLE_NAME = 'player_profile_creation_requests' THEN
    v_kind := 'profile';
  ELSE
    RAISE EXCEPTION 'Unexpected request table';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' THEN
      INSERT INTO public.il_pending_player_request_slots(auth_user_id,request_kind,request_id)
        VALUES (NEW.auth_user_id,v_kind,NEW.id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
       OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Applicant and request ID are immutable';
    END IF;
    IF OLD.status = 'pending' AND NEW.status <> 'pending' THEN
      DELETE FROM public.il_pending_player_request_slots s
        WHERE s.auth_user_id=OLD.auth_user_id
          AND s.request_kind=v_kind AND s.request_id=OLD.id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending request slot missing';
      END IF;
    ELSIF OLD.status <> 'pending' AND NEW.status = 'pending' THEN
      RAISE EXCEPTION 'Decided request cannot be reopened';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'pending' THEN
      DELETE FROM public.il_pending_player_request_slots s
        WHERE s.auth_user_id=OLD.auth_user_id
          AND s.request_kind=v_kind AND s.request_id=OLD.id;
    END IF;
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Unsupported request operation';
END;
$$;
REVOKE ALL ON FUNCTION public.il_guard_pending_player_request_slot()
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER il_guard_link_request_slot
  BEFORE INSERT OR UPDATE OR DELETE ON public.player_discord_link_requests
  FOR EACH ROW EXECUTE FUNCTION public.il_guard_pending_player_request_slot();
CREATE TRIGGER il_guard_profile_request_slot
  BEFORE INSERT OR UPDATE OR DELETE ON public.player_profile_creation_requests
  FOR EACH ROW EXECUTE FUNCTION public.il_guard_pending_player_request_slot();

-- The SQL functions are restricted to service_role. The Next.js API must
-- check ADMIN_PASSWORD and the individual server-only approval gate first.
-- Security definer + empty search_path + explicit role grants are required.
CREATE FUNCTION public.admin_approve_new_player_profile(
  p_request_id uuid,
  p_expected_discord_id text,
  p_legacy_ids text[],
  p_legacy_nicknames text[]
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.player_profile_creation_requests%ROWTYPE;
  v_discord_id text;
  v_player_id text;
BEGIN
  IF p_legacy_ids IS NULL OR p_legacy_nicknames IS NULL OR
     p_expected_discord_id IS NULL OR p_expected_discord_id !~ '^[0-9]{15,22}$' THEN
    RAISE EXCEPTION 'Invalid approval input';
  END IF;
  -- Fail closed unless the server sends a one-to-one, exhaustive list
  -- of the database legacy snapshot. A repeated valid ID must not conceal
  -- another omitted ID (count and per-row joins alone are insufficient).
  IF cardinality(p_legacy_ids) = 0
     OR cardinality(p_legacy_ids) <> cardinality(p_legacy_nicknames)
     OR cardinality(p_legacy_ids) <> (SELECT count(*) FROM public.il_legacy_players)
     OR (SELECT count(DISTINCT x.id) FROM unnest(p_legacy_ids) AS x(id))
         <> (SELECT count(*) FROM public.il_legacy_players)
     OR EXISTS (
        SELECT 1
        FROM unnest(p_legacy_ids, p_legacy_nicknames) AS src(id, nickname_key)
        LEFT JOIN public.il_legacy_players l ON l.id = src.id
          AND l.nickname_key = lower(normalize(btrim(src.nickname_key), NFC))
        WHERE l.id IS NULL
     ) THEN
    RAISE EXCEPTION 'Legacy registry mismatch: review data/players.ts snapshot';
  END IF;
  SELECT * INTO v_request
    FROM public.player_profile_creation_requests
    WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Request not pending';
  END IF;
  IF btrim(v_request.desired_nickname) <> v_request.desired_nickname OR
     char_length(v_request.desired_nickname) NOT BETWEEN 3 AND 32 THEN
    RAISE EXCEPTION 'Invalid nickname';
  END IF;

  SELECT i.provider_id INTO v_discord_id
    FROM auth.identities i
    WHERE i.user_id = v_request.auth_user_id AND i.provider = 'discord'
      AND i.provider_id ~ '^[0-9]{15,22}$'
    LIMIT 1;
  IF v_discord_id IS NULL OR v_discord_id <> p_expected_discord_id THEN
    RAISE EXCEPTION 'Discord identity is missing or changed';
  END IF;
  v_player_id := 'il-' || replace(v_request.id::text, '-', '');
  IF EXISTS (
    SELECT 1 FROM public.il_legacy_players l
    WHERE lower(l.id) = lower(v_player_id)
      OR l.nickname_key = lower(normalize(v_request.desired_nickname, NFC))
  ) THEN
    RAISE EXCEPTION 'Legacy player ID or nickname collision';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.player_discord_links l
    WHERE l.auth_user_id = v_request.auth_user_id OR l.discord_user_id = v_discord_id
      OR l.player_id = v_player_id
  ) THEN
    RAISE EXCEPTION 'Discord identity already linked';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.player_discord_link_requests r
    WHERE r.auth_user_id = v_request.auth_user_id AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Existing pending link request';
  END IF;

  INSERT INTO public.player_profiles(id, nickname)
    VALUES (v_player_id, v_request.desired_nickname);
  INSERT INTO public.player_discord_links(auth_user_id, player_id, discord_user_id)
    VALUES (v_request.auth_user_id, v_player_id, v_discord_id);
  UPDATE public.player_profile_creation_requests SET
    status = 'approved', approved_player_id = v_player_id, decided_at = now()
    WHERE id = v_request.id;
  RETURN v_player_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_approve_new_player_profile(uuid,text,text[],text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_new_player_profile(uuid,text,text[],text[])
  TO service_role;

CREATE FUNCTION public.admin_decide_player_discord_link(
  p_request_id uuid,
  p_action text,
  p_reason text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.player_discord_link_requests%ROWTYPE;
  v_discord_id text;
BEGIN
  IF p_action NOT IN ('approve','reject') THEN
    RAISE EXCEPTION 'Unknown action';
  END IF;
  SELECT * INTO v_request FROM public.player_discord_link_requests
    WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Link request not pending';
  END IF;
  IF p_action = 'reject' THEN
    IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 5 AND 500 THEN
      RAISE EXCEPTION 'Rejection reason required';
    END IF;
    UPDATE public.player_discord_link_requests
      SET status = 'rejected', decided_at = now(), decision_reason = btrim(p_reason)
      WHERE id = v_request.id;
    RETURN 'rejected';
  END IF;
  SELECT i.provider_id INTO v_discord_id
    FROM auth.identities i
    WHERE i.user_id = v_request.auth_user_id AND i.provider = 'discord'
      AND i.provider_id ~ '^[0-9]{15,22}$'
    LIMIT 1;
  IF v_discord_id IS NULL THEN
    RAISE EXCEPTION 'Verified Discord identity required';
  END IF;
  -- Explicit DB-layer trust requirement for existing players. A forged
  -- pending request with arbitrary player_id must never grant ownership.
  IF NOT EXISTS (
    SELECT 1 FROM public.il_legacy_players l WHERE l.id = v_request.player_id
  ) THEN
    RAISE EXCEPTION 'Target is not an existing legacy player';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.player_profile_creation_requests r
    WHERE r.auth_user_id = v_request.auth_user_id AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Pending new player request';
  END IF;
  INSERT INTO public.player_discord_links(auth_user_id, player_id, discord_user_id)
    VALUES (v_request.auth_user_id, v_request.player_id, v_discord_id);
  UPDATE public.player_discord_link_requests
    SET status = 'approved', decided_at = now() WHERE id = v_request.id;
  RETURN 'approved';
END;
$$;
REVOKE ALL ON FUNCTION public.admin_decide_player_discord_link(uuid,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decide_player_discord_link(uuid,text,text)
  TO service_role;

COMMIT;

-- DO NOT RUN YET. Post-install read-only reviews before activation:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'
--   AND tablename IN ('il_legacy_players','player_profiles','player_profile_creation_requests',
--     'player_discord_links','player_discord_link_requests');
-- SELECT proname, prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND proname IN
--   ('admin_approve_new_player_profile','admin_decide_player_discord_link');
-- SELECT routine_name, grantee, privilege_type FROM information_schema.role_routine_grants
--   WHERE specific_schema='public' AND routine_name LIKE 'admin_%player%';
