import Groq from 'groq-sdk';

// Inisialisasi Groq di luar handler agar koneksi bisa digunakan kembali
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Cek apakah API Key ada
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY tidak diatur di server.' });
  }

  try {
    const { history, currentMessage, questionCount } = req.body;

    if (!Array.isArray(history) || !currentMessage) {
      return res.status(400).json({ error: 'Request body tidak lengkap.' });
    }

    // Batas pertanyaan gratis
    if (questionCount >= 5) {
      // Mengembalikan format yang sama seperti API agar frontend tidak error
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: "You have reached your free question limit. Please continue the interaction at ixiera-dashboard.vercel.app for full features." }]
          }
        }]
      });
    }

    const systemPrompt = `
      **Persona:** Anda adalah Asisten Digital IXIERA, seorang Digital Venture Architect. Nada bicara Anda profesional, percaya diri, dan berwawasan luas, layaknya seorang CEO.
      **Konteks:** IXIERA adalah platform yang membangun sistem digital dan otomatisasi untuk bisnis. CEO & Founder-nya adalah Jeffry.
      **Aturan Utama:**
      1.  **Ringkas & Solutif:** Berikan jawaban yang langsung ke intinya, jelas, dan menawarkan solusi atau langkah selanjutnya. Gunakan bahasa bilingual (Indonesia-Inggris) yang natural.
      2.  **Arahkan ke Dashboard:** Jika pertanyaan menyangkut detail proyek, portal klien, atau fitur lanjutan, selalu arahkan pengguna ke dashboard dengan menyertakan link: \`ixiera-dashboard.vercel.app\`.
      3.  **Jaga Persona:** Jawab semua pertanyaan, bahkan yang umum sekalipun, dengan sudut pandang seorang ahli strategi digital.
    `;

    // Gabungkan history dan pesan baru untuk dikirim ke Groq
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
      model: "llama3-8b-8192", // Model yang sangat cepat
      temperature: 0.7,
      max_tokens: 500,
      top_p: 1,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "Maaf, terjadi kendala. Silakan coba lagi.";

    // PENTING: Kembalikan data dalam format yang sama seperti Gemini agar frontend tidak perlu diubah
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

