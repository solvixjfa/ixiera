lexport default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY tidak diatur di server.' });
  }

  try {
    const { systemPrompt, history, currentMessage, questionCount } = req.body;

    if (!systemPrompt || !Array.isArray(history) || !currentMessage) {
      return res.status(400).json({ error: 'Request body tidak lengkap.' });
    }

    if (questionCount >= 5) {
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: "Batas pertanyaan gratis Anda telah tercapai. Silakan lanjutkan interaksi di ixiera-dashboard.vercel.app untuk fitur penuh." }]
          }
        }]
      });
    }

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

    // --- LOGIKA RETRY BARU ---
    let geminiResponse;
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        geminiResponse = await fetch(geminiApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        // Jika response OK (2xx), keluar dari loop
        if (geminiResponse.ok) {
          break;
        }

        // Jika response adalah 503 (Service Unavailable), coba lagi
        if (geminiResponse.status === 503) {
          console.warn(`Attempt ${i + 1}: Gemini API returned 503. Retrying...`);
          // Tunggu sejenak sebelum mencoba lagi (1 detik, 2 detik, 4 detik)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
          continue; // Lanjutkan ke iterasi berikutnya
        }

        // Jika error lain, langsung lempar error
        throw new Error(`Gemini API request failed with status ${geminiResponse.status}`);

      } catch (fetchError) {
        // Jika ini adalah percobaan terakhir, lempar error
        if (i === maxRetries - 1) {
          throw fetchError;
        }
      }
    }
    // --- AKHIR LOGIKA RETRY ---

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('Gemini API Error after retries:', errorBody);
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Internal Server Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan di server saat menghubungi Gemini API.' });
  }
}

