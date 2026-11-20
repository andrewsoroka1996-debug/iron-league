-- IRON LEAGUE | REVIEW ONLY - NOT EXECUTED BY INSTALLER
-- This is a proposed migration for a future, separately approved DB change.
-- DO NOT RUN YET. Before executing against Production, review current schema,
-- RLS, privileges, Discord Auth hook, integration tests and rollback plan.
-- This creates an intake queue; NO player creation, ownership approval or tournament mutation.
-- Refuse to silently reuse an incompatible existing table.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.player_profile_creation_requests') IS NOT NULL THEN
    RAISE EXCEPTION 'Table player_profile_creation_requests already exists. Stop; inspect before proceeding.';
  END IF;
END
$$;

CREATE TABLE public.player_profile_creation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  desired_nickname text NOT NULL CHECK (
    char_length(trim(desired_nickname)) BETWEEN 3 AND 32
  ),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decision_reason text,
  CONSTRAINT decision_consistency CHECK (
    (status = 'pending' AND decided_at IS NULL AND decision_reason IS NULL)
    OR
    (status = 'rejected' AND decided_at IS NOT NULL
      AND char_length(decision_reason) BETWEEN 5 AND 500)
  )
);

CREATE UNIQUE INDEX one_pending_profile_request_per_auth_user
  ON public.player_profile_creation_requests (auth_user_id)
  WHERE status = 'pending';

CREATE INDEX profile_request_admin_queue
  ON public.player_profile_creation_requests (status, created_at);

ALTER TABLE public.player_profile_creation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_profile_creation_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_profile_creation_requests TO authenticated;
GRANT INSERT (auth_user_id, desired_nickname, note)
  ON public.player_profile_creation_requests TO authenticated;
GRANT ALL ON public.player_profile_creation_requests TO service_role;

CREATE POLICY applicant_reads_only_own_profile_requests
  ON public.player_profile_creation_requests
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = auth_user_id);

CREATE POLICY applicant_inserts_only_own_pending_profile_request
  ON public.player_profile_creation_requests
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = auth_user_id AND status = 'pending'
    AND decided_at IS NULL AND decision_reason IS NULL);

COMMIT;

-- READ-ONLY post-check (only after explicit approval and manual execution):
-- SELECT c.relname, c.relrowsecurity FROM pg_class c
-- WHERE c.oid = 'public.player_profile_creation_requests'::regclass;
-- SELECT policyname, cmd, roles FROM pg_policies
-- WHERE schemaname='public' AND tablename='player_profile_creation_requests';
