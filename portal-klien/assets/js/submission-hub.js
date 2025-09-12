document.addEventListener('supabase-ready', async () => {
    // =================================================================
    // 1. SETUP & USER AUTHENTICATION
    // =================================================================
    const user = await window.getCurrentUser();
    if (!user) {
        if (!window.location.pathname.includes('sign-in.html')) window.location.href = 'sign-in.html';
        return;
    }
    const userId = user.id;

    // Display user info in header and pre-fill project form
    document.getElementById('username-display').innerText = user.user_metadata?.full_name || user.email.split('@')[0];
    document.getElementById('username-dropdown').innerText = user.user_metadata?.full_name || user.email.split('@')[0];
    document.getElementById('user-email-dropdown').innerText = user.email;
    document.getElementById('user_name').value = user.user_metadata?.full_name || '';
    document.getElementById('user_email').value = user.email || '';


    // =================================================================
    // 2. UI DYNAMIC FORM LOGIC
    // =================================================================
    const choiceContainer = document.getElementById('submission-choice');
    const formContainer = document.getElementById('form-container');
    const backButton = document.getElementById('back-to-choices');
    const allForms = document.querySelectorAll('.submission-form');

    const showForm = (formType) => {
        choiceContainer.style.display = 'none';
        allForms.forEach(form => form.style.display = 'none');
        document.getElementById(`${formType}-form-container`).style.display = 'block';
        formContainer.style.display = 'block';
        backButton.style.display = 'block';
    };

    const showChoices = () => {
        choiceContainer.style.display = 'block';
        formContainer.style.display = 'none';
        backButton.style.display = 'none';
        allForms.forEach(form => form.querySelector('form').reset());
         // Re-fill user data after reset
        document.getElementById('user_name').value = user.user_metadata?.full_name || '';
        document.getElementById('user_email').value = user.email || '';
    };

    document.getElementById('select-project').addEventListener('click', () => showForm('project'));
    document.getElementById('select-help').addEventListener('click', () => showForm('help'));
    document.getElementById('select-feedback').addEventListener('click', () => showForm('feedback'));
    backButton.addEventListener('click', showChoices);


    // =================================================================
    // 3. FORM SUBMISSION HANDLERS
    // =================================================================
    const genericSubmitHandler = async (event, submissionType, metadataFields) => {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        const formMessage = form.querySelector('.form-message');
        const formData = new FormData(form);

        const submissionData = {
            user_id: userId,
            submission_type: submissionType,
            title: formData.get('title'),
            description: formData.get('description'),
            status: 'Baru',
            metadata: {}
        };
        metadataFields.forEach(field => {
            const value = formData.get(field);
            if (value) submissionData.metadata[field] = value;
        });

        // UI loading state
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Mengirim...`;
        formMessage.innerHTML = '';

        const { error } = await window.dbClient.from('submissions').insert([submissionData]);

        if (error) {
            formMessage.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        } else {
            formMessage.innerHTML = `<div class="alert alert-success">Pengajuan berhasil dikirim!</div>`;
            await loadSubmissionHistory();
            setTimeout(() => {
                showChoices();
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                formMessage.innerHTML = '';
            }, 2000);
        }
    };

    const projectSubmitHandler = async (event) => {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        const formMessage = form.querySelector('.form-message');
        const formData = new FormData(form);

        // Collect all project needs checkboxes
        const needs = Array.from(form.querySelectorAll('input[name="project_needs"]:checked')).map(cb => cb.value);

        const submissionData = {
            user_id: userId,
            submission_type: 'Pengajuan Proyek',
            title: formData.get('title'),
            description: formData.get('description'),
            status: 'Baru',
            metadata: {
                user_name: formData.get('user_name'),
                user_email: formData.get('user_email'),
                user_whatsapp: formData.get('user_whatsapp'),
                service_type: formData.get('service_type'),
                project_category: formData.get('project_category'),
                project_budget: formData.get('project_budget'),
                project_needs: needs.join(', ')
            }
        };

        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Mengirim...`;
        formMessage.innerHTML = '';

        const { error } = await window.dbClient.from('submissions').insert([submissionData]);

        if (error) {
            formMessage.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        } else {
            formMessage.innerHTML = `<div class="alert alert-success">Proyek berhasil diajukan!</div>`;
            await loadSubmissionHistory();
            setTimeout(() => {
                showChoices();
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                formMessage.innerHTML = '';
            }, 2000);
        }
    };

    document.getElementById('project-form').addEventListener('submit', projectSubmitHandler);
    document.getElementById('help-form').addEventListener('submit', (e) => genericSubmitHandler(e, 'Bantuan Teknis', ['urgency']));
    document.getElementById('feedback-form').addEventListener('submit', (e) => genericSubmitHandler(e, 'Umpan Balik', ['feedback_type']));


    // =================================================================
    // 4. HISTORY DISPLAY LOGIC (WITH NEW STATUSES)
    // =================================================================
    const historyList = document.getElementById('submission-history-list');
    const loader = document.getElementById('submission-history-loader');

    const getSubmissionTypeInfo = (type) => {
        switch (type) {
            case 'Pengajuan Proyek': return { icon: 'fas fa-rocket text-primary', label: 'Proyek Baru' };
            case 'Bantuan Teknis': return { icon: 'fas fa-bug text-danger', label: 'Laporan Kendala' };
            case 'Umpan Balik': return { icon: 'fas fa-lightbulb text-warning', label: 'Umpan Balik' };
            default: return { icon: 'fas fa-question-circle text-muted', label: type };
        }
    };
    
    const getStatusBadge = (status) => {
        const lowerCaseStatus = (status || '').toLowerCase();
        let badgeClass = 'bg-secondary';
        if (lowerCaseStatus.includes('baru')) badgeClass = 'bg-primary';
        else if (lowerCaseStatus.includes('pending')) badgeClass = 'bg-info text-dark';
        else if (lowerCaseStatus.includes('disetujui')) badgeClass = 'bg-success';
        else if (lowerCaseStatus.includes('dikerjakan')) badgeClass = 'bg-warning text-dark';
        else if (lowerCaseStatus.includes('selesai')) badgeClass = 'bg-dark';
        else if (lowerCaseStatus.includes('dibatalkan')) badgeClass = 'bg-danger';
        return `<span class="badge ${badgeClass}">${status || 'Unknown'}</span>`;
    };

    const loadSubmissionHistory = async () => {
        historyList.innerHTML = '';
        loader.style.display = 'block';

        const { data, error } = await window.dbClient.from('submissions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        loader.style.display = 'none';

        if (error) {
            historyList.innerHTML = `<li class="list-group-item text-danger">Gagal memuat riwayat.</li>`; return;
        }
        if (!data || data.length === 0) {
            historyList.innerHTML = `<li class="list-group-item text-muted">Anda belum memiliki riwayat pengajuan.</li>`; return;
        }

        let html = '';
        data.forEach(sub => {
            const typeInfo = getSubmissionTypeInfo(sub.submission_type);
            const submissionDate = new Date(sub.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            html += `<li class="list-group-item"><div class="d-flex justify-content-between align-items-start"><div class="d-flex"><div class="history-icon"><i class="${typeInfo.icon}"></i></div><div><h6 class="mb-0 fw-bold">${sub.title || 'Tanpa Judul'}</h6><small class="text-muted">${typeInfo.label} • ${submissionDate}</small></div></div>${getStatusBadge(sub.status)}</div></li>`;
        });
        historyList.innerHTML = html;
    };

    loadSubmissionHistory();
});


