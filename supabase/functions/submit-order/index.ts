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
    const { 
      client_name, 
      client_email, 
      client_phone,
      service_type, 
      project_requirements, 
      budget, 
      deadline 
    } = formData;

    if (!client_name || !client_email) {
      throw new Error("Nama dan Email wajib diisi.");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Langkah 1: Simpan data ke database (tabel project_inquiries)
    const { data, error } = await supabaseClient
      .from('project_inquiries')
      .insert({
        client_name,
        client_email,
        client_phone,
        service_type,
        project_requirements,
        budget, // Sekarang menyimpan string seperti "IDR 5000000"
        deadline,
        status: 'new'
      })
      .select()
      .single();

    if (error) throw error;

    // --- DI SINI TEMPAT OTOMATISASI ANDA ---
    // Setelah data berhasil disimpan, picu notifikasi.

    // Contoh: Kirim notifikasi ke Discord atau Slack (butuh webhook URL di secrets)
    // const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    // if (webhookUrl) {
    //   await fetch(webhookUrl, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ content: `New project inquiry from ${client_name} (${client_email}) for ${service_type}.` }),
    //   });
    // }

    // Contoh: Kirim email follow-up otomatis ke klien (butuh layanan email seperti Resend)
    // const resendApiKey = Deno.env.get('RESEND_API_KEY');
    // if (resendApiKey) {
    //   await fetch('https://api.resend.com/emails', {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${resendApiKey}`,
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //       from: 'Your Name <noreply@yourdomain.com>',
    //       to: [client_email],
    //       subject: 'Terima Kasih Telah Menghubungi Ixiera!',
    //       html: `<p>Halo ${client_name}, terima kasih atas permintaan Anda. Tim kami akan segera meninjaunya.</p>`,
    //     }),
    //   });
    // }
    
    // ------------------------------------------

    return new Response(JSON.stringify({ data }), {
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

