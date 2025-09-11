document.addEventListener('DOMContentLoaded', async () => {
    // =================================================================
    // BAGIAN 1: AUTENTIKASI & DATA PENGGUNA
    // =================================================================
    
    // Mengambil sesi pengguna saat ini dari Supabase
    const { data: { session } } = await supabase.auth.getSession();

    // Jika tidak ada sesi (pengguna belum login), alihkan ke halaman login
    if (!session) {
        window.location.href = '/login.html'; // Ganti dengan halaman login Anda
        return; // Hentikan eksekusi script lebih lanjut
    }

    // Jika ada sesi, ambil data pengguna
    const user = session.user;
    const userEmail = user.email;
    const userId = user.id;
    // Ambil nama dari metadata, atau gunakan bagian awal email jika tidak ada
    const userName = user.user_metadata?.full_name || userEmail.split('@')[0];

    // Tampilkan data pengguna di elemen-elemen yang sesuai di header
    document.getElementById('username-display').innerText = userName;
    document.getElementById('username-dropdown').innerText = userName;
    document.getElementById('user-email-dropdown').innerText = userEmail;

    // Fungsi untuk handle logout
    const handleLogout = async (e) => {
        e.preventDefault(); // Mencegah link berpindah halaman
        await supabase.auth.signOut();
        window.location.href = '/login.html'; // Ganti dengan halaman login Anda
    };
    
    // Tambahkan event listener ke kedua tombol logout
    document.getElementById('logoutButton').addEventListener('click', handleLogout);
    document.getElementById('logoutButtonDropdown').addEventListener('click', handleLogout);


    // =================================================================
    // BAGIAN 2: SINKRONISASI TALLY FORM DENGAN PENGGUNA
    // =================================================================
    
    const tallyEmbed = document.querySelector('.tally-embed');
    // URL embed dari link Tally Anda (https://tally.so/r/mKrbk8)
    const baseTallyUrl = 'https://tally.so/embed/mKrbk8';
    
    // Membuat URL dinamis untuk diisi ke Hidden Fields Tally
    // Ini akan mengirimkan data pengguna yang sedang login bersamaan dengan isian form
    const dynamicTallyUrl = `${baseTallyUrl}?user_id=${userId}&user_email=${userEmail}&user_name=${encodeURIComponent(userName)}`;
    
    // Mengatur atribut src pada iframe Tally dengan URL yang dinamis
    tallyEmbed.src = dynamicTallyUrl;
    

    // =================================================================
    // BAGIAN 3: MENAMPILKAN RIWAYAT PENGAJUAN (SUBMISSION HISTORY)
    // =================================================================
    
    const historyList = document.getElementById('submission-history-list');
    const loader = document.getElementById('submission-history-loader');

    // Fungsi untuk mengubah status menjadi badge Bootstrap yang sesuai
    const getStatusBadge = (status) => {
        let badgeClass = 'bg-secondary'; // Warna default jika status tidak dikenali
        if (!status) return `<span class="badge ${badgeClass}">Unknown</span>`;
        
        const lowerCaseStatus = status.toLowerCase();
        if (lowerCaseStatus.includes('ditinjau') || lowerCaseStatus.includes('baru')) {
            badgeClass = 'bg-primary';
        } else if (lowerCaseStatus.includes('dikerjakan') || lowerCaseStatus.includes('progress')) {
            badgeClass = 'bg-warning text-dark';
        } else if (lowerCaseStatus.includes('selesai') || lowerCaseStatus.includes('completed')) {
            badgeClass = 'bg-success';
        } else if (lowerCaseStatus.includes('dibatalkan') || lowerCaseStatus.includes('cancelled')) {
            badgeClass = 'bg-danger';
        }
        return `<span class="badge ${badgeClass}">${status}</span>`;
    };

    // Fungsi untuk mengambil dan menampilkan data dari Supabase
    const loadSubmissionHistory = async () => {
        const { data, error } = await supabase
            .from('submissions') // Mengambil dari tabel 'submissions'
            .select('project_title, created_at, status') // Hanya kolom yang dibutuhkan
            .eq('user_id', userId) // Filter hanya untuk pengguna yang sedang login
            .order('created_at', { ascending: false }); // Urutkan dari yang terbaru

        // Sembunyikan loader setelah data diterima (baik sukses maupun gagal)
        loader.style.display = 'none';

        if (error) {
            console.error('Error fetching submission history:', error);
            historyList.innerHTML = `<li class="list-group-item text-danger">Gagal memuat riwayat.</li>`;
            return;
        }

        if (data.length === 0) {
            historyList.innerHTML = `<li class="list-group-item text-muted">Anda belum memiliki riwayat pengajuan.</li>`;
            return;
        }

        // Jika ada data, buat elemen HTML untuk setiap item riwayat
        let html = '';
        data.forEach(submission => {
            const submissionDate = new Date(submission.created_at).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
            html += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1 fw-bold">${submission.project_title || 'Tanpa Judul'}</h6>
                        <small class="text-muted">${submissionDate}</small>
                    </div>
                    ${getStatusBadge(submission.status)}
                </li>
            `;
        });
        historyList.innerHTML = html;
    };

    // Panggil fungsi untuk memuat riwayat saat halaman dibuka
    loadSubmissionHistory();
});

