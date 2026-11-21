-- IRON LEAGUE / BEFORE USER CREATED / V2 / REVIEW ONLY.
-- DO NOT RUN IN PRODUCTION WITHOUT EXPLICIT SEPARATE APPROVAL.
-- Running this script only creates an INACTIVE hook function and an OFF-by-default
-- control table. Supabase continues using its current configured hook until an
-- authorized human changes Authentication > Hooks in the Dashboard.
-- The existing il_prod_before_user_created_allowlist_v1 is NOT modified.
BEGIN;

DO $preflight$
BEGIN
  IF to_regprocedure('public.il_prod_before_user_created_allowlist_v1(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'STOP: existing production pilot hook v1 is missing';
  END IF;
  IF to_regclass('public.il_prod_discord_allowlist_v1') IS NULL THEN
    RAISE EXCEPTION 'STOP: existing production pilot allowlist is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.il_prod_discord_allowlist_v1'::regclass
      AND attname = 'discord_user_id' AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'STOP: allowlist discord_user_id field is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='supabase_auth_admin') THEN
    RAISE EXCEPTION 'STOP: supabase_auth_admin role is missing';
  END IF;
  IF to_regclass('public.il_prod_discord_signup_control_v2') IS NOT NULL
     OR to_regprocedure('public.il_prod_before_user_created_discord_v2(jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: v2 objects already exist; do not overwrite';
  END IF;
END;
$preflight$;

CREATE TABLE public.il_prod_discord_signup_control_v2 (
  singleton_id integer PRIMARY KEY DEFAULT 1 CHECK (singleton_id = 1),
  public_signup_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

-- In Production public schema may have broad default grants. Override them
-- in the SAME transaction and enable RLS with no browser policies.
REVOKE ALL ON TABLE public.il_prod_discord_signup_control_v2
  FROM PUBLIC, anon, authenticated, service_role, supabase_auth_admin;
ALTER TABLE public.il_prod_discord_signup_control_v2 ENABLE ROW LEVEL SECURITY;
INSERT INTO public.il_prod_discord_signup_control_v2
  (singleton_id, public_signup_enabled) VALUES (1, false);

CREATE FUNCTION public.il_prod_before_user_created_discord_v2(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_provider text;
  v_sub text;
  v_provider_id text;
  v_public_open boolean := false;
  v_allowlisted boolean := false;
BEGIN
  -- app_metadata.provider is assigned by Supabase Auth; client-controlled
  -- user_metadata MUST NOT be used on its own as proof of provider identity.
  v_provider := event #>> '{user,app_metadata,provider}';
  v_sub := event #>> '{user,user_metadata,sub}';
  v_provider_id := event #>> '{user,user_metadata,provider_id}';

  IF v_provider = 'discord'
     AND v_sub ~ '^[0-9]{17,20}$'
     AND v_provider_id ~ '^[0-9]{17,20}$'
     AND v_sub = v_provider_id THEN

    -- Missing control row => public signup remains closed.
    SELECT COALESCE((
      SELECT public_signup_enabled
      FROM public.il_prod_discord_signup_control_v2
      WHERE singleton_id = 1
    ), false) INTO v_public_open;

    IF v_public_open THEN
      RETURN '{}'::jsonb;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.il_prod_discord_allowlist_v1
      WHERE discord_user_id = v_sub
    ) INTO v_allowlisted;
    IF v_allowlisted THEN
      RETURN '{}'::jsonb;
    END IF;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'error', pg_catalog.jsonb_build_object(
      'http_code', 403,
      'message', 'Registration is not allowed for this account.'
    )
  );
END;
$fn$;

-- SECURITY DEFINER functions receive PUBLIC EXECUTE by default; remove it.
REVOKE ALL ON FUNCTION public.il_prod_before_user_created_discord_v2(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.il_prod_before_user_created_discord_v2(jsonb)
  TO supabase_auth_admin;

-- Postflight assertions inside the transaction.
DO $checks$
BEGIN
  IF (SELECT public_signup_enabled
      FROM public.il_prod_discord_signup_control_v2 WHERE singleton_id=1) IS DISTINCT FROM false
  THEN RAISE EXCEPTION 'STOP: v2 public signup must be false by default'; END IF;
  IF pg_catalog.has_function_privilege('authenticated',
       'public.il_prod_before_user_created_discord_v2(jsonb)', 'EXECUTE')
    OR pg_catalog.has_function_privilege('anon',
       'public.il_prod_before_user_created_discord_v2(jsonb)', 'EXECUTE')
    OR NOT pg_catalog.has_function_privilege('supabase_auth_admin',
       'public.il_prod_before_user_created_discord_v2(jsonb)', 'EXECUTE')
  THEN RAISE EXCEPTION 'STOP: hook EXECUTE grants are unsafe'; END IF;
  IF pg_catalog.has_table_privilege('authenticated',
       'public.il_prod_discord_signup_control_v2', 'UPDATE')
  THEN RAISE EXCEPTION 'STOP: browser can change signup policy'; END IF;
END;
$checks$;
COMMIT;
