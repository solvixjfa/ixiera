// File: supabase/functions/ai-assistant/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'https://esm.sh/@google/genai'

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
    const { currentMessage, history, userId } = await req.json()
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables.')
    }

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // ✅ SIMPLE USER ID VALIDATION (NO JWT)
    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'User ID is required',
        candidates: [{
          content: {
            parts: [{ text: "User ID tidak valid. Silakan login kembali." }]
          }
        }]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // ✅ CHECK MONTHLY USAGE DI CHAT_SESSIONS
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Cari atau buat session untuk bulan ini
    const { data: chatSession, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .upsert({ 
        user_id: userId, 
        month: currentMonth,
        title: currentMessage.substring(0, 40) + (currentMessage.length > 40 ? '...' : ''),
        last_message: currentMessage,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id, month'
      })
      .select()
      .single();
      
    if (sessionError) {
      console.error("Session error:", sessionError);
      // Fallback: continue without usage tracking
    }

    // Check monthly limit (jika session ada)
    if (chatSession && chatSession.question_count >= MONTHLY_LIMIT) {
      return new Response(JSON.stringify({
        candidates: [{ 
          content: { 
            parts: [{ 
              text: `🎯 **Batas Bulanan Telah Habis**\n\nAnda telah menggunakan ${MONTHLY_LIMIT} pertanyaan bulan ini. Fitur akan tersedia kembali bulan depan.` 
            }] 
          } 
        }],
        usage: {
          question_count: chatSession.question_count,
          monthly_limit: MONTHLY_LIMIT,
          status: 'limit_reached'
        }
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // ✅ AMBIL DATA PRICING PACKAGES
    let pricingDataContext = "Data package belum tersedia.";

    try {
      const { data: pricingPackages, error: pricingError } = await supabaseAdmin
        .from('pricing_packages')
        .select(`
          name, price_display, timeline, revision_count, 
          support_duration, target_audience, most_popular,
          badge_text, tagline, is_discounted, base_price, discounted_price
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!pricingError && pricingPackages && pricingPackages.length > 0) {
        const formattedPackages = pricingPackages.map(pkg => {
          const priceInfo = pkg.is_discounted && pkg.discounted_price 
            ? `💰 ${pkg.discounted_price} (Diskon dari ${pkg.base_price})`
            : `💰 ${pkg.price_display || pkg.base_price}`;
            
          const popularBadge = pkg.most_popular ? ` 🏆 ${pkg.badge_text || 'POPULAR'}` : '';
          
          return `
📦 **${pkg.name}**${popularBadge}
${pkg.tagline || ''}
${priceInfo}
⏱️ ${pkg.timeline} | 🔧 ${pkg.revision_count} revisi
🎯 ${pkg.target_audience || 'Semua bisnis'}
          `.trim();
        }).join('\n\n');

        pricingDataContext = `## 📊 PAKET LAYANAN IXIERA\n\n${formattedPackages}`;
      }
    } catch (dbError) {
      console.error("Error fetching pricing packages:", dbError);
    }

    // ✅ SYSTEM INSTRUCTION
    const systemInstruction = {
      parts: [{
        text: `Anda adalah Ashley AI - Asisten Digital IXIERA.

${pricingDataContext}

ATURAN:
1. REKOMENDASI spesifik berdasarkan data paket di atas
2. JAWAB dalam bahasa yang sama dengan pertanyaan user
3. RESPONS singkat & padat (maks 4-5 kalimat)
4. FOKUS pada informasi yang ada di data`
      }]
    };

    // ✅ CALL GEMINI API
    const contents = [
      ...(history || []), 
      { 
        role: 'user', 
        parts: [{ text: currentMessage }] 
      }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      systemInstruction: systemInstruction,
      generationConfig: {
        maxOutputTokens: 700,
        temperature: 0.7,
      }
    });

    const aiResponse = response.text() || "Maaf, tidak ada response dari AI.";

    // ✅ UPDATE CHAT_SESSION JIKA ADA
    if (chatSession) {
      await supabaseAdmin
        .from('chat_sessions')
        .update({ 
          question_count: (chatSession.question_count || 0) + 1,
          last_message: currentMessage,
          ai_response: aiResponse,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatSession.id);
    }

    // ✅ FORMAT RESPONSE
    const currentCount = chatSession ? chatSession.question_count + 1 : 1;
    const formattedResponse = {
      candidates: [{
        content: {
          parts: [{ text: aiResponse }]
        }
      }],
      usage: {
        question_count: currentCount,
        monthly_limit: MONTHLY_LIMIT,
        remaining_questions: MONTHLY_LIMIT - currentCount,
        status: 'success'
      }
    };

    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('AI Assistant Error:', error)
    
    const errorResponse = {
      candidates: [{
        content: {
          parts: [{ 
            text: "Maaf, terjadi gangguan sistem. Silakan coba lagi dalam beberapa saat." 
          }]
        }
      }],
      error: error.message
    };

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})