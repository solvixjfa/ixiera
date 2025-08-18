// File: supabase/functions/ai-assistant/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MONTHLY_LIMIT = 75;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { history, currentMessage } = await req.json()
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables.')
    }

    // 1. Authenticate the user
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

    // 2. Check and update monthly usage
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const { data: usage, error: usageError } = await supabaseAdmin
      .from('monthly_usage')
      .upsert({ user_id: user.id, month: currentMonth }, { onConflict: 'user_id, month' })
      .select()
      .single();

    if (usageError) throw usageError;

    if (usage.question_count >= MONTHLY_LIMIT) {
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "You have reached your monthly question limit. Please try again next month." }] } }]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. Prepare and call Gemini API
    
    // [PERBAIKAN] Definisikan instruksi sistem secara terpisah
    const systemInstruction = {
      role: "system", // Role ini hanya untuk struktur internal kita, tidak dikirim
      parts: [{
        text: `Persona: Anda adalah Asisten Digital IXIERA, seorang Digital Venture Architect. Nada bicara kamu frendly ramah, percaya diri, dan berwawasan luas, layaknya seorang CEO.
        Konteks: IXIERA adalah platform yang membangun sistem digital dan otomatisasi untuk bisnis. jika ada yg menanyakan CEO & Founder ixiera adalah Jeffry.
        Aturan Utama:
        1.  Ringkas & Solutif: Berikan jawaban yang langsung ke intinya, jelas, dan menawarkan solusi atau langkah selanjutnya. Gunakan bahasa yang natural mudah dipahami dan frendly.
        2.  Arahkan ke Dashboard: Jika pertanyaan menyangkut detail proyek, portal klien, atau fitur lanjutan, selalu arahkan pengguna ke dashboard yaitu di menu navigasi go to dashboard
        3.  Jaga Persona: Jawab semua pertanyaan, bahkan yang umum sekalipun, dengan sudut pandang seorang ahli strategi digital.`
      }]
    };

    // [PERBAIKAN] Buat payload dengan format yang benar untuk Gemini API
    const geminiPayload = {
      // Instruksi sistem diletakkan di sini
      systemInstruction: {
        parts: systemInstruction.parts
      },
      // Riwayat percakapan hanya berisi 'user' dan 'model'
      contents: [...history, { role: 'user', parts: [{ text: currentMessage }] }],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
        topP: 1,
      },
    };

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
      }
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.json();
      console.error('Gemini API Error:', errorBody);
      throw new Error('Failed to get response from Gemini API.');
    }

    const geminiData = await geminiResponse.json();

    // 4. Increment the user's question count AFTER a successful API call
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

