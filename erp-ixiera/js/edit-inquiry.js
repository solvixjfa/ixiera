import { supabase, formatCurrency, formatDate } from './shared.js';
import { checkAuth, setupLogout, updateUserInfo } from './auth.js';

console.log('Edit Inquiry JS loaded - FIXED VERSION');

let currentInquiryId = null;
let currentInquiryData = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing Edit Inquiry...');
    
    // Check authentication
    const auth = await checkAuth();
    if (!auth) {
        console.log('Authentication failed');
        window.location.href = 'login.html';
        return;
    }
    
    const { session, adminUser } = auth;
    console.log('User authenticated:', session.user.email);
    
    updateUserInfo(session.user);
    setupLogout();

    try {
        // Get inquiry ID from URL parameters
        currentInquiryId = getInquiryIdFromURL();
        console.log('Editing inquiry ID:', currentInquiryId);

        // Update ID badge immediately
        updateInquiryIdBadge(currentInquiryId);

        if (currentInquiryId) {
            await loadInquiryData(currentInquiryId);
            setupEventListeners();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showError(error.message);
    }
});

function getInquiryIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    console.log('URL Parameters:', Object.fromEntries(urlParams.entries()));
    
    // Validasi ID
    if (!id) {
        throw new Error('No inquiry ID provided in URL. Please use: edit-inquiry.html?id=YOUR_INQUIRY_ID');
    }
    
    if (!isValidId(id)) {
        throw new Error('Invalid inquiry ID format. ID should be a number or UUID.');
    }
    
    return id;
}

function isValidId(id) {
    // Terima string angka (123) atau UUID
    return /^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(id);
}

function updateInquiryIdBadge(inquiryId) {
    const badge = document.getElementById('inquiry-id-badge');
    if (badge) {
        badge.textContent = `ID: ${inquiryId}`;
    }
}

async function loadInquiryData(inquiryId) {
    console.log('Loading inquiry data for ID:', inquiryId);
    
    try {
        showLoadingState();

        const { data: inquiry, error } = await supabase
            .from('project_inquiries')
            .select('*')
            .eq('id', inquiryId)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            
            if (error.code === 'PGRST116') {
                throw new Error(`Inquiry with ID "${inquiryId}" not found in database.`);
            }
            
            throw error;
        }

        if (!inquiry) {
            throw new Error(`Inquiry with ID "${inquiryId}" not found.`);
        }

        console.log('Inquiry data loaded successfully:', inquiry);
        currentInquiryData = inquiry;
        
        populateForm(inquiry);
        showForm();
        
        // Show success message
        showMessage(`Loaded inquiry for: ${inquiry.client_name}`, 'success');
        
    } catch (error) {
        console.error('Error loading inquiry:', error);
        showError(error.message);
    }
}

function populateForm(inquiry) {
    console.log('Populating form with data:', inquiry);
    
    // Basic client information
    safeSetValue('client_name', inquiry.client_name || '');
    safeSetValue('client_email', inquiry.client_email || '');
    safeSetValue('client_phone', inquiry.client_phone || '');
    
    // Project details
    safeSetValue('service_type', inquiry.service_type || '');
    safeSetValue('budget', inquiry.budget || '');
    safeSetValue('project_requirements', inquiry.project_requirements || '');
    
    // Status (HANYA kolom yang pasti ada)
    safeSetValue('status', inquiry.status || 'new');
    
    // Format deadline date for input
    if (inquiry.deadline) {
        const deadlineDate = new Date(inquiry.deadline);
        safeSetValue('deadline', deadlineDate.toISOString().split('T')[0]);
    }
    
    // HIDE atau DISABLE kolom yang tidak ada di database
    hideMissingColumns();
    
    // Update page title
    document.title = `IXIERA ERP | Edit ${inquiry.client_name || 'Inquiry'} - ID: ${inquiry.id}`;
    
    // Update ID badge
    updateInquiryIdBadge(`ID: ${inquiry.id} | ${inquiry.client_name}`);
}

function hideMissingColumns() {
    // Sembunyikan section yang tidak ada di database
    const internalNotesSection = document.querySelector('label[for="internal_notes"]')?.closest('.form-group');
    const prioritySection = document.querySelector('label[for="priority"]')?.closest('.form-group');
    
    if (internalNotesSection) {
        internalNotesSection.style.display = 'none';
    }
    if (prioritySection) {
        prioritySection.style.display = 'none';
    }
}

function safeSetValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value;
    } else {
        console.warn('Element not found:', elementId);
    }
}

function setupEventListeners() {
    console.log('Setting up event listeners for inquiry:', currentInquiryId);
    
    // Form submission
    const form = document.getElementById('edit-inquiry-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        console.log('Form submit listener added');
    }
    
    // Delete button
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDelete);
        console.log('Delete button listener added');
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    console.log('Form submitted for inquiry:', currentInquiryId);
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    const formData = new FormData(event.target);
    const inquiryData = Object.fromEntries(formData);
    
    console.log('Form data to update:', inquiryData);
    
    try {
        showMessage('Updating inquiry...', 'info');
        
        // HANYA gunakan kolom yang ADA di database
        const updateData = {
            client_name: inquiryData.client_name,
            client_email: inquiryData.client_email,
            client_phone: inquiryData.client_phone,
            service_type: inquiryData.service_type,
            budget: inquiryData.budget,
            deadline: inquiryData.deadline || null,
            project_requirements: inquiryData.project_requirements,
            status: inquiryData.status
            // HAPUS: priority, internal_notes, updated_at (karena tidak ada di database)
        };
        
        console.log('Sending SAFE update to Supabase:', updateData);

        const { data, error } = await supabase
            .from('project_inquiries')
            .update(updateData)
            .eq('id', currentInquiryId)
            .select();

        if (error) {
            console.error('Supabase update error:', error);
            
            // Tampilkan error yang lebih spesifik
            if (error.message.includes('internal_notes') || error.message.includes('priority')) {
                showMessage('Error: Some columns missing in database. Please contact administrator.', 'error');
            } else {
                throw error;
            }
            return;
        }

        console.log('Inquiry updated successfully:', data);
        showMessage('Inquiry updated successfully! Redirecting...', 'success');
        
        // Redirect back to inquiries list after 2 seconds
        setTimeout(() => {
            window.location.href = 'crm-inquiries.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error updating inquiry:', error);
        showMessage('Error updating inquiry: ' + error.message, 'error');
    }
}

function validateForm() {
    let isValid = true;
    
    // Required fields validation
    const requiredFields = ['client_name', 'client_email', 'service_type', 'project_requirements'];
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            showFieldError(fieldId, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(fieldId);
        }
    });
    
    // Email validation
    const email = document.getElementById('client_email')?.value;
    if (email && !isValidEmail(email)) {
        showFieldError('client_email', 'Please enter a valid email address');
        isValid = false;
    }
    
    return isValid;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.style.borderColor = '#ef4444';
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) existingError.remove();
        
        // Add error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.style.color = '#ef4444';
        errorElement.style.fontSize = '0.75rem';
        errorElement.style.marginTop = '0.25rem';
        errorElement.textContent = message;
        
        field.parentNode.appendChild(errorElement);
    }
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.style.borderColor = '#e5e7eb';
        
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) existingError.remove();
    }
}

async function handleDelete() {
    if (!confirm('Are you sure you want to delete this inquiry? This action cannot be undone.')) {
        return;
    }

    try {
        showMessage('Deleting inquiry...', 'info');
        
        const { error } = await supabase
            .from('project_inquiries')
            .delete()
            .eq('id', currentInquiryId);

        if (error) throw error;

        showMessage('Inquiry deleted successfully! Redirecting...', 'success');
        
        // Redirect back to inquiries list after 2 seconds
        setTimeout(() => {
            window.location.href = 'crm-inquiries.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error deleting inquiry:', error);
        showMessage('Error deleting inquiry: ' + error.message, 'error');
    }
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('message-container');
    if (!container) return;
    
    const messageClass = type === 'error' ? 'error-message' : 
                        type === 'success' ? 'success-message' : 'info-message';
    
    container.innerHTML = `
        <div class="${messageClass}">
            <i data-feather="${type === 'error' ? 'alert-triangle' : type === 'success' ? 'check-circle' : 'info'}" class="me-2"></i>
            ${message}
        </div>
    `;
    
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

function showLoadingState() {
    const loading = document.getElementById('loading-state');
    const form = document.getElementById('edit-form-container');
    const error = document.getElementById('error-state');
    
    if (loading) loading.style.display = 'block';
    if (form) form.style.display = 'none';
    if (error) error.style.display = 'none';
}

function showForm() {
    const loading = document.getElementById('loading-state');
    const form = document.getElementById('edit-form-container');
    const error = document.getElementById('error-state');
    
    if (loading) loading.style.display = 'none';
    if (form) form.style.display = 'block';
    if (error) error.style.display = 'none';
}

function showError(message) {
    const loading = document.getElementById('loading-state');
    const form = document.getElementById('edit-form-container');
    const error = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    
    if (loading) loading.style.display = 'none';
    if (form) form.style.display = 'none';
    if (error) error.style.display = 'block';
    if (errorMessage) errorMessage.textContent = message;
}