// File: assets/js/ai.js
// VERSI INI MENGANDUNG MODE DEBUG UNTUK MENAMPILKAN ERROR DI CHAT

document.addEventListener('DOMContentLoaded', () => {
    // --- Elemen DOM ---
    const wrapper = document.getElementById('chat-interface-wrapper');
    const chatHistoryEl = document.getElementById('chat-history');
    const userInputEl = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistoryListEl = document.getElementById('chat-history-list');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const overlay = document.getElementById('chat-overlay');

    // --- Cek Elemen ---
    if (!wrapper || !toggleBtn || !overlay) {
        console.error("Elemen UI utama (wrapper, toggle, overlay) tidak ditemukan.");
        return;
    }

    // --- Konfigurasi Supabase ---
    const SUPABASE_URL = 'https://xtarsaurwclktwhhryas.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXJzYXVyd2Nsa3R3aGhyeWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDM1ODksImV4cCI6MjA2NzM3OTU4OX0.ZAgs8NbZs8F2GuBVfiFYuyqOLrRC1hemdMyE-i4riYI';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- State Aplikasi ---
    let isLoading = false;
    let currentSessionId = null;
    let chatSessions = [];
    
    let userId = localStorage.getItem('ixiera-anon-user-id');
    if (!userId) {
        userId = `anon_${crypto.randomUUID()}`;
        localStorage.setItem('ixiera-anon-user-id', userId);
    }

    // --- Fungsi UI & Render ---
    const toggleSidebar = (forceClose = false) => {
        if (forceClose) {
            wrapper.classList.remove('sidebar-visible');
        } else {
            wrapper.classList.toggle('sidebar-visible');
        }
    };

    const renderMessages = (messages) => {
        chatHistoryEl.innerHTML = '';
        messages.forEach(msg => addMessageToUI(msg.role, msg.content));
    };

    const addMessageToUI = (sender, text) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\n/g, '<br>');
        messageElement.innerHTML = formattedText;

        if (sender === 'ai') {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
            copyBtn.setAttribute('aria-label', 'Copy message');
            copyBtn.onclick = () => navigator.clipboard.writeText(text);
            messageElement.appendChild(copyBtn);
        }
        
        chatHistoryEl.appendChild(messageElement);
        chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    };

    const renderChatSessions = () => {
        chatHistoryListEl.innerHTML = '';
        chatSessions.forEach(session => {
            const li = document.createElement('li');
            li.className = 'chat-history-item';
            li.dataset.sessionId = session.id;
            if (session.id === currentSessionId) {
                li.classList.add('active');
            }
            
            const title = session.title || 'Percakapan Baru';
            li.innerHTML = `
                <span>${title}</span>
                <button class="delete-chat-btn" data-session-id="${session.id}" aria-label="Hapus percakapan">
                    <i class="bi bi-trash3"></i>
                </button>
            `;
            chatHistoryListEl.appendChild(li);
        });
    };

    const toggleLoadingIndicator = (show) => {
        let indicator = document.getElementById('loading-indicator');
        if (show) {
            if (!indicator) {
                const loadingElement = document.createElement('div');
                loadingElement.id = 'loading-indicator';
                loadingElement.className = 'loading-indicator';
                loadingElement.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
                chatHistoryEl.appendChild(loadingElement);
                chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
            }
            isLoading = true;
            sendBtn.disabled = true;
            userInputEl.disabled = true;
        } else {
            if (indicator) indicator.remove();
            isLoading = false;
            sendBtn.disabled = false;
            userInputEl.disabled = false;
            userInputEl.focus();
        }
    };

    const showWelcomeMessage = () => {
        chatHistoryEl.innerHTML = '';
        const welcomeMsg = "Halo! Saya Asisten Digital Ixiera. Apa tantangan terbesar yang sedang dihadapi bisnis Anda saat ini? Ceritakan saja dengan santai.";
        addMessageToUI('ai', welcomeMsg);
    };

    // --- Fungsi Interaksi dengan Supabase ---
    const createNewSessionInDb = async (firstMessage) => {
        const title = firstMessage.substring(0, 40) + (firstMessage.length > 40 ? '...' : '');
        const { data, error } = await supabase
            .from('chat_sessions')
            .insert({ user_id: userId, title: title })
            .select()
            .single();
        
        if (error) {
            console.error('Error creating new session:', error);
            return null;
        }
        return data;
    };

    const saveMessageToDb = async (sessionId, role, content) => {
        const { error } = await supabase
            .from('chat_messages')
            .insert({ session_id: sessionId, role, content });
        if (error) console.error('Error saving message:', error);
    };

    // --- Logika Utama Aplikasi ---
    const sendMessage = async (messageText) => {
        const message = messageText.trim();
        if (message === '' || isLoading) return;

        let sessionToUse = currentSessionId;

        if (!sessionToUse) {
            const newSession = await createNewSessionInDb(message);
            if (!newSession) {
                addMessageToUI('ai', 'Maaf, gagal memulai percakapan baru. Coba lagi nanti.');
                return;
            }
            currentSessionId = newSession.id;
            sessionToUse = newSession.id;
            
            chatSessions.unshift(newSession);
            renderChatSessions();
            chatHistoryEl.innerHTML = '';
        }

        addMessageToUI('user', message);
        await saveMessageToDb(sessionToUse, 'user', message);
        
        toggleLoadingIndicator(true);

        let response; // Definisikan response di luar try-catch
        try {
            const { data: history, error: historyError } = await supabase
                .from('chat_messages')
                .select('role, content')
                .eq('session_id', sessionToUse)
                .order('created_at', { ascending: true });

            if(historyError) throw historyError;

            const formattedHistory = history.map(m => ({
                role: m.role === 'ai' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

            const prompt = `Anda adalah Asisten Digital Ixiera dan ceo founder dari platform ini adalah jeffry berikan output singkat setiap percakapan max 500 token`;
            
            response = await fetch('/api/ask-gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemPrompt: prompt,
                    history: formattedHistory,
                    currentMessage: message 
                })
            });

            // Pindahkan pengecekan response.ok ke dalam blok try
            if (!response.ok) {
                // Buat error baru yang menyertakan response agar bisa ditangkap di catch
                const error = new Error(`Request to proxy failed with status ${response.status}`);
                error.response = response; // Lampirkan response ke objek error
                throw error;
            }
            
            const result = await response.json();
            let aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya sedang ada kendala. Bisa ulangi lagi?";
            
            toggleLoadingIndicator(false);
            addMessageToUI('ai', aiResponse);
            await saveMessageToDb(sessionToUse, 'ai', aiResponse);

        } catch (error) {
            console.error("Error communicating with the server:", error);
            toggleLoadingIndicator(false);
            
            let detailError = `Pesan: ${error.message}.`;

            // Coba dapatkan detail dari body response jika ada
            if (error.response) {
                try {
                    const errorJson = await error.response.json();
                    detailError += ` Detail Server: ${JSON.stringify(errorJson)}`;
                } catch (e) {
                    detailError += ` Gagal membaca detail error dari server.`;
                }
            }
            
            const errorMsg = `DEBUG: Terjadi error. ${detailError}`;
            addMessageToUI('ai', errorMsg);
        }
    };

    const handleNewChat = () => {
        currentSessionId = null;
        showWelcomeMessage();
        renderChatSessions();
        toggleSidebar(true);
    };

    const handleSelectChat = async (sessionId) => {
        if (isLoading || currentSessionId === sessionId) return;
        currentSessionId = sessionId;
        renderChatSessions();
        toggleSidebar(true);
        
        const { data, error } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            addMessageToUI('ai', 'Gagal memuat percakapan.');
            return;
        }
        renderMessages(data);
    };

    const handleDeleteChat = async (sessionId) => {
        if (!confirm('Apakah Anda yakin ingin menghapus percakapan ini?')) return;

        const { error } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', sessionId);

        if (error) {
            console.error('Error deleting session:', error);
            alert('Gagal menghapus percakapan.');
            return;
        }

        chatSessions = chatSessions.filter(s => s.id !== sessionId);
        renderChatSessions();

        if (currentSessionId === sessionId) {
            handleNewChat();
        }
    };

    // --- Inisialisasi Aplikasi ---
    const initializeApp = async () => {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching chat sessions:', error);
            return;
        }

        chatSessions = data;
        renderChatSessions();

        if (chatSessions.length > 0) {
            // Muat chat pertama secara default tanpa menutup sidebar
            handleSelectChat(chatSessions[0].id);
        } else {
            showWelcomeMessage();
        }
    };

    // --- Event Listeners ---
    sendBtn.addEventListener('click', () => {
      sendMessage(userInputEl.value);
      userInputEl.value = '';
    });

    userInputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage(userInputEl.value);
            userInputEl.value = '';
        }
    });

    newChatBtn.addEventListener('click', handleNewChat);

    toggleBtn.addEventListener('click', () => toggleSidebar());
    overlay.addEventListener('click', () => toggleSidebar(true));

    chatHistoryListEl.addEventListener('click', (event) => {
        const sessionItem = event.target.closest('.chat-history-item');
        const deleteBtn = event.target.closest('.delete-chat-btn');

        if (deleteBtn) {
            event.stopPropagation();
            const sessionId = deleteBtn.dataset.sessionId;
            handleDeleteChat(sessionId);
        } else if (sessionItem) {
            const sessionId = sessionItem.dataset.sessionId;
            handleSelectChat(sessionId);
        }
    });

    initializeApp();
});

