import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration
export const SUPABASE_URL = 'https://xtarsaurwclktwhhryas.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXJzYXVyd2Nsa3R3aGhyeWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDM1ODksImV4cCI6MjA2NzM3OTU4OX0.ZAgs8NbZs8F2GuBVfiFYuyqOLrRC1hemdMyE-i4riYI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Common Functions
export function formatCurrency(value) {
    if (!value || isNaN(value)) return "Rp 0";
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0 
    }).format(value);
}

export function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID');
}

export function showLoading() {
    // Implement loading state
}

export function hideLoading() {
    // Implement hide loading
}

export function showError(message) {
    alert('Error: ' + message);
}

export function showSuccess(message) {
    // Implement success notification
    console.log('Success: ' + message);
}