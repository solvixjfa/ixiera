// File: supabase/functions/submit-submission/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const triggerDiscordWebhook = (url: string, payload: Record<string, unknown>) => {
  if (url) {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => console.error(`Error Discord Webhook:`, err));
  } else {
    console.warn(`DISCORD_WEBHOOK_URL belum diset.`);
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Konfigurasi Supabase tidak lengkap.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const formData = await req.json();

    // Validasi input minimal
    if (!formData.title || !formData.user_id) {
      throw new Error('Title dan user_id wajib diisi.');
    }

    const submissionData = {
      user_id: formData.user_id,
      submission_type: formData.submission_type || 'Umum',
      title: formData.title,
      description: formData.description || null,
      status: formData.status || 'pending',
      metadata: formData.metadata || {},
    };

    const { data, error } = await supabaseAdmin
      .from('submissions')
      .insert(submissionData)
      .select('id, created_at, user_id, submission_type, title, status, metadata')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw new Error('Gagal menyimpan ke tabel submissions.');
    }

    // Notif Discord
    const discordPayload = {
      content: `📩 **Submission Baru!**  
━━━━━━━━━━━━━━━━━━  
🆔 ID: ${data.id}  
👤 User ID: ${data.user_id}  
📌 Type: ${data.submission_type}  
📝 Title: ${data.title}  
📖 Desc: ${data.description || '-'}  
📊 Status: ${data.status}  
🧩 Metadata: \`${JSON.stringify(data.metadata)}\`  
⏰ Created At: ${data.created_at}`,
    };

    triggerDiscordWebhook(discordWebhookUrl!, discordPayload);

    return new Response(JSON.stringify({ success: true, submission_id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Edge Function Error:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});