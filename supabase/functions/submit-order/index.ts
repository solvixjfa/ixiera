// File: supabase/functions/submit-order/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // [PERBAIKAN] Langkah 2: Kirim notifikasi Discord yang lengkap
    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (discordWebhookUrl) {
      // Buat pesan yang lebih detail
      const notificationMessage = `
🔔 **Permintaan Proyek Baru!**
----------------------------------
**Nama:** ${inquiryData.client_name}
**Email:** ${inquiryData.client_email}
**Telepon:** ${inquiryData.client_phone || 'Tidak ada'}
**Layanan:** ${inquiryData.service_type}
**Anggaran:** ${inquiryData.budget}
**Deadline:** ${inquiryData.deadline || 'Tidak ditentukan'}
**Kebutuhan:**
${inquiryData.project_requirements}
      `.trim();

      // Kirim pesan ke Discord di background
      fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: notificationMessage })
      }).catch(err => console.error("Discord webhook error:", err));
    }

    // [BARU] Langkah 3: Panggil Vercel API untuk menangani sisanya
    const vercelWebhookUrl = Deno.env.get('VERCEL_WEBHOOK_URL');
    if (vercelWebhookUrl) {
        fetch(vercelWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inquiryData) // Kirim semua data ke Vercel
        }).catch(err => console.error("Vercel webhook error:", err));
    }

    // Langsung kirim balasan sukses ke pengguna
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

