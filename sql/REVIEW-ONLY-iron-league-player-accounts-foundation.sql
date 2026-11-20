-- IRON LEAGUE | REVIEW ONLY | COMBINED NEW-PLAYER FOUNDATION v1
-- DO NOT EXECUTE IN PRODUCTION UNTIL SEPARATELY AUTHORIZED AND REVIEWED.
-- Requires review of auth Before User Created hook, Discord provider, RLS grants and backup.
-- PRECONDITION: all 4 tables and both new functions absent, confirmed on 2026-11-20.
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
    'player_discord_links','player_discord_link_requests'
  ] LOOP
    IF to_regclass('public.' || v_name) IS NOT NULL THEN
      RAISE EXCEPTION 'STOP: table public.% already exists', v_name;
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'admin_approve_new_player_profile','admin_decide_player_discord_link'
    )
  ) THEN
    RAISE EXCEPTION 'STOP: targeted function already exists';
  END IF;
END $$;

CREATE TABLE public.player_profiles (
  id text PRIMARY KEY
    CHECK (char_length(id) BETWEEN 3 AND 63 AND id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nickname text NOT NULL CHECK (
    char_length(nickname) BETWEEN 3 AND 32 AND nickname = btrim(nickname)
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX player_profiles_nickname_ci_unique
  ON public.player_profiles ((lower(nickname)));
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
GRANT INSERT (auth_user_id, player_id)
  ON public.player_discord_link_requests TO authenticated;
GRANT ALL ON public.player_discord_link_requests TO service_role;
CREATE POLICY applicant_reads_only_own_link_requests
  ON public.player_discord_link_requests FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = auth_user_id);
CREATE POLICY applicant_inserts_only_own_pending_link_request
  ON public.player_discord_link_requests FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = auth_user_id
    AND status = 'pending' AND decided_at IS NULL AND decision_reason IS NULL);

CREATE TABLE public.player_profile_creation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  desired_nickname text NOT NULL CHECK (
    char_length(desired_nickname) BETWEEN 3 AND 32
    AND desired_nickname = btrim(desired_nickname)
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
GRANT INSERT (auth_user_id, desired_nickname, note)
  ON public.player_profile_creation_requests TO authenticated;
GRANT ALL ON public.player_profile_creation_requests TO service_role;
CREATE POLICY applicant_reads_only_own_profile_requests
  ON public.player_profile_creation_requests FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = auth_user_id);
CREATE POLICY applicant_inserts_only_own_pending_profile_request
  ON public.player_profile_creation_requests FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = auth_user_id
    AND status = 'pending' AND decided_at IS NULL
    AND decision_reason IS NULL AND approved_player_id IS NULL);

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
  IF v_player_id = ANY(p_legacy_ids) OR
     lower(v_request.desired_nickname) = ANY(p_legacy_nicknames) THEN
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
--   AND tablename IN ('player_profiles','player_profile_creation_requests',
--     'player_discord_links','player_discord_link_requests');
-- SELECT proname, prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND proname IN
--   ('admin_approve_new_player_profile','admin_decide_player_discord_link');
-- SELECT routine_name, grantee, privilege_type FROM information_schema.role_routine_grants
--   WHERE specific_schema='public' AND routine_name LIKE 'admin_%player%';
