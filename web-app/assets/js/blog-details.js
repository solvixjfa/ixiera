import { supabase } from './supabase-client.js';

// --- FUNGSI-FUNGSI UNTUK KOMENTAR ---

/**
 * Menampilkan daftar komentar untuk sebuah artikel.
 * @param {number} postId - ID dari artikel saat ini.
 */
async function loadComments(postId) {
    const commentsList = document.getElementById('comments-list');
    const commentsCount = document.getElementById('comments-count');
    if (!commentsList || !commentsCount) return;

    const { data: comments, error, count } = await supabase
        .from('comments')
        .select('*', { count: 'exact' })
        .eq('post_id', postId)
        .order('created_at', { ascending: true }); // Tampilkan dari yang terlama ke terbaru

    if (error) {
        console.error('Error fetching comments:', error);
        return;
    }

    commentsCount.textContent = `${count} Komentar`;
    commentsList.innerHTML = ''; 

    if (comments.length > 0) {
        comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment mb-4';
            commentEl.innerHTML = `
                <div class="d-flex">
                    <div class="comment-img me-3"><i class="bi bi-person-circle fs-2 text-secondary"></i></div>
                    <div>
                        <h5>${comment.author_name}</h5>
                        <time datetime="${comment.created_at}" class="text-muted small">${new Date(comment.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                        <p class="mt-2">${comment.content}</p>
                    </div>
                </div>
            `;
            commentsList.appendChild(commentEl);
        });
    } else {
        commentsList.innerHTML = '<p class="text-muted">Jadilah yang pertama berkomentar!</p>';
    }
}

/**
 * Menangani pengiriman form komentar baru.
 * @param {number} postId - ID dari artikel saat ini.
 */
function handleCommentSubmit(postId) {
    const form = document.getElementById('comment-form');
    const status = document.getElementById('comment-status');
    const submitButton = form.querySelector('button[type="submit"]');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mengirim...`;

        const formData = new FormData(form);
        const author_name = formData.get('name').trim();
        const content = formData.get('comment').trim();
        const honeypot = formData.get('honeypot');

        if (honeypot) {
            console.log('Spam attempt detected.');
            return; 
        }

        if (!author_name || !content) {
            status.innerHTML = `<p class="text-danger">Nama dan Komentar wajib diisi.</p>`;
            submitButton.disabled = false;
            submitButton.textContent = 'Kirim Komentar';
            return;
        }

        const { error } = await supabase
            .from('comments')
            .insert({ post_id, author_name, content });

        if (error) {
            status.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
        } else {
            status.innerHTML = `<p class="text-success">Komentar berhasil dikirim!</p>`;
            form.reset();
            await loadComments(postId); 
        }
        
        submitButton.disabled = false;
        submitButton.textContent = 'Kirim Komentar';
    });
}

// --- FUNGSI UTAMA ---
async function loadBlogPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postSlug = urlParams.get('slug');
    const articleContainer = document.getElementById('article-container');

    if (!articleContainer || !postSlug) {
        if (articleContainer) articleContainer.innerHTML = '<p class="text-center text-danger">Artikel tidak ditemukan.</p>';
        return;
    }

    try {
        const { data: post, error } = await supabase.from('posts').select('*').eq('slug', postSlug).single();
        if (error || !post) throw new Error('Artikel tidak ditemukan atau gagal dimuat.');

        // Hapus efek skeleton loading
        const placeholders = document.querySelectorAll('.placeholder');
        placeholders.forEach(el => el.classList.remove('placeholder'));
        const placeholderGlows = document.querySelectorAll('.placeholder-glow');
        placeholderGlows.forEach(el => el.classList.remove('placeholder-glow'));

        // Isi data artikel
        document.title = `${post.title} - Ixiera Blog`;
        document.getElementById('breadcrumb-title').textContent = post.title;
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-image').src = `${post.image_url}?tr=w-800,q-85`;
        document.getElementById('post-image').alt = `Gambar utama untuk artikel ${post.title}`;
        document.getElementById('post-content').innerHTML = post.content;

        const postDateEl = document.getElementById('post-date');
        postDateEl.textContent = new Date(post.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        postDateEl.dateTime = post.created_at;

        const words = post.content.split(/\s+/).length;
        const readingTime = Math.ceil(words / 200);
        document.getElementById('post-reading-time').textContent = `${readingTime} min read`;

        // Panggil fungsi untuk komentar
        loadComments(post.id);
        handleCommentSubmit(post.id);

    } catch (error) {
        console.error('Error fetching post:', error);
        articleContainer.innerHTML = `<div class="alert alert-danger"><strong>Terjadi Kesalahan:</strong> ${error.message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', loadBlogPost);

