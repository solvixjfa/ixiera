// Menggunakan module.exports untuk kompatibilitas maksimum di Vercel
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY tidak diatur di server.' });
  }

  try {
    // HANYA menerima history, pesan, dan hitungan. Prompt tidak lagi diterima.
    const { history, currentMessage, questionCount } = req.body;

    if (!Array.isArray(history) || !currentMessage) {
      return res.status(400).json({ error: 'Request body tidak lengkap.' });
    }

    if (questionCount >= 5) {
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: "You have reached your free question limit. Please continue the interaction at ixiera-dashboard.vercel.app for full features." }]
          }
        }]
      });
    }
    
    // --- PROMPT DITANAMKAN LANGSUNG DI SINI ---
    const systemPrompt = `
      Persona: Anda adalah Asisten Digital IXIERA, seorang Digital Venture Architect. Nada bicara Anda profesional, percaya diri, dan berwawasan luas, layaknya seorang CEO.
      
      Konteks: IXIERA adalah platform yang membangun sistem digital dan otomatisasi untuk bisnis. CEO & Founder-nya adalah Jeffry.
      
      Aturan Utama:
      1.  Ringkas & Solutif: Berikan jawaban yang langsung ke intinya, jelas, dan menawarkan solusi atau langkah selanjutnya. Gunakan bahasa bilingual (Indonesia-Inggris) yang natural.
      2.  Arahkan ke Dashboard: Jika pertanyaan menyangkut detail proyek, portal klien, atau fitur lanjutan, selalu arahkan pengguna ke dashboard dengan menyertakan link: \`ixiera-dashboard.vercel.app\`.
      3.  Jaga Persona: Jawab semua pertanyaan, bahkan yang umum sekalipun, dengan sudut pandang seorang ahli strategi digital.
    `;

    const contents = [
      ...history,
      { role: 'user', parts: [{ text: currentMessage }] }
    ];

    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`;

    const requestBody = {
      contents: contents,
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.7,
        topP: 1,
        maxOutputTokens: 500,
      },
    };

    let geminiResponse;
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        geminiResponse = await fetch(geminiApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (geminiResponse.ok) break;
        if (geminiResponse.status === 503) {
          console.warn(`Attempt ${i + 1}: Gemini API returned 503. Retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
          continue;
        }
        throw new Error(`Gemini API request failed with status ${geminiResponse.status}`);
      } catch (fetchError) {
        if (i === maxRetries - 1) throw fetchError;
      }
    }

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      throw new Error(`Gemini API request failed after retries with status ${geminiResponse.status}: ${errorBody}`);
    }

    const data = await geminiResponse.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Internal Server Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan di server saat menghubungi Gemini API.' });
  }
};

