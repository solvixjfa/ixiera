// File: supabase/functions/notify-slack/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = { 'Access-Control-Allow-Origin': '*' }
const SLACK_CHANNEL_ID = 'C09767FCAUA'; 

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ambil data 'record' yang dikirim oleh webhook Supabase
    const { record } = await req.json();
    const { client_name, client_email, service_type } = record;

    const slackApiKey = Deno.env.get('SLACK_API_KEY');
    if (slackApiKey && SLACK_CHANNEL_ID) {
      // Kirim notifikasi ke channel Slack
      await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${slackApiKey}`
          },
          body: JSON.stringify({ 
            channel: SLACK_CHANNEL_ID, 
            text: `🔔 Permintaan Proyek Baru!\n*Nama:* ${client_name}\n*Email:* ${client_email}\n*Layanan:* ${service_type}` 
          })
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Slack notification sent." }), {
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

