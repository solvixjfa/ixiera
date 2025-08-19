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

    if (!formData.fullName || !formData.email) {
      throw new Error("Nama dan Email wajib diisi.");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const budgetString = formData.budget ? `${formData.currency} ${formData.budget}` : 'Tidak ditentukan';

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

    // Langkah 1: Simpan data ke database
    const { data, error } = await supabaseClient
      .from('project_inquiries')
      .insert(inquiryData)
      .select('id')
      .single();
    if (error) throw error;

    // --- OTOMATISASI ---
    
    // [PERBAIKAN] Buat pesan notifikasi yang lengkap
    const notificationMessage = `
🔔 **Permintaan Proyek Baru!**
----------------------------------
**Nama:** ${inquiryData.client_name}
**Email:** ${inquiryData.client_email}
**Telepon:** ${inquiryData.client_phone}
**Layanan:** ${inquiryData.service_type}
**Anggaran:** ${inquiryData.budget}
**Deadline:** ${inquiryData.deadline || 'Tidak ditentukan'}
**Kebutuhan:**
${inquiryData.project_requirements}
    `.trim();

    // [PERBAIKAN] Jalankan setiap otomatisasi secara terpisah dan aman
    
    // Kirim notifikasi ke Discord
    try {
      const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
      if (discordWebhookUrl) {
        await fetch(discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: notificationMessage })
        });
      }
    } catch (e) { console.error("Gagal mengirim ke Discord:", e.message); }

    // Kirim notifikasi ke Slack
    try {
      const slackApiKey = Deno.env.get('SLACK_API_KEY');
      if (slackApiKey && SLACK_CHANNEL_ID) {
        await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${slackApiKey}`
            },
            body: JSON.stringify({ channel: SLACK_CHANNEL_ID, text: notificationMessage.replace(/\*/g, '') }) // Hapus format bold untuk Slack
        });
      }
    } catch (e) { console.error("Gagal mengirim ke Slack:", e.message); }

    // Kirim email follow-up ke klien
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: ' <onboarding@resend.dev>',
            to: [inquiryData.client_email],
            subject: 'Terima Kasih Telah Menghubungi Ixiera!',
            html: `<p>Halo ${inquiryData.client_name},<br><br>Terima kasih atas permintaan Anda. Tim kami akan segera meninjaunya.</p>`,
          })
        });
      }
    } catch (e) { console.error("Gagal mengirim ke Resend:", e.message); }
    
    // ----------------------------------------------------

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

