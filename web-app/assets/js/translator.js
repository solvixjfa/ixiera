/**
 * =================================================================
 * Mesin Penerjemah Universal - Ixiera (FINAL & CORRECTED)
 * =================================================================
 * Perbaikan:
 * - Membaca struktur JSON yang benar (e.g., translations.id.index.index_h1_1)
 * - Menambahkan penanganan untuk link navigasi agar kelas 'active' tetap ada.
 * - Menggunakan teks deskriptif untuk tombol bahasa (English/Indonesia).
 * =================================================================
 */

// Fungsi utama untuk menerjemahkan halaman
function translatePage(translations, lang) {
  // 1. Set atribut 'lang' pada tag <html>
  document.documentElement.lang = lang;

  // 2. Terjemahkan semua elemen yang memiliki atribut [data-translate]
  document.querySelectorAll('[data-translate]').forEach(element => {
    const key = element.getAttribute('data-translate');
    
    // Ekstrak nama halaman dari kunci (e.g., 'index' dari 'index_h1_1')
    const pageKey = key.split('_')[0];
    
    // Ambil terjemahan dari path yang benar
    const translation = translations[lang]?.[pageKey]?.[key];

    if (translation) {
      if (element.placeholder) {
        element.placeholder = translation;
      } else {
        // Simpan elemen anak (seperti <i>) sebelum mengganti teks
        const childNodes = Array.from(element.childNodes).filter(node => node.nodeType === 1);
        element.textContent = translation;
        // Kembalikan elemen anak ke tempatnya
        childNodes.forEach(child => element.appendChild(child));
      }
    } else {
      // Jangan tampilkan error untuk 'nav' karena itu ditangani terpisah
      if(pageKey !== 'nav') {
        console.warn(`Kunci terjemahan tidak ditemukan: "${key}" untuk bahasa "${lang}".`);
      }
    }
  });

  // 3. Terjemahkan Navigasi secara khusus untuk menjaga kelas 'active'
  document.querySelectorAll('#navmenu a[data-translate], #navmenu span[data-translate]').forEach(link => {
    const key = link.getAttribute('data-translate');
    const translation = translations[lang]?.nav?.[key];
    if(translation) {
        // Hanya ganti teks di dalam link, bukan seluruh elemen
        const textNode = Array.from(link.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
        if(textNode) {
            textNode.textContent = translation;
        } else {
            link.textContent = translation;
        }
    }
  });


  // 4. Update teks pada tombol ganti bahasa
  const langToggleButton = document.getElementById('lang-toggle-btn');
  if (langToggleButton) {
    // [PERUBAHAN DI SINI] Mengambil teks dari kamus
    langToggleButton.textContent = translations[lang].nav.language_toggle;
  }
}

// Fungsi IIFE (Immediately Invoked Function Expression) async
(async () => {
  try {
    const response = await fetch('/assets/translations.json');
    if (!response.ok) {
      throw new Error(`Gagal memuat translations.json. Status: ${response.status}`);
    }
    const translations = await response.json();

    window.setLanguage = (lang) => {
      localStorage.setItem('selectedLanguage', lang);
      translatePage(translations, lang);
    };

    window.toggleLanguage = () => {
      const currentLang = localStorage.getItem('selectedLanguage') || 'id';
      const newLang = currentLang === 'id' ? 'en' : 'id';
      setLanguage(newLang);
    };

    // Tentukan bahasa awal saat halaman dimuat
    const initialLang = localStorage.getItem('selectedLanguage') || 'id';
    // Gunakan DOMContentLoaded untuk memastikan semua elemen siap sebelum menerjemahkan
    document.addEventListener('DOMContentLoaded', () => {
        translatePage(translations, initialLang);
    });
    // Fallback jika event sudah terjadi
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        translatePage(translations, initialLang);
    }

  } catch (error) {
    console.error("Terjadi kesalahan pada sistem terjemahan:", error);
  }
})();

