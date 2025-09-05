/*
================================================================================
| JAVASCRIPT LOGIC FOR AI ASSISTANT PAGE (MODIFIED FOR NEW UI)                 |
| Description: Handles all chat interactions, modal functionality, and calls   |
|              the Supabase Edge Function for real AI responses from Gemini.   |
================================================================================
*/

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Element Selection (Disesuaikan dengan HTML baru) ---
  const chatMessages = document.getElementById("chatMessages");
  const messageInput = document.getElementById("messageInput");
  const sendMessageBtn = document.getElementById("sendMessage");
  const typingIndicator = document.getElementById("typingIndicator");
  const charCount = document.getElementById("charCount");
  const starterPrompts = document.getElementById("starterPrompts"); // DIUBAH: dari quickActions
  const aiChatModal = document.getElementById('aiChatModal');       // BARU: untuk mengontrol modal

  // Store chat history in memory
  let chatHistory = [];

  // --- FUNGSI BARU: Untuk menampilkan pesan sambutan dinamis ---
  function showWelcomeMessage() {
    // Kosongkan chat dan history setiap kali modal dibuka
    chatMessages.innerHTML = '';
    chatHistory = [];
    starterPrompts.style.display = 'grid'; // Tampilkan starter prompts

    const welcomeText = "Hello! I'm your AI Assistant. You can ask me about your orders, products, or anything else. Here are some ideas to get started:";
    // Kita tidak menambahkan pesan sambutan ke history agar tidak mengganggu konteks AI
    appendMessage(welcomeText, 'ai', false); // Parameter ketiga untuk tidak menyimpan ke history
  }

  /**
   * Appends a message to the chat window.
   * @param {string} text - The message text.
   * @param {string} sender - 'user' or 'ai'.
   * @param {boolean} addToHistory - Whether to add this message to the AI's context history.
   */
  // FUNGSI INTI ANDA (Hampir tidak diubah)
  function appendMessage(text, sender, addToHistory = true) {
    const messageBubble = document.createElement("div");
    const avatarIcon = sender === 'user' ? 'fa-user' : 'fa-robot';
    const bubbleClass = sender === 'user' ? 'user-message-bubble' : 'ai-message-bubble';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Menggunakan DOMParser untuk merender HTML/Markdown sederhana dari AI dengan aman
    const parsedHTML = new DOMParser().parseFromString(text, 'text/html');

    messageBubble.classList.add(bubbleClass);
    messageBubble.innerHTML = `
      <div class="message-avatar">
        <i class="fas ${avatarIcon}"></i>
      </div>
      <div class="message-content">
        <div class="message-text"></div>
        <div class="message-time">${time}</div>
      </div>
    `;

    // Memasukkan konten teks yang sudah diparsing agar list, dll. bisa ditampilkan
    messageBubble.querySelector('.message-text').append(...parsedHTML.body.childNodes);
    
    chatMessages.appendChild(messageBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Menambahkan ke history hanya jika diminta
    if (addToHistory) {
      const role = sender === 'user' ? 'user' : 'model';
      chatHistory.push({ role: role, parts: [{ text: text }] });
    }
  }

  /**
   * Calls the Supabase Edge Function to get a real AI response.
   * @param {string} currentMessage - The user's latest message.
   */
  // FUNGSI SUPABASE ANDA (Tidak diubah sama sekali)
  async function getAIResponse(currentMessage) {
    typingIndicator.classList.add("active");
    sendMessageBtn.disabled = true;
    starterPrompts.style.display = 'none'; // Sembunyikan prompts setelah chat dimulai

    try {
      // Invoke the Supabase Edge Function
      const { data, error } = await dbClient.functions.invoke('ai-assistant', {
        body: { history: chatHistory, currentMessage },
      });

      if (error) throw error;

      const aiText = data.candidates[0]?.content?.parts[0]?.text || "Sorry, I encountered an issue. Please try again.";
      
      // Pesan dari AI selalu ditambahkan ke history
      appendMessage(aiText, 'ai', true);

    } catch (err) {
      console.error("Error invoking Edge Function:", err);
      appendMessage("I'm having trouble connecting to my brain right now. Please try again in a moment.", 'ai', false);
    } finally {
      typingIndicator.classList.remove("active");
      sendMessageBtn.disabled = false;
      messageInput.focus();
    }
  }

  /**
   * Handles the sending of a user's message.
   */
  // FUNGSI INTI ANDA (Sedikit modifikasi untuk history)
  function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText === "") return;

    // Pesan pengguna selalu ditambahkan ke history
    appendMessage(messageText, 'user', true);
    messageInput.value = "";
    updateCharCount();
    autoResizeTextarea();

    // Mengirim pesan terakhir ke AI (currentMessage)
    // History sudah diperbarui di dalam appendMessage
    getAIResponse(messageText);
  }

  // FUNGSI UTILITAS ANDA (Tidak diubah sama sekali)
  function updateCharCount() {
    charCount.textContent = messageInput.value.length;
  }

  function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = (messageInput.scrollHeight) + 'px';
  }

  // --- Event Listeners (Disesuaikan dengan UI baru) ---
  sendMessageBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  messageInput.addEventListener("input", () => {
    updateCharCount();
    autoResizeTextarea();
  });

  // DIUBAH: Event listener sekarang untuk "Starter Prompts"
  starterPrompts.addEventListener("click", (e) => {
    const promptItem = e.target.closest('.starter-prompt-item');
    if (promptItem) {
      const promptText = promptItem.dataset.prompt;
      messageInput.value = promptText;
      updateCharCount();
      autoResizeTextarea();
      sendMessage();
    }
  });

  // BARU: Logika untuk mengontrol modal
  if (aiChatModal) {
    // Saat modal akan ditampilkan, panggil fungsi sambutan
    aiChatModal.addEventListener('show.bs.modal', () => {
      showWelcomeMessage();
    });
  }

  updateCharCount();
});


