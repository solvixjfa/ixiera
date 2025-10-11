import { supabase, formatCurrency, formatDate } from './shared.js';
import { checkAuth, setupLogout, updateUserInfo } from './auth.js';

console.log('CRM Projects JS loaded - CACHE VERSION');

// Cache configuration
const CACHE_KEYS = {
    PROJECTS_DATA: 'crm_projects_cache',
    PROJECTS_STATS: 'crm_projects_stats_cache'
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

let allProjects = [];
let isUsingCache = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing CRM Projects...');
    
    // Check authentication
    const auth = await checkAuth();
    if (!auth) {
        console.log('Authentication failed');
        return;
    }
    
    const { session, adminUser } = auth;
    console.log('User authenticated:', session.user.email);
    
    updateUserInfo(session.user);
    setupLogout();
    setupEventListeners();

    // Initialize projects management dengan cache
    await loadProjects();
});

async function loadProjects() {
    console.log('Loading projects with cache...');
    
    try {
        showLoadingState();

        // Cek cache dulu
        const cachedData = getCachedData(CACHE_KEYS.PROJECTS_DATA);
        if (cachedData) {
            console.log('Using cached projects data');
            allProjects = cachedData;
            isUsingCache = true;
            showCacheIndicator();
            updateProjectUI(allProjects);
            return;
        }

        // Kalau tidak ada cache, load dari Supabase
        console.log('No cache found, loading from Supabase...');
        const { data: inquiries, error } = await supabase
            .from('project_inquiries')
            .select('*')
            .in('status', ['in-progress', 'development', 'design', 'revision', 'completed', 'quotation', 'negotiation'])
            .order('created_at', { ascending: false });

        if (error) throw error;

        allProjects = inquiries || [];
        
        // Simpan ke cache
        cacheData(CACHE_KEYS.PROJECTS_DATA, allProjects);
        isUsingCache = false;
        hideCacheIndicator();
        
        updateProjectUI(allProjects);
        
    } catch (error) {
        console.error('Error loading projects:', error);
        showErrorState(error);
    }
}

function updateProjectUI(projects) {
    updateProjectStats(projects);
    renderProgressBars(projects);
    renderProjectsTable(projects);
    updateProgressUpdateTime();
}

function updateProjectStats(projects) {
    console.log('Updating project stats...');
    
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => 
        ['in-progress', 'development', 'design', 'revision'].includes(p.status)
    ).length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    
    // Hitung overdue projects
    const today = new Date();
    const overdueProjects = projects.filter(p => 
        p.deadline && 
        new Date(p.deadline) < today && 
        !['completed', 'cancelled', 'lost'].includes(p.status)
    ).length;

    safeUpdateElement('total-projects', totalProjects.toLocaleString());
    safeUpdateElement('active-projects', activeProjects.toLocaleString());
    safeUpdateElement('completed-projects', completedProjects.toLocaleString());
    safeUpdateElement('overdue-projects', overdueProjects.toLocaleString());

    // Cache stats juga
    cacheData(CACHE_KEYS.PROJECTS_STATS, {
        totalProjects, activeProjects, completedProjects, overdueProjects,
        timestamp: Date.now()
    });
}

function renderProgressBars(projects) {
    const container = document.getElementById('project-progress-bars');
    if (!container) return;

    // Ambil projects aktif terbaru (max 5)
    const activeProjects = projects
        .filter(p => ['in-progress', 'development', 'design', 'revision'].includes(p.status))
        .slice(0, 5);

    if (activeProjects.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No active projects at the moment</p>';
        return;
    }

    container.innerHTML = activeProjects.map(project => {
        const progress = getProgressPercentage(project.status);
        const color = getStatusColor(project.status);
        const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed';
        
        return `
        <div class="progress-item mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="project-name">${project.client_name} - ${project.service_type || 'Project'}</span>
                <span class="progress-text">${progress}%</span>
            </div>
            <div class="progress" style="height: 8px;">
                <div class="progress-bar" role="progressbar" 
                     style="width: ${progress}%; background-color: ${color}"
                     aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
                </div>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-1">
                <small class="text-muted">${formatStatusText(project.status)}</small>
                <small class="${isOverdue ? 'text-danger' : 'text-muted'}">
                    ${project.deadline ? formatDate(project.deadline) : 'No deadline'}
                    ${isOverdue ? ' ⚠️' : ''}
                </small>
            </div>
        </div>
        `;
    }).join('');
}

function renderProjectsTable(projects) {
    const tbody = document.getElementById('projects-table-body');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    console.log('Rendering table with', projects.length, 'projects');
    
    if (projects.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-muted">
                    No projects found. Projects will appear here when leads are converted to active status.
                    <br>
                    <a href="crm-inquiries.html" class="btn-link">View Inquiries</a>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = projects.map(project => {
        const progress = getProgressPercentage(project.status);
        const color = getStatusColor(project.status);
        const isOverdue = project.deadline && new Date(project.deadline) < new Date() && !['completed', 'cancelled', 'lost'].includes(project.status);
        const statusCategory = getStatusCategory(project.status);
        
        return `
        <tr>
            <td>
                <div style="display: flex; align-items: center;">
                    <div class="avatar-placeholder" style="background: ${color}; color: white;">
                        ${(project.service_type || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <strong>${project.service_type || 'Project'}</strong>
                        <br>
                        <small class="text-muted">${formatDate(project.created_at)}</small>
                    </div>
                </div>
            </td>
            <td>
                <strong>${project.client_name || 'Unknown Client'}</strong>
                <br>
                <small class="text-muted">${project.client_email || 'No email'}</small>
            </td>
            <td>${project.service_type || 'General'}</td>
            <td>
                ${project.deadline ? `
                    <strong>${formatDate(project.deadline)}</strong>
                    <br>
                    <small class="${isOverdue ? 'text-danger' : 'text-muted'}">
                        ${getDaysRemaining(project.deadline, project.status)}
                        ${isOverdue ? ' ⚠️' : ''}
                    </small>
                ` : '<span class="text-muted">Not set</span>'}
            </td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="progress" style="height: 6px; width: 80px; flex-shrink: 0;">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${progress}%; background-color: ${color}">
                        </div>
                    </div>
                    <small style="flex-shrink: 0;">${progress}%</small>
                </div>
            </td>
            <td>
                <span class="badge-${statusCategory}">
                    ${formatStatusText(project.status)}
                    ${isOverdue ? ' (Overdue)' : ''}
                </span>
            </td>
            <td>${project.budget || 'Not specified'}</td>
            <td>
                <div style="display: flex; gap: 0.25rem;">
                    <a href="edit-inquiry.html?id=${project.id}" class="btn btn-outline-primary btn-sm" title="Edit Project">
                        <i data-feather="edit-2"></i>
                    </a>
                    <button class="btn btn-outline-info btn-sm view-project" data-id="${project.id}" title="View Details">
                        <i data-feather="eye"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');

    // Add event listeners
    document.querySelectorAll('.view-project').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const projectId = e.currentTarget.dataset.id;
            viewProjectDetails(projectId);
        });
    });

    // Refresh Feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// CACHE SYSTEM FUNCTIONS
function getCachedData(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        
        // Cek cache expiration
        if (Date.now() - timestamp < CACHE_DURATION) {
            return data;
        }
        
        // Cache expired, hapus
        localStorage.removeItem(key);
        return null;
    } catch (error) {
        console.warn('Cache read error:', error);
        return null;
    }
}

function cacheData(key, data) {
    try {
        const cacheObject = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheObject));
        console.log('Data cached for:', key);
    } catch (error) {
        console.warn('Cache write error:', error);
    }
}

function clearProjectsCache() {
    Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    console.log('Projects cache cleared');
    showToast('Cache cleared successfully!', 'success');
}

function showCacheIndicator() {
    const indicator = document.getElementById('cache-indicator');
    if (indicator) {
        indicator.style.display = 'block';
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 3000);
    }
}

function hideCacheIndicator() {
    const indicator = document.getElementById('cache-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// UTILITY FUNCTIONS
function getProgressPercentage(status) {
    const progressMap = {
        'quotation': 10,
        'negotiation': 20,
        'design': 40,
        'development': 70,
        'in-progress': 50,
        'revision': 85,
        'completed': 100
    };
    return progressMap[status] || 25;
}

function getStatusColor(status) {
    const colorMap = {
        'quotation': '#f59e0b',
        'negotiation': '#f97316', 
        'design': '#8b5cf6',
        'development': '#3b82f6',
        'in-progress': '#06b6d4',
        'revision': '#ec4899',
        'completed': '#10b981',
        'cancelled': '#6b7280',
        'lost': '#ef4444'
    };
    return colorMap[status] || '#6b7280';
}

function getStatusCategory(status) {
    if (status === 'completed') return 'completed';
    if (['in-progress', 'development', 'design', 'revision'].includes(status)) return 'active';
    if (['quotation', 'negotiation'].includes(status)) return 'planning';
    return 'planning';
}

function isOverdue(project) {
    if (!project.deadline || ['completed', 'cancelled', 'lost'].includes(project.status)) return false;
    return new Date(project.deadline) < new Date();
}

function getDaysRemaining(deadline, status) {
    if (!deadline || ['completed', 'cancelled', 'lost'].includes(status)) return 'Completed';
    
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
}

function viewProjectDetails(projectId) {
    const project = allProjects.find(p => p.id == projectId);
    if (!project) return;
    
    const progress = getProgressPercentage(project.status);
    const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed';
    
    alert(`📋 Project Details:\n
👤 Client: ${project.client_name}
📧 Email: ${project.client_email}
📞 Phone: ${project.client_phone || 'Not provided'}
🛠️ Service: ${project.service_type || 'General'}
📊 Status: ${formatStatusText(project.status)}
🎯 Progress: ${progress}%
📅 Deadline: ${project.deadline ? formatDate(project.deadline) : 'Not set'}
${isOverdue ? '⚠️  STATUS: OVERDUE\n' : ''}💰 Budget: ${project.budget || 'Not specified'}
📝 Requirements: ${project.project_requirements ? project.project_requirements.substring(0, 100) + '...' : 'None'}`);
}

function updateProgressUpdateTime() {
    const element = document.getElementById('progress-update-time');
    if (element) {
        const now = new Date();
        element.textContent = `Updated: ${now.toLocaleTimeString()}`;
    }
}

function formatStatusText(status) {
    const statusTextMap = {
        'new': 'New',
        'contacted': 'Contacted',
        'follow-up': 'Follow Up',
        'quotation': 'Quotation',
        'negotiation': 'Negotiation',
        'design': 'Design Phase',
        'development': 'Development',
        'in-progress': 'In Progress',
        'revision': 'Revision',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'lost': 'Lost'
    };
    return statusTextMap[status] || status || 'New';
}

function safeUpdateElement(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    } else {
        console.warn('Element not found:', elementId);
    }
}

function showToast(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            document.body.removeChild(toast);
        }
    }, 3000);
}

// FILTER SYSTEM
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i data-feather="refresh-cw" class="me-1 spin"></i> Refreshing...';
            
            clearProjectsCache();
            await loadProjects();
            
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i data-feather="refresh-cw" class="me-1"></i> Refresh';
            if (typeof feather !== 'undefined') feather.replace();
        });
    }
    
    // Clear cache button
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            clearProjectsCache();
            loadProjects(); // Reload fresh data
        });
    }
    
    // Filter event listeners
    const filters = ['status-filter', 'service-filter', 'timeline-filter', 'priority-filter', 'global-search'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', applyFilters);
            element.addEventListener('input', applyFilters);
        }
    });
}

function applyFilters() {
    console.log('Applying filters...');
    
    const statusFilter = document.getElementById('status-filter')?.value || '';
    const serviceFilter = document.getElementById('service-filter')?.value || '';
    const timelineFilter = document.getElementById('timeline-filter')?.value || '';
    const searchTerm = document.getElementById('global-search')?.value.toLowerCase() || '';

    let filteredProjects = allProjects;

    // Status filter
    if (statusFilter) {
        if (statusFilter === 'planning') {
            filteredProjects = filteredProjects.filter(p => ['quotation', 'negotiation'].includes(p.status));
        } else if (statusFilter === 'active') {
            filteredProjects = filteredProjects.filter(p => ['in-progress', 'development', 'design', 'revision'].includes(p.status));
        } else if (statusFilter === 'completed') {
            filteredProjects = filteredProjects.filter(p => p.status === 'completed');
        } else if (statusFilter === 'overdue') {
            filteredProjects = filteredProjects.filter(p => isOverdue(p));
        }
    }

    // Service filter
    if (serviceFilter) {
        filteredProjects = filteredProjects.filter(p => 
            p.service_type?.toLowerCase().includes(serviceFilter.toLowerCase())
        );
    }

    // Timeline filter
    if (timelineFilter) {
        const today = new Date();
        if (timelineFilter === 'this-week') {
            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            filteredProjects = filteredProjects.filter(p => 
                p.deadline && new Date(p.deadline) <= nextWeek && new Date(p.deadline) >= today
            );
        } else if (timelineFilter === 'this-month') {
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
            filteredProjects = filteredProjects.filter(p => 
                p.deadline && new Date(p.deadline) <= nextMonth && new Date(p.deadline) >= today
            );
        } else if (timelineFilter === 'overdue') {
            filteredProjects = filteredProjects.filter(p => isOverdue(p));
        }
    }

    // Search filter
    if (searchTerm) {
        filteredProjects = filteredProjects.filter(p => 
            p.client_name?.toLowerCase().includes(searchTerm) ||
            p.client_email?.toLowerCase().includes(searchTerm) ||
            p.service_type?.toLowerCase().includes(searchTerm) ||
            p.project_requirements?.toLowerCase().includes(searchTerm)
        );
    }

    console.log('Filtered to', filteredProjects.length, 'projects');
    renderProjectsTable(filteredProjects);
}

function showLoadingState() {
    const tbody = document.getElementById('projects-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading projects data...</p>
                </td>
            </tr>
        `;
    }
}

function showErrorState(error) {
    const tbody = document.getElementById('projects-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-danger py-4">
                    <i data-feather="alert-triangle" class="me-2"></i>
                    Error loading data: ${error.message}
                </td>
            </tr>
        `;
    }
    
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// Auto-refresh every 10 minutes
setInterval(() => {
    console.log('Auto-refreshing projects data...');
    clearProjectsCache();
    loadProjects();
}, 600000);

// Add spin animation for refresh button
const style = document.createElement('style');
style.textContent = `
    .spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Export untuk akses dari console browser
window.clearProjectsCache = clearProjectsCache;
window.refreshProjectsData = () => {
    clearProjectsCache();
    loadProjects();
};
