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

    // --- Elemen DOM & Variabel Global ---
    const pageTitle = document.getElementById('page-title');
    const contentContainer = document.getElementById('content-container');
    const crudModalLabel = document.getElementById('crudModalLabel');
    const crudForm = document.getElementById('crudForm');
    const saveBtn = document.getElementById('saveBtn');
    const logoutLink = document.getElementById('logout-link');

    let currentTable = '';
    let currentId = null;

    // --- Definisi Kolom untuk Setiap Tabel ---
    const tableColumns = {
        clients: [
            { name: 'full_name', type: 'text', required: true },
            { name: 'avatar_url', type: 'text' }
        ],
        project_inquiries: [
            { name: 'client_name', type: 'text', required: true },
            { name: 'client_email', type: 'email', required: true },
            { name: 'client_phone', type: 'tel' },
            { name: 'service_type', type: 'text' },
            { name: 'project_requirements', type: 'textarea' },
            { name: 'budget', type: 'text' },
            { name: 'deadline', type: 'date' },
            { name: 'status', type: 'text' }
        ],
        tally_projects: [
            { name: 'project_title', type: 'text', required: true },
            { name: 'service_type', type: 'text' },
            { name: 'project_needs', type: 'textarea' },
            { name: 'project_category', type: 'text' },
            { name: 'project_budget', type: 'text' },
            { name: 'client_name', type: 'text' },
            { name: 'client_email', type: 'email' },
            { name: 'client_whatsapp', type: 'tel' },
            { name: 'status', type: 'text' }
        ],
        products: [
            { name: 'name', type: 'text', required: true },
            { name: 'description', type: 'textarea' },
            { name: 'price', type: 'text' },
            { name: 'image_path', type: 'text' },
            { name: 'is_active', type: 'checkbox' },
            { name: 'file_path', type: 'text' }
        ],
        posts: [
            { name: 'title', type: 'text', required: true },
            { name: 'content', type: 'textarea', required: true },
            { name: 'image_url', type: 'text' },
            { name: 'slug', type: 'text', required: true }
        ],
        comments: [
            { name: 'author_name', type: 'text', required: true },
            { name: 'content', type: 'textarea', required: true },
            { name: 'post_id', type: 'text', required: true }
        ],
        feedback: [
            { name: 'title', type: 'text', required: true },
            { name: 'status', type: 'text' },
            { name: 'description', type: 'textarea' },
            { name: 'feedback_type', type: 'text' },
            { name: 'urgency', type: 'text' }
        ],
        chat_sessions: [
            { name: 'user_id', type: 'text', required: true },
            { name: 'title', type: 'text' }
        ],
        chat_messages: [
            { name: 'session_id', type: 'text', required: true },
            { name: 'role', type: 'text', required: true },
            { name: 'content', type: 'textarea', required: true }
        ]
    };

    // --- Fungsi CRUD ---
    const fetchData = async (tableName) => {
        let { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
        if (error) {
            console.error(`Error fetching data from ${tableName}:`, error);
            return [];
        }
        return data;
    };

    const createData = async (tableName, rowData) => {
        const { error } = await supabase.from(tableName).insert([rowData]);
        if (error) {
            alert('Failed to create data: ' + error.message);
            console.error('Create error:', error);
            return false;
        }
        alert('Data created successfully!');
        return true;
    };

    const updateData = async (tableName, id, rowData) => {
        const { error } = await supabase.from(tableName).update(rowData).eq('id', id);
        if (error) {
            alert('Failed to update data: ' + error.message);
            console.error('Update error:', error);
            return false;
        }
        alert('Data updated successfully!');
        return true;
    };

    const deleteData = async (tableName, id) => {
        if (!confirm('Are you sure you want to delete this item?')) {
            return false;
        }
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) {
            alert('Failed to delete data: ' + error.message);
            console.error('Delete error:', error);
            return false;
        }
        alert('Data deleted successfully!');
        return true;
    };

    // --- Fungsi UI & Event Handlers ---
    const buildForm = (tableName, rowData = {}) => {
        crudForm.innerHTML = '';
        const columns = tableColumns[tableName];
        if (!columns) return;
        
        const formRow = document.createElement('div');
        formRow.className = 'row';

        columns.forEach(col => {
            const labelText = col.name.replace(/_/g, ' ');
            const value = rowData[col.name] !== undefined ? rowData[col.name] : '';
            const requiredAttr = col.required ? 'required' : '';
            const inputType = col.type;

            const formGroup = document.createElement('div');
            formGroup.className = 'mb-3 col-12 col-md-6';

            if (inputType === 'textarea') {
                formGroup.className = 'mb-3 col-12';
                formGroup.innerHTML = `
                    <label for="field-${col.name}" class="form-label">${labelText}</label>
                    <textarea class="form-control" id="field-${col.name}" name="${col.name}" rows="3" ${requiredAttr}>${value}</textarea>
                `;
            } else if (inputType === 'checkbox') {
                formGroup.className = 'mb-3 col-12';
                formGroup.innerHTML = `
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="field-${col.name}" name="${col.name}" ${value ? 'checked' : ''}>
                        <label class="form-check-label" for="field-${col.name}">${labelText}</label>
                    </div>
                `;
            } else {
                formGroup.innerHTML = `
                    <label for="field-${col.name}" class="form-label">${labelText}</label>
                    <input type="${inputType}" class="form-control" id="field-${col.name}" name="${col.name}" value="${value}" ${requiredAttr}>
                `;
            }
            formRow.appendChild(formGroup);
        });
        crudForm.appendChild(formRow);
    };

    const getFormData = () => {
        const formData = {};
        const columns = tableColumns[currentTable];
        columns.forEach(col => {
            const input = crudForm.querySelector(`#field-${col.name}`);
            if (input) {
                if (col.type === 'checkbox') {
                    formData[col.name] = input.checked;
                } else {
                    formData[col.name] = input.value;
                }
            }
        });
        return formData;
    };

    const renderTable = (data, tableName) => {
        const addNewButton = `
            <button class="btn btn-primary btn-sm"
                data-bs-toggle="modal" 
                data-bs-target="#crudModal" 
                id="addNewBtn" data-table="${tableName}">
                Add New
            </button>
        `;

        if (!data || data.length === 0) {
            contentContainer.innerHTML = `
                <div class="alert alert-info d-flex justify-content-between align-items-center" role="alert">
                    <span>No data found for ${tableName}.</span>
                    ${addNewButton}
                </div>
            `;
        } else {
            const tableHeaders = Object.keys(data[0]).filter(key => key !== 'id' && key !== 'user_id' && key !== 'tally_submission_id');
            
            let tableHTML = `
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${tableName.replace(/_/g, ' ')}</h5>
                        ${addNewButton}
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped my-0">
                                <thead>
                                    <tr>
                                        ${tableHeaders.map(header => `<th>${header.replace(/_/g, ' ')}</th>`).join('')}
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.map(row => `
                                        <tr data-id="${row.id}">
                                            ${tableHeaders.map(header => `<td>${row[header] || ''}</td>`).join('')}
                                            <td>
                                                <button class="btn btn-warning btn-sm edit-btn" data-bs-toggle="modal" data-bs-target="#crudModal" data-id="${row.id}" data-table="${tableName}">Edit</button>
                                                <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}" data-table="${tableName}">Delete</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            contentContainer.innerHTML = tableHTML;
        }

        // --- Event listener untuk Edit dan Delete ---
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEdit));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDelete));

        // Event listener untuk tombol Add New
        document.getElementById('addNewBtn').addEventListener('click', () => {
            currentId = null;
            crudModalLabel.textContent = `Add New ${currentTable.replace(/_/g, ' ')}`;
            buildForm(currentTable);
        });
    };

    const handlePageLoad = async () => {
        const path = window.location.pathname.split('/').pop();
        let tableName = '';
        let pageName = '';
    
        if (path.includes('crm-clients')) {
            tableName = 'clients';
            pageName = 'Clients';
        } else if (path.includes('crm-inquiries')) {
            tableName = 'project_inquiries';
            pageName = 'Inquiries';
        } else if (path.includes('crm-projects')) {
            tableName = 'tally_projects';
            pageName = 'Projects';
        } else if (path.includes('crm-products')) {
            tableName = 'products';
            pageName = 'Products';
        } else if (path.includes('blog-posts')) {
            tableName = 'posts';
            pageName = 'Posts';
        } else if (path.includes('blog-comments')) {
            tableName = 'comments';
            pageName = 'Comments';
        } else if (path.includes('feedback')) {
            tableName = 'feedback';
            pageName = 'Feedback';
        } else if (path.includes('chat')) {
            tableName = 'chat_sessions';
            pageName = 'Chat History';
        } else {
            tableName = 'clients';
            pageName = 'Clients';
        }
    
        currentTable = tableName;
        pageTitle.innerHTML = `<strong>${pageName}</strong> Management`;
    
        const data = await fetchData(tableName);
        renderTable(data, tableName);
    };

    const handleEdit = async (e) => {
        const id = e.target.dataset.id;
        const tableName = e.target.dataset.table;
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
        if (error) {
            console.error('Error fetching data for edit:', error);
            return;
        }
        currentId = id;
        crudModalLabel.textContent = `Edit ${tableName.replace(/_/g, ' ')}`;
        buildForm(tableName, data);
    };

    const handleDelete = async (e) => {
        const id = e.target.dataset.id;
        const tableName = e.target.dataset.table;
        if (await deleteData(tableName, id)) {
            handlePageLoad();
        }
    };

    saveBtn.addEventListener('click', async () => {
        const formData = getFormData();
        let success = false;
        
        if (currentId) {
            success = await updateData(currentTable, currentId, formData);
        } else {
            success = await createData(currentTable, formData);
        }

        if (success) {
            const crudModal = bootstrap.Modal.getInstance(document.getElementById('crudModal'));
            crudModal.hide();
            handlePageLoad();
        }
    });

    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // --- Dark Mode Logic ---
    const darkModeToggle = document.getElementById('darkModeToggle');

    const enableDarkMode = () => {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        darkModeToggle.innerHTML = '<i class="align-middle" data-feather="sun"></i>';
        feather.replace();
    };

    const disableDarkMode = () => {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        darkModeToggle.innerHTML = '<i class="align-middle" data-feather="moon"></i>';
        feather.replace();
    };

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        enableDarkMode();
    } else if (savedTheme === 'light') {
        disableDarkMode();
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        enableDarkMode();
    }

    darkModeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        if (document.body.classList.contains('dark-mode')) {
            disableDarkMode();
        } else {
            enableDarkMode();
        }
    });

    handlePageLoad();
});
