import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Konfigurasi Supabase ---
    const SUPABASE_URL = 'https://xtarsaurwclktwhhryas.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXJzYXVyd2Nsa3R3aGhyeWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDM1ODksImV4cCI6MjA2NzM3OTU4OX0.ZAgs8NbZs8F2GuBVfiFYuyqOLrRC1hemdMyE-i4riYI';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- Autentikasi Pengguna ---
    const { data: { session } } = await supabase.auth.getSession();
    const ALLOWED_UID = 'fb109bdd-584d-4f57-b50c-5069ba7ef12a';

    if (!session || session.user.id !== ALLOWED_UID) {
        window.location.href = 'index.html';
        return;
    }

    // --- Elemen DOM ---
    const feedbackTableBody = document.getElementById('feedback-table-body');
    const viewFeedbackModal = new bootstrap.Modal(document.getElementById('viewFeedbackModal'));
    const updateStatusForm = document.getElementById('updateStatusForm');
    const logoutLink = document.getElementById('logout-link');

    // --- Fungsi CRUD ---
    const fetchFeedback = async () => {
        const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching feedback:', error);
            return [];
        }
        return data;
    };
    
    const getStatusBadge = (status) => {
        const lowerCaseStatus = (status || '').toLowerCase();
        let badgeClass = 'bg-secondary';
        if (lowerCaseStatus === 'baru') badgeClass = 'bg-primary';
        else if (lowerCaseStatus === 'pending') badgeClass = 'bg-info text-dark';
        else if (lowerCaseStatus === 'dikerjakan') badgeClass = 'bg-warning text-dark';
        else if (lowerCaseStatus === 'selesai') badgeClass = 'bg-success';
        else if (lowerCaseStatus === 'dibatalkan') badgeClass = 'bg-danger';
        return `<span class="badge ${badgeClass}">${status || 'Unknown'}</span>`;
    };

    const renderTable = (feedback) => {
        feedbackTableBody.innerHTML = '';
        if (feedback.length === 0) {
            feedbackTableBody.innerHTML = `<tr><td colspan="6" class="text-center">Tidak ada data feedback.</td></tr>`;
            return;
        }

        feedback.forEach(item => {
            const row = document.createElement('tr');
            const createdAt = new Date(item.created_at).toLocaleDateString();

            row.innerHTML = `
                <td>${item.title || '-'}</td>
                <td class="d-none d-md-table-cell">${item.feedback_type || '-'}</td>
                <td class="d-none d-md-table-cell">${item.urgency || '-'}</td>
                <td>${getStatusBadge(item.status)}</td>
                <td>${createdAt}</td>
                <td class="d-none d-md-table-cell">
                    <button class="btn btn-primary btn-sm view-btn" data-id="${item.id}">
                        <i class="align-middle" data-feather="eye"></i> View
                    </button>
                    ${item.status !== 'Selesai' ? `
                    <button class="btn btn-success btn-sm complete-btn" data-id="${item.id}">
                        <i class="align-middle" data-feather="check"></i> Selesai
                    </button>
                    ` : ''}
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${item.id}">
                        <i class="align-middle" data-feather="trash-2"></i> Delete
                    </button>
                </td>
            `;
            feedbackTableBody.appendChild(row);
        });
        feather.replace();
    };

    const handleComplete = async (e) => {
        const feedbackId = e.target.closest('button').dataset.id;
        const { error } = await supabase.from('feedback').update({ status: 'Selesai' }).eq('id', feedbackId);
        if (error) {
            console.error('Error updating feedback status to complete:', error);
        }
        loadFeedback();
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        const feedbackId = document.getElementById('modal-feedback-id').value;
        const newStatus = document.getElementById('modal-status').value;

        const { error } = await supabase.from('feedback').update({ status: newStatus }).eq('id', feedbackId);
        if (error) {
            console.error('Error updating feedback status:', error);
        }
        
        viewFeedbackModal.hide();
        loadFeedback();
    };

    const handleDelete = async (e) => {
        const feedbackId = e.target.closest('button').dataset.id;
        if (confirm('Are you sure you want to delete this feedback?')) {
            const { error } = await supabase.from('feedback').delete().eq('id', feedbackId);
            if (error) {
                console.error('Error deleting feedback:', error);
            }
            loadFeedback();
        }
    };
    
    // --- Pemuatan Data & Event Listeners ---
    const loadFeedback = async () => {
        const feedback = await fetchFeedback();
        renderTable(feedback);
    };

    updateStatusForm.addEventListener('submit', handleUpdateStatus);

    feedbackTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('.view-btn, .delete-btn, .complete-btn');
        if (!target) return;

        const feedbackId = target.dataset.id;

        if (target.classList.contains('view-btn')) {
            const { data, error } = await supabase.from('feedback').select('*').eq('id', feedbackId).single();
            if (error) {
                console.error('Error fetching feedback for view:', error);
                return;
            }

            document.getElementById('modal-title').textContent = data.title;
            document.getElementById('modal-type').textContent = data.feedback_type;
            document.getElementById('modal-urgency').textContent = data.urgency || '-';
            document.getElementById('modal-description').textContent = data.description;
            document.getElementById('modal-feedback-id').value = data.id;
            document.getElementById('modal-status').value = data.status;

            viewFeedbackModal.show();
        } else if (target.classList.contains('delete-btn')) {
            handleDelete(e);
        } else if (target.classList.contains('complete-btn')) {
            handleComplete(e);
        }
    });

    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    const darkModeToggle = document.getElementById('darkModeToggle');

    const enableDarkMode = () => {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (typeof feather !== 'undefined') feather.replace();
    };

    const disableDarkMode = () => {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        if (typeof feather !== 'undefined') feather.replace();
    };

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        enableDarkMode();
    } else if (savedTheme === 'light') {
        disableDarkMode();
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        enableDarkMode();
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            if (document.body.classList.contains('dark-mode')) {
                disableDarkMode();
            } else {
                enableDarkMode();
            }
        });
    }

    loadFeedback();
});
