// Supabase Edge Function: send-email
// Sends templated transactional emails via Resend. The client can only request
// "send the notification for record X" — it cannot supply an arbitrary recipient,
// subject, or body. All actual email content is built server-side from the
// database record, using the service role key (never exposed to the client).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL = 'Midnight Loadboard <onboarding@resend.dev>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, id } = await req.json()
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    let to = ''
    let subject = ''
    let html = ''

    if (type === 'verification_decision') {
      const { data: v } = await supabase.from('verifications').select('*').eq('id', id).single()
      if (!v || !v.email) throw new Error('Verification not found')
      to = v.email
      if (v.status === 'approved') {
        subject = "You're verified — Midnight Loadboard"
        html = `<p>Hi ${v.name || 'there'},</p><p>Your carrier verification is approved. You're now listed on our <a href="https://midnightloadboard.com/carriers.html">Carriers page</a> and can claim loads on <a href="https://midnightloadboard.com/loads.html">Browse Loads</a>.</p><p>— Midnight Loadboard</p>`
      } else if (v.status === 'rejected') {
        subject = 'Update on your Midnight Loadboard verification'
        html = `<p>Hi ${v.name || 'there'},</p><p>We weren't able to verify your documents this time. Reply to this email if you'd like to resubmit or have questions.</p><p>— Midnight Loadboard</p>`
      } else {
        throw new Error('Verification not in a decided state')
      }
    } else if (type === 'load_published') {
      const { data: r } = await supabase.from('load_requests').select('*').eq('id', id).single()
      if (!r || !r.email) throw new Error('Load request not found')
      to = r.email
      subject = 'Your load is live — Midnight Loadboard'
      html = `<p>Hi ${r.name || 'there'},</p><p>Your load (${r.pickup} → ${r.delivery}) is now live on <a href="https://midnightloadboard.com/loads.html">Browse Loads</a>. We'll let you know when a verified carrier claims it.</p><p>— Midnight Loadboard</p>`
    } else if (type === 'load_claimed') {
      const { data: c } = await supabase.from('claims').select('*').eq('id', id).single()
      if (!c || !c.shipper_email) throw new Error('Claim or shipper email not found')
      to = c.shipper_email
      subject = 'Your load was claimed — Midnight Loadboard'
      html = `<p>Hi there,</p><p>${c.carrier_name || 'A verified carrier'} claimed your load (${c.route || ''}). They'll be in touch to confirm pickup details${c.carrier_email ? ' — you can also reach them directly at ' + c.carrier_email : ''}.</p><p>— Midnight Loadboard</p>`
    } else {
      throw new Error('Unknown notification type')
    }

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    })

    if (!resendResp.ok) {
      const errText = await resendResp.text()
      throw new Error('Resend error: ' + errText)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
