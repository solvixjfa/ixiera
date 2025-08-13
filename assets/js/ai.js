// File: assets/js/ai.js

document.addEventListener('DOMContentLoaded', () => {
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const suggestionChipsContainer = document.getElementById('suggestion-chips');

    // Pastikan semua elemen ada sebelum melanjutkan
    if (!chatHistory || !userInput || !sendBtn || !suggestionChipsContainer) {
        console.error("Satu atau lebih elemen chat tidak ditemukan di halaman ini.");
        return; // Hentikan eksekusi jika tidak di halaman yang benar
    }

    let isLoading = false;
    const MESSAGE_LIMIT = 5; // Batas 5 pesan dari pengguna
    let conversation = [];

    // --- Core Functions ---
    const addMessage = (sender, text) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        
        // Render basic markdown
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
        formattedText = formattedText.replace(/\n/g, '<br>'); // New lines

        messageElement.innerHTML = formattedText;

        // Tambah tombol salin untuk pesan AI
        if (sender === 'ai') {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
            copyBtn.setAttribute('aria-label', 'Copy message');
            copyBtn.onclick = () => copyToClipboard(text);
            messageElement.appendChild(copyBtn);
        }
        
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            // Optional: Show a "Copied!" notification
        }).catch(err => console.error('Gagal menyalin:', err));
    };

    const toggleLoading = (show) => {
        let indicator = document.getElementById('loading-indicator');
        if (show) {
            if (!indicator) {
                const loadingElement = document.createElement('div');
                loadingElement.id = 'loading-indicator';
                loadingElement.className = 'loading-indicator';
                loadingElement.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
                chatHistory.appendChild(loadingElement);
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
            isLoading = true;
            sendBtn.disabled = true;
            userInput.disabled = true;
        } else {
            if (indicator) indicator.remove();
            isLoading = false;
            sendBtn.disabled = false;
            userInput.disabled = false;
            userInput.focus();
        }
    };

    const showLimitMessage = () => {
        const limitElement = document.createElement('div');
        limitElement.className = 'limit-cta-message';
        limitElement.innerHTML = `
            <p class="mb-2">Anda telah mencapai batas percobaan gratis.</p>
            <a href="pricing.html" class="btn btn-primary">Lihat Paket & Daftar</a>
        `;
        chatHistory.appendChild(limitElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        userInput.disabled = true;
        sendBtn.disabled = true;
    };

    // --- Main Logic ---
    const sendMessage = async (messageText) => {
        const message = messageText.trim();
        if (message === '' || isLoading) return;

        const userMessagesCount = conversation.filter(m => m.sender === 'user').length;
        if (userMessagesCount >= MESSAGE_LIMIT) {
            showLimitMessage();
            return;
        }

        addMessage('user', message);
        conversation.push({ sender: 'user', text: message });
        saveConversation();
        
        toggleLoading(true);

        try {
            const prompt = `Anda adalah Asisten Digital Ixiera, seorang konsultan bisnis yang ramah, solutif, dan bisa dipercaya. Gaya bicara Anda natural seperti teman ahli, bukan robot.
            Tugas Anda adalah:
            1.  Analisis masalah bisnis yang diceritakan pengguna.
            2.  Berikan tanggapan yang empatik dan tunjukkan Anda mengerti masalahnya.
            3.  Berikan rekomendasi solusi yang relevan dari layanan Ixiera (seperti Website & Sistem Terintegrasi, Otomatisasi Bisnis, Desain Brand, Iklan Digital, SEO, Manajemen Medsos, atau Konsultasi Strategis) dengan cara yang halus, BUKAN jualan secara terang-terangan.
            4.  Gunakan format **tebal** untuk menyorot nama layanan atau poin penting. Gunakan baris baru untuk membuat daftar jika perlu.
            5.  Jaga jawaban agar singkat, padat, dan mudah dipahami.
            6.  Akhiri dengan pertanyaan terbuka untuk melanjutkan percakapan atau ajakan untuk diskusi lebih lanjut di halaman kontak.

            Masalah pengguna: "${message}"`;

            const response = await fetch('/api/ask-gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });

            if (!response.ok) {
                throw new Error(`Request to proxy failed with status ${response.status}`);
            }
            const result = await response.json();
            
            let aiResponse = "Maaf, sepertinya saya sedang mengalami sedikit kendala. Bisa coba ceritakan lagi masalah Anda?";
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
              aiResponse = result.candidates[0].content.parts[0].text;
            }
            
            toggleLoading(false);
            
            addMessage('ai', aiResponse);
            conversation.push({ sender: 'ai', text: aiResponse });
            saveConversation();

        } catch (error) {
            console.error("Error communicating with the server:", error);
            toggleLoading(false);
            const errorMsg = "Maaf, terjadi kesalahan. Silakan coba lagi nanti atau hubungi kami langsung melalui halaman kontak.";
            addMessage('ai', errorMsg);
            conversation.push({ sender: 'ai', text: errorMsg });
            saveConversation();
        }
    };

    // --- Local Storage ---
    const saveConversation = () => {
        localStorage.setItem('ixieraChatHistory', JSON.stringify(conversation));
    };

    const loadConversation = () => {
        const savedHistory = localStorage.getItem('ixieraChatHistory');
        if (savedHistory) {
            conversation = JSON.parse(savedHistory);
            chatHistory.innerHTML = ''; // Hapus pesan default
            conversation.forEach(msg => addMessage(msg.sender, msg.text));
            
            const userMessagesCount = conversation.filter(m => m.sender === 'user').length;
            if (userMessagesCount >= MESSAGE_LIMIT) {
                showLimitMessage();
            }

        } else {
            const welcomeMsg = "Halo! Saya Asisten Digital Ixiera. Apa tantangan terbesar yang sedang dihadapi bisnis Anda saat ini? Ceritakan saja dengan santai.";
            addMessage('ai', welcomeMsg);
            conversation.push({sender: 'ai', text: welcomeMsg});
            saveConversation();
        }
    };

    // --- Event Listeners ---
    sendBtn.addEventListener('click', () => {
      sendMessage(userInput.value);
      userInput.value = '';
    });

    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage(userInput.value);
            userInput.value = '';
        }
    });

    suggestionChipsContainer.addEventListener('click', (event) => {
      if (event.target.classList.contains('suggestion-chip')) {
        const suggestionText = event.target.textContent;
        userInput.value = suggestionText;
        sendMessage(suggestionText);
        userInput.value = '';
      }
    });

    // --- Inisialisasi ---
    loadConversation();
});
