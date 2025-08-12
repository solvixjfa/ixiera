import { supabase } from './supabase-client.js';

// --- FUNGSI-FUNGSI BARU UNTUK KOMENTAR ---

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
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching comments:', error);
        return;
    }

    commentsCount.textContent = `${count} Comment${count !== 1 ? 's' : ''}`;
    commentsList.innerHTML = ''; // Kosongkan daftar sebelum diisi

    if (comments.length > 0) {
        comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment';
            commentEl.innerHTML = `
                <div class="d-flex">
                    <div class="comment-img"><i class="bi bi-person-circle fs-2"></i></div>
                    <div>
                        <h5>${comment.author_name}</h5>
                        <time datetime="${comment.created_at}">${new Date(comment.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                        <p>${comment.content}</p>
                    </div>
                </div>
            `;
            commentsList.appendChild(commentEl);
        });
    }
}

/**
 * Menangani pengiriman form komentar baru.
 * @param {number} postId - ID dari artikel saat ini.
 */
function handleCommentSubmit(postId) {
    const form = document.getElementById('comment-form');
    const status = document.getElementById('comment-status');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const author_name = formData.get('name').trim();
        const content = formData.get('comment').trim();
        const honeypot = formData.get('website_url');

        // Filter Spam Honeypot
        if (honeypot) {
            console.log('Spam attempt detected.');
            return;
        }

        if (!author_name || !content) {
            status.innerHTML = `<p class="text-danger">Nama dan Komentar wajib diisi.</p>`;
            return;
        }

        status.innerHTML = `<p class="text-muted">Mengirim komentar...</p>`;

        const { error } = await supabase
            .from('comments')
            .insert({ post_id, author_name, content });

        if (error) {
            status.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
        } else {
            status.innerHTML = `<p class="text-success">Komentar berhasil dikirim!</p>`;
            form.reset();
            // Muat ulang komentar untuk menampilkan yang baru
            loadComments(postId); 
        }
    });
}

// --- FUNGSI UTAMA (DIMODIFIKASI) ---

/**
 * Memuat konten artikel dan kemudian memuat komentarnya.
 */
async function loadBlogPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postSlug = urlParams.get('slug');
    const articleContainer = document.getElementById('article-container');

    if (!articleContainer || !postSlug) {
        if (articleContainer) articleContainer.innerHTML = '<p class="text-center text-danger">Artikel tidak ditemukan.</p>';
        return;
    }

    try {
        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('slug', postSlug)
            .single();

        if (error || !post) throw new Error('Artikel tidak ditemukan atau gagal dimuat.');

        // ... (Logika mengisi artikel tetap sama seperti sebelumnya) ...
        
        // [PENTING] Setelah artikel berhasil dimuat, kita panggil fungsi untuk komentar
        loadComments(post.id);
        handleCommentSubmit(post.id);

    } catch (error) {
        console.error('Error fetching post:', error);
        articleContainer.innerHTML = `<p class="text-center text-danger">${error.message}</p>`;
    }
}

// Jalankan fungsi utama saat halaman dimuat
document.addEventListener('DOMContentLoaded', loadBlogPost);

