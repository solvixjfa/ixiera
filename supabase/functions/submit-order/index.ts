// File: supabase/functions/submit-order/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLACK_CHANNEL_ID = 'C09767FCAUA'; 

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const formData = await req.json();
    const { 
      client_name, 
      client_email, 
      service_type
    } = formData;

    if (!client_name || !client_email) {
      throw new Error("Nama dan Email wajib diisi.");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabaseClient
      .from('project_inquiries')
      .insert(formData)
      .select('id')
      .single();
    if (error) throw error;

    // --- PEMERIKSAAN SECRETS DIMULAI ---
    console.log("--- Memeriksa Ketersediaan Secrets ---");
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    const slackApiKey = Deno.env.get('SLACK_API_KEY');

    console.log(`RESEND_API_KEY ditemukan: ${!!resendApiKey}`);
    console.log(`DISCORD_WEBHOOK_URL ditemukan: ${!!discordWebhookUrl}`);
    console.log(`SLACK_API_KEY ditemukan: ${!!slackApiKey}`);
    console.log("------------------------------------");
    // --- PEMERIKSAAN SECRETS SELESAI ---


    // --- OTOMATISASI ---
    const automationTasks = [];

    if (resendApiKey) {
      automationTasks.push(
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Ixiera <onboarding@resend.dev>',
            to: [client_email],
            subject: 'Terima Kasih Telah Menghubungi Ixiera!',
            html: `<p>Halo ${client_name},<br><br>Terima kasih atas permintaan Anda. Tim kami akan segera meninjaunya.</p>`,
          })
        })
      );
    }
    
    if (discordWebhookUrl) {
      automationTasks.push(
        fetch(discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `🔔 **Permintaan Proyek Baru!**\n**Nama:** ${client_name}\n**Email:** ${client_email}\n**Layanan:** ${service_type}` })
        })
      );
    }
    
    if (slackApiKey && SLACK_CHANNEL_ID) {
      automationTasks.push(
        fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${slackApiKey}`
            },
            body: JSON.stringify({ channel: SLACK_CHANNEL_ID, text: `🔔 Permintaan Proyek Baru!\n*Nama:* ${client_name}\n*Email:* ${client_email}\n*Layanan:* ${service_type}` })
        })
      );
    }
    
    const results = await Promise.allSettled(automationTasks);
    results.forEach(result => {
      if (result.status === 'rejected') {
        console.error('Satu tugas otomatisasi gagal:', result.reason);
      }
    });
    
    return new Response(JSON.stringify({ inquiry_id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error utama di Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

