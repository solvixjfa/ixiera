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

    // Langkah 1: Simpan data ke database (tidak ada perubahan di sini)
    const { data, error } = await supabaseClient
      .from('project_inquiries')
      .insert({ /* ... data form ... */ })
      .select('id')
      .single();
    if (error) throw error;

    // [PERBAIKAN] OTOMATISASI DENGAN PROMISE.ALL
    // Kita kumpulkan semua tugas otomatisasi ke dalam satu array
    const automationTasks = [];

    // Tugas 1: Kirim notifikasi ke Discord
    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (discordWebhookUrl) {
      automationTasks.push(
        fetch(discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `🔔 **Permintaan Proyek Baru!**\n**Nama:** ${client_name}\n**Email:** ${client_email}\n**Layanan:** ${service_type}` })
        })
      );
    }

    // Tugas 2: Kirim notifikasi ke Slack
    const slackApiKey = Deno.env.get('SLACK_API_KEY');
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

    // Tugas 3: Kirim email follow-up ke klien
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
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
    
    // [PERBAIKAN] Tunggu semua tugas di dalam array selesai
    await Promise.all(automationTasks);
    
    // ----------------------------------------------------

    // Baru kirim balasan setelah semua notifikasi terkirim
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

