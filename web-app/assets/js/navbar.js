document.addEventListener('DOMContentLoaded', () => {
    const mobileNavToggleBtn = document.getElementById('mobile-nav-toggle-btn');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const body = document.body;
    const navMenu = document.getElementById('navmenu');

    // Fungsi untuk membuka navigasi mobile
    function openMobileNav() {
        body.classList.add('mobile-nav-active');
        mobileNavOverlay.classList.add('active');
        // Ganti ikon list menjadi ikon close
        mobileNavToggleBtn.classList.remove('bi-list');
        mobileNavToggleBtn.classList.add('bi-x');
    }

    // Fungsi untuk menutup navigasi mobile
    function closeMobileNav() {
        body.classList.remove('mobile-nav-active');
        mobileNavOverlay.classList.remove('active');
        // Ganti ikon close kembali menjadi ikon list
        mobileNavToggleBtn.classList.remove('bi-x');
        mobileNavToggleBtn.classList.add('bi-list');
    }

    // Event listener untuk tombol toggle (membuka/menutup menu)
    if (mobileNavToggleBtn) {
        mobileNavToggleBtn.addEventListener('click', (e) => {
            if (body.classList.contains('mobile-nav-active')) {
                closeMobileNav();
            } else {
                openMobileNav();
            }
        });
    }

    // Event listener untuk overlay (menutup menu saat klik di luar)
    if (mobileNavOverlay) {
        mobileNavOverlay.addEventListener('click', closeMobileNav);
    }
    
    // Event listener untuk menutup menu setelah link diklik (agar UX lebih baik)
    if (navMenu) {
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                // Hanya tutup jika berada di viewport mobile
                if (window.innerWidth <= 1200) { 
                    closeMobileNav();
                }
            });
        });
    }

    // Event listener untuk menutup menu jika ukuran layar diubah dari mobile ke desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1200) {
            closeMobileNav();
        }
    });

});
