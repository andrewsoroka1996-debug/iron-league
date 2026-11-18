-- IRON LEAGUE - TEST SUPABASE PROJECT ONLY. DO NOT EXECUTE IN PRODUCTION.
-- Requires TEST_ONLY_PLAYER_RESULT_SUBMISSIONS.sql (v5) already applied in test.
-- No existing result, profile, or request is changed by this migration.
-- This RPC, when later invoked, approves ONLY Season 4 scheduled matches.
-- closed_unplayed is blocked until an atomic dependency check is implemented.
BEGIN;

DO $check$
BEGIN
  IF to_regclass('public.player_result_submissions') IS NULL
     OR to_regclass('public.player_result_submission_versions') IS NULL
     OR to_regclass('public.matches') IS NULL THEN
    RAISE EXCEPTION 'Required v5 submission tables or matches missing; aborting';
  END IF;
END
$check$;

CREATE TABLE IF NOT EXISTS public.player_result_submission_decisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES public.player_result_submissions(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision >= 1),
  action text NOT NULL CHECK (action IN ('approve', 'reject')),
  reason text,
  actor_label text NOT NULL DEFAULT 'admin_password',
  match_id text NOT NULL,
  match_status_before text NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, revision),
  CHECK ((action = 'reject' AND reason IS NOT NULL AND char_length(trim(reason)) BETWEEN 8 AND 500)
      OR (action = 'approve' AND (reason IS NULL OR char_length(trim(reason)) <= 500)))
);
CREATE INDEX IF NOT EXISTS player_result_decisions_date_idx
  ON public.player_result_submission_decisions (decided_at DESC);
ALTER TABLE public.player_result_submission_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_result_submission_decisions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_result_submission_decisions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.player_result_submission_decisions_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.admin_decide_player_result_submission(
  p_request_id uuid,
  p_action text,
  p_expected_revision integer,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_preliminary record;
  v_request record;
  v_match record;
  v_count integer;
  v_note text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Privileged RPC only';
  END IF;
  IF p_request_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 1
     OR p_action NOT IN ('approve', 'reject') OR p_action IS NULL THEN
    RAISE EXCEPTION 'Invalid review request';
  END IF;
  v_note := NULLIF(trim(p_reason), '');
  IF char_length(coalesce(v_note, '')) > 500 OR
     (p_action = 'reject' AND char_length(coalesce(v_note, '')) < 8) THEN
    RAISE EXCEPTION 'Invalid review reason';
  END IF;

  -- Use the same row-lock order as submit_player_result_requests: match, then request.
  -- The preliminary lookup is only for finding the immutable match_id. Recheck after locks.
  SELECT s.match_id INTO v_preliminary
    FROM public.player_result_submissions s WHERE s.id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;

  SELECT m.id, m.season, m.competition, m.participant_type,
         m.home_id, m.away_id, m.home_goals, m.away_goals, m.status
    INTO v_match FROM public.matches m
    WHERE m.id::text = v_preliminary.match_id
    FOR UPDATE;
  IF NOT FOUND AND p_action = 'approve' THEN RAISE EXCEPTION 'Original match missing'; END IF;

  SELECT s.* INTO v_request FROM public.player_result_submissions s
    WHERE s.id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending'
     OR v_request.revision <> p_expected_revision
     OR v_request.match_id IS DISTINCT FROM v_preliminary.match_id THEN
    RAISE EXCEPTION 'Request has already been reviewed or changed';
  END IF;
  IF p_action = 'approve' THEN
    IF v_match.season <> 4 OR v_match.participant_type <> 'player'
       OR v_match.home_id = v_match.away_id
       OR v_request.player_id NOT IN (v_match.home_id, v_match.away_id)
       OR v_request.home_goals NOT BETWEEN 0 AND 99
       OR v_request.away_goals NOT BETWEEN 0 AND 99 THEN
      RAISE EXCEPTION 'Request does not match an eligible Season 4 fixture';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.player_discord_links l
      JOIN auth.identities i ON i.user_id = l.auth_user_id
        AND i.provider = 'discord' AND i.provider_id = l.discord_user_id
      WHERE l.auth_user_id = v_request.auth_user_id AND l.player_id = v_request.player_id
    ) THEN
      RAISE EXCEPTION 'Approved ownership no longer valid';
    END IF;
    IF v_request.screenshot_path IS NOT NULL THEN
      IF v_request.screenshot_path NOT LIKE
           ('v1/' || v_request.auth_user_id::text || '/' || v_request.match_id || '/%')
         OR NOT EXISTS (
           SELECT 1 FROM storage.objects o
           WHERE o.bucket_id = 'iron-player-result-evidence'
             AND o.name = v_request.screenshot_path
         ) THEN
        RAISE EXCEPTION 'Missing or mismatched evidence';
      END IF;
    ELSIF v_request.no_screenshot_reason IS NULL OR
          char_length(trim(v_request.no_screenshot_reason)) NOT BETWEEN 12 AND 1000 THEN
      RAISE EXCEPTION 'Missing screenshot and explanation';
    END IF;

  END IF;

  IF p_action = 'approve' THEN
    -- IMPORTANT: This intentionally excludes closed_unplayed (dependent-stage safety).
    IF v_match.status <> 'scheduled' OR v_match.home_goals IS NOT NULL
       OR v_match.away_goals IS NOT NULL THEN
      RAISE EXCEPTION 'Only unplayed scheduled matches can be approved automatically';
    END IF;
    UPDATE public.matches m
       SET home_goals = v_request.home_goals,
           away_goals = v_request.away_goals,
           status = 'finished',
           played_at = now()
     WHERE m.id = v_match.id
       AND m.status = 'scheduled'
       AND m.home_goals IS NULL AND m.away_goals IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN RAISE EXCEPTION 'Match changed; transaction aborted'; END IF;
  END IF;

  -- Exactly one administrative decision per submission revision.
  INSERT INTO public.player_result_submission_decisions
    (submission_id, revision, action, reason, match_id, match_status_before)
  VALUES (v_request.id, v_request.revision, p_action, v_note,
          v_request.match_id, coalesce(v_match.status, 'missing'));

  UPDATE public.player_result_submissions
     SET status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END,
         updated_at = now()
   WHERE id = v_request.id AND revision = v_request.revision AND status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Request changed; transaction aborted'; END IF;

  RETURN jsonb_build_object(
    'success', true, 'request_id', v_request.id, 'revision', v_request.revision,
    'action', p_action, 'match_id', v_request.match_id,
    'official_result_recorded', (p_action = 'approve')
  );
END;
$fn$;
REVOKE ALL ON FUNCTION public.admin_decide_player_result_submission(uuid,text,integer,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decide_player_result_submission(uuid,text,integer,text)
  TO service_role;
COMMIT;
