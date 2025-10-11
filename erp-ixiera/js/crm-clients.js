// CRM Clients.js - SIMPLE & WORKING VERSION
import { supabase, formatCurrency, formatDate } from './shared.js';
import { checkAuth, setupLogout, updateUserInfo } from './auth.js';

console.log('CRM Clients JS loaded - SIMPLE VERSION FROM PROJECT INQUIRIES');

let allClients = [];
const CACHE_KEY = 'crm_clients_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 menit

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing CRM Clients...');
    
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

    // Initialize clients management
    await loadClients();
    setupEventListeners();
});

async function loadClients() {
    console.log('Loading clients directly from project_inquiries...');
    
    try {
        showLoadingState();

        // Cek cache dulu
        const cached = getCachedClients();
        if (cached && Array.isArray(cached)) {
            console.log('Using cached clients data');
            allClients = cached;
            updateClientStats(allClients);
            renderClientsTable(allClients);
            return;
        }

        // ⚡ SIMPLE QUERY: Langsung dari project_inquiries tanpa JOIN
        const { data: inquiries, error } = await supabase
            .from('project_inquiries')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading inquiries:', error);
            throw error;
        }

        console.log('✅ Raw inquiries loaded:', inquiries?.length);
        
        // Transform inquiries menjadi clients data
        allClients = transformInquiriesToClients(inquiries || []);
        console.log('✅ Transformed clients:', allClients.length);
        
        // Simpan ke cache
        cacheClients(allClients);
        
        updateClientStats(allClients);
        renderClientsTable(allClients);
        
    } catch (error) {
        console.error('❌ Error loading clients:', error);
        showErrorState(error);
    }
}

function transformInquiriesToClients(inquiries) {
    // Group by client_email untuk aggregasi data
    const clientsMap = new Map();
    
    inquiries.forEach(inquiry => {
        const email = inquiry.client_email;
        
        if (!clientsMap.has(email)) {
            // Client baru
            clientsMap.set(email, {
                id: inquiry.id, // Use first inquiry ID
                contact_person: inquiry.client_name,
                email: inquiry.client_email,
                phone: inquiry.client_phone,
                company_name: `${inquiry.client_name}'s Company`,
                total_projects: 0,
                total_revenue: 0,
                last_project_date: null,
                status: 'active',
                client_type: 'regular',
                industry: 'technology',
                created_at: inquiry.created_at,
                inquiries: [] // Simpan semua inquiries
            });
        }
        
        const client = clientsMap.get(email);
        
        // Update statistics
        client.total_projects += 1;
        
        // Hitung revenue dari budget (completed projects only)
        if (inquiry.status === 'completed' && inquiry.budget) {
            const revenue = parseBudget(inquiry.budget);
            client.total_revenue += revenue;
        }
        
        // Update last project date
        if (!client.last_project_date || new Date(inquiry.created_at) > new Date(client.last_project_date)) {
            client.last_project_date = inquiry.created_at;
        }
        
        // Upgrade client type berdasarkan jumlah projects
        if (client.total_projects >= 3) {
            client.client_type = 'vip';
        }
        if (client.total_projects >= 5) {
            client.client_type = 'enterprise';
        }
        
        // Simpan inquiry detail
        client.inquiries.push({
            id: inquiry.id,
            service_type: inquiry.service_type,
            budget: inquiry.budget,
            status: inquiry.status,
            created_at: inquiry.created_at,
            deadline: inquiry.deadline,
            project_demo_url: inquiry.project_demo_url
        });
    });
    
    return Array.from(clientsMap.values());
}

function updateClientStats(clients) {
    if (!Array.isArray(clients)) {
        console.error('❌ clients is not an array:', clients);
        clients = [];
    }
    
    console.log('Updating stats with', clients.length, 'clients');
    
    const totalClients = clients.length;
    const activeClients = clients.filter(client => client.status === 'active').length;
    
    // Total revenue
    const totalRevenue = clients.reduce((sum, client) => {
        return sum + (client.total_revenue || 0);
    }, 0);

    // Average projects per client
    const totalProjects = clients.reduce((sum, client) => {
        return sum + (client.total_projects || 0);
    }, 0);
    const avgProjects = totalClients > 0 ? (totalProjects / totalClients).toFixed(1) : 0;

    // Safe DOM updates
    safeUpdateElement('total-clients', totalClients.toLocaleString());
    safeUpdateElement('active-clients', activeClients.toLocaleString());
    safeUpdateElement('total-revenue', formatCurrency(totalRevenue));
    safeUpdateElement('avg-projects', avgProjects);
}

function renderClientsTable(clients) {
    const tbody = document.getElementById('clients-table-body');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    if (!Array.isArray(clients)) {
        console.error('❌ clients is not an array in render:', clients);
        clients = [];
    }
    
    console.log('Rendering table with', clients.length, 'clients');
    
    if (clients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4 text-muted">
                    No clients found. Clients will appear here when you have project inquiries.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = clients.map(client => {
        const completedProjects = client.inquiries.filter(i => i.status === 'completed').length;
        const activeProjects = client.inquiries.filter(i => 
            ['in-progress', 'development', 'design', 'revision'].includes(i.status)
        ).length;

        return `
        <tr>
            <td>
                <div style="display: flex; align-items: center;">
                    <div class="avatar-placeholder">
                        ${(client.contact_person || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <strong>${client.contact_person || 'No Name'}</strong>
                        <br>
                        <small class="text-muted">
                            <span class="badge-${client.client_type || 'regular'}">
                                ${formatClientType(client.client_type)}
                            </span>
                        </small>
                    </div>
                </div>
            </td>
            <td>
                <strong>${client.company_name || '-'}</strong>
                ${client.industry ? `<br><small class="text-muted">${formatIndustry(client.industry)}</small>` : ''}
            </td>
            <td>
                ${client.email || '-'}
                ${client.phone ? `<br><small>${client.phone}</small>` : ''}
                ${getClientProjectsBadge(client.total_projects)}
            </td>
            <td>${formatIndustry(client.industry)}</td>
            <td>
                <div class="text-center">
                    <strong>${client.total_projects || 0}</strong>
                    <br><small class="text-muted">projects</small>
                    <br>
                    <small class="text-success">${completedProjects} completed</small>
                    <br>
                    <small class="text-warning">${activeProjects} active</small>
                </div>
            </td>
            <td>
                ${client.total_revenue > 0 ? `
                    <div class="revenue-badge">
                        ${formatCurrency(client.total_revenue)}
                    </div>
                ` : '<span class="text-muted">-</span>'}
            </td>
            <td>
                ${client.last_project_date ? formatDate(client.last_project_date) : '-'}
            </td>
            <td>
                <span class="badge-${client.status === 'active' ? 'active' : 'inactive'}">
                    ${client.status === 'active' ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 0.25rem;">
                    <button class="btn btn-outline-primary btn-sm view-client" data-email="${client.email}" title="View Details">
                        <i data-feather="eye"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm clear-cache" title="Refresh Data">
                        <i data-feather="refresh-cw"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');

    // Add event listeners
    addClientEventListeners();

    // Refresh Feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// Cache functions
function getCachedClients() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        
        if (Date.now() - timestamp < CACHE_DURATION && Array.isArray(data)) {
            return data;
        }
        
        localStorage.removeItem(CACHE_KEY);
        return null;
    } catch (error) {
        console.warn('Cache error:', error);
        return null;
    }
}

function cacheClients(clients) {
    try {
        if (!Array.isArray(clients)) {
            console.warn('Cannot cache: clients is not an array');
            return;
        }
        
        const cacheData = {
            data: clients,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        console.log('Clients data cached');
    } catch (error) {
        console.warn('Failed to cache clients:', error);
    }
}

function clearCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
        console.log('Clients cache cleared');
        loadClients();
    } catch (error) {
        console.warn('Failed to clear cache:', error);
    }
}

// Utility functions
function safeUpdateElement(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

function addClientEventListeners() {
    document.querySelectorAll('.view-client').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const clientEmail = e.currentTarget.dataset.email;
            viewClientDetails(clientEmail);
        });
    });

    document.querySelectorAll('.clear-cache').forEach(btn => {
        btn.addEventListener('click', (e) => {
            clearCache();
        });
    });
}

function viewClientDetails(clientEmail) {
    const client = allClients.find(c => c.email === clientEmail);
    if (!client) return;
    
    const completedProjects = client.inquiries.filter(i => i.status === 'completed').length;
    const activeProjects = client.inquiries.filter(i => 
        ['in-progress', 'development', 'design', 'revision'].includes(i.status)
    ).length;
    
    const projectList = client.inquiries.map(project => 
        `- ${project.service_type} (${project.status}): ${project.budget} - ${formatDate(project.created_at)}`
    ).join('\n');
    
    alert(`Client Details:\n
Name: ${client.contact_person}
Email: ${client.email}
Phone: ${client.phone || '-'}
Company: ${client.company_name || '-'}

Statistics:
Total Projects: ${client.total_projects}
Completed: ${completedProjects}
Active: ${activeProjects}
Total Revenue: ${formatCurrency(client.total_revenue)}
Client Type: ${formatClientType(client.client_type)}
Status: ${client.status}

Last Project: ${client.last_project_date ? formatDate(client.last_project_date) : 'Never'}

All Projects:
${projectList}`);
}

function formatClientType(type) {
    const typeMap = {
        'regular': 'Regular',
        'vip': 'VIP',
        'enterprise': 'Enterprise'
    };
    return typeMap[type] || type || 'Regular';
}

function formatIndustry(industry) {
    const industryMap = {
        'technology': 'Technology',
        'retail': 'Retail',
        'healthcare': 'Healthcare',
        'finance': 'Finance',
        'education': 'Education'
    };
    return industryMap[industry] || industry || 'Technology';
}

function getClientProjectsBadge(projectCount) {
    if (projectCount >= 5) {
        return '<br><small class="badge-vip">⭐ Premium Client</small>';
    } else if (projectCount >= 3) {
        return '<br><small class="badge-regular">👍 Regular Client</small>';
    }
    return '';
}

function parseBudget(budgetString) {
    if (!budgetString) return 0;
    
    const budgetMap = {
        '< 1 jt': 1000000,
        '1 jt - 5 jt': 3000000,
        '5 jt - 10 jt': 7500000,
        '> 10 jt': 12000000
    };
    
    const mappedValue = budgetMap[budgetString];
    if (mappedValue) return mappedValue;
    
    const value = budgetString.replace(/[^0-9]/g, '');
    return parseFloat(value) || 0;
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    const statusFilter = document.getElementById('status-filter');
    const typeFilter = document.getElementById('type-filter');
    const industryFilter = document.getElementById('industry-filter');
    const sizeFilter = document.getElementById('size-filter');
    const globalSearch = document.getElementById('global-search');

    [statusFilter, typeFilter, industryFilter, sizeFilter, globalSearch].forEach(element => {
        if (element) {
            element.addEventListener('change', applyFilters);
            element.addEventListener('input', applyFilters);
        }
    });
}

function applyFilters() {
    console.log('Applying filters...');
    
    const statusFilter = document.getElementById('status-filter')?.value || '';
    const typeFilter = document.getElementById('type-filter')?.value || '';
    const industryFilter = document.getElementById('industry-filter')?.value || '';
    const searchTerm = document.getElementById('global-search')?.value.toLowerCase() || '';

    let filteredClients = Array.isArray(allClients) ? allClients : [];

    if (statusFilter) {
        filteredClients = filteredClients.filter(client => client.status === statusFilter);
    }

    if (typeFilter) {
        filteredClients = filteredClients.filter(client => client.client_type === typeFilter);
    }

    if (industryFilter) {
        filteredClients = filteredClients.filter(client => 
            client.industry?.toLowerCase().includes(industryFilter.toLowerCase())
        );
    }

    if (searchTerm) {
        filteredClients = filteredClients.filter(client => 
            client.contact_person?.toLowerCase().includes(searchTerm) ||
            client.company_name?.toLowerCase().includes(searchTerm) ||
            client.email?.toLowerCase().includes(searchTerm)
        );
    }

    console.log('Filtered to', filteredClients.length, 'clients');
    renderClientsTable(filteredClients);
}

function showLoadingState() {
    const tbody = document.getElementById('clients-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading clients from project inquiries...</p>
                </td>
            </tr>
        `;
    }
}

function showErrorState(error) {
    const tbody = document.getElementById('clients-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-danger py-4">
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
    clearCache();
    loadClients();
}, 600000);