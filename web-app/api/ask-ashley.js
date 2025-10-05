// /api/ask-ashley.js - DENGAN SUPABASE
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// PASTIKAN ENVIRONMENT VARIABLE NAME SAMA!
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // atau SUPABASE_SERVICE_KEY
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

    // AMBIL DATA REAL DARI SUPABASE
    let packagesText = '';
    let showcasesText = '';

    try {
      // Ambil packages aktif
      const { data: packages, error: packagesError } = await supabase
        .from('pricing_packages')
        .select('name, price_display, timeline, target_audience, deliverables')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!packagesError && packages) {
        packagesText = packages.map(p => 
          `• ${p.name}: ${p.price_display} - ${p.timeline} (${p.target_audience})`
        ).join('\n');
      }

      // Ambil showcase projects
      const { data: showcases, error: showcasesError } = await supabase
        .from('showcase_projects')
        .select('title, category, description, solutions')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(3);

      if (!showcasesError && showcases) {
        showcasesText = showcases.map(s =>
          `• ${s.title} (${s.category}): ${s.description?.substring(0, 80)}...`
        ).join('\n');
      }

    } catch (dbError) {
      console.log('⚠️ Database error, using fallback data');
      // Fallback data
      packagesText = `• STARTER: Rp 8.9jt - 2-3 minggu (UMKM & Freelancer)
• GROWTH: Rp 19.9jt - 3-4 minggu (Startup & E-commerce)
• BUSINESS: Rp 39.9jt - 4-6 minggu (Perusahaan Menengah)`;
      
      showcasesText = `• E-commerce Sneakers: Platform jualan sneakers lengkap
• Company Profile: Website perusahaan modern
• Automation System: Sistem otomasi bisnis`;
    }

    const systemPrompt = `
Persona: Anda adalah Ashley - Asisten Digital IXIERA. Nada bicara friendly, natural, ramah.

DATA REAL-TIME DARI DATABASE IXIERA:

PAKET YANG TERSEDIA:
${packagesText}

SHOWCASE PROJECTS:
${showcasesText}

Aturan:
1. BERIKAN REKOMENDASI SPESIFIK berdasarkan data di atas
2. Jelaskan showcase projects yang relevan dengan bisnis user
3. Sertakan harga dan timeline yang akurat
4. Jawaban singkat & padat (3-4 kalimat)
5. Balas dalam bahasa yang sama dengan pertanyaan

Contoh response akurat:
"Berdasarkan data terbaru, untuk bisnis e-commerce Anda saya rekomendasikan GROWTH package (Rp 19.9jt) dengan timeline 3-4 minggu. Package ini termasuk payment gateway dan inventory system seperti showcase e-commerce sneakers kami."
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
    res.status(500).json({ error: 'Terjadi kesalahan di server.' });
  }
}