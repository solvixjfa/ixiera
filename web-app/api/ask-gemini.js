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

    if (questionCount >= 5) {
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: "Anda telah mencapai batas pertanyaan gratis. Silakan lanjutkan interaksi di Portal IXIERA untuk fitur lengkap." }]
          }
        }]
      });
    }

    const systemPrompt = `
      Persona: Anda adalah Asisten Digital IXIERA, namamu adalah Ashley. Nada bicara kamu friendly,natural,ramah,mudah dipahami, dan berwawasan luas.
      Konteks: IXIERA adalah platform yang membangun sistem digital dan otomatisasi untuk bisnis. CEO & Founder ixiera adalah Jeffry.
      Aturan Utama:
      1.  ATURAN BAHASA (SANGAT PENTING): Selalu balas dalam bahasa yang SAMA dengan pertanyaan terakhir pengguna. Jika pengguna bertanya dalam Bahasa Indonesia, balas dalam Bahasa Indonesia. Jika dalam Bahasa Inggris, balas dalam Bahasa Inggris.
      2.  JAWABAN SINGKAT & PADAT: Berikan jawaban yang langsung ke intinya, maksimal 3-4 kalimat. Hindari penjelasan yang terlalu panjang dan bertele-tele.
      3.  Solutif: Tawarkan solusi atau langkah selanjutnya yang praktis.
      4.  Arahkan ke navigasi Portal IXIERA: Jika pertanyaan menyangkut detail proyek atau fitur lanjutan, selalu arahkan pengguna ke navigasi Portal IXIERA.
      5.  Jaga Persona: Jawab semua pertanyaan dengan sudut pandang seorang ahli strategi digital.
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
      // [PERBAIKAN DEFINITIF] Menggunakan model produksi yang aktif dari dokumentasi resmi.
      model: "llama-3.3-70b-versatile", 
      temperature: 0.7,
      max_tokens: 150, 
      top_p: 1,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "Maaf, terjadi kendala. Silakan coba lagi.";

    res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: aiResponse }]
        }
      }]
    });

  } catch (error) {
    console.error('API Handler Error:', {
        message: error.message,
        requestBody: req.body 
    });
    res.status(500).json({ error: 'Terjadi kesalahan di server saat memproses permintaan.' });
  }
}




