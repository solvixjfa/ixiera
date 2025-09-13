import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const pipedreamWebhookUrl = Deno.env.get('PIPEDREAM_WEBHOOK_URL');

    if (!supabaseUrl || !serviceRoleKey || !pipedreamWebhookUrl) {
      throw new Error('Konfigurasi environment variables belum lengkap.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { submission_id } = await req.json();
    if (!submission_id) throw new Error('submission_id wajib dikirim.');

    const { data, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', submission_id)
      .single();

    if (error || !data) throw new Error('Submission tidak ditemukan: ' + (error?.message || ''));

    // Kirim seluruh data submission ke webhook PipeDream
    const resp = await fetch(pipedreamWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    console.log('Pipedream webhook status:', resp.status);

    return new Response(JSON.stringify({ success: true, message: 'Data sent to Pipedream.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Edge Function Error:', err?.message || err);
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
