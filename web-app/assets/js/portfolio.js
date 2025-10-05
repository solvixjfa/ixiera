// portfolio.js - PRODUCTION READY WITH DETAILS SUPPORT
import { getSupabase } from './supabase-client.js';

class PortfolioManager {
    constructor() {
        this.supabase = getSupabase();
        this.projects = [];
        this.currentFilter = '*';
        this.cacheKey = 'ixiera_portfolio_v2';
        this.cacheDetailsKey = 'ixiera_portfolio_details_v2';
        this.cacheDuration = 24 * 60 * 60 * 1000; // 24 hours
        this.init();
    }

    async init() {
        await this.loadProjects();
        this.setupCSSGrid();
        this.renderPortfolio();
        this.setupEventListeners();
        this.setupCacheCleanup();
    }

    // SETUP CSS GRID - REPLACE ISOTOPE
    setupCSSGrid() {
        const container = document.querySelector('.isotope-container');
        if (!container) return;
        
        container.classList.remove('isotope-container');
        container.classList.add('portfolio-grid');
        
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(350px, 1fr))';
        container.style.gap = '2rem';
        container.style.marginTop = '2rem';
        
        const isotopeLayout = document.querySelector('.isotope-layout');
        if (isotopeLayout) {
            isotopeLayout.removeAttribute('data-default-filter');
            isotopeLayout.removeAttribute('data-layout');
            isotopeLayout.removeAttribute('data-sort');
        }
    }

    async loadProjects() {
        // Try cache first for better performance
        const cached = this.getFromCache();
        if (cached && cached.length > 0) {
            console.log('📦 Using cached portfolio data');
            this.projects = cached;
            return;
        }

        // Fallback to API
        await this.loadFromAPI();
    }

    async loadFromAPI() {
        try {
            console.log('🔄 Fetching from Supabase...');
            const { data, error } = await this.supabase
                .from('showcase_projects')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                console.log(`✅ Loaded ${data.length} projects from Supabase`);
                this.projects = data;
                this.saveToCache(data);
            } else {
                console.log('⚠️ No projects found, using defaults');
                this.projects = this.getDefaultProjects();
            }
        } catch (error) {
            console.error('❌ API Error:', error);
            this.projects = this.getDefaultProjects();
        }
    }

    // SMART CACHE MANAGEMENT
    getFromCache() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            const timestamp = localStorage.getItem(`${this.cacheKey}_timestamp`);
            
            if (!cached || !timestamp) return null;

            const age = Date.now() - parseInt(timestamp);
            if (age > this.cacheDuration) {
                console.log('🕒 Cache expired');
                return null;
            }

            return JSON.parse(cached);
        } catch (error) {
            console.error('Cache read error:', error);
            return null;
        }
    }

    saveToCache(data) {
        try {
            const compressedData = this.compressData(data);
            localStorage.setItem(this.cacheKey, JSON.stringify(compressedData));
            localStorage.setItem(`${this.cacheKey}_timestamp`, Date.now().toString());
            console.log('💾 Portfolio data cached');
        } catch (error) {
            console.error('Cache write error:', error);
        }
    }

    compressData(data) {
        // Remove unnecessary fields for portfolio grid view
        return data.map(project => ({
            id: project.id,
            title: project.title,
            category: project.category,
            description: this.cleanDescription(project.description),
            featured_image: project.featured_image,
            live_url: project.live_url,
            results: project.results,
            sort_order: project.sort_order
        }));
    }

    cleanDescription(description) {
        if (!description) return '';
        // Remove quotes and take first sentence
        let clean = description.replace(/"/g, '');
        return clean.split('.')[0] + '.';
    }

    getDefaultProjects() {
        return [
            {
                id: 'default-1',
                title: "Workspace Ixiera - Project Management Platform",
                category: "filter-sistem",
                description: "Platform manajemen project dengan AI assistant dan real-time collaboration",
                pain_points: ["Kesulitan track progress", "Komunikasi terpisah", "Waktu habis admin task"],
                solutions: ["Dashboard real-time", "Integrated chat system", "AI assistant"],
                results: ["Client satisfaction +70%", "Waktu admin -2 jam/hari", "Project delivery 40% faster"],
                live_url: "https://ixiera-dashboard.vercel.app",
                featured_image: "https://ik.imagekit.io/solviXone/ixiera/img/portfolio/app-1.jpg",
                sort_order: 1,
                is_active: true
            }
        ];
    }

    renderPortfolio() {
        const container = document.querySelector('.portfolio-grid') || 
                         document.querySelector('.isotope-container');
        
        if (!container) {
            console.error('Container not found');
            return;
        }

        container.innerHTML = '';

        if (this.projects.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        this.projects.forEach(project => {
            const projectElement = this.createProjectElement(project);
            fragment.appendChild(projectElement);
        });

        container.appendChild(fragment);
        this.applyFilter(this.currentFilter);
    }

    createProjectElement(project) {
        const template = document.createElement('template');
        template.innerHTML = this.createProjectHTML(project);
        return template.content.firstElementChild;
    }

    createProjectHTML(project) {
        const hasResults = project.results && project.results.length > 0;
        const hasLiveDemo = project.live_url && project.live_url !== '#' && project.live_url !== '';

        return `
        <div class="portfolio-item ${project.category}" data-category="${project.category}">
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
                    
                    ${hasResults ? `
                    <div class="portfolio-features">
                        ${project.results.slice(0, 2).map(result => `
                            <span class="feature-badge">${result}</span>
                        `).join('')}
                    </div>
                    ` : ''}
                    
                    <div class="portfolio-actions">
                        ${hasLiveDemo ? `
                        <a href="${project.live_url}" target="_blank" class="btn-portfolio btn-live-demo">
                            <i class="bi bi-play-circle"></i>
                            Live Demo
                        </a>
                        ` : `
                        <button class="btn-portfolio btn-live-demo" disabled>
                            <i class="bi bi-play-circle"></i>
                            Coming Soon
                        </button>
                        `}
                        
                        <a href="portfolio-details.html?id=${project.id}" class="btn-portfolio btn-case-study">
                            <i class="bi bi-arrow-right"></i>
                            Detail Project
                        </a>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    getCategoryLabel(category) {
        const labels = {
            'filter-sistem': 'Sistem Terintegrasi',
            'filter-branding': 'Branding & Desain', 
            'filter-marketing': 'Pemasaran Digital'
        };
        return labels[category] || 'Project';
    }

    setupEventListeners() {
        const filterButtons = document.querySelectorAll('.filter-btn-modern');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = button.getAttribute('data-filter');
                this.handleFilter(filter, button);
            });
        });
    }

    handleFilter(filter, clickedButton) {
        this.currentFilter = filter;
        
        // Update UI
        document.querySelectorAll('.filter-btn-modern').forEach(btn => {
            btn.classList.remove('filter-active');
        });
        clickedButton.classList.add('filter-active');
        
        // Apply filter with animation
        this.applyFilter(filter);
    }

    applyFilter(filter) {
        const items = document.querySelectorAll('.portfolio-item');
        let visibleCount = 0;

        items.forEach((item, index) => {
            const category = item.getAttribute('data-category');
            const shouldShow = filter === '*' || category === filter.replace('.', '');
            
            if (shouldShow) {
                visibleCount++;
                item.style.display = 'block';
                // Staggered animation
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

        console.log(`🔍 Filter "${filter}" shows ${visibleCount} projects`);
    }

    getEmptyState() {
        return `
            <div class="col-12 text-center py-5">
                <div class="empty-state">
                    <i class="bi bi-inbox display-4 text-muted"></i>
                    <h4 class="mt-3">Tidak ada project yang ditampilkan</h4>
                    <p class="text-muted">Silakan refresh halaman atau coba lagi nanti.</p>
                </div>
            </div>
        `;
    }

    setupCacheCleanup() {
        // Cleanup old cache versions on load
        const oldKeys = ['portfolio_data', 'portfolio_full_data'];
        oldKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log('🧹 Cleaned old cache:', key);
            }
        });
    }

    // DETAILS PAGE SUPPORT - STATIC METHODS
    static async getProjectDetails(projectId) {
        try {
            // Try cache first
            const cached = PortfolioManager.getFromDetailsCache(projectId);
            if (cached) return cached;

            // Fallback to API
            return await PortfolioManager.fetchProjectDetails(projectId);
        } catch (error) {
            console.error('Error getting project details:', error);
            return null;
        }
    }

    static getFromDetailsCache(projectId) {
        try {
            const cached = localStorage.getItem('ixiera_portfolio_details_v2');
            if (!cached) return null;

            const detailsCache = JSON.parse(cached);
            const project = detailsCache[projectId];
            
            if (project && (Date.now() - project.timestamp < 24 * 60 * 60 * 1000)) {
                console.log('📖 Project details from cache');
                return project.data;
            }
        } catch (error) {
            console.error('Details cache error:', error);
        }
        return null;
    }

    static async fetchProjectDetails(projectId) {
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('showcase_projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (error) throw error;

            if (data) {
                PortfolioManager.saveToDetailsCache(projectId, data);
                console.log('✅ Project details fetched from API');
                return data;
            }
        } catch (error) {
            console.error('API fetch error:', error);
        }
        return null;
    }

    static saveToDetailsCache(projectId, data) {
        try {
            const existing = localStorage.getItem('ixiera_portfolio_details_v2');
            const detailsCache = existing ? JSON.parse(existing) : {};
            
            // Keep only last 20 projects to prevent storage bloat
            const keys = Object.keys(detailsCache);
            if (keys.length >= 20) {
                delete detailsCache[keys[0]];
            }

            detailsCache[projectId] = {
                data: data,
                timestamp: Date.now()
            };

            localStorage.setItem('ixiera_portfolio_details_v2', JSON.stringify(detailsCache));
        } catch (error) {
            console.error('Details cache save error:', error);
        }
    }

    // Utility method to force refresh cache
    static async refreshCache() {
        try {
            localStorage.removeItem('ixiera_portfolio_v2');
            localStorage.removeItem('ixiera_portfolio_v2_timestamp');
            console.log('🔄 Cache refreshed manually');
            return true;
        } catch (error) {
            console.error('Cache refresh error:', error);
            return false;
        }
    }
}

// Auto-initialize only on portfolio page
if (document.querySelector('.portfolio-page')) {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            new PortfolioManager();
        } catch (error) {
            console.error('Portfolio initialization failed:', error);
            // Graceful fallback
            const container = document.querySelector('.portfolio-grid, .isotope-container');
            if (container) {
                container.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle"></i>
                            <p class="mt-2">Gagal memuat portfolio. Silakan refresh halaman.</p>
                        </div>
                    </div>
                `;
            }
        }
    });
}

// Export for details page usage
export { PortfolioManager };