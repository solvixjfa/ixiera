// dashboard.js - FIXED WITH CLIENTS TABLE
import { supabase, formatCurrency, formatDate } from './shared.js';
import { checkAuth, setupLogout, updateUserInfo } from './auth.js';

// Cache configuration
const CACHE_KEYS = {
    DASHBOARD_DATA: 'dashboard_cache',
    LEADS_DATA: 'leads_cache', 
    CLIENTS_DATA: 'crm_clients_cache',
    FINANCIAL_DATA: 'financial_data'
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const auth = await checkAuth();
    if (!auth) return;
    
    const { session, adminUser } = auth;
    updateUserInfo(session.user);
    setupLogout();

    // Setup real-time sync
    setupRealtimeSync();

    // Initialize dashboard dengan cache
    await loadDashboardData();
    setupCharts();
    setupNotifications();
});

// REAL-TIME SYNC DENGAN CLIENTS TABLE
function setupRealtimeSync() {
    console.log('🔄 Setting up real-time sync with clients table...');
    
    // Listen for project_inquiries changes
    const subscription = supabase
        .channel('dashboard-sync')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'project_inquiries' },
            (payload) => {
                console.log('🔄 Dashboard: Project inquiries update received', payload);
                clearAllCache();
                loadDashboardData();
            }
        )
        .subscribe();

    // Listen untuk clients table - SEKARANG ADA TABELNYA
    const clientsSubscription = supabase
        .channel('dashboard-clients-sync')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'clients' },
            (payload) => {
                console.log('🔄 Dashboard: Clients table update', payload);
                clearAllCache();
                loadDashboardData();
            }
        )
        .subscribe();

    // Listen untuk invoices changes
    const invoicesSubscription = supabase
        .channel('dashboard-invoices')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'invoices' },
            (payload) => {
                console.log('🔄 Dashboard: Invoices update received', payload);
                clearAllCache();
                loadDashboardData();
            }
        )
        .subscribe();
}

async function loadDashboardData() {
    try {
        showLoadingState();

        // Cek cache dulu untuk semua data
        const cachedDashboard = getCachedData(CACHE_KEYS.DASHBOARD_DATA);
        if (cachedDashboard) {
            console.log('📦 Using cached dashboard data');
            updateDashboardUI(cachedDashboard);
            return;
        }

        // Load multiple data sources in parallel
        const [
            leadsData,
            newsletterData,
            clientsData,
            financialData
        ] = await Promise.all([
            getLeadsDataWithCache(),
            getNewsletterDataWithCache(),
            getClientsDataWithCache(), // ✅ SEKARANG DARI CLIENTS TABLE
            getFinancialDataWithCache()
        ]);

        // Pastikan semua variable terdefinisi
        const { 
            leads = [], 
            totalLeads = 0, 
            newLeadsThisMonth = 0, 
            leadGrowth = '0%', 
            activeProjects = 0, 
            completedProjects = 0, 
            totalRevenue = 0 
        } = leadsData || {};
        
        const newsletterSubscribers = newsletterData || 0;
        const totalClients = clientsData || 0;
        const { pendingInvoices = 0, pendingRevenue = 0 } = financialData || {};

        // Calculate completion rate
        const totalProjects = totalLeads;
        const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

        // Prepare data untuk cache
        const dashboardData = {
            leads, 
            totalLeads, 
            newLeadsThisMonth, 
            leadGrowth, 
            activeProjects, 
            completedProjects, 
            totalRevenue,
            newsletterSubscribers, 
            totalClients,
            pendingInvoices,
            pendingRevenue,
            completionRate,
            timestamp: Date.now()
        };

        // Simpan ke cache
        cacheData(CACHE_KEYS.DASHBOARD_DATA, dashboardData);

        // Update UI
        updateDashboardUI(dashboardData);
        
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        showErrorState(error);
    }
}

async function getFinancialDataWithCache() {
    const cached = getCachedData(CACHE_KEYS.FINANCIAL_DATA);
    if (cached) return cached;

    // Hitung pending invoices (status = 'sent') dan total amount-nya
    const { data: pendingInvoicesData, error } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'sent');

    const pendingInvoicesCount = pendingInvoicesData ? pendingInvoicesData.length : 0;
    
    // Hitung total pending revenue
    const pendingRevenue = pendingInvoicesData ? 
        pendingInvoicesData.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) : 0;

    const financialData = {
        pendingInvoices: pendingInvoicesCount,
        pendingRevenue: pendingRevenue
    };

    cacheData(CACHE_KEYS.FINANCIAL_DATA, financialData);
    return financialData;
}

async function getLeadsDataWithCache() {
    // Cek cache untuk leads data
    const cachedLeads = getCachedData(CACHE_KEYS.LEADS_DATA);
    if (cachedLeads) {
        console.log('📦 Using cached leads data');
        return cachedLeads;
    }

    // Get all inquiries for calculations
    const { data: allLeads, error: leadsError } = await supabase
        .from('project_inquiries')
        .select('*')
        .order('created_at', { ascending: false });

    if (leadsError) throw leadsError;

    // Get recent leads for table (limit 5)
    const recentLeads = allLeads ? allLeads.slice(0, 5) : [];

    // Calculate metrics dengan default values
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const totalLeads = allLeads ? allLeads.length : 0;
    const newLeadsThisMonth = allLeads ? allLeads.filter(lead => 
        new Date(lead.created_at) >= firstDayOfMonth
    ).length : 0;

    const newLeadsLastMonth = allLeads ? allLeads.filter(lead => 
        new Date(lead.created_at) >= firstDayOfLastMonth && 
        new Date(lead.created_at) < firstDayOfMonth
    ).length : 0;

    const leadGrowth = newLeadsLastMonth === 0 ? 
        (newLeadsThisMonth > 0 ? '+100%' : '0%') :
        `${(((newLeadsThisMonth - newLeadsLastMonth) / newLeadsLastMonth) * 100).toFixed(1)}%`;

    const activeProjects = allLeads ? allLeads.filter(lead => 
        ['in-progress', 'development', 'design', 'revision'].includes(lead.status)
    ).length : 0;

    const completedProjects = allLeads ? allLeads.filter(lead => 
        lead.status === 'completed'
    ).length : 0;

    // Calculate revenue (simplified - using budget field)
    const totalRevenue = allLeads ? allLeads
        .filter(lead => lead.status === 'completed' && lead.budget)
        .reduce((sum, lead) => {
            const budget = parseBudget(lead.budget);
            return sum + (budget || 0);
        }, 0) : 0;

    const leadsData = {
        leads: recentLeads,
        totalLeads,
        newLeadsThisMonth,
        leadGrowth,
        activeProjects,
        completedProjects,
        totalRevenue
    };

    // Cache leads data
    cacheData(CACHE_KEYS.LEADS_DATA, leadsData);

    return leadsData;
}

async function getNewsletterDataWithCache() {
    // Cache sederhana untuk newsletter (data jarang berubah)
    const cached = localStorage.getItem('newsletter_cache');
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
            return data;
        }
    }

    const { count: newsletterSubscribers, error: newsletterError } = await supabase
        .from('newsletter_subscribers')
        .select('id', { count: 'exact', head: true });

    if (newsletterError) {
        console.error('Error fetching newsletter:', newsletterError);
        return 0;
    }

    const result = newsletterSubscribers || 0;
    
    // Cache newsletter data
    localStorage.setItem('newsletter_cache', JSON.stringify({
        data: result,
        timestamp: Date.now()
    }));

    return result;
}

async function getClientsDataWithCache() {
    const cachedClients = getCachedData(CACHE_KEYS.CLIENTS_DATA);
    if (cachedClients) {
        console.log('📦 Using cached clients data');
        return Array.isArray(cachedClients) ? cachedClients.length : 0;
    }

    try {
        // ✅ SEKARANG AMBIL DARI CLIENTS TABLE YANG SUDAH ADA
        console.log('🔄 Counting clients from clients table...');
        const { count: clientsCount, error } = await supabase
            .from('clients')
            .select('id', { count: 'exact', head: true });

        if (error) {
            console.error('Error fetching clients:', error);
            return 0;
        }

        const totalClients = clientsCount || 0;
        console.log(`✅ Total clients from clients table: ${totalClients}`);
        
        // Cache hasil
        cacheData(CACHE_KEYS.CLIENTS_DATA, { totalClients });
        
        return totalClients;

    } catch (error) {
        console.error('❌ Error getting clients data:', error);
        return 0;
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
        console.log('💾 Data cached for:', key);
    } catch (error) {
        console.warn('Cache write error:', error);
    }
}

function clearAllCache() {
    Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    localStorage.removeItem('newsletter_cache');
    console.log('🗑️ All dashboard cache cleared');
}

// Manual refresh function (bisa dipanggil dari UI)
window.refreshDashboard = async function() {
    clearAllCache();
    await loadDashboardData();
    showToast('Dashboard data refreshed!', 'success');
};

function updateDashboardUI(data) {
    // Berikan default values
    const {
        leads = [],
        totalLeads = 0,
        newLeadsThisMonth = 0,
        leadGrowth = '0%',
        activeProjects = 0,
        completedProjects = 0,
        totalRevenue = 0,
        newsletterSubscribers = 0,
        totalClients = 0,
        pendingInvoices = 0,
        pendingRevenue = 0,
        completionRate = 0
    } = data || {};

    // Update all UI elements
    updateStatsCards(totalLeads, newLeadsThisMonth, leadGrowth, activeProjects, completedProjects, totalRevenue, newsletterSubscribers, completionRate);
    updateQuickStats(newLeadsThisMonth, activeProjects, totalClients, pendingInvoices, pendingRevenue);
    updateRecentLeads(leads);
    updateNotifications(newLeadsThisMonth, activeProjects);
}

function updateStatsCards(totalLeads, newLeadsThisMonth, leadGrowth, activeProjects, completedProjects, totalRevenue, newsletterSubscribers, completionRate) {
    // Update main stats cards
    safeUpdateElement('total-leads', totalLeads.toLocaleString());
    safeUpdateElement('leads-growth', leadGrowth);
    
    safeUpdateElement('active-projects', activeProjects);
    safeUpdateElement('projects-growth', '+0%');
    
    safeUpdateElement('total-revenue', formatCurrency(totalRevenue));
    safeUpdateElement('revenue-growth', '+0%');
    
    safeUpdateElement('newsletter-subs', newsletterSubscribers.toLocaleString());
    safeUpdateElement('subs-growth', '+0%');
    
    // TAMBAHKAN COMPLETED PROJECTS
    safeUpdateElement('completed-projects', completedProjects);
    safeUpdateElement('completion-rate', `${completionRate}%`);
}

function updateQuickStats(newLeadsThisMonth, activeProjects, totalClients, pendingInvoices = 0, pendingRevenue = 0) {
    // Update quick stats in sidebar - SINKRON DENGAN CRM CLIENTS
    safeUpdateElement('new-leads-badge', newLeadsThisMonth);
    safeUpdateElement('leads-week-growth', `+${newLeadsThisMonth}`);
    
    safeUpdateElement('active-projects-badge', activeProjects);
    safeUpdateElement('total-clients-badge', totalClients);
    
    // SEKARANG REAL DATA DARI INVOICES
    safeUpdateElement('pending-invoices-badge', pendingInvoices);
    
    // UPDATE PENDING REVENUE DI STATS CARDS
    safeUpdateElement('pending-revenue', formatCurrency(pendingRevenue));
    safeUpdateElement('pending-invoices-count', pendingInvoices);
}

function updateRecentLeads(leads) {
    const tbody = document.getElementById('recent-leads-body');
    
    if (!leads || leads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    No leads found. New leads will appear here.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = leads.map(lead => `
        <tr>
            <td>
                <div class="pages-table-img">
                    <div class="avatar-placeholder" style="width: 32px; height: 32px; background: #e9ecef; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 8px;">
                        ${(lead.client_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    ${lead.client_name || 'Unknown'}
                </div>
            </td>
            <td>${lead.client_email || '-'}</td>
            <td>${lead.service_type || 'General'}</td>
            <td>${lead.budget || 'Not specified'}</td>
            <td>
                <span class="badge-${getStatusClass(lead.status)}">
                    ${formatStatusText(lead.status)}
                </span>
            </td>
            <td>${formatDate(lead.created_at)}</td>
            <td>
                <span class="p-relative">
                    <button class="dropdown-btn transparent-btn" type="button" title="More info" onclick="viewLead('${lead.id}')">
                        <div class="sr-only">More info</div>
                        <i data-feather="eye" aria-hidden="true"></i>
                    </button>
                </span>
            </td>
        </tr>
    `).join('');

    // Refresh Feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

function updateNotifications(newLeads, urgentProjects) {
    // Update notification counts
    safeUpdateElement('new-leads-count', `${newLeads} new leads`);
    safeUpdateElement('urgent-projects-count', `${urgentProjects} urgent projects`);
    
    // Show notification icon if there are new items
    const notificationIcon = document.getElementById('notification-icon');
    if (notificationIcon && (newLeads > 0 || urgentProjects > 0)) {
        notificationIcon.classList.add('active');
    }
}

// Utility function untuk safe DOM updates
function safeUpdateElement(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
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
        document.body.removeChild(toast);
    }, 3000);
}

// Existing functions tetap sama...
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

function getStatusClass(status) {
    const statusMap = {
        'new': 'pending',
        'contacted': 'active', 
        'follow-up': 'active',
        'quotation': 'warning',
        'negotiation': 'warning',
        'design': 'active',
        'development': 'active',
        'in-progress': 'active',
        'revision': 'warning',
        'completed': 'success',
        'delivered': 'success',
        'cancelled': 'danger',
        'lost': 'danger'
    };
    return statusMap[status] || 'pending';
}

function formatStatusText(status) {
    const statusTextMap = {
        'new': 'New',
        'contacted': 'Contacted',
        'follow-up': 'Follow Up',
        'quotation': 'Quotation',
        'negotiation': 'Negotiation',
        'design': 'Design',
        'development': 'Development',
        'in-progress': 'In Progress',
        'revision': 'Revision',
        'completed': 'Completed',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled',
        'lost': 'Lost'
    };
    return statusTextMap[status] || status || 'New';
}

function setupCharts() {
    setTimeout(() => {
        createLeadsChart();
        createProjectsChart();
    }, 1000);
}

function createLeadsChart() {
    const ctx = document.getElementById('leadsChart');
    if (!ctx) return;

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Leads',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createProjectsChart() {
    const ctx = document.getElementById('projectsChart');
    if (!ctx) return;

    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'Completed', 'Pending'],
            datasets: [{
                data: [5, 3, 2],
                backgroundColor: [
                    '#4f46e5',
                    '#10b981', 
                    '#f59e0b'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            cutout: '70%'
        }
    });
}

function showLoadingState() {
    const tbody = document.getElementById('recent-leads-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;
    }
}

function showErrorState(error) {
    const tbody = document.getElementById('recent-leads-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger py-4">
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

// Global function for navigation
window.viewLead = (leadId) => {
    window.location.href = `crm-inquiries.html?lead=${leadId}`;
};

// Auto-refresh data every 5 minutes (lebih lama karena pakai cache)
setInterval(() => {
    console.log('🔄 Auto-refreshing dashboard data...');
    loadDashboardData();
}, 300000);

// Export untuk akses dari console browser
window.clearDashboardCache = clearAllCache;