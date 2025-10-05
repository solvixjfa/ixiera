// API SIMPLE TANPA SUPABASE - PAKAI DATA STATIS
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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

    // DATA STATIS UNTUK AGENCY - LEBIH SIMPLE
    const packagesText = `• STARTER: Rp 8.9jt - 2-3 minggu (UMKM & Freelancer)
• GROWTH: Rp 19.9jt - 3-4 minggu (Startup & E-commerce) 
• BUSINESS: Rp 39.9jt - 4-6 minggu (Perusahaan Menengah)`;

    const showcasesText = `• E-commerce Sneakers: Platform jualan sneakers dengan payment gateway & inventory
• Company Profile: Website perusahaan modern & responsive
• Automation System: Sistem otomasi bisnis dengan dashboard`;

    const systemPrompt = `
Persona: Anda adalah Ashley - Asisten Digital IXIERA. Nada bicara friendly, natural, ramah.

DATA IXIERA:
PAKET: ${packagesText}
SHOWCASE: ${showcasesText}

Aturan:
1. Berikan rekomendasi package berdasarkan kebutuhan user
2. Jelaskan showcase projects yang relevan  
3. Jawaban singkat & padat (3-4 kalimat)
4. Balas dalam bahasa yang sama dengan pertanyaan
5. Jika tidak yakin, sarankan konsultasi langsung

Contoh: "Untuk bisnis UKM, saya rekomendasikan STARTER package dengan harga Rp 8.9jt. Cocok untuk website company profile dengan timeline 2-3 minggu."
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