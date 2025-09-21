import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Konfigurasi Supabase ---
    const SUPABASE_URL = 'https://xtarsaurwclktwhhryas.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXJzYXVyd2Nsa3R3aGhyeWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDM1ODksImV4cCI6MjA2NzM3OTU4OX0.ZAgs8NbZs8F2GuBVfiFYuyqOLrRC1hemdMyE-i4riYI';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- Otentikasi Pengguna ---
    const { data: { session } } = await supabase.auth.getSession();
    const ALLOWED_UID = 'fb109bdd-584d-4f57-b50c-5069ba7ef12a';

    if (!session || session.user.id !== ALLOWED_UID) {
        window.location.href = 'login.html';
        return;
    }

    // --- Elemen DOM ---
    const inquiriesTableBody = document.getElementById('inquiries-table-body');
    const inquiryModal = new bootstrap.Modal(document.getElementById('inquiryModal'));
    const inquiryForm = document.getElementById('inquiryForm');
    const addNewBtn = document.getElementById('addNewBtn');
    const logoutLink = document.getElementById('logout-link');

    // --- Fungsi CRUD ---
    const fetchInquiries = async () => {
        const { data, error } = await supabase.from('project_inquiries').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching inquiries:', error);
            return [];
        }
        return data;
    };

    const renderTable = (inquiries) => {
        inquiriesTableBody.innerHTML = '';
        inquiries.forEach(inquiry => {
            let badgeClass;
            if (inquiry.status === 'new') {
                badgeClass = 'bg-info';
            } else if (inquiry.status === 'deal') {
                badgeClass = 'bg-success';
            } else if (inquiry.status === 'completed') {
                badgeClass = 'bg-primary';
            } else {
                badgeClass = 'bg-secondary';
            }

            const convertBtn = inquiry.status === 'deal' ?
                `<button class="btn btn-dark btn-sm convert-btn" data-id="${inquiry.id}">
                    <i class="align-middle" data-feather="share"></i> Convert to Project
                </button>` : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${inquiry.id}</td>
                <td>${inquiry.client_name}</td>
                <td>${inquiry.client_email}</td>
                <td>${inquiry.service_type || '-'}</td>
                <td>${inquiry.budget || '-'}</td>
                <td>
                    <select class="form-select form-select-sm status-selector" data-id="${inquiry.id}">
                        <option value="new" ${inquiry.status === 'new' ? 'selected' : ''}>New</option>
                        <option value="deal" ${inquiry.status === 'deal' ? 'selected' : ''}>Deal</option>
                        <option value="completed" ${inquiry.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </td>
                <td>
                    ${convertBtn}
                    <button class="btn btn-info btn-sm edit-btn" data-id="${inquiry.id}">
                        <i class="align-middle" data-feather="edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${inquiry.id}">
                        <i class="align-middle" data-feather="trash-2"></i> Delete
                    </button>
                </td>
            `;
            inquiriesTableBody.appendChild(row);
        });
        feather.replace();
    };

    const handleSaveInquiry = async (e) => {
        e.preventDefault();
        const inquiryId = document.getElementById('inquiry-id').value;
        const clientName = document.getElementById('client-name').value;
        const clientEmail = document.getElementById('client-email').value;
        const serviceType = document.getElementById('service-type').value;
        const budget = document.getElementById('budget').value;
        const projectRequirements = document.getElementById('project-requirements').value;

        const inquiryData = {
            client_name: clientName,
            client_email: clientEmail,
            service_type: serviceType,
            budget: budget,
            project_requirements: projectRequirements
        };

        if (inquiryId) {
            // Edit mode
            const { error } = await supabase.from('project_inquiries').update(inquiryData).eq('id', inquiryId);
            if (error) console.error('Error updating inquiry:', error);
        } else {
            // Add mode
            const { error } = await supabase.from('project_inquiries').insert([inquiryData]);
            if (error) console.error('Error adding new inquiry:', error);
        }

        inquiryModal.hide();
        inquiryForm.reset();
        loadInquiries();
    };

    const handleStatusChange = async (e) => {
        const inquiryId = e.target.dataset.id;
        const newStatus = e.target.value;
        const { error } = await supabase
            .from('project_inquiries')
            .update({ status: newStatus })
            .eq('id', inquiryId);
        
        if (error) {
            console.error('Error updating status:', error);
        }
        loadInquiries();
    };

    const handleConvert = async (e) => {
        const inquiryId = e.target.closest('button').dataset.id;
        const { data: inquiry, error: fetchError } = await supabase
            .from('project_inquiries')
            .select('*')
            .eq('id', inquiryId)
            .single();

        if (fetchError) {
            console.error('Error fetching inquiry for conversion:', fetchError);
            return;
        }

        // 1. Tambahkan data ke tabel tally_projects
        const { error: insertError } = await supabase.from('tally_projects').insert([{
            project_title: `${inquiry.client_name} - ${inquiry.service_type}`,
            service_type: inquiry.service_type,
            project_needs: inquiry.project_requirements,
            project_category: 'Client',
            project_budget: inquiry.budget,
            client_name: inquiry.client_name,
            client_email: inquiry.client_email,
            client_whatsapp: inquiry.client_phone || null,
            tally_submission_id: null,
            status: 'in-progress'
        }]);

        if (insertError) {
            console.error('Error inserting into tally_projects:', insertError);
            return;
        }

        // 2. Ubah status inquiry menjadi 'completed'
        const { error: updateError } = await supabase
            .from('project_inquiries')
            .update({ status: 'completed' })
            .eq('id', inquiryId);

        if (updateError) {
            console.error('Error updating inquiry status:', updateError);
            return;
        }

        alert('Inquiry successfully converted to a project!');
        loadInquiries();
    };

    const handleDelete = async (e) => {
        const inquiryId = e.target.closest('button').dataset.id;
        if (confirm('Are you sure you want to delete this inquiry?')) {
            const { error } = await supabase
                .from('project_inquiries')
                .delete()
                .eq('id', inquiryId);

            if (error) console.error('Error deleting inquiry:', error);
            loadInquiries();
        }
    };
    
    // --- Pemuatan Data & Event Listeners ---
    const loadInquiries = async () => {
        const inquiries = await fetchInquiries();
        renderTable(inquiries);
    };

    addNewBtn.addEventListener('click', () => {
        document.getElementById('inquiryModalLabel').textContent = 'Add New Inquiry';
        document.getElementById('inquiry-id').value = '';
        inquiryForm.reset();
        inquiryModal.show();
    });

    inquiryForm.addEventListener('submit', handleSaveInquiry);

    inquiriesTableBody.addEventListener('change', async (e) => {
        if (e.target.classList.contains('status-selector')) {
            handleStatusChange(e);
        }
    });

    inquiriesTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button, .edit-btn');
        if (!target) return;

        if (target.classList.contains('edit-btn')) {
            const inquiryId = target.dataset.id;
            const { data: inquiry, error } = await supabase.from('project_inquiries').select('*').eq('id', inquiryId).single();
            if (error) {
                console.error('Error fetching inquiry for edit:', error);
                return;
            }

            document.getElementById('inquiryModalLabel').textContent = 'Edit Inquiry';
            document.getElementById('inquiry-id').value = inquiry.id;
            document.getElementById('client-name').value = inquiry.client_name;
            document.getElementById('client-email').value = inquiry.client_email;
            document.getElementById('service-type').value = inquiry.service_type || '';
            document.getElementById('budget').value = inquiry.budget || '';
            document.getElementById('project-requirements').value = inquiry.project_requirements || '';
            
            inquiryModal.show();
        } else if (target.classList.contains('delete-btn')) {
            handleDelete(e);
        } else if (target.classList.contains('convert-btn')) {
            handleConvert(e);
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

    loadInquiries();
});
