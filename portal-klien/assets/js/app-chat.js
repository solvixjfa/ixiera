// =================================================================
//           FILE: assets/js/app-chat.js
//           LOGIKA UNTUK HALAMAN CHAT
// =================================================================

// 1. Inisialisasi Firebase
// -----------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDNa4tmSIK26we17vT7Qb8uenLY5QVRYPI",
  authDomain: "ixiera-core.firebaseapp.com",
  projectId: "ixiera-core",
  storageBucket: "ixiera-core.firebasestorage.app",
  messagingSenderId: "637819618265",
  appId: "1:637819618265:web:c056d7fe5bcfa481734fc8",
  measurementId: "G-YM6VE79GGG"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let activeChatId = null;
let unsubscribeFromMessages = null;

// 2. Auth Guard
// -----------------------------------------------------------------
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        loadConversations();
        setupMessageForm();
    } else {
        window.location.href = 'login.html';
    }
});

// 3. Memuat Daftar Percakapan/Pengguna
// -----------------------------------------------------------------
async function loadConversations() {
    const conversationListEl = document.getElementById('conversation-list');
    
    // Ambil semua pengguna kecuali diri sendiri
    const usersSnapshot = await db.collection('users').get();
    conversationListEl.innerHTML = ''; // Clear spinner

    usersSnapshot.forEach(doc => {
        if (doc.id === currentUser.uid) return; // Jangan tampilkan diri sendiri

        const userData = doc.data();
        const conversationItem = `
            <a href="#" class="list-group-item list-group-item-action" data-user-id="${doc.id}" data-user-name="${userData.displayName}" data-user-avatar="${userData.photoURL || 'assets/img/profile.jpg'}">
                <div class="d-flex align-items-center">
                    <div class="avatar me-3">
                        <img src="${userData.photoURL || 'assets/img/profile.jpg'}" alt="..." class="avatar-img rounded-circle">
                    </div>
                    <div>
                        <h6 class="mb-0">${userData.displayName || doc.id}</h6>
                        <small class="text-muted">Klik untuk memulai chat</small>
                    </div>
                </div>
            </a>
        `;
        conversationListEl.innerHTML += conversationItem;
    });

    // Tambahkan event listener untuk setiap item percakapan
    document.querySelectorAll('#conversation-list a').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const partnerId = item.dataset.userId;
            const partnerName = item.dataset.userName;
            const partnerAvatar = item.dataset.userAvatar;
            startChat(partnerId, partnerName, partnerAvatar);
        });
    });
}

// 4. Memulai Chat dan Menampilkan Pesan
// -----------------------------------------------------------------
function startChat(partnerId, partnerName, partnerAvatar) {
    // Buat ID chat yang konsisten antara dua pengguna
    activeChatId = [currentUser.uid, partnerId].sort().join('_');

    // Tampilkan header chat
    document.getElementById('chat-header').classList.remove('d-none');
    document.getElementById('chat-input-area').classList.remove('d-none');
    document.getElementById('chat-partner-name').textContent = partnerName;
    document.getElementById('chat-partner-avatar').src = partnerAvatar;

    // Hentikan listener pesan sebelumnya (jika ada)
    if (unsubscribeFromMessages) {
        unsubscribeFromMessages();
    }

    // Buat listener real-time untuk pesan baru
    const messagesRef = db.collection('chats').doc(activeChatId).collection('messages').orderBy('timestamp');
    
    unsubscribeFromMessages = messagesRef.onSnapshot(snapshot => {
        const messagesContainer = document.getElementById('chat-messages-container');
        messagesContainer.innerHTML = ''; // Kosongkan pesan lama
        
        if (snapshot.empty) {
            messagesContainer.innerHTML = '<p class="text-center text-muted mt-5">Belum ada pesan. Mulai percakapan!</p>';
        } else {
            snapshot.forEach(doc => {
                displayMessage(doc.data());
            });
            // Auto-scroll ke pesan terakhir
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    });
}

// 5. Menampilkan satu pesan di UI
// -----------------------------------------------------------------
function displayMessage(messageData) {
    const messagesContainer = document.getElementById('chat-messages-container');
    const messageType = messageData.senderId === currentUser.uid ? 'sent' : 'received';
    
    const messageEl = `
        <div class="message ${messageType}">
            <div class="message-body">
                ${messageData.text}
            </div>
        </div>
    `;
    messagesContainer.innerHTML += messageEl;
}


// 6. Mengirim Pesan
// -----------------------------------------------------------------
function setupMessageForm() {
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const messageText = messageInput.value.trim();

        if (messageText && activeChatId) {
            const messagesRef = db.collection('chats').doc(activeChatId).collection('messages');
            messagesRef.add({
                text: messageText,
                senderId: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            messageInput.value = ''; // Kosongkan input
        }
    });
}

