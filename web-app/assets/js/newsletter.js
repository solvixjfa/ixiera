// [PERBAIKAN] Impor fungsi 'getSupabase' dari file client pusat
import { getSupabase } from './supabase-client.js';

// [PERBAIKAN] Panggil fungsi untuk mendapatkan koneksi Supabase
const supabase = getSupabase();

// --- ENHANCED VALIDATION TANPA UBAH LOGIC UTAMA ---

// ✅ VALIDASI EMAIL LEBIH KETAT
function isValidEmail(email) {
  if (!email) return false;
  
  const trimmed = email.trim().toLowerCase();
  
  // 1. Cek format dasar @ dan .
  if (!trimmed.includes('@') || !trimmed.includes('.')) {
    return false;
  }
  
  // 2. Cek panjang reasonable
  if (trimmed.length < 8 || trimmed.length > 254) {
    return false;
  }
  
  // 3. Cek domain valid (harus ada . dan minimal 2 char setelah .)
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  
  const domain = parts[1];
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;
  
  // 4. Domain umum yang diperbolehkan (expandable)
  const allowedDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
    'ymail.com', 'aol.com', 'protonmail.com', 'mail.com', 'gmx.com',
    'live.com', 'msn.com', 'rocketmail.com', 'zoho.com', 'yandex.com'
  ];
  
  const isAllowedDomain = allowedDomains.some(domain => 
    domain === parts[1] || parts[1].endsWith('.' + domain)
  );
  
  return isAllowedDomain;
}

// ✅ CEK EMAIL RANDOM & PATTERN SPAM
function isLikelySpam(email) {
  if (!email) return true;
  
  const trimmed = email.trim().toLowerCase();
  
  // 1. Pattern email random (a1@, test@, 123@, dll)
  const spamPatterns = [
    /^[a-z]{1,3}[0-9]{1,4}@/, // a12@, xy123@
    /^test@/i, // test@
    /^[0-9]+@/, // 123@, 12345@
    /^[a-z]@[a-z]/, // a@b
    /^admin@/, // admin@
    /^info@/, // info@
    /^contact@/, // contact@
    /^webmaster@/, // webmaster@
  ];
  
  if (spamPatterns.some(pattern => pattern.test(trimmed))) {
    return true;
  }
  
  // 2. Cek jika username terlalu random
  const username = trimmed.split('@')[0];
  const randomCharRatio = (username.match(/[0-9]/g) || []).length / username.length;
  
  // Jika > 50% karakter adalah angka, kemungkinan random
  if (randomCharRatio > 0.5 && username.length < 6) {
    return true;
  }
  
  // 3. Cek consecutive numbers (123, 456, dll)
  if (/\d{3,}/.test(username)) {
    const numbers = username.match(/\d+/g);
    if (numbers) {
      for (let num of numbers) {
        if (num.length >= 3) {
          // Cek jika angka consecutive
          let isConsecutive = true;
          for (let i = 1; i < num.length; i++) {
            if (parseInt(num[i]) !== parseInt(num[i-1]) + 1) {
              isConsecutive = false;
              break;
            }
          }
          if (isConsecutive) return true;
        }
      }
    }
  }
  
  return false;
}

// ✅ HONEYPOT FIELD ANTI-BOT (tidak terlihat oleh user)
function initHoneypot(form) {
  const honeypot = document.createElement('input');
  honeypot.type = 'text';
  honeypot.name = 'honeypot';
  honeypot.style.display = 'none';
  honeypot.style.position = 'absolute';
  honeypot.style.left = '-9999px';
  honeypot.setAttribute('autocomplete', 'off');
  honeypot.setAttribute('tabindex', '-1');
  form.appendChild(honeypot);
  return honeypot;
}

// ✅ TIMESTAMP VALIDATION (cegah instant submission)
let formLoadTime = Date.now();

// ✅ ENHANCED SUBMISSION HANDLER
function initNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    const status = document.getElementById('form-status');

    if (!form) return;

    // Tambah honeypot field
    const honeypot = initHoneypot(form);
    
    // Track waktu load form
    formLoadTime = Date.now();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = form.querySelector('input[type="email"]');
      const email = emailInput.value.trim();
      const sourceInput = form.querySelector('[name="source"]');
      const source = sourceInput ? sourceInput.value : 'website';
      const honeypotValue = honeypot.value;

      // ✅ VALIDASI TAMBAHAN TANPA UBAH FLOW UTAMA
      
      // 1. Cek honeypot (jika diisi = bot)
      if (honeypotValue && honeypotValue.trim() !== '') {
        status.textContent = 'Terjadi kesalahan. Silakan coba lagi.';
        return;
      }
      
      // 2. Cek waktu submission (terlalu cepat = bot)
      const submitTime = Date.now();
      if (submitTime - formLoadTime < 2000) { // Kurang dari 2 detik
        status.textContent = 'Silakan tunggu sebentar sebelum mengirim.';
        return;
      }

      // 3. Validasi email kosong
      if (!email) {
        status.textContent = 'Email wajib diisi.';
        return;
      }
      
      // 4. Validasi email format
      if (!isValidEmail(email)) {
        status.textContent = 'Format email tidak valid. Gunakan email dengan domain yang umum (Gmail, Yahoo, dll).';
        return;
      }
      
      // 5. Cek pattern spam
      if (isLikelySpam(email)) {
        status.textContent = 'Email tidak valid. Silakan gunakan email pribadi yang aktif.';
        return;
      }

      // ✅ LOGIC UTAMA TETAP SAMA
      status.textContent = 'Mengirim...';

      const { error } = await subscribeToNewsletter(email, source);

      if (error) {
        if (error.code === '23505') {
          status.textContent = '️Email ini sudah terdaftar.';
        } else {
          status.textContent = 'Error: ' + error.message;
        }
      } else {
        status.textContent = 'Berhasil berlangganan!';
        form.reset();
      }
    });
    
    // ✅ REAL-TIME VALIDATION (user experience)
    const emailInput = form.querySelector('input[type="email"]');
    if (emailInput) {
      emailInput.addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && !isValidEmail(email)) {
          this.style.borderColor = '#ff4444';
        } else {
          this.style.borderColor = '';
        }
      });
    }
}

// ✅ FUNGSI UTAMA TETAP SAMA
async function subscribeToNewsletter(email, source = 'website') {
  return await supabase
    .from('newsletter_subscribers')
    .insert([{ email, source }]);
}

// Jalankan fungsi inisialisasi setelah seluruh halaman dimuat
document.addEventListener('DOMContentLoaded', initNewsletterForm);