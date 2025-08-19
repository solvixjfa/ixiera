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
    // Ambil data mentah dari frontend
    const formData = await req.json();

    // Validasi menggunakan nama field dari frontend (HTML/JS)
    if (!formData.fullName || !formData.email) {
      throw new Error("Nama dan Email wajib diisi.");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Gabungkan mata uang dan budget jika ada
    const budgetString = formData.budget ? `${formData.currency} ${formData.budget}` : null;

    // [PERBAIKAN] Petakan data dari frontend ke kolom database dengan benar
    const inquiryData = {
      client_name: formData.fullName,
      client_email: formData.email,
      client_phone: formData.phone,
      service_type: formData.serviceType,
      project_requirements: formData.projectRequirements,
      budget: budgetString,
      deadline: formData.deadline,
      status: 'new'
    };

    // Langkah 1: Simpan data yang sudah dipetakan ke database
    const { data, error } = await supabaseClient
      .from('project_inquiries')
      .insert(inquiryData)
      .select('id')
      .single();
    if (error) throw error;

    // --- OTOMATISASI ---
    const automationTasks = [];
    // Gunakan data yang sudah bersih dari inquiryData untuk notifikasi
    const { client_name, client_email, service_type } = inquiryData;

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
    
    await Promise.allSettled(automationTasks);
    
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

