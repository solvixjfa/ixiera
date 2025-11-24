// Ashley AI Integration - WITH SMART WELCOME BUBBLE
class AshleyAIIntegration {
    constructor() {
        this.isOpen = false;
        this.isLoading = false;
        this.isFullscreen = false;
        this.bubbleShown = false;
        this.sessionKey = 'ashley_bubble_shown';
        this.faqDatabase = this.createFAQDatabase();
        this.followUpQuestions = this.createFollowUpQuestions();
        this.init();
    }

   createFAQDatabase() {
    return {
        'harga': {
            answer: "Kami punya 3 paket utama yang flexible:\n\n🏠 WEB PROFESSIONAL: Rp 1.799rb\nPerfect untuk: UMKM, Freelancer, Bisnis lokal\nTimeline: 7-10 hari\nInclude: Website profesional, Domain .my.id GRATIS 1 tahun, Form WhatsApp, Progress tracking 24/7\n\n🚀 DIGITAL OPERATION SYSTEM: Rp 4.999rb\nPerfect untuk: Online shop 20+ produk, Bisnis jasa, Restoran/Kafe\nTimeline: 14-21 hari\nInclude: Website + Dashboard management, CRM basic, Automasi notifikasi, Analytics real-time\n\n🎯 CUSTOM BUSINESS SUITE: Harga Custom\nPerfect untuk: Bisnis dengan workflow unique, Sistem terintegrasi, Full automation\nTimeline: 2-8 minggu\nInclude: Custom development, AI integration, Workflow automation, Dedicated PM",
            keywords: ['harga', 'price', 'biaya', 'paket', 'package', 'berapa', 'mahal', 'murah', 'tarif', 'rp', 'jutaan', '1.799', '4.999', 'custom'],
            followUp: 'pricing'
        },
        
        'starter': {
            answer: "🏠 WEB PROFESSIONAL - Rp 1.799rb\n\nIdeal untuk:\n- UMKM butuh website pertama\n- Freelancer butuh portfolio\n- Bisnis lokal butuh online presence\n\nYang Anda dapatkan:\n- Website profesional (5-6 section)\n- Progress tracking system 24/7\n- Form kontak langsung ke WhatsApp\n- Domain .my.id GRATIS 1 tahun\n- Hosting GRATIS 1 tahun\n- Design modern & mobile-friendly\n- 2x revisi design\n- Support 14 hari\n\nTimeline: 7-10 hari\nRenewal tahun ke-2: Rp 500rb/tahun",
            keywords: ['starter', '1.799', 'web professional', 'umkm', 'freelancer', 'basic', 'murah'],
            followUp: 'starter'
        },

        'growth': {
            answer: "🚀 DIGITAL OPERATION SYSTEM - Rp 4.999rb\n\nIdeal untuk:\n- Online shop dengan 20-50 produk\n- Bisnis jasa dengan booking system\n- Restoran/Kafe butuh online menu\n- Consultant professional\n\nYang Anda dapatkan:\n- Website multi-halaman profesional\n- Dashboard admin kelola konten & produk\n- Sistem automasi notifikasi\n- CRM basic kelola customer\n- Analytics real-time\n- Integration WhatsApp & Email\n- Database terpusat\n- 3x revisi premium\n- Training 1 jam\n- Support 30 hari\n\nTimeline: 14-21 hari\nRenewal tahun ke-2: Rp 750rb/tahun",
            keywords: ['growth', '4.999', 'digital operation', 'system', 'dashboard', 'automasi'],
            followUp: 'growth'
        },

        'custom': {
            answer: "🎯 CUSTOM BUSINESS SUITE - Harga Custom\n\nIdeal untuk:\n- Bisnis dengan workflow unique\n- Perusahaan butuh sistem terintegrasi\n- Startup dengan model bisnis innovative\n- Butuh full automation\n\nYang Anda dapatkan:\n- Custom web application development\n- Workflow automation end-to-end\n- AI Assistant / Chatbot integration\n- CRM & sales automation system\n- Multi-user role management\n- Advanced analytics & reporting\n- Payment gateway integration\n- API integration dengan tools existing\n- Dedicated project manager\n- Post-launch maintenance\n\nTimeline: 2-8 minggu (flexible)",
            keywords: ['custom', 'business suite', 'enterprise', 'tailor-made', 'khusus', 'dedicated'],
            followUp: 'custom'
        },

        'ai': {
            answer: "🤖 AI ASSISTANT PROFESSIONAL - Rp 99rb/bulan\n\nAsisten virtual cerdas untuk bisnis Anda:\n- Jawab pertanyaan customer 24/7\n- Cek stok & harga real-time\n- Terima booking & appointment\n- Handle 1000+ pertanyaan/bulan\n- Training dengan data bisnis Anda\n- Integrasi dengan website\n- Support khusus AI\n\nPilihan:\n- Self Hosted: Rp 2.5jt (sekali bayar)\n- Full Service: Rp 99rb/bulan (kami urus semua)",
            keywords: ['ai', 'chatbot', 'assistant', 'bot', 'virtual', 'otomatis'],
            followUp: 'ai'
        },

        'proses': {
            answer: "Proses kerja kami:\n\n1. Konsultasi Awal (1-2 hari)\n- Discovery kebutuhan bisnis\n- Technical assessment\n- Project planning\n\n2. Development Phase (7-21 hari)\n- Design & development\n- Progress tracking via dashboard\n- Client review & revisi\n\n3. Launch & Training (1-3 hari)\n- Deployment & testing\n- Client training\n- Documentation handover\n\n4. Ongoing Support\n- Support sesuai package\n- Maintenance & optimization",
            keywords: ['proses', 'timeline', 'lama', 'pengerjaan', 'tahap', 'alur'],
            followUp: 'process'
        },

        'renewal': {
            answer: "Biaya Renewal (Tahun ke-2):\n\n🏠 WEB PROFESSIONAL: Rp 500rb/tahun\n- Domain .my.id + Hosting\n- Basic maintenance\n- Security update\n\n🚀 DIGITAL OPERATION: Rp 750rb/tahun\n- Domain + Hosting managed\n- Maintenance & monitoring\n- Basic support\n\n🎯 CUSTOM SUITE: Custom\n- Sesuai complexity sistem\n- Managed service agreement\n- Dedicated support\n\nSemua transparan dari awal!",
            keywords: ['renewal', 'perpanjangan', 'tahun', 'maintenance', 'biaya', 'hosting'],
            followUp: 'renewal'
        }
    };
}

createFollowUpQuestions() {
    return {
        'pricing': [
            "Detail fitur Digital Operation System?",
            "Apa bedanya Web Professional vs Custom?",
            "Ada paket AI Assistant?",
            "Biaya renewal berapa?"
        ],
        'starter': [
            "Bisa upgrade ke package higher?",
            "Domain bisa pilih .com/.id?",
            "Include maintenance berapa lama?",
            "Lihat contoh project Web Professional"
        ],
        'growth': [
            "Automasi include apa saja?",
            "CRM bisa handle berapa customer?",
            "Bisa integrasi marketplace?",
            "Diskusi custom needs"
        ],
        'custom': [
            "Bisa develop fitur custom spesifik?",
            "AI integration contohnya?",
            "Dedicated PM tugasnya apa?",
            "Konsultasi custom solution"
        ],
        'ai': [
            "AI Assistant bisa handle apa?",
            "Self hosted vs full service?",
            "Training data bagaimana?",
            "Demo AI Assistant"
        ],
        'process': [
            "Bisa pantau progress development?",
            "Revisi berapa kali?",
            "Support setelah launch?",
            "Timeline package Custom"
        ],
        'renewal': [
            "Apa yang termasuk di renewal?",
            "Bisa cancel kapan saja?",
            "Ada paket maintenance bulanan?",
            "Biaya tambahan lain?"
        ]
    };
}
    init() {
        this.createWidget();
        this.createWelcomeBubble();
        this.bindEvents();
        
        // Cek session storage dulu sebelum show bubble
        if (!this.hasBubbleBeenShown()) {
            this.showWelcomeBubble();
        }
        
        console.log('💬 Ashley AI Widget Ready');
    }

    hasBubbleBeenShown() {
        // Cek session storage, bubble cuma muncul sekali per session
        return sessionStorage.getItem(this.sessionKey) === 'true';
    }

    setBubbleShown() {
        // Set flag di session storage
        sessionStorage.setItem(this.sessionKey, 'true');
        this.bubbleShown = true;
    }

    createWidget() {
        if (document.getElementById('aiWidget')) return;

        const widgetHTML = `
            <div class="ai-widget" id="aiWidget">
                <button class="ai-widget-btn" id="aiWidgetBtn">
                    <i class="bi bi-chat-dots-fill"></i> <!-- UBAH: robot → chat-dots-fill -->
                    <span class="ai-pulse"></span>
                </button>
                
                <div class="ai-chat-mini" id="aiChatMini">
                    <div class="ai-chat-header">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-chat-dots-fill me-2"></i> <!-- UBAH: robot → chat-dots-fill -->
                            <h6 class="mb-0">Ashley AI Assistant</h6>
                        </div>
                        <div class="ai-header-actions">
                            <button class="ai-fullscreen-btn" id="aiFullscreenBtn" title="Fullscreen">
                                <i class="bi bi-arrows-fullscreen"></i>
                            </button>
                            <button class="ai-close-btn" id="aiCloseBtn">
                                <i class="bi bi-x"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="ai-chat-body" id="aiChatBody">
                        <div class="ai-welcome-msg">
                            <div class="welcome-avatar">
                                <i class="bi bi-chat-dots-fill"></i> <!-- UBAH: chat-dots → chat-dots-fill -->
                            </div>
                            <div class="welcome-text">
                                <strong>Halo! Saya Ashley AI</strong>
                                <p>Tanya apapun tentang layanan Ixiera</p>
                            </div>
                        </div>
<div class="ai-quick-questions">
    <button class="ai-quick-btn" data-question="Berapa harga package Web Professional?">
        <i class="bi bi-cash-coin me-1"></i>Web Professional
    </button>
    <button class="ai-quick-btn" data-question="Detail Digital Operation System?">
        <i class="bi bi-graph-up me-1"></i>Digital Operation  
    </button>
    <button class="ai-quick-btn" data-question="Apa saja fitur Custom Business Suite?">
        <i class="bi bi-building me-1"></i>Custom Suite
    </button>
    <button class="ai-quick-btn" data-question="Ada paket AI Assistant?">
        <i class="bi bi-robot me-1"></i>AI Assistant
    </button>
</div>
                    </div>
                    
                    <div class="ai-chat-input">
                        <input type="text" id="aiQuickInput" placeholder="Tanya tentang Ixiera..." maxlength="150">
                        <button id="aiSendBtn">
                            <i class="bi bi-send-fill"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    }

    createWelcomeBubble() {
        if (document.getElementById('aiWelcomeBubble')) return;

        const bubbleHTML = `
            <div class="ai-welcome-bubble" id="aiWelcomeBubble">
                <div class="bubble-content">
                    <div class="bubble-header">
                        <i class="bi bi-chat-dots-fill"></i> <!-- UBAH: robot → chat-dots-fill -->
                        <span>Ashley AI</span>
                        <button class="bubble-close" id="bubbleClose">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    <div class="bubble-message">
                        <p>Halo! Ada yang bisa saya bantu? 🚀</p>
                        <p class="bubble-subtext">Tanya tentang package, harga, atau proses kerja kami!</p>
                    </div>
                    <div class="bubble-actions">
                        <button class="bubble-btn primary" id="bubbleOpenChat">
                            <i class="bi bi-chat-dots me-1"></i>Tanya Sekarang
                        </button>
                        <button class="bubble-btn secondary" id="bubbleClosePermanent">
                            Jangan tampilkan lagi
                        </button>
                    </div>
                </div>
                <div class="bubble-arrow"></div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', bubbleHTML);
    }

    bindEvents() {
        // Widget events
        document.getElementById('aiWidgetBtn')?.addEventListener('click', () => this.toggleChat());
        document.getElementById('aiCloseBtn')?.addEventListener('click', () => this.toggleChat());
        document.getElementById('aiFullscreenBtn')?.addEventListener('click', () => this.toggleFullscreen());

        document.querySelectorAll('.ai-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const question = btn.getAttribute('data-question');
                this.sendToAshleyAI(question);
            });
        });

        document.getElementById('aiSendBtn')?.addEventListener('click', () => this.handleSend());
        document.getElementById('aiQuickInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });

        // Bubble events
        document.getElementById('bubbleOpenChat')?.addEventListener('click', () => {
            this.hideWelcomeBubble();
            this.setBubbleShown(); // Set session flag
            this.toggleChat(true);
        });

        document.getElementById('bubbleClose')?.addEventListener('click', () => {
            this.hideWelcomeBubble();
        });

        document.getElementById('bubbleClosePermanent')?.addEventListener('click', () => {
            this.hideWelcomeBubblePermanent();
        });

        // Close ketika klik di luar
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.isFullscreen && !e.target.closest('#aiWidget')) {
                this.toggleChat(false);
            }
            
            // Close bubble ketika klik di luar
            if (!e.target.closest('#aiWelcomeBubble') && !e.target.closest('#aiWidgetBtn')) {
                this.hideWelcomeBubble();
            }
        });
    }

    showWelcomeBubble() {
        if (this.bubbleShown || this.hasBubbleBeenShown()) return;
        
        const bubble = document.getElementById('aiWelcomeBubble');
        if (!bubble) return;

        // Delay 4 detik biar user baca content dulu
        setTimeout(() => {
            // Double check sebelum show
            if (this.hasBubbleBeenShown()) return;
            
            bubble.classList.add('show');
            this.bubbleShown = true;
            
            console.log('💬 Welcome bubble shown');
            
            // Auto hide setelah 12 detik
            setTimeout(() => {
                this.hideWelcomeBubble();
            }, 12000);
        }, 4000);
    }

    hideWelcomeBubble() {
        const bubble = document.getElementById('aiWelcomeBubble');
        if (bubble) {
            bubble.classList.remove('show');
        }
    }

    hideWelcomeBubblePermanent() {
        this.hideWelcomeBubble();
        this.setBubbleShown(); // Set permanent flag di session
    }

    toggleChat(forceOpen) {
        const chatMini = document.getElementById('aiChatMini');
        if (!chatMini) return;

        this.isOpen = forceOpen !== undefined ? forceOpen : !this.isOpen;
        chatMini.style.display = this.isOpen ? 'block' : 'none';
        
        if (this.isOpen) {
            // Auto hide bubble ketika chat dibuka
            this.hideWelcomeBubble();
            setTimeout(() => {
                document.getElementById('aiQuickInput')?.focus();
            }, 300);
        }
    }

    toggleFullscreen() {
        const chatMini = document.getElementById('aiChatMini');
        if (!chatMini) return;

        this.isFullscreen = !this.isFullscreen;
        
        if (this.isFullscreen) {
            chatMini.classList.add('ai-fullscreen');
            document.getElementById('aiFullscreenBtn').innerHTML = '<i class="bi bi-arrows-angle-contract"></i>';
            document.body.style.overflow = 'hidden';
        } else {
            chatMini.classList.remove('ai-fullscreen');
            document.getElementById('aiFullscreenBtn').innerHTML = '<i class="bi bi-arrows-fullscreen"></i>';
            document.body.style.overflow = '';
        }
    }

    findFAQAnswer(question) {
        const lowerQuestion = question.toLowerCase();
        
        for (const [key, faq] of Object.entries(this.faqDatabase)) {
            for (const keyword of faq.keywords) {
                if (lowerQuestion.includes(keyword)) {
                    return faq;
                }
            }
        }
        
        return null;
    }

    handleSend() {
        const input = document.getElementById('aiQuickInput');
        const question = input?.value.trim();
        
        if (question) {
            this.sendToAshleyAI(question);
            input.value = '';
        }
    }

    async sendToAshleyAI(question) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showUserMessage(question);
        this.showLoading();

        try {
            const faqData = this.findFAQAnswer(question);
            
            if (faqData) {
                setTimeout(() => {
                    this.hideLoading();
                    this.showResponse(faqData.answer);
                    this.showFollowUpQuestions(faqData.followUp);
                }, 1000);
            } else {
                setTimeout(() => {
                    this.hideLoading();
                    this.showAIAssistantRedirect(question);
                }, 800);
            }

        } catch (error) {
            console.error('❌ AI Error:', error);
            this.hideLoading();
            this.showResponse("Maaf, terjadi kendala. Silakan buka AI Assistant untuk konsultasi lebih lanjut.");
        } finally {
            this.isLoading = false;
        }
    }

    showUserMessage(question) {
        const chatBody = document.getElementById('aiChatBody');
        const userHTML = `
            <div class="ai-message user-message">
                <div class="message-avatar user-avatar">
                    <i class="bi bi-person"></i>
                </div>
                <div class="message-content">
                    ${question}
                </div>
            </div>
        `;
        chatBody.insertAdjacentHTML('beforeend', userHTML);
        this.scrollToBottom();
    }

    showResponse(response) {
        const chatBody = document.getElementById('aiChatBody');
        const responseHTML = `
            <div class="ai-message bot-message">
                <div class="message-avatar bot-avatar">
                    <i class="bi bi-chat-dots-fill"></i> <!-- UBAH: robot → chat-dots-fill -->
                </div>
                <div class="message-content">
                    ${response.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
        
        chatBody.insertAdjacentHTML('beforeend', responseHTML);
        this.scrollToBottom();
    }

    showFollowUpQuestions(category) {
        const chatBody = document.getElementById('aiChatBody');
        const questions = this.followUpQuestions[category];
        
        const followUpHTML = `
            <div class="ai-follow-up">
                <div class="follow-up-header">
                    <i class="bi bi-lightbulb me-1"></i>
                    <span>Pertanyaan lanjutan:</span>
                </div>
                <div class="follow-up-questions">
                    ${questions.map((q, index) => `
                        <button class="follow-up-btn" data-question="${q}" data-index="${index}">
                            ${q}
                        </button>
                    `).join('')}
                </div>
                <div class="ai-assistant-cta">
                    <div class="cta-content">
                        <strong>Butuh konsultasi lebih detail?</strong>
                        <p>AI Assistant siap membantu dengan pertanyaan complex dan personalized recommendation</p>
                        <a href="team.html" class="cta-button">
                            <i class="bi bi-chat-dots-fill me-1"></i> <!-- UBAH: robot → chat-dots-fill -->
                            Buka AI Assistant Full
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        chatBody.insertAdjacentHTML('beforeend', followUpHTML);
        this.scrollToBottom();
        
        document.querySelectorAll('.follow-up-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const question = btn.getAttribute('data-question');
                if (question.includes('AI Assistant')) {
                    window.location.href = 'team.html';
                } else {
                    this.sendToAshleyAI(question);
                }
            });
        });
    }

    showAIAssistantRedirect(question) {
        const chatBody = document.getElementById('aiChatBody');
        const redirectHTML = `
            <div class="ai-message bot-message">
                <div class="message-avatar bot-avatar">
                    <i class="bi bi-chat-dots-fill"></i> <!-- UBAH: robot → chat-dots-fill -->
                </div>
                <div class="message-content">
                    <p>Pertanyaan Anda membutuhkan analisis lebih detail. AI Assistant full version dapat memberikan jawaban yang lebih comprehensive.</p>
                </div>
            </div>
            <div class="ai-assistant-cta highlighted">
                <div class="cta-content">
                    <strong>Konsultasi Lebih Detail</strong>
                    <p>AI Assistant siap menganalisis kebutuhan spesifik Anda</p>
                    <a href="team.html" class="cta-button primary">
                        <i class="bi bi-chat-dots-fill me-1"></i> <!-- UBAH: robot → chat-dots-fill -->
                        Buka AI Assistant Full
                    </a>
                    <small>Atau <button class="text-link" onclick="ashleyAI.continueInWidget()">lanjut di widget ini</button> untuk pertanyaan sederhana</small>
                </div>
            </div>
        `;
        
        chatBody.insertAdjacentHTML('beforeend', redirectHTML);
        this.scrollToBottom();
    }

    continueInWidget() {
        const chatBody = document.getElementById('aiChatBody');
        const continueHTML = `
            <div class="ai-message bot-message">
                <div class="message-avatar bot-avatar">
                    <i class="bi bi-chat-dots-fill"></i> <!-- UBAH: robot → chat-dots-fill -->
                </div>
                <div class="message-content">
                    <p>Silakan tanyakan pertanyaan spesifik tentang layanan kami.</p>
                </div>
            </div>
        `;
        
        chatBody.insertAdjacentHTML('beforeend', continueHTML);
        this.scrollToBottom();
        document.getElementById('aiQuickInput')?.focus();
    }

    showLoading() {
        const chatBody = document.getElementById('aiChatBody');
        const loadingHTML = `
            <div class="ai-message bot-message">
                <div class="message-avatar bot-avatar">
                    <i class="bi bi-chat-dots-fill"></i> <!-- UBAH: robot → chat-dots-fill -->
                </div>
                <div class="message-content">
                    <div class="ai-typing">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        chatBody.insertAdjacentHTML('beforeend', loadingHTML);
        this.scrollToBottom();
    }

    hideLoading() {
        const loadingMsg = document.querySelector('.ai-message .ai-typing')?.closest('.ai-message');
        if (loadingMsg) {
            loadingMsg.remove();
        }
    }

    scrollToBottom() {
        const chatBody = document.getElementById('aiChatBody');
        if (chatBody) {
            setTimeout(() => {
                chatBody.scrollTop = chatBody.scrollHeight;
            }, 100);
        }
    }
}

// Auto Initialize
document.addEventListener('DOMContentLoaded', function() {
    window.ashleyAI = new AshleyAIIntegration();
});