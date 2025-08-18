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

    // Validasi dasar
    if (!formData.client_name || !formData.client_email) {
      throw new Error("Nama dan Email wajib diisi.");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // [PERBAIKAN] Buat objek data secara eksplisit untuk dimasukkan ke database.
    // Ini lebih aman dan mencegah error jika ada field tambahan dari frontend.
    const inquiryData = {
      client_name: formData.client_name,
      client_email: formData.client_email,
      client_phone: formData.client_phone,
      service_type: formData.service_type,
      project_requirements: formData.project_requirements,
      budget: formData.budget,
      deadline: formData.deadline,
      status: 'new'
    };

    // Langkah 1: Simpan data ke database
    const { data, error } = await supabaseClient
      .from('project_inquiries')
      .insert(inquiryData)
      .select('id')
      .single();

    if (error) {
      // Jika ada error dari database, lemparkan agar bisa ditangkap
      console.error("Supabase DB Error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    // --- OTOMATISASI (Tidak ada perubahan di sini) ---
    const automationTasks = [];
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      automationTasks.push(
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Ixiera <onboarding@resend.dev>',
            to: [formData.client_email],
            subject: 'Terima Kasih Telah Menghubungi Ixiera!',
            html: `<p>Halo ${formData.client_name},<br><br>Terima kasih atas permintaan Anda. Tim kami akan segera meninjaunya.</p>`,
          })
        })
      );
    }
    // ...tambahkan notifikasi Discord/Slack di sini jika perlu...
    
    await Promise.allSettled(automationTasks);
    // ----------------------------------------------------

    return new Response(JSON.stringify({ inquiry_id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

