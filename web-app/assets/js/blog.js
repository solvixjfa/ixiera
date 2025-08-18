// [PERBAIKAN] Impor fungsi 'getSupabase', bukan variabel 'supabase'
import { getSupabase } from './supabase-client.js';

// [PERBAIKAN] Panggil fungsi untuk mendapatkan koneksi Supabase
const supabase = getSupabase();

// --- PENGATURAN ---
const POSTS_PER_PAGE = 6;

// --- ELEMEN DOM ---
const postsContainer = document.getElementById('posts-container');
const paginationContainer = document.getElementById('blog-pagination-container');
const recentPostsContainer = document.getElementById('recent-posts-container');

// --- FUNGSI-FUNGSI ---
// (Tidak ada perubahan sama sekali di dalam semua fungsi di bawah ini)

function renderPagination(currentPage, totalPages) {
    if (!paginationContainer || totalPages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }
    let paginationHTML = '<ul>';
    if (currentPage > 1) {
        paginationHTML += `<li><a href="?page=${currentPage - 1}" title="Previous"><i class="bi bi-chevron-left"></i></a></li>`;
    }
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `<li class="${i === currentPage ? 'active' : ''}"><a href="?page=${i}">${i}</a></li>`;
    }
    if (currentPage < totalPages) {
        paginationHTML += `<li><a href="?page=${currentPage + 1}" title="Next"><i class="bi bi-chevron-right"></i></a></li>`;
    }
    paginationHTML += '</ul>';
    paginationContainer.innerHTML = paginationHTML;
}

async function loadBlogPosts() {
    if (!postsContainer) return;
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = parseInt(urlParams.get('page')) || 1;
    postsContainer.innerHTML = '<p class="text-center">Memuat artikel terbaru...</p>';
    if (paginationContainer) paginationContainer.innerHTML = '';

    try {
        const { count: totalPosts, error: countError } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true });
        if (countError) throw new Error(`Gagal menghitung total post: ${countError.message}`);

        const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
        const from = (currentPage - 1) * POSTS_PER_PAGE;

        const { data: posts, error: rpcError } = await supabase.rpc('get_posts_with_comment_count', {
            page_size: POSTS_PER_PAGE,
            page_offset: from
        });
        if (rpcError) throw new Error(`Gagal memanggil RPC: ${rpcError.message}`);
        if (!Array.isArray(posts)) throw new Error("Data RPC tidak valid.");

        postsContainer.innerHTML = '';
        if (posts.length === 0) {
            postsContainer.innerHTML = '<p class="text-center">Belum ada artikel yang dipublikasikan.</p>';
            return;
        }

        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'col-lg-6';
            postElement.innerHTML = `
                <article class="d-flex flex-column h-100">
                    <div class="post-img"><a href="blog-details.html?slug=${post.slug}"><img src="${post.image_url}?tr=w-400,q-85" alt="Gambar thumbnail untuk ${post.title}" class="img-fluid"></a></div>
                    <h2 class="title"><a href="blog-details.html?slug=${post.slug}">${post.title}</a></h2>
                    <div class="d-flex align-items-center mt-auto">
                        <img src="https://ik.imagekit.io/solviXone/ixiera/img/blog/blog-author.jpg?tr=w-40,h-40,q-90" alt="Foto Jeffry" class="img-fluid post-author-img flex-shrink-0">
                        <div class="post-meta">
                            <p class="post-author mb-0">Jeffry</p>
                            <p class="post-date mb-0 d-flex align-items-center">
                                <time datetime="${post.created_at}">${new Date(post.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                                <span class="ms-3 d-flex align-items-center"><i class="bi bi-chat-dots me-1"></i> ${post.comment_count || 0}</span>
                            </p>
                        </div>
                    </div>
                </article>
            `;
            postsContainer.appendChild(postElement);
        });
        renderPagination(currentPage, totalPages);
    } catch (error) {
        console.error('Terjadi kesalahan saat memuat post:', error);
        postsContainer.innerHTML = `<p class="text-center text-danger">Gagal memuat artikel.</p>`;
    }
}

async function loadRecentPosts() {
    if (!recentPostsContainer) return;
    try {
        const { data: recentPosts, error } = await supabase
            .from('posts')
            .select('title, slug, image_url, created_at')
            .order('created_at', { ascending: false })
            .limit(3);
        if (error) throw error;
        recentPostsContainer.innerHTML = '';
        recentPosts.forEach(post => {
            const postItem = document.createElement('div');
            postItem.className = 'post-item';
            postItem.innerHTML = `
                <img src="${post.image_url}?tr=w-100,q-80" alt="Thumbnail untuk ${post.title}" class="flex-shrink-0">
                <div>
                    <h4><a href="blog-details.html?slug=${post.slug}">${post.title}</a></h4>
                    <time datetime="${post.created_at}">${new Date(post.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                </div>
            `;
            recentPostsContainer.appendChild(postItem);
        });
    } catch (error) {
        console.error('Error fetching recent posts:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadBlogPosts();
    loadRecentPosts();
});

