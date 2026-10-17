-- Iron League: synchronise a Division Cup winner with the next knockout round.
-- Baseline of SQL already installed in Supabase on 2026-10-17.
-- Requires public.matches and the related competition data model to exist.

CREATE OR REPLACE FUNCTION public.sync_division_cup_winner()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  old_winner text;
  new_winner text;
  next_stage text;
  next_slot integer;
  next_match public.matches%ROWTYPE;
  found_matches integer := 0;
BEGIN
  -- Тільки чотири Кубки дивізіонів
  IF NEW.competition NOT IN (
    'division-1-cup',
    'division-2-cup',
    'division-3-cup',
    'division-4-cup'
  ) THEN
    RETURN NEW;
  END IF;

  next_stage := CASE NEW.stage
    WHEN 'round-of-16' THEN 'quarterfinal'
    WHEN 'quarterfinal' THEN 'semifinal'
    WHEN 'semifinal' THEN 'final'
    ELSE NULL
  END;

  IF next_stage IS NULL THEN
    RETURN NEW;
  END IF;

  -- Попередній переможець
  IF OLD.status = 'finished'
     AND OLD.home_goals IS NOT NULL
     AND OLD.away_goals IS NOT NULL
     AND OLD.home_goals <> OLD.away_goals THEN
    old_winner := CASE
      WHEN OLD.home_goals > OLD.away_goals
        THEN OLD.home_id
      ELSE OLD.away_id
    END;
  END IF;

  -- Новий переможець
  IF NEW.status = 'finished'
     AND NEW.home_goals IS NOT NULL
     AND NEW.away_goals IS NOT NULL
     AND NEW.home_goals <> NEW.away_goals THEN
    new_winner := CASE
      WHEN NEW.home_goals > NEW.away_goals
        THEN NEW.home_id
      ELSE NEW.away_id
    END;
  END IF;

  -- Переможець не змінився
  IF old_winner IS NOT DISTINCT FROM new_winner THEN
    RETURN NEW;
  END IF;

  IF NEW.round IS NULL OR NEW.round < 1 THEN
    RAISE EXCEPTION
      'Неможливо визначити місце матчу в сітці';
  END IF;

  next_slot := CEIL(NEW.round::numeric / 2)::integer;

  -- Блокуємо відповідний наступний матч
  FOR next_match IN
    SELECT *
    FROM public.matches
    WHERE season = NEW.season
      AND competition = NEW.competition
      AND stage = next_stage
      AND round = next_slot
    FOR UPDATE
  LOOP
    found_matches := found_matches + 1;

    IF found_matches > 1 THEN
      RAISE EXCEPTION
        'Знайдено кілька матчів в одному слоті наступного раунду';
    END IF;
  END LOOP;

  -- Наступний раунд ще не створений
  IF found_matches = 0 THEN
    RETURN NEW;
  END IF;

  -- Захист завершених або вже розпочатих матчів
  IF next_match.status <> 'scheduled'
     OR next_match.home_goals IS NOT NULL
     OR next_match.away_goals IS NOT NULL
     OR next_match.played_at IS NOT NULL THEN
    RAISE EXCEPTION
      'Неможливо змінити переможця: наступний матч уже має результат або розпочатий';
  END IF;

  IF new_winner IS NULL THEN
    RAISE EXCEPTION
      'Наступний раунд уже створений, але новий переможець не визначений';
  END IF;

  -- Якщо вперше внесли рахунок,
  -- перевіряємо вже сформований наступний раунд
  IF old_winner IS NULL THEN
    IF next_match.home_id = new_winner
       OR next_match.away_id = new_winner THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION
      'Наступний раунд створений, але його учасники не відповідають новому переможцю';
  END IF;

  -- Оновлюємо саме місце попереднього переможця
  IF next_match.home_id = old_winner THEN
    UPDATE public.matches
    SET home_id = new_winner
    WHERE id = next_match.id;

  ELSIF next_match.away_id = old_winner THEN
    UPDATE public.matches
    SET away_id = new_winner
    WHERE id = next_match.id;

  ELSIF next_match.home_id = new_winner
     OR next_match.away_id = new_winner THEN
    -- Наступна пара вже правильна
    RETURN NEW;

  ELSE
    RAISE EXCEPTION
      'У наступній парі немає попереднього переможця. Потрібна ручна перевірка';
  END IF;

  RETURN NEW;
END;
$function$;

-- CREATE TRIGGER lacks IF NOT EXISTS: avoid a duplicate if this baseline is
-- applied to a Supabase project where the trigger was created manually.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'matches'
      AND t.tgname = 'trg_sync_division_cup_winner'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER trg_sync_division_cup_winner
    AFTER UPDATE OF home_goals, away_goals, status
    ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_division_cup_winner();
  END IF;
END;
$do$;
