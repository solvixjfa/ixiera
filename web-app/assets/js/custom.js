/**
 * File: dark-mode-bootstrap.js
 * Deskripsi: Skrip untuk mengelola pengalihan tema terang/gelap
 * di situs yang menggunakan Bootstrap 5.
 */

// Menggunakan IIFE (Immediately Invoked Function Expression)
// untuk menghindari polusi variabel global.
(() => {
    'use strict';

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const htmlElement = document.documentElement;

    /**
     * Mengambil tema yang tersimpan di localStorage atau dari preferensi sistem.
     * @returns {'light' | 'dark'} Tema yang dipilih.
     */
    const getPreferredTheme = () => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            return storedTheme;
        }
        // Jika tidak ada tema tersimpan, gunakan preferensi sistem (OS)
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    /**
     * Mengatur tema pada elemen <html> dan menyimpannya di localStorage.
     * @param {string} theme - Tema yang akan diatur ('light' atau 'dark').
     */
    const setTheme = (theme) => {
        htmlElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
    };

    // Atur tema saat halaman pertama kali dimuat
    const currentTheme = getPreferredTheme();
    setTheme(currentTheme);

    // Pastikan tombolnya ada sebelum menambahkan event listener
    if (themeToggleBtn) {
        // Tambahkan event listener untuk tombol pengalih tema
        themeToggleBtn.addEventListener('click', () => {
            // Dapatkan tema saat ini dari atribut data-bs-theme
            const newTheme = htmlElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    // (Opsional) Dengarkan perubahan preferensi tema dari sistem operasi
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        // Hanya ubah jika pengguna belum memilih secara manual di localStorage
        if (!localStorage.getItem('theme')) {
            setTheme(event.matches ? 'dark' : 'light');
        }
    });
})();

