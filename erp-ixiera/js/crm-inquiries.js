// crm-inquiries.js - FULLY FIXED VERSION
import { supabase, formatCurrency, formatDate } from './shared.js';
import { checkAuth, setupLogout, updateUserInfo } from './auth.js';

console.log('CRM Inquiries JS loaded - FIXED VERSION');

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing CRM Inquiries...');
    
    const auth = await checkAuth();
    if (!auth) return;
    
    const { session } = auth;
    updateUserInfo(session.user);
    setupLogout();

    await loadInquiries();
    setupEventListeners();
    setupRealtimeSync();
});

let allInquiries = [];

// REAL-TIME SYNC HANYA UNTUK PROJECT_INQUIRIES
function setupRealtimeSync() {
    console.log('🔄 Setting up real-time sync for PROJECT_INQUIRIES only...');
    
    const subscription = supabase
        .channel('crm-inquiries-sync')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'project_inquiries'
            },
            (payload) => {
                console.log('🔄 CRM: Real-time update received', payload);
                clearDashboardCache();
                loadInquiries();
            }
        )
        .subscribe();

    return subscription;
}

async function loadInquiries() {
    console.log('Loading inquiries...');
    
    try {
        showLoadingState();

        const { data: inquiries, error } = await supabase
            .from('project_inquiries')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('Inquiries loaded:', inquiries?.length);
        allInquiries = inquiries || [];
        
        updateStats(allInquiries);
        renderInquiriesTable(allInquiries);
        
    } catch (error) {
        console.error('Error loading inquiries:', error);
        showErrorState(error);
    }
}

function updateStats(inquiries) {
    const totalInquiries = inquiries.length;
    
    // New this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = inquiries.filter(inquiry => 
        new Date(inquiry.created_at) >= oneWeekAgo
    ).length;

    // Converted inquiries - SINKRON DENGAN DASHBOARD
    const converted = inquiries.filter(inquiry => 
        ['in-progress', 'development', 'design', 'revision', 'completed'].includes(inquiry.status)
    ).length;

    // Potential revenue
    const potentialRevenue = inquiries
        .filter(inquiry => inquiry.budget && !['lost', 'cancelled'].includes(inquiry.status))
        .reduce((sum, inquiry) => {
            const budget = parseBudget(inquiry.budget);
            return sum + (budget || 0);
        }, 0);

    safeUpdateElement('total-inquiries', totalInquiries.toLocaleString());
    safeUpdateElement('new-inquiries', newThisWeek.toLocaleString());
    safeUpdateElement('converted-inquiries', converted.toLocaleString());
    safeUpdateElement('potential-revenue', formatCurrency(potentialRevenue));
}

function renderInquiriesTable(inquiries) {
    const tbody = document.getElementById('inquiries-table-body');
    if (!tbody) return;
    
    if (inquiries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-muted">
                    No inquiries found. 
                    <a href="add-inquiry.html" class="btn-link">Add your first inquiry</a>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = inquiries.map(inquiry => `
        <tr>
            <td>
                <div style="display: flex; align-items: center;">
                    <div class="avatar-placeholder" style="width: 32px; height: 32px; background: #e9ecef; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 8px;">
                        ${(inquiry.client_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <strong>${inquiry.client_name || 'Unknown'}</strong>
                        ${inquiry.client_email ? `<br><small class="text-muted">${inquiry.client_email}</small>` : ''}
                    </div>
                </div>
            </td>
            <td>
                ${inquiry.client_email || '-'}
                ${inquiry.client_phone ? `<br><small>${inquiry.client_phone}</small>` : ''}
            </td>
            <td>${inquiry.service_type || 'General'}</td>
            <td>${inquiry.budget || 'Not specified'}</td>
            <td>${inquiry.deadline ? formatDate(inquiry.deadline) : '-'}</td>
            <td>
                <select class="status-select" data-id="${inquiry.id}" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ddd; font-size: 0.8rem; background: ${getStatusColor(inquiry.status)}; color: white;">
                    <option value="new" ${inquiry.status === 'new' ? 'selected' : ''}>New</option>
                    <option value="contacted" ${inquiry.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                    <option value="follow-up" ${inquiry.status === 'follow-up' ? 'selected' : ''}>Follow Up</option>
                    <option value="quotation" ${inquiry.status === 'quotation' ? 'selected' : ''}>Quotation</option>
                    <option value="negotiation" ${inquiry.status === 'negotiation' ? 'selected' : ''}>Negotiation</option>
                    <option value="in-progress" ${inquiry.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="development" ${inquiry.status === 'development' ? 'selected' : ''}>Development</option>
                    <option value="design" ${inquiry.status === 'design' ? 'selected' : ''}>Design</option>
                    <option value="revision" ${inquiry.status === 'revision' ? 'selected' : ''}>Revision</option>
                    <option value="completed" ${inquiry.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="delivered" ${inquiry.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="lost" ${inquiry.status === 'lost' ? 'selected' : ''}>Lost</option>
                    <option value="cancelled" ${inquiry.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>${formatDate(inquiry.created_at)}</td>
            <td>
                <div style="display: flex; gap: 0.25rem;">
                    <button class="btn btn-outline-primary btn-sm view-inquiry" data-id="${inquiry.id}" title="View Details">
                        <i data-feather="eye"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm delete-inquiry" data-id="${inquiry.id}" title="Delete">
                        <i data-feather="trash-2"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add event listeners untuk delete buttons
    document.querySelectorAll('.delete-inquiry').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const inquiryId = e.currentTarget.dataset.id;
            deleteInquiry(inquiryId);
        });
    });

    // Add event listeners untuk view buttons
    document.querySelectorAll('.view-inquiry').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const inquiryId = e.currentTarget.dataset.id;
            viewInquiryDetails(inquiryId);
        });
    });

    // Add status change listeners
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const inquiryId = e.target.dataset.id;
            const newStatus = e.target.value;
            updateInquiryStatus(inquiryId, newStatus);
        });
    });

    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// ✅ STATUS UPDATE - HANYA UPDATE STATUS DI PROJECT_INQUIRIES
async function updateInquiryStatus(inquiryId, newStatus) {
    try {
        console.log(`🔄 Updating inquiry ${inquiryId} to status: ${newStatus}`);
        
        // ✅ HANYA UPDATE STATUS - TIDAK ADA UPDATE KE CLIENTS TABLE
        const { error } = await supabase
            .from('project_inquiries')
            .update({ 
                status: newStatus
            })
            .eq('id', inquiryId);

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        // Clear dashboard cache untuk sinkronisasi
        clearDashboardCache();
        
        // Update UI langsung tanpa reload
        updateInquiryUI(inquiryId, newStatus);
        
        // Show success message
        showQuickMessage(`✅ Status updated to: ${formatStatusText(newStatus)}`, 'success');
        
    } catch (error) {
        console.error('❌ Error updating status:', error);
        showQuickMessage(`❌ Error: ${error.message}`, 'error');
    }
}

// ✅ DELETE INQUIRY - HANYA PROJECT_INQUIRIES
async function deleteInquiry(inquiryId) {
    if (!confirm('Are you sure you want to delete this inquiry? This action cannot be undone.')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('project_inquiries')
            .delete()
            .eq('id', inquiryId);

        if (error) throw error;

        // Clear cache setelah delete
        clearDashboardCache();
        
        // Remove dari local array
        allInquiries = allInquiries.filter(inquiry => inquiry.id !== inquiryId);
        
        // Update UI
        updateStats(allInquiries);
        renderInquiriesTable(allInquiries);
        
        showQuickMessage('✅ Inquiry deleted successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Error deleting inquiry:', error);
        showQuickMessage(`❌ Error: ${error.message}`, 'error');
    }
}

// Update UI langsung setelah status berubah
function updateInquiryUI(inquiryId, newStatus) {
    // Update select element
    const selectElement = document.querySelector(`.status-select[data-id="${inquiryId}"]`);
    if (selectElement) {
        selectElement.value = newStatus;
        selectElement.style.background = getStatusColor(newStatus);
    }
    
    // Update stats
    updateStats(allInquiries);
}

// ✅ CLEAR CACHE - HANYA CACHE YANG RELEVAN
function clearDashboardCache() {
    try {
        const cacheKeys = [
            'dashboard_cache',
            'leads_cache', 
            'crm_clients_cache',
            'financial_data',
            'newsletter_cache'
        ];
        
        cacheKeys.forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log('✅ All cache cleared for sync');
    } catch (error) {
        console.warn('Cache clear error:', error);
    }
}

// QUICK MESSAGE FUNCTION
function showQuickMessage(message, type = 'info') {
    // Remove existing message
    const existingMsg = document.getElementById('quick-message');
    if (existingMsg) existingMsg.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.id = 'quick-message';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-size: 0.9rem;
    `;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// VIEW INQUIRY DETAILS
function viewInquiryDetails(inquiryId) {
    const inquiry = allInquiries.find(i => i.id === inquiryId);
    if (inquiry) {
        const message = `
Client: ${inquiry.client_name || 'Unknown'}
Email: ${inquiry.client_email || '-'}
Phone: ${inquiry.client_phone || '-'}
Service: ${inquiry.service_type || 'General'}
Budget: ${inquiry.budget || 'Not specified'}
Status: ${formatStatusText(inquiry.status)}
Created: ${formatDate(inquiry.created_at)}
Requirements: ${inquiry.project_requirements || 'No requirements provided'}
        `.trim();
        
        alert(message);
    }
}

// GET STATUS COLOR
function getStatusColor(status) {
    const colorMap = {
        'new': '#6c757d',
        'contacted': '#17a2b8',
        'follow-up': '#fd7e14',
        'quotation': '#20c997',
        'negotiation': '#6610f2',
        'in-progress': '#007bff',
        'development': '#007bff',
        'design': '#007bff',
        'revision': '#ffc107',
        'completed': '#28a745',
        'delivered': '#28a745',
        'lost': '#dc3545',
        'cancelled': '#dc3545'
    };
    return colorMap[status] || '#6c757d';
}

// SETUP EVENT LISTENERS
function setupEventListeners() {
    const statusFilter = document.getElementById('status-filter');
    const serviceFilter = document.getElementById('service-filter');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    const globalSearch = document.getElementById('global-search');
    const refreshBtn = document.getElementById('refresh-btn');

    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (serviceFilter) serviceFilter.addEventListener('change', applyFilters);
    if (dateFrom) dateFrom.addEventListener('change', applyFilters);
    if (dateTo) dateTo.addEventListener('change', applyFilters);
    if (globalSearch) globalSearch.addEventListener('input', applyFilters);
    if (refreshBtn) refreshBtn.addEventListener('click', handleRefresh);
}

function handleRefresh() {
    clearDashboardCache();
    loadInquiries();
    showQuickMessage('✅ Data refreshed successfully!', 'success');
}

function applyFilters() {
    const statusFilter = document.getElementById('status-filter')?.value || '';
    const serviceFilter = document.getElementById('service-filter')?.value || '';
    const dateFrom = document.getElementById('date-from')?.value || '';
    const dateTo = document.getElementById('date-to')?.value || '';
    const searchTerm = document.getElementById('global-search')?.value.toLowerCase() || '';

    let filteredInquiries = allInquiries;

    if (statusFilter) {
        filteredInquiries = filteredInquiries.filter(inquiry => inquiry.status === statusFilter);
    }

    if (serviceFilter) {
        filteredInquiries = filteredInquiries.filter(inquiry => 
            inquiry.service_type?.toLowerCase().includes(serviceFilter.toLowerCase())
        );
    }

    if (dateFrom) {
        filteredInquiries = filteredInquiries.filter(inquiry => 
            new Date(inquiry.created_at) >= new Date(dateFrom)
        );
    }

    if (dateTo) {
        filteredInquiries = filteredInquiries.filter(inquiry => 
            new Date(inquiry.created_at) <= new Date(dateTo + 'T23:59:59')
        );
    }

    if (searchTerm) {
        filteredInquiries = filteredInquiries.filter(inquiry => 
            inquiry.client_name?.toLowerCase().includes(searchTerm) ||
            inquiry.client_email?.toLowerCase().includes(searchTerm) ||
            inquiry.project_requirements?.toLowerCase().includes(searchTerm) ||
            inquiry.service_type?.toLowerCase().includes(searchTerm)
        );
    }

    renderInquiriesTable(filteredInquiries);
}

// UTILITY FUNCTIONS
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

function formatStatusText(status) {
    const statusTextMap = {
        'new': 'New',
        'contacted': 'Contacted',
        'follow-up': 'Follow Up',
        'quotation': 'Quotation',
        'negotiation': 'Negotiation',
        'in-progress': 'In Progress',
        'development': 'Development',
        'design': 'Design',
        'revision': 'Revision',
        'completed': 'Completed',
        'delivered': 'Delivered',
        'lost': 'Lost',
        'cancelled': 'Cancelled'
    };
    return statusTextMap[status] || status || 'New';
}

function safeUpdateElement(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = text;
}

function showLoadingState() {
    const tbody = document.getElementById('inquiries-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;
    }
}

function showErrorState(error) {
    const tbody = document.getElementById('inquiries-table-body');
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
    
    if (typeof feather !== 'undefined') feather.replace();
}

// AUTO-REFRESH
setInterval(() => {
    console.log('🔄 Auto-refreshing CRM data...');
    loadInquiries();
}, 180000);

// GLOBAL FUNCTIONS
window.refreshCRM = function() {
    clearDashboardCache();
    loadInquiries();
    showQuickMessage('✅ CRM data refreshed!', 'success');
};

window.clearCRMCache = clearDashboardCache;