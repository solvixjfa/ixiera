// /api/ask-ashley.js
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

    // AMBIL DATA DARI SUPABASE - SEDERHANA & AMAN
    let packagesText = '';
    let showcasesText = '';

    try {
      // Coba ambil data packages
      const { data: packages, error: packagesError } = await supabase
        .from('pricing_packages')
        .select('name, price_display, timeline, target_audience')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(5);

      if (!packagesError && packages) {
        packagesText = packages.map(p => 
          `• ${p.name}: ${p.price_display} - ${p.timeline} (${p.target_audience})`
        ).join('\n');
      }

      // Coba ambil data showcases
      const { data: showcases, error: showcasesError } = await supabase
        .from('showcase_projects')
        .select('title, category, description')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(3);

      if (!showcasesError && showcases) {
        showcasesText = showcases.map(s =>
          `• ${s.title} (${s.category}): ${s.description?.substring(0, 80)}...`
        ).join('\n');
      }

    } catch (dbError) {
      console.log('⚠️ Using fallback data:', dbError.message);
      // Fallback data jika Supabase error
      packagesText = `• STARTER: Rp 8.9jt - 2-3 minggu (UMKM & Freelancer)
• GROWTH: Rp 19.9jt - 3-4 minggu (Startup & E-commerce)
• BUSINESS: Rp 39.9jt - 4-6 minggu (Perusahaan Menengah)`;
      
      showcasesText = `• E-commerce Sneakers: Platform jualan sneakers lengkap
• Company Profile: Website perusahaan modern & responsive`;
    }

    // SYSTEM PROMPT DENGAN DATA SUPABASE
    const systemPrompt = `
Persona: Anda adalah Ashley - Asisten Digital IXIERA. Nada bicara friendly, natural, ramah, mudah dipahami.

DATA REAL-TIME DARI IXIERA:

PAKET YANG TERSEDIA:
${packagesText}

SHOWCASE PROJECTS:
${showcasesText}

Aturan Utama:
1. SELALU gunakan data di atas untuk memberikan rekomendasi
2. Balas dalam bahasa yang SAMA dengan pertanyaan user
3. Jawaban singkat & padat (maksimal 3-4 kalimat)
4. Berikan rekomendasi spesifik berdasarkan kebutuhan user
5. Jika tidak yakin, sarankan konsultasi langsung dengan tim IXIERA

Contoh response baik:
"Berdasarkan kebutuhan bisnis UKM Anda, saya rekomendasikan package STARTER dengan harga Rp 8.9jt. Cocok untuk website company profile dengan timeline 2-3 minggu."
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
      max_tokens: 350,
      top_p: 1,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "Maaf, terjadi kendala teknis. Silakan coba lagi.";

    res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: aiResponse }]
        }
      }]
    });

  } catch (error) {
    console.error('API Handler Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan di server saat memproses permintaan.' });
  }
}