// /api/ask-ashley.js - DENGAN DEBUG & LIMIT
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY tidak diatur di server.' });
  }

  try {
    const { history, currentMessage, questionCount } = req.body;

    if (!Array.isArray(history) || typeof currentMessage !== 'string' || currentMessage.trim() === '') {
      return res.status(400).json({ error: 'Request body tidak lengkap atau tidak valid.' });
    }

    // ✅ LIMIT 5 PERTANYAAN
    if (questionCount >= 5) {
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: "Anda telah mencapai batas 5 pertanyaan gratis. Untuk konsultasi lebih lanjut, silakan hubungi tim IXIERA langsung di website kami." }]
          }
        }]
      });
    }

    // AMBIL DATA DARI SUPABASE DENGAN DEBUG
    console.log('🔄 Fetching data from Supabase...');
    
    let packagesText = '';
    let showcasesText = '';

    try {
      // Debug: Cek koneksi Supabase
      console.log('🔗 Supabase URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Not set');
      
      // Ambil packages
      const { data: packages, error: packagesError } = await supabase
        .from('pricing_packages')
        .select('name, slug, price_display, timeline, target_audience, deliverables')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      console.log('📦 Packages query result:', {
        data: packages?.length || 0,
        error: packagesError?.message
      });

      if (packagesError) {
        console.error('❌ Packages error:', packagesError);
      }

      if (packages && packages.length > 0) {
        packagesText = packages.map(p => 
          `• ${p.name} (${p.slug}): ${p.price_display} - ${p.timeline} - Untuk: ${p.target_audience}`
        ).join('\n');
        console.log('✅ Packages loaded:', packages.length);
      } else {
        packagesText = "• Data packages belum tersedia";
        console.log('⚠️ No packages found');
      }

      // Ambil showcases
      const { data: showcases, error: showcasesError } = await supabase
        .from('showcase_projects')
        .select('title, category, description, solutions')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(3);

      console.log('🎯 Showcases query result:', {
        data: showcases?.length || 0,
        error: showcasesError?.message
      });

      if (showcasesError) {
        console.error('❌ Showcases error:', showcasesError);
      }

      if (showcases && showcases.length > 0) {
        showcasesText = showcases.map(s =>
          `• ${s.title} (${s.category}): ${s.description?.substring(0, 80)}...`
        ).join('\n');
        console.log('✅ Showcases loaded:', showcases.length);
      } else {
        showcasesText = "• Data showcase belum tersedia";
        console.log('⚠️ No showcases found');
      }

    } catch (dbError) {
      console.error('❌ Database connection error:', dbError);
      packagesText = "• STARTER: Rp 8.9jt - 2-3 minggu (UMKM)\n• GROWTH: Rp 19.9jt - 3-4 minggu (Startup)\n• BUSINESS: Rp 39.9jt - 4-6 minggu (Perusahaan)";
      showcasesText = "• E-commerce Sneakers: Platform jualan sneakers lengkap\n• Company Profile: Website perusahaan modern";
    }

    const systemPrompt = `
# ASHLEY AI - IXIERA ASSISTANT

## DATA REAL DARI DATABASE:

### PAKET YANG TERSEDIA:
${packagesText}

### SHOWCASE PROJECTS:
${showcasesText}

## ATURAN STRICT:
1. HANYA gunakan data di atas - jangan membuat informasi sendiri
2. Berikan rekomendasi SPESIFIK berdasarkan kebutuhan user
3. Sertakan HARGA dan TIMELINE dari data
4. Maksimal 5 pertanyaan per session
5. Jawaban singkat 3-4 kalimat saja
6. Jika user tanya lebih dari 5x, ingatkan limit sudah habis

## CONTOH RESPONSE BAIK:
"Berdasarkan data terbaru IXIERA, untuk bisnis UKM Anda saya rekomendasikan STARTER package (Rp 8.9jt) dengan timeline 2-3 minggu. Cocok untuk website company profile."

## JIKA DATA TIDAK ADA:
"Maaf, informasi detail tentang itu sedang dalam update. Silakan konsultasi langsung dengan tim IXIERA untuk informasi terbaru."
`;

    const safeHistory = history.reduce((acc, h) => {
      if (h && h.role && Array.isArray(h.parts) && h.parts[0] && typeof h.parts[0].text === 'string') {
        acc.push({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.parts[0].text
        });
      }
      return acc;
    }, []);

    const messages = [
      { role: "system", content: systemPrompt },
      ...safeHistory,
      { role: "user", content: currentMessage }
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 300,
      top_p: 1,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "Maaf, terjadi kendala teknis. Silakan coba lagi.";

    // Log untuk debug
    console.log('🤖 AI Response generated');
    console.log('📊 Question count:', questionCount);

    res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: aiResponse }]
        }
      }]
    });

  } catch (error) {
    console.error('❌ API Handler Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan di server.' });
  }
}