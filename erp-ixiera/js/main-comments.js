import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Konfigurasi Supabase ---
    const SUPABASE_URL = 'https://xtarsaurwclktwhhryas.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXJzYXVyd2Nsa3R3aGhyeWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDM1ODksImV4cCI6MjA2NzM3OTU4OX0.ZAgs8NbZs8F2GuBVfiFYuyqOLrRC1hemdMyE-i4riYI';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- Otentikasi Pengguna ---
    const { data: { session } } = await supabase.auth.getSession();
    const ALLOWED_UID = 'fb109bdd-584d-4f57-b50c-5069ba7ef12a';

    if (!session || session.user.id !== ALLOWED_UID) {
        window.location.href = 'login.html';
        return;
    }

    // --- Elemen DOM ---
    const commentsTableBody = document.getElementById('comments-table-body');
    const editCommentModal = new bootstrap.Modal(document.getElementById('editCommentModal'));
    const editCommentForm = document.getElementById('editCommentForm');
    const logoutLink = document.getElementById('logout-link');

    // --- Fungsi CRUD ---
    const fetchComments = async () => {
        const { data, error } = await supabase.from('comments').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching comments:', error);
            return [];
        }
        return data;
    };

    const renderTable = (comments) => {
        commentsTableBody.innerHTML = '';
        comments.forEach(comment => {
            const row = document.createElement('tr');
            const createdAt = new Date(comment.created_at).toLocaleDateString();

            row.innerHTML = `
                <td>${comment.author_name}</td>
                <td class="d-none d-md-table-cell">${comment.content}</td>
                <td><a href="blog-posts.html#post-${comment.post_id}" class="text-info">${comment.post_id}</a></td>
                <td>${createdAt}</td>
                <td class="d-none d-md-table-cell">
                    <button class="btn btn-warning btn-sm edit-btn" data-id="${comment.id}">
                        <i class="align-middle" data-feather="edit-2"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${comment.id}">
                        <i class="align-middle" data-feather="trash-2"></i> Delete
                    </button>
                </td>
            `;
            commentsTableBody.appendChild(row);
        });
        feather.replace();
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const commentId = document.getElementById('commentId').value;
        const commentContent = document.getElementById('commentContent').value;

        const { error } = await supabase.from('comments').update({ content: commentContent }).eq('id', commentId);
        if (error) {
            console.error('Error updating comment:', error);
        }
        
        editCommentModal.hide();
        loadComments();
    };

    const handleDelete = async (e) => {
        const commentId = e.target.closest('button').dataset.id;
        if (confirm('Are you sure you want to delete this comment?')) {
            const { error } = await supabase.from('comments').delete().eq('id', commentId);
            if (error) {
                console.error('Error deleting comment:', error);
            }
            loadComments();
        }
    };
    
    // --- Pemuatan Data & Event Listeners ---
    const loadComments = async () => {
        const comments = await fetchComments();
        renderTable(comments);
    };

    editCommentForm.addEventListener('submit', handleFormSubmit);

    commentsTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('.edit-btn, .delete-btn');
        if (!target) return;

        const commentId = target.dataset.id;

        if (target.classList.contains('edit-btn')) {
            const { data, error } = await supabase.from('comments').select('*').eq('id', commentId).single();
            if (error) {
                console.error('Error fetching comment for edit:', error);
                return;
            }

            document.getElementById('commentId').value = data.id;
            document.getElementById('commentAuthor').value = data.author_name;
            document.getElementById('commentContent').value = data.content;
            editCommentModal.show();
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

    loadComments();
});
