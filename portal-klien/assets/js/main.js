document.addEventListener('DOMContentLoaded', async function() {
    const body = document.body;

    // --- FUNGSI UNTUK MEMUAT KOMPONEN HTML ---
    // Menggunakan async/await agar lebih mudah dibaca
    const loadComponent = async (selector, url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.text();
            const element = document.querySelector(selector);
            if (element) element.innerHTML = data;
        } catch (error) {
            console.error(`Error loading component from ${url}:`, error);
        }
    };

    // Muat semua komponen secara bersamaan dan tunggu hingga selesai
    await Promise.all([
        loadComponent('#sidebar-placeholder', '_partials/_sidebar.html'),
        loadComponent('#footer-placeholder', '_partials/_footer.html')
    ]);

    // --- SETELAH KOMPONEN DIMUAT, JALANKAN LOGIKA LAIN ---

    // 1. Logika untuk menandai link sidebar yang aktif
    const currentPage = window.location.pathname.split('/').pop();
    const sidebarLinks = document.querySelectorAll('#sidebar-placeholder .nav-item a');
    sidebarLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.parentElement.classList.add('active');
        }
    });

    // 2. Logika untuk Sidebar Toggle
    const sidebarToggleButtons = document.querySelectorAll('.toggle-sidebar');
    const setSidebarState = () => {
        if (window.innerWidth < 992) body.classList.add('sidebar-gone');
        else body.classList.remove('sidebar-gone');
    };
    setSidebarState();
    window.addEventListener('resize', setSidebarState);
    sidebarToggleButtons.forEach(button => {
        button.addEventListener('click', () => body.classList.toggle('sidebar-gone'));
    });

    // 3. Logika untuk Mode Imersif (hanya jika elemennya ada di halaman ini)
    const enterForumBtn = document.getElementById('enter-forum-btn');
    const exitForumBtn = document.getElementById('exit-forum-btn');
    if (enterForumBtn && exitForumBtn) {
        enterForumBtn.addEventListener('click', () => body.classList.add('immersive-mode'));
        exitForumBtn.addEventListener('click', () => body.classList.remove('immersive-mode'));
    }
});


