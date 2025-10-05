/**
 * File: dark-mode-bootstrap.js
 * Simple smooth theme toggle
 */

(() => {
    'use strict';

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const htmlElement = document.documentElement;

    const getPreferredTheme = () => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) return storedTheme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const setTheme = (theme) => {
        // Smooth transition untuk seluruh page
        htmlElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        htmlElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
        updateToggleIcon(theme);
        
        setTimeout(() => {
            htmlElement.style.transition = '';
        }, 300);
    };

    const updateToggleIcon = (theme) => {
        if (!themeToggleBtn) return;
        
        const icon = themeToggleBtn.querySelector('i');
        
        if (theme === 'dark') {
            icon.className = 'bi bi-moon';
            themeToggleBtn.classList.add('btn-dark');
            themeToggleBtn.classList.remove('btn-outline-dark');
        } else {
            icon.className = 'bi bi-sun';
            themeToggleBtn.classList.add('btn-outline-dark');
            themeToggleBtn.classList.remove('btn-dark');
        }
    };

    // Initialize
    const currentTheme = getPreferredTheme();
    setTheme(currentTheme);

    // Click event
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

})();