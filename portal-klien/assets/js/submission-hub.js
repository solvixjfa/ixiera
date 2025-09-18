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

    // --- SUNTIKKAN USER ID KE DALAM FORMULIR TALLY ---
    const tallyFormIframe = document.getElementById('tally-form');
    if (user && tallyFormIframe) {
        // Ini akan menambahkan user_id ke URL formulir Tally.
        // Pastikan Anda sudah menambahkan field tersembunyi 'user_id' di Tally.
        tallyFormIframe.src = `https://tally.so/r/mKrbk8?user_id=${userId}`;
    }

    // --- DOM REFERENCES ---
    const choiceContainer = document.getElementById('submission-choice');
    const formContainer = document.getElementById('form-container');
    const backButton = document.getElementById('back-to-choices');
    const helpForm = document.getElementById('help-form');
    const feedbackForm = document.getElementById('feedback-form');
    const historyList = document.getElementById('submission-history-list');
    const loader = document.getElementById('submission-history-loader');
    
    // --- DOM REFERENCES BARU UNTUK TALLY FORM ---
    const selectProjectTally = document.getElementById('select-project-tally');
    const tallyFormContainer = document.getElementById('tally-form-container');

    // --- UI LOGIC ---
    const showForm = (formType) => {
        choiceContainer.style.display = 'none';
        document.querySelectorAll('.submission-form').forEach(form => form.style.display = 'none');
        document.getElementById(`${formType}-form-container`).style.display = 'block';
        formContainer.style.display = 'block';
        backButton.style.display = 'block';
    };

    // --- LOGIC BARU UNTUK MENAMPILKAN TALLY FORM ---
    const showTallyForm = () => {
        choiceContainer.style.display = 'none';
        tallyFormContainer.style.display = 'block';
        formContainer.style.display = 'block';
        backButton.style.display = 'block';
    };

    const showChoices = () => {
        choiceContainer.style.display = 'block';
        formContainer.style.display = 'none';
        backButton.style.display = 'none';
        if (helpForm) helpForm.reset();
        if (feedbackForm) feedbackForm.reset();
        // Sembunyikan form Tally saat kembali ke pilihan
        if (tallyFormContainer) {
            tallyFormContainer.style.display = 'none';
        }
    };

    // --- EVENT LISTENERS ---
    if (selectProjectTally) {
        selectProjectTally.addEventListener('click', showTallyForm);
    }
    if (document.getElementById('select-help')) {
        document.getElementById('select-help').addEventListener('click', () => showForm('help'));
    }
    if (document.getElementById('select-feedback')) {
        document.getElementById('select-feedback').addEventListener('click', () => showForm('feedback'));
    }
    if (backButton) {
        backButton.addEventListener('click', showChoices);
    }

    // =================================================================
    // 2. CORE SUBMISSION HANDLER (UNTUK FORM LAINNYA)
    // =================================================================
    const submitHandler = async (event) => {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const formMessage = form.querySelector('.form-message');
        const originalButtonText = submitButton.innerHTML;
        const formType = form.id === 'help-form' ? 'help' : 'feedback';
        
        const formData = new FormData(form);
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Mengirim...`;
        formMessage.innerHTML = '';

        const insertData = {
            user_id: userId,
            title: formData.get('title'),
            description: formData.get('description'),
            status: 'Baru',
            feedback_type: form.id === 'feedback-form' ? formData.get('feedback_type') : null,
            urgency: form.id === 'help-form' ? formData.get('urgency') : null
        };
        
        try {
            const { error } = await window.dbClient.from('feedback').insert([insertData]);

            if (error) {
                console.error('Supabase Insert Error:', error);
                formMessage.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            } else {
                formMessage.innerHTML = `<div class="alert alert-success">Pengajuan berhasil dikirim!</div>`;
                await loadSubmissionHistory();
                setTimeout(() => { showChoices(); formMessage.innerHTML = ''; }, 2000);
            }
        } catch (e) {
            console.error('Fatal Error during submission:', e);
            formMessage.innerHTML = `<div class="alert alert-danger">Internal Error: ${e.message}</div>`;
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    };

    if (helpForm) {
        helpForm.addEventListener('submit', submitHandler);
    }
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', submitHandler);
    }

    // =================================================================
    // 3. HISTORY DISPLAY LOGIC (FINAL & FIXED)
    // =================================================================
    const getSubmissionTypeInfo = (data) => {
        if (data.hasOwnProperty('project_title')) return { icon: 'fas fa-rocket text-primary', label: 'Proyek Baru' };
        if (data.hasOwnProperty('urgency')) return { icon: 'fas fa-bug text-danger', label: 'Laporan Kendala' };
        if (data.hasOwnProperty('feedback_type')) return { icon: 'fas fa-lightbulb text-warning', label: 'Umpan Balik' };
        return { icon: 'fas fa-question-circle text-muted', label: 'Unknown' };
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

        try {
            // PERBAIKAN: Mengambil data dari tabel 'tally_projects' dan 'feedback'
            const { data: tallyProjects, error: tallyProjectsError } = await window.dbClient.from('tally_projects').select('*');
            const { data: feedback, error: feedbackError } = await window.dbClient.from('feedback').select('*').eq('user_id', userId);

            loader.style.display = 'none';

            if (tallyProjectsError || feedbackError) {
                console.error('Supabase History Fetch Error:', tallyProjectsError || feedbackError);
                historyList.innerHTML = `<li class="list-group-item text-danger">Gagal memuat riwayat.</li>`;
                return;
            }

            const allSubmissions = [...(tallyProjects || []), ...(feedback || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            if (!allSubmissions || allSubmissions.length === 0) {
                historyList.innerHTML = `<li class="list-group-item text-muted">Anda belum memiliki riwayat pengajuan.</li>`;
                return;
            }

            let html = '';
            allSubmissions.forEach(sub => {
                const typeInfo = getSubmissionTypeInfo(sub);
                const submissionDate = new Date(sub.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                const title = sub.title || sub.project_title || 'Tanpa Judul'; // Gunakan project_title dari Tally jika ada
                html += `<li class="list-group-item"><div class="d-flex justify-content-between align-items-start"><div class="d-flex"><div class="history-icon"><i class="${typeInfo.icon}"></i></div><div><h6 class="mb-0 fw-bold">${title}</h6><small class="text-muted">${typeInfo.label} • ${submissionDate}</small></div></div>${getStatusBadge(sub.status)}</div></li>`;
            });
            historyList.innerHTML = html;

        } catch (e) {
            console.error('Fatal Error during history loading:', e);
            historyList.innerHTML = `<li class="list-group-item text-danger">Terjadi kesalahan internal.</li>`;
        }
    };

    loadSubmissionHistory();
});
