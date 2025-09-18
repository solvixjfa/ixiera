// File: supabase/functions/submit-order/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Definisikan header CORS untuk keamanan
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Di produksi, ganti '*' dengan domain website Anda
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Helper function untuk memanggil webhook Discord secara aman.
 * Proses ini berjalan di latar belakang tanpa ditunggu (fire-and-forget).
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

// Fungsi utama Edge Function
Deno.serve(async (req) => {
  // Menangani request pre-flight CORS dari browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- BAGIAN PALING PENTING ---
    // 1. Ambil secrets dari environment (yang diatur via GitHub Actions).
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // 2. Pastikan secrets ada. Jika tidak, fungsi akan berhenti dengan error yang jelas.
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Konfigurasi Supabase (URL atau Service Role Key) tidak ditemukan.');
    }

    // 3. Buat client dengan hak akses penuh (service_role) untuk mem-bypass RLS.
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Ambil data dari form yang dikirim klien
    const formData = await req.json();

    // Validasi input sederhana
    if (!formData.fullName || !formData.email) {
      throw new Error("Nama lengkap dan Email wajib diisi.");
    }

    // Siapkan data untuk dimasukkan ke database
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
    const { data, error } = await supabaseAdmin
      .from('project_inquiries')
      .insert(inquiryData)
      .select('id')
      .single();

    // Jika gagal menyimpan, hentikan proses dan berikan error
    if (error) {
      console.error('Supabase insert error detail:', error);
      throw new Error('Gagal menyimpan data ke database. Cek detail error di atas.');
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
    // Tangani semua jenis error yang mungkin terjadi
    console.error("Error di Edge Function:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

