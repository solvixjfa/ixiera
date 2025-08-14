// File: /api/ask-gemini.js
// Ini adalah Vercel Serverless Function.

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY tidak diatur di server.' });
  }

  try {
    // Ambil data dari body request yang dikirim oleh ai.js
    const { systemPrompt, history, currentMessage } = req.body;

    // Validasi input dasar
    if (!systemPrompt || !Array.isArray(history) || !currentMessage) {
        return res.status(400).json({ error: 'Request body tidak lengkap. Membutuhkan systemPrompt, history, dan currentMessage.' });
    }

    // Gabungkan riwayat lama dengan pesan baru dari pengguna
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
        maxOutputTokens: 2048,
      },
    };

    // Kirim request ke Google Gemini API
    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('Gemini API Error:', errorBody);
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json();

    // Kirim kembali respons dari Gemini ke browser
    res.status(200).json(data);

  } catch (error) {
    console.error('Internal Server Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan di server saat menghubungi Gemini API.' });
  }
}

