// File: supabase/functions/submit-order/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// [FINAL] Masukkan Channel ID Slack Anda di sini
const SLACK_CHANNEL_ID = 'C09767FCAUA'; 

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ambil semua data dari form
    const formData = await req.json();
    const { 
      client_name, 
      client_email, 
      client_phone,
      service_type, 
      project_requirements, 
      budget, 
      deadline 
    } = formData;

    if (!client_name || !client_email) {
      throw new Error("Nama dan Email wajib diisi.");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Langkah 1: Simpan data ke database
    const { data, error } = await supabaseClient
      .from('project_inquiries')
      .insert({ client_name, client_email, client_phone, service_type, project_requirements, budget, deadline, status: 'new' })
      .select('id')
      .single();

    if (error) throw error;

    // --- OTOMATISASI DIMULAI ---
    
    // Kirim notifikasi ke Discord
    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (discordWebhookUrl) {
      fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🔔 **Permintaan Proyek Baru!**\n**Nama:** ${client_name}\n**Email:** ${client_email}\n**Layanan:** ${service_type}`
        }),
      }).catch(err => console.error("Discord webhook error:", err));
    }

    // Kirim notifikasi ke Slack menggunakan API Key
    const slackApiKey = Deno.env.get('SLACK_API_KEY');
    if (slackApiKey && SLACK_CHANNEL_ID) {
        fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${slackApiKey}`
            },
            body: JSON.stringify({
                channel: SLACK_CHANNEL_ID,
                text: `🔔 Permintaan Proyek Baru!\n*Nama:* ${client_name}\n*Email:* ${client_email}\n*Layanan:* ${service_type}`
            }),
        }).catch(err => console.error("Slack API error:", err));
    }

    // Kirim email follow-up ke klien via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Ixiera <onboarding@resend.dev>',
          to: [client_email],
          subject: 'Terima Kasih Telah Menghubungi Ixiera!',
          html: `<p>Halo ${client_name},<br><br>Terima kasih atas permintaan Anda untuk layanan <strong>${service_type}</strong>. Tim kami akan segera meninjaunya dan menghubungi Anda kembali dalam 1-2 hari kerja.<br><br>Salam,<br>Tim Ixiera</p>`,
        }),
      }).catch(err => console.error("Resend API error:", err));
    }
    
    // ----------------------------

    return new Response(JSON.stringify({ inquiry_id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

