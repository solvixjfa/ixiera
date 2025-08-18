// File: supabase/functions/submit-order/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// [PERBAIKAN] Definisikan corsHeaders langsung di sini, hapus import yang salah.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCT_ID_FROM_FORM = '5879000c-5608-4676-bd0e-e977b3aa737e';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const formData = await req.json();
    const { 
      client_name, 
      client_email, 
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

    if (leadError) throw leadError;

    return new Response(JSON.stringify({ data: newLead }), {
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

