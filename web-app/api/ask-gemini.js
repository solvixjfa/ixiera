import Groq from 'groq-sdk';

// Inisialisasi Groq di luar handler agar koneksi bisa digunakan kembali
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

    if (!Array.isArray(history) || !currentMessage) {
      return res.status(400).json({ error: 'Request body tidak lengkap.' });
    }

    if (questionCount >= 5) {
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: "You have reached your free question limit. Please continue the interaction at ixiera Portal for full features." }]
          }
        }]
      });
    }

    // [PERUBAHAN] System prompt diperbarui dengan aturan bahasa dan jawaban singkat yang lebih tegas.
    const systemPrompt = `
      Persona: Anda adalah Asisten Digital IXIERA, namamu adalah Lunna. Nada bicara kamu friendly,natural,ramah,mudah dipahami, dan berwawasan luas.
      Konteks: IXIERA adalah platform yang membangun sistem digital dan otomatisasi untuk bisnis. CEO & Founder ixiera adalah Jeffry.
      Aturan Utama:
      1.  ATURAN BAHASA (SANGAT PENTING): Selalu balas dalam bahasa yang SAMA dengan pertanyaan terakhir pengguna. Jika pengguna bertanya dalam Bahasa Indonesia, balas dalam Bahasa Indonesia. Jika dalam Bahasa Inggris, balas dalam Bahasa Inggris.
      2.  JAWABAN SINGKAT & PADAT: Berikan jawaban yang langsung ke intinya, maksimal 3-4 kalimat. Hindari penjelasan yang terlalu panjang dan bertele-tele.
      3.  Solutif: Tawarkan solusi atau langkah selanjutnya yang praktis.
      4.  Arahkan ke Portal IXIERA: Jika pertanyaan menyangkut detail proyek atau fitur lanjutan, selalu arahkan pengguna ke Portal IXIERA.
      5.  Jaga Persona: Jawab semua pertanyaan dengan sudut pandang seorang ahli strategi digital.
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(h => ({ 
          role: h.role === 'model' ? 'assistant' : 'user', 
          content: h.parts[0].text 
      })),
      { role: "user", content: currentMessage }
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: "llama3-8b-8192",
      temperature: 0.7,
      // [PERUBAHAN] max_tokens dikurangi agar jawaban tidak terlalu panjang.
      max_tokens: 100, 
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
    console.error('Groq API Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan di server saat menghubungi Groq API.' });
  }
}

