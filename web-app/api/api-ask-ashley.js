import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

    // AMBIL DATA REAL-TIME DARI SUPABASE - SESUAI STRUCTURE TABEL
    const [packagesData, showcasesData] = await Promise.all([
      // Ambil pricing_packages sesuai kolom yang ada
      supabase
        .from('pricing_packages')
        .select('id, name, slug, tagline, base_price, discounted_price, is_discounted, price_display, price_range, target_audience, deliverables, timeline, support_duration, revision_count, process_description, most_popular, badge_text')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      
      // Ambil showcase_projects sesuai kolom yang ada  
      supabase
        .from('showcase_projects')
        .select('id, title, description, category, pain_points, solutions, results, live_url, featured_image')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
    ]);

    const packages = packagesData.data || [];
    const showcases = showcasesData.data || [];

    console.log('📦 Packages loaded:', packages.length);
    console.log('🎯 Showcases loaded:', showcases.length);

    // FORMAT DATA UNTUK AI - SESUAI KOLOM TABEL
    const packagesContext = packages.map(pkg => `
PAKET: ${pkg.name} (${pkg.slug})
- Harga: ${pkg.price_display}${pkg.price_range ? ` | Range: ${pkg.price_range}` : ''}
- Harga Base: ${pkg.base_price} | Discounted: ${pkg.discounted_price} | Diskon: ${pkg.is_discounted ? 'Ya' : 'Tidak'}
- Tagline: ${pkg.tagline}
- Timeline: ${pkg.timeline}
- Support: ${pkg.support_duration}
- Revisi: ${pkg.revision_count}
- Target Audience: ${pkg.target_audience}
- Deliverables: ${Array.isArray(pkg.deliverables) ? pkg.deliverables.slice(0, 4).join(', ') : 'Tersedia fitur lengkap'}
- Proses: ${pkg.process_description ? pkg.process_description.substring(0, 100) + '...' : 'Proses terstruktur'}
- Most Popular: ${pkg.most_popular ? 'YA' : 'Tidak'}
- Badge: ${pkg.badge_text || 'Tidak ada'}
    `).join('\n');

    const showcasesContext = showcases.map(project => `
SHOWCASE: ${project.title}
- Kategori: ${project.category}
- Deskripsi: ${project.description}
- Pain Points: ${Array.isArray(project.pain_points) ? project.pain_points.join(', ') : project.pain_points}
- Solutions: ${Array.isArray(project.solutions) ? project.solutions.join(', ') : project.solutions}
- Results: ${project.results}
- Live URL: ${project.live_url}
- Featured Image: ${project.featured_image}
    `).join('\n');

    // SYSTEM PROMPT DENGAN DATA REAL-TIME
    const systemPrompt = `
# PERSONA: ASHLEY - DIGITAL SOLUTIONS ASSISTANT IXIERA

## IDENTITY:
- Nama: Ashley AI
- Role: Digital Solutions Specialist di IXIERA  
- Expertise: Website development, business automation, digital systems
- Tone: Professional, helpful, specific, solution-oriented
- Bahasa: Gunakan bahasa yang sama dengan pertanyaan user

## DATA REAL-TIME DARI DATABASE IXIERA:

### PAKET HARGA YANG TERSEDIA (dari tabel pricing_packages):
${packagesContext}

### SHOWCASE PROJECTS (dari tabel showcase_projects):
${showcasesContext}

## ATURAN STRICT:
1. **HANYA GUNAKAN DATA DI ATAS** - jangan membuat informasi sendiri
2. **REFERENSI SPESIFIK** ke nama paket (STARTER, GROWTH, BUSINESS, ENTERPRISE) dan showcase
3. **REKOMENDASI BERDASARKAN DATA** - sesuaikan dengan kebutuhan user
4. **JIKA TIDAK TAHU** katakan: "Berdasarkan informasi yang saya miliki, [jawaban berdasarkan data]"
5. **FOKUS PADA:** Package recommendations, showcase details, process explanation

## CONTOH RESPONSE BAIK:
"Berdasarkan data package IXIERA, untuk bisnis Anda yang butuh e-commerce lengkap, BUSINESS package cocok karena termasuk sistem inventory, payment gateway, dan dashboard admin. Harga ${packages.find(p => p.slug === 'business')?.price_display || 'Custom Pricing'} dengan timeline ${packages.find(p => p.slug === 'business')?.timeline || '3-6 minggu'}."

## CONTOH JIKA TIDAK ADA DATA:
"Maaf, informasi spesifik tentang itu belum tersedia di database saya. Saya sarankan konsultasi langsung dengan tim IXIERA untuk detail lengkap."

## PRIORITAS:
1. Rekomendasi package berdasarkan kebutuhan user
2. Penjelasan showcase projects yang relevan  
3. Informasi process & timeline
4. Arahkan ke contact untuk konsultasi detail
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

    res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: aiResponse }]
        }
      }]
    });

  } catch (error) {
    console.error('API Handler Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan di server saat memproses permintaan.' });
  }
}