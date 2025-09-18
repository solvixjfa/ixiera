// File: supabase/functions/ai-assistant/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// [PERBAIKAN] Definisikan corsHeaders langsung di sini
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MONTHLY_LIMIT = 50;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ... sisa kode Anda tetap sama persis ...
    const { history, currentMessage } = await req.json()
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables.')
    }

    const authHeader = req.headers.get('Authorization')!
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: usage, error: usageError } = await supabaseAdmin
      .from('monthly_usage')
      .upsert({ user_id: user.id, month: currentMonth }, { onConflict: 'user_id, month' })
      .select()
      .single();
    if (usageError) throw usageError;
    if (usage.question_count >= MONTHLY_LIMIT) {
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "You have reached your monthly question limit." }] } }]
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let clientDataContext = "Klien ini belum memiliki pesanan aktif.";

    try {
      const { data: clientLeads, error: leadsError } = await supabaseAdmin
        .from('leads_solvixone')
        .select(`status, notes, created_at, products ( name )`)
        .eq('client_id', user.id);

      if (leadsError) throw leadsError;

      if (clientLeads && clientLeads.length > 0) {
        const formattedLeads = clientLeads.map(lead => 
          `- Pesanan untuk "${lead.products?.name || 'Layanan Tidak Ditemukan'}" (Status: ${lead.status}). Dibuat pada: ${new Date(lead.created_at).toLocaleDateString('id-ID')}. Catatan: ${lead.notes || 'Tidak ada'}`
        ).join('\n');
        
        clientDataContext = `Berikut adalah data pesanan aktif milik klien:\n${formattedLeads}`;
      }
    } catch (dbError) {
      console.error("Database context fetch error:", dbError);
      clientDataContext = "Gagal mengambil data pesanan klien saat ini.";
    }

    const systemInstruction = {
      parts: [{
        text: `Persona: Anda adalah Asisten Digital IXIERA, seorang Digital Venture Architect yang efisien dan solutif.
Konteks: IXIERA membangun sistem digital untuk bisnis. 
--- DATA KLIEN SAAT INI ---
${clientDataContext}
--- AKHIR DATA KLIEN ---
Aturan Utama:
1. Gunakan DATA KLIEN di atas untuk menjawab pertanyaan spesifik tentang pesanan mereka.
2. Jika tidak ada data atau pertanyaan tidak terkait pesanan, jawab secara umum sebagai ahli strategi digital.
3. JAWABAN SINGKAT & PADAT: Maksimal 3-4 kalimat.
4. BAHASA: Selalu balas dalam bahasa yang sama dengan pertanyaan terakhir pengguna.
5. FOKUS MENU-AWARE: Jawab sesuai konteks menu di portal, jangan arahkan ke dashboard lain.`
      }]
    };

    const geminiPayload = {
      systemInstruction: { parts: systemInstruction.parts },
      contents: [...history, { role: 'user', parts: [{ text: currentMessage }] }],
      generationConfig: { maxOutputTokens: 250, temperature: 0.7, topP: 1 },
    };

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiPayload) }
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.json();
      throw new Error(`Gemini API Error: ${errorBody.error.message}`);
    }

    const geminiData = await geminiResponse.json();

    await supabaseAdmin
      .from('monthly_usage')
      .update({ question_count: usage.question_count + 1 })
      .eq('id', usage.id);

    return new Response(JSON.stringify(geminiData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

