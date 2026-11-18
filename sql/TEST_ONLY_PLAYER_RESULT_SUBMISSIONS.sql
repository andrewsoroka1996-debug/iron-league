-- IRON LEAGUE: TEST PROJECT ONLY. REVIEW BEFORE ANY PRODUCTION MIGRATION.
-- Do not run in the production Supabase project. No existing matches or links are modified.
-- Requires existing public.matches, public.player_discord_links and Supabase Storage.
BEGIN;

CREATE TABLE IF NOT EXISTS public.player_result_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id),
  player_id text NOT NULL,
  match_id text NOT NULL,
  home_goals integer NOT NULL CHECK (home_goals BETWEEN 0 AND 99),
  away_goals integer NOT NULL CHECK (away_goals BETWEEN 0 AND 99),
  screenshot_path text,
  no_screenshot_reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','rejected','approved')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((screenshot_path IS NOT NULL AND no_screenshot_reason IS NULL)
      OR (screenshot_path IS NULL AND no_screenshot_reason IS NOT NULL
          AND char_length(trim(no_screenshot_reason)) BETWEEN 12 AND 1000))
);
CREATE UNIQUE INDEX IF NOT EXISTS player_result_submissions_pending_match_unique
  ON public.player_result_submissions (match_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS player_result_submissions_author_idx
  ON public.player_result_submissions (auth_user_id, updated_at DESC);
ALTER TABLE public.player_result_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_result_submissions FROM anon, authenticated;
GRANT SELECT ON public.player_result_submissions TO authenticated;
DROP POLICY IF EXISTS player_result_submissions_read_own ON public.player_result_submissions;
CREATE POLICY player_result_submissions_read_own
  ON public.player_result_submissions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = auth_user_id);

CREATE TABLE IF NOT EXISTS public.player_result_submission_versions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES public.player_result_submissions(id) ON DELETE RESTRICT,
  revision integer NOT NULL,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  home_goals integer NOT NULL,
  away_goals integer NOT NULL,
  screenshot_path text,
  no_screenshot_reason text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, revision)
);
CREATE INDEX IF NOT EXISTS player_result_submission_versions_author_idx
  ON public.player_result_submission_versions(changed_by, changed_at DESC);
ALTER TABLE public.player_result_submission_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_result_submission_versions FROM anon, authenticated;
GRANT SELECT ON public.player_result_submission_versions TO authenticated;
DROP POLICY IF EXISTS player_result_submission_versions_read_own ON public.player_result_submission_versions;
CREATE POLICY player_result_submission_versions_read_own
  ON public.player_result_submission_versions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.player_result_submissions s
    WHERE s.id = submission_id AND s.auth_user_id = (SELECT auth.uid())
  ));

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('iron-player-result-evidence', 'iron-player-result-evidence', false, 8388608,
  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
DO $bucket$
BEGIN
 IF EXISTS (SELECT 1 FROM storage.buckets
            WHERE id='iron-player-result-evidence' AND public=true) THEN
   RAISE EXCEPTION 'Evidence bucket must be private';
 END IF;
END $bucket$;

CREATE OR REPLACE FUNCTION public.submit_player_result_requests(
  p_auth_user_id uuid,
  p_player_id text,
  p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_item jsonb;
  v_match_id text;
  v_home_goals integer;
  v_away_goals integer;
  v_path text;
  v_reason text;
  v_match record;
  v_request record;
  v_id uuid;
  v_rev integer;
  v_ids jsonb := '[]'::jsonb;
  v_seen text[] := ARRAY[]::text[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.player_discord_links l
    JOIN auth.identities i ON i.user_id=l.auth_user_id AND i.provider='discord'
                          AND i.provider_id=l.discord_user_id
    WHERE l.auth_user_id=p_auth_user_id AND l.player_id=p_player_id
  ) THEN
    RAISE EXCEPTION 'No approved Discord ownership';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 2 THEN
    RAISE EXCEPTION 'One or two results required';
  END IF;
  -- Prevent excessive amendments; the route adds its own size and origin checks.
  IF (SELECT count(*) FROM public.player_result_submission_versions v
      WHERE v.changed_by=p_auth_user_id AND v.changed_at > now()-interval '1 hour') >= 100 THEN
    RAISE EXCEPTION 'Too many edits; try later';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'Invalid submission item';
    END IF;
    v_match_id := v_item ->> 'match_id';
    IF v_match_id IS NULL OR v_match_id !~ '^[a-zA-Z0-9_-]{1,128}$'
       OR v_match_id = ANY(v_seen) THEN
      RAISE EXCEPTION 'Invalid or duplicate match ID';
    END IF;
    v_seen := array_append(v_seen,v_match_id);
    v_home_goals := (v_item ->> 'home_goals')::integer;
    v_away_goals := (v_item ->> 'away_goals')::integer;
    IF v_home_goals IS NULL OR v_away_goals IS NULL
       OR v_home_goals NOT BETWEEN 0 AND 99 OR v_away_goals NOT BETWEEN 0 AND 99 THEN
      RAISE EXCEPTION 'Invalid score';
    END IF;
    v_path := NULLIF(v_item ->> 'screenshot_path','');
    v_reason := NULLIF(trim(v_item ->> 'no_screenshot_reason'),'');
    IF (v_path IS NULL AND (v_reason IS NULL OR length(v_reason) NOT BETWEEN 12 AND 1000))
       OR (v_path IS NOT NULL AND v_reason IS NOT NULL) THEN
      RAISE EXCEPTION 'Screenshot or written exception required';
    END IF;
    IF v_path IS NOT NULL THEN
      IF v_path NOT LIKE ('v1/' || p_auth_user_id::text || '/' || v_match_id || '/%')
         OR NOT EXISTS (
           SELECT 1 FROM storage.objects o
           WHERE o.bucket_id='iron-player-result-evidence' AND o.name=v_path
         ) THEN
        RAISE EXCEPTION 'Screenshot ownership or storage mismatch';
      END IF;
    END IF;

    SELECT m.id, m.season, m.status, m.participant_type, m.home_id, m.away_id
      INTO v_match FROM public.matches m WHERE m.id::text = v_match_id FOR UPDATE;
    IF NOT FOUND OR v_match.season <> 4 OR v_match.participant_type <> 'player'
       OR v_match.home_id = v_match.away_id
       OR p_player_id NOT IN (v_match.home_id,v_match.away_id)
       OR v_match.status NOT IN ('scheduled','closed_unplayed') THEN
      RAISE EXCEPTION 'Match is not eligible for this player';
    END IF;

    SELECT * INTO v_request FROM public.player_result_submissions
      WHERE match_id=v_match_id AND status='pending' FOR UPDATE;
    IF FOUND AND v_request.auth_user_id <> p_auth_user_id THEN
      RAISE EXCEPTION 'Another player already submitted this match';
    END IF;
    IF NOT FOUND THEN
      SELECT * INTO v_request FROM public.player_result_submissions
        WHERE match_id=v_match_id AND auth_user_id=p_auth_user_id AND status='rejected'
        ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
    END IF;
    IF FOUND THEN
      v_id := v_request.id;
      v_rev := v_request.revision + 1;
      UPDATE public.player_result_submissions
        SET home_goals=v_home_goals, away_goals=v_away_goals,
          screenshot_path=v_path, no_screenshot_reason=v_reason,
          status='pending', revision=v_rev, updated_at=now()
        WHERE id=v_id;
    ELSE
      v_rev := 1;
      INSERT INTO public.player_result_submissions
        (auth_user_id, player_id, match_id, home_goals, away_goals,
         screenshot_path, no_screenshot_reason, status, revision)
      VALUES (p_auth_user_id,p_player_id,v_match_id,v_home_goals,v_away_goals,
              v_path,v_reason,'pending',v_rev)
      RETURNING id INTO v_id;
    END IF;
    INSERT INTO public.player_result_submission_versions
      (submission_id, revision, changed_by, home_goals, away_goals, screenshot_path, no_screenshot_reason)
    VALUES (v_id,v_rev,p_auth_user_id,v_home_goals,v_away_goals,v_path,v_reason);
    v_ids := v_ids || jsonb_build_object('request_id',v_id,'match_id',v_match_id,'revision',v_rev);
  END LOOP;
  RETURN jsonb_build_object('success',true,'requests',v_ids);
END;
$fn$;
REVOKE ALL ON FUNCTION public.submit_player_result_requests(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_player_result_requests(uuid,text,jsonb) TO service_role;
COMMIT;
