// File: supabase/functions/send-followup-email/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = { 'Access-Control-Allow-Origin': '*' }

serve(async (req) => {
  // Tangani preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ambil data 'record' yang dikirim oleh webhook Supabase
    const { record } = await req.json();
    const { client_name, client_email, service_type } = record;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      // Kirim email ke klien
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${resendApiKey}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          from: 'Ixiera <onboarding@resend.dev>',
          to: [client_email],
          subject: 'Terima Kasih Telah Menghubungi Ixiera!',
          html: `<p>Halo ${client_name},<br><br>Terima kasih atas permintaan Anda untuk layanan <strong>${service_type}</strong>. Tim kami akan segera meninjaunya.</p>`,
        })
      });
    }

    // Kirim balasan sukses
    return new Response(JSON.stringify({ success: true, message: "Email sent." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})

