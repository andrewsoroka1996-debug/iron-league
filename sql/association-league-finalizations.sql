-- Iron League / Association League finalizations — manual migration.
-- Run in Supabase SQL Editor ONLY AFTER reviewing. No data migration or backfill.
-- Season 2 is immutable and continues to use its historic result in code.

create table if not exists public.association_league_finalizations (
  season integer primary key check (season >= 3),
  association_id text not null,
  association_name text not null,
  member_ids text[] not null check (array_length(member_ids, 1) = 6),
  league_points numeric not null,
  frozen_rows jsonb not null check (
    jsonb_typeof(frozen_rows) = 'array' and jsonb_array_length(frozen_rows) = 8
  ),
  preview_hash text not null,
  finalized_at timestamptz not null default now()
);

alter table public.association_league_finalizations enable row level security;
revoke all on public.association_league_finalizations from anon, authenticated;
-- Server-side Supabase service_role key only. No public insert/update/delete policy.
grant select, insert on public.association_league_finalizations to service_role;

-- Intentional: do NOT seed Season 3/4. A trophy requires explicit finalization.

-- Database-level protection against accidental UPDATE/DELETE of confirmed results.
-- To correct a mistaken finalization, a separately reviewed manual recovery is required.
create or replace function public.protect_association_league_finalization()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Association League finalization is immutable. Manual recovery is required.';
end;
$$;

drop trigger if exists association_league_finalization_immutable on public.association_league_finalizations;
create trigger association_league_finalization_immutable
before update or delete on public.association_league_finalizations
for each row execute function public.protect_association_league_finalization();
