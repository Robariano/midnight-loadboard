# Midnight Loadboard

A free load board for owner-operators and small carriers, with a private
driver coverage-confirmation tool: a way to confirm that the driver behind
the wheel is actually a named/listed driver on the carrier's active policy
for a given trip — not just that the truck itself carries valid insurance.

Live at [midnightloadboard.com](https://midnightloadboard.com).

## What's in this repo

Static HTML/JS pages, deployed as-is (no build step required), backed by
Supabase for data storage, auth, and row-level security.

| Page | Purpose |
|---|---|
| `index.html` | Landing page |
| `loads.html` | Browse/claim open loads |
| `post-a-load.html` | Post a load (shippers) |
| `get-verified.html` | Carrier document submission for verification |
| `carriers.html` | Public list of verified carriers |
| `confirm-coverage.html` | Private driver coverage attestation |
| `revoked-credentials.html` | Public list of carriers with revoked status |
| `admin.html` | Admin review/approval panel (Supabase-authenticated) |
| `rate-confirmation.html` | Rate confirmation generator |
| `about-founder.html`, `terms.html`, `privacy.html` | Static content |

`supabase/functions/send-email/` — a Supabase Edge Function that sends
transactional email (via Resend) for verification decisions and other
notifications. Content is rendered server-side from the database record;
the service role key never reaches the client.

`supabase/migrations/` — SQL migrations, including the schema for the
coverage-check feature (`coverage_checks` + the privacy-preserving
`carrier_coverage_stats` aggregate table).

## Local development

```bash
npm install
npm run dev
```

Serves the static site locally at `http://localhost:8080`.

## Environment / secrets

The Supabase project URL and **publishable** anon key are intentionally
public in the client-side code (that's what a publishable key is for —
access is enforced by row-level security policies, not by hiding the key).

The **service role key** and `RESEND_API_KEY` used by the Edge Function are
set as Supabase secrets and are never committed to this repo.

## Contributing / Security / Conduct

See `CONTRIBUTING.md`, `SECURITY.md`, and `CODE_OF_CONDUCT.md`.
