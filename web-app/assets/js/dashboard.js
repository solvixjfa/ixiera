// assets/js/dashboard.js - FIXED VERSION
import { getSupabase } from './supabase-client.js';

class ElegantDashboard {
    constructor() {
        this.supabase = getSupabase();
        this.currentUser = null;
        this.projects = [];
        this.cacheKey = null;
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        this.performance = {
            startTime: 0,
            loadTime: 0
        };
        this.init();
    }

    async init() {
        this.performance.startTime = performance.now();
        console.log('🚀 Initializing Elegant Dashboard...');
        
        try {
            const isAuthenticated = await this.checkAuthentication();
            if (isAuthenticated) {
                this.setupCache();
                await this.loadUserProjects();
                this.setupEventListeners();
                this.setupTawkTo();
                this.setupPerformanceMonitoring();
            } else {
                this.showAccessDenied();
            }
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError('Terjadi kesalahan saat memuat dashboard');
        }
    }

    setupPerformanceMonitoring() {
        if (this.performance.startTime) {
            this.performance.loadTime = performance.now() - this.performance.startTime;
            const loadTimeElement = document.getElementById('load-time');
            if (loadTimeElement) {
                loadTimeElement.textContent = `Loaded in ${this.performance.loadTime.toFixed(0)}ms`;
            }
        }
        
        const projectCountElement = document.getElementById('project-count');
        if (projectCountElement) {
            projectCountElement.textContent = this.projects.length;
        }
    }

    setupTawkTo() {
        console.log('🎯 Tawk.to ready for client support');
    }

    setupCache() {
        if (this.currentUser && this.currentUser.email) {
            this.cacheKey = `ixiera_elegant_${this.currentUser.email}`;
        }
    }

    getCachedData() {
        if (!this.cacheKey) return null;
        
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return null;
            
            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();
            
            if (now - timestamp < this.cacheDuration) {
                return data;
            } else {
                localStorage.removeItem(this.cacheKey);
                return null;
            }
        } catch (error) {
            console.warn('Cache read error:', error);
            return null;
        }
    }

    setCachedData(data) {
        if (!this.cacheKey) return;
        
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Cache write error:', error);
        }
    }

    async checkAuthentication() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error || !session) {
                console.log('❌ No valid session found');
                return false;
            }

            this.currentUser = session.user;
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = this.currentUser.email;
            }
            console.log('✅ User authenticated:', this.currentUser.email);
            return true;
        } catch (error) {
            console.error('Auth error:', error);
            return false;
        }
    }

    async loadUserProjects(forceRefresh = false) {
        const skeletonLoader = document.getElementById('skeleton-loader');
        if (skeletonLoader) {
            skeletonLoader.style.display = 'block';
        }
        
        try {
            let projects = null;
            let fromCache = false;

            if (!forceRefresh) {
                projects = this.getCachedData();
                if (projects) {
                    fromCache = true;
                    console.log('📦 Loading from cache');
                }
            }

            if (!projects) {
                console.log('🌐 Fetching fresh data from API');
                const { data, error } = await this.supabase
                    .from('project_inquiries')
                    .select('*')
                    .eq('client_email', this.currentUser.email)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Supabase error:', error);
                    throw new Error(`Database error: ${error.message}`);
                }
                projects = data || [];
                this.setCachedData(projects);
            }

            this.projects = projects;
            
            if (this.projects.length > 0) {
                this.showDashboard();
                this.displayProjects();
                this.updateStats();
                this.showCacheIndicator(fromCache);
                this.animateStats();
            } else {
                this.showNoProjects();
            }
            
        } catch (error) {
            console.error('❌ Error loading projects:', error);
            this.showError('Gagal memuat project: ' + (error.message || 'Unknown error'));
        } finally {
            if (skeletonLoader) {
                skeletonLoader.style.display = 'none';
            }
            this.setupPerformanceMonitoring();
        }
    }

    animateStats() {
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.transform = 'translateY(0) scale(1)';
                card.style.opacity = '1';
            }, index * 200);
        });
    }

    showCacheIndicator(fromCache) {
        const indicator = document.getElementById('cache-indicator');
        const badge = document.getElementById('cache-badge');
        const cacheText = document.getElementById('cache-text');
        
        if (!indicator) return;
        
        if (fromCache) {
            indicator.innerHTML = '<i class="bi bi-database me-1"></i>Data cached • ';
            if (cacheText) cacheText.textContent = 'Cache';
            if (badge) {
                badge.style.display = 'block';
                badge.style.background = 'var(--electric-blue)';
                badge.classList.remove('live');
            }
        } else {
            indicator.innerHTML = '<i class="bi bi-wifi me-1"></i>Data live • ';
            if (cacheText) cacheText.textContent = 'Live';
            if (badge) {
                badge.style.display = 'block';
                badge.style.background = 'var(--success-green)';
                badge.classList.add('live');
            }
        }
        
        indicator.innerHTML += new Date().toLocaleTimeString('id-ID');
    }

    displayProjects() {
        const container = document.getElementById('projects-container');
        if (!container) return;
        
        if (this.projects.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = this.projects.map((project, index) => `
            <div class="project-card project-item" data-status="${project.status || 'new'}" style="opacity: 0; transform: translateY(20px); animation: fadeInUp 0.6s ease ${index * 0.1}s forwards;">
                <div class="card-body p-4">
                    <div class="row align-items-start">
                        <div class="col-lg-8">
                            <div class="d-flex align-items-start justify-content-between mb-3">
                                <div>
                                    <h5 class="fw-bold mb-2">${this.escapeHtml(project.service_type || 'General Project')}</h5>
                                    <span class="status-badge status-${this.getStatusClass(project.status)}">
                                        ${this.getStatusText(project.status)}
                                    </span>
                                </div>
                                <small class="text-silver">#${project.id}</small>
                            </div>
                            
                            <div class="project-details mb-3">
                                <p class="text-silver mb-0" style="white-space: pre-line; line-height: 1.6;">${this.escapeHtml(project.project_requirements || 'No requirements specified')}</p>
                                <div class="read-more">
                                    <button class="btn btn-link btn-sm p-0 text-gold read-more-btn">
                                        <i class="bi bi-chevron-down me-1"></i>Baca selengkapnya
                                    </button>
                                </div>
                            </div>
                            
                            <div class="d-flex flex-wrap gap-3 text-silver" style="font-size: 0.85rem;">
                                <div>
                                    <i class="bi bi-calendar me-1"></i>
                                    ${new Date(project.created_at).toLocaleDateString('id-ID')}
                                </div>
                                <div>
                                    <i class="bi bi-person me-1"></i>
                                    ${this.escapeHtml(project.client_name || 'Unknown')}
                                </div>
                                ${project.budget && project.budget !== 'Tidak ditentukan' ? `
                                    <div>
                                        <i class="bi bi-currency-dollar me-1"></i>
                                        ${this.escapeHtml(project.budget)}
                                    </div>
                                ` : ''}
                                ${project.deadline ? `
                                    <div>
                                        <i class="bi bi-clock me-1"></i>
                                        ${new Date(project.deadline).toLocaleDateString('id-ID')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="col-lg-4 text-lg-end mt-3 mt-lg-0">
                            <div class="d-flex flex-column gap-2">
                                ${project.project_demo_url ? `
                                    <a href="${this.escapeHtml(project.project_demo_url)}" target="_blank" 
                                       class="btn btn-demo">
                                        <i class="bi bi-eye me-2"></i>Live Demo
                                    </a>
                                ` : `
                                    <button class="btn btn-outline-premium" disabled>
                                        <i class="bi bi-eye me-2"></i>Demo Coming
                                    </button>
                                `}
                                <button class="btn btn-outline-premium whatsapp-btn" 
                                    data-project-type="${this.escapeHtml(project.service_type || 'General Project')}"
                                    data-project-id="${project.id}">
                                    <i class="bi bi-whatsapp me-2"></i>WhatsApp
                                </button>
                                <button class="btn btn-outline-premium view-details" 
                                    data-project-id="${project.id}">
                                    <i class="bi bi-info-circle me-2"></i>Details
                                </button>
                                <small class="text-silver">
                                    <i class="bi bi-arrow-clockwise me-1"></i>
                                    ${new Date(project.updated_at || project.created_at).toLocaleDateString('id-ID')}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        this.setupProjectInteractions();
        this.setupProjectFilters();
        this.addCustomAnimations();
    }

    addCustomAnimations() {
        // Check if animation style already exists
        if (!document.querySelector('#fadeInUp-animation')) {
            const style = document.createElement('style');
            style.id = 'fadeInUp-animation';
            style.textContent = `
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    setupProjectInteractions() {
        // Read more functionality
        document.querySelectorAll('.read-more-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const details = e.target.closest('.project-details');
                if (!details) return;
                
                const readMore = details.querySelector('.read-more');
                details.classList.toggle('expanded');
                
                if (readMore) {
                    readMore.classList.toggle('hidden');
                }
                
                if (details.classList.contains('expanded')) {
                    e.target.innerHTML = '<i class="bi bi-chevron-up me-1"></i>Sembunyikan';
                } else {
                    e.target.innerHTML = '<i class="bi bi-chevron-down me-1"></i>Baca selengkapnya';
                }
            });
        });

        // WhatsApp buttons
        document.querySelectorAll('.whatsapp-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectType = e.target.closest('.whatsapp-btn')?.dataset.projectType;
                const projectId = e.target.closest('.whatsapp-btn')?.dataset.projectId;
                if (projectType && projectId) {
                    this.openWhatsApp(projectType, projectId);
                }
            });
        });

        // View details buttons
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.target.closest('.view-details')?.dataset.projectId;
                if (projectId) {
                    this.showProjectDetails(projectId);
                }
            });
        });
    }

    openWhatsApp(projectType, projectId) {
        const message = `Halo Ixiera, saya mau tanya tentang project: ${projectType} (ID: ${projectId})`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/6285702373412?text=${encodedMessage}`, '_blank');
    }

    showProjectDetails(projectId) {
        const project = this.projects.find(p => p.id == projectId);
        if (!project) return;

        // Remove existing modal
        const existingModal = document.getElementById('projectModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHtml = `
            <div class="modal fade" id="projectModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content premium-card">
                        <div class="modal-header border-bottom border-dark">
                            <h5 class="modal-title text-gold fw-bold">Detail Project</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <strong class="text-silver">Service Type:</strong>
                                    <p class="text-dark">${this.escapeHtml(project.service_type || 'General Project')}</p>
                                </div>
                                <div class="col-md-6">
                                    <strong class="text-silver">Status:</strong>
                                    <p><span class="status-badge status-${this.getStatusClass(project.status)}">${this.getStatusText(project.status)}</span></p>
                                </div>
                            </div>
                            <div class="mb-4">
                                <strong class="text-silver">Project Requirements:</strong>
                                <div class="mt-2 p-3 rounded" style="background: var(--snow-white); border: 1px solid var(--light-gray); white-space: pre-line; color: var(--dark-gray);">${this.escapeHtml(project.project_requirements || 'No requirements specified')}</div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <strong class="text-silver">Budget:</strong>
                                    <p class="text-dark">${project.budget || 'Tidak ditentukan'}</p>
                                </div>
                                <div class="col-md-6">
                                    <strong class="text-silver">Deadline:</strong>
                                    <p class="text-dark">${project.deadline ? new Date(project.deadline).toLocaleDateString('id-ID') : 'Tidak ditentukan'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modalElement = document.getElementById('projectModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            
            // Clean up modal when hidden
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
            });
        }
    }

    setupProjectFilters() {
        const filterButtons = document.querySelectorAll('[data-filter]');
        const projectItems = document.querySelectorAll('.project-item');

        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                projectItems.forEach(item => {
                    if (filter === 'all' || item.dataset.status === filter) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }

    updateStats() {
        const stats = {
            total: this.projects.length,
            inProgress: this.projects.filter(p => p.status === 'in_progress').length,
            completed: this.projects.filter(p => p.status === 'completed').length,
            awaitingReview: this.projects.filter(p => p.status === 'review').length
        };

        // Animate number counting
        this.animateNumber('total-inquiries', stats.total);
        this.animateNumber('in-progress', stats.inProgress);
        this.animateNumber('completed', stats.completed);
        this.animateNumber('awaiting-review', stats.awaitingReview);

        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Anda memiliki ${stats.total} project${stats.total !== 1 ? 's' : ''}`;
        }
    }

    animateNumber(elementId, targetNumber) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const duration = 1000;
        const steps = 60;
        const step = targetNumber / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += step;
            if (current >= targetNumber) {
                element.textContent = targetNumber;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, duration / steps);
    }

    getStatusClass(status) {
        const statusClassMap = {
            'new': 'new',
            'review': 'review', 
            'in_progress': 'progress',
            'completed': 'completed',
            'contacted': 'progress',
            'quotation': 'review',
            'negotiation': 'progress'
        };
        return statusClassMap[status] || 'new';
    }

    getStatusText(status) {
        const statusMap = {
            'new': 'Baru',
            'review': 'Review', 
            'in_progress': 'Dalam Proses',
            'completed': 'Selesai',
            'contacted': 'Dihubungi',
            'quotation': 'Quotation',
            'negotiation': 'Negosiasi'
        };
        return statusMap[status] || 'Baru';
    }

    getEmptyStateHTML() {
        return `
            <div class="text-center py-5">
                <i class="bi bi-inbox display-1 text-gold"></i>
                <h4 class="mt-3">Belum Ada Project</h4>
                <p class="text-silver mb-4">Mulai dengan mengajukan project pertama Anda</p>
                <a href="contact.html" class="btn btn-premium">Ajukan Project</a>
            </div>
        `;
    }

    showDashboard() {
        this.hideElement('loading-section');
        this.hideElement('access-denied-section');
        this.showElement('dashboard-content');
    }

    showAccessDenied() {
        this.hideElement('loading-section');
        this.hideElement('dashboard-content');
        this.showElement('access-denied-section');
    }

    showNoProjects() {
        this.hideElement('loading-section');
        this.showElement('dashboard-content');
        
        const container = document.getElementById('projects-container');
        if (container) {
            container.innerHTML = this.getEmptyStateHTML();
        }
    }

    showError(message) {
        this.hideElement('loading-section');
        
        const container = document.getElementById('projects-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-light border border-danger">
                    <i class="bi bi-exclamation-triangle me-2 text-danger"></i>
                    <strong>Error:</strong> 
                    <span class="text-dark">${message}</span>
                    <br><br>
                    <button class="btn btn-outline-premium btn-sm" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise me-1"></i>Coba Lagi
                    </button>
                </div>
            `;
        }
    }

    hideElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    }

    showElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'block';
        }
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await this.supabase.auth.signOut();
                window.location.href = 'login.html';
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadUserProjects(true);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.loadUserProjects(true);
            }
        });

        // Real-time updates every 2 minutes
        setInterval(() => {
            this.loadUserProjects(true);
        }, 2 * 60 * 1000);
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ElegantDashboard();
});

// Global functions for external access
window.refreshDashboard = function() {
    const dashboard = new ElegantDashboard();
    dashboard.loadUserProjects(true);
};

window.clearDashboardCache = function() {
    localStorage.clear();
    location.reload();
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElegantDashboard;
}