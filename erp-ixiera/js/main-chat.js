import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Konfigurasi Supabase ---
    const SUPABASE_URL = 'https://xtarsaurwclktwhhryas.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXJzYXVyd2Nsa3R3aGhyeWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDM1ODksImV4cCI6MjA2NzM3OTU4OX0.ZAgs8NbZs8F2GuBVfiFYuyqOLrRC1hemdMyE-i4riYI';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- Autentikasi Pengguna ---
    const { data: { session } } = await supabase.auth.getSession();
    const ALLOWED_UID = 'fb109bdd-584d-4f57-b50c-5069ba7ef12a';

    if (!session || session.user.id !== ALLOWED_UID) {
        window.location.href = 'index.html';
        return;
    }

    // --- Elemen DOM ---
    const chatTableBody = document.getElementById('chat-table-body');
    const chatMessagesContainer = document.getElementById('chat-messages');
    const viewChatModal = new bootstrap.Modal(document.getElementById('viewChatModal'));
    const logoutLink = document.getElementById('logout-link');

    // --- Fungsi CRUD dan UI ---
    const fetchChatSessions = async () => {
        // Mengambil semua sesi obrolan dari tabel chat_sessions
        const { data: sessions, error } = await supabase.from('chat_sessions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching chat sessions:', error);
            return [];
        }

        // Untuk setiap sesi, hitung jumlah pesannya
        const sessionsWithCounts = await Promise.all(sessions.map(async (session) => {
            const { count, error: countError } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', session.id);
            
            if (countError) {
                console.error('Error fetching message count:', countError);
            }
            return {
                ...session,
                message_count: count || 0
            };
        }));
        
        return sessionsWithCounts;
    };

    const renderTable = (sessions) => {
        chatTableBody.innerHTML = '';
        if (sessions.length === 0) {
            chatTableBody.innerHTML = `<tr><td colspan="4" class="text-center">Tidak ada riwayat obrolan.</td></tr>`;
            return;
        }

        sessions.forEach(session => {
            const row = document.createElement('tr');
            const createdAt = new Date(session.created_at).toLocaleDateString();

            row.innerHTML = `
                <td>${session.title || 'Untitled Session'}</td>
                <td class="d-none d-md-table-cell">${createdAt}</td>
                <td class="d-none d-md-table-cell">${session.message_count}</td>
                <td class="d-none d-md-table-cell">
                    <button class="btn btn-primary btn-sm view-btn" data-id="${session.id}">
                        <i class="align-middle" data-feather="eye"></i> View
                    </button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${session.id}">
                        <i class="align-middle" data-feather="trash-2"></i> Delete
                    </button>
                </td>
            `;
            chatTableBody.appendChild(row);
        });
        feather.replace();
    };

    const handleDelete = async (e) => {
        const sessionId = e.target.closest('button').dataset.id;
        if (confirm(`Apakah Anda yakin ingin menghapus sesi obrolan dengan ID ${sessionId}? Ini akan menghapus semua pesan terkait.`)) {
            // Hapus pesan-pesan terkait terlebih dahulu
            const { error: messagesError } = await supabase.from('chat_messages').delete().eq('session_id', sessionId);
            if (messagesError) {
                console.error('Error deleting chat messages:', messagesError);
                return;
            }

            // Hapus sesi dari tabel chat_sessions
            const { error: sessionError } = await supabase.from('chat_sessions').delete().eq('id', sessionId);
            if (sessionError) {
                console.error('Error deleting chat session:', sessionError);
            }

            loadChatSessions();
        }
    };

    // --- Pemuatan Data & Event Listeners ---
    const loadChatSessions = async () => {
        const sessions = await fetchChatSessions();
        renderTable(sessions);
    };

    chatTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('.view-btn, .delete-btn');
        if (!target) return;

        const sessionId = target.dataset.id;

        if (target.classList.contains('view-btn')) {
            const { data, error } = await supabase.from('chat_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
            if (error) {
                console.error('Error fetching chat messages:', error);
                return;
            }

            chatMessagesContainer.innerHTML = '';
            data.forEach(msg => {
                const messageDiv = document.createElement('div');
                const roleClass = msg.role === 'user' ? 'bg-light' : 'bg-info text-dark';
                const alignment = msg.role === 'user' ? 'text-end' : 'text-start';
                
                messageDiv.className = `p-2 my-2 rounded-3 ${roleClass} ${alignment}`;
                messageDiv.innerHTML = `<strong>${msg.role}:</strong> <br> ${msg.content}`;
                chatMessagesContainer.appendChild(messageDiv);
            });
            viewChatModal.show();
        } else if (target.classList.contains('delete-btn')) {
            handleDelete(e);
        }
    });

    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    const darkModeToggle = document.getElementById('darkModeToggle');

    const enableDarkMode = () => {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (typeof feather !== 'undefined') feather.replace();
    };

    const disableDarkMode = () => {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        if (typeof feather !== 'undefined') feather.replace();
    };

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        enableDarkMode();
    } else if (savedTheme === 'light') {
        disableDarkMode();
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        enableDarkMode();
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            if (document.body.classList.contains('dark-mode')) {
                disableDarkMode();
            } else {
                enableDarkMode();
            }
        });
    }

    loadChatSessions();
});
