-- Iron League: restore a reverted match result and close its snapshot atomically.
-- Baseline of SQL already installed in Supabase on 2026-10-17.
-- Requires public.matches and public.match_result_revert_log.

CREATE OR REPLACE FUNCTION public.admin_restore_match_result_atomic(
  p_match_id uuid
)
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
  -- 1. Блокуємо матч на час операції
  SELECT *
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Матч не знайдено'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Блокуємо активний snapshot
  SELECT *
  INTO v_snapshot
  FROM public.match_result_revert_log
  WHERE match_id = p_match_id
    AND restored_at IS NULL
  ORDER BY reverted_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Немає активного snapshot для Restore'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Захищаємо новий результат
  IF v_match.status IS DISTINCT FROM 'scheduled'
     OR v_match.home_goals IS NOT NULL
     OR v_match.away_goals IS NOT NULL
     OR v_match.played_at IS NOT NULL
  THEN
    RAISE EXCEPTION
      'Матч змінився після Cancel Result. Restore заблоковано'
      USING ERRCODE = 'P0001';
  END IF;

  -- 4. Перевіряємо збережений результат
  IF v_snapshot.status IS DISTINCT FROM 'finished'
     OR v_snapshot.home_goals IS NULL
     OR v_snapshot.away_goals IS NULL
     OR v_snapshot.home_goals < 0
     OR v_snapshot.away_goals < 0
  THEN
    RAISE EXCEPTION
      'Snapshot містить некоректний результат'
      USING ERRCODE = 'P0001';
  END IF;

  -- 5. Відновлюємо точний стан матчу
  UPDATE public.matches
  SET
    home_goals = v_snapshot.home_goals,
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
    RAISE EXCEPTION
      'Не вдалося відновити матч'
      USING ERRCODE = 'P0001';
  END IF;

  -- Тригер плей-оф спрацьовує
  -- автоматично під час UPDATE matches.

  -- 6. Закриваємо snapshot
  UPDATE public.match_result_revert_log
  SET restored_at = clock_timestamp()
  WHERE id = v_snapshot.id
    AND restored_at IS NULL
  RETURNING * INTO v_closed;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Не вдалося закрити snapshot'
      USING ERRCODE = 'P0001';
  END IF;

  -- 7. Повертаємо дані для Next.js
  RETURN jsonb_build_object(
    'match',
    to_jsonb(v_restored),

    'snapshot',
    jsonb_build_object(
      'id', v_closed.id,
      'reverted_at', v_closed.reverted_at,
      'restored_at', v_closed.restored_at
    )
  );
END;
$function$;

-- A PostgreSQL function normally grants EXECUTE to PUBLIC by default;
-- enforce the same restricted permissions already verified in Supabase.
REVOKE ALL ON FUNCTION public.admin_restore_match_result_atomic(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_restore_match_result_atomic(uuid)
TO service_role;
