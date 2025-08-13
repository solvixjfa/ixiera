// File: /api/ask-gemini.js

export default async function handler(request, response) {
  // Hanya izinkan metode POST
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Ambil pesan dari browser pengguna
    const { prompt } = request.body;
    if (!prompt) {
      return response.status(400).json({ message: 'Prompt is required' });
    }

    // Ambil API key secara rahasia dari Vercel Environment Variable
    // PASTIKAN ANDA SUDAH MENGATUR INI DI PENGATURAN PROYEK VERCEL ANDA
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set on the server.");
    }
    
    // Gunakan model Flash terbaru untuk kecepatan dan efisiensi
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }]
    };

    // Server Vercel menghubungi Google
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API Error:", errorText);
      throw new Error(`Google API failed with status ${geminiResponse.status}`);
    }

    const result = await geminiResponse.json();

    // Kirim kembali jawaban AI ke browser pengguna
    return response.status(200).json(result);

  } catch (error) {
    console.error("Serverless function error:", error.message);
    return response.status(500).json({ message: 'An internal server error occurred.' });
  }
}
