-- Coverage Confirmation feature
-- Design goal (per the site's own marketing copy): a driver's individual
-- answer must never be readable by the carrier or by the public anon key.
-- Only aggregate flag counts, and a boolean "revoked" status, are exposed.

-- 1. Raw checks — write-only from the public/anon side, never publicly readable.
create table if not exists coverage_checks (
  id uuid primary key default gen_random_uuid(),
  driver_name text not null,
  driver_email text not null,
  carrier_name text,
  carrier_email text,           -- normalized lowercase, used to key aggregation
  load_ref text,                -- free-text route/load reference
  is_covered boolean not null,  -- the private attestation itself
  created_at timestamptz not null default now()
);

alter table coverage_checks enable row level security;

-- Anyone (including anonymous drivers with no account) can submit a check.
create policy "anon can insert coverage checks"
  on coverage_checks for insert
  to anon
  with check (true);

-- Nobody using the anon key can read raw rows — not the carrier, not the public.
-- Only the service role (used server-side, e.g. by the admin panel/edge functions)
-- can read this table directly. No SELECT policy is created for `anon`.

-- 2. Aggregate, carrier-facing table — this is what's actually public.
create table if not exists carrier_coverage_stats (
  carrier_email text primary key,
  carrier_name text,
  checked_count integer not null default 0,
  flagged_count integer not null default 0,
  revoked boolean not null default false,
  revoked_reason text,
  updated_at timestamptz not null default now()
);

alter table carrier_coverage_stats enable row level security;

create policy "anyone can read carrier coverage stats"
  on carrier_coverage_stats for select
  to anon
  using (true);

-- No anon insert/update policy — this table is only ever written by the
-- trigger function below (runs as the function owner, bypassing RLS),
-- so the anon key can never directly inflate or erase a carrier's record.

-- 3. Trigger: on every new coverage check, roll it into the aggregate.
-- Revoke automatically at 3+ flags — matches the threshold used elsewhere
-- on the site (adjust to whatever the team decides is the right number).
create or replace function update_carrier_coverage_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.carrier_email is null or new.carrier_email = '' then
    return new;
  end if;

  insert into carrier_coverage_stats (carrier_email, carrier_name, checked_count, flagged_count)
  values (lower(new.carrier_email), new.carrier_name, 1, case when new.is_covered then 0 else 1 end)
  on conflict (carrier_email) do update
    set checked_count = carrier_coverage_stats.checked_count + 1,
        flagged_count = carrier_coverage_stats.flagged_count + case when new.is_covered then 0 else 1 end,
        carrier_name = coalesce(carrier_coverage_stats.carrier_name, new.carrier_name),
        updated_at = now();

  update carrier_coverage_stats
    set revoked = true,
        revoked_reason = 'Repeated uncovered-driver flags'
    where carrier_email = lower(new.carrier_email)
      and flagged_count >= 3
      and revoked = false;

  return new;
end;
$$;

drop trigger if exists trg_update_carrier_coverage_stats on coverage_checks;
create trigger trg_update_carrier_coverage_stats
  after insert on coverage_checks
  for each row execute function update_carrier_coverage_stats();

-- Manual admin override, for the "believe a listing here is a mistake" path
-- already promised on revoked-credentials.html:
--   update carrier_coverage_stats set revoked = false, revoked_reason = null
--   where carrier_email = '...';
-- (run as service role / from the admin panel only — no anon update policy exists)
