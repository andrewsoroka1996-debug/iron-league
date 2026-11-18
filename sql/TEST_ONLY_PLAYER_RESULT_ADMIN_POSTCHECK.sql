-- Read-only post-check, TEST project only. Expected: 0 decisions initially,
-- RLS true, authenticated_can_execute_rpc false, service_role_can_execute_rpc true.
SELECT
  (SELECT COUNT(*) FROM public.player_result_submission_decisions) AS decision_rows,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.player_result_submission_decisions'::regclass) AS decisions_rls_enabled,
  has_function_privilege('authenticated', 'public.admin_decide_player_result_submission(uuid,text,integer,text)', 'EXECUTE') AS authenticated_can_execute_rpc,
  has_function_privilege('service_role', 'public.admin_decide_player_result_submission(uuid,text,integer,text)', 'EXECUTE') AS service_role_can_execute_rpc;
