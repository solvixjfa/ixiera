// portfolio.js - COMPLETE FIXED VERSION (SEMUA METHOD ADA)
import { getSupabase } from './supabase-client.js';

class PortfolioManager {
    constructor() {
        this.supabase = getSupabase();
        this.projects = [];
        this.currentFilter = '*';
        this.currentSearch = '';
        this.cacheKey = 'ixiera_portfolio_v6';
        this.cacheDuration = 24 * 60 * 60 * 1000;
        this.init();
    }

    async init() {
        console.log('🚀 PortfolioManager starting...');
        await this.loadProjects();
        this.renderPortfolio();
        this.setupEventListeners();
    }

    async loadProjects() {
        console.log('📦 Checking cache...');
        
        // JANGAN hapus loading UI di sini!
        // Biarkan loading UI tetap tampil
        
        const cached = this.getFromCache();
        if (cached && cached.length > 0) {
            console.log(`✅ Loaded ${cached.length} projects from cache`);
            this.projects = cached;
            return;
        }
        
        console.log('🔄 Cache empty, fetching from API...');
        await this.loadFromAPI();
    }

    async loadFromAPI() {
        try {
            console.log('🔗 Connecting to Supabase...');
            
            // Test connection first
            const { data: testData, error: testError } = await this.supabase
                .from('showcase_projects')
                .select('id')
                .limit(1);
            
            if (testError) {
                console.error('❌ Supabase connection failed:', testError);
                throw testError;
            }
            
            console.log('✅ Supabase connection OK');
            
            // Fetch all data
            const { data, error } = await this.supabase
                .from('showcase_projects')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            
            if (error) {
                console.error('❌ Fetch error:', error);
                throw error;
            }
            
            console.log(`📊 API returned ${data?.length || 0} projects`);
            
            if (data && data.length > 0) {
                this.projects = data;
                this.saveToCache(data);
                console.log(`💾 Cached ${data.length} projects`);
            } else {
                console.warn('⚠️ No data from API, using static fallback');
                this.projects = this.getStaticDatabase();
                this.saveToCache(this.projects);
            }
            
        } catch (error) {
            console.error('🔥 API Connection failed:', error.message);
            console.log('🔄 Falling back to static database...');
            this.projects = this.getStaticDatabase();
            this.saveToCache(this.projects);
        }
    }

    // RENDER PORTFOLIO - FIXED VERSION
    renderPortfolio() {
        const container = document.querySelector('.portfolio-grid');
        if (!container) {
            console.error('❌ Portfolio grid not found');
            return;
        }
        
        // 1. CEK JIKA PROJECTS MASIH KOSONG (MASIH LOADING)
        if (!this.projects || this.projects.length === 0) {
            console.log('⏳ Still loading, keep loading spinner...');
            
            // Update loading text jadi lebih informatif
            const loadingText = container.querySelector('.portfolio-loading p');
            if (loadingText) {
                loadingText.textContent = 'Mengambil data terbaru...';
            }
            
            // JANGAN hapus loading, biarkan tetap tampil
            return; // STOP di sini, jangan render apa-apa
        }
        
        // 2. ADA DATA → HAPUS LOADING & RENDER
        console.log(`🎨 Rendering ${this.projects.length} projects...`);
        
        // Hapus loading UI dengan animasi
        const loadingElement = container.querySelector('.portfolio-loading');
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            loadingElement.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                loadingElement.remove();
                this.renderProjects(container);
            }, 500);
        } else {
            this.renderProjects(container);
        }
    }
    
    // METHOD INI YANG SAYA TAMBAH KEMBALI
    renderProjects(container) {
        // Clear container
        container.innerHTML = '';
        
        // Buat fragment untuk performa
        const fragment = document.createDocumentFragment();
        
        // Render semua project
        this.projects.forEach((project, index) => {
            const projectElement = this.createProjectElement(project);
            fragment.appendChild(projectElement);
        });
        
        // Append ke container
        container.appendChild(fragment);
        
        // Apply filter
        this.applyCombinedFilter();
        
        console.log('✅ Portfolio rendered successfully');
    }

    createProjectElement(project) {
        const template = document.createElement('template');
        template.innerHTML = this.createProjectHTML(project);
        return template.content.firstElementChild;
    }

    createProjectHTML(project) {
        const hasResults = project.results && project.results.length > 0;
        const hasLiveDemo = project.live_url && project.live_url !== '#' && project.live_url !== '';
        const painPoints = project.pain_points || [];
        const results = project.results || [];

        return `
        <div class="portfolio-item ${project.category}" data-category="${project.category}" data-id="${project.id}">
            <div class="portfolio-modern-card">
                <div class="portfolio-image-container">
                    <img src="${project.featured_image}" alt="${project.title}" loading="lazy" 
                         onerror="this.src='https://ik.imagekit.io/solviXone/ixiera/img/portfolio/app-1.jpg'">
                    <div class="portfolio-overlay">
                        <div class="text-white">
                            <small class="opacity-80">Klik untuk melihat detail</small>
                        </div>
                    </div>
                </div>
                
                <div class="portfolio-content">
                    <div class="portfolio-category">${this.getCategoryLabel(project.category)}</div>
                    <h3 class="portfolio-title">${project.title}</h3>
                    <p class="portfolio-description">${project.description}</p>
                    
                    ${painPoints.length > 0 ? `
                    <div class="portfolio-problems">
                        <strong>Problem yang diatasi:</strong>
                        <div class="problem-tags">
                            ${painPoints.slice(0, 2).map(problem => `
                                <span class="problem-tag">${problem}</span>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${hasResults ? `
                    <div class="portfolio-results-preview">
                        <strong>Hasil:</strong>
                        <div class="result-tags">
                            ${results.slice(0, 2).map(result => `
                                <span class="result-tag">${result}</span>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="portfolio-actions">
                        ${hasLiveDemo ? `
                        <a href="${project.live_url}" target="_blank" class="btn-portfolio btn-live-demo">
                            <i class="bi bi-play-circle"></i>
                            Live Preview
                        </a>
                        ` : ''}
                        
                        <a href="portfolio-details.html?id=${project.id}" class="btn-portfolio btn-case-study">
                            <i class="bi bi-arrow-right"></i>
                            Case Study
                        </a>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    getCategoryLabel(category) {
        const labels = {
            'filter-ecommerce': 'E-commerce',
            'filter-automation': 'Automation', 
            'filter-sistem': 'Business Systems'
        };
        return labels[category] || 'Project';
    }

    // METHOD INI PENTING UNTUK FALLBACK
    getStaticDatabase() {
        console.log('📄 Loading static database...');
        return [
            {
                id: "39e62e4b-beff-421c-bb50-c078bc293823",
                title: "E-commerce Sneakers",
                description: "E-commerce otomatis dengan dashboard pelanggan, tracking produk, dan chat admin real-time.",
                category: "filter-ecommerce",
                pain_points: ["Kesulitan track progress", "Komunikasi terpisah-pisah", "Waktu habis untuk admin task"],
                results: ["Client satisfaction +70%", "Waktu admin -2 jam/hari", "Project delivery 40% faster"],
                live_url: "https://ecommerce.ixiera.id",
                featured_image: "https://xtarsaurwclktwhhryas.supabase.co/storage/v1/object/public/showcase/e-commerce/ixierazone.jpg",
                sort_order: 1,
                is_active: true
            },
            {
                id: "e24e5d6f-89c0-450c-bb7a-f2d95a0f3778",
                title: "Project Management System",
                description: "Aplikasi berbasis web manajemen project untuk mempermudah pekerjaan dan mengurangi proses manual",
                category: "filter-sistem",
                pain_points: ["Kesulitan track progress project", "Komunikasi terpisah antara email dan chat", "Waktu habis untuk task administratif"],
                results: ["Client satisfaction meningkat 70%", "Waktu admin berkurang 2-3 jam/hari", "Project delivery 40% lebih cepat"],
                live_url: "https://studio.ixiera.id",
                featured_image: "https://xtarsaurwclktwhhryas.supabase.co/storage/v1/object/public/showcase/workspace/workspace.jpg",
                sort_order: 2,
                is_active: true
            },
            {
                id: "bfcd151c-129b-462a-83e9-7df23663c8ee",
                title: "Sistem Booking Villa",
                description: "Website booking villa modern dengan alur pemesanan otomatis dan UI yang simple untuk meningkatkan trust & konversi.",
                category: "filter-automation",
                pain_points: ["Manual booking memakan waktu", "Chat bolak-balik dengan calon tamu", "Tidak ada sistem penjadwalan yang rapi"],
                results: ["Penghematan waktu operasional", "Proses booking lebih cepat & minim error", "Meningkatkan profesionalitas brand villa"],
                live_url: "https://bookingtiketvilla.netlify.app",
                featured_image: "https://ik.imagekit.io/solviXone/images/demo1.jpg",
                sort_order: 4,
                is_active: true
            }
        ];
    }

    // METHOD INI PENTING UNTUK ERROR STATE
    getEmptyState() {
        return `
            <div class="col-12 text-center py-5">
                <div class="empty-state">
                    <i class="bi bi-inbox display-4 text-muted"></i>
                    <h4 class="mt-3">Belum ada project yang ditampilkan</h4>
                    <p class="text-muted">Data sedang dimuat atau tidak tersedia.</p>
                    <button onclick="location.reload()" class="btn btn-primary mt-3">
                        <i class="bi bi-arrow-clockwise"></i> Refresh Halaman
                    </button>
                </div>
            </div>
        `;
    }

    // CACHE METHODS (SAMA)
    getFromCache() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            const timestamp = localStorage.getItem(`${this.cacheKey}_timestamp`);
            if (!cached || !timestamp) {
                console.log('💾 No cache found');
                return null;
            }
            const age = Date.now() - parseInt(timestamp);
            if (age > this.cacheDuration) {
                console.log('💾 Cache expired');
                return null;
            }
            const data = JSON.parse(cached);
            console.log(`💾 Loaded ${data.length} projects from cache`);
            return data;
        } catch (error) {
            console.error('💾 Cache read error:', error);
            return null;
        }
    }

    saveToCache(data) {
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(data));
            localStorage.setItem(`${this.cacheKey}_timestamp`, Date.now().toString());
            console.log(`💾 Saved ${data.length} projects to cache`);
        } catch (error) {
            console.error('💾 Cache write error:', error);
        }
    }

    // SEARCH & FILTER METHODS (SAMA)
    performSearch(query) {
        this.currentSearch = query.toLowerCase().trim();
        this.applyCombinedFilter();
    }

    applyCombinedFilter() {
        const items = document.querySelectorAll('.portfolio-item');
        if (items.length === 0) return;
        
        let visibleCount = 0;
        
        items.forEach((item, index) => {
            const category = item.getAttribute('data-category');
            const title = item.querySelector('.portfolio-title').textContent.toLowerCase();
            const description = item.querySelector('.portfolio-description').textContent.toLowerCase();
            
            const categoryMatch = this.currentFilter === '*' || category === this.currentFilter;
            const searchMatch = !this.currentSearch || 
                               title.includes(this.currentSearch) || 
                               description.includes(this.currentSearch);
            
            if (categoryMatch && searchMatch) {
                visibleCount++;
                item.style.display = 'block';
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'scale(1)';
                }, index * 50);
            } else {
                item.style.opacity = '0';
                item.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    item.style.display = 'none';
                }, 300);
            }
        });
        
        this.showResultsCount(visibleCount);
    }

    showResultsCount(count) {
        let counter = document.getElementById('results-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.id = 'results-counter';
            counter.className = 'results-counter';
            const filters = document.querySelector('.portfolio-filters-modern');
            if (filters) filters.after(counter);
        }
        
        if (this.currentSearch) {
            counter.innerHTML = `<div class="text-muted mt-2">Menampilkan ${count} project</div>`;
            counter.style.display = 'block';
        } else {
            counter.style.display = 'none';
        }
    }

    // EVENT LISTENERS (SAMA)
    setupEventListeners() {
        document.querySelectorAll('.filter-btn-modern').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = button.getAttribute('data-filter');
                this.handleFilter(filter, button);
            });
        });

        const searchInput = document.getElementById('portfolio-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch(e.target.value);
                }
            });
        }
    }

    handleFilter(filter, clickedButton) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.filter-btn-modern').forEach(btn => {
            btn.classList.remove('filter-active');
        });
        clickedButton.classList.add('filter-active');
        
        this.applyCombinedFilter();
    }

    // STATIC METHOD FOR DETAILS PAGE
    static async getProjectDetails(projectId) {
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('showcase_projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error:', error);
            
            // Fallback ke static database
            const portfolioManager = new PortfolioManager();
            const staticProjects = portfolioManager.getStaticDatabase();
            return staticProjects.find(p => p.id === projectId) || null;
        }
    }
}

// Initialize
if (document.querySelector('.portfolio-page')) {
    document.addEventListener('DOMContentLoaded', () => {
        new PortfolioManager();
    });
}

export { PortfolioManager };