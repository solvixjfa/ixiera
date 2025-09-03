document.addEventListener('DOMContentLoaded', async function() {
    const loadComponent = async (selector, url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) return;
            const data = await response.text();
            const element = document.querySelector(selector);
            if (element) element.innerHTML = data;
        } catch (error) {
            // Fails silently in production
        }
    };

    await Promise.all([
        loadComponent('#sidebar-placeholder', '/_partials/_sidebar.html'),
        loadComponent('#topbar-placeholder', '/_partials/_topbar.html'),
        loadComponent('#footer-placeholder', '/_partials/_footer.html')
    ]);

    const setActiveSidebarLink = () => {
        const activePage = (window.location.pathname === '/') ? '/index.html' : window.location.pathname;
        const sidebarLinks = document.querySelectorAll('#sidebar-placeholder .nav-item a');
        sidebarLinks.forEach(link => {
            if (link.getAttribute('href') === activePage) {
                link.parentElement.classList.add('active');
            }
        });
    };

    setActiveSidebarLink();
});


