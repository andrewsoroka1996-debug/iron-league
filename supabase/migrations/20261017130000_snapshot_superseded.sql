-- Iron League: close superseded Cancel Result snapshots without losing history.
-- Baseline: public.matches, public.match_result_revert_log,
--           public.admin_restore_match_result_atomic(uuid) already exist.
-- Apply once in Supabase SQL Editor AFTER preparing the accompanying API edits.
-- All changes are transactional.
BEGIN;

-- A snapshot can be active, restored, or superseded (never both closed states).
ALTER TABLE public.match_result_revert_log
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.match_result_revert_log'::regclass
      AND conname = 'match_result_revert_log_one_close_reason'
  ) THEN
    ALTER TABLE public.match_result_revert_log
      ADD CONSTRAINT match_result_revert_log_one_close_reason
      CHECK (restored_at IS NULL OR superseded_at IS NULL);
  END IF;
END;
$constraint$;

-- Close old snapshots only where current match differs from the saved
-- result (or was closed without play). Identical history is ambiguous and
-- is left untouched for manual review.
-- superseded_at is the time of this historical-data repair, not a guessed
-- historical editing timestamp. Original reverted_at and score are untouched.
UPDATE public.match_result_revert_log AS l
SET superseded_at = clock_timestamp()
FROM public.matches AS m
WHERE l.match_id = m.id
  AND l.restored_at IS NULL
  AND l.superseded_at IS NULL
  AND m.status IN ('finished', 'closed_unplayed')
  AND (
    m.status = 'closed_unplayed'
    OR m.status IS DISTINCT FROM l.status
    OR m.home_goals IS DISTINCT FROM l.home_goals
    OR m.away_goals IS DISTINCT FROM l.away_goals
    OR m.played_at IS DISTINCT FROM l.played_at
  );

-- Only truly active snapshots block another Cancel Result.
DROP INDEX IF EXISTS public.match_result_revert_log_active_unique;
CREATE UNIQUE INDEX match_result_revert_log_active_unique
  ON public.match_result_revert_log (match_id)
  WHERE restored_at IS NULL AND superseded_at IS NULL;

-- A new score or an administrative close after a Cancel Result replaces
-- the previous snapshot. This runs in the SAME transaction as the match write.
CREATE OR REPLACE FUNCTION public.close_superseded_match_result_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_snapshot public.match_result_revert_log%ROWTYPE;
BEGIN
  IF OLD.status IS DISTINCT FROM 'scheduled'
     OR OLD.home_goals IS NOT NULL
     OR OLD.away_goals IS NOT NULL
     OR OLD.played_at IS NOT NULL
     OR NEW.status NOT IN ('finished', 'closed_unplayed')
  THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_snapshot
  FROM public.match_result_revert_log
  WHERE match_id = NEW.id
    AND restored_at IS NULL
    AND superseded_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Every result written after Cancel Result supersedes the old snapshot,
  -- including a manually re-entered result with the same score.
  -- Atomic Restore marks restored_at first, so its snapshot is not selected.

  UPDATE public.match_result_revert_log
  SET superseded_at = clock_timestamp()
  WHERE id = v_snapshot.id
    AND restored_at IS NULL
    AND superseded_at IS NULL;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_close_superseded_result_snapshot ON public.matches;
CREATE TRIGGER trg_close_superseded_result_snapshot
AFTER UPDATE OF status, home_goals, away_goals, played_at
ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.close_superseded_match_result_snapshot();

-- Replace atomic Restore: mark snapshot 'restored' first, before the match
-- UPDATE can invoke the new trigger. Any failure reverts BOTH updates.
CREATE OR REPLACE FUNCTION public.admin_restore_match_result_atomic(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_match public.matches%ROWTYPE;
  v_snapshot public.match_result_revert_log%ROWTYPE;
  v_restored public.matches%ROWTYPE;
  v_closed public.match_result_revert_log%ROWTYPE;
BEGIN
  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Матч не знайдено' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_snapshot
  FROM public.match_result_revert_log
  WHERE match_id = p_match_id
    AND restored_at IS NULL
    AND superseded_at IS NULL
  ORDER BY reverted_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Немає активного snapshot для Restore'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_match.status IS DISTINCT FROM 'scheduled'
     OR v_match.home_goals IS NOT NULL
     OR v_match.away_goals IS NOT NULL
     OR v_match.played_at IS NOT NULL
  THEN
    RAISE EXCEPTION 'Матч змінився після Cancel Result. Restore заблоковано'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_snapshot.status IS DISTINCT FROM 'finished'
     OR v_snapshot.home_goals IS NULL
     OR v_snapshot.away_goals IS NULL
     OR v_snapshot.home_goals < 0
     OR v_snapshot.away_goals < 0
  THEN
    RAISE EXCEPTION 'Snapshot містить некоректний результат'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.match_result_revert_log
  SET restored_at = clock_timestamp()
  WHERE id = v_snapshot.id
    AND restored_at IS NULL
    AND superseded_at IS NULL
  RETURNING * INTO v_closed;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Не вдалося закрити snapshot'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.matches
  SET home_goals = v_snapshot.home_goals,
      away_goals = v_snapshot.away_goals,
      status = v_snapshot.status,
      played_at = v_snapshot.played_at
  WHERE id = p_match_id
    AND status = 'scheduled'
    AND home_goals IS NULL
    AND away_goals IS NULL
    AND played_at IS NULL
  RETURNING * INTO v_restored;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Не вдалося відновити матч'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'match', to_jsonb(v_restored),
    'snapshot', jsonb_build_object(
      'id', v_closed.id,
      'reverted_at', v_closed.reverted_at,
      'restored_at', v_closed.restored_at
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_restore_match_result_atomic(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_match_result_atomic(uuid)
  TO service_role;

COMMIT;
