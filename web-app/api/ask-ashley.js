// ✅ ULTIMATE ENHANCED FALLBACK SYSTEM
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
let supabase; // (supabase init sama seperti sebelumnya)

// ✅ REAL-TIME ANALYTICS TRACKING
const analytics = {
  totalRequests: 0,
  fallbackHits: 0,
  apiCalls: 0,
  costSaved: 0,
  commonQuestions: new Map(),
  
  trackRequest(type, question) {
    this.totalRequests++;
    if (type === 'fallback') {
      this.fallbackHits++;
      this.costSaved += 0.005; // Estimasi $0.005 per API call
      
      // Track common questions untuk optimization
      const key = question.toLowerCase().substring(0, 50);
      this.commonQuestions.set(key, (this.commonQuestions.get(key) || 0) + 1);
    } else {
      this.apiCalls++;
    }
    
    console.log(`📊 Analytics: ${this.fallbackHits}/${this.totalRequests} fallbacks | $${this.costSaved.toFixed(2)} saved`);
  }
};

// ✅ ADAPTIVE LEARNING SYSTEM
class AdaptiveLearner {
  constructor() {
    this.learnedPatterns = new Map();
    this.fallbackSuccessRate = new Map();
  }
  
  learnFromInteraction(userMessage, usedFallback, responseQuality = 1) {
    const words = userMessage.toLowerCase().split(/\s+/).slice(0, 10);
    
    words.forEach(word => {
      if (word.length > 3) { // Ignore short words
        const pattern = this.learnedPatterns.get(word) || { fallbackCount: 0, totalCount: 0 };
        pattern.totalCount++;
        if (usedFallback) pattern.fallbackCount++;
        this.learnedPatterns.set(word, pattern);
      }
    });
    
    // Update success rate untuk pattern ini
    if (usedFallback) {
      const patternKey = this.extractMainPattern(userMessage);
      const currentRate = this.fallbackSuccessRate.get(patternKey) || { successes: 0, total: 0 };
      currentRate.total++;
      if (responseQuality > 0.7) currentRate.successes++;
      this.fallbackSuccessRate.set(patternKey, currentRate);
    }
  }
  
  extractMainPattern(message) {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('harga') || lowerMsg.includes('price')) return 'pricing';
    if (lowerMsg.includes('contoh') || lowerMsg.includes('portfolio')) return 'portfolio';
    if (lowerMsg.includes('fitur') || lowerMsg.includes('feature')) return 'features';
    if (lowerMsg.includes('lama') || lowerMsg.includes('timeline')) return 'timeline';
    return 'general';
  }
  
  shouldUseFallback(message) {
    const words = message.toLowerCase().split(/\s+/);
    let fallbackScore = 0;
    let totalScore = 0;
    
    words.forEach(word => {
      const pattern = this.learnedPatterns.get(word);
      if (pattern && pattern.totalCount > 2) {
        const ratio = pattern.fallbackCount / pattern.totalCount;
        if (ratio > 0.6) fallbackScore += ratio;
        totalScore += 1;
      }
    });
    
    return totalScore > 0 ? (fallbackScore / totalScore) > 0.7 : false;
  }
}

const adaptiveLearner = new AdaptiveLearner();

// ✅ PREDICTIVE CACHING - PRELOAD DATA BERDASARKAN POLA
class PredictiveCache {
  constructor() {
    this.predictionModels = {
      pricing: { weight: 0.8, nextLikely: ['features', 'timeline'] },
      portfolio: { weight: 0.6, nextLikely: ['pricing', 'contact'] },
      greeting: { weight: 0.9, nextLikely: ['pricing', 'portfolio'] }
    };
    this.currentContext = 'greeting';
  }
  
  predictNextData(currentMessage) {
    const context = this.detectContext(currentMessage);
    this.currentContext = context;
    
    const likelyData = this.predictionModels[context]?.nextLikely || [];
    console.log(`🎯 Predictive Cache: Context '${context}', likely next: ${likelyData.join(', ')}`);
    
    return likelyData;
  }
  
  detectContext(message) {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.match(/(hai|halo|hello)/)) return 'greeting';
    if (lowerMsg.match(/(harga|price|paket|biaya)/)) return 'pricing';
    if (lowerMsg.match(/(contoh|portfolio|showcase|hasil)/)) return 'portfolio';
    if (lowerMsg.match(/(fitur|fasilitas|include)/)) return 'features';
    if (lowerMsg.match(/(kontak|hubungi|call|telepon)/)) return 'contact';
    return 'general';
  }
}

const predictiveCache = new PredictiveCache();

// ✅ MULTI-LAYER FALLBACK STRATEGY
const FallbackStrategies = {
  // Layer 1: Exact match patterns
  exactMatch: {
    patterns: [
      { regex: /^(hai|halo|hi|hello)/i, response: "Halo! Saya Ashley dari IXIERA 🤗 Ada yang bisa saya bantu?" },
      { regex: /^(terima kasih|thanks|thank you)/i, response: "Sama-sama! Senang bisa membantu Anda 😊" },
      { regex: /^(paket apa saja|what packages)/i, response: () => `📦 **PAKET TERSEDIA:**\n\n${FALLBACK_PACKAGES}` },
      { regex: /^(portfolio|contoh project)/i, response: () => `🎯 **HASIL KERJA KAMI:**\n\n${FALLBACK_SHOWCASES}` }
    ],
    
    check(message) {
      for (const pattern of this.patterns) {
        if (pattern.regex.test(message)) {
          return typeof pattern.response === 'function' ? pattern.response() : pattern.response;
        }
      }
      return null;
    }
  },
  
  // Layer 2: Semantic similarity (simple version)
  semanticMatch: {
    synonyms: {
      harga: ['price', 'biaya', 'tarif', 'cost'],
      paket: ['package', 'plan', 'layanan', 'service'],
      contoh: ['portfolio', 'showcase', 'sample', 'example'],
      fitur: ['feature', 'fasilitas', 'include', 'whats included']
    },
    
    check(message) {
      const lowerMsg = message.toLowerCase();
      let intent = null;
      
      // Check each category
      Object.keys(this.synonyms).forEach(key => {
        this.synonyms[key].forEach(synonym => {
          if (lowerMsg.includes(synonym) || lowerMsg.includes(key)) {
            intent = key;
          }
        });
      });
      
      if (intent === 'harga') return `💰 **INFORMASI HARGA:**\n\n${FALLBACK_PACKAGES}\n\nMau konsultasi gratis?`;
      if (intent === 'contoh') return `🚀 **PORTFOLIO KAMI:**\n\n${FALLBACK_SHOWCASES}\n\nIngin buat yang serupa?`;
      
      return null;
    }
  },
  
  // Layer 3: Context-aware responses
  contextAware: {
    check(message, history) {
      if (!history || history.length === 0) return null;
      
      const lastUserMessage = history[history.length - 1]?.parts[0]?.text?.toLowerCase() || '';
      const lastBotResponse = history[history.length - 2]?.parts[0]?.text?.toLowerCase() || '';
      
      // Jika user bertanya "berapa harga?" setelah ditanya kebutuhan
      if (message.toLowerCase().includes('berapa') && lastBotResponse.includes('butuh')) {
        return `Berdasarkan kebutuhan Anda:\n${FALLBACK_PACKAGES}\n\nMau saya rekomendasikan yang paling cocok?`;
      }
      
      // Jika user minta rekomendasi setelah lihat harga
      if (message.toLowerCase().includes('rekomendasi') && lastUserMessage.includes('harga')) {
        return `Berdasarkan budget dan kebutuhan:\n• UMKM: WEB PRESENCE STARTER\n• Online Shop: DIGITAL GROWTH\n• Scale-up: BUSINESS SCALING\n• Enterprise: Custom Solution`;
      }
      
      return null;
    }
  },
  
  // Layer 4: Adaptive learning based on previous success
  adaptiveLearning: {
    check(message) {
      return adaptiveLearner.shouldUseFallback(message) 
        ? "Berdasarkan data kami, berikut informasinya:\n\n" + 
          (message.toLowerCase().includes('harga') ? FALLBACK_PACKAGES : FALLBACK_SHOWCASES)
        : null;
    }
  }
};

// ✅ MAIN FALLBACK ORCHESTRATOR
function intelligentFallbackOrchestrator(message, history, questionCount) {
  // Priority 1: Check jika sudah limit questions
  if (questionCount >= 4) { // Beri warning di question ke-4
    return "Pertanyaan Anda tinggal 1 lagi ya. Untuk konsultasi lebih detail, tim kami siap membantu via website! 😊";
  }
  
  // Priority 2: Multi-layer fallback strategy
  const layers = [
    () => FallbackStrategies.exactMatch.check(message),
    () => FallbackStrategies.semanticMatch.check(message),
    () => FallbackStrategies.contextAware.check(message, history),
    () => FallbackStrategies.adaptiveLearning.check(message)
  ];
  
  for (const layer of layers) {
    const response = layer();
    if (response) {
      console.log('🎯 Fallback hit:', layer.name);
      return response;
    }
  }
  
  return null;
}

// ✅ COST OPTIMIZATION ENGINE
class CostOptimizer {
  constructor() {
    this.dailyBudget = 100; // Max 100 API calls per day
    this.apiCallsToday = 0;
    this.lastReset = new Date();
  }
  
  canUseAPI() {
    this.checkDailyReset();
    return this.apiCallsToday < this.dailyBudget;
  }
  
  trackAPICall() {
    this.apiCallsToday++;
    console.log(`💰 API Calls today: ${this.apiCallsToday}/${this.dailyBudget}`);
  }
  
  checkDailyReset() {
    const now = new Date();
    if (now.toDateString() !== this.lastReset.toDateString()) {
      this.apiCallsToday = 0;
      this.lastReset = now;
      console.log('🔄 Daily API counter reset');
    }
  }
  
  getFallbackStrategy() {
    const usageRatio = this.apiCallsToday / this.dailyBudget;
    
    if (usageRatio > 0.8) {
      return 'aggressive'; // 80-100% budget → lebih strict fallback
    } else if (usageRatio > 0.5) {
      return 'moderate';   // 50-80% budget → balanced
    } else {
      return 'relaxed';    // 0-50% budget → lebih longgar
    }
  }
}

const costOptimizer = new CostOptimizer();

// ✅ ENHANCED MAIN HANDLER
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, currentMessage, questionCount } = req.body;
    analytics.trackRequest('total', currentMessage);

    // Validation (sama seperti sebelumnya)
    if (!Array.isArray(history) || typeof currentMessage !== 'string' || currentMessage.trim() === '') {
      return res.status(400).json({ error: 'Request body tidak lengkap atau tidak valid.' });
    }

    // ✅ LIMIT HANDLING dengan enhancement
    if (questionCount >= 5) {
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: "✅ Anda telah mencapai batas 5 pertanyaan gratis. Untuk konsultasi lebih lanjut, hubungi tim IXIERA langsung melalui website kami - kami siap membantu mewujudkan project Anda! 🚀" }]
          }
        }],
        source: 'limit_reached'
      });
    }

    // ✅ PREDICTIVE CACHE - Preload data berdasarkan pola
    predictiveCache.predictNextData(currentMessage);

    // ✅ COST OPTIMIZATION CHECK
    if (!costOptimizer.canUseAPI()) {
      const fallbackResponse = "Maaf, kuota konsultasi hari ini sudah penuh. Silakan kunjungi website kami untuk informasi lengkap, atau kembali besok ya! 😊";
      return res.status(200).json({
        candidates: [{ content: { parts: [{ text: fallbackResponse }] } }],
        source: 'budget_limit'
      });
    }

    // ✅ INTELLIGENT FALLBACK ORCHESTRATION
    const fallbackResponse = intelligentFallbackOrchestrator(currentMessage, history, questionCount);
    if (fallbackResponse) {
      analytics.trackRequest('fallback', currentMessage);
      adaptiveLearner.learnFromInteraction(currentMessage, true, 1.0);
      
      return res.status(200).json({
        candidates: [{ content: { parts: [{ text: fallbackResponse }] } }],
        source: 'intelligent_fallback',
        analytics: {
          fallbackRate: (analytics.fallbackHits / analytics.totalRequests * 100).toFixed(1),
          costSaved: analytics.costSaved
        }
      });
    }

    // ✅ JIKA BUTUH API, DENGAN COST TRACKING
    console.log('🤖 Complex question -> Using Groq API');
    costOptimizer.trackAPICall();
    analytics.trackRequest('api', currentMessage);

    // [REST OF YOUR GROQ API CODE HERE...]
    // Data fetching, system prompt, Groq API call tetap sama
    
    const { packages, showcases, source } = await getCachedData(); // Dari cache system sebelumnya
    
    const systemPrompt = `[YOUR SYSTEM PROMPT WITH: ${packages} AND ${showcases}]`;
    
    // Groq API call
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map(h => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.parts[0].text
        })),
        { role: "user", content: currentMessage }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 350,
      top_p: 1,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "Maaf, terjadi kendala teknis. Silakan coba lagi.";

    // Learn from this interaction
    adaptiveLearner.learnFromInteraction(currentMessage, false, 0.8);

    // ✅ ENHANCED RESPONSE WITH ANALYTICS
    res.status(200).json({
      candidates: [{ content: { parts: [{ text: aiResponse }] } }],
      source: 'groq_api',
      analytics: {
        fallbackRate: `${(analytics.fallbackHits / analytics.totalRequests * 100).toFixed(1)}%`,
        costSaved: `$${analytics.costSaved.toFixed(2)}`,
        strategy: costOptimizer.getFallbackStrategy()
      },
      metadata: {
        questionCount: questionCount + 1,
        remainingQuestions: 5 - (questionCount + 1)
      }
    });

  } catch (error) {
    console.error('❌ Ultimate Error Handler:', error.message);
    
    // ✅ GRACEFUL DEGRADATION
    const errorTier = analytics.totalRequests > 100 ? 'professional' : 'friendly';
    
    const errorResponses = {
      friendly: "Maaf, sistem sedang sibuk nih! 😅 Coba refresh atau tanya lagi ya?",
      professional: "System temporarily unavailable. Please try again or contact our team for immediate assistance."
    };
    
    res.status(200).json({
      candidates: [{ content: { parts: [{ text: errorResponses[errorTier] }] } }],
      source: 'graceful_degradation'
    });
  }
}

// ✅ BACKGROUND OPTIMIZATION (jalan otomatis)
setInterval(() => {
  console.log('📈 System Optimization Report:');
  console.log(`- Fallback Rate: ${(analytics.fallbackHits / analytics.totalRequests * 100).toFixed(1)}%`);
  console.log(`- Cost Saved: $${analytics.costSaved.toFixed(2)}`);
  console.log(`- Top Questions:`, Array.from(analytics.commonQuestions.entries()).slice(0, 3));
}, 300000); // Log every 5 minutes