// /api/ask-ashley.js - ULTRA ENHANCED VERSION
import Groq from 'groq-sdk';

// Initialize Groq with enhanced error handling
let groq;
try {
  groq = new Groq({ 
    apiKey: process.env.GROQ_API_KEY,
    timeout: 25000 // 25 second timeout
  });
  console.log('✅ Groq client initialized');
} catch (error) {
  console.error('❌ Groq client init failed:', error.message);
  groq = null;
}

// ✅ ENHANCED FALLBACK DATA WITH CLICKABLE LINKS
const FALLBACK_PACKAGES = `
• **WEB PRESENCE STARTER**: Rp 999rb - 3-5 HARI 
  _Untuk_: UMKM, Freelancer, Startup
  _Fitur_: Landing page premium, Domain gratis 1 tahun, Hosting gratis, WhatsApp integration

• **DIGITAL GROWTH PACKAGE**: Mulai Rp 4,5 juta - 10-14 Hari
  _Untuk_: Online shop 50+ produk, Agency, Consultant  
  _Fitur_: Website multi-halaman, Blog CMS, Payment gateway, SEO optimization

• **BUSINESS SCALING SUITE**: Mulai Rp 8.9 Juta - 3-6 Minggu
  _Untuk_: Toko online 100+ produk, Startup growth
  _Fitur_: Custom e-commerce, Client portal, Workflow automation, API development

• **ENTERPRISE SOLUTION**: Custom - 2-4 Bulan
  _Untuk_: Perusahaan established, Corporate
  _Fitur_: Custom development, Legacy system integration, Enterprise API
`;

const FALLBACK_SHOWCASES = `
• **E-commerce Sneakers**: Platform jualan sneakers dengan dashboard lengkap, tracking produk, dan chat admin real-time

• **Ixiera Agency Website**: Website agency professional dengan integrated system dan client onboarding experience

• **Portfolio Creative Studio**: Website portfolio interaktif dengan gallery project dan contact system yang responsive
`;

// ✅ CLICKABLE CONTACT INFO
const CONTACT_INFO = `
📞 **Hubungi Kami:**
• **WhatsApp**: <a href="https://wa.me/6285702373412" target="_blank" style="color: #007bff; text-decoration: none;">+62 857-0237-3412</a>
• **Website**: <a href="https://ixiera.id" target="_blank" style="color: #007bff; text-decoration: none;">ixiera.id</a>
• **Email**: <a href="mailto:ixierastudio@gmail.com" style="color: #007bff; text-decoration: none;">ixierastudio@gmail.com</a>
• **Start Project**: <a href="/contact.html" style="color: #007bff; text-decoration: none;">Klik di sini</a>
`;

// ✅ QUICK LINKS FOR NAVIGATION
const QUICK_LINKS = `
🔗 **Akses Cepat:**
• <a href="/pricing.html" style="color: #007bff; text-decoration: none;">📦 Lihat Pricing Lengkap</a>
• <a href="/portfolio.html" style="color: #007bff; text-decoration: none;">🎯 Lihat Portfolio Kami</a>
• <a href="/services.html" style="color: #007bff; text-decoration: none;">🚀 Pelajari Layanan</a>
• <a href="/contact.html" style="color: #007bff; text-decoration: none;">💬 Mulai Project</a>
`;

// ✅ ENHANCED CACHE SYSTEM
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Cache cleanup every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}, 60000);

// ✅ RATE LIMITING PROTECTION
const userRequests = new Map();
const MAX_REQUESTS_PER_MINUTE = 15;

function checkRateLimit(userId) {
  const now = Date.now();
  const userData = userRequests.get(userId) || { count: 0, firstRequest: now };
  
  // Reset counter after 1 minute
  if (now - userData.firstRequest > 60000) {
    userRequests.set(userId, { count: 1, firstRequest: now });
    return true;
  }
  
  // Check if exceeded limit
  if (userData.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  userData.count++;
  userRequests.set(userId, userData);
  return true;
}

// ✅ ENHANCED FALLBACK SYSTEM WITH CLICKABLE LINKS
function handleGeneralQuestion(message, questionCount = 0) {
  const lowerMsg = message.toLowerCase().trim();
  
  // Enhanced greeting patterns
  if (/^(hai|halo|hi|hello|hey|hallo|selamat|pagi|siang|sore|malam)/i.test(lowerMsg)) {
    const greetings = [
      `Halo! Saya Ashley AI dari IXIERA 🤗 Ada yang bisa saya bantu hari ini? \n\n${QUICK_LINKS}`,
      `Halo! Senang bertemu dengan Anda. Ada yang bisa saya bantu mengenai solusi digital? \n\n${QUICK_LINKS}`,
      `Halo! Ashley AI di sini. Mari diskusikan kebutuhan digital bisnis Anda! \n\n${QUICK_LINKS}`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // Thank you responses
  if (/(terima kasih|thanks|thank you|makasih|thx|tq)/i.test(lowerMsg)) {
    const thanksResponses = [
      `Sama-sama! Senang bisa membantu 😊 \n\nButuh informasi lebih detail? ${QUICK_LINKS}`,
      `Dengan senang hati! Ada hal lain yang ingin Anda tanyakan? \n\n${QUICK_LINKS}`,
      `Sama-sama! Tim kami siap membantu mewujudkan project digital Anda. ${CONTACT_INFO}`
    ];
    return thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
  }
  
  // Package & pricing inquiries
  if (/(paket|harga|price|berapa|tarif|biaya|mahal|murah|investasi|budget)/i.test(lowerMsg)) {
    return `📦 **REKOMENDASI PAKET:**\n\n${FALLBACK_PACKAGES}\n\n💡 **Tips:** Untuk rekomendasi yang lebih personalized, ceritakan lebih detail tentang bisnis Anda!\n\n${QUICK_LINKS}`;
  }
  
  // Portfolio & showcase inquiries
  if (/(portfolio|contoh|showcase|project|hasil|kerjaan|karya|demo)/i.test(lowerMsg)) {
    return `🎯 **SHOWCASE PROJECT KAMI:**\n\n${FALLBACK_SHOWCASES}\n\n📁 **Lihat lengkapnya:** <a href="/portfolio.html" style="color: #007bff; text-decoration: none;">Klik di sini untuk melihat portfolio lengkap</a>\n\n${QUICK_LINKS}`;
  }
  
  // Contact information
  if (/(kontak|hubungi|call|telepon|whatsapp|wa|email|alamat|lokasi|kantor)/i.test(lowerMsg)) {
    return `📞 **INFORMASI KONTAK:**\n\n${CONTACT_INFO}\n\n${QUICK_LINKS}`;
  }
  
  // Services inquiry
  if (/(layanan|service|jasa|fitur|teknologi|buat website|bikin web|develop|program)/i.test(lowerMsg)) {
    return `🚀 **LAYANAN KAMI:**\n\n• **Website Development** - Dari landing page sampai e-commerce complex\n• **Digital Transformation** - Automation & system integration\n• **UI/UX Design** - Design yang user-friendly dan modern\n• **Maintenance & Support** - Support berkelanjutan\n\n🔍 **Pelajari lebih lanjut:** <a href="/services.html" style="color: #007bff; text-decoration: none;">Klik di sini untuk detail layanan</a>\n\n${QUICK_LINKS}`;
  }
  
  // Process & timeline
  if (/(proses|timeline|tahapan|langkah|cara kerja|durasi|lama|cepat)/i.test(lowerMsg)) {
    return `⏱️ **PROSES KERJA:**\n\n1. **Konsultasi** - Diskusi kebutuhan & goals\n2. **Planning** - Rencana project & timeline\n3. **Development** - Pengerjaan oleh tim expert\n4. **Testing** - Quality assurance & revision\n5. **Launch** - Deployment & support\n\n📅 **Timeline:** Mulai dari 3 hari sampai 4 bulan, tergantung complexity project.\n\n${QUICK_LINKS}`;
  }
  
  // About company
  if (/(tentang|about|perusahaan|studio|team|tim|ixiera)/i.test(lowerMsg)) {
    return `🏢 **TENTANG IXIERA:**\n\nKami adalah studio digital yang specialize dalam pembuatan website dan solusi digital untuk UMKM sampai enterprise.\n\n🎯 **Visi:** Memberikan solusi digital yang accessible dan impactful untuk bisnis Indonesia.\n\n👥 **Team:** Professional dengan pengalaman di berbagai industry.\n\n📖 **Cerita lengkap:** <a href="/about.html" style="color: #007bff; text-decoration: none;">Baca our story di sini</a>\n\n${QUICK_LINKS}`;
  }
  
  // Start project
  if (/(mulai|project|kerjasama|order|pesan|buatkan|bikin|develop)/i.test(lowerMsg)) {
    return `🎉 **SIAP MULAI PROJECT?**\n\nLangkah mudah memulai:\n\n1. **Konsultasi Gratis** - Diskusikan ide & kebutuhan\n2. **Quotation** - Dapatkan penawaran detail\n3. **Development** - Kami kerjakan project Anda\n4. **Launch** - Website live & siap digunakan\n\n🚀 **Mulai sekarang:** <a href="/contact.html" style="color: #007bff; text-decoration: none;">Klik di sini untuk start project</a>\n\n${CONTACT_INFO}`;
  }
  
  return null;
}

// ✅ ENHANCED REQUEST VALIDATION
function validateRequest(body) {
  const { history, currentMessage, questionCount, userId, sessionId } = body;
  
  // Validate required fields
  if (!currentMessage || typeof currentMessage !== 'string' || currentMessage.trim().length === 0) {
    return { valid: false, error: 'Pesan tidak boleh kosong' };
  }
  
  // Validate message length
  if (currentMessage.length > 1200) {
    return { valid: false, error: 'Pesan terlalu panjang (max 1200 karakter)' };
  }
  
  // Validate question count
  if (typeof questionCount !== 'number' || questionCount < 0 || questionCount > 100) {
    return { valid: false, error: 'Question count tidak valid' };
  }
  
  // Sanitize message (basic sanitization)
  const sanitizedMessage = currentMessage.trim().substring(0, 1200);
  
  return { 
    valid: true, 
    data: { 
      history: Array.isArray(history) ? history.slice(-10) : [], // Keep last 10 messages only
      currentMessage: sanitizedMessage,
      questionCount: Math.min(questionCount, 100),
      userId: userId || 'anonymous',
      sessionId: sessionId || `session_${Date.now()}`
    }
  };
}

// ✅ ENHANCED PROMPT ENGINEERING
function createSystemPrompt(packages, showcases, source, questionCount) {
  return `
# ASHLEY AI - IXIERA DIGITAL ASSISTANT v2.1

## CONTEXT & PERSONA:
Anda adalah Ashley AI, asisten digital profesional dari IXIERA Studio yang membantu calon klien menemukan solusi digital tepat untuk bisnis mereka.

## DATA TERBARU (Source: ${source.toUpperCase()}):

### 📦 PAKET LAYANAN:
${packages}

### 🎯 HASIL PROJECT:
${showcases}

### 🔗 INFORMASI PENTING:
- WhatsApp: +62 857-0237-3412
- Website: ixiera.id
- Email: ixierastudio@gmail.com
- Pricing: /pricing.html
- Portfolio: /portfolio.html
- Contact: /contact.html

## ATURAN RESPONSE:
1. BERIKAN REKOMENDASI SPESIFIK berdasarkan jenis bisnis dan kebutuhan
2. GUNAKAN LINK INTERNAL untuk navigasi (/pricing.html, /portfolio.html, dll)
3. JANGAN buat link external kecuali WhatsApp dan email
4. JANGAN beri informasi yang tidak ada dalam data di atas
5. BATASI 4-5 kalimat per response untuk efisiensi
6. GUNAKAN EMOJI yang relevan untuk engagement
7. SELIPKAN call-to-action yang natural

## FORMAT PREFERENSI:
- Gunakan **bold** untuk penekanan penting
- Gunakan HTML <a href="/page.html">teks</a> untuk internal links
- Sertakan QUICK_LINKS di akhir jika relevan

## CONTOH RESPONSE YANG BAIK:
"Berdasarkan kebutuhan **toko online** Anda, saya rekomendasikan **DIGITAL GROWTH PACKAGE** (Rp 4,5 juta - 10-14 hari). Package ini sudah termasuk payment gateway dan inventory management. 🛒\n\n📁 **Lihat detail:** <a href="/pricing.html">Klik di sini untuk pricing lengkap</a>"

"Untuk project **company profile** yang Anda sebutkan, **WEB PRESENCE STARTER** cocok dengan budget dan timeline. Kami sudah buat banyak website serupa di portfolio. 🌟\n\n🎯 **Lihat contoh:** <a href="/portfolio.html">Browse portfolio kami di sini</a>"

## STATUS SESSION: Pertanyaan ke-${questionCount + 1} dari 5 pertanyaan gratis.
`;
}

// ✅ MAIN HANDLER - ENHANCED VERSION
export default async function handler(req, res) {
  const startTime = Date.now();
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      message: 'Hanya POST request yang diizinkan'
    });
  }

  try {
    const { history, currentMessage, questionCount, userId, sessionId } = req.body;

    // Enhanced request validation
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Request tidak valid',
        message: validation.error
      });
    }

    const { data: validatedData } = validation;

    // Rate limiting check
    if (!checkRateLimit(validatedData.userId)) {
      return res.status(429).json({
        candidates: [{
          content: {
            parts: [{ 
              text: "⏱️ Terlalu banyak request dalam waktu singkat. Silakan tunggu 1 menit sebelum bertanya lagi. 😊" 
            }]
          }
        }],
        source: 'rate_limited'
      });
    }

    // ✅ LIMIT 5 PERTANYAAN GRATIS
    if (validatedData.questionCount >= 5) {
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ 
              text: `🎯 **Session Gratis Telah Habis**\n\nAnda telah menggunakan 5 pertanyaan gratis. Untuk konsultasi lebih lanjut dan informasi detail:\n\n${CONTACT_INFO}\n\n${QUICK_LINKS}\n\nTerima kasih telah menggunakan Ashley AI! 😊` 
            }]
          }
        }],
        source: 'limit_reached',
        usage: {
          question_count: validatedData.questionCount,
          status: 'limit_reached'
        }
      });
    }

    // ✅ CEK FALLBACK DULU (ZERO COST)
    const fallbackResponse = handleGeneralQuestion(validatedData.currentMessage, validatedData.questionCount);
    if (fallbackResponse) {
      console.log('✅ Fallback handled (zero cost)');
      return res.status(200).json({
        candidates: [{ 
          content: { 
            parts: [{ text: fallbackResponse }] 
          } 
        }],
        source: 'fallback',
        metadata: {
          response_time: Date.now() - startTime,
          question_count: validatedData.questionCount,
          remaining_questions: 5 - validatedData.questionCount
        }
      });
    }

    // ✅ JIKA BUKAN PERTANYAAN UMUM, PAKAI GROQ API
    console.log('🤖 Complex question -> Using Groq API');
    
    const cacheKey = `data_${validatedData.userId}`;
    let cacheHit = false;
    let packages = FALLBACK_PACKAGES;
    let showcases = FALLBACK_SHOWCASES;
    let source = 'fallback';

    // Try to get from cache
    const cachedData = cache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      packages = cachedData.packages;
      showcases = cachedData.showcases;
      source = 'cache';
      cacheHit = true;
      console.log('📦 Using cached data');
    } else {
      // Use fallback data (since we removed Supabase)
      packages = FALLBACK_PACKAGES;
      showcases = FALLBACK_SHOWCASES;
      source = 'fallback';
      cache.set(cacheKey, { packages, showcases, timestamp: Date.now() });
    }

    // Enhanced system prompt
    const systemPrompt = createSystemPrompt(packages, showcases, source, validatedData.questionCount);

    // Prepare messages for Groq
    const safeHistory = validatedData.history.reduce((acc, h) => {
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
      ...safeHistory.slice(-6), // Last 6 messages for context
      { role: "user", content: validatedData.currentMessage }
    ];

    // Call Groq API with enhanced error handling
    if (!groq) {
      throw new Error('Groq client not initialized');
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 450,
      top_p: 0.9,
    });

    let aiResponse = chatCompletion.choices[0]?.message?.content || 
                    "Maaf, terjadi kendala teknis. Silakan coba lagi.";

    // Ensure response has proper formatting
    if (!aiResponse.includes('href=') && validatedData.questionCount > 0) {
      aiResponse += `\n\n${QUICK_LINKS}`;
    }

    console.log('🤖 AI Response generated');
    console.log('📊 Question count:', validatedData.questionCount);
    console.log('📁 Data source:', source);

    res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: aiResponse }]
        }
      }],
      source: 'groq_api',
      metadata: {
        model: 'llama-3.3-70b-versatile',
        response_time: Date.now() - startTime,
        tokens_used: chatCompletion.usage?.total_tokens || 0,
        cache_hit: cacheHit,
        question_count: validatedData.questionCount,
        remaining_questions: 5 - validatedData.questionCount
      }
    });

  } catch (error) {
    console.error('❌ API Handler Error:', error.message);
    
    // Enhanced error response
    const errorResponse = `😅 **Maaf, sistem sedang sibuk**\n\nUntuk informasi cepat tentang layanan IXIERA:\n\n${QUICK_LINKS}\n\n${CONTACT_INFO}\n\nSilakan refresh halaman dan coba lagi dalam beberapa saat.`;
    
    res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: errorResponse }]
        }
      }],
      source: 'error_fallback',
      metadata: {
        error: error.message,
        response_time: Date.now() - startTime
      }
    });
  }
}