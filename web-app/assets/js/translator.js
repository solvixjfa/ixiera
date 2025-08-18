/**
 * =================================================================
 * Mesin Penerjemah Universal - Ixiera (FINAL & STABIL)
 * =================================================================
 * Versi ini ditulis ulang dari awal untuk mengatasi semua bug.
 * Logikanya sekarang sangat sederhana dan andal.
 * =================================================================
 */
function applyTranslations(translations, lang) {
  // Set bahasa utama dokumen
  document.documentElement.lang = lang;

  // Terjemahkan semua elemen yang memiliki penanda
  document.querySelectorAll('[data-translate]').forEach(element => {
    const key = element.getAttribute('data-translate');
    let translation;

    // Coba cari di bagian 'nav' terlebih dahulu
    if (translations[lang] && translations[lang].nav && translations[lang].nav[key]) {
      translation = translations[lang].nav[key];
    } 
    // Jika tidak ada, cari di bagian halaman (misal: 'index')
    else {
      const pageKey = key.split('_')[0];
      if (translations[lang] && translations[lang][pageKey] && translations[lang][pageKey][key]) {
        translation = translations[lang][pageKey][key];
      }
    }

    // Jika terjemahan ditemukan, ganti teksnya
    if (translation) {
      // Trik untuk menjaga elemen di dalam (seperti ikon <i>)
      const innerHTMLBefore = element.innerHTML;
      const textContentOnly = element.textContent;
      const newInnerHTML = innerHTMLBefore.replace(textContentOnly, translation);
      element.innerHTML = newInnerHTML;
    } else {
      console.warn(`Kunci terjemahan tidak ditemukan: "${key}"`);
    }
  });

  // Update tombol bahasa secara spesifik
  const langToggleButton = document.getElementById('lang-toggle-btn');
  if (langToggleButton) {
    langToggleButton.textContent = translations[lang]?.nav?.language_toggle || lang.toUpperCase();
  }
}

async function initializeTranslator() {
  try {
    // Ambil kamus dari file JSON
    const response = await fetch('./assets/translations.json');
    if (!response.ok) throw new Error('File translations.json tidak ditemukan atau gagal dimuat.');
    
    const translations = await response.json();

    // Definisikan fungsi toggle agar bisa diakses dari HTML
    window.toggleLanguage = () => {
      const currentLang = localStorage.getItem('selectedLanguage') || 'id';
      const newLang = currentLang === 'id' ? 'en' : 'id';
      localStorage.setItem('selectedLanguage', newLang);
      applyTranslations(translations, newLang);
    };

    // Terapkan bahasa awal saat halaman dimuat
    const initialLang = localStorage.getItem('selectedLanguage') || 'id';
    applyTranslations(translations, initialLang);

  } catch (error) {
    console.error('Error pada sistem terjemahan:', error);
  }
}

// Jalankan setelah semua elemen halaman siap
document.addEventListener('DOMContentLoaded', initializeTranslator);

