// File: supabase/functions/notify-discord-submission/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Notifikasi Discord (async tapi dijamin jalan sebelum respon)
const sendDiscordNotification = async (webhookUrl: string, payload: Record<string, unknown>) => {
  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('Discord notif status:', resp.status); // 204 = success
  } catch (err) {
    console.error('Discord send error:', err);
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');

    if (!supabaseUrl || !serviceRoleKey || !discordWebhookUrl) {
      throw new Error('Konfigurasi Supabase atau Discord Webhook belum lengkap.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Ambil input JSON dari request
    const { submission_id } = await req.json();
    if (!submission_id) throw new Error('submission_id wajib dikirim.');

    // Ambil data submission dari DB
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', submission_id)
      .single();

    if (error || !data) throw new Error('Submission tidak ditemukan: ' + (error?.message || ''));

    // Buat payload Discord
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

    // Kirim notif
    await sendDiscordNotification(discordWebhookUrl, discordPayload);

    return new Response(JSON.stringify({ success: true, submission_id: data.id }), {
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