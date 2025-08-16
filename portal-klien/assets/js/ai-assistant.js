/*
================================================================================
| JAVASCRIPT LOGIC FOR AI ASSISTANT PAGE                                       |
| Description: Handles all chat interactions and calls the Supabase Edge       |
|              Function for real AI responses from Gemini.                     |
================================================================================
*/

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Element Selection ---
  const chatMessages = document.getElementById("chatMessages");
  const messageInput = document.getElementById("messageInput");
  const sendMessageBtn = document.getElementById("sendMessage");
  const typingIndicator = document.getElementById("typingIndicator");
  const charCount = document.getElementById("charCount");
  const quickActions = document.getElementById("quickActions");

  // Store chat history in memory
  let chatHistory = [];

  /**
   * Appends a message to the chat window.
   * @param {string} text - The message text.
   * @param {string} sender - 'user' or 'ai'.
   */
  function appendMessage(text, sender) {
    const messageBubble = document.createElement("div");
    const avatarIcon = sender === 'user' ? 'fa-user' : 'fa-robot';
    const bubbleClass = sender === 'user' ? 'user-message-bubble' : 'ai-message-bubble';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageBubble.classList.add(bubbleClass);
    messageBubble.innerHTML = `
      <div class="message-avatar">
        <i class="fas ${avatarIcon}"></i>
      </div>
      <div class="message-content">
        <div class="message-text">${text}</div>
        <div class="message-time">${time}</div>
      </div>
    `;
    
    chatMessages.appendChild(messageBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Calls the Supabase Edge Function to get a real AI response.
   * @param {string} currentMessage - The user's latest message.
   */
  async function getAIResponse(currentMessage) {
    typingIndicator.classList.add("active");
    sendMessageBtn.disabled = true;

    try {
      // Invoke the Supabase Edge Function
      const { data, error } = await dbClient.functions.invoke('ai-assistant', {
        body: { history: chatHistory, currentMessage },
      });

      if (error) throw error;

      const aiText = data.candidates[0]?.content?.parts[0]?.text || "Sorry, I encountered an issue. Please try again.";
      
      appendMessage(aiText, 'ai');
      // Add both user and AI messages to history for context in the next turn
      chatHistory.push({ role: 'user', parts: [{ text: currentMessage }] });
      chatHistory.push({ role: 'model', parts: [{ text: aiText }] });

    } catch (err) {
      console.error("Error invoking Edge Function:", err);
      appendMessage("I'm having trouble connecting to my brain right now. Please try again in a moment.", 'ai');
    } finally {
      typingIndicator.classList.remove("active");
      sendMessageBtn.disabled = false;
    }
  }

  /**
   * Handles the sending of a user's message.
   */
  function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText === "") return;

    appendMessage(messageText, 'user');
    messageInput.value = "";
    updateCharCount();
    autoResizeTextarea();

    getAIResponse(messageText);
  }

  function updateCharCount() {
    charCount.textContent = messageInput.value.length;
  }

  function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = (messageInput.scrollHeight) + 'px';
  }

  // --- Event Listeners ---
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
  quickActions.addEventListener("click", (e) => {
    const actionItem = e.target.closest('.quick-action-item');
    if (actionItem) {
      const action = actionItem.dataset.action;
      let message = `Tell me about ${action}.`;
      
      if (action === 'analytics') message = "Show me my latest analytics.";
      if (action === 'orders') message = "What is the status of my recent orders?";
      if (action === 'products') message = "Can you help me with a product?";
      if (action === 'support') message = "How can I get support?";

      messageInput.value = message;
      updateCharCount();
      autoResizeTextarea();
      sendMessage();
    }
  });

  updateCharCount();
});

