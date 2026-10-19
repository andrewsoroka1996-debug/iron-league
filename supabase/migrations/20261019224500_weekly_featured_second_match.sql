-- Iron League. Add an OPTIONAL second official match to each of the five
-- manually curated weekly slots; preserve existing rows and both results.
-- Apply only AFTER the original 20261019210000_weekly_featured_matches.sql migration.
-- The existing legacy RPC set_weekly_featured_match is retained for rollback.
ALTER TABLE public.weekly_featured_matches
  ADD COLUMN IF NOT EXISTS match_id_2 text NULL,
  ADD COLUMN IF NOT EXISTS display_date_2 date NULL,
  ADD COLUMN IF NOT EXISTS display_time_2 time without time zone NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'weekly_featured_distinct_matches'
      AND conrelid = 'public.weekly_featured_matches'::regclass
  ) THEN
    ALTER TABLE public.weekly_featured_matches
      ADD CONSTRAINT weekly_featured_distinct_matches
      CHECK (match_id_2 IS NULL OR match_id_2 <> match_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'weekly_featured_second_time_requires_date'
      AND conrelid = 'public.weekly_featured_matches'::regclass
  ) THEN
    ALTER TABLE public.weekly_featured_matches
      ADD CONSTRAINT weekly_featured_second_time_requires_date
      CHECK (display_time_2 IS NULL OR display_date_2 IS NOT NULL);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS weekly_featured_second_match_unique
  ON public.weekly_featured_matches (season, match_id_2)
  WHERE match_id_2 IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_weekly_featured_pair(
  p_season integer,
  p_position integer,
  p_match_id text,
  p_match_id_2 text DEFAULT NULL,
  p_display_date date DEFAULT NULL,
  p_display_time time without time zone DEFAULT NULL,
  p_display_date_2 date DEFAULT NULL,
  p_display_time_2 time without time zone DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved public.weekly_featured_matches%ROWTYPE;
  source_row public.weekly_featured_matches%ROWTYPE;
  target_row public.weekly_featured_matches%ROWTYPE;
  first_match public.matches%ROWTYPE;
  second_match public.matches%ROWTYPE;
BEGIN
  IF p_season IS NULL OR p_season NOT BETWEEN 1 AND 4 THEN
    RAISE EXCEPTION 'Некоректний сезон';
  END IF;
  IF p_position IS NULL OR p_position NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Позиція має бути 1–5';
  END IF;
  p_match_id := nullif(btrim(p_match_id), '');
  p_match_id_2 := nullif(btrim(p_match_id_2), '');
  IF p_match_id IS NULL THEN
    RAISE EXCEPTION 'Перший матч не вибрано';
  END IF;
  IF p_match_id_2 = p_match_id THEN
    RAISE EXCEPTION 'Другий матч має бути іншим';
  END IF;
  IF p_display_time IS NOT NULL AND p_display_date IS NULL THEN
    RAISE EXCEPTION 'Для першого матчу час вказують разом із датою';
  END IF;
  IF p_display_time_2 IS NOT NULL AND p_display_date_2 IS NULL THEN
    RAISE EXCEPTION 'Для другого матчу час вказують разом із датою';
  END IF;
  IF p_match_id_2 IS NULL AND (p_display_date_2 IS NOT NULL OR p_display_time_2 IS NOT NULL) THEN
    RAISE EXCEPTION 'Спочатку виберіть другий матч';
  END IF;

  SELECT * INTO first_match FROM public.matches m
    WHERE m.id::text = p_match_id AND m.season = p_season;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Перший матч не знайдено у вибраному сезоні';
  END IF;

  IF p_match_id_2 IS NOT NULL THEN
    SELECT * INTO second_match FROM public.matches m
      WHERE m.id::text = p_match_id_2 AND m.season = p_season;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Другий матч не знайдено у вибраному сезоні';
    END IF;
    IF first_match.competition IS DISTINCT FROM second_match.competition
      OR first_match.division IS DISTINCT FROM second_match.division
      OR first_match.stage IS DISTINCT FROM second_match.stage
      OR first_match.group_name IS DISTINCT FROM second_match.group_name
      OR first_match.participant_type IS DISTINCT FROM second_match.participant_type
      OR NOT (
        (first_match.home_id = second_match.home_id AND first_match.away_id = second_match.away_id)
        OR (first_match.home_id = second_match.away_id AND first_match.away_id = second_match.home_id)
      ) THEN
      RAISE EXCEPTION 'Другий матч повинен бути між тими самими суперниками в цьому ж турнірі та групі';
    END IF;
  END IF;

  -- Lock per season, including moves/swaps of two-match cards.
  PERFORM pg_advisory_xact_lock(73192, p_season);

  SELECT * INTO source_row FROM public.weekly_featured_matches
    WHERE season = p_season AND match_id = p_match_id;
  SELECT * INTO target_row FROM public.weekly_featured_matches
    WHERE season = p_season AND position = p_position;

  -- No official match can be reused as the first OR second part of another card.
  IF EXISTS (
    SELECT 1 FROM public.weekly_featured_matches x
    WHERE x.season = p_season
      AND x.position <> p_position
      AND (source_row.id IS NULL OR x.position <> source_row.position)
      AND (
        x.match_id = p_match_id
        OR x.match_id_2 = p_match_id
        OR (p_match_id_2 IS NOT NULL AND
          (x.match_id = p_match_id_2 OR x.match_id_2 = p_match_id_2))
      )
  ) THEN
    RAISE EXCEPTION 'Один із цих матчів уже використано в іншій добірці';
  END IF;

  -- If moving a card into an occupied position, retain the other card too.
  -- If the new second game would collide with the displaced card, reject.
  IF source_row.id IS NOT NULL
    AND source_row.position <> p_position
    AND target_row.id IS NOT NULL
    AND target_row.match_id <> p_match_id
    AND p_match_id_2 IS NOT NULL
    AND (target_row.match_id = p_match_id_2 OR target_row.match_id_2 = p_match_id_2)
  THEN
    RAISE EXCEPTION 'Другий матч уже належить картці, з якою виконується перестановка';
  END IF;

  DELETE FROM public.weekly_featured_matches
    WHERE season = p_season AND (position = p_position OR match_id = p_match_id);

  INSERT INTO public.weekly_featured_matches
    (season, position, match_id, match_id_2,
     display_date, display_time, display_date_2, display_time_2)
  VALUES
    (p_season, p_position, p_match_id, p_match_id_2,
     p_display_date, p_display_time, p_display_date_2, p_display_time_2)
  RETURNING * INTO saved;

  IF source_row.id IS NOT NULL
    AND source_row.position <> p_position
    AND target_row.id IS NOT NULL
    AND target_row.match_id <> p_match_id
  THEN
    INSERT INTO public.weekly_featured_matches
      (season, position, match_id, match_id_2,
       display_date, display_time, display_date_2, display_time_2)
    VALUES
      (p_season, source_row.position, target_row.match_id, target_row.match_id_2,
       target_row.display_date, target_row.display_time,
       target_row.display_date_2, target_row.display_time_2);
  END IF;

  RETURN to_jsonb(saved);
END;
$$;

REVOKE ALL ON FUNCTION public.set_weekly_featured_pair(
  integer, integer, text, text, date, time without time zone, date, time without time zone
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_weekly_featured_pair(
  integer, integer, text, text, date, time without time zone, date, time without time zone
) TO service_role;

COMMENT ON COLUMN public.weekly_featured_matches.match_id_2 IS
  'Optional second official game between the same two opponents. No aggregate scoring for group/division games.';
