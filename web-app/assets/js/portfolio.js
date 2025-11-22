// portfolio.js - CLEAN VERSION
import { getSupabase } from './supabase-client.js';

class PortfolioManager {
    constructor() {
        this.supabase = getSupabase();
        this.projects = [];
        this.currentFilter = '*';
        this.currentSearch = '';
        this.cacheKey = 'ixiera_portfolio_v4';
        this.cacheDuration = 24 * 60 * 60 * 1000;
        this.init();
    }

    async init() {
        await this.loadProjects();
        this.renderPortfolio();
        this.setupEventListeners();
    }

    async loadProjects() {
        const cached = this.getFromCache();
        if (cached && cached.length > 0) {
            this.projects = cached;
            return;
        }
        await this.loadFromAPI();
    }

    async loadFromAPI() {
        try {
            const { data, error } = await this.supabase
                .from('showcase_projects')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                this.projects = data;
                this.saveToCache(data);
            } else {
                this.projects = this.getDefaultProjects();
            }
        } catch (error) {
            console.error('API Error:', error);
            this.projects = this.getDefaultProjects();
        }
    }

    // SIMPLE SEARCH FUNCTIONALITY
    performSearch(query) {
        this.currentSearch = query.toLowerCase().trim();
        this.applyCombinedFilter();
    }

    applyCombinedFilter() {
        const items = document.querySelectorAll('.portfolio-item');
        let visibleCount = 0;

        items.forEach((item, index) => {
            const category = item.getAttribute('data-category');
            const title = item.querySelector('.portfolio-title').textContent.toLowerCase();
            const description = item.querySelector('.portfolio-description').textContent.toLowerCase();
            
            // Filter by category
            const categoryMatch = this.currentFilter === '*' || category === this.currentFilter;
            
            // Filter by search
            const searchMatch = !this.currentSearch || 
                               title.includes(this.currentSearch) || 
                               description.includes(this.currentSearch);
            
            const shouldShow = categoryMatch && searchMatch;
            
            if (shouldShow) {
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
            document.querySelector('.portfolio-filters-modern').after(counter);
        }

        if (this.currentSearch) {
            counter.innerHTML = `<div class="text-muted mt-2">Menampilkan ${count} project</div>`;
            counter.style.display = 'block';
        } else {
            counter.style.display = 'none';
        }
    }

    // EVENT LISTENERS
    setupEventListeners() {
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn-modern');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = button.getAttribute('data-filter');
                this.handleFilter(filter, button);
            });
        });

        // Search input
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
        
        // Update UI
        document.querySelectorAll('.filter-btn-modern').forEach(btn => {
            btn.classList.remove('filter-active');
        });
        clickedButton.classList.add('filter-active');
        
        this.applyCombinedFilter();
    }

    // RENDER PORTFOLIO
    renderPortfolio() {
        const container = document.querySelector('.portfolio-grid');
        if (!container) return;

        container.innerHTML = '';

        if (this.projects.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        const fragment = document.createDocumentFragment();
        
        this.projects.forEach(project => {
            const projectElement = this.createProjectElement(project);
            fragment.appendChild(projectElement);
        });

        container.appendChild(fragment);
        this.applyCombinedFilter();
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

    // CACHE MANAGEMENT
    getFromCache() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            const timestamp = localStorage.getItem(`${this.cacheKey}_timestamp`);
            if (!cached || !timestamp) return null;
            const age = Date.now() - parseInt(timestamp);
            if (age > this.cacheDuration) return null;
            return JSON.parse(cached);
        } catch (error) {
            return null;
        }
    }

    saveToCache(data) {
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(data));
            localStorage.setItem(`${this.cacheKey}_timestamp`, Date.now().toString());
        } catch (error) {
            console.error('Cache write error:', error);
        }
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

    getDefaultProjects() {
        return [];
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
            console.error('Error fetching project details:', error);
            return null;
        }
    }
}

// Auto-initialize
if (document.querySelector('.portfolio-page')) {
    document.addEventListener('DOMContentLoaded', () => {
        new PortfolioManager();
    });
}

export { PortfolioManager };