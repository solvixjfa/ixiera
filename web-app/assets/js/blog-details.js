// assets/js/blog-details.js - VERSI FIXED (SEMUA KOMENTAR LANGSUNG MUNCUL)
import { getSupabase } from './supabase-client.js';
const supabase = getSupabase();

let currentPostId = null;

async function loadBlogPost() {
    const articleContainer = document.getElementById('article-container');
    if (!articleContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const postSlug = urlParams.get('slug');

    if (!postSlug) {
        showError('Artikel tidak ditemukan.');
        return;
    }

    showLoading();

    try {
        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('slug', postSlug)
            .single();

        if (error) throw error;

        renderPost(post);
        currentPostId = post.id;
        loadComments(post.id);
        handleCommentSubmit(post.id);

    } catch (error) {
        console.error('Error:', error);
        showError('Artikel tidak ditemukan.');
    }
}

async function loadComments(postId) {
    const commentsList = document.getElementById('comments-list');
    const commentsCount = document.getElementById('comments-count');
    if (!commentsList || !commentsCount) return;

    try {
        // PERBAIKAN: HAPUS FILTER STATUS - semua komentar langsung muncul
        const { data: comments, error, count } = await supabase
            .from('comments')
            .select('*', { count: 'exact' })
            .eq('post_id', postId)
            // TIDAK ADA FILTER STATUS - SEMUA KOMENTAR DITAMPILKAN
            .order('created_at', { ascending: true });

        if (error) throw error;

        commentsCount.textContent = `${count || 0} Komentar`;
        commentsList.innerHTML = '';
        
        if (comments && comments.length > 0) {
            comments.forEach(comment => {
                const commentEl = document.createElement('div');
                commentEl.className = 'comment mb-4';
                commentEl.innerHTML = `
                    <div class="d-flex">
                        <div class="comment-img me-3">
                            <i class="bi bi-person-circle fs-2 text-secondary"></i>
                        </div>
                        <div>
                            <h5>${escapeHtml(comment.author_name)}</h5>
                            <time datetime="${comment.created_at}" class="text-muted small">
                                ${new Date(comment.created_at).toLocaleString('id-ID', {
                                    day: 'numeric',
                                    month: 'long', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </time>
                            <p class="mt-2">${escapeHtml(comment.content).replace(/\n/g, '<br>')}</p>
                        </div>
                    </div>
                `;
                commentsList.appendChild(commentEl);
            });
        } else {
            commentsList.innerHTML = '<p class="text-muted">Jadilah yang pertama berkomentar!</p>';
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsList.innerHTML = '<p class="text-danger">Gagal memuat komentar.</p>';
    }
}

function handleCommentSubmit(postId) {
    const form = document.getElementById('comment-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = form.querySelector('button[type="submit"]');
        const status = document.getElementById('comment-status');
        
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Mengirim...`;
        status.innerHTML = '';
        
        try {
            const formData = new FormData(form);
            const author_name = formData.get('name')?.trim();
            const content = formData.get('comment')?.trim();
            const honeypot = formData.get('honeypot');

            // Honeypot check
            if (honeypot) throw new Error('Spam detected');

            // Validation
            if (!author_name || !content) throw new Error('Nama dan komentar wajib diisi');
            if (content.length < 5) throw new Error('Komentar terlalu pendek');

            // PERBAIKAN: Insert tanpa status field - biarkan default atau kosong
            const { error } = await supabase
                .from('comments')
                .insert({ 
                    post_id: postId, 
                    author_name, 
                    content
                    // TIDAK ADA STATUS FIELD - biarkan database handle default value
                });

            if (error) throw error;

            status.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle"></i>
                    Komentar berhasil dikirim!
                </div>
            `;
            
            form.reset();
            
            // Refresh comments list immediately
            setTimeout(() => loadComments(postId), 500);
            
        } catch (error) {
            console.error('Error submitting comment:', error);
            status.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-circle"></i>
                    ${error.message || 'Gagal mengirim komentar. Silakan coba lagi.'}
                </div>
            `;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Kirim Komentar';
        }
    });
}

// Real-time comments subscription (optional)
function subscribeToComments(postId) {
    const subscription = supabase
        .channel(`comments:post_${postId}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'comments',
            filter: `post_id=eq.${postId}`
        }, (payload) => {
            console.log('New comment received:', payload);
            loadComments(postId); // Auto-refresh when new comment added
        })
        .subscribe((status) => {
            console.log('Comment subscription:', status);
        });
    
    return subscription;
}

// UI Helper functions
function showLoading() {
    const loading = document.getElementById('loading-state');
    const content = document.getElementById('post-content');
    const error = document.getElementById('error-state');
    
    if (loading) loading.style.display = 'block';
    if (content) content.style.display = 'none';
    if (error) error.style.display = 'none';
}

function showContent() {
    const loading = document.getElementById('loading-state');
    const content = document.getElementById('post-content');
    const error = document.getElementById('error-state');
    
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
    if (error) error.style.display = 'none';
}

function showError(message) {
    const loading = document.getElementById('loading-state');
    const content = document.getElementById('post-content');
    const error = document.getElementById('error-state');
    
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'none';
    if (error) {
        error.style.display = 'block';
        error.innerHTML = `
            <div class="alert alert-danger text-center">
                <h5>Gagal Memuat Artikel</h5>
                <p class="mb-0">${message}</p>
            </div>
        `;
    }
}

function renderPost(post) {
    // Update page metadata
    document.title = `${post.title} - Ixiera Blog`;
    
    // Update breadcrumb
    const breadcrumbTitle = document.getElementById('breadcrumb-title');
    if (breadcrumbTitle) breadcrumbTitle.textContent = post.title;

    // Update post content
    const postTitle = document.getElementById('post-title');
    const postImage = document.getElementById('post-image');
    const postDate = document.getElementById('post-date');
    const postContent = document.getElementById('post-content');
    const readingTime = document.getElementById('post-reading-time');

    if (postTitle) postTitle.textContent = post.title;
    if (postImage) {
        postImage.src = `${post.image_url}?tr=w-800,q-85`;
        postImage.alt = `Gambar utama untuk artikel: ${post.title}`;
    }
    if (postDate) {
        postDate.textContent = formatDate(post.created_at);
        postDate.datetime = post.created_at;
    }
    if (postContent) postContent.innerHTML = post.content;
    if (readingTime) {
        readingTime.textContent = calculateReadingTime(post.content);
    }

    // Show content
    showContent();
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function calculateReadingTime(content) {
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} menit membaca`;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadBlogPost();
});