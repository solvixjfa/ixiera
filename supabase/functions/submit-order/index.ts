// File: supabase/functions/submit-order/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Definisikan header CORS untuk mengizinkan request dari website Anda
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Mengizinkan semua domain, siap untuk produksi
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ID Produk statis untuk "integrasi sistem operasi otomatis"
const PRODUCT_ID_FROM_FORM = '5879000c-5608-4676-bd0e-e977b3aa737e';

// Fungsi utama yang akan dijalankan
Deno.serve(async (req) => {
  // Tangani preflight request dari browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Ambil data JSON dari form yang dikirim oleh contact.js
    const formData = await req.json();
    const { 
      client_name, 
      client_email, 
      service_type, 
      project_requirements, 
      budget, 
      deadline 
    } = formData;

    // 2. Validasi sederhana untuk memastikan data penting ada
    if (!client_name || !client_email) {
      throw new Error("Nama dan Email wajib diisi.");
    }

    // 3. Buat koneksi ke Supabase menggunakan kunci Service Role (aman di sisi server)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 4. Masukkan data langsung ke tabel leads_solvixone
    const { data: newLead, error: leadError } = await supabaseClient
      .from('leads_solvixone')
      .insert({
        // Kolom baru untuk kontak dari website
        contact_name: client_name,
        contact_email: client_email,
        
        // Kolom lain dari form
        notes: project_requirements,
        service_type: service_type,
        budget: budget,
        deadline: deadline,
        
        // Kolom wajib lainnya
        product_id: PRODUCT_ID_FROM_FORM,
        status: 'new',
        
        // Biarkan client_id NULL karena ini adalah pengunjung, bukan klien terdaftar
        client_id: null 
      })
      .select()
      .single();

    // Jika ada error dari Supabase, lemparkan error tersebut
    if (leadError) throw leadError;

    // 5. Jika berhasil, kirim respons sukses kembali ke browser
    return new Response(JSON.stringify({ data: newLead }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Jika terjadi error apapun, kirim respons error
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Gunakan status 400 untuk error dari klien/data
    });
  }
});

