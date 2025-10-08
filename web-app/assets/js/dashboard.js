// assets/js/dashboard.js
import { getSupabase } from './supabase-client.js';

class ClientDashboard {
    constructor() {
        this.supabase = getSupabase();
        this.currentUser = null;
        this.projects = [];
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Client Dashboard...');
        try {
            const isAuthenticated = await this.checkAuthentication();
            
            if (isAuthenticated) {
                await this.loadUserProjects();
                this.setupEventListeners();
                this.setupServiceWorker();
            } else {
                this.showAccessDenied();
            }
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Terjadi kesalahan saat memuat dashboard');
        }
    }

    async checkAuthentication() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('Session error:', error);
                return false;
            }
            
            if (!session) {
                console.log('No active session found');
                return false;
            }

            this.currentUser = session.user;
            console.log('✅ User authenticated:', this.currentUser.email);
            document.getElementById('user-email').textContent = this.currentUser.email;
            
            return true;
            
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    async loadUserProjects() {
        try {
            console.log('📋 Loading projects for:', this.currentUser.email);
            
            const { data: projects, error } = await this.supabase
                .from('project_inquiries')
                .select('*')
                .eq('client_email', this.currentUser.email)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Database error:', error);
                throw new Error(`Database error: ${error.message}`);
            }

            console.log('✅ Projects loaded:', projects?.length || 0);
            this.projects = projects || [];
            
            if (this.projects.length > 0) {
                this.showDashboard();
                this.displayProjects();
                this.updateStats();
            } else {
                this.showNoProjects();
            }
            
        } catch (error) {
            console.error('❌ Error loading projects:', error);
            this.showError('Gagal memuat project: ' + error.message);
        }
    }

    displayProjects() {
        const container = document.getElementById('projects-container');
        
        if (this.projects.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = this.projects.map(project => this.getProjectHTML(project)).join('');
        this.setupProjectFilters();
        this.setupProjectInteractions();
    }

    getProjectHTML(project) {
        const budgetDisplay = project.budget && project.budget !== 'Tidak ditentukan' 
            ? this.formatBudget(project.budget)
            : '<span class="user-info">Tidak ditentukan</span>';
        
        const deadlineDisplay = project.deadline 
            ? new Date(project.deadline).toLocaleDateString('id-ID')
            : '<span class="user-info">Tidak ditentukan</span>';

        const requirements = project.project_requirements 
            ? this.truncateText(project.project_requirements, 200)
            : 'Tidak ada detail yang diberikan';

        return `
            <div class="dashboard-card mb-4 project-item" data-status="${project.status || 'new'}" data-project-id="${project.id}">
                <div class="row">
                    <div class="col-lg-8">
                        <div class="d-flex align-items-start justify-content-between mb-3">
                            <div>
                                <h4 class="mb-1" style="color: var(--primary-black);">
                                    ${this.escapeHtml(project.service_type || 'General Inquiry')}
                                </h4>
                                <span class="status-badge status-${project.status || 'new'}">
                                    ${this.getStatusText(project.status)}
                                </span>
                            </div>
                            <small class="user-info">ID: ${project.id}</small>
                        </div>
                        
                        <div class="project-detail-item">
                            <strong style="color: var(--primary-black);">Detail Requirements:</strong>
                            <p class="mb-0 mt-2 user-info" style="white-space: pre-line">${this.escapeHtml(requirements)}</p>
                        </div>

                        <div class="row mt-3">
                            <div class="col-sm-6 mb-2">
                                <strong style="color: var(--primary-black);">📅 Dikirim:</strong>
                                <p class="mb-0 user-info">${new Date(project.created_at).toLocaleString('id-ID')}</p>
                            </div>
                            <div class="col-sm-6 mb-2">
                                <strong style="color: var(--primary-black);">💰 Budget:</strong>
                                <p class="mb-0 user-info">${budgetDisplay}</p>
                            </div>
                            <div class="col-sm-6 mb-2">
                                <strong style="color: var(--primary-black);">⏰ Deadline:</strong>
                                <p class="mb-0 user-info">${deadlineDisplay}</p>
                            </div>
                            <div class="col-sm-6 mb-2">
                                <strong style="color: var(--primary-black);">📞 Kontak:</strong>
                                <p class="mb-0 user-info">${this.escapeHtml(project.client_phone || '-')}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-lg-4">
                        <div class="action-buttons">
                            <h6 style="color: var(--primary-black); margin-bottom: 16px;">Aksi Cepat</h6>
                            <button class="btn btn-outline-app btn-sm view-details" data-project-id="${project.id}">
                                <i class="bi bi-eye me-1"></i>Lihat Detail
                            </button>
                            <button class="btn btn-outline-app btn-sm whatsapp-btn" 
                                data-project-type="${this.escapeHtml(project.service_type)}"
                                data-project-id="${project.id}">
                                <i class="bi bi-whatsapp me-1"></i>Tanya via WhatsApp
                            </button>
                            <button class="btn btn-outline-app btn-sm" onclick="window.location.href='contact.html'">
                                <i class="bi bi-plus-circle me-1"></i>Project Baru
                            </button>
                            
                            <div class="mt-3 p-3" style="background: var(--light-gray); border-radius: 8px;">
                                <small class="user-info">
                                    <i class="bi bi-person me-1"></i>
                                    <strong>Klien:</strong> ${this.escapeHtml(project.client_name)}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupProjectInteractions() {
        // View Details buttons
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.target.closest('.view-details').dataset.projectId;
                this.showProjectDetails(projectId);
            });
        });

        // WhatsApp buttons
        document.querySelectorAll('.whatsapp-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectType = e.target.closest('.whatsapp-btn').dataset.projectType;
                const projectId = e.target.closest('.whatsapp-btn').dataset.projectId;
                this.openWhatsApp(projectType, projectId);
            });
        });
    }

    showProjectDetails(projectId) {
        const project = this.projects.find(p => p.id == projectId);
        if (!project) return;

        const modalHtml = `
            <div class="modal fade" id="projectModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content" style="border-radius: 16px; border: 1px solid var(--border-gray);">
                        <div class="modal-header border-0">
                            <h5 class="modal-title fw-bold">Detail Project</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <strong>Service Type:</strong>
                                    <p>${this.escapeHtml(project.service_type)}</p>
                                </div>
                                <div class="col-md-6">
                                    <strong>Status:</strong>
                                    <p><span class="status-badge status-${project.status}">${this.getStatusText(project.status)}</span></p>
                                </div>
                            </div>
                            <div class="mb-4">
                                <strong>Project Requirements:</strong>
                                <div class="mt-2 p-3 bg-light rounded" style="white-space: pre-line">${this.escapeHtml(project.project_requirements)}</div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>Budget:</strong>
                                    <p>${project.budget || 'Tidak ditentukan'}</p>
                                </div>
                                <div class="col-md-6">
                                    <strong>Deadline:</strong>
                                    <p>${project.deadline ? new Date(project.deadline).toLocaleDateString('id-ID') : 'Tidak ditentukan'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        const existingModal = document.getElementById('projectModal');
        if (existingModal) existingModal.remove();

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('projectModal'));
        modal.show();
    }

    openWhatsApp(projectType, projectId) {
        const message = `Halo Ixiera, saya mau tanya tentang project: ${projectType} (ID: ${projectId})`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/6285702373412?text=${encodedMessage}`, '_blank');
    }

    setupProjectFilters() {
        const filterButtons = document.querySelectorAll('[data-filter]');
        const projectItems = document.querySelectorAll('.project-item');

        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                
                // Update active button
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Filter projects
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

        document.getElementById('total-inquiries').textContent = stats.total;
        document.getElementById('in-progress').textContent = stats.inProgress;
        document.getElementById('completed').textContent = stats.completed;
        document.getElementById('awaiting-review').textContent = stats.awaitingReview;

        document.getElementById('welcome-message').textContent = 
            `Anda memiliki ${stats.total} project inquiry${stats.total !== 1 ? '' : ''}`;
    }

    getStatusText(status) {
        const statusMap = {
            'new': '📝 Baru',
            'review': '🔍 Review',
            'in_progress': '🚀 Dalam Pengerjaan', 
            'completed': '✅ Selesai'
        };
        return statusMap[status] || '📝 Baru';
    }

    formatBudget(budget) {
        if (budget.includes('IDR') || budget.includes('Rp')) {
            return budget;
        }
        return `IDR ${budget}`;
    }

    truncateText(text, length) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    getEmptyStateHTML() {
        return `
            <div class="text-center py-5">
                <i class="bi bi-inbox display-1 user-info"></i>
                <h4 class="mt-3" style="color: var(--primary-black);">Belum Ada Project</h4>
                <p class="user-info mb-4">Ajukan project pertama Anda untuk memulai</p>
                <a href="contact.html" class="btn btn-primary-app">Ajukan Project</a>
            </div>
        `;
    }

    showDashboard() {
        document.getElementById('loading-section').style.display = 'none';
        document.getElementById('access-denied-section').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';
    }

    showAccessDenied() {
        document.getElementById('loading-section').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'none';
        document.getElementById('access-denied-section').style.display = 'block';
    }

    showNoProjects() {
        document.getElementById('loading-section').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';
        document.getElementById('projects-container').innerHTML = this.getEmptyStateHTML();
    }

    showError(message) {
        document.getElementById('loading-section').style.display = 'none';
        document.getElementById('projects-container').innerHTML = `
            <div class="alert alert-danger border-0">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Error:</strong> ${message}
                <br><br>
                <button class="btn btn-sm btn-outline-dark" onclick="location.reload()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Coba Lagi
                </button>
            </div>
        `;
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('SW registered'))
                .catch(error => console.log('SW registration failed'));
        }
    }

    setupEventListeners() {
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await this.supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ClientDashboard();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientDashboard;
}