// /api/ask-ashley.js - DENGAN DATA REAL DARI DATABASE ANDA
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Supabase client dengan error handling
let supabase;
try {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
} catch (error) {
  console.log('⚠️ Supabase client init failed');
  supabase = null;
}

// FALLBACK DATA REAL dari database Anda
const FALLBACK_PACKAGES = `
• WEB PRESENCE STARTER: Rp 899rb - 3-5 HARI (UMKM, Freelancer, Startup)
  Fitur: Landing page premium, Domain .my.id GRATIS 1 tahun, Hosting GRATIS 1 tahun, WhatsApp integration

• DIGITAL GROWTH PACKAGE: Mulai dari Rp 4,5 juta-an - 10-14 Hari (Online shop 50+ produk, Agency, Consultant)
  Fitur: Website multi-halaman, Blog CMS, Sistem otomasi formulir, Payment gateway, SEO optimization

• BUSINESS SCALING SUITE: Mulai Rp 8.9 Juta - 3-6 Minggu (Toko online 100+ produk, Startup growth)
  Fitur: Custom e-commerce, Client portal, Workflow automation, Advanced dashboard, API development

• ENTERPRISE DIGITAL TRANSFORMATION: Mulai Rp 35 Juta - 2-4 Bulan (Perusahaan established, Corporate)
  Fitur: Custom development, Legacy system integration, Enterprise API, Microservices architecture
`;

const FALLBACK_SHOWCASES = `
• e-commerce sneakers: Platform jualan sneakers otomatis dengan dashboard pelanggan, tracking produk, dan chat admin real-time. Hasil: Satu platform untuk jualan online dengan integrasi penuh.

• Workspace Ixiera - Project Management Platform: Platform manajemen project dengan AI assistant untuk collaboration real-time dengan client. Hasil: Client satisfaction meningkat 70%, waktu admin berkurang 2-3 jam/hari.

• Ixiera Agency Website: Website agency professional dengan integrated system dan client onboarding experience. Hasil: Client acquisition meningkat 60%, onboarding time berkurang 50%.
`;

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

    // ✅ LIMIT 5 PERTANYAAN
    if (questionCount >= 5) {
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: "Anda telah mencapai batas 5 pertanyaan gratis. Untuk konsultasi lebih lanjut dan informasi detail tentang packages kami, silakan hubungi tim IXIERA langsung melalui website kami." }]
          }
        }]
      });
    }

    // AMBIL DATA DENGAN ERROR HANDLING YANG LEBIH BAIK
    let packagesText = FALLBACK_PACKAGES;
    let showcasesText = FALLBACK_SHOWCASES;
    let dataSource = 'fallback';

    if (supabase) {
      try {
        console.log('🔄 Fetching data from Supabase...');
        
        // Setup timeout untuk Supabase queries
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase timeout')), 5000)
        );

        // Query packages dengan Promise.race untuk timeout
        const packagesQuery = supabase
          .from('pricing_packages')
          .select('name, price_display, timeline, target_audience, deliverables, most_popular')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        const packagesResult = await Promise.race([packagesQuery, timeoutPromise]);
        
        if (packagesResult.data && packagesResult.data.length > 0) {
          packagesText = packagesResult.data.map(pkg => {
            const popularBadge = pkg.most_popular ? ' 🔥 PALING DIMINATI' : '';
            return `• ${pkg.name}: ${pkg.price_display} - ${pkg.timeline} (${pkg.target_audience})${popularBadge}`;
          }).join('\n');
          dataSource = 'supabase';
          console.log('✅ Packages loaded from Supabase:', packagesResult.data.length);
        }

        // Query showcases
        const showcasesQuery = supabase
          .from('showcase_projects')
          .select('title, description, results')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .limit(3);

        const showcasesResult = await Promise.race([showcasesQuery, timeoutPromise]);
        
        if (showcasesResult.data && showcasesResult.data.length > 0) {
          showcasesText = showcasesResult.data.map(showcase => 
            `• ${showcase.title}: ${showcase.description} Hasil: ${showcase.results}`
          ).join('\n');
          console.log('✅ Showcases loaded from Supabase:', showcasesResult.data.length);
        }

      } catch (dbError) {
        console.log('⚠️ Using fallback data due to:', dbError.message);
        // Tetap pakai fallback data yang sudah akurat
      }
    }

    const systemPrompt = `
# ASHLEY AI - IXIERA DIGITAL ASSISTANT

## DATA REAL ${dataSource === 'supabase' ? 'DARI DATABASE' : 'STANDARD'}:

### PAKET HARGA YANG TERSEDIA:
${packagesText}

### SHOWCASE PROJECTS BERHASIL:
${showcasesText}

##  ATURAN RESPONSE (IXIERA AI STYLE)

Kamu adalah asisten AI profesional dari IXIERA yang membantu user memilih layanan dengan cepat, ramah, dan akurat.  
Gunakan gaya bicara yang profesional namun tetap hangat dan mudah dicerna, seperti seorang konsultan digital yang memahami bisnis kliennya.

## ATURAN RESPONSE:
1. Berikan REKOMENDASI SPESIFIK berdasarkan data di atas — jangan buat informasi sendiri.
2. Sertakan HARGA dan TIMELINE yang akurat dari data IXIERA.
3. Jelaskan showcase atau contoh proyek yang relevan dengan kebutuhan user.
4. Batasi percakapan maksimal 5 pertanyaan per session.
5. Gunakan jawaban singkat (3–4 kalimat) yang jelas, ramah, dan solutif.
6. Jika user bertanya lebih dari 5x, balas dengan sopan:
   > “Limit pertanyaan sudah habis ya, kamu bisa mulai sesi baru untuk melanjutkan 🙂.”

## TONE & GAYA KOMUNIKASI:
- Gunakan sapaan ringan seperti “baik”, “siap”, atau “berikut rekomendasi terbaiknya ya”.
- Tunjukkan empati dan semangat membantu, tapi tetap efisien.
- Hindari bahasa terlalu kaku atau terlalu santai; jaga keseimbangan profesional dan friendly.

## CONTOH RESPONSE BAIK:
"Baik, berdasarkan data terbaru IXIERA, untuk bisnis UMKM Anda saya rekomendasikan WEB PRESENCE STARTER (Rp 899rb) dengan timeline 3–5 hari. Cocok untuk website profesional dengan domain gratis."

"Untuk toko online yang butuh sistem lengkap, DIGITAL GROWTH PACKAGE (Rp 4.499rb) dengan timeline 10–14 hari sudah termasuk payment gateway dan inventory system, seperti showcase e-commerce sneakers kami."
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

    console.log('🤖 AI Response generated');
    console.log('📊 Question count:', questionCount);
    console.log('📁 Data source:', dataSource);

    res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: aiResponse }]
        }
      }]
    });

  } catch (error) {
    console.error('❌ API Handler Error:', error.message);
    res.status(500).json({ 
      error: 'Terjadi kesalahan di server.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}