// assets/js/blog.js - VERSI FIXED (TANPA FILTER STATUS)
import { getSupabase } from './supabase-client.js';

const supabase = getSupabase();
const POSTS_PER_PAGE = 6;

// Cache System dengan LocalStorage
const cacheManager = {
    get: (key) => {
        try {
            const item = localStorage.getItem(`blog_${key}`);
            if (!item) return null;
            
            const cached = JSON.parse(item);
            if (Date.now() > cached.expiry) {
                localStorage.removeItem(`blog_${key}`);
                return null;
            }
            return cached.data;
        } catch {
            return null;
        }
    },
    
    set: (key, data, ttl = 10 * 60 * 1000) => {
        try {
            const item = {
                data: data,
                expiry: Date.now() + ttl
            };
            localStorage.setItem(`blog_${key}`, JSON.stringify(item));
        } catch (error) {
            console.warn('LocalStorage error:', error);
        }
    }
};

// Memory cache untuk performa
let memoryCache = {};

async function loadBlogPosts() {
    const postsContainer = document.getElementById('posts-container');
    const paginationContainer = document.getElementById('blog-pagination-container');
    
    if (!postsContainer) return;

    // Show loading
    postsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Memuat artikel...</p>
        </div>
    `;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const currentPage = parseInt(urlParams.get('page')) || 1;
        const from = (currentPage - 1) * POSTS_PER_PAGE;

        // Cache key
        const cacheKey = `page_${currentPage}`;
        
        // Check memory cache first
        if (memoryCache[cacheKey]) {
            console.log('Using memory cache for page:', currentPage);
            renderPosts(memoryCache[cacheKey].posts, currentPage, memoryCache[cacheKey].totalPages);
            return;
        }
        
        // Check localStorage cache
        const cachedData = cacheManager.get(cacheKey);
        if (cachedData) {
            console.log('Using localStorage cache for page:', currentPage);
            memoryCache[cacheKey] = cachedData;
            renderPosts(cachedData.posts, currentPage, cachedData.totalPages);
            return;
        }

        // PERBAIKAN: Hapus .eq('status', 'published') - ambil semua posts
        const { count: totalPosts, error: countError } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true });
            // HAPUS: .eq('status', 'published')

        if (countError) throw countError;

        const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

        // PERBAIKAN: Hapus filter status - ambil semua posts
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('*')
            // HAPUS: .eq('status', 'published')
            .order('created_at', { ascending: false })
            .range(from, from + POSTS_PER_PAGE - 1);

        if (postsError) throw postsError;

        // Calculate comment counts
        const postsWithComments = await Promise.all(
            posts.map(async (post) => {
                const { count, error: commentError } = await supabase
                    .from('comments')
                    .select('*', { count: 'exact', head: true })
                    .eq('post_id', post.id);
                
                return {
                    ...post,
                    comment_count: commentError ? 0 : count
                };
            })
        );

        // Cache the results
        const cacheData = {
            posts: postsWithComments,
            totalPages: totalPages,
            timestamp: new Date().toISOString()
        };
        
        memoryCache[cacheKey] = cacheData;
        cacheManager.set(cacheKey, cacheData);

        // Render posts
        renderPosts(postsWithComments, currentPage, totalPages);

    } catch (error) {
        console.error('Error loading blog posts:', error);
        postsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="alert alert-warning">
                    <h5>Gagal memuat artikel</h5>
                    <p>Silakan refresh halaman atau coba lagi nanti.</p>
                    <small class="text-muted">Error: ${error.message}</small>
                </div>
            </div>
        `;
    }
}

function renderPosts(posts, currentPage, totalPages) {
    const postsContainer = document.getElementById('posts-container');
    const paginationContainer = document.getElementById('blog-pagination-container');

    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="alert alert-info">
                    <h5>Belum ada artikel</h5>
                    <p class="mb-0">Tidak ada artikel yang tersedia saat ini.</p>
                </div>
            </div>
        `;
        return;
    }

    // Render posts
    postsContainer.innerHTML = posts.map(post => `
        <div class="col-lg-6 mb-4" data-aos="fade-up">
            <article class="blog-post-card h-100">
                <div class="post-image">
                    <a href="blog-details.html?slug=${post.slug}">
                        <img src="${post.image_url}?tr=w-400,h-250,q-85" 
                             alt="${post.title}" 
                             class="img-fluid"
                             loading="lazy">
                        <div class="post-category">Blog</div>
                    </a>
                </div>
                
                <div class="post-content p-3">
                    <div class="post-meta mb-2">
                        <span class="post-date">
                            <i class="bi bi-calendar me-1"></i>
                            ${formatDate(post.created_at)}
                        </span>
                        <span class="post-comments ms-3">
                            <i class="bi bi-chat me-1"></i>
                            ${post.comment_count || 0}
                        </span>
                    </div>
                    
                    <h3 class="post-title">
                        <a href="blog-details.html?slug=${post.slug}">${post.title}</a>
                    </h3>
                    
                    <p class="post-excerpt">${truncateText(extractTextFromHTML(post.content), 120)}</p>
                    
                    <div class="post-footer d-flex align-items-center justify-content-between">
                        <div class="post-author d-flex align-items-center">
                            <img src="https://ik.imagekit.io/solviXone/ixiera/img/blog/blog-author.jpg?tr=w-40,h-40,q-90" 
                                 alt="Jeffry" 
                                 class="author-avatar rounded-circle">
                            <span class="author-name ms-2">Jeffry</span>
                        </div>
                        <a href="blog-details.html?slug=${post.slug}" class="read-more">
                            Baca Selengkapnya <i class="bi bi-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </article>
        </div>
    `).join('');

    // Render pagination
    renderPagination(currentPage, totalPages);
}

function renderPagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('blog-pagination-container');
    if (!paginationContainer || totalPages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<nav aria-label="Page navigation"><ul class="pagination justify-content-center">';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="?page=${currentPage - 1}" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const isActive = i === currentPage;
        paginationHTML += `
            <li class="page-item ${isActive ? 'active' : ''}">
                <a class="page-link" href="?page=${i}">${i}</a>
            </li>
        `;
    }

    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="?page=${currentPage + 1}" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;
    }

    paginationHTML += '</ul></nav>';
    paginationContainer.innerHTML = paginationHTML;
}

async function loadRecentPosts() {
    const recentPostsContainer = document.getElementById('recent-posts-container');
    if (!recentPostsContainer) return;

    try {
        // Check cache first
        const cachedRecent = cacheManager.get('recent_posts');
        if (cachedRecent) {
            renderRecentPosts(cachedRecent);
            return;
        }

        // PERBAIKAN: Hapus .eq('status', 'published')
        const { data: recentPosts, error } = await supabase
            .from('posts')
            .select('id, title, slug, image_url, created_at')
            // HAPUS: .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        // Cache recent posts
        cacheManager.set('recent_posts', recentPosts, 5 * 60 * 1000);
        
        renderRecentPosts(recentPosts);

    } catch (error) {
        console.error('Error loading recent posts:', error);
        recentPostsContainer.innerHTML = '<p class="text-muted">Gagal memuat artikel terbaru.</p>';
    }
}

function renderRecentPosts(posts) {
    const recentPostsContainer = document.getElementById('recent-posts-container');
    if (!recentPostsContainer) return;

    recentPostsContainer.innerHTML = posts.map(post => `
        <div class="recent-post-item d-flex align-items-center mb-3">
            <div class="recent-post-image flex-shrink-0 me-3">
                <img src="${post.image_url}?tr=w-60,h-60,q-80" 
                     alt="${post.title}" 
                     class="rounded"
                     loading="lazy">
            </div>
            <div class="recent-post-content">
                <h6 class="recent-post-title mb-1">
                    <a href="blog-details.html?slug=${post.slug}">${truncateText(post.title, 50)}</a>
                </h6>
                <small class="text-muted">${formatDate(post.created_at)}</small>
            </div>
        </div>
    `).join('');
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function extractTextFromHTML(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadBlogPosts();
    loadRecentPosts();
    
    // Handle pagination clicks without page reload
    document.addEventListener('click', (e) => {
        if (e.target.closest('.pagination a')) {
            e.preventDefault();
            const url = new URL(e.target.closest('a').href);
            const page = url.searchParams.get('page') || 1;
            
            window.history.pushState({}, '', url);
            loadBlogPosts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    window.addEventListener('popstate', () => {
        loadBlogPosts();
    });
});