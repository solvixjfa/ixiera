// reports.js - ENHANCED ROBUST ANALYTICS
import { supabase, formatCurrency, formatDate } from './shared.js';
import { checkAuth, setupLogout, updateUserInfo } from './auth.js';

console.log('Reports JS loaded - ENHANCED ANALYTICS');

// Enhanced Cache configuration
const CACHE_KEYS = {
    REPORTS_DATA: 'reports_cache_v2',
    CHARTS_DATA: 'reports_charts_cache_v2',
    SERVICE_REVENUE: 'service_revenue_cache'
};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

let allReportsData = {};
let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing Enhanced Reports...');
    
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

    // Initialize enhanced reports
    await loadAllReportsData();
});

// ==================== ENHANCED REPORTS LOADING ====================
async function loadAllReportsData() {
    try {
        showLoadingState();

        // Load all reports data dengan enhanced service revenue
        const reportsData = await loadEnhancedReportsWithCache();
        allReportsData = reportsData;

        console.log('📊 Enhanced reports data loaded:', allReportsData);

        // Update all UI components
        updateFinancialStats(allReportsData);
        renderEnhancedCharts(allReportsData);
        updateRecentProjects(allReportsData.recentProjects);
        updatePerformanceMetrics(allReportsData);
        
        if (typeof feather !== 'undefined') {
            setTimeout(() => feather.replace(), 100);
        }
        
    } catch (error) {
        console.error('Error loading enhanced reports:', error);
        showErrorState(error);
        showToast('Error loading reports: ' + error.message, 'error');
    }
}

async function loadEnhancedReportsWithCache() {
    const cached = getCachedData(CACHE_KEYS.REPORTS_DATA);
    if (cached && await validateCachedData(cached)) {
        console.log('Using validated cached reports data');
        return cached;
    }

    console.log('🔄 Loading fresh enhanced reports data from Supabase...');
    
    const dateRange = getDateRange();
    
    // Load all data in parallel dengan enhanced service revenue
    const [
        projectsData,
        invoicesData,
        clientsData,
        revenueData,
        serviceRevenueData // NEW: Enhanced service revenue
    ] = await Promise.all([
        loadProjectsData(dateRange),
        loadInvoicesData(dateRange),
        loadClientsData(dateRange),
        loadRevenueData(dateRange),
        loadEnhancedServiceRevenue(dateRange) // NEW FUNCTION
    ]);

    // Process and combine data dengan service revenue yang akurat
    const reportsData = {
        ...projectsData,
        ...invoicesData,
        ...clientsData,
        ...revenueData,
        serviceRevenue: serviceRevenueData, // OVERRIDE dengan data yang akurat
        timestamp: new Date().toISOString(),
        dataVersion: 'v2-enhanced'
    };

    console.log('✅ Enhanced processed reports data:', reportsData);

    cacheData(CACHE_KEYS.REPORTS_DATA, reportsData);
    return reportsData;
}

// ==================== ENHANCED SERVICE REVENUE CALCULATION ====================
async function loadEnhancedServiceRevenue(dateRange) {
    try {
        console.log('🔄 Calculating enhanced service revenue...');
        
        // Method 1: Dari invoices yang sudah paid dengan service type
        const { data: paidInvoices, error: invoicesError } = await supabase
            .from('invoices')
            .select(`
                total_amount,
                service_type,
                project_inquiries (
                    service_type,
                    budget
                )
            `)
            .eq('status', 'paid')
            .gte('issue_date', dateRange.start)
            .lte('issue_date', dateRange.end);

        if (invoicesError) {
            console.error('Error loading paid invoices for service revenue:', invoicesError);
            return await calculateServiceRevenueFromProjects(dateRange);
        }

        // Process service revenue dari invoices
        const serviceRevenue = {};
        
        if (paidInvoices && paidInvoices.length > 0) {
            paidInvoices.forEach(invoice => {
                const serviceType = invoice.service_type || 
                                 (invoice.project_inquiries && invoice.project_inquiries.service_type) || 
                                 'Unknown Service';
                
                const amount = parseFloat(invoice.total_amount) || 0;
                
                if (!serviceRevenue[serviceType]) {
                    serviceRevenue[serviceType] = 0;
                }
                serviceRevenue[serviceType] += amount;
            });
        }

        // Jika data dari invoices kurang, tambahkan dari projects completed
        if (Object.keys(serviceRevenue).length === 0) {
            const projectBasedRevenue = await calculateServiceRevenueFromProjects(dateRange);
            Object.assign(serviceRevenue, projectBasedRevenue);
        }

        console.log('✅ Enhanced service revenue calculated:', serviceRevenue);
        return serviceRevenue;

    } catch (error) {
        console.error('Unexpected error in loadEnhancedServiceRevenue:', error);
        return await calculateServiceRevenueFromProjects(dateRange);
    }
}

async function calculateServiceRevenueFromProjects(dateRange) {
    try {
        const { data: completedProjects, error } = await supabase
            .from('project_inquiries')
            .select('service_type, budget, status')
            .eq('status', 'completed')
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end);

        if (error) {
            console.error('Error loading completed projects:', error);
            return {};
        }

        const serviceRevenue = {};
        
        if (completedProjects && completedProjects.length > 0) {
            completedProjects.forEach(project => {
                const serviceType = project.service_type || 'Unknown Service';
                const budget = parseBudget(project.budget);
                const revenue = budget * 1.11; // Include tax/PPN
                
                if (!serviceRevenue[serviceType]) {
                    serviceRevenue[serviceType] = 0;
                }
                serviceRevenue[serviceType] += revenue;
            });
        }

        return serviceRevenue;
    } catch (error) {
        console.error('Error in calculateServiceRevenueFromProjects:', error);
        return {};
    }
}

// ==================== VALIDATION FUNCTIONS ====================
async function validateCachedData(cachedData) {
    if (!cachedData) return false;
    
    // Check data version
    if (cachedData.dataVersion !== 'v2-enhanced') {
        console.log('🔄 Cache version outdated, refreshing...');
        return false;
    }
    
    // Check timestamp
    if (Date.now() - new Date(cachedData.timestamp).getTime() > CACHE_DURATION) {
        console.log('🔄 Cache expired, refreshing...');
        return false;
    }
    
    // Validate critical data structure
    if (!cachedData.serviceRevenue || typeof cachedData.serviceRevenue !== 'object') {
        console.log('🔄 Invalid service revenue data in cache, refreshing...');
        return false;
    }
    
    return true;
}

// ==================== ENHANCED CHARTS RENDERING ====================
function renderEnhancedCharts(reportsData) {
    // Enhanced Revenue Chart dengan data validation
    if (!reportsData.monthlyRevenue || reportsData.monthlyRevenue.length === 0) {
        renderEmptyChart('revenueChart', 'line', 'Revenue Trend - No Data Available');
    } else {
        renderEnhancedRevenueChart(reportsData.monthlyRevenue);
    }
    
    // Enhanced Projects Status Chart
    if (!reportsData.projectsByStatus || Object.keys(reportsData.projectsByStatus).length === 0) {
        renderEmptyChart('projectsStatusChart', 'doughnut', 'Projects Status - No Data Available');
    } else {
        renderEnhancedProjectsStatusChart(reportsData.projectsByStatus);
    }
    
    // Enhanced Invoice Status Chart
    if (!reportsData.invoicesByStatus || Object.keys(reportsData.invoicesByStatus).length === 0) {
        renderEmptyChart('invoiceStatusChart', 'pie', 'Invoice Status - No Data Available');
    } else {
        renderEnhancedInvoiceStatusChart(reportsData.invoicesByStatus);
    }
    
    // ENHANCED Service Type Chart dengan data yang akurat
    if (!reportsData.serviceRevenue || Object.keys(reportsData.serviceRevenue).length === 0) {
        renderEmptyChart('serviceTypeChart', 'bar', 'Service Performance - No Data Available');
    } else {
        renderEnhancedServiceTypeChart(reportsData.serviceRevenue);
    }
}

function renderEnhancedServiceTypeChart(serviceRevenue) {
    const ctx = document.getElementById('serviceTypeChart')?.getContext('2d');
    if (!ctx) return;
    
    if (charts.serviceTypeChart) {
        charts.serviceTypeChart.destroy();
    }

    const labels = Object.keys(serviceRevenue);
    const data = Object.values(serviceRevenue);
    
    // Sort by revenue (descending) untuk visualisasi yang lebih baik
    const sortedData = labels.map((label, index) => ({ label, revenue: data[index] }))
        .sort((a, b) => b.revenue - a.revenue);
    
    const sortedLabels = sortedData.map(item => item.label);
    const sortedRevenue = sortedData.map(item => item.revenue);

    // Color palette untuk services
    const serviceColors = {
        'Web Development': '#4f46e5',
        'Mobile App': '#7c3aed', 
        'UI/UX Design': '#a855f7',
        'Consultation': '#c084fc',
        'Maintenance': '#8b5cf6',
        'E-commerce': '#06b6d4',
        'SEO Optimization': '#10b981',
        'Digital Marketing': '#f59e0b'
    };

    const backgroundColors = sortedLabels.map(label => 
        serviceColors[label] || `#${Math.floor(Math.random()*16777215).toString(16)}`
    );

    charts.serviceTypeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: 'Revenue by Service Type',
                data: sortedRevenue,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Revenue: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    title: {
                        display: true,
                        text: 'Revenue (IDR)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Service Types'
                    }
                }
            }
        }
    });
}

function renderEnhancedRevenueChart(monthlyRevenue) {
    const ctx = document.getElementById('revenueChart')?.getContext('2d');
    if (!ctx) return;
    
    if (charts.revenueChart) {
        charts.revenueChart.destroy();
    }

    const labels = monthlyRevenue.map(item => {
        try {
            const [year, month] = item.month.split('-');
            return new Date(year, month - 1).toLocaleDateString('id-ID', { 
                month: 'short', 
                year: 'numeric' 
            });
        } catch (error) {
            return item.month;
        }
    });
    
    const data = monthlyRevenue.map(item => item.revenue);

    // Calculate trend line
    const trendLine = calculateTrendLine(data);

    charts.revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Actual Revenue',
                    data: data,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Trend',
                    data: trendLine,
                    borderColor: '#94a3b8',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Revenue Trend with Projection'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function renderEnhancedProjectsStatusChart(projectsByStatus) {
    const ctx = document.getElementById('projectsStatusChart')?.getContext('2d');
    if (!ctx) return;
    
    if (charts.projectsStatusChart) {
        charts.projectsStatusChart.destroy();
    }

    const statusColors = {
        'completed': '#10b981',
        'in progress': '#f59e0b',
        'pending': '#6b7280',
        'cancelled': '#ef4444',
        'unknown': '#9ca3af',
        'new': '#3b82f6',
        'contacted': '#8b5cf6',
        'quotation': '#f59e0b',
        'negotiation': '#f97316'
    };

    const labels = Object.keys(projectsByStatus);
    const data = Object.values(projectsByStatus);
    const backgroundColors = labels.map(status => statusColors[status] || '#9ca3af');

    charts.projectsStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.parsed / total) * 100);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderEnhancedInvoiceStatusChart(invoicesByStatus) {
    const ctx = document.getElementById('invoiceStatusChart')?.getContext('2d');
    if (!ctx) return;
    
    if (charts.invoiceStatusChart) {
        charts.invoiceStatusChart.destroy();
    }

    const statusColors = {
        'paid': '#10b981',
        'sent': '#f59e0b',
        'draft': '#6b7280',
        'overdue': '#ef4444',
        'unknown': '#9ca3af'
    };

    const labels = Object.keys(invoicesByStatus);
    const data = Object.values(invoicesByStatus);
    const backgroundColors = labels.map(status => statusColors[status] || '#9ca3af');

    charts.invoiceStatusChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.parsed / total) * 100);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderEmptyChart(canvasId, chartType, message) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const config = {
        type: chartType,
        data: {
            labels: ['No Data'],
            datasets: [{
                label: message,
                data: [1],
                backgroundColor: ['#6b7280'],
                borderColor: '#6b7280',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: message
                }
            }
        }
    };

    charts[canvasId] = new Chart(ctx, config);
}

// ==================== ENHANCED UI UPDATES ====================
function updateFinancialStats(data) {
    // Enhanced financial stats dengan validasi
    const totalRevenue = data.totalRevenue || 0;
    const serviceRevenueTotal = calculateTotalServiceRevenue(data.serviceRevenue || {});
    
    // Use the higher value antara totalRevenue dan serviceRevenueTotal
    const actualRevenue = Math.max(totalRevenue, serviceRevenueTotal);
    
    safeUpdateElement('total-revenue', formatCurrency(actualRevenue));
    safeUpdateElement('total-revenue-display', formatCurrency(actualRevenue));
    safeUpdateElement('pending-invoices', (data.pendingInvoices || 0).toString());
    safeUpdateElement('pending-amount', formatCurrency(data.pendingAmount || 0));
    safeUpdateElement('completed-projects', (data.completedProjects || 0).toString());
    safeUpdateElement('active-clients', (data.activeClients || 0).toString());
    
    // Enhanced growth calculations
    const revenueGrowth = calculateRevenueGrowth(actualRevenue, data.previousRevenue);
    const clientGrowth = data.newClients > 0 ? `${data.newClients} new` : '0';
    
    safeUpdateElement('revenue-growth-percent', revenueGrowth.percent);
    safeUpdateElement('revenue-growth', revenueGrowth.percent);
    safeUpdateElement('client-growth', clientGrowth);
    
    // Enhanced completion rate calculation
    const completionRate = data.totalProjects > 0 ? 
        Math.round((data.completedProjects / data.totalProjects) * 100) : 0;
    safeUpdateElement('completion-rate', completionRate + '%');
    
    // Update service revenue breakdown jika ada element-nya
    updateServiceRevenueBreakdown(data.serviceRevenue || {});
}

function calculateTotalServiceRevenue(serviceRevenue) {
    return Object.values(serviceRevenue).reduce((total, revenue) => total + revenue, 0);
}

function calculateRevenueGrowth(currentRevenue, previousRevenue) {
    if (!previousRevenue || previousRevenue === 0) {
        return {
            percent: currentRevenue > 0 ? '+100%' : '0%',
            trend: currentRevenue > 0 ? 'up' : 'neutral'
        };
    }
    
    const growth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    return {
        percent: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
        trend: growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral'
    };
}

function updateServiceRevenueBreakdown(serviceRevenue) {
    const container = document.getElementById('service-revenue-breakdown');
    if (!container) return;
    
    if (Object.keys(serviceRevenue).length === 0) {
        container.innerHTML = '<p class="text-muted">No service revenue data available</p>';
        return;
    }
    
    const breakdownHTML = Object.entries(serviceRevenue)
        .sort(([,a], [,b]) => b - a)
        .map(([service, revenue]) => `
            <div class="service-revenue-item">
                <span class="service-name">${service}</span>
                <span class="service-amount">${formatCurrency(revenue)}</span>
            </div>
        `).join('');
    
    container.innerHTML = breakdownHTML;
}

function updateRecentProjects(projects) {
    const tbody = document.getElementById('recent-projects-body');
    if (!tbody) {
        console.warn('Recent projects table body not found');
        return;
    }

    if (!projects || projects.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    No completed projects found in the selected period.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = projects.map(project => {
        const budget = parseBudget(project.budget);
        const revenue = budget * 1.11; // Include tax
        
        return `
        <tr>
            <td>
                <div class="pages-table-img">
                    <span class="user-3-icon">${project.service_type?.charAt(0) || 'P'}</span>
                </div>
                <div class="pages-table-text">
                    <span class="pages-table-title">${project.service_type || 'Project'}</span>
                </div>
            </td>
            <td>${project.client_name || 'Unknown Client'}</td>
            <td>${project.service_type || 'General'}</td>
            <td>${formatCurrency(budget)}</td>
            <td>${formatDate(project.created_at)}</td>
            <td>${formatCurrency(revenue)}</td>
            <td>
                <span class="badge-pill success">Completed</span>
            </td>
        </tr>
        `;
    }).join('');
    
    // Refresh feather icons setelah render table
    if (typeof feather !== 'undefined') {
        setTimeout(() => feather.replace(), 50);
    }
}

function updatePerformanceMetrics(data) {
    // Calculate performance metrics dengan error handling
    const conversionRate = data.totalProjects > 0 ? 
        Math.round((data.completedProjects / data.totalProjects) * 100) : 0;
    
    const avgProjectValue = data.completedProjects > 0 ?
        Math.round((data.totalRevenue || 0) / data.completedProjects) : 0;
    
    // Simplified retention calculation
    const retentionRate = data.activeClients > 10 ? 15 : (data.activeClients > 5 ? 8 : 0);

    safeUpdateElement('conversion-rate', conversionRate + '%');
    safeUpdateElement('avg-project-value', formatCurrency(avgProjectValue));
    safeUpdateElement('retention-rate', retentionRate + '%');
}

// ==================== DATA LOADING FUNCTIONS ====================
async function loadProjectsData(dateRange) {
    try {
        const { data: projects, error } = await supabase
            .from('project_inquiries')
            .select('*')
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading projects:', error);
            return { 
                projects: [], 
                projectsByStatus: {},
                completedProjects: 0,
                totalProjects: 0,
                recentProjects: []
            };
        }

        // Handle empty data
        if (!projects || projects.length === 0) {
            return {
                projects: [],
                projectsByStatus: {},
                completedProjects: 0,
                totalProjects: 0,
                recentProjects: []
            };
        }

        // Analyze projects data
        const projectsByStatus = projects.reduce((acc, project) => {
            const status = project.status || 'unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        const completedProjects = projects.filter(p => p.status === 'completed');
        const recentProjects = completedProjects.slice(0, 10);

        return {
            projects,
            projectsByStatus,
            completedProjects: completedProjects.length,
            totalProjects: projects.length,
            recentProjects
        };
    } catch (error) {
        console.error('Unexpected error in loadProjectsData:', error);
        return {
            projects: [],
            projectsByStatus: {},
            completedProjects: 0,
            totalProjects: 0,
            recentProjects: []
        };
    }
}

async function loadInvoicesData(dateRange) {
    try {
        const { data: invoices, error } = await supabase
            .from('invoices')
            .select('*')
            .gte('issue_date', dateRange.start)
            .lte('issue_date', dateRange.end)
            .order('issue_date', { ascending: false });

        if (error) {
            console.error('Error loading invoices:', error);
            return { 
                invoices: [], 
                invoicesByStatus: {}, 
                totalRevenue: 0,
                pendingInvoices: 0,
                pendingAmount: 0
            };
        }

        // Handle empty data
        if (!invoices || invoices.length === 0) {
            return {
                invoices: [],
                invoicesByStatus: {},
                totalRevenue: 0,
                pendingInvoices: 0,
                pendingAmount: 0
            };
        }

        // Analyze invoices data
        const invoicesByStatus = invoices.reduce((acc, invoice) => {
            const status = invoice.status || 'draft';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        const paidInvoices = invoices.filter(inv => inv.status === 'paid');
        const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
        const pendingInvoices = invoices.filter(inv => inv.status === 'sent');
        const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);

        return {
            invoices,
            invoicesByStatus,
            totalRevenue,
            pendingInvoices: pendingInvoices.length,
            pendingAmount
        };
    } catch (error) {
        console.error('Unexpected error in loadInvoicesData:', error);
        return {
            invoices: [],
            invoicesByStatus: {},
            totalRevenue: 0,
            pendingInvoices: 0,
            pendingAmount: 0
        };
    }
}

async function loadClientsData(dateRange) {
    try {
        const { data: clients, error } = await supabase
            .from('project_inquiries')
            .select('client_email, client_name, created_at')
            .not('client_email', 'is', null)
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end);

        if (error) {
            console.error('Error loading clients:', error);
            return { activeClients: 0, newClients: 0 };
        }

        // Handle empty data
        if (!clients || clients.length === 0) {
            return { activeClients: 0, newClients: 0 };
        }

        // Get unique clients
        const uniqueClients = [...new Set(clients.map(c => c.client_email).filter(email => email))];
        const newClients = clients.filter(c => 
            new Date(c.created_at) >= new Date(dateRange.start)
        ).length;

        return {
            activeClients: uniqueClients.length,
            newClients
        };
    } catch (error) {
        console.error('Unexpected error in loadClientsData:', error);
        return { activeClients: 0, newClients: 0 };
    }
}

async function loadRevenueData(dateRange) {
    try {
        // Get monthly revenue data for charts
        const { data: monthlyInvoices, error } = await supabase
            .from('invoices')
            .select('total_amount, issue_date, status')
            .eq('status', 'paid')
            .gte('issue_date', dateRange.start)
            .lte('issue_date', dateRange.end)
            .order('issue_date', { ascending: true });

        if (error) {
            console.error('Error loading revenue data:', error);
            return { monthlyRevenue: [], serviceRevenue: {} };
        }

        // Handle empty data
        if (!monthlyInvoices || monthlyInvoices.length === 0) {
            return { monthlyRevenue: [], serviceRevenue: {} };
        }

        // Process monthly revenue
        const monthlyRevenue = processMonthlyRevenue(monthlyInvoices);
        const serviceRevenue = processServiceRevenue(monthlyInvoices);

        return {
            monthlyRevenue,
            serviceRevenue
        };
    } catch (error) {
        console.error('Unexpected error in loadRevenueData:', error);
        return { monthlyRevenue: [], serviceRevenue: {} };
    }
}

function processMonthlyRevenue(invoices) {
    const monthlyData = {};
    
    invoices.forEach(invoice => {
        try {
            const date = new Date(invoice.issue_date);
            if (isNaN(date.getTime())) return; // Skip invalid dates
            
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = 0;
            }
            monthlyData[monthYear] += parseFloat(invoice.total_amount) || 0;
        } catch (error) {
            console.warn('Error processing invoice date:', error);
        }
    });

    // Sort by date
    return Object.entries(monthlyData)
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => a.month.localeCompare(b.month));
}

function processServiceRevenue(invoices) {
    // For now, return empty object - will be implemented with proper join later
    return {};
}

// ==================== UTILITY FUNCTIONS ====================
function getDateRange() {
    const periodSelect = document.getElementById('period-select');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    
    // Default values
    let startDate, endDate;
    const now = new Date();
    endDate = now.toISOString().split('T')[0];
    
    // Set default period jika tidak ada selection
    const period = periodSelect?.value || '30days';
    
    switch (period) {
        case '7days':
            startDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
            break;
        case '30days':
            startDate = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
            break;
        case '90days':
            startDate = new Date(now.setDate(now.getDate() - 90)).toISOString().split('T')[0];
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            break;
        case 'all':
        default:
            startDate = '2020-01-01'; // From beginning
            break;
    }
    
    // Update date inputs jika kosong
    if (dateFrom && !dateFrom.value) dateFrom.value = startDate;
    if (dateTo && !dateTo.value) dateTo.value = endDate;
    
    return { start: startDate, end: endDate };
}

function calculateTrendLine(data) {
    if (data.length < 2) return data;
    
    const n = data.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = data;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return x.map(xi => slope * xi + intercept);
}

// Enhanced parseBudget function
function parseBudget(budgetString) {
    if (!budgetString) return 0;
    
    // Handle numeric strings
    if (!isNaN(budgetString)) {
        return parseFloat(budgetString);
    }
    
    const budgetMap = {
        '< 1 jt': 1000000,
        '1 jt - 5 jt': 3000000,
        '5 jt - 10 jt': 7500000,
        '> 10 jt': 12000000,
        '< 1 juta': 1000000,
        '1 juta - 5 juta': 3000000,
        '5 juta - 10 juta': 7500000,
        '> 10 juta': 12000000
    };
    
    const mappedValue = budgetMap[budgetString.toLowerCase()];
    if (mappedValue) return mappedValue;
    
    // Extract numbers from string dengan regex yang lebih robust
    const numbers = budgetString.match(/\d+(?:\.\d+)?/g);
    if (numbers && numbers.length > 0) {
        const value = parseFloat(numbers[0]);
        // Handle "jt" atau "juta" multiplier
        if (budgetString.toLowerCase().includes('jt') || budgetString.toLowerCase().includes('juta')) {
            return value * 1000000;
        }
        return value;
    }
    
    return 0;
}

// ==================== CACHE SYSTEM ====================
function getCachedData(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        
        if (Date.now() - timestamp < CACHE_DURATION) {
            return data;
        }
        
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
        console.log('✅ Data cached for:', key);
    } catch (error) {
        console.warn('Cache write error:', error);
    }
}

function clearReportsCache() {
    Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    console.log('🗑️ Enhanced reports cache cleared');
}

// ==================== EVENT HANDLERS ====================
function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-reports');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i data-feather="refresh-cw" class="me-2 spin"></i>Refreshing...';
            
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            
            try {
                clearReportsCache();
                await loadAllReportsData();
                showToast('Reports data refreshed successfully!', 'success');
            } catch (error) {
                console.error('Refresh error:', error);
                showToast('Error refreshing data: ' + error.message, 'error');
            } finally {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = originalText;
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            }
        });
    }
    
    // Export button
    const exportBtn = document.getElementById('export-reports');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportReportsToCSV();
        });
    }
    
    // Date range filters
    const filters = ['period-select', 'date-from', 'date-to'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', async () => {
                try {
                    clearReportsCache();
                    await loadAllReportsData();
                } catch (error) {
                    console.error('Filter change error:', error);
                    showToast('Error applying filters: ' + error.message, 'error');
                }
            });
        }
    });
}

function exportReportsToCSV() {
    if (!allReportsData || Object.keys(allReportsData).length === 0) {
        showToast('No data available to export', 'error');
        return;
    }
    
    try {
        // Create CSV content
        let csvContent = "IXIERA ERP - Enhanced Reports Export\n\n";
        csvContent += `Generated: ${new Date().toLocaleString('id-ID')}\n`;
        csvContent += `Period: ${document.getElementById('date-from')?.value || 'N/A'} to ${document.getElementById('date-to')?.value || 'N/A'}\n\n`;
        
        // Financial Summary
        csvContent += "FINANCIAL SUMMARY\n";
        csvContent += `Total Revenue,${allReportsData.totalRevenue || 0}\n`;
        csvContent += `Service Revenue Total,${calculateTotalServiceRevenue(allReportsData.serviceRevenue || {})}\n`;
        csvContent += `Pending Invoices,${allReportsData.pendingInvoices || 0}\n`;
        csvContent += `Pending Amount,${allReportsData.pendingAmount || 0}\n`;
        csvContent += `Completed Projects,${allReportsData.completedProjects || 0}\n`;
        csvContent += `Active Clients,${allReportsData.activeClients || 0}\n\n`;
        
        // Service Revenue Breakdown
        csvContent += "SERVICE REVENUE BREAKDOWN\n";
        Object.entries(allReportsData.serviceRevenue || {}).forEach(([service, revenue]) => {
            csvContent += `${service},${revenue}\n`;
        });
        
        csvContent += "\n";
        
        // Projects by Status
        csvContent += "PROJECTS BY STATUS\n";
        Object.entries(allReportsData.projectsByStatus || {}).forEach(([status, count]) => {
            csvContent += `${status},${count}\n`;
        });
        
        csvContent += "\n";
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ixiera-enhanced-reports-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('Enhanced reports exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Error exporting reports: ' + error.message, 'error');
    }
}

// ==================== UI HELPERS ====================
function showLoadingState() {
    const tbody = document.getElementById('recent-projects-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 text-muted">Loading enhanced reports data...</p>
                </td>
            </tr>
        `;
    }
}

function showErrorState(error) {
    const tbody = document.getElementById('recent-projects-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger py-4">
                    <i data-feather="alert-triangle" class="me-2"></i>
                    Error loading enhanced reports: ${error.message}
                </td>
            </tr>
        `;
    }
    
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

function safeUpdateElement(elementId, text) {
    try {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    } catch (error) {
        console.warn(`Error updating element ${elementId}:`, error);
    }
}

function showToast(message, type = 'info') {
    try {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            font-family: system-ui, -apple-system, sans-serif;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 3000);
    } catch (error) {
        console.error('Toast error:', error);
    }
}

// ==================== GLOBAL EXPORTS ====================
window.clearEnhancedReportsCache = clearReportsCache;
window.loadEnhancedReports = loadAllReportsData;

// Enhanced auto-refresh dengan data validation
setInterval(async () => {
    console.log('🔄 Auto-refreshing enhanced reports data...');
    try {
        const freshData = await loadEnhancedReportsWithCache();
        if (await validateCachedData(freshData)) {
            allReportsData = freshData;
            updateFinancialStats(allReportsData);
            renderEnhancedCharts(allReportsData);
            console.log('✅ Enhanced reports auto-refreshed successfully');
        }
    } catch (error) {
        console.error('❌ Auto-refresh failed:', error);
    }
}, 900000);

// Add enhanced styles
const enhancedStyles = document.createElement('style');
enhancedStyles.textContent = `
    .spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .badge-pill {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 50px;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: capitalize;
    }
    
    .badge-pill.success {
        background: #d1fae5;
        color: #065f46;
    }
    
    .text-muted {
        color: #6b7280 !important;
    }
    
    .text-danger {
        color: #ef4444 !important;
    }
    
    /* Enhanced Reports Styles */
    .revenue-breakdown {
        background: #f8fafc;
        border-radius: 8px;
        padding: 1rem;
        margin-top: 1rem;
    }
    
    .service-revenue-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .service-revenue-item:last-child {
        border-bottom: none;
    }
    
    .service-name {
        font-weight: 500;
        color: #374151;
    }
    
    .service-amount {
        font-weight: 600;
        color: #059669;
    }
    
    .chart-container {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        margin-bottom: 1.5rem;
    }
    
    .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .chart-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
    }
    
    /* Trend indicators */
    .trend-up {
        color: #10b981;
    }
    
    .trend-down {
        color: #ef4444;
    }
    
    .trend-neutral {
        color: #6b7280;
    }
`;
document.head.appendChild(enhancedStyles);