// [PERBAIKAN] Impor dan panggil fungsi getSupabase
import { getSupabase } from './supabase-client.js';
const supabase = getSupabase();

// --- FUNGSI-FUNGSI UNTUK KOMENTAR ---

async function loadComments(postId) {
    const commentsList = document.getElementById('comments-list');
    const commentsCount = document.getElementById('comments-count');
    if (!commentsList || !commentsCount) return;

    try {
        const { data: comments, error, count } = await supabase
            .from('comments')
            .select('*', { count: 'exact' })
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) throw error;
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
                            <time datetime="${comment.created_at}" class="text-muted small">${new Date(comment.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                            <p class="mt-2">${comment.content.replace(/\n/g, '<br>')}</p>
                        </div>
                    </div>
                `;
                commentsList.appendChild(commentEl);
            });
        } else {
            commentsList.innerHTML = '<p class="text-muted">Jadilah yang pertama berkomentar!</p>';
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
        commentsList.innerHTML = '<p class="text-danger">Gagal memuat komentar.</p>';
    }
}

function handleCommentSubmit(postId) {
    const form = document.getElementById('comment-form');
    if (!form) return;
    const status = document.getElementById('comment-status');
    const submitButton = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mengirim...`;
        status.innerHTML = '';
        const formData = new FormData(form);
        const author_name = formData.get('name').trim();
        const content = formData.get('comment').trim();
        if (!author_name || !content) {
            status.innerHTML = `<p class="text-danger">Nama dan Komentar wajib diisi.</p>`;
            submitButton.disabled = false;
            submitButton.textContent = 'Kirim Komentar';
            return;
        }
        try {
            const { error } = await supabase
                .from('comments')
                .insert({ post_id: postId, author_name, content });
            if (error) throw error;
            status.innerHTML = `<p class="text-success">Komentar berhasil dikirim!</p>`;
            form.reset();
        } catch (error) {
            console.error('Error submitting comment:', error);
            status.innerHTML = `<p class="text-danger">Gagal mengirim komentar: ${error.message}</p>`;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Kirim Komentar';
        }
    });
}

function subscribeToComments(postId) {
    const subscription = supabase
        .channel(`public:comments:post_id=eq.${postId}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'comments',
            filter: `post_id=eq.${postId}`
        }, (payload) => {
            loadComments(postId);
        })
        .subscribe();
    return subscription;
}

// --- FUNGSI UTAMA ---
async function loadBlogPost() {
    const articleContainer = document.getElementById('article-container');
    if (!articleContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const postSlug = urlParams.get('slug');

    if (!postSlug) {
        articleContainer.innerHTML = '<p class="text-center text-danger">Artikel tidak valid atau URL salah.</p>';
        return;
    }

    try {
        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('slug', postSlug)
            .single();

        if (error) throw error;

        document.title = `${post.title} - Ixiera Blog`;
        document.getElementById('breadcrumb-title').textContent = post.title;
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-image').src = `${post.image_url}?tr=w-800,q-85`;
        document.getElementById('post-image').alt = `Gambar utama untuk artikel ${post.title}`;
        document.getElementById('post-content').innerHTML = post.content;
        
        const postDateEl = document.getElementById('post-date');
        postDateEl.textContent = new Date(post.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        postDateEl.dateTime = post.created_at;

        loadComments(post.id);
        handleCommentSubmit(post.id);
        subscribeToComments(post.id);

    } catch (error) {
        console.error('Gagal memuat artikel:', error);
        articleContainer.innerHTML = `<div class="alert alert-danger text-center"><strong>Terjadi Kesalahan:</strong> Artikel tidak dapat ditemukan.</div>`;
    }
}

document.addEventListener('DOMContentLoaded', loadBlogPost);

