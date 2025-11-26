// File: supabase/functions/ai-assistant/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'https://esm.sh/@google/genai'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ✅ UBAH KE DAILY LIMIT 5 PERTANYAAN/HARI
const DAILY_LIMIT = 5;

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

    // ✅ CHECK DAILY USAGE DI CHAT_SESSIONS - FIXED FORMAT
    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // "20251126" (8 karakter)
    
    // Cari atau buat session untuk HARI INI
    const { data: chatSession, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .upsert({ 
        user_id: userId, 
        month: currentDate, // ✅ SEKARANG 8 KARAKTER - AMAN!
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

    // Check daily limit (jika session ada)
    if (chatSession && chatSession.question_count >= DAILY_LIMIT) {
      return new Response(JSON.stringify({
        candidates: [{ 
          content: { 
            parts: [{ 
              text: `🎯 **Batas Harian Telah Habis**\n\nAnda telah menggunakan ${DAILY_LIMIT} pertanyaan hari ini. Fitur akan tersedia kembali besok.` 
            }] 
          } 
        }],
        usage: {
          question_count: chatSession.question_count,
          daily_limit: DAILY_LIMIT,
          status: 'limit_reached'
        }
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // ✅ AMBIL DATA PRICING PACKAGES - FIXED VERSION
    let pricingDataContext = "Data package belum tersedia.";

    try {
      console.log("🔍 Fetching pricing packages from database...");
      
      const { data: pricingPackages, error: pricingError } = await supabaseAdmin
        .from('pricing_packages')
        .select(`
          name, price_display, timeline, revision_count, 
          support_duration, target_audience, most_popular,
          badge_text, tagline, is_discounted, base_price, discounted_price
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      console.log("📦 Pricing packages result:", {
        data: pricingPackages,
        error: pricingError,
        count: pricingPackages?.length
      });

      if (!pricingError && pricingPackages && pricingPackages.length > 0) {
        console.log("✅ Successfully fetched", pricingPackages.length, "packages");
        
        const formattedPackages = pricingPackages.map(pkg => {
          // ✅ FIX: Handle zero prices (Custom packages)
          let priceInfo;
          if (pkg.base_price === 0 || pkg.price_display === 'Custom') {
            priceInfo = `💰 ${pkg.price_display || 'Konsultasi Gratis'}`;
          } else if (pkg.is_discounted && pkg.discounted_price) {
            priceInfo = `💰 ${pkg.discounted_price} (Diskon dari ${pkg.base_price})`;
          } else {
            priceInfo = `💰 ${pkg.price_display || pkg.base_price}`;
          }
          
          // ✅ FIX: Handle most_popular correctly
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
        console.log("📝 Formatted pricing context length:", pricingDataContext.length);
      } else {
        console.warn("❌ No pricing packages found or error:", pricingError);
        pricingDataContext = "Data package sedang tidak tersedia. Silakan tanyakan tentang paket layanan kami secara umum.";
      }
    } catch (dbError) {
      console.error("🚨 Error fetching pricing packages:", dbError);
      pricingDataContext = "Sistem database sedang mengalami gangguan. Silakan coba lagi nanti.";
    }

    // ✅ TAMBAHKAN INFORMASI KONTAK
    const contactInfo = `
📞 **KONTAK IXIERA:**
• WhatsApp: +62 857-0237-3412
• Website: ixiera.id  
• Email: contact@ixiera.id
`;

    // ✅ SYSTEM INSTRUCTION - IMPROVED DENGAN RULES KETAT
    const systemInstruction = {
      parts: [{
        text: `Anda adalah Ashley AI - Asisten Digital IXIERA.

${pricingDataContext}

${contactInfo}

🚫 **ATURAN KETAT:**
1. REKOMENDASI hanya 1-2 paket yang PALING RELEVAN dengan kebutuhan user
2. PRIORITAS paket dengan badge 🏆 (POPULAR/PALING DIMINATI)
3. Untuk CUSTOM BUSINESS SUITE: "Harga custom - konsultasi gratis untuk diskusi kebutuhan"
4. Untuk AI ASSISTANT: "Subscription bulanan Rp 99rb/bulan - asisten virtual 24/7"
5. JANGAN rekomendasikan semua paket sekaligus
6. JANGAN buat-buat harga atau informasi yang tidak ada di data
7. SELALU sertakan informasi kontak di akhir respons
8. JAWAB dalam bahasa yang sama dengan pertanyaan user
9. RESPONS SINGKAT & PADAT (maks 4-5 kalimat)
10. Batas harian: ${DAILY_LIMIT} pertanyaan per user

✅ **CONTOH RESPONS BAIK:**
"Berdasarkan kebutuhan Anda, saya rekomendasikan [1-2 paket spesifik]. [Penjelasan singkat]. Untuk konsultasi lebih lanjut, hubungi WhatsApp: +62 857-0237-3412"

❌ **CONTOH RESPONS SALAH:**
"Kami punya banyak paket: A, B, C, D, E... (terlalu panjang)"
"Harga paket X adalah Y" (padahal tidak ada di data)`
      }]
    };

    // ✅ CALL GEMINI API DENGAN CONFIG LEBIH KETAT
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
        maxOutputTokens: 400,    // ↓ KURANGI TOKENS
        temperature: 0.3,        // ↓ KURANGI KREATIVITAS
        topK: 40,                // ↑ BATASI PILIHAN KATA
        topP: 0.8,               // ↑ KONSISTENSI LEBIH TINGGI
      }
    });

    // ✅ FIX: Pakai structure yang benar dengan safety check
    const aiResponse = response?.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, tidak ada response dari AI.";

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
        daily_limit: DAILY_LIMIT,
        remaining_questions: DAILY_LIMIT - currentCount,
        status: 'success'
      }
    };

    console.log("✅ AI Response generated:", aiResponse.substring(0, 100) + "...");
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