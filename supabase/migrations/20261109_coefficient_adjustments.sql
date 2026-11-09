-- Iron League / Season 3. APPEND-ONLY administrative coefficient decisions.
-- Run this SQL ONCE in Supabase SQL Editor before deploying the code.
-- Does not update any matches, season 1/2 history, or existing coefficients.
BEGIN;

CREATE TABLE IF NOT EXISTS public.coefficient_adjustment_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season smallint NOT NULL CHECK (season = 3),
  player_id text NOT NULL CHECK (char_length(player_id) BETWEEN 1 AND 100),
  scope text NOT NULL CHECK (scope IN ('europe', 'all')),
  mode text NOT NULL CHECK (mode IN ('zero', 'penalty', 'clear')),
  points integer NOT NULL DEFAULT 0 CHECK (points BETWEEN 0 AND 100000),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 5 AND 400),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT coefficient_adjustment_event_points_check CHECK (
    (mode = 'penalty' AND points > 0) OR
    (mode IN ('zero','clear') AND points = 0)
  )
);

CREATE INDEX IF NOT EXISTS coefficient_adjustment_events_player_idx
  ON public.coefficient_adjustment_events (season, player_id, id DESC);

ALTER TABLE public.coefficient_adjustment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.coefficient_adjustment_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.coefficient_adjustment_events TO service_role;

-- The last event for each player is their only active decision.
-- SECURITY INVOKER prevents a privileged-owner view from bypassing RLS.
CREATE OR REPLACE VIEW public.coefficient_adjustments_current
WITH (security_invoker = true) AS
SELECT DISTINCT ON (season, player_id)
  id, season, player_id, scope, mode, points, reason, created_at
FROM public.coefficient_adjustment_events
ORDER BY season, player_id, id DESC;

REVOKE ALL ON TABLE public.coefficient_adjustments_current FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.coefficient_adjustments_current TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
