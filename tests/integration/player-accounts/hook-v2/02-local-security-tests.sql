-- Run ONLY after bootstrap + v2 SQL in a disposable local DB.
-- Test closed, current allowlist, Discord-only, malformed metadata, open, and
-- execute/grant boundaries. Transaction rolls back toggle test.
DO $checks$
DECLARE
  known jsonb := '{"user":{"app_metadata":{"provider":"discord"},"user_metadata":{"sub":"123456789012345678","provider_id":"123456789012345678"}}}';
  unknown jsonb := '{"user":{"app_metadata":{"provider":"discord"},"user_metadata":{"sub":"223456789012345678","provider_id":"223456789012345678"}}}';
  email_signup jsonb := '{"user":{"app_metadata":{"provider":"email"},"user_metadata":{"sub":"123456789012345678","provider_id":"123456789012345678"}}}';
  malformed jsonb := '{"user":{"app_metadata":{"provider":"discord"},"user_metadata":{"sub":"123456789012345678","provider_id":"223456789012345678"}}}';
BEGIN
  IF public.il_prod_before_user_created_discord_v2(known) <> '{}'::jsonb
  THEN RAISE EXCEPTION 'STOP: allowlisted Discord should work when public is OFF'; END IF;
  IF (public.il_prod_before_user_created_discord_v2(unknown) #>> '{error,http_code}') <> '403'
  THEN RAISE EXCEPTION 'STOP: unknown Discord must be blocked when public is OFF'; END IF;
  IF (public.il_prod_before_user_created_discord_v2(email_signup) #>> '{error,http_code}') <> '403'
  THEN RAISE EXCEPTION 'STOP: email signups must always be blocked'; END IF;
  IF (public.il_prod_before_user_created_discord_v2(malformed) #>> '{error,http_code}') <> '403'
  THEN RAISE EXCEPTION 'STOP: mismatched metadata must always be blocked'; END IF;
  IF (public.il_prod_before_user_created_discord_v2('{}'::jsonb) #>> '{error,http_code}') <> '403'
  THEN RAISE EXCEPTION 'STOP: empty event must be blocked'; END IF;
  IF pg_catalog.has_function_privilege('authenticated', 'public.il_prod_before_user_created_discord_v2(jsonb)', 'EXECUTE')
     OR pg_catalog.has_function_privilege('anon', 'public.il_prod_before_user_created_discord_v2(jsonb)', 'EXECUTE')
     OR pg_catalog.has_function_privilege('service_role', 'public.il_prod_before_user_created_discord_v2(jsonb)', 'EXECUTE')
  THEN RAISE EXCEPTION 'STOP: untrusted role can execute hook'; END IF;
  IF NOT pg_catalog.has_function_privilege('supabase_auth_admin', 'public.il_prod_before_user_created_discord_v2(jsonb)', 'EXECUTE')
  THEN RAISE EXCEPTION 'STOP: auth_admin cannot execute hook'; END IF;
  IF pg_catalog.has_table_privilege('authenticated', 'public.il_prod_discord_signup_control_v2', 'UPDATE')
     OR pg_catalog.has_table_privilege('anon', 'public.il_prod_discord_signup_control_v2', 'UPDATE')
     OR pg_catalog.has_table_privilege('service_role', 'public.il_prod_discord_signup_control_v2', 'UPDATE')
  THEN RAISE EXCEPTION 'STOP: untrusted role can change open/close flag'; END IF;
END;
$checks$;

-- Verify Supabase Auth role can execute SECURITY DEFINER despite table RLS.
SET ROLE supabase_auth_admin;
DO $auth$
DECLARE
  event jsonb := '{"user":{"app_metadata":{"provider":"discord"},"user_metadata":{"sub":"123456789012345678","provider_id":"123456789012345678"}}}';
BEGIN
  IF public.il_prod_before_user_created_discord_v2(event) <> '{}'::jsonb
  THEN RAISE EXCEPTION 'STOP: auth hook cannot read private allowlist'; END IF;
END;
$auth$;
RESET ROLE;

BEGIN;
UPDATE public.il_prod_discord_signup_control_v2
   SET public_signup_enabled=true,updated_at=now()
 WHERE singleton_id=1;
DO $open$
DECLARE
  stranger jsonb := '{"user":{"app_metadata":{"provider":"discord"},"user_metadata":{"sub":"223456789012345678","provider_id":"223456789012345678"}}}';
  email_signup jsonb := '{"user":{"app_metadata":{"provider":"email"},"user_metadata":{"sub":"123456789012345678","provider_id":"123456789012345678"}}}';
BEGIN
  IF public.il_prod_before_user_created_discord_v2(stranger) <> '{}'::jsonb
  THEN RAISE EXCEPTION 'STOP: public Discord must work when explicitly opened'; END IF;
  IF (public.il_prod_before_user_created_discord_v2(email_signup) #>> '{error,http_code}') <> '403'
  THEN RAISE EXCEPTION 'STOP: non-Discord provider must remain blocked when opened'; END IF;
END;
$open$;
ROLLBACK;

DO $closed_again$
DECLARE
  stranger jsonb := '{"user":{"app_metadata":{"provider":"discord"},"user_metadata":{"sub":"223456789012345678","provider_id":"223456789012345678"}}}';
BEGIN
  IF (public.il_prod_before_user_created_discord_v2(stranger) #>> '{error,http_code}') <> '403'
  THEN RAISE EXCEPTION 'STOP: public setting should be OFF after test rollback'; END IF;
END;
$closed_again$;
SELECT 'PASS: Discord Hook v2 local policy, role, rollback tests' AS result;
