-- Adds columns to hold the server-side FMCSA check result (from the new
-- check-fmcsa Edge Function), so a verification row carries its FMCSA
-- data alongside the human-submitted documents rather than that data
-- living only in a transient on-screen result in admin.html.
--
-- Column names match fmcsa-check/fmcsa_batch_check.py's RESULT_COLUMNS
-- (the script this Edge Function's logic was ported from), except
-- "verdict" is namespaced to fmcsa_verdict here so it isn't confused with
-- the human admin's own approve/reject decision, which already uses the
-- column name `status`.
--
-- Note on RLS: as with verifications_revocation.sql before this, the base
-- `verifications` table and its RLS policy predate any migration file in
-- this repo, so I can't see the exact policy from here. Postgres RLS
-- controls row visibility, not column visibility, so these new columns
-- inherit whatever policy already governs the row (e.g. the anon policy on
-- carriers.html reading `status = 'approved'` rows). That means an
-- approved carrier's safety_rating / insurance-on-file fields become
-- visible to anyone reading the public Carriers page's underlying data --
-- not sensitive info, but worth knowing since carriers.html wasn't built
-- expecting those columns to exist.

alter table verifications
  add column if not exists fmcsa_checked_at timestamptz,
  add column if not exists fmcsa_lookup_status text,
  add column if not exists allowed_to_operate text,
  add column if not exists out_of_service text,
  add column if not exists oos_date text,
  add column if not exists common_authority_status text,
  add column if not exists contract_authority_status text,
  add column if not exists has_active_for_hire_authority text,
  add column if not exists bipd_insurance_on_file text,
  add column if not exists cargo_insurance_on_file text,
  add column if not exists safety_rating text,
  add column if not exists fmcsa_verdict text;
