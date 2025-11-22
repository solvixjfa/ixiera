// Ashley AI Assistant - ENHANCED VERSION
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
        
        // FIX: Ensure input area is visible
        this.ensureInputVisibility();
        
        console.log('🎯 Ashley AI Assistant Enhanced initialized');
    }

    initializeElements() {
        // Core elements
        this.sidebar = document.getElementById('sidebar');
        this.chatHistory = document.getElementById('chat-history');
        this.userInput = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        
        // New elements for enhanced version
        this.sidebarCloseBtn = document.getElementById('sidebar-close-btn');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.mobileOverlay = document.getElementById('mobile-overlay');
        
        // Existing elements
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
                this.toggleSendButton();
            });

            // Focus input on load
            setTimeout(() => {
                if (this.userInput) this.userInput.focus();
            }, 500);
        }

        // Navigation
        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => this.handleNewChat());
        }
        
        if (this.sidebarToggleBtn) {
            this.sidebarToggleBtn.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (this.sidebarCloseBtn) {
            this.sidebarCloseBtn.addEventListener('click', () => this.toggleSidebar(false));
        }
        
        if (this.themeToggleBtn) {
            this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        }

        // Mobile overlay close
        if (this.mobileOverlay) {
            this.mobileOverlay.addEventListener('click', () => this.toggleSidebar(false));
        }

        // Enhanced mobile sidebar close
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && this.sidebar && 
                !this.sidebar.contains(e.target) && 
                this.sidebarToggleBtn && 
                !this.sidebarToggleBtn.contains(e.target) &&
                this.sidebar.classList.contains('mobile-visible')) {
                this.toggleSidebar(false);
            }
        });

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

    autoResizeTextarea() {
        if (!this.userInput) return;
        
        this.userInput.style.height = 'auto';
        const newHeight = Math.min(this.userInput.scrollHeight, 120);
        this.userInput.style.height = newHeight + 'px';
    }

    toggleSendButton() {
        if (!this.sendBtn || !this.userInput) return;
        
        const hasText = this.userInput.value.trim().length > 0;
        this.sendBtn.disabled = !hasText;
    }

    ensureInputVisibility() {
        // Force input area to be visible
        const inputArea = document.querySelector('.chat-input-area');
        const chatInput = document.getElementById('user-input');
        const sendBtn = document.getElementById('send-btn');
        
        if (inputArea) {
            inputArea.style.display = 'block';
            inputArea.style.visibility = 'visible';
            inputArea.style.opacity = '1';
        }
        
        if (chatInput) {
            chatInput.style.display = 'block';
            chatInput.style.visibility = 'visible';
            chatInput.style.opacity = '1';
        }
        
        if (sendBtn) {
            sendBtn.style.display = 'flex';
            sendBtn.style.visibility = 'visible';
            sendBtn.style.opacity = '1';
        }
        
        console.log('✅ Input area visibility enforced');
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
                } else if (card.classList.contains('process')) {
                    question = "Bagaimana proses pengerjaan project dari awal sampai launch?";
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
                    this.toggleSendButton();
                    setTimeout(() => this.handleSendMessage(), 200);
                }
            }, 200);
        } else {
            if (this.userInput) {
                this.userInput.value = question;
                this.autoResizeTextarea();
                this.toggleSendButton();
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
            this.toggleSendButton();
            
            // Show typing indicator
            this.showTypingIndicator();

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
            
            this.hideTypingIndicator();
            
            // Use typing effect for AI response
            const { textElement } = this.addMessageToUI('ai', '', true);
            await this.typeMessage(textElement, aiResponse);
            
            // Add copy button after typing is complete
            const messageContent = textElement.parentElement;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
            copyBtn.title = 'Salin pesan';
            copyBtn.onclick = () => this.copyToClipboard(aiResponse, copyBtn);
            messageContent.appendChild(copyBtn);

        } catch (error) {
            console.error("Error sending message:", error);
            this.hideTypingIndicator();
            this.addMessageToUI('ai', "Maaf, terjadi kendala teknis. Silakan coba lagi.");
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

    // Enhanced message display with typing effect
    addMessageToUI(sender, text, isStreaming = false) {
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
        
        if (sender === 'user') {
            // User message - show immediately
            textElement.innerHTML = this.formatMessage(text);
            content.appendChild(textElement);
            
            messageElement.appendChild(avatar);
            messageElement.appendChild(content);
            this.chatHistory.appendChild(messageElement);
            
        } else if (isStreaming) {
            // AI message with typing effect
            textElement.classList.add('typing-cursor');
            content.appendChild(textElement);
            
            messageElement.appendChild(avatar);
            messageElement.appendChild(content);
            this.chatHistory.appendChild(messageElement);
            
            return { messageElement, textElement };
            
        } else {
            // Regular AI message
            textElement.innerHTML = this.formatMessage(text);
            content.appendChild(textElement);

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
            this.chatHistory.appendChild(messageElement);
        }
        
        this.scrollToBottom();
        return { messageElement, textElement };
    }

    // Typing effect for character-by-character display
    async typeMessage(textElement, text, speed = 20) {
        return new Promise((resolve) => {
            let i = 0;
            textElement.innerHTML = '';
            
            const typeChar = () => {
                if (i < text.length) {
                    // Add characters one by one
                    const currentText = text.substring(0, i + 1);
                    textElement.innerHTML = this.formatMessage(currentText);
                    i++;
                    
                    // Scroll down every few characters
                    if (i % 3 === 0) this.scrollToBottom();
                    
                    setTimeout(typeChar, speed);
                } else {
                    // Remove cursor when done
                    textElement.classList.remove('typing-cursor');
                    resolve();
                }
            };
            
            typeChar();
        });
    }

    // Format message with markdown-like syntax
    formatMessage(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    // Enhanced typing indicator
    showTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.style.display = 'flex';
            setTimeout(() => {
                this.typingIndicator.classList.add('visible');
            }, 10);
        }
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.classList.remove('visible');
            setTimeout(() => {
                this.typingIndicator.style.display = 'none';
            }, 300);
        }
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
            setTimeout(() => {
                this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
            }, 100);
        }
    }

    toggleSidebar(forceClose = false) {
        if (!this.sidebar) return;
        
        if (window.innerWidth <= 768) {
            if (forceClose) {
                this.sidebar.classList.remove('mobile-visible');
                if (this.mobileOverlay) {
                    this.mobileOverlay.classList.remove('active');
                }
            } else {
                this.sidebar.classList.toggle('mobile-visible');
                if (this.mobileOverlay) {
                    this.mobileOverlay.classList.toggle('active');
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
            button.style.background = 'var(--primary-text)';
            button.style.color = 'var(--primary-bg)';
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.style.background = '';
                button.style.color = '';
            }, 2000);
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
                    <div class="quick-action-card enhanced-quick-action package">
                        <div class="quick-action-icon"><i class="bi bi-box-seam"></i></div>
                        <div class="quick-action-content">
                            <div class="quick-action-title">Rekomendasi Package</div>
                            <div class="quick-action-desc">Temukan solusi tepat untuk bisnis Anda</div>
                        </div>
                    </div>
                    <div class="quick-action-card enhanced-quick-action showcase">
                        <div class="quick-action-icon"><i class="bi bi-laptop"></i></div>
                        <div class="quick-action-content">
                            <div class="quick-action-title">Lihat Showcase</div>
                            <div class="quick-action-desc">Pelajari dari project kami</div>
                        </div>
                    </div>
                    <div class="quick-action-card enhanced-quick-action process">
                        <div class="quick-action-icon"><i class="bi bi-clock"></i></div>
                        <div class="quick-action-content">
                            <div class="quick-action-title">Proses Kerja</div>
                            <div class="quick-action-desc">Timeline & tahapan</div>
                        </div>
                    </div>
                </div>

                <div class="welcome-note">
                    <p><strong> Tips:</strong> Jelaskan kebutuhan bisnis Anda secara detail untuk rekomendasi yang lebih akurat.</p>
                </div>
            </div>
        `;

        // Re-initialize quick actions
        this.initializePromptSystem();
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