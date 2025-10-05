// Ashley AI Assistant - Agency Version (FIXED & SIMPLE)
import { getSupabase } from './supabase-client.js';

class AshleyAIAssistant {
    constructor() {
        this.CACHE_KEYS = {
            SESSIONS: 'ashley_sessions',
            USER: 'ashley_user',
            THEME: 'ashley_theme'
        };
        
        this.isLoading = false;
        this.isSending = false;
        this.currentSessionId = null;
        this.chatSessions = [];
        this.userId = null;
        this.supabase = null;
        
        this.init();
    }

    async init() {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initialize());
            } else {
                await this.initialize();
            }
        } catch (error) {
            console.error('Failed to initialize Ashley AI:', error);
        }
    }

    async initialize() {
        this.initializeElements();
        await this.initializeSupabase();
        await this.initializeUser();
        this.initializeEventListeners();
        this.initializePromptSystem();
        await this.loadChatSessions();
        console.log('🎯 Ashley AI Assistant initialized');
    }

    initializeElements() {
        this.sidebar = document.getElementById('sidebar');
        this.chatHistory = document.getElementById('chat-history');
        this.userInput = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        this.newChatBtn = document.getElementById('new-chat-btn');
        this.chatHistoryList = document.getElementById('chat-history-list');
        this.sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
        this.themeToggleBtn = document.getElementById('theme-toggle-btn');
    }

    async initializeSupabase() {
        try {
            this.supabase = getSupabase();
            console.log('✅ Supabase client initialized');
        } catch (error) {
            console.error('Supabase initialization failed:', error);
        }
    }

    async initializeUser() {
        const cachedUser = this.getCache(this.CACHE_KEYS.USER);
        
        if (cachedUser?.id) {
            this.userId = cachedUser.id;
        } else {
            this.userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.setCache(this.CACHE_KEYS.USER, {
                id: this.userId,
                created_at: new Date().toISOString()
            });
        }
    }

    initializeEventListeners() {
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.handleSendMessage());
        }
        
        if (this.userInput) {
            this.userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });
            this.userInput.addEventListener('input', () => this.autoResizeTextarea());
        }

        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => this.handleNewChat());
        }
        
        if (this.sidebarToggleBtn) {
            this.sidebarToggleBtn.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (this.themeToggleBtn) {
            this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        }

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && this.sidebar && 
                !this.sidebar.contains(e.target) && 
                this.sidebarToggleBtn && 
                !this.sidebarToggleBtn.contains(e.target) &&
                this.sidebar.classList.contains('mobile-visible')) {
                this.toggleSidebar(false);
            }
        });
    }

    initializePromptSystem() {
        const prompts = {
            'package-recommendation': "Saya butuh bantuan memilih package yang tepat. Bisnis saya [jenis bisnis], kebutuhan utama [sebutkan 2-3 kebutuhan digital]. Package mana yang Anda rekomendasikan?",
            'showcase-details': "Bisa jelaskan lebih detail tentang showcase e-commerce sneakers? Fitur payment dan dashboard trackingnya bagaimana implementasinya?",
            'process-timeline': "Bagaimana proses pengerjaan project dari awal sampai launch? Berapa timeline untuk package Business?",
            'technical-capabilities': "Teknologi dan tools apa yang digunakan di IXIERA? Apa keunggulan technical approach Anda?",
            'ecommerce-solutions': "Solusi e-commerce seperti apa yang bisa dibuat? Apakah support payment gateway Indonesia?",
            'automation-features': "Fitur automation apa saja yang termasuk di package? Bisa beri contoh workflow yang bisa diotomasi?"
        };

        document.querySelectorAll('.prompt-sidebar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const promptType = btn.dataset.prompt;
                const question = prompts[promptType];
                if (question) {
                    this.handleSidebarPrompt(question, btn);
                }
            });
        });

        setTimeout(() => {
            document.querySelectorAll('.quick-action-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    let question = '';
                    
                    if (card.classList.contains('package')) {
                        question = "Saya butuh bantuan memilih package yang tepat untuk bisnis saya. Bisa beri rekomendasi?";
                    } else if (card.classList.contains('showcase')) {
                        question = "Bisa jelaskan showcase e-commerce sneakers dan fitur-fiturnya?";
                    } else if (card.classList.contains('process')) {
                        question = "Bagaimana proses pengerjaan project dari awal sampai launch?";
                    }
                    
                    if (question) {
                        this.autoSendPrompt(question);
                    }
                });
            });
        }, 100);
    }

    async handleSendMessage() {
        if (this.isSending || this.isLoading) {
            console.log('⚠️ Message already in progress, please wait...');
            return;
        }
        
        await this.sendMessage();
    }

    handleSidebarPrompt(question, buttonElement) {
        if (buttonElement) {
            buttonElement.style.transform = 'scale(0.95)';
            setTimeout(() => buttonElement.style.transform = '', 150);
        }
        this.autoSendPrompt(question);
    }

    autoSendPrompt(question) {
        const welcomeContainer = this.chatHistory?.querySelector('.welcome-container');
        if (welcomeContainer) {
            welcomeContainer.style.opacity = '0';
            welcomeContainer.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                welcomeContainer.style.display = 'none';
                if (this.userInput) {
                    this.userInput.value = question;
                    this.autoResizeTextarea();
                    setTimeout(() => this.handleSendMessage(), 200);
                }
            }, 200);
        } else {
            if (this.userInput) {
                this.userInput.value = question;
                this.autoResizeTextarea();
                this.handleSendMessage();
            }
        }
    }

    async sendMessage() {
        if (!this.userInput) return;
        
        const message = this.userInput.value.trim();
        if (message === '') return;

        this.isSending = true;
        this.isLoading = true;

        let sessionToUse = this.currentSessionId;

        try {
            if (!sessionToUse) {
                const newSession = await this.createNewSession(message);
                if (!newSession) {
                    this.addMessageToUI('ai', 'Maaf, gagal memulai percakapan baru.');
                    return;
                }
                this.currentSessionId = newSession.id;
                sessionToUse = newSession.id;
                this.chatSessions.unshift(newSession);
                this.renderChatSessions();
                this.clearWelcomeScreen();
            }

            this.addMessageToUI('user', message);
            
            // SIMPLE: Hanya update title jika perlu (pakai kolom existing)
            await this.updateSessionTitle(sessionToUse, message);
            
            this.userInput.value = '';
            this.autoResizeTextarea();
            this.toggleLoadingIndicator(true);

            console.log('🔄 Sending to API...');
            const response = await fetch('/api/ask-ashley', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: [],
                    currentMessage: message,
                    questionCount: 0,
                    userId: this.userId,
                    sessionId: sessionToUse
                })
            });

            console.log('📨 API Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }

            const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || 
                             "Maaf, saya sedang mengalami kendala. Silakan coba lagi nanti.";
            
            this.addMessageToUI('ai', aiResponse);

        } catch (error) {
            console.error("❌ Error sending message:", error);
            this.addMessageToUI('ai', "Maaf, terjadi kendala teknis. Silakan coba lagi.");
        } finally {
            this.isSending = false;
            this.isLoading = false;
            this.toggleLoadingIndicator(false);
        }
    }

    // SIMPLE: Update session title saja (pakai kolom existing)
    async updateSessionTitle(sessionId, message) {
        if (!this.supabase) return;
        
        const title = message.substring(0, 40) + (message.length > 40 ? '...' : '');
        const { error } = await this.supabase
            .from('chat_sessions')
            .update({ 
                title: title
            })
            .eq('id', sessionId);
        
        if (error) {
            console.error('Error updating session:', error);
        }
    }

    addMessageToUI(sender, text) {
        if (!this.chatHistory) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? 'U' : 'A';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const textElement = document.createElement('div');
        textElement.className = 'message-text';
        textElement.innerHTML = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        content.appendChild(textElement);

        if (sender === 'ai') {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
            copyBtn.onclick = () => this.copyToClipboard(text, copyBtn);
            content.appendChild(copyBtn);
        }

        messageElement.appendChild(avatar);
        messageElement.appendChild(content);
        this.chatHistory.appendChild(messageElement);
        this.scrollToBottom();
    }

    toggleLoadingIndicator(show) {
        if (!this.chatHistory) return;
        
        if (show) {
            const indicator = document.createElement('div');
            indicator.className = 'loading-indicator';
            indicator.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
            this.chatHistory.appendChild(indicator);
            this.isLoading = true;
            if (this.sendBtn) this.sendBtn.disabled = true;
            if (this.userInput) this.userInput.disabled = true;
        } else {
            const indicator = this.chatHistory.querySelector('.loading-indicator');
            if (indicator) indicator.remove();
            this.isLoading = false;
            if (this.sendBtn) this.sendBtn.disabled = false;
            if (this.userInput) {
                this.userInput.disabled = false;
                this.userInput.focus();
            }
        }
        this.scrollToBottom();
    }

    autoResizeTextarea() {
        if (!this.userInput) return;
        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(this.userInput.scrollHeight, 100) + 'px';
    }

    scrollToBottom() {
        if (this.chatHistory) {
            this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        }
    }

    toggleSidebar(forceClose = false) {
        if (!this.sidebar) return;
        
        if (window.innerWidth <= 768) {
            if (forceClose) {
                this.sidebar.classList.remove('mobile-visible');
            } else {
                this.sidebar.classList.toggle('mobile-visible');
            }
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-bs-theme', newTheme);
        if (this.themeToggleBtn) {
            this.themeToggleBtn.innerHTML = newTheme === 'dark' ? '<i class="bi bi-moon-fill"></i>' : '<i class="bi bi-sun-fill"></i>';
        }
        this.setCache(this.CACHE_KEYS.THEME, newTheme);
    }

    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            button.innerHTML = '<i class="bi bi-check-lg"></i>';
            setTimeout(() => button.innerHTML = '<i class="bi bi-clipboard"></i>', 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    showWelcomeScreen() {
        if (!this.chatHistory) return;
        
        this.chatHistory.innerHTML = `
            <div class="welcome-container">
                <div class="welcome-header">
                    <div class="welcome-avatar">A</div>
                    <h1 class="welcome-title">Halo! Saya Ashley AI</h1>
                    <p class="welcome-subtitle">
                        Asisten Digital Ixiera siap membantu Anda memilih solusi digital yang tepat. 
                        Tanya tentang packages, showcase projects, atau proses kerja kami.
                    </p>
                </div>
                
                <div class="quick-actions-grid">
                    <div class="quick-action-card package">
                        <div class="quick-action-icon"><i class="bi bi-box-seam"></i></div>
                        <div class="quick-action-title">Rekomendasi Package</div>
                        <div class="quick-action-desc">Temukan solusi yang tepat untuk bisnis Anda</div>
                    </div>
                    <div class="quick-action-card showcase">
                        <div class="quick-action-icon"><i class="bi bi-laptop"></i></div>
                        <div class="quick-action-title">Lihat Showcase</div>
                        <div class="quick-action-desc">Pelajari dari project yang sudah kami buat</div>
                    </div>
                    <div class="quick-action-card process">
                        <div class="quick-action-icon"><i class="bi bi-calendar-check"></i></div>
                        <div class="quick-action-title">Proses Kerja</div>
                        <div class="quick-action-desc">Pahami timeline dan tahapan pengerjaan</div>
                    </div>
                </div>

                <div class="welcome-note">
                    <p><strong>Tips:</strong> Jelaskan kebutuhan bisnis Anda secara spesifik untuk mendapatkan rekomendasi yang tepat.</p>
                </div>
            </div>
        `;

        setTimeout(() => {
            this.initializePromptSystem();
        }, 50);
    }

    clearWelcomeScreen() {
        if (!this.chatHistory) return;
        const welcomeContainer = this.chatHistory.querySelector('.welcome-container');
        if (welcomeContainer) welcomeContainer.style.display = 'none';
    }

    handleNewChat() {
        this.currentSessionId = null;
        this.showWelcomeScreen();
        this.renderChatSessions();
        this.toggleSidebar(true);
    }

    async handleSelectChat(sessionId) {
        if (this.isLoading || this.currentSessionId === sessionId) return;
        this.currentSessionId = sessionId;
        this.renderChatSessions();
        this.toggleSidebar(true);
        
        // Simple: Selalu tampilkan welcome screen untuk session yang dipilih
        this.showWelcomeScreen();
        this.addMessageToUI('ai', 'Selamat datang kembali! Ada yang bisa saya bantu?');
    }

    renderChatSessions() {
        if (!this.chatHistoryList) return;
        
        this.chatHistoryList.innerHTML = '';
        this.chatSessions.forEach(session => {
            const li = document.createElement('li');
            li.className = `chat-history-item ${session.id === this.currentSessionId ? 'active' : ''}`;
            li.dataset.sessionId = session.id;
            li.innerHTML = `
                <i class="bi bi-chat-dots chat-icon"></i>
                <span class="chat-title">${session.title || 'Percakapan Baru'}</span>
                <button class="delete-chat-btn" data-session-id="${session.id}">
                    <i class="bi bi-trash3"></i>
                </button>
            `;
            this.chatHistoryList.appendChild(li);
        });

        this.chatHistoryList.querySelectorAll('.delete-chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleDeleteChat(btn.dataset.sessionId);
            });
        });

        this.chatHistoryList.querySelectorAll('.chat-history-item').forEach(item => {
            item.addEventListener('click', () => {
                this.handleSelectChat(item.dataset.sessionId);
            });
        });
    }

    async handleDeleteChat(sessionId) {
        if (this.supabase) {
            const { error } = await this.supabase.from('chat_sessions').delete().eq('id', sessionId);
            if (error) return;
        }
        this.chatSessions = this.chatSessions.filter(s => s.id !== sessionId);
        this.renderChatSessions();
        if (this.currentSessionId === sessionId) this.handleNewChat();
    }

    async createNewSession(firstMessage) {
        if (!this.supabase) {
            return {
                id: `temp_${Date.now()}`,
                title: firstMessage.substring(0, 40) + (firstMessage.length > 40 ? '...' : ''),
                created_at: new Date().toISOString()
            };
        }

        const title = firstMessage.substring(0, 40) + (firstMessage.length > 40 ? '...' : '');
        const { data, error } = await this.supabase
            .from('chat_sessions')
            .insert({ 
                user_id: this.userId, 
                title: title,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        return error ? null : data;
    }

    async loadChatSessions() {
        if (!this.supabase) {
            this.showWelcomeScreen();
            return;
        }

        try {
            const { data, error } = await this.supabase
                .from('chat_sessions')
                .select('*')
                .eq('user_id', this.userId)
                .order('created_at', { ascending: false });

            this.chatSessions = error ? [] : (data || []);
            this.renderChatSessions();
            
            if (this.chatSessions.length > 0) {
                await this.handleSelectChat(this.chatSessions[0].id);
            } else {
                this.showWelcomeScreen();
            }

        } catch (error) {
            console.error('Error loading sessions:', error);
            this.showWelcomeScreen();
        }
    }

    setCache(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn('Cache set failed:', error);
        }
    }

    getCache(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (error) {
            return null;
        }
    }
}

// Initialize
let aiAssistant = null;

document.addEventListener('DOMContentLoaded', function() {
    try {
        aiAssistant = new AshleyAIAssistant();
        window.aiAssistant = aiAssistant;
    } catch (error) {
        console.error('Failed to initialize Ashley AI Assistant:', error);
    }
});

function handleQuickAction(action) {
    if (!aiAssistant) {
        aiAssistant = new AshleyAIAssistant();
    }
    
    const questions = {
        'package': "Saya butuh bantuan memilih package yang tepat untuk bisnis saya. Bisa beri rekomendasi?",
        'showcase': "Bisa jelaskan showcase e-commerce sneakers dan fitur-fiturnya?",
        'process': "Bagaimana proses pengerjaan project dari awal sampai launch?"
    };
    
    if (questions[action]) {
        aiAssistant.autoSendPrompt(questions[action]);
    }
}

export { AshleyAIAssistant };