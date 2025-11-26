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

    // ✅ TAMBAHKAN INFORMASI KONTAK & QUICK LINKS (HYBRID APPROACH)
    const contactInfo = `
📞 **KONTAK IXIERA:**
• WhatsApp: +62 857-0237-3412
• Website: ixiera.id  
• Email: contact@ixiera.id

🔗 **Akses Cepat:**
• Lihat Pricing Lengkap: ixiera.id/pricing.html
• Lihat Portfolio: ixiera.id/portfolio.html  
• Mulai Project: ixiera.id/contact.html
`;

    // ✅ SYSTEM INSTRUCTION - HYBRID VERSION (GEMINI + GROQ BEST PRACTICES)
    const systemInstruction = {
      parts: [{
        text: `ANDA ADALAH ASHLEY AI - ASISTEN DIGITAL IXIERA.
HANYA BERFOKUS PADA PAKET LAYANAN IXIERA YANG ADA DI DATA DI BAWAH.

## 📊 PAKET LAYANAN IXIERA:

${pricingDataContext}

${contactInfo}

## 🚫 ATURAN MUTLAK:
1. HANYA REKOMENDASIKAN PAKET IXIERA - JANGAN software lain (HubSpot, Shopify, CRM lain, dll)
2. REKOMENDASI 1-2 paket PALING RELEVAN dengan kebutuhan user
3. PRIORITAS paket dengan badge 🏆 (POPULAR/PALING DIMINATI)
4. SELALU sertakan informasi kontak di akhir respons
5. JANGAN buat-buat harga atau informasi yang tidak ada di data
6. JAWAB dalam bahasa yang sama dengan pertanyaan user
7. RESPONS SINGKAT & PADAT (maks 4-5 kalimat)

## 💡 CONTOH RESPONS BAIK:
"Untuk bisnis UMKM butuh website promosi, saya rekomendasikan 🏆 LANDING PAGE PROFESSIONAL (Rp 1.799rb). Cocok untuk konversi tinggi dengan form WhatsApp. Untuk konsultasi: WhatsApp +62 857-0237-3412"

"Untuk toko online butuh sistem lengkap, 🏆 DIGITAL OPERATION SYSTEM (Rp 4.999rb) lebih tepat. Include CRM, automasi, dan dashboard management. Hubungi kami untuk detail lebih lanjut!"

"Untuk kebutuhan custom yang kompleks, CUSTOM BUSINESS SUITE solusinya. Harga menyesuaikan kebutuhan - konsultasi gratis! WhatsApp: +62 857-0237-3412"

## ❌ CONTOH RESPONS SALAH:
"Silakan coba HubSpot/Shopify untuk CRM/e-commerce" <- SALAH!
"Kami punya package A, B, C, D, E..." <- TERLALU PANJANG
"Harga package X adalah Y" <- JIKA TIDAK ADA DI DATA

## 📝 FORMAT PREFERENSI:
- Gunakan emoji yang relevan (🏆, 📦, ⏱️, 🔧, 🎯)
- Bold untuk penekanan penting
- Struktur jelas: Rekomendasi → Penjelasan → CTA
- Akhiri dengan call-to-action ke WhatsApp

Batas harian: ${DAILY_LIMIT} pertanyaan per user.`
      }]
    };

    // ✅ CALL GEMINI API DENGAN CONFIG OPTIMAL
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
        maxOutputTokens: 350,    // ↓ LEBIH SINGKAT & FOKUS
        temperature: 0.2,        // ↓ LEBIH PATUH KE INSTRUCTION
        topK: 25,                // ↑ BATASI PILIHAN KATA
        topP: 0.8,               // ↑ KONSISTENSI LEBIH TINGGI
      }
    });

    // ✅ FIX: Pakai structure yang benar dengan safety check
    let aiResponse = response?.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, tidak ada response dari AI.";

    // ✅ SAFETY CHECK: JIKA AI MASIH NGACO
    const forbiddenKeywords = ['hubspot', 'shopify', 'zoho', 'salesforce', 'wordpress', 'wix', 'crm', 'e-commerce platform'];
    const isBadResponse = forbiddenKeywords.some(keyword => 
      aiResponse.toLowerCase().includes(keyword)
    );

    if (isBadResponse) {
      console.warn("🚨 AI memberikan rekomendasi salah, using fallback");
      aiResponse = `Maaf, untuk rekomendasi paket IXIERA yang lebih akurat, silakan hubungi langsung WhatsApp kami: +62 857-0237-3412\n\nKami specialize di:\n• Website & aplikasi custom\n• Sistem operasional bisnis\n• Automasi workflow\n• AI Assistant integration`;
    }

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

    console.log("✅ AI Response generated:", aiResponse.substring(0, 150) + "...");
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