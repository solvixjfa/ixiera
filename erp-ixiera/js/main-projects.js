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
    const projectsTableBody = document.getElementById('projects-table-body');
    const crudModal = new bootstrap.Modal(document.getElementById('crudModal'));
    const crudModalLabel = document.getElementById('crudModalLabel');
    const crudForm = document.getElementById('crudForm');
    const addNewBtn = document.getElementById('addNewBtn');
    const logoutLink = document.getElementById('logout-link');

    let currentProjectId = null;

    // --- Fungsi CRUD ---
    const fetchProjects = async () => {
        const { data, error } = await supabase.from('tally_projects').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching projects:', error);
            return [];
        }
        return data;
    };

    const renderTable = (projects) => {
        projectsTableBody.innerHTML = '';
        projects.forEach(project => {
            const row = document.createElement('tr');
            let statusClass;
            switch (project.status) {
                case 'in-progress':
                    statusClass = 'bg-info';
                    break;
                case 'completed':
                    statusClass = 'bg-success';
                    break;
                case 'paused':
                    statusClass = 'bg-warning';
                    break;
                case 'cancelled':
                    statusClass = 'bg-danger';
                    break;
                default:
                    statusClass = 'bg-secondary';
            }

            row.innerHTML = `
                <td>${project.project_title}</td>
                <td>${project.client_name || '-'}</td>
                <td><span class="badge ${statusClass}">${project.status}</span></td>
                <td>${project.project_budget || '-'}</td>
                <td>
                    <button class="btn btn-warning btn-sm edit-btn" data-id="${project.id}">
                        <i class="align-middle" data-feather="edit-2"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${project.id}">
                        <i class="align-middle" data-feather="trash-2"></i> Delete
                    </button>
                </td>
            `;
            projectsTableBody.appendChild(row);
        });
        feather.replace();
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const projectTitle = document.getElementById('projectTitle').value;
        const clientName = document.getElementById('clientName').value;
        const serviceType = document.getElementById('serviceType').value;
        const projectBudget = document.getElementById('projectBudget').value;
        const projectStatus = document.getElementById('projectStatus').value;
        const projectNeeds = document.getElementById('projectNeeds').value;

        const projectData = {
            project_title: projectTitle,
            client_name: clientName,
            service_type: serviceType,
            project_budget: projectBudget,
            status: projectStatus,
            project_needs: projectNeeds,
        };

        if (currentProjectId) {
            const { error } = await supabase.from('tally_projects').update(projectData).eq('id', currentProjectId);
            if (error) {
                console.error('Error updating project:', error);
            }
        } else {
            const { error } = await supabase.from('tally_projects').insert([projectData]);
            if (error) {
                console.error('Error creating project:', error);
            }
        }
        
        crudModal.hide();
        loadProjects();
    };

    const handleDelete = async (e) => {
        const projectId = e.target.closest('button').dataset.id;
        if (confirm('Are you sure you want to delete this project?')) {
            const { error } = await supabase.from('tally_projects').delete().eq('id', projectId);
            if (error) {
                console.error('Error deleting project:', error);
            }
            loadProjects();
        }
    };
    
    // --- Pemuatan Data & Event Listeners ---
    const loadProjects = async () => {
        const projects = await fetchProjects();
        renderTable(projects);
    };

    addNewBtn.addEventListener('click', () => {
        crudModalLabel.textContent = 'Add New Project';
        crudForm.reset();
        currentProjectId = null;
    });

    crudForm.addEventListener('submit', handleFormSubmit);

    projectsTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('.edit-btn, .delete-btn');
        if (!target) return;

        const projectId = target.dataset.id;

        if (target.classList.contains('edit-btn')) {
            const { data, error } = await supabase.from('tally_projects').select('*').eq('id', projectId).single();
            if (error) {
                console.error('Error fetching project for edit:', error);
                return;
            }

            crudModalLabel.textContent = 'Edit Project';
            document.getElementById('projectId').value = data.id;
            document.getElementById('projectTitle').value = data.project_title;
            document.getElementById('clientName').value = data.client_name;
            document.getElementById('serviceType').value = data.service_type;
            document.getElementById('projectBudget').value = data.project_budget;
            document.getElementById('projectStatus').value = data.status;
            document.getElementById('projectNeeds').value = data.project_needs;
            currentProjectId = data.id;
            crudModal.show();
        } else if (target.classList.contains('delete-btn')) {
            handleDelete(e);
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

    loadProjects();
});
