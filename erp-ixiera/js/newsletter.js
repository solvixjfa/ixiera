// newsletter.js - CLEAN & STRUCTURED
import { supabase, formatDate } from './shared.js';
import { checkAuth, setupLogout, updateUserInfo } from './auth.js';

console.log('Newsletter JS loaded');

let newsletterData = {};

document.addEventListener('DOMContentLoaded', async () => {
    const auth = await checkAuth();
    if (!auth) return;
    
    const { session } = auth;
    updateUserInfo(session.user);
    setupLogout();
    setupEventListeners();
    await loadNewsletterData();
});

// Setup event listeners
function setupEventListeners() {
    // Refresh button - fix selector
    const refreshBtn = document.getElementById('refresh-newsletter');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }

    // Add subscriber button - fix selector
    const addSubscriberBtn = document.getElementById('add-subscriber');
    if (addSubscriberBtn) {
        addSubscriberBtn.addEventListener('click', () => {
            // Check if bootstrap modal is available
            if (typeof bootstrap !== 'undefined' && document.getElementById('addSubscriberModal')) {
                new bootstrap.Modal(document.getElementById('addSubscriberModal')).show();
            } else {
                // Fallback: show alert or create modal dynamically
                alert('Modal functionality not available');
            }
        });
    }

    // Save subscriber form - fix selector
    const saveSubscriberBtn = document.getElementById('save-subscriber');
    if (saveSubscriberBtn) {
        saveSubscriberBtn.addEventListener('click', addNewSubscriber);
    }

    // Search functionality
    const searchInput = document.getElementById('newsletter-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchSubscribers(e.target.value);
        });
    }

    // Update table count when data loads
    updateTableCount();
}

// Handle refresh with loading state
async function handleRefresh() {
    const refreshBtn = document.getElementById('refresh-newsletter');
    if (!refreshBtn) return;

    // Store original state
    const originalHTML = refreshBtn.innerHTML;
    const originalTitle = refreshBtn.title;
    
    // Update button state
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i data-feather="refresh-cw" class="me-2"></i>Refreshing...';
    refreshBtn.title = 'Refreshing data...';
    
    // Refresh feather icons if available
    if (typeof feather !== 'undefined') feather.replace();
    
    try {
        await loadNewsletterData();
        showToast('Data refreshed successfully', 'success');
    } catch (error) {
        console.error('Refresh error:', error);
        showToast('Error refreshing data', 'error');
    } finally {
        // Restore button state
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalHTML;
        refreshBtn.title = originalTitle;
        if (typeof feather !== 'undefined') feather.replace();
    }
}

// Load newsletter data
async function loadNewsletterData() {
    try {
        showLoadingState();

        // Simulate API call with timeout for demo
        const { data: subscribers, error } = await supabase
            .from('newsletter_subscribers')
            .select('*')
            .order('subscribed_at', { ascending: false });

        if (error) throw error;

        newsletterData = { subscribers: subscribers || [] };
        updateUI(newsletterData);
        
    } catch (error) {
        console.error('Error loading newsletter:', error);
        showErrorState();
        showToast('Failed to load newsletter data', 'error');
    }
}

// Update all UI components
function updateUI(data) {
    updateNewsletterStats(data);
    renderSubscribersTable(data.subscribers);
    updateTableCount();
}

// Update table count
function updateTableCount() {
    const tableCount = document.getElementById('table-count');
    if (tableCount && newsletterData.subscribers) {
        const count = newsletterData.subscribers.length;
        tableCount.textContent = `Showing ${count} subscriber${count !== 1 ? 's' : ''}`;
    }
}

// Update stats cards
function updateNewsletterStats(data) {
    const subscribers = data.subscribers || [];
    const total = subscribers.length;
    
    // Calculate new subscribers this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const newThisMonth = subscribers.filter(sub => {
        const subDate = new Date(sub.subscribed_at);
        return subDate >= thisMonth;
    }).length;
    
    // Calculate growth percentage
    const lastMonthCount = subscribers.filter(sub => {
        const subDate = new Date(sub.subscribed_at);
        const lastMonth = new Date(thisMonth);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return subDate >= lastMonth && subDate < thisMonth;
    }).length;
    
    const monthGrowth = lastMonthCount > 0 ? 
        Math.round(((newThisMonth - lastMonthCount) / lastMonthCount) * 100) : 
        (newThisMonth > 0 ? 100 : 0);

    // Update stats elements
    const elements = {
        'total-subscribers': total.toLocaleString(),
        'active-subscribers': total.toLocaleString(), // Assuming all are active
        'new-this-month': newThisMonth.toLocaleString(),
        'total-campaigns': '3', // Static for now
        'subscribers-growth': `${newThisMonth} new`,
        'active-rate': '100%',
        'month-growth': `${monthGrowth}%`,
        'campaigns-growth': 'Export'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Render subscribers table
function renderSubscribersTable(subscribers) {
    const tbody = document.getElementById('subscribers-body');
    if (!tbody) return;

    if (!subscribers || subscribers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-muted">
                    <i data-feather="users" class="me-2"></i>
                    No subscribers found
                </td>
            </tr>
        `;
        if (typeof feather !== 'undefined') feather.replace();
        return;
    }

    tbody.innerHTML = subscribers.map(subscriber => `
        <tr>
            <td>
                <div class="pages-table-text">
                    <span class="pages-table-title">${escapeHtml(subscriber.email)}</span>
                </div>
            </td>
            <td>${escapeHtml(subscriber.name || '-')}</td>
            <td>
                <span class="badge bg-secondary">${escapeHtml(subscriber.source || 'website')}</span>
            </td>
            <td>${formatDate(subscriber.subscribed_at)}</td>
            <td>
                <button class="btn btn-outline-danger btn-sm" onclick="window.deleteSubscriber('${subscriber.id}')">
                    <i data-feather="trash-2"></i>
                </button>
            </td>
        </tr>
    `).join('');

    if (typeof feather !== 'undefined') feather.replace();
}

// Add new subscriber
async function addNewSubscriber() {
    const emailInput = document.getElementById('subscriber-email');
    const nameInput = document.getElementById('subscriber-name');
    const phoneInput = document.getElementById('subscriber-phone');
    const sourceInput = document.getElementById('subscriber-source');

    if (!emailInput || !nameInput || !phoneInput || !sourceInput) {
        showToast('Form elements not found', 'error');
        return;
    }

    const email = emailInput.value.trim();
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const source = sourceInput.value;

    if (!email) {
        showToast('Email is required', 'error');
        emailInput.focus();
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        emailInput.focus();
        return;
    }

    try {
        const { error } = await supabase
            .from('newsletter_subscribers')
            .insert([{
                email,
                name: name || null,
                phone: phone || null,
                source: source || 'admin-dashboard',
                subscribed_at: new Date().toISOString()
            }]);

        if (error) {
            if (error.code === '23505') {
                showToast('Email address already exists', 'error');
            } else {
                throw error;
            }
            return;
        }

        // Close modal and reset form
        const modal = document.getElementById('addSubscriberModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        }
        
        const form = document.getElementById('add-subscriber-form');
        if (form) form.reset();

        // Reload data
        await loadNewsletterData();
        showToast('Subscriber added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding subscriber:', error);
        showToast('Failed to add subscriber', 'error');
    }
}

// Delete subscriber
async function deleteSubscriber(id) {
    if (!id) {
        showToast('Invalid subscriber ID', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this subscriber?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('newsletter_subscribers')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await loadNewsletterData();
        showToast('Subscriber deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting subscriber:', error);
        showToast('Failed to delete subscriber', 'error');
    }
}

// Search subscribers
function searchSubscribers(query) {
    if (!query.trim()) {
        renderSubscribersTable(newsletterData.subscribers || []);
        updateTableCount();
        return;
    }

    const filtered = (newsletterData.subscribers || []).filter(sub =>
        sub.email.toLowerCase().includes(query.toLowerCase()) ||
        (sub.name && sub.name.toLowerCase().includes(query.toLowerCase())) ||
        (sub.source && sub.source.toLowerCase().includes(query.toLowerCase()))
    );

    renderSubscribersTable(filtered);
    
    // Update table count for search results
    const tableCount = document.getElementById('table-count');
    if (tableCount) {
        tableCount.textContent = `Showing ${filtered.length} of ${newsletterData.subscribers.length} subscribers`;
    }
}

// UI helpers
function showLoadingState() {
    const tbody = document.getElementById('subscribers-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 text-muted">Loading subscribers...</p>
                </td>
            </tr>
        `;
    }
}

function showErrorState() {
    const tbody = document.getElementById('subscribers-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger py-4">
                    <i data-feather="alert-triangle" class="me-2"></i>
                    Error loading newsletter data
                    <br>
                    <small class="text-muted">Please try refreshing the page</small>
                </td>
            </tr>
        `;
    }
    if (typeof feather !== 'undefined') feather.replace();
}

function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-weight: 500;
        max-width: 300px;
        word-wrap: break-word;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// Utility function to escape HTML
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Global functions
window.exportSubscribers = function() {
    if (!newsletterData.subscribers || newsletterData.subscribers.length === 0) {
        showToast('No subscribers to export', 'warning');
        return;
    }
    
    let csv = "Email,Name,Phone,Source,Subscribed Date\n";
    newsletterData.subscribers.forEach(sub => {
        csv += `"${sub.email}","${sub.name || ''}","${sub.phone || ''}","${sub.source || ''}","${formatDate(sub.subscribed_at)}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Subscribers exported successfully', 'success');
};

window.deleteSubscriber = deleteSubscriber;
window.showImportHelp = function() {
    alert('To import subscribers:\n\n1. Prepare a CSV file with columns: email, name, phone, source\n2. Use the export template as reference\n3. Contact support for bulk import assistance');
};

// Auto-refresh every 5 minutes
setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadNewsletterData();
    }
}, 300000);

// Export for testing
export { newsletterData, loadNewsletterData, addNewSubscriber, deleteSubscriber };