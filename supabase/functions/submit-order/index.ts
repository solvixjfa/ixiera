// File: supabase/functions/submit-order/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; // Pastikan file _shared/cors.ts ada

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // LANGKAH DEBUG 1: Lihat data mentah yang masuk
    const bodyText = await req.text();
    console.log("Menerima body mentah:", bodyText);

    // Jika body kosong, langsung hentikan
    if (!bodyText) {
      throw new Error("Request body kosong.");
    }

    // LANGKAH DEBUG 2: Coba parse data JSON
    const formData = JSON.parse(bodyText);
    console.log("Berhasil mem-parse formData:", formData);

    const { 
      client_name, 
      client_email, 
      service_type, 
      project_requirements, 
      budget, 
      deadline 
    } = formData;

    // LANGKAH DEBUG 3: Lakukan validasi
    if (!client_name || !client_email) {
      console.error("Validasi gagal: Nama atau Email kosong.", { client_name, client_email });
      throw new Error("Nama dan Email wajib diisi.");
    }
    console.log("Validasi berhasil.");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const PRODUCT_ID_FROM_FORM = '5879000c-5608-4676-bd0e-e977b3aa737e';

    // LANGKAH DEBUG 4: Coba masukkan ke database
    console.log("Mencoba memasukkan data ke leads_solvixone...");
    const { data: newLead, error: leadError } = await supabaseClient
      .from('leads_solvixone')
      .insert({
        contact_name: client_name,
        contact_email: client_email,
        notes: project_requirements,
        service_type: service_type,
        budget: budget,
        deadline: deadline,
        product_id: PRODUCT_ID_FROM_FORM,
        status: 'new',
        client_id: null 
      })
      .select()
      .single();

    if (leadError) {
      console.error("Error dari Supabase DB:", leadError);
      throw leadError;
    }

    console.log("Berhasil memasukkan data:", newLead);
    return new Response(JSON.stringify({ data: newLead }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // LANGKAH DEBUG 5: Tangkap dan catat error apapun yang terjadi
    console.error("Terjadi error di dalam Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

