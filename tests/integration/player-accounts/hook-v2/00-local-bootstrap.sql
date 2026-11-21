-- Disposable local DB only; never apply to Production.
DO $r$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin NOLOGIN; END IF;
END;
$r$;
CREATE TABLE public.il_prod_discord_allowlist_v1(discord_user_id text PRIMARY KEY);
INSERT INTO public.il_prod_discord_allowlist_v1(discord_user_id) VALUES('123456789012345678');
CREATE FUNCTION public.il_prod_before_user_created_allowlist_v1(event jsonb)
RETURNS jsonb LANGUAGE sql AS $fn$ SELECT '{}'::jsonb $fn$;
