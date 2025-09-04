document.addEventListener('DOMContentLoaded', async function() {
    const loadComponent = async (selector, url) => {
        try {
            // [KUNCI] Menggunakan path absolut dari root domain
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Gagal memuat partial: ${url}. Status: ${response.status}`);
                return;
            }
            const data = await response.text();
            const element = document.querySelector(selector);
            if (element) {
                element.innerHTML = data;
            }
        } catch (error) {
            console.error(`Error saat fetch ${url}:`, error);
        }
    };

    const setActiveSidebarLink = () => {
        // Logika untuk menandai link aktif di sidebar
        const currentPath = window.location.pathname;
        const activePage = (currentPath === '/' || currentPath === '') ? 'index.html' : currentPath.split('/').pop();

        const sidebarLinks = document.querySelectorAll('#sidebar-placeholder .nav-item a');
        
        sidebarLinks.forEach(link => {
            const linkPage = link.getAttribute('href').split('/').pop();
            link.parentElement.classList.remove('active');
            if (linkPage === activePage) {
                link.parentElement.classList.add('active');
            }
        });
    };

    // Memuat SEMUA TIGA komponen secara bersamaan
    await Promise.all([
        loadComponent('#sidebar-placeholder', '/_partials/_sidebar.html'),
        loadComponent('#topbar-placeholder', '/_partials/_topbar.html'),
        loadComponent('#footer-placeholder', '/_partials/_footer.html')
    ]);

    // Setelah semua komponen DIJAMIN sudah termuat, baru jalankan fungsi ini
    setActiveSidebarLink();
});


