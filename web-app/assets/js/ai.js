// File: assets/js/ai.js
// VERSI PRODUKSI - Siap untuk Launching

// [PERBAIKAN] Impor fungsi 'getSupabase' dari file client pusat
import { getSupabase } from './supabase-client.js';

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

    if (!wrapper || !toggleBtn || !overlay) return;

    // [PERBAIKAN] Panggil fungsi untuk mendapatkan koneksi Supabase
    const supabase = getSupabase();

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
        wrapper.classList.toggle('sidebar-visible', !forceClose && !wrapper.classList.contains('sidebar-visible'));
    };

    const renderMessages = (messages) => {
        chatHistoryEl.innerHTML = '';
        messages.forEach(msg => addMessageToUI(msg.role, msg.content));
    };

    const addMessageToUI = (sender, text) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        messageElement.innerHTML = formattedText;

        if (sender === 'ai') {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
            copyBtn.setAttribute('aria-label', 'Copy message');
            copyBtn.onclick = () => {
                // Gunakan document.execCommand untuk kompatibilitas iframe
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    copyBtn.innerHTML = '<i class="bi bi-check-lg"></i>'; // Ganti ikon menjadi centang
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>'; // Kembalikan ikon setelah 1.5 detik
                    }, 1500);
                } catch (err) {
                    console.error('Gagal menyalin teks: ', err);
                }
                document.body.removeChild(textArea);
            };
            messageElement.appendChild(copyBtn);
        }
        
        chatHistoryEl.appendChild(messageElement);
        chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    };

    const renderChatSessions = () => {
        chatHistoryListEl.innerHTML = '';
        chatSessions.forEach(session => {
            const li = document.createElement('li');
            li.className = `chat-history-item ${session.id === currentSessionId ? 'active' : ''}`;
            li.dataset.sessionId = session.id;
            
            const title = session.title || 'Percakapan Baru';
            li.innerHTML = `<span>${title}</span><button class="delete-chat-btn" data-session-id="${session.id}" aria-label="Hapus percakapan"><i class="bi bi-trash3"></i></button>`;
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
        addMessageToUI('ai', "Halo! Saya ashley Asisten Digital Ixiera. Apa tantangan terbesar yang sedang dihadapi bisnis Anda saat ini? Ceritakan saja dengan santai.");
    };

    // --- Fungsi Interaksi dengan Supabase ---
    const createNewSessionInDb = async (firstMessage) => {
        const title = firstMessage.substring(0, 40) + (firstMessage.length > 40 ? '...' : '');
        const { data, error } = await supabase.from('chat_sessions').insert({ user_id: userId, title: title }).select().single();
        if (error) console.error('Error creating new session:', error);
        return data;
    };

    const saveMessageToDb = async (sessionId, role, content) => {
        const { error } = await supabase.from('chat_messages').insert({ session_id: sessionId, role, content });
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

        try {
            const { data: history, error: historyError } = await supabase.from('chat_messages').select('role, content').eq('session_id', sessionToUse).order('created_at', { ascending: true });
            if(historyError) throw historyError;
            
            const questionCount = history.filter(m => m.role === 'user').length;
            const formattedHistory = history.slice(0, -1).map(m => ({
                role: m.role === 'ai' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));
            
            const response = await fetch('/api/ask-gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: formattedHistory,
                    currentMessage: message,
                    questionCount: questionCount
                })
            });

            if (!response.ok) throw new Error(`Server response was not ok: ${response.status}`);
            
            const result = await response.json();
            const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya sedang mengalami kendala. Silakan coba lagi nanti.";
            
            toggleLoadingIndicator(false);
            addMessageToUI('ai', aiResponse);
            await saveMessageToDb(sessionToUse, 'ai', aiResponse);

        } catch (error) {
            console.error("Internal or network error:", error);
            toggleLoadingIndicator(false);
            addMessageToUI('ai', "Maaf, terjadi kendala teknis saat menghubungi asisten. Tim kami sudah diberitahu. Silakan coba lagi dalam beberapa saat.");
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
        
        const { data, error } = await supabase.from('chat_messages').select('role, content').eq('session_id', sessionId).order('created_at', { ascending: true });
        if (error) {
            addMessageToUI('ai', 'Gagal memuat percakapan.');
            return;
        }
        renderMessages(data);
    };

    const handleDeleteChat = async (sessionId) => {
        const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId);
        if (error) return;

        chatSessions = chatSessions.filter(s => s.id !== sessionId);
        renderChatSessions();
        if (currentSessionId === sessionId) handleNewChat();
    };

    const initializeApp = async () => {
        const { data, error } = await supabase.from('chat_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) return;

        chatSessions = data;
        renderChatSessions();
        if (chatSessions.length > 0) {
            handleSelectChat(chatSessions[0].id);
        } else {
            showWelcomeMessage();
        }
    };

    // --- Event Listeners ---
    sendBtn.addEventListener('click', () => { sendMessage(userInputEl.value); userInputEl.value = ''; });
    userInputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(userInputEl.value); userInputEl.value = ''; } });
    newChatBtn.addEventListener('click', handleNewChat);
    toggleBtn.addEventListener('click', () => toggleSidebar());
    overlay.addEventListener('click', () => toggleSidebar(true));
    chatHistoryListEl.addEventListener('click', (e) => {
        const sessionItem = e.target.closest('.chat-history-item');
        const deleteBtn = e.target.closest('.delete-chat-btn');
        if (deleteBtn) { e.stopPropagation(); handleDeleteChat(deleteBtn.dataset.sessionId); } 
        else if (sessionItem) { handleSelectChat(sessionItem.dataset.sessionId); }
    });

    initializeApp();
});

