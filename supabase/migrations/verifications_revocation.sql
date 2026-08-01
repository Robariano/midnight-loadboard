-- Adds manual carrier revocation (fraud, false documents, etc.) as a
-- separate flag from status, so a carrier's original approval history
-- isn't erased -- matches the intent already stated in terms.html:
-- "A verified carrier credential stays on a carrier's record once issued...
--  we maintain this separate, public list."

alter table verifications
  add column if not exists revoked boolean not null default false,
  add column if not exists revoked_reason text,
  add column if not exists revoked_at timestamptz;

-- IMPORTANT: this repo has no prior migration files, so the existing RLS
-- policy on `verifications` (the one letting carriers.html read
-- status=eq.approved rows with the anon key) isn't version-controlled and
-- isn't visible to me. Check what it actually says in the Supabase
-- dashboard before applying this -- if it's scoped narrowly to
-- `status = 'approved'`, revoked rows won't be readable by anon until you
-- either broaden it (below) or add a second policy.

-- Suggested replacement/addition -- adjust to match whatever the existing
-- policy is actually named:
drop policy if exists "anon can read approved verifications" on verifications;
create policy "anon can read approved or revoked verifications"
  on verifications for select
  to anon
  using (status = 'approved' or revoked = true);
