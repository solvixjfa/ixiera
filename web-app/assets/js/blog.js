// assets/js/blog.js - VERSI LENGKAP TANPA TAMBAH KOLOM
import { getSupabase } from './supabase-client.js';

const supabase = getSupabase();
const POSTS_PER_PAGE = 6;

// Global variables
let currentSearchQuery = '';
let isSearching = false;
let currentCategory = '';

// Cache System
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

// Main function to load blog posts
async function loadBlogPosts(page = 1) {
    const postsContainer = document.getElementById('posts-container');
    const searchResultsInfo = document.getElementById('search-results-info');
    
    if (!postsContainer) return;

    // Hide search results info for normal loading
    if (searchResultsInfo) {
        searchResultsInfo.style.display = 'none';
    }

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
        const currentPage = parseInt(urlParams.get('page')) || page;
        const from = (currentPage - 1) * POSTS_PER_PAGE;

        // Cache key
        const cacheKey = `page_${currentPage}_${currentCategory}`;
        
        // Check memory cache first
        if (memoryCache[cacheKey]) {
            renderPosts(memoryCache[cacheKey].posts, currentPage, memoryCache[cacheKey].totalPages);
            return;
        }
        
        // Check localStorage cache
        const cachedData = cacheManager.get(cacheKey);
        if (cachedData) {
            memoryCache[cacheKey] = cachedData;
            renderPosts(cachedData.posts, currentPage, cachedData.totalPages);
            return;
        }

        // Get total count
        const { count: totalPosts, error: countError } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

        // Get posts data
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, from + POSTS_PER_PAGE - 1);

        if (postsError) throw postsError;

        // Calculate comment counts dan read time
        const postsWithDetails = await Promise.all(
            posts.map(async (post) => {
                const { count, error: commentError } = await supabase
                    .from('comments')
                    .select('*', { count: 'exact', head: true })
                    .eq('post_id', post.id);
                
                return {
                    ...post,
                    comment_count: commentError ? 0 : count,
                    read_time: calculateReadTime(post.content),
                    excerpt: generateExcerpt(post.content)
                };
            })
        );

        // Cache the results
        const cacheData = {
            posts: postsWithDetails,
            totalPages: totalPages,
            timestamp: new Date().toISOString()
        };
        
        memoryCache[cacheKey] = cacheData;
        cacheManager.set(cacheKey, cacheData);

        // Render posts
        renderPosts(postsWithDetails, currentPage, totalPages);

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

// Search functionality
function initSearch() {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const searchSuggestions = document.getElementById('search-suggestions');

    if (!searchForm || !searchInput) return;

    // Handle form submission
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            performSearch(query);
        }
    });

    // Real-time search suggestions
    searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            searchSuggestions.innerHTML = '';
            searchSuggestions.style.display = 'none';
            return;
        }

        try {
            const suggestions = await getSearchSuggestions(query);
            showSearchSuggestions(suggestions, query);
        } catch (error) {
            console.error('Error getting suggestions:', error);
        }
    }, 300));

    // Clear search
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchForm.contains(e.target)) {
            searchSuggestions.style.display = 'none';
        }
    });

    // Handle suggestion clicks
    searchSuggestions.addEventListener('click', (e) => {
        if (e.target.classList.contains('suggestion-item')) {
            const slug = e.target.dataset.slug;
            window.location.href = `blog-details.html?slug=${slug}`;
        }
    });
}

// Perform search - VERSI SIMPLE TANPA KOLOM TAMBAHAN
async function performSearch(query, page = 1) {
    currentSearchQuery = query;
    isSearching = true;

    const postsContainer = document.getElementById('posts-container');
    const searchResultsInfo = document.getElementById('search-results-info');
    const searchQueryDisplay = document.getElementById('search-query-display');
    const searchInput = document.getElementById('search-input');

    // Update URL without reload
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('search', query);
    if (page > 1) {
        newUrl.searchParams.set('page', page);
    } else {
        newUrl.searchParams.delete('page');
    }
    window.history.pushState({}, '', newUrl);

    // Show search info
    if (searchResultsInfo && searchQueryDisplay) {
        searchResultsInfo.style.display = 'block';
        searchQueryDisplay.textContent = `Hasil pencarian untuk: "${query}"`;
    }

    // Update search input
    if (searchInput) {
        searchInput.value = query;
    }

    // Show loading
    postsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Mencari artikel...</p>
        </div>
    `;

    try {
        const from = (page - 1) * POSTS_PER_PAGE;

        // GET ALL POSTS - lalu filter di JavaScript
        const { data: allPosts, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // SIMPLE SEARCH - filter di JavaScript
        const filteredPosts = allPosts.filter(post => 
            post.title.toLowerCase().includes(query.toLowerCase()) ||
            extractTextFromHTML(post.content).toLowerCase().includes(query.toLowerCase())
        );

        // Pagination manual
        const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
        const startIndex = from;
        const endIndex = startIndex + POSTS_PER_PAGE;
        const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

        // Calculate details untuk posts yang difilter
        const postsWithDetails = await Promise.all(
            paginatedPosts.map(async (post) => {
                const { count: commentCount } = await supabase
                    .from('comments')
                    .select('*', { count: 'exact', head: true })
                    .eq('post_id', post.id);
                
                return {
                    ...post,
                    comment_count: commentCount || 0,
                    read_time: calculateReadTime(post.content),
                    excerpt: generateExcerpt(post.content)
                };
            })
        );

        renderPosts(postsWithDetails, page, totalPages, true);

    } catch (error) {
        console.error('Search error:', error);
        postsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="alert alert-warning">
                    <h5>Gagal melakukan pencarian</h5>
                    <p>Silakan coba dengan kata kunci lain.</p>
                    <small class="text-muted">Error: ${error.message}</small>
                </div>
            </div>
        `;
    }
}

// Get search suggestions - VERSI SIMPLE
async function getSearchSuggestions(query) {
    const { data: allPosts, error } = await supabase
        .from('posts')
        .select('title, slug, content')
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter suggestions di JavaScript
    const suggestions = allPosts.filter(post => 
        post.title.toLowerCase().includes(query.toLowerCase()) ||
        extractTextFromHTML(post.content).toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5); // Limit to 5 suggestions

    return suggestions.map(post => ({
        title: post.title,
        slug: post.slug
    }));
}

// Show search suggestions
function showSearchSuggestions(suggestions, query) {
    const searchSuggestions = document.getElementById('search-suggestions');
    if (!searchSuggestions) return;

    if (suggestions.length === 0) {
        searchSuggestions.innerHTML = '<div class="suggestion-item">Tidak ada hasil</div>';
    } else {
        searchSuggestions.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" data-slug="${suggestion.slug}">
                <i class="bi bi-file-text me-2"></i>
                ${highlightText(suggestion.title, query)}
            </div>
        `).join('');
    }

    searchSuggestions.style.display = 'block';
}

// Clear search
function clearSearch() {
    currentSearchQuery = '';
    isSearching = false;
    
    const searchInput = document.getElementById('search-input');
    const searchResultsInfo = document.getElementById('search-results-info');
    const searchSuggestions = document.getElementById('search-suggestions');

    if (searchInput) searchInput.value = '';
    if (searchResultsInfo) searchResultsInfo.style.display = 'none';
    if (searchSuggestions) {
        searchSuggestions.innerHTML = '';
        searchSuggestions.style.display = 'none';
    }

    // Update URL
    const newUrl = new URL(window.location);
    newUrl.searchParams.delete('search');
    newUrl.searchParams.delete('page');
    window.history.pushState({}, '', newUrl);

    loadBlogPosts(); // Reload normal posts
}

// Category filtering
function initCategoryFilter() {
    const categoryLinks = document.querySelectorAll('[data-category]');
    
    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = e.target.closest('[data-category]').dataset.category;
            currentCategory = category;
            
            // Update active state
            categoryLinks.forEach(l => l.classList.remove('active'));
            e.target.closest('[data-category]').classList.add('active');
            
            loadBlogPosts(1);
        });
    });
}

// Render posts
function renderPosts(posts, currentPage, totalPages, isSearch = false) {
    const postsContainer = document.getElementById('posts-container');
    const paginationContainer = document.getElementById('blog-pagination-container');

    if (!posts || posts.length === 0) {
        const message = isSearch ? 
            'Tidak ada artikel yang sesuai dengan pencarian Anda.' : 
            'Belum ada artikel yang tersedia saat ini.';
        
        postsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="alert alert-info">
                    <h5>${isSearch ? 'Hasil Pencarian' : 'Belum ada artikel'}</h5>
                    <p class="mb-0">${message}</p>
                    ${isSearch ? '<button class="btn btn-primary mt-2" onclick="clearSearch()">Tampilkan Semua Artikel</button>' : ''}
                </div>
            </div>
        `;
        paginationContainer.innerHTML = '';
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
                        <span class="post-read-time ms-3">
                            <i class="bi bi-clock me-1"></i>
                            ${post.read_time} min read
                        </span>
                        <span class="post-comments ms-3">
                            <i class="bi bi-chat me-1"></i>
                            ${post.comment_count || 0}
                        </span>
                    </div>
                    
                    <h3 class="post-title">
                        <a href="blog-details.html?slug=${post.slug}">${isSearch ? highlightText(post.title, currentSearchQuery) : post.title}</a>
                    </h3>
                    
                    <p class="post-excerpt">${post.excerpt}</p>
                    
                    <div class="post-footer d-flex align-items-center justify-content-between">
                        <div class="post-author d-flex align-items-center">
                            <img src="https://ik.imagekit.io/solviXone/ixiera/img/blog/blog-author.jpg?tr=w-40,h-40,q-90" 
                                 alt="Ixiera Team" 
                                 class="author-avatar rounded-circle">
                            <span class="author-name ms-2">Ixiera Team</span>
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
    if (isSearch) {
        renderSearchPagination(currentPage, totalPages);
    } else {
        renderPagination(currentPage, totalPages);
    }
}

// Pagination for normal posts
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
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
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

// Pagination for search results
function renderSearchPagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('blog-pagination-container');
    if (!paginationContainer || totalPages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<nav aria-label="Search results pagination"><ul class="pagination justify-content-center">';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link search-page-link" href="javascript:void(0)" data-page="${currentPage - 1}" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;
    }

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        paginationHTML += `
            <li class="page-item ${isActive ? 'active' : ''}">
                <a class="page-link search-page-link" href="javascript:void(0)" data-page="${i}">${i}</a>
            </li>
        `;
    }

    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link search-page-link" href="javascript:void(0)" data-page="${currentPage + 1}" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;
    }

    paginationHTML += '</ul></nav>';
    paginationContainer.innerHTML = paginationHTML;

    // Add event listeners for search pagination
    document.querySelectorAll('.search-page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.closest('.search-page-link').dataset.page);
            performSearch(currentSearchQuery, page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// Recent posts
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

        const { data: recentPosts, error } = await supabase
            .from('posts')
            .select('id, title, slug, image_url, created_at')
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

function calculateReadTime(content) {
    if (!content) return 5;
    const wordsPerMinute = 200;
    const text = extractTextFromHTML(content);
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
}

function generateExcerpt(content, maxLength = 120) {
    if (!content) return '';
    const text = extractTextFromHTML(content);
    return truncateText(text, maxLength);
}

function highlightText(text, query) {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const pageParam = urlParams.get('page');
    
    if (searchParam) {
        // Load search results
        document.getElementById('search-input').value = searchParam;
        performSearch(searchParam, parseInt(pageParam) || 1);
    } else {
        // Load normal posts
        loadBlogPosts(parseInt(pageParam) || 1);
    }
    
    loadRecentPosts();
    initSearch();
    initCategoryFilter();
    
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        
        if (searchParam) {
            document.getElementById('search-input').value = searchParam;
            performSearch(searchParam);
        } else {
            clearSearch();
        }
    });
});

// Make functions available globally for onclick handlers
window.performSearch = performSearch;
window.clearSearch = clearSearch;