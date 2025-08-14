/**
 * =================================================================
 * Mesin Penerjemah Universal - Ixiera (FINAL REWRITE)
 * =================================================================
 * Versi ini ditulis ulang untuk stabilitas dan kejelasan.
 * - Logika utama disederhanakan.
 * - Penanganan kunci navigasi dan halaman diperbaiki.
 * =================================================================
 */
document.addEventListener('DOMContentLoaded', () => {

  const translations = {}; // Objek untuk menyimpan kamus

  // Fungsi untuk menerjemahkan halaman setelah kamus dimuat
  function translatePage(lang) {
    // 1. Set atribut bahasa di tag <html>
    document.documentElement.lang = lang;

    // 2. Terjemahkan semua elemen dengan atribut [data-translate]
    document.querySelectorAll('[data-translate]').forEach(element => {
      const key = element.getAttribute('data-translate');
      let translation = '';

      // Cek apakah ini kunci navigasi (e.g., "nav.home")
      if (key.startsWith('nav.')) {
        const navKey = key.substring(4); // Ambil "home" dari "nav.home"
        translation = translations[lang]?.nav?.[navKey];
      } else {
        // Jika bukan, ini adalah kunci halaman (e.g., "index_p_1")
        const pageKey = key.split('_')[0];
        translation = translations[lang]?.[pageKey]?.[key];
      }

      if (translation) {
        // Simpan elemen anak (seperti <i> atau <strong>)
        const childNodes = Array.from(element.childNodes).filter(node => node.nodeType === 1);
        element.textContent = translation;
        // Kembalikan elemen anak
        childNodes.forEach(child => element.appendChild(child));
      } else {
        console.warn(`Kunci terjemahan tidak ditemukan: "${key}"`);
      }
    });

    // 3. Update teks tombol bahasa secara spesifik
    const langToggleButton = document.getElementById('lang-toggle-btn');
    if (langToggleButton) {
      langToggleButton.textContent = translations[lang]?.nav?.language_toggle || lang;
    }
  }

  // Fungsi untuk mengambil kamus dan memulai terjemahan
  async function initializeTranslator() {
    try {
      const response = await fetch('/assets/translations.json');
      if (!response.ok) throw new Error('Kamus tidak ditemukan.');
      
      const data = await response.json();
      Object.assign(translations, data); // Salin kamus ke objek translations

      // Tentukan bahasa awal
      const initialLang = localStorage.getItem('selectedLanguage') || 'id';
      translatePage(initialLang);

    } catch (error) {
      console.error('Gagal menginisialisasi penerjemah:', error);
    }
  }

  // Definisikan fungsi toggle di window agar bisa diakses dari HTML
  window.toggleLanguage = () => {
    const currentLang = localStorage.getItem('selectedLanguage') || 'id';
    const newLang = currentLang === 'id' ? 'en' : 'id';
    localStorage.setItem('selectedLanguage', newLang);
    translatePage(newLang);
  };

  // Mulai semuanya
  initializeTranslator();
});

