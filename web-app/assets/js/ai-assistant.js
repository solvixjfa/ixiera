// Ashley AI Assistant - ULTRA FIXED VERSION
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
        this.abortController = null;
        
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
        await this.initializeUser();
        this.initializeEventListeners();
        this.initializePromptSystem();
        this.initializeTheme();
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

    initializeTheme() {
        const savedTheme = this.getCache(this.CACHE_KEYS.THEME) || 'light';
        document.documentElement.setAttribute('data-bs-theme', savedTheme);
        
        if (this.themeToggleBtn) {
            this.updateThemeIcon(savedTheme);
        }
    }

    updateThemeIcon(theme) {
        if (this.themeToggleBtn) {
            this.themeToggleBtn.innerHTML = theme === 'dark' 
                ? '<i class="bi bi-sun"></i>' 
                : '<i class="bi bi-moon"></i>';
        }
    }

    initializeEventListeners() {
        // Send message
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
            
            this.userInput.addEventListener('input', () => {
                this.autoResizeTextarea();
            });
        }

        // Navigation
        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => this.handleNewChat());
        }
        
        if (this.sidebarToggleBtn) {
            this.sidebarToggleBtn.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (this.themeToggleBtn) {
            this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        }

        // Mobile sidebar close
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

    autoResizeTextarea() {
        if (!this.userInput) return;
        
        this.userInput.style.height = 'auto';
        const newHeight = Math.min(this.userInput.scrollHeight, 120);
        this.userInput.style.height = newHeight + 'px';
    }

    initializePromptSystem() {
        const prompts = {
            'package-recommendation': "Saya butuh bantuan memilih package yang tepat. Bisnis saya [jenis bisnis], kebutuhan utama [sebutkan 2-3 kebutuhan digital]. Package mana yang Anda rekomendasikan?",
            'showcase-details': "Bisa jelaskan lebih detail tentang showcase e-commerce sneakers? Fitur payment dan dashboard trackingnya bagaimana implementasinya?",
            'process-timeline': "Bagaimana proses pengerjaan project dari awal sampai launch? Berapa timeline untuk package Business?"
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

        // Quick actions
        document.querySelectorAll('.quick-action-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                let question = '';
                
                if (card.classList.contains('package')) {
                    question = "Saya butuh bantuan memilih package yang tepat untuk bisnis saya. Bisa beri rekomendasi?";
                } else if (card.classList.contains('showcase')) {
                    question = "Bisa jelaskan showcase e-commerce sneakers dan fitur-fiturnya?";
                }
                
                if (question) {
                    this.autoSendPrompt(question);
                }
            });
        });
    }

    async handleSendMessage() {
        if (this.isSending || this.isLoading) return;
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

        // Cancel previous request
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        let sessionToUse = this.currentSessionId;

        try {
            if (!sessionToUse) {
                const newSession = this.createNewSession(message);
                this.currentSessionId = newSession.id;
                sessionToUse = newSession.id;
                this.chatSessions.unshift(newSession);
                this.renderChatSessions();
                this.clearWelcomeScreen();
            }

            this.addMessageToUI('user', message);
            this.userInput.value = '';
            this.autoResizeTextarea();
            
            this.toggleLoadingIndicator(true);

            const response = await fetch('/api/ask-ashley', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: [],
                    currentMessage: message,
                    questionCount: 0,
                    userId: this.userId,
                    sessionId: sessionToUse
                }),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            const result = await response.json();
            const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || 
                             "Maaf, saya sedang mengalami kendala. Silakan coba lagi nanti.";
            
            this.addMessageToUI('ai', aiResponse);

        } catch (error) {
            console.error("Error sending message:", error);
            this.addMessageToUI('ai', "Maaf, terjadi kendala teknis. Silakan coba lagi.");
        } finally {
            this.isSending = false;
            this.isLoading = false;
            this.toggleLoadingIndicator(false);
            this.abortController = null;
            
            if (this.userInput) {
                this.userInput.disabled = false;
                setTimeout(() => this.userInput.focus(), 100);
            }
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
            .replace(/\n/g, '<br>');
        
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
                setTimeout(() => this.userInput.focus(), 100);
            }
        }
        this.scrollToBottom();
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
        this.updateThemeIcon(newTheme);
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
                    </p>
                </div>
                
                <div class="quick-actions-grid">
                    <div class="quick-action-card package">
                        <div class="quick-action-icon"><i class="bi bi-box-seam"></i></div>
                        <div class="quick-action-title">Rekomendasi Package</div>
                        <div class="quick-action-desc">Temukan solusi tepat untuk bisnis Anda</div>
                    </div>
                    <div class="quick-action-card showcase">
                        <div class="quick-action-icon"><i class="bi bi-laptop"></i></div>
                        <div class="quick-action-title">Lihat Showcase</div>
                        <div class="quick-action-desc">Pelajari dari project kami</div>
                    </div>
                </div>

                <div class="welcome-note">
                    <p><strong>Panduan:</strong> Jelaskan kebutuhan bisnis Anda secara detail.</p>
                </div>
            </div>
        `;

        // Re-initialize quick actions
        document.querySelectorAll('.quick-action-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                let question = '';
                
                if (card.classList.contains('package')) {
                    question = "Saya butuh bantuan memilih package yang tepat untuk bisnis saya. Bisa beri rekomendasi?";
                } else if (card.classList.contains('showcase')) {
                    question = "Bisa jelaskan showcase e-commerce sneakers dan fitur-fiturnya?";
                }
                
                if (question) {
                    this.autoSendPrompt(question);
                }
            });
        });
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
        
        this.showWelcomeScreen();
        this.addMessageToUI('ai', 'Selamat datang kembali! Ada yang bisa saya bantu?');
    }

    renderChatSessions() {
        if (!this.chatHistoryList) return;
        
        this.chatHistoryList.innerHTML = '';
        
        if (this.chatSessions.length === 0) {
            const emptyState = document.createElement('li');
            emptyState.className = 'chat-history-item empty-state';
            emptyState.innerHTML = `
                <i class="bi bi-chat-left"></i>
                <span class="chat-title">Belum ada percakapan</span>
            `;
            this.chatHistoryList.appendChild(emptyState);
            return;
        }
        
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
        if (!confirm('Hapus percakapan ini?')) return;
        
        this.chatSessions = this.chatSessions.filter(s => s.id !== sessionId);
        this.renderChatSessions();
        if (this.currentSessionId === sessionId) this.handleNewChat();
    }

    createNewSession(firstMessage) {
        return {
            id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: firstMessage.substring(0, 40) + (firstMessage.length > 40 ? '...' : ''),
            created_at: new Date().toISOString()
        };
    }

    async loadChatSessions() {
        this.showWelcomeScreen();
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