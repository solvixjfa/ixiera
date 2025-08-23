// File: supabase/functions/submit-order/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Definisikan header CORS di satu tempat agar mudah dikelola
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Helper function untuk memanggil webhook tanpa menunggu respons (fire-and-forget).
 * Ini penting untuk menjaga agar Edge Function berjalan secepat mungkin.
 * @param {string} url - URL webhook yang akan dipanggil.
 * @param {object} payload - Data yang akan dikirim dalam body request.
 * @param {string} serviceName - Nama layanan untuk logging (misal: "Discord", "Vercel").
 */
const triggerWebhook = (url, payload, serviceName) => {
  if (url) {
    // Kita tidak menggunakan 'await' di sini.
    // Ini memungkinkan fungsi utama untuk lanjut berjalan tanpa menunggu fetch selesai.
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.error(`Error saat memicu webhook ${serviceName}:`, err));
  } else {
    // Memberi peringatan jika URL webhook belum di-set di environment variables
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
    const formData = await req.json();

    // Validasi input dasar
    if (!formData.fullName || !formData.email) {
      throw new Error("Nama lengkap dan Email wajib diisi.");
    }

    // [PERBAIKAN KRITIS & KEAMANAN]
    // Jangan pernah menaruh URL dan Kunci API langsung di dalam kode (hardcode).
    // Selalu gunakan Environment Variables.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Menyiapkan data untuk disimpan ke database
    const budgetString = formData.budget ? `${formData.currency} ${formData.budget}` : 'Tidak ditentukan';
    const inquiryData = {
      client_name: formData.fullName,
      client_email: formData.email,
      client_phone: formData.phone || null, // Gunakan null jika kosong
      service_type: formData.serviceType,
      project_requirements: formData.projectRequirements,
      budget: budgetString,
      deadline: formData.deadline || null, // Gunakan null jika kosong
      status: 'new'
    };

    // --- TUGAS UTAMA SUPABASE FUNCTION ---

    // Langkah 1: Simpan data ke database.
    // Ini adalah satu-satunya operasi yang kita 'await' karena kita perlu memastikan
    // data berhasil disimpan sebelum melanjutkan.
    const { data, error } = await supabaseClient
      .from('project_inquiries')
      .insert(inquiryData)
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw new Error('Gagal menyimpan data ke database.');
    }

    // --- OFFLOADING TUGAS BERIKUTNYA ---

    // Langkah 2: Panggil webhook Discord untuk notifikasi internal.
    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    const discordPayload = {
      content: `🔔 **Permintaan Proyek Baru!**\n----------------------------------\n**Nama:** ${inquiryData.client_name}\n**Email:** ${inquiryData.client_email}\n**Telepon:** ${inquiryData.client_phone || 'Tidak ada'}\n**Layanan:** ${inquiryData.service_type}\n**Anggaran:** ${inquiryData.budget}\n**Deadline:** ${inquiryData.deadline || 'Tidak ditentukan'}\n**Kebutuhan:**\n${inquiryData.project_requirements}`
    };
    triggerWebhook(discordWebhookUrl, discordPayload, 'Discord');

    // Langkah 3: Panggil webhook Vercel untuk menangani pengiriman email.
    const vercelWebhookUrl = Deno.env.get('VERCEL_WEBHOOK_URL');
    // Kirim data yang relevan agar Vercel bisa memprosesnya.
    triggerWebhook(vercelWebhookUrl, inquiryData, 'Vercel');

    // Langkah 4: Segera kirim respons sukses ke klien.
    // Karena kita tidak menunggu webhook, fungsi ini selesai dengan sangat cepat,
    // sehingga masalah timeout bisa teratasi.
    return new Response(JSON.stringify({ success: true, inquiry_id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Penanganan error yang lebih baik
    console.error("Error di Edge Function:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      // Beri status 400 jika input salah, 500 untuk error lainnya
      status: error instanceof SyntaxError ? 400 : 500,
    });
  }
});

