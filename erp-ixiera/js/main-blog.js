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
    const postsTableBody = document.getElementById('posts-table-body');
    const crudModal = new bootstrap.Modal(document.getElementById('crudModal'));
    const crudModalLabel = document.getElementById('crudModalLabel');
    const crudForm = document.getElementById('crudForm');
    const addNewBtn = document.getElementById('addNewBtn');
    const logoutLink = document.getElementById('logout-link');

    let currentPostId = null;

    // --- Fungsi CRUD ---
    const fetchPosts = async () => {
        const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching blog posts:', error);
            return [];
        }
        return data;
    };

    const renderTable = (posts) => {
        postsTableBody.innerHTML = '';
        posts.forEach(post => {
            const row = document.createElement('tr');
            const createdAt = new Date(post.created_at).toLocaleDateString();

            row.innerHTML = `
                <td>${post.title}</td>
                <td>${post.slug}</td>
                <td>${createdAt}</td>
                <td>
                    <button class="btn btn-warning btn-sm edit-btn" data-id="${post.id}">
                        <i class="align-middle" data-feather="edit-2"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${post.id}">
                        <i class="align-middle" data-feather="trash-2"></i> Delete
                    </button>
                </td>
            `;
            postsTableBody.appendChild(row);
        });
        feather.replace();
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const postTitle = document.getElementById('postTitle').value;
        const postSlug = document.getElementById('postSlug').value;
        const postContent = document.getElementById('postContent').value;
        const postImageUrl = document.getElementById('postImageUrl').value;
        const userId = session.user.id;

        const postData = {
            title: postTitle,
            slug: postSlug,
            content: postContent,
            image_url: postImageUrl,
            user_id: userId,
        };

        if (currentPostId) {
            const { error } = await supabase.from('posts').update(postData).eq('id', currentPostId);
            if (error) {
                console.error('Error updating post:', error);
            }
        } else {
            const { error } = await supabase.from('posts').insert([postData]);
            if (error) {
                console.error('Error creating post:', error);
            }
        }
        
        crudModal.hide();
        loadPosts();
    };

    const handleDelete = async (e) => {
        const postId = e.target.closest('button').dataset.id;
        if (confirm('Are you sure you want to delete this blog post?')) {
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) {
                console.error('Error deleting post:', error);
            }
            loadPosts();
        }
    };
    
    // --- Pemuatan Data & Event Listeners ---
    const loadPosts = async () => {
        const posts = await fetchPosts();
        renderTable(posts);
    };

    addNewBtn.addEventListener('click', () => {
        crudModalLabel.textContent = 'Add New Post';
        crudForm.reset();
        currentPostId = null;
    });

    crudForm.addEventListener('submit', handleFormSubmit);

    postsTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('.edit-btn, .delete-btn');
        if (!target) return;

        const postId = target.dataset.id;

        if (target.classList.contains('edit-btn')) {
            const { data, error } = await supabase.from('posts').select('*').eq('id', postId).single();
            if (error) {
                console.error('Error fetching post for edit:', error);
                return;
            }

            crudModalLabel.textContent = 'Edit Post';
            document.getElementById('postId').value = data.id;
            document.getElementById('postTitle').value = data.title;
            document.getElementById('postSlug').value = data.slug;
            document.getElementById('postContent').value = data.content;
            document.getElementById('postImageUrl').value = data.image_url;
            currentPostId = data.id;
            crudModal.show();
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

    loadPosts();
});
