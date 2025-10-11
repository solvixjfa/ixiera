import { supabase, formatCurrency, formatDate } from './shared.js';
import { checkAuth, setupLogout, updateUserInfo } from './auth.js';

console.log('Invoices JS loaded - REAL SYNC WITH COMPLETED PROJECTS');

// Cache configuration
const CACHE_KEYS = {
    INVOICES_DATA: 'invoices_cache',
    CLIENTS_DATA: 'invoices_clients_cache', 
    PROJECTS_DATA: 'invoices_projects_cache'
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

let allInvoices = [];
let allClients = [];
let allProjects = [];
let isUsingCache = false;

// PDF.js library
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing Invoices...');
    
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

    // Initialize invoices management
    await loadAllData();
});

// ==================== CORE DATA LOADING ====================
async function loadAllData() {
    try {
        showLoadingState();

        // Load semua data parallel
        const [invoices, clients, projects] = await Promise.all([
            loadInvoicesWithCache(),
            loadClientsWithCache(),
            loadCompletedProjectsWithCache() // HANYA completed projects
        ]);

        allInvoices = invoices;
        allClients = clients;
        allProjects = projects;

        console.log('✅ REAL DATA loaded - Invoices:', allInvoices.length, 'Completed Projects:', allProjects.length);

        updateInvoiceStats(allInvoices);
        populateClientFilter(allClients);
        renderInvoicesTable(allInvoices);
        updateAutoGenerateSection(allProjects, allInvoices);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showErrorState(error);
    }
}

async function loadInvoicesWithCache() {
    // Cek cache dulu
    const cached = getCachedData(CACHE_KEYS.INVOICES_DATA);
    if (cached) {
        console.log('Using cached invoices data');
        isUsingCache = true;
        showCacheIndicator();
        return cached;
    }

    console.log('🔄 Loading REAL invoices from Supabase with JOIN...');
    
    // REAL JOIN hanya dengan completed projects
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
            *,
            project_inquiries (
                client_name,
                client_email,
                client_phone,
                service_type,
                budget,
                project_requirements,
                status as project_status,
                created_at as project_created_at
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Supabase JOIN error:', error);
        return await loadInvoicesSimple();
    }

    console.log('📊 Raw joined invoices:', invoices);

    // FILTER: Hanya invoice yang linked ke completed projects
    const transformedInvoices = (invoices || [])
        .filter(invoice => {
            const project = invoice.project_inquiries;
            const isCompleted = project && project.project_status === 'completed';
            if (!isCompleted) {
                console.log('❌ Filtering out invoice - Project not completed:', invoice.invoice_number);
            }
            return isCompleted;
        })
        .map(invoice => {
            const project = invoice.project_inquiries || {};
            
            return {
                ...invoice,
                clients: {
                    contact_person: project.client_name || invoice.client_email,
                    email: project.client_email || invoice.client_email,
                    phone: project.client_phone
                },
                projects: {
                    service_type: project.service_type,
                    client_name: project.client_name,
                    budget: project.budget,
                    project_requirements: project.project_requirements,
                    status: project.project_status,
                    created_at: project.project_created_at
                }
            };
        });

    console.log('✅ Filtered completed project invoices:', transformedInvoices.length);

    // Simpan ke cache
    cacheData(CACHE_KEYS.INVOICES_DATA, transformedInvoices);
    isUsingCache = false;
    hideCacheIndicator();
    
    return transformedInvoices;
}

// Fallback function jika JOIN tidak work
async function transformInvoicesWithManualJoin(invoices) {
    const transformedInvoices = await Promise.all(
        invoices.map(async (invoice) => {
            let projectData = {};
            
            if (invoice.project_id) {
                // Manual query untuk project data - HANYA completed
                const { data: project } = await supabase
                    .from('project_inquiries')
                    .select('*')
                    .eq('id', invoice.project_id)
                    .eq('status', 'completed')
                    .single();
                
                if (project) {
                    projectData = project;
                }
            }
            
            // Skip jika project tidak completed
            if (!projectData || projectData.status !== 'completed') {
                return null;
            }
            
            return {
                ...invoice,
                clients: {
                    contact_person: projectData.client_name || invoice.client_email,
                    email: projectData.client_email || invoice.client_email,
                    phone: projectData.client_phone
                },
                projects: {
                    service_type: projectData.service_type,
                    client_name: projectData.client_name,
                    budget: projectData.budget,
                    project_requirements: projectData.project_requirements,
                    status: projectData.status,
                    created_at: projectData.created_at
                }
            };
        })
    );
    
    // Filter out null values
    return transformedInvoices.filter(invoice => invoice !== null);
}

async function loadInvoicesSimple() {
    console.log('🔄 Loading invoices with simple query...');
    const { data: simpleInvoices, error: simpleError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (simpleError) {
        console.error('Simple query also failed:', simpleError);
        return [];
    }
    
    // Transform manual dengan filter completed
    const transformedInvoices = await transformInvoicesWithManualJoin(simpleInvoices || []);
    cacheData(CACHE_KEYS.INVOICES_DATA, transformedInvoices);
    return transformedInvoices;
}

async function loadClientsWithCache() {
    const cached = getCachedData(CACHE_KEYS.CLIENTS_DATA);
    if (cached) return cached;

    // Load clients dari project_inquiries yang completed
    const { data: inquiries, error } = await supabase
        .from('project_inquiries')
        .select('client_name, client_email, client_phone')
        .eq('status', 'completed')
        .not('client_email', 'is', null);

    if (error) {
        console.error('Error loading clients:', error);
        return [];
    }

    // Unique clients
    const clientsMap = new Map();
    inquiries.forEach(inquiry => {
        if (inquiry.client_email) {
            clientsMap.set(inquiry.client_email, {
                contact_person: inquiry.client_name,
                email: inquiry.client_email,
                phone: inquiry.client_phone
            });
        }
    });

    const clients = Array.from(clientsMap.values());
    cacheData(CACHE_KEYS.CLIENTS_DATA, clients);
    return clients;
}

async function loadCompletedProjectsWithCache() {
    const cached = getCachedData(CACHE_KEYS.PROJECTS_DATA);
    if (cached) return cached;

    console.log('🔄 Loading COMPLETED projects for invoicing...');

    // Load HANYA completed projects untuk invoice generation
    const { data: projects, error } = await supabase
        .from('project_inquiries')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading completed projects:', error);
        return [];
    }

    console.log('✅ Completed projects for invoicing:', projects?.length || 0);

    cacheData(CACHE_KEYS.PROJECTS_DATA, projects || []);
    return projects || [];
}

// ==================== AUTO-GENERATE SYSTEM ====================
async function autoGenerateInvoices() {
    try {
        showToast('🔍 Scanning completed projects for invoice generation...', 'info');
        
        // Load fresh completed projects
        const completedProjects = await loadCompletedProjectsWithCache();

        console.log('📋 Completed projects found:', completedProjects);

        if (!completedProjects || completedProjects.length === 0) {
            showToast('❌ No completed projects found for invoicing!', 'warning');
            return;
        }

        let generatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const project of completedProjects) {
            try {
                // Cek apakah invoice sudah ada untuk project ini
                const { data: existingInvoices } = await supabase
                    .from('invoices')
                    .select('id')
                    .eq('project_id', project.id);

                if (!existingInvoices || existingInvoices.length === 0) {
                    console.log(`🆕 Generating invoice for: ${project.client_name}`);
                    const success = await generateInvoiceForProject(project);
                    if (success) {
                        generatedCount++;
                    } else {
                        errorCount++;
                    }
                    
                    // Delay 500ms antara setiap generation
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    console.log(`✅ Invoice already exists for: ${project.client_name}`);
                    skippedCount++;
                }
            } catch (projectError) {
                console.error(`Error processing project ${project.id}:`, projectError);
                errorCount++;
            }
        }

        // Show results
        if (generatedCount > 0) {
            showToast(`🎉 Successfully generated ${generatedCount} new invoices! ${skippedCount} already existed.`, 'success');
            // Refresh data
            clearInvoicesCache();
            await loadAllData();
        } else if (skippedCount > 0) {
            showToast(`✅ All ${skippedCount} completed projects already have invoices!`, 'info');
        } else if (errorCount > 0) {
            showToast(`❌ Failed to generate ${errorCount} invoices. Check console for details.`, 'error');
        } else {
            showToast('ℹ️ No invoices generated', 'info');
        }

    } catch (error) {
        console.error('Error in auto-generate invoices:', error);
        showToast('❌ Error generating invoices: ' + error.message, 'error');
    }
}

async function generateInvoiceForProject(project) {
    try {
        // Double check project status
        if (project.status !== 'completed') {
            console.warn('❌ Skipping non-completed project:', project.id);
            return false;
        }

        const invoiceNumber = generateInvoiceNumber();
        const budgetAmount = parseBudget(project.budget);
        
        // REAL DATA dari completed project
        const invoiceData = {
            invoice_number: invoiceNumber,
            client_email: project.client_email,
            project_id: project.id, // REAL PROJECT ID
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            subtotal: budgetAmount,
            tax_rate: 0.11,
            tax_amount: Math.round(budgetAmount * 0.11),
            total_amount: Math.round(budgetAmount * 1.11),
            status: 'draft',
            notes: `Invoice for ${project.service_type} project - ${project.client_name}\nRequirements: ${project.project_requirements?.substring(0, 200) || 'No specific requirements'}`,
            terms: 'Payment due within 14 days. Late payment may result in additional fees.',
            created_at: new Date().toISOString()
        };

        console.log('🧾 Creating REAL invoice for completed project:', {
            project_id: project.id,
            client: project.client_name,
            service: project.service_type,
            budget: project.budget,
            amount: formatCurrency(budgetAmount)
        });

        const { data: newInvoice, error } = await supabase
            .from('invoices')
            .insert(invoiceData)
            .select()
            .single();

        if (error) {
            console.error('❌ Error creating invoice:', error);
            showToast(`Error creating invoice for ${project.client_name}: ${error.message}`, 'error');
            return false;
        }

        console.log(`✅ REAL Invoice created: ${invoiceNumber} for ${project.client_name} (Project ID: ${project.id})`);
        return true;

    } catch (error) {
        console.error('❌ Error generating invoice:', error);
        showToast(`Error generating invoice for ${project.client_name}: ${error.message}`, 'error');
        return false;
    }
}

function generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
}

function updateAutoGenerateSection(projects, invoices) {
    const container = document.getElementById('auto-generate-section');
    if (!container) return;

    const projectsWithoutInvoices = projects.filter(project => 
        !invoices.some(invoice => invoice.project_id === project.id)
    );

    console.log('📊 Projects without invoices:', projectsWithoutInvoices.length);

    if (projectsWithoutInvoices.length === 0) {
        container.innerHTML = `
            <div class="alert alert-success">
                <i data-feather="check-circle" class="me-2"></i>
                <strong>All completed projects have invoices!</strong>
                <br>
                <small class="text-muted">${projects.length} completed projects found</small>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="alert alert-info">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i data-feather="zap" class="me-2"></i>
                        <strong>${projectsWithoutInvoices.length} completed projects</strong> ready for invoice generation
                        <br>
                        <small class="text-muted">${projects.length} completed projects total</small>
                    </div>
                    <button class="btn btn-success" onclick="autoGenerateInvoices()">
                        <i data-feather="file-text" class="me-1"></i> Generate All Invoices
                    </button>
                </div>
                ${projectsWithoutInvoices.length > 0 ? `
                <div class="mt-3">
                    <h6>Projects ready for invoicing:</h6>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${projectsWithoutInvoices.map(project => `
                            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                                <div>
                                    <strong>${project.client_name}</strong>
                                    <br>
                                    <small class="text-muted">${project.service_type} - ${formatCurrency(parseBudget(project.budget))}</small>
                                </div>
                                <small class="text-muted">${formatDate(project.created_at)}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// ==================== INVOICE MANAGEMENT ====================
function updateInvoiceStats(invoices) {
    const totalInvoices = invoices.length;
    const pendingInvoices = invoices.filter(inv => inv.status === 'sent').length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    
    // Hitung overdue invoices
    const today = new Date();
    const overdueInvoices = invoices.filter(inv => 
        inv.due_date && 
        new Date(inv.due_date) < today && 
        inv.status === 'sent'
    ).length;

    safeUpdateElement('total-invoices', totalInvoices.toLocaleString());
    safeUpdateElement('pending-invoices', pendingInvoices.toLocaleString());
    safeUpdateElement('paid-invoices', paidInvoices.toLocaleString());
    safeUpdateElement('overdue-invoices', overdueInvoices.toLocaleString());

    console.log('📈 Invoice stats:', { totalInvoices, pendingInvoices, paidInvoices, overdueInvoices });
}

function renderInvoicesTable(invoices) {
    const tbody = document.getElementById('invoices-table-body');
    if (!tbody) return;

    console.log('🎨 Rendering invoices table with:', invoices.length, 'COMPLETED project invoices');

    if (invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-muted">
                    <div class="alert alert-info">
                        <i data-feather="info" class="me-2"></i>
                        <strong>No invoices found for completed projects</strong>
                        <br>
                        <small>Click "Auto-Generate" to create invoices from completed projects</small>
                        <br>
                        <button class="btn btn-success mt-2" onclick="autoGenerateInvoices()">
                            <i data-feather="zap" class="me-1"></i> Auto-Generate Invoices
                        </button>
                    </div>
                </td>
            </tr>
        `;
        feather.replace();
        return;
    }

    tbody.innerHTML = invoices.map(invoice => {
        const client = invoice.clients || {};
        const project = invoice.projects || {};
        const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status === 'sent';
        const isCompletedProject = project.status === 'completed';
        
        return `
        <tr class="${isCompletedProject ? 'table-success' : ''}">
            <td>
                <span class="invoice-number fw-bold">${invoice.invoice_number}</span>
                ${invoice.project_id ? `<br><small class="text-muted">Project ID: ${invoice.project_id}</small>` : ''}
            </td>
            <td>
                <strong>${client.contact_person || 'Unknown Client'}</strong>
                <br>
                <small class="text-muted">${client.email || invoice.client_email || 'No email'}</small>
                ${client.phone ? `<br><small class="text-muted">${client.phone}</small>` : ''}
            </td>
            <td>
                <strong>${project.service_type || 'General Project'}</strong>
                <br>
                <small class="text-muted">${project.client_name || 'No project data'}</small>
                <br>
                <small class="text-muted">Budget: ${formatCurrency(parseBudget(project.budget))}</small>
            </td>
            <td>
                ${formatDate(invoice.issue_date)}
                <br>
                <small class="text-muted">Created: ${formatDate(invoice.created_at)}</small>
            </td>
            <td>
                <span class="${isOverdue ? 'text-danger fw-bold' : ''}">
                    ${formatDate(invoice.due_date)}
                    ${isOverdue ? ' ⚠️' : ''}
                </span>
            </td>
            <td>
                <div class="amount-badge">
                    ${formatCurrency(invoice.total_amount || 0)}
                    <br>
                    <small style="font-size: 0.7em; opacity: 0.8;">
                        Sub: ${formatCurrency(invoice.subtotal)}<br>
                        Tax: ${formatCurrency(invoice.tax_amount)}
                    </small>
                </div>
            </td>
            <td>
                <span class="badge-${invoice.status}">
                    ${formatInvoiceStatus(invoice.status)}
                    ${isOverdue ? ' (Overdue)' : ''}
                </span>
                ${project.status ? `<br><small class="text-muted">Project: ${project.status}</small>` : ''}
            </td>
            <td>
    <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-primary view-invoice" data-id="${invoice.id}" title="View Details">
            <i data-feather="eye"></i>
        </button>
        <button class="btn btn-outline-info copy-invoice" data-id="${invoice.id}" title="Copy to Clipboard">
            <i data-feather="copy"></i>
        </button>
        <button class="btn btn-outline-warning send-invoice" data-id="${invoice.id}" title="Send to Client">
            <i data-feather="send"></i>
        </button>
        ${invoice.status === 'sent' ? `
            <button class="btn btn-outline-success mark-paid" data-id="${invoice.id}" title="Mark as Paid">
                <i data-feather="check-circle"></i>
            </button>
        ` : ''}
    </div>
</td>
        `;
    }).join('');

    // Add event listeners
    addInvoiceEventListeners();

    // Refresh Feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// ==================== UTILITY FUNCTIONS ====================
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
function copyInvoiceToClipboard(invoiceId) {
    try {
        const invoice = allInvoices.find(inv => inv.id == invoiceId);
        if (!invoice) {
            showToast('❌ Invoice not found', 'error');
            return;
        }

        const client = invoice.clients || {};
        const project = invoice.projects || {};
        
        const invoiceText = `
INVOICE: ${invoice.invoice_number}
DATE: ${formatDate(invoice.issue_date)}
DUE DATE: ${formatDate(invoice.due_date)}
STATUS: ${formatInvoiceStatus(invoice.status)}

CLIENT:
${client.contact_person || invoice.client_email}
${client.email || invoice.client_email}
${client.phone || 'No phone'}

PROJECT:
${project.service_type || 'Professional Services'}
${project.client_name || 'N/A'}
Budget: ${formatCurrency(parseBudget(project.budget))}

AMOUNTS:
Subtotal: ${formatCurrency(invoice.subtotal)}
Tax (11%): ${formatCurrency(invoice.tax_amount)}
TOTAL: ${formatCurrency(invoice.total_amount)}

NOTES:
${invoice.notes || 'Thank you for your business!'}

TERMS:
${invoice.terms || 'Payment due within 14 days'}
        `.trim();

        // Copy ke clipboard
        navigator.clipboard.writeText(invoiceText).then(() => {
            showToast('✅ Invoice copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback untuk browser lama
            const textArea = document.createElement('textarea');
            textArea.value = invoiceText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('✅ Invoice copied to clipboard!', 'success');
        });

    } catch (error) {
        console.error('Error copying invoice:', error);
        showToast('❌ Error copying invoice', 'error');
    }
}
function formatInvoiceStatus(status) {
    const statusMap = {
        'draft': 'Draft',
        'sent': 'Sent',
        'paid': 'Paid', 
        'overdue': 'Overdue',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status || 'Draft';
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

function clearInvoicesCache() {
    Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    console.log('🗑️ Invoices cache cleared');
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

// ==================== EVENT HANDLERS ====================
function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i data-feather="refresh-cw" class="me-1 spin"></i> Refreshing...';
            
            clearInvoicesCache();
            await loadAllData();
            
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i data-feather="refresh-cw" class="me-1"></i> Refresh';
            if (typeof feather !== 'undefined') feather.replace();
        });
    }
    
    // Clear cache button
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            clearInvoicesCache();
            loadAllData();
        });
    }

    // Filter event listeners
    const filters = ['status-filter', 'client-filter', 'date-from', 'date-to', 'global-search'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', applyFilters);
            element.addEventListener('input', applyFilters);
        }
    });
}

function addInvoiceEventListeners() {
    // View invoice
    document.querySelectorAll('.view-invoice').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const invoiceId = e.currentTarget.dataset.id;
            viewInvoiceDetails(invoiceId);
        });
    });

// Copy invoice to clipboard
document.querySelectorAll('.copy-invoice').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const invoiceId = e.currentTarget.dataset.id;
        copyInvoiceToClipboard(invoiceId);
    });
});

    // Send invoice
    document.querySelectorAll('.send-invoice').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const invoiceId = e.currentTarget.dataset.id;
            sendInvoiceToClient(invoiceId);
        });
    });

    // Mark as paid
    document.querySelectorAll('.mark-paid').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const invoiceId = e.currentTarget.dataset.id;
            markInvoiceAsPaid(invoiceId);
        });
    });
}

function viewInvoiceDetails(invoiceId) {
    const invoice = allInvoices.find(inv => inv.id == invoiceId);
    if (!invoice) return;
    
    const client = invoice.clients || {};
    const project = invoice.projects || {};
    const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status === 'sent';
    
    alert(`📋 INVOICE DETAILS (COMPLETED PROJECT)\n
🧾 INVOICE: ${invoice.invoice_number}
📊 STATUS: ${formatInvoiceStatus(invoice.status)} ${isOverdue ? '⚠️ OVERDUE' : ''}

👤 CLIENT:
${client.contact_person || invoice.client_email}
Email: ${client.email || invoice.client_email}
Phone: ${client.phone || 'N/A'}

🛠️ PROJECT:
${project.service_type || 'General Services'}
Client: ${project.client_name || 'N/A'}
Budget: ${formatCurrency(parseBudget(project.budget))}
Status: ${project.status || 'N/A'}

💰 FINANCIAL:
Subtotal: ${formatCurrency(invoice.subtotal)}
Tax (11%): ${formatCurrency(invoice.tax_amount)}
TOTAL: ${formatCurrency(invoice.total_amount)}

📅 DATES:
Issued: ${formatDate(invoice.issue_date)}
Due: ${formatDate(invoice.due_date)}
Created: ${formatDate(invoice.created_at)}

📝 NOTES:
${invoice.notes || 'No notes'}

📄 TERMS:
${invoice.terms || 'Standard payment terms'}`);
}

async function sendInvoiceToClient(invoiceId) {
    const { error } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoiceId);

    if (error) {
        showToast('❌ Error sending invoice: ' + error.message, 'error');
        return;
    }

    clearInvoicesCache();
    await loadAllData();
    showToast('✅ Invoice sent to client successfully!', 'success');
}

async function markInvoiceAsPaid(invoiceId) {
    const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId);

    if (error) {
        showToast('❌ Error marking invoice as paid: ' + error.message, 'error');
        return;
    }

    clearInvoicesCache();
    await loadAllData();
    showToast('✅ Invoice marked as paid!', 'success');
}

async function generateInvoicePDF(invoiceId) {
    try {
        const invoice = allInvoices.find(inv => inv.id == invoiceId);
        if (!invoice) {
            showToast('❌ Invoice not found', 'error');
            return;
        }

        showToast('📄 Generating PDF...', 'info');

        const doc = new jsPDF();
        const client = invoice.clients || {};
        const project = invoice.projects || {};
        
        // Professional template
        doc.setFontSize(20);
        doc.setTextColor(79, 70, 229);
        doc.text('INVOICE', 20, 30);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('IXIERA DIGITAL AGENCY', 20, 40);
        doc.text('Professional Digital Solutions', 20, 46);
        
        // Invoice details
        doc.setTextColor(0, 0, 0);
        doc.text(`Invoice #: ${invoice.invoice_number}`, 150, 30, { align: 'right' });
        doc.text(`Date: ${formatDate(invoice.issue_date)}`, 150, 36, { align: 'right' });
        doc.text(`Due Date: ${formatDate(invoice.due_date)}`, 150, 42, { align: 'right' });

        // Client info
        doc.text('Bill To:', 20, 65);
        doc.text(client.contact_person || invoice.client_email, 20, 72);
        doc.text(client.email || invoice.client_email, 20, 78);
        doc.text(client.phone || '', 20, 84);

        // Project info
        doc.text('Project:', 20, 95);
        doc.text(project.service_type || 'Professional Services', 20, 102);
        doc.text(project.client_name || '', 20, 108);

        // Line
        doc.line(20, 115, 190, 115);

        // Items
        doc.text('Description', 20, 125);
        doc.text('Amount', 150, 125, { align: 'right' });
        
        doc.line(20, 128, 190, 128);

        doc.text(project.service_type || 'Professional Services', 20, 138);
        doc.text(formatCurrency(invoice.subtotal), 150, 138, { align: 'right' });

        // Totals
        doc.text('Subtotal:', 130, 155, { align: 'right' });
        doc.text(formatCurrency(invoice.subtotal), 150, 155, { align: 'right' });

        doc.text(`Tax (11%):`, 130, 163, { align: 'right' });
        doc.text(formatCurrency(invoice.tax_amount), 150, 163, { align: 'right' });

        doc.setFont(undefined, 'bold');
        doc.text('Total:', 130, 173, { align: 'right' });
        doc.text(formatCurrency(invoice.total_amount), 150, 173, { align: 'right' });

        // Notes
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Notes:', 20, 190);
        const splitNotes = doc.splitTextToSize(invoice.notes || 'Thank you for your business!', 120);
        doc.text(splitNotes, 20, 197);

        // Save PDF
        const fileName = `invoice-${invoice.invoice_number}.pdf`;
        doc.save(fileName);
        
        showToast('✅ PDF generated successfully!', 'success');

    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        showToast('❌ Error generating PDF: ' + error.message, 'error');
    }
}

function applyFilters() {
    const statusFilter = document.getElementById('status-filter')?.value || '';
    const clientFilter = document.getElementById('client-filter')?.value || '';
    const dateFrom = document.getElementById('date-from')?.value || '';
    const dateTo = document.getElementById('date-to')?.value || '';
    const searchTerm = document.getElementById('global-search')?.value.toLowerCase() || '';

    let filteredInvoices = allInvoices;

    if (statusFilter) {
        filteredInvoices = filteredInvoices.filter(inv => inv.status === statusFilter);
    }

    if (clientFilter) {
        filteredInvoices = filteredInvoices.filter(inv => 
            inv.clients?.email === clientFilter || inv.client_email === clientFilter
        );
    }

    if (dateFrom) {
        filteredInvoices = filteredInvoices.filter(inv => 
            new Date(inv.issue_date) >= new Date(dateFrom)
        );
    }

    if (dateTo) {
        filteredInvoices = filteredInvoices.filter(inv => 
            new Date(inv.issue_date) <= new Date(dateTo + 'T23:59:59')
        );
    }

    if (searchTerm) {
        filteredInvoices = filteredInvoices.filter(inv => 
            inv.invoice_number?.toLowerCase().includes(searchTerm) ||
            inv.clients?.contact_person?.toLowerCase().includes(searchTerm) ||
            inv.clients?.email?.toLowerCase().includes(searchTerm) ||
            inv.client_email?.toLowerCase().includes(searchTerm) ||
            inv.projects?.service_type?.toLowerCase().includes(searchTerm)
        );
    }

    renderInvoicesTable(filteredInvoices);
}

// ==================== UI HELPERS ====================
function showLoadingState() {
    const tbody = document.getElementById('invoices-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading completed project invoices...</p>
                </td>
            </tr>
        `;
    }
}

function showErrorState(error) {
    const tbody = document.getElementById('invoices-table-body');
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

function safeUpdateElement(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = text;
}

function showToast(message, type = 'info') {
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
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            document.body.removeChild(toast);
        }
    }, 3000);
}

function populateClientFilter(clients) {
    const select = document.getElementById('client-filter');
    if (!select) return;

    while (select.options.length > 1) {
        select.remove(1);
    }

    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.email;
        option.textContent = `${client.contact_person} (${client.email})`;
        select.appendChild(option);
    });
}

// ==================== GLOBAL EXPORTS ====================
window.autoGenerateInvoices = autoGenerateInvoices;
window.clearInvoicesCache = clearInvoicesCache;

// TEST FUNCTION untuk console
window.testInvoices = async function() {
    console.log('=== 🧪 TESTING INVOICES SYNC ===');
    
    // Test completed projects
    const { data: projects } = await supabase
        .from('project_inquiries')
        .select('*')
        .eq('status', 'completed');
    console.log('✅ Completed projects:', projects);
    
    // Test invoices
    const { data: invoices } = await supabase
        .from('invoices')
        .select('*');
    console.log('📊 Existing invoices:', invoices);
    
    // Test join quality
    const { data: joinedData } = await supabase
        .from('invoices')
        .select(`
            invoice_number,
            project_id,
            project_inquiries(client_name, status, service_type)
        `)
        .limit(5);
    
    console.log('🔗 Join quality:', joinedData);
    
    return { 
        completedProjects: projects?.length || 0, 
        existingInvoices: invoices?.length || 0,
        joinQuality: joinedData 
    };
};

// Auto-refresh every 10 minutes
setInterval(() => {
    console.log('🔄 Auto-refreshing invoices data...');
    clearInvoicesCache();
    loadAllData();
}, 600000);

// Add spin animation
const style = document.createElement('style');
style.textContent = `
    .spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .table-success {
        background-color: rgba(21, 128, 61, 0.05) !important;
    }
    .badge-draft { background-color: #6b7280; color: white; padding: 4px 8px; border-radius: 4px; }
    .badge-sent { background-color: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; }
    .badge-paid { background-color: #10b981; color: white; padding: 4px 8px; border-radius: 4px; }
    .badge-overdue { background-color: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; }
    .amount-badge { 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
        color: white; 
        padding: 8px 12px; 
        border-radius: 8px; 
        text-align: center;
        font-weight: bold;
    }
`;
document.head.appendChild(style);