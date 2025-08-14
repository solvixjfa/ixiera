export default async function handler(req, res) {
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
      return res.status(400).json({ error: 'Request body tidak lengkap. Membutuhkan systemPrompt, history, dan currentMessage.' });
    }

    // Cek batas pertanyaan
    if (questionCount >= 5) {
      return res.status(200).json({
        output: "Batas pertanyaan gratis Anda telah tercapai. Silakan lanjutkan interaksi di ixiera-dashboard.vercel.app untuk fitur penuh."
      });
    }

    const contents = [
      ...history,
      {
        role: 'user',
        parts: [{ text: currentMessage }]
      }
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

    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('Gemini API Error:', errorBody);
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Internal Server Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan di server saat menghubungi Gemini API.' });
  }
}