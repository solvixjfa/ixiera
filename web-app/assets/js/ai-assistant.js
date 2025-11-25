// Ashley AI Assistant - HYBRID VERSION (Gemini + Groq Fallback)
class AshleyAIAssistant {
    constructor() {
        this.CACHE_KEYS = {
            SESSIONS: 'ashley_sessions',
            USER: 'ashley_user',
            THEME: 'ashley_theme'
        };

        // ✅ API ENDPOINTS HYBRID
        this.API_ENDPOINTS = {
            PRIMARY: 'https://xtarsaurwclktwhhryas.supabase.co/functions/v1/ai-assistant', // Gemini Edge Function
            FALLBACK: '/api/ask-ashley' // Groq Backup
        };

        this.isLoading = false;
        this.isSending = false;
        this.currentSessionId = null;
        this.chatSessions = [];
        this.userId = null;
        this.abortController = null;
        this.usePrimaryAPI = true; // Default pakai Gemini

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
        this.initializeTheme();
        this.initializeQuickActions();
        await this.loadChatSessions();

        console.log('🎯 Ashley AI Assistant Hybrid Initialized');
        console.log('🔧 Primary API:', this.API_ENDPOINTS.PRIMARY);
        console.log('🔄 Fallback API:', this.API_ENDPOINTS.FALLBACK);
    }
// Tambahkan sambutan otomatis di initialize()
async initialize() {
    this.initializeElements();
    await this.initializeUser();
    this.initializeEventListeners();
    this.initializeTheme();
    this.initializeQuickActions();
    await this.loadChatSessions();

    // ✅ TAMBAHKAN SAMBUTAN OTOMATIS
    this.showInitialGreeting();

    console.log('🎯 Ashley AI Assistant Hybrid Initialized');
}

showInitialGreeting() {
    if (!this.currentSessionId && this.messagesContainer) {
        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = 'none';
        }
        
        // Tambahkan sambutan AI
        this.addMessageToUI('ai', 
            "Halo! Saya Ashley AI dari Ixiera. Ada yang bisa saya bantu?"
        );
    }
}
        

    initializeElements() {
        // Core elements
        this.sidebar = document.getElementById('sidebar');
        this.messagesContainer = document.getElementById('messages-container');
        this.userInput = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.overlay = document.getElementById('overlay');
        this.welcomeScreen = document.getElementById('welcome-screen');

        // Button elements
        this.menuToggle = document.getElementById('menu-toggle');
        this.closeSidebar = document.getElementById('close-sidebar');
        this.newChatBtn = document.getElementById('new-chat');
        this.themeToggle = document.getElementById('theme-toggle');
        this.clearHistory = document.getElementById('clear-history');
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
        this.updateThemeIcon(savedTheme);
    }

    updateThemeIcon(theme) {
        if (this.themeToggle) {
            this.themeToggle.innerHTML = theme === 'dark' 
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
                this.toggleSendButton();
            });

            // Focus input on load
            setTimeout(() => {
                if (this.userInput) this.userInput.focus();
            }, 500);
        }

        // Navigation
        if (this.menuToggle) {
            this.menuToggle.addEventListener('click', () => this.toggleSidebar());
        }

        if (this.closeSidebar) {
            this.closeSidebar.addEventListener('click', () => this.toggleSidebar(false));
        }

        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => this.handleNewChat());
        }

        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        if (this.clearHistory) {
            this.clearHistory.addEventListener('click', () => this.handleClearHistory());
        }

        // Mobile overlay close
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.toggleSidebar(false));
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.userInput?.focus();
            }
            if (e.key === 'Escape') {
                this.toggleSidebar(false);
            }
        });
    }

    initializeQuickActions() {
        // Quick buttons di sidebar
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.handleQuickAction(type);
            });
        });

        // Action items di welcome screen
        document.querySelectorAll('.action-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                this.handleQuickAction(type);
            });
        });
    }

    handleQuickAction(type) {
        let question = '';
        
        switch(type) {
            case 'package':
                question = "Saya butuh bantuan memilih package yang tepat untuk bisnis saya. Bisa beri rekomendasi?";
                break;
            case 'showcase':
                question = "Bisa jelaskan showcase e-commerce sneakers dan fitur-fiturnya?";
                break;
            case 'process':
                question = "Bagaimana proses pengerjaan project dari awal sampai launch?";
                break;
            default:
                question = "Halo, bisa bantu saya?";
        }

        this.autoSendPrompt(question);
    }

    autoSendPrompt(question) {
        // Sembunyikan welcome screen
        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = 'none';
        }

        // Set input value dan kirim
        if (this.userInput) {
            this.userInput.value = question;
            this.autoResizeTextarea();
            this.toggleSendButton();
            setTimeout(() => this.handleSendMessage(), 100);
        }
    }

    autoResizeTextarea() {
        if (!this.userInput) return;

        this.userInput.style.height = 'auto';
        const newHeight = Math.min(this.userInput.scrollHeight, 120);
        this.userInput.style.height = newHeight + 'px';
    }

    toggleSendButton() {
        if (!this.sendBtn || !this.userInput) return;

        const hasText = this.userInput.value.trim().length > 0;
        this.sendBtn.disabled = !hasText || this.isSending;
    }

    async handleSendMessage() {
        if (this.isSending || this.isLoading) return;

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

            // Add user message to UI
            this.addMessageToUI('user', message);
            this.userInput.value = '';
            this.autoResizeTextarea();
            this.toggleSendButton();

            // Show loading indicator
            this.showLoadingIndicator();

            // ✅ HYBRID API CALL - Try Primary first, then Fallback
            let aiResponse;
            let apiSource = 'unknown';

            try {
                if (this.usePrimaryAPI) {
                    console.log('🚀 Trying Primary API (Gemini)...');
                    aiResponse = await this.callPrimaryAPI(message, sessionToUse);
                    apiSource = 'gemini';
                } else {
                    console.log('🔄 Using Fallback API (Groq)...');
                    aiResponse = await this.callFallbackAPI(message, sessionToUse);
                    apiSource = 'groq';
                }
            } catch (primaryError) {
                console.warn('❌ Primary API failed, switching to fallback:', primaryError);
                
                // Switch to fallback for this session
                this.usePrimaryAPI = false;
                
                try {
                    aiResponse = await this.callFallbackAPI(message, sessionToUse);
                    apiSource = 'groq_fallback';
                } catch (fallbackError) {
                    console.error('❌ All APIs failed:', fallbackError);
                    throw new Error('All AI services are currently unavailable');
                }
            }

            this.hideLoadingIndicator();

            // Add API source indicator (optional, for debugging)
            const responseWithSource = apiSource === 'gemini' 
                ? aiResponse 
                : `${aiResponse}\n\n<small style="opacity: 0.6;">🔧 Powered by Backup AI</small>`;

            this.addMessageToUI('ai', responseWithSource);

            console.log(`✅ Response from: ${apiSource}`);

        } catch (error) {
            console.error("Error sending message:", error);
            this.hideLoadingIndicator();
            this.addMessageToUI('ai', "Maaf, semua sistem AI sedang mengalami gangguan. Silakan coba lagi dalam beberapa saat.");
        } finally {
            this.isSending = false;
            this.isLoading = false;
            this.abortController = null;

            if (this.userInput) {
                this.userInput.disabled = false;
                setTimeout(() => this.userInput.focus(), 100);
            }
        }
    }

    // ✅ PRIMARY API CALL (Gemini Edge Function)
    async callPrimaryAPI(message, sessionId) {
        const response = await fetch(this.API_ENDPOINTS.PRIMARY, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                currentMessage: message,
                userId: this.userId,
                history: [],
                sessionId: sessionId
            }),
            signal: this.abortController.signal
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Primary API: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        
        // Handle different response formats
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            return result.candidates[0].content.parts[0].text;
        } else if (result.error) {
            throw new Error(`Gemini Error: ${result.error}`);
        } else {
            return "Maaf, tidak ada response dari AI.";
        }
    }

    // ✅ FALLBACK API CALL (Groq Backup)
    async callFallbackAPI(message, sessionId) {
        const response = await fetch(this.API_ENDPOINTS.FALLBACK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                history: [],
                currentMessage: message,
                questionCount: 0,
                userId: this.userId,
                sessionId: sessionId
            }),
            signal: this.abortController.signal
        });

        if (!response.ok) {
            throw new Error(`Fallback API: ${response.status}`);
        }
        
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || 
               "Maaf, sistem backup juga mengalami gangguan.";
    }

    // Simple message display - NO TYPING EFFECT
    addMessageToUI(sender, text) {
        if (!this.messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        if (sender === 'user') {
            avatar.innerHTML = '<i class="bi bi-person-fill"></i>';
        } else {
            avatar.innerHTML = '<i class="bi bi-robot"></i>';
        }

        const content = document.createElement('div');
        content.className = 'message-content';

        const textElement = document.createElement('div');
        textElement.className = 'message-text';
        textElement.innerHTML = this.formatMessage(text);

        content.appendChild(textElement);

        // Add copy button for AI messages
        if (sender === 'ai') {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
            copyBtn.title = 'Salin pesan';
            copyBtn.onclick = () => this.copyToClipboard(text, copyBtn);
            content.appendChild(copyBtn);
        }

        messageElement.appendChild(avatar);
        messageElement.appendChild(content);
        this.messagesContainer.appendChild(messageElement);

        this.scrollToBottom();
        return { messageElement, textElement };
    }

    // Format message dengan markdown sederhana
    formatMessage(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    // Loading indicator - SIMPLE SPINNER (NO TYPING)
    showLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'flex';
            this.loadingIndicator.classList.add('visible');
        }
        this.scrollToBottom();
    }

    hideLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.remove('visible');
            setTimeout(() => {
                if (this.loadingIndicator) {
                    this.loadingIndicator.style.display = 'none';
                }
            }, 300);
        }
    }

    scrollToBottom() {
        if (this.messagesContainer) {
            setTimeout(() => {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }, 100);
        }
    }

    toggleSidebar(forceClose = false) {
        if (!this.sidebar) return;

        if (window.innerWidth <= 768) {
            if (forceClose) {
                this.sidebar.classList.remove('active');
                if (this.overlay) {
                    this.overlay.classList.remove('active');
                }
            } else {
                this.sidebar.classList.toggle('active');
                if (this.overlay) {
                    this.overlay.classList.toggle('active');
                }
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
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="bi bi-check-lg"></i>';
            button.style.background = 'var(--text-primary)';
            button.style.color = 'var(--bg-primary)';
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.style.background = '';
                button.style.color = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    clearWelcomeScreen() {
        if (!this.messagesContainer) return;
        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = 'none';
        }
    }

    showWelcomeScreen() {
        if (!this.messagesContainer) return;

        // Reset ke welcome screen
        this.messagesContainer.innerHTML = '';
        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = 'flex';
            setTimeout(() => {
                this.welcomeScreen.style.opacity = '1';
            }, 10);
        }
    }

    handleNewChat() {
        this.currentSessionId = null;
        this.usePrimaryAPI = true; // Reset ke primary API untuk chat baru
        this.showWelcomeScreen();
        this.renderChatSessions();
        this.toggleSidebar(true);

        // Focus input after new chat
        setTimeout(() => {
            if (this.userInput) this.userInput.focus();
        }, 300);
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
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        historyList.innerHTML = '';

        if (this.chatSessions.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-history';
            emptyState.innerHTML = `
                <i class="bi bi-chat-left"></i>
                <span>Belum ada percakapan</span>
            `;
            historyList.appendChild(emptyState);
            return;
        }

        this.chatSessions.forEach(session => {
            const sessionElement = document.createElement('div');
            sessionElement.className = `history-item ${session.id === this.currentSessionId ? 'active' : ''}`;
            sessionElement.dataset.sessionId = session.id;
            sessionElement.innerHTML = `
                <i class="bi bi-chat-dots"></i>
                <span class="history-title">${session.title || 'Percakapan Baru'}</span>
                <button class="btn-delete" data-session-id="${session.id}">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            historyList.appendChild(sessionElement);
        });

        // Add event listeners for delete buttons
        historyList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleDeleteChat(btn.dataset.sessionId);
            });
        });

        // Add event listeners for session items
        historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                this.handleSelectChat(item.dataset.sessionId);
            });
        });
    }

    async handleDeleteChat(sessionId) {
        if (!confirm('Hapus percakapan ini?')) return;

        this.chatSessions = this.chatSessions.filter(s => s.id !== sessionId);
        this.renderChatSessions();
        if (this.currentSessionId === sessionId) {
            this.handleNewChat();
        }
    }

    handleClearHistory() {
        if (!confirm('Hapus semua riwayat percakapan?')) return;

        this.chatSessions = [];
        this.currentSessionId = null;
        this.usePrimaryAPI = true; // Reset ke primary API
        this.renderChatSessions();
        this.showWelcomeScreen();
    }

    createNewSession(firstMessage) {
        return {
            id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: firstMessage.substring(0, 40) + (firstMessage.length > 40 ? '...' : ''),
            created_at: new Date().toISOString(),
            messages: []
        };
    }

    async loadChatSessions() {
        const cachedSessions = this.getCache(this.CACHE_KEYS.SESSIONS);
        if (cachedSessions) {
            this.chatSessions = cachedSessions;
            this.renderChatSessions();
        }
        
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