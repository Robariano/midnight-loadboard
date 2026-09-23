// Supabase Edge Function: check-fmcsa
//
// Server-side FMCSA QCMobile lookup. This exists so the FMCSA webKey never
// has to live in client-side JS (it used to be hardcoded in admin.html,
// readable by anyone who viewed the page source on this public static site —
// see the git history for that fix). The webKey lives only as a Supabase
// secret, read here via Deno.env.get, same pattern as RESEND_API_KEY in the
// send-email function.
//
// Field-parsing and verdict logic below is a direct port of
// fmcsa-check/fmcsa_batch_check.py from this same project — confirmed
// against a real captured FMCSA response there (see that script's comments
// and its test_logic.py/test_integration.py). Keep the two in sync if the
// verdict rules ever change.
//
// Request body:
//   { dot_mc: string }             -> looks up FMCSA only, does not touch the DB
//   { dot_mc: string, id: string } -> looks up FMCSA AND writes the result
//                                      onto verifications row `id` (used by
//                                      get-verified.html right after a
//                                      submission, and by admin.html's
//                                      "Check FMCSA" button when re-checking
//                                      an existing row)
//
// Response: { ok: true, result: {...} } or { ok: false, error: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FMCSA_WEBKEY = Deno.env.get('FMCSA_WEBKEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const API_BASE = 'https://mobile.fmcsa.dot.gov/qc/services/carriers'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESULT_COLUMNS = [
  'fmcsa_checked_at',
  'fmcsa_lookup_status',
  'allowed_to_operate',
  'out_of_service',
  'oos_date',
  'common_authority_status',
  'contract_authority_status',
  'has_active_for_hire_authority',
  'bipd_insurance_on_file',
  'cargo_insurance_on_file',
  'safety_rating',
  'fmcsa_verdict',
] as const

type Result = Record<(typeof RESULT_COLUMNS)[number], string>

function emptyResult(): Result {
  const r = {} as Result
  for (const c of RESULT_COLUMNS) r[c] = ''
  r.fmcsa_checked_at = new Date().toISOString()
  return r
}

function yn(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value).trim().toUpperCase()
  if (['Y', 'YES', 'TRUE', '1'].includes(s)) return 'Y'
  if (['N', 'NO', 'FALSE', '0'].includes(s)) return 'N'
  return s
}

// The QCMobile API wraps results inconsistently across endpoints
// (sometimes {content: {carrier: {...}}}, sometimes a list under
// "content"). Dig through common shapes rather than assuming one —
// mirrors extract_carrier_object() in fmcsa_batch_check.py.
function extractCarrierObject(payload: any): Record<string, any> {
  if (!payload) return {}
  let content = payload.content ?? payload
  if (Array.isArray(content)) {
    if (content.length === 0) return {}
    content = content[0]
  }
  if (content && typeof content === 'object' && 'carrier' in content) return content.carrier
  if (content && typeof content === 'object' && 'carrierAuthority' in content) return content.carrierAuthority
  return content && typeof content === 'object' ? content : {}
}

async function callApi(path: string): Promise<{ payload: any; status: 'ok' | 'not_found' }> {
  const url = `${API_BASE}${path}?webKey=${encodeURIComponent(FMCSA_WEBKEY)}`
  const resp = await fetch(url)
  if (resp.status === 404) return { payload: null, status: 'not_found' }
  if (!resp.ok) throw new Error(`FMCSA HTTP ${resp.status}`)
  return { payload: await resp.json(), status: 'ok' }
}

// Mirrors build_verdict() in fmcsa_batch_check.py.
function buildVerdict(r: Result): string {
  if (r.fmcsa_lookup_status === 'not_found') {
    return 'Not found in FMCSA system — double-check the DOT/MC number before proceeding.'
  }
  if (r.fmcsa_lookup_status !== 'ok') {
    return 'Lookup failed — check manually on safer.fmcsa.dot.gov before relying on this.'
  }
  if (r.allowed_to_operate === 'N' || r.out_of_service === 'Y') {
    return 'NOT allowed to operate / out of service — do not approve.'
  }
  if (r.has_active_for_hire_authority !== 'Y') {
    return (
      'No ACTIVE for-hire operating authority yet (common/contract authority ' +
      'both show not-active). Common for a very recent registration — FMCSA ' +
      'usually takes several weeks between issuing a DOT number and granting ' +
      'operating authority. Could also mean it was revoked or never fully ' +
      "granted; FMCSA's status code doesn't distinguish which. Worth asking " +
      'directly rather than rejecting outright, but do not treat as bookable ' +
      'until authority shows active.'
    )
  }
  if (r.bipd_insurance_on_file === 'Y') {
    return 'Active, authorized for-hire, insurance on file.'
  }
  return (
    'Active and authorized for-hire, but insurance not showing on file — ' +
    'could be a genuinely new authority still syncing through Motus, not ' +
    'necessarily a red flag. Get a Certificate of Insurance and confirm with ' +
    'the insurer directly before approving.'
  )
}

async function checkOneDot(dotDigits: string, isMC: boolean): Promise<Result> {
  const result = emptyResult()

  let lookup: { payload: any; status: 'ok' | 'not_found' }
  try {
    lookup = isMC
      ? await callApi(`/docket-number/${dotDigits}`)
      : await callApi(`/${dotDigits}`)
  } catch (_e) {
    result.fmcsa_lookup_status = 'api_error'
    result.fmcsa_verdict = buildVerdict(result)
    return result
  }

  if (lookup.status === 'not_found') {
    result.fmcsa_lookup_status = 'not_found'
    result.fmcsa_verdict = buildVerdict(result)
    return result
  }

  const carrier = extractCarrierObject(lookup.payload)
  result.fmcsa_lookup_status = 'ok'
  result.allowed_to_operate = yn(carrier.allowedToOperate)
  const oosDate = carrier.oosDate || ''
  result.oos_date = oosDate
  result.out_of_service = oosDate ? 'Y' : 'N'

  let commonStatus = String(carrier.commonAuthorityStatus || '').trim().toUpperCase()
  let contractStatus = String(carrier.contractAuthorityStatus || '').trim().toUpperCase()
  result.common_authority_status = commonStatus
  result.contract_authority_status = contractStatus
  result.has_active_for_hire_authority = commonStatus === 'A' || contractStatus === 'A' ? 'Y' : 'N'
  result.bipd_insurance_on_file = yn(carrier.bipdInsuranceOnFile)
  result.cargo_insurance_on_file = yn(carrier.cargoInsuranceOnFile)
  result.safety_rating = carrier.safetyRating || ''

  // Fallback only if the main call returned no authority fields at all.
  if (!commonStatus && !contractStatus) {
    try {
      const authLookup = await callApi(`/${dotDigits}/authority`)
      if (authLookup.status === 'ok') {
        const auth = extractCarrierObject(authLookup.payload)
        if (auth && Object.keys(auth).length) {
          commonStatus = String(auth.commonAuthorityStatus || '').trim().toUpperCase()
          contractStatus = String(auth.contractAuthorityStatus || '').trim().toUpperCase()
          result.common_authority_status = commonStatus
          result.contract_authority_status = contractStatus
          result.has_active_for_hire_authority = commonStatus === 'A' || contractStatus === 'A' ? 'Y' : 'N'
          result.bipd_insurance_on_file = yn(auth.bipdInsuranceOnFile) || result.bipd_insurance_on_file
          result.cargo_insurance_on_file = yn(auth.cargoInsuranceOnFile) || result.cargo_insurance_on_file
        }
      }
    } catch (_e) {
      // basics data still stands; not fatal
    }
  }

  result.fmcsa_verdict = buildVerdict(result)
  return result
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!FMCSA_WEBKEY) {
      throw new Error('FMCSA_WEBKEY secret is not set for this function.')
    }

    const { dot_mc, id } = await req.json()
    if (!dot_mc || typeof dot_mc !== 'string') {
      throw new Error('dot_mc is required')
    }

    const isMC = /mc/i.test(dot_mc) && !/dot/i.test(dot_mc)
    const digitsMatch = dot_mc.match(/\d+/)
    if (!digitsMatch) {
      const result = emptyResult()
      result.fmcsa_lookup_status = 'no_dot_number'
      result.fmcsa_verdict = `Could not find a number in "${dot_mc}" to look up.`
      return new Response(JSON.stringify({ ok: true, result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await checkOneDot(digitsMatch[0], isMC)

    if (id) {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
      const { error } = await supabase.from('verifications').update(result).eq('id', id)
      if (error) throw new Error('Saved FMCSA result failed to write to DB: ' + error.message)
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
