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

    // Langkah 1: Simpan data ke database (ini cepat)
    const { data, error } = await supabaseClient
      .from('project_inquiries')
      .insert(inquiryData)
      .select('id')
      .single();
    if (error) throw error;

    // Langkah 2: Kirim notifikasi Discord di background (ini juga cepat)
    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (discordWebhookUrl) {
      // Kita tidak 'await' ini, biarkan berjalan di background (fire-and-forget)
      fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `🔔 **Permintaan Proyek Baru!**\n**Nama:** ${inquiryData.client_name}\n**Email:** ${inquiryData.client_email}\n**Layanan:** ${inquiryData.service_type}` })
      }).catch(err => console.error("Discord webhook error:", err));
    }

    // Langsung kirim balasan sukses ke pengguna tanpa menunggu notifikasi
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

