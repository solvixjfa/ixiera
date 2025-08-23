// File: supabase/functions/submit-order/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Definisikan header CORS di satu tempat agar mudah dikelola
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Helper function untuk memanggil webhook tanpa menunggu respons (fire-and-forget).
 */
const triggerWebhook = (url, payload, serviceName) => {
  if (url) {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.error(`Error saat memicu webhook ${serviceName}:`, err));
  } else {
    console.warn(`Webhook URL untuk ${serviceName} tidak diatur.`);
  }
};

// Main server function
Deno.serve(async (req) => {
  // Menangani request pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- LANGKAH DEBUGGING DIMULAI DI SINI ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // Mencetak variabel ke log untuk verifikasi.
    // Ini adalah langkah paling penting untuk menemukan masalahnya.
    console.log("DEBUG: Mencoba terhubung dengan URL:", supabaseUrl ? "DITEMUKAN" : "TIDAK DITEMUKAN (undefined)");
    console.log("DEBUG: Mencoba menggunakan Anon Key:", supabaseAnonKey ? `DITEMUKAN (dimulai dengan: ${supabaseAnonKey.substring(0, 5)}...)` : "TIDAK DITEMUKAN (undefined)");

    // Validasi apakah secret ada atau tidak.
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("KRITIS: Supabase URL atau Anon Key tidak ditemukan di environment variables.");
    }
    // --- AKHIR LANGKAH DEBUGGING ---

    const formData = await req.json();
    if (!formData.fullName || !formData.email) {
      throw new Error("Nama lengkap dan Email wajib diisi.");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const budgetString = formData.budget ? `${formData.currency} ${formData.budget}` : 'Tidak ditentukan';
    const inquiryData = {
      client_name: formData.fullName,
      client_email: formData.email,
      client_phone: formData.phone || null,
      service_type: formData.serviceType,
      project_requirements: formData.projectRequirements,
      budget: budgetString,
      deadline: formData.deadline || null,
      status: 'new'
    };

    const { data, error } = await supabaseClient
      .from('project_inquiries')
      .insert(inquiryData)
      .select('id')
      .single();

    if (error) {
      // Menambahkan detail error dari Supabase ke log agar lebih jelas
      console.error('Supabase insert error detail:', JSON.stringify(error, null, 2));
      throw new Error('Gagal menyimpan data ke database. Cek RLS atau detail error di atas.');
    }

    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    const discordPayload = {
      content: `🔔 **Permintaan Proyek Baru!**\n----------------------------------\n**Nama:** ${inquiryData.client_name}\n**Email:** ${inquiryData.client_email}\n**Telepon:** ${inquiryData.client_phone || 'Tidak ada'}\n**Layanan:** ${inquiryData.service_type}\n**Anggaran:** ${inquiryData.budget}\n**Deadline:** ${inquiryData.deadline || 'Tidak ditentukan'}\n**Kebutuhan:**\n${inquiryData.project_requirements}`
    };
    triggerWebhook(discordWebhookUrl, discordPayload, 'Discord');

    const vercelWebhookUrl = Deno.env.get('VERCEL_WEBHOOK_URL');
    triggerWebhook(vercelWebhookUrl, inquiryData, 'Vercel');

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

