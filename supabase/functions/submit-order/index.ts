// File: supabase/functions/submit-order/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Definisikan header CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- KUNCI ANDA DITARUH LANGSUNG DI SINI ---
const SUPABASE_URL = 'https://xtarsaurwclktwhhryas.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXJzYXVyd2Nsa3R3aGhyeWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDM1ODksImV4cCI6MjA2NzM3OTU4OX0.ZAgs8NbZs8F2GuBVfiFYuyqOLrRC1hemdMyE-i4riYI';

/**
 * Helper function untuk memanggil webhook Discord.
 */
const triggerDiscordWebhook = (url, payload) => {
  if (url) {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.error(`Error saat memicu webhook Discord:`, err));
  } else {
    console.warn(`Webhook URL untuk Discord tidak diatur di environment variables.`);
  }
};

// Main server function
Deno.serve(async (req) => {
  // Menangani request pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Langsung buat client dengan kunci yang sudah kita definisikan di atas
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const formData = await req.json();

    // Validasi input
    if (!formData.fullName || !formData.email) {
      throw new Error("Nama lengkap dan Email wajib diisi.");
    }

    const inquiryData = {
      client_name: formData.fullName,
      client_email: formData.email,
      client_phone: formData.phone || null,
      service_type: formData.serviceType,
      project_requirements: formData.projectRequirements,
      budget: formData.budget ? `${formData.currency} ${formData.budget}` : 'Tidak ditentukan',
      deadline: formData.deadline || null,
      status: 'new'
    };

    // Langkah 1: Simpan data ke database
    const { data, error } = await supabaseClient
      .from('project_inquiries')
      .insert(inquiryData)
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw new Error('Gagal menyimpan data ke database.');
    }

    // Langkah 2: Kirim notifikasi ke Discord
    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    const discordPayload = {
      content: `🔔 **Permintaan Proyek Baru!**\n----------------------------------\n**Nama:** ${inquiryData.client_name}\n**Email:** ${inquiryData.client_email}\n**Telepon:** ${inquiryData.client_phone || 'Tidak ada'}\n**Layanan:** ${inquiryData.service_type}\n**Anggaran:** ${inquiryData.budget}\n**Deadline:** ${inquiryData.deadline || 'Tidak ditentukan'}\n**Kebutuhan:**\n${inquiryData.project_requirements}`
    };
    triggerDiscordWebhook(discordWebhookUrl, discordPayload);

    // Langkah 3: Kirim respons sukses ke klien
    return new Response(JSON.stringify({ success: true, inquiry_id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error di Edge Function:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

