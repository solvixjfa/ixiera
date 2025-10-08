// /api/ask-ashley.js - FIXED VERSION
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
let supabase;

try {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
} catch (error) {
  console.log('⚠️ Supabase client init failed');
  supabase = null;
}

// ✅ FALLBACK DATA 
const FALLBACK_PACKAGES = `
• WEB PRESENCE STARTER: Rp 899rb - 3-5 HARI (UMKM, Freelancer, Startup)
  Fitur: Landing page premium, Domain .my.id GRATIS 1 tahun, Hosting GRATIS 1 tahun, WhatsApp integration

• DIGITAL GROWTH PACKAGE: Mulai dari Rp 4,49 juta-an - 10-14 Hari (Online shop 50+ produk, Agency, Consultant)
  Fitur: Website multi-halaman, Blog CMS, Sistem otomasi formulir, Payment gateway, SEO optimization

• BUSINESS SCALING SUITE: Mulai Rp 8.9 Juta - 3-6 Minggu (Toko online 100+ produk, Startup growth)
  Fitur: Custom e-commerce, Client portal, Workflow automation, Advanced dashboard, API development

• ENTERPRISE DIGITAL TRANSFORMATION — Custom (2–4 Bulan)
Untuk perusahaan established dan corporate yang membutuhkan solusi transformasi digital berskala besar.
Fitur utama:
• Custom development
• Legacy system integration
• Enterprise API
• Microservices architecture
 Estimasi waktu pengerjaan 2–4 bulan, dan semua fitur bersifat custom sesuai kebutuhan bisnis Anda.
`;

const FALLBACK_SHOWCASES = `
• e-commerce sneakers: Platform jualan sneakers otomatis dengan dashboard pelanggan, tracking produk, dan chat admin real-time. Hasil: Satu platform untuk jualan online dengan integrasi penuh.

• Ixiera Agency Website: Website agency professional dengan integrated system dan client onboarding experience. Hasil: Client acquisition meningkat 60%, onboarding time berkurang 50%.
`;

// ✅ SIMPLE CACHE SYSTEM
let cache = {
  packages: null,
  showcases: null,
  lastUpdated: null
};

// ✅ FIX: GET CACHED DATA FUNCTION YANG HILANG
async function getCachedData() {
  const now = Date.now();
  
  // Return cached data jika masih fresh (5 menit)
  if (cache.packages && cache.lastUpdated && (now - cache.lastUpdated < 300000)) {
    return {
      packages: cache.packages,
      showcases: cache.showcases,
      source: 'cache'
    };
  }
  
  try {
    let packagesText = FALLBACK_PACKAGES;
    let showcasesText = FALLBACK_SHOWCASES;
    let source = 'fallback';

    if (supabase) {
      // Query packages
      const packagesResult = await supabase
        .from('pricing_packages')
        .select('name, price_display, timeline, target_audience, deliverables, most_popular')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (packagesResult.data && packagesResult.data.length > 0) {
        packagesText = packagesResult.data.map(pkg => {
          const popularBadge = pkg.most_popular ? ' 🔥 PALING DIMINATI' : '';
          return `• ${pkg.name}: ${pkg.price_display} - ${pkg.timeline} (${pkg.target_audience})${popularBadge}`;
        }).join('\n');
        source = 'supabase';
      }

      // Query showcases
      const showcasesResult = await supabase
        .from('showcase_projects')
        .select('title, description, results')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(3);

      if (showcasesResult.data && showcasesResult.data.length > 0) {
        showcasesText = showcasesResult.data.map(showcase => 
          `• ${showcase.title}: ${showcase.description} Hasil: ${showcase.results}`
        ).join('\n');
      }
    }

    // Update cache
    cache.packages = packagesText;
    cache.showcases = showcasesText;
    cache.lastUpdated = now;

    return { packages: packagesText, showcases: showcasesText, source };
    
  } catch (error) {
    console.log('⚠️ Cache update failed, using fallback:', error.message);
    return {
      packages: FALLBACK_PACKAGES,
      showcases: FALLBACK_SHOWCASES,
      source: 'fallback'
    };
  }
}

// ✅ SIMPLE FALLBACK SYSTEM
function handleGeneralQuestion(message) {
  const lowerMsg = message.toLowerCase();
  
  if (/^(hai|halo|hi|hello)/i.test(lowerMsg)) {
    return "Halo! Saya Ashley dari IXIERA 🤗 Ada yang bisa saya bantu?";
  }
  
  if (/(terima kasih|thanks|thank you)/i.test(lowerMsg)) {
    return "Sama-sama! Senang bisa membantu 😊";
  }
  
  if (/(paket|harga|price|berapa)/i.test(lowerMsg)) {
    return `📦 **PAKET HARGA:**\n\n${FALLBACK_PACKAGES}\n\nMau konsultasi gratis?`;
  }
  
  if (/(portfolio|contoh|showcase)/i.test(lowerMsg)) {
    return `🎯 **SHOWCASE:**\n\n${FALLBACK_SHOWCASES}\n\nIngin buat yang serupa?`;
  }
  
  if (/(kontak|hubungi|call|telepon|whatsapp)/i.test(lowerMsg)) {
    return "📞 **HUBUNGI KAMI:**\n\nWhatsApp: +62...\nWebsite: ixiera.com\nEmail: hello@ixiera.com\n\nTim kami siap membantu!";
  }
  
  return null;
}

// ✅ MAIN HANDLER
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
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

    // ✅ CEK FALLBACK DULU (ZERO COST)
    const fallbackResponse = handleGeneralQuestion(currentMessage);
    if (fallbackResponse) {
      console.log('✅ Fallback handled (zero cost)');
      return res.status(200).json({
        candidates: [{ content: { parts: [{ text: fallbackResponse }] } }],
        source: 'fallback'
      });
    }

    // ✅ JIKA BUKAN PERTANYAAN UMUM, PAKAI GROQ API
    console.log('🤖 Complex question -> Using Groq API');
    const { packages, showcases, source } = await getCachedData(); // ✅ NOW WORKING!
    
    const systemPrompt = `
# ASHLEY AI - IXIERA DIGITAL ASSISTANT

## DATA REAL ${source.toUpperCase()}:

### PAKET HARGA YANG TERSEDIA:
${packages}

### SHOWCASE PROJECTS BERHASIL:
${showcases}

## ATURAN RESPONSE:
1. Berikan REKOMENDASI SPESIFIK berdasarkan data di atas
2. Sertakan HARGA dan TIMELINE yang akurat
3. Jelaskan showcase yang relevan
4. Jawaban singkat (3-4 kalimat)
5. Batasi 5 pertanyaan per session

## TONE & GAYA:
- Profesional namun hangat
- Solutif dan jelas
- Seperti konsultan digital

CONTOH: "Baik, untuk bisnis UMKM Anda saya rekomendasikan WEB PRESENCE STARTER (Rp 899rb) dengan timeline 3-5 hari. Cocok untuk website profesional dengan domain gratis."
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
    console.log('📁 Data source:', source);

    res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: aiResponse }]
        }
      }],
      source: 'groq_api'
    });

  } catch (error) {
    console.error('❌ API Handler Error:', error.message);
    
    // ✅ FALLBACK JIKA ERROR
    res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: "Maaf, sistem sedang sibuk. Untuk informasi cepat tentang layanan IXIERA, silakan tanyakan tentang paket harga atau portfolio project kami! 😊" }]
        }
      }],
      source: 'error_fallback'
    });
  }
}