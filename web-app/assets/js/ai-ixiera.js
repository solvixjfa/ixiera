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
                answer: "Kami punya 3 paket utama yang flexible:\n\nWEB PRESENCE STARTER: Rp 999rb\nPerfect untuk: UMKM, Freelancer, Startup\nTimeline: 3-5 hari\nInclude: Landing page premium, Domain .my.id GRATIS 1 tahun, Hosting GRATIS 1 tahun, WhatsApp integration\n\nDIGITAL GROWTH PACKAGE: Mulai Rp 4,5 juta\nPerfect untuk: Online shop 50+ produk, Agency, Consultant\nTimeline: 10-14 hari\nInclude: Website multi-halaman, Blog CMS, Sistem otomasi formulir, Payment gateway, SEO optimization\n\nBUSINESS SCALING SUITE: Mulai Rp 8,9 juta\nPerfect untuk: Toko online 100+ produk, Startup growth\nTimeline: 3-6 minggu\nInclude: Custom e-commerce, Client portal, Workflow automation, Advanced dashboard, API development",
                keywords: ['harga', 'price', 'biaya', 'paket', 'package', 'berapa', 'mahal', 'murah', 'tarif', 'rp', 'jutaan', '999', '4.5', '8.9'],
                followUp: 'pricing'
            },
            
            'starter': {
                answer: "WEB PRESENCE STARTER - Rp 999rb\n\nIdeal untuk:\n- UMKM yang baru mulai online\n- Freelancer butuh portfolio\n- Startup MVP development\n- Personal brand website\n\nYang Anda dapatkan:\n- Landing page design premium\n- Domain .my.id GRATIS 1 tahun\n- Hosting GRATIS 1 tahun\n- WhatsApp business integration\n- Mobile responsive design\n- Basic SEO setup\n- 3x revisi design\n- Support 1 bulan\n\nTimeline: 3-5 hari",
                keywords: ['starter', '999', 'umkm', 'freelancer', 'landing page', 'basic', 'murah'],
                followUp: 'starter'
            },

            'growth': {
                answer: "DIGITAL GROWTH PACKAGE - Mulai Rp 4,5 juta\n\nIdeal untuk:\n- Online shop dengan 50+ produk\n- Digital agency website\n- Business consultant\n- Growing business\n\nYang Anda dapatkan:\n- Website multi-halaman profesional\n- Blog content management system\n- Sistem otomasi formulir\n- Payment gateway integration\n- Advanced SEO optimization\n- Social media integration\n- Email marketing setup\n- Analytics dashboard\n- 5x revisi design\n- Support 3 bulan\n\nTimeline: 10-14 hari",
                keywords: ['growth', '4.5', '4,5', 'digital growth', 'agency', 'consultant'],
                followUp: 'growth'
            },

            'scaling': {
                answer: "BUSINESS SCALING SUITE - Mulai Rp 8,9 juta\n\nIdeal untuk:\n- Toko online dengan 100+ produk\n- Startup yang scaling\n- Business dengan workflow kompleks\n- Butuh custom automation\n\nYang Anda dapatkan:\n- Custom e-commerce platform\n- Client portal & user management\n- Workflow automation system\n- Advanced business dashboard\n- API development & integration\n- Inventory management system\n- Multi-payment gateway\n- Advanced analytics & reporting\n- Custom feature development\n- Unlimited revisi\n- Support 6 bulan\n\nTimeline: 3-6 minggu",
                keywords: ['scaling', '8.9', '8,9', 'business suite', 'enterprise', 'custom'],
                followUp: 'scaling'
            },

            'proses': {
                answer: "Proses kerja kami:\n\n1. Discovery Session (1-2 hari)\n- Deep dive kebutuhan business\n- Competitor analysis\n- Project planning\n\n2. Design Phase (3-7 hari)\n- UI/UX design modern\n- Brand alignment\n- Client review\n\n3. Development (7-21 hari)\n- Clean code development\n- Quality assurance\n- Performance optimization\n\n4. Launch & Training (1-2 hari)\n- Smooth deployment\n- Client training\n- Handover documentation\n\nTimeline: 2-4 minggu",
                keywords: ['proses', 'timeline', 'lama', 'pengerjaan', 'tahap', 'alur'],
                followUp: 'process'
            },

            'ecommerce': {
                answer: "Solusi e-commerce lengkap:\n\nShopping Experience\n- Product catalog\n- Advanced search\n- Shopping cart\n- Checkout process\n\nPayment & Security\n- Multiple payment methods\n- Bank transfer, credit card\n- SSL security\n- PCI compliance\n\nBusiness Intelligence\n- Sales analytics\n- Inventory management\n- Customer insights\n- Automated reporting\n\nGrowth Features\n- SEO optimized\n- Mobile-first design\n- Social media integration",
                keywords: ['ecommerce', 'toko online', 'payment', 'jual', 'online', 'produk'],
                followUp: 'ecommerce'
            },

            'showcase': {
                answer: "Contoh project e-commerce sneakers:\n\nFitur Utama:\n- Product catalog dengan filter\n- Shopping cart system\n- Payment integration\n- User dashboard\n- Order tracking\n- Admin panel lengkap\n\nHasil: Modern, fast, mobile-friendly",
                keywords: ['showcase', 'portfolio', 'contoh', 'sneakers', 'project'],
                followUp: 'showcase'
            }
        };
    }

    createFollowUpQuestions() {
        return {
            'pricing': [
                "Detail fitur Business Scaling Suite?",
                "Apa perbedaan Growth vs Scaling?",
                "Apakah ada cicilan atau DP?",
                "Konsultasi gratis dengan AI Assistant"
            ],
            'starter': [
                "Bisa upgrade dari Starter ke Growth?",
                "Domain .my.id bisa diganti .com?",
                "Include maintenance berapa lama?",
                "Lihat contoh project Starter"
            ],
            'growth': [
                "Payment gateway apa yang support?",
                "Bisa integrasi dengan tools lain?",
                "Include training untuk manage?",
                "Diskusi custom needs"
            ],
            'scaling': [
                "Bisa develop fitur custom spesifik?",
                "API integration dengan sistem existing?",
                "Workflow automation contohnya?",
                "Konsultasi enterprise solution"
            ],
            'process': [
                "Bagaimana tahap konsultasi awal?",
                "Bisa request design reference?",
                "Berapa lama untuk package Starter?",
                "Diskusi timeline detail"
            ],
            'ecommerce': [
                "Bisa import produk dari Excel?",
                "Fitur inventory management?",
                "Analytics & reporting detail?",
                "Konsultasi e-commerce strategy"
            ],
            'showcase': [
                "Bisa lihat demo website?",
                "Case study project serupa?",
                "Bisa custom design berbeda?",
                "Lihat portfolio lengkap"
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
        
        console.log('🎯 Ashley AI Widget Ready');
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
                    <i class="bi bi-robot"></i>
                    <span class="ai-pulse"></span>
                </button>
                
                <div class="ai-chat-mini" id="aiChatMini">
                    <div class="ai-chat-header">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-robot me-2"></i>
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
                                <i class="bi bi-chat-dots"></i>
                            </div>
                            <div class="welcome-text">
                                <strong>Halo! Saya Ashley AI</strong>
                                <p>Tanya apapun tentang layanan Ixiera</p>
                            </div>
                        </div>
                        
                        <div class="ai-quick-questions">
                            <button class="ai-quick-btn" data-question="Berapa harga package Starter?">
                                <i class="bi bi-cash-coin me-1"></i>Starter Package
                            </button>
                            <button class="ai-quick-btn" data-question="Detail Digital Growth Package?">
                                <i class="bi bi-graph-up me-1"></i>Growth Package  
                            </button>
                            <button class="ai-quick-btn" data-question="Apa saja fitur Business Scaling Suite?">
                                <i class="bi bi-building me-1"></i>Scaling Suite
                            </button>
                            <button class="ai-quick-btn" data-question="Proses pengerjaan berapa lama?">
                                <i class="bi bi-clock me-1"></i>Process & Timeline
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
                        <i class="bi bi-robot"></i>
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
                    <i class="bi bi-robot"></i>
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
                            <i class="bi bi-robot me-1"></i>
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
                    <i class="bi bi-robot"></i>
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
                        <i class="bi bi-robot me-1"></i>
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
                    <i class="bi bi-robot"></i>
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
                    <i class="bi bi-robot"></i>
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