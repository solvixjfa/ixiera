// [PERBAIKAN] Impor fungsi 'getSupabase' dari file client pusat
import { getSupabase } from './supabase-client.js';

// [PERBAIKAN] Panggil fungsi untuk mendapatkan koneksi Supabase
const supabase = getSupabase();

// --- Logika Newsletter (Tidak ada yang diubah di bawah ini) ---

async function subscribeToNewsletter(email, source = 'website') {
  return await supabase
    .from('newsletter_subscribers')
    .insert([{ email, source }])
}

function initNewsletterForm() {
    const form = document.getElementById('newsletter-form')
    const status = document.getElementById('form-status')

    if (!form) return

    form.addEventListener('submit', async (e) => {
      e.preventDefault()

      const email = form.querySelector('input[type="email"]').value.trim();
      const sourceInput = form.querySelector('[name="source"]')
      const source = sourceInput ? sourceInput.value : 'website'

      if (!email) {
        status.textContent = 'Email wajib diisi.';
        return
      }

      status.textContent = 'Mengirim...';

      const { error } = await subscribeToNewsletter(email, source)

      if (error) {
        if (error.code === '23505') { // Kode error untuk duplikat
          status.textContent = '️Email ini sudah terdaftar.';
        } else {
          status.textContent = 'Error: ' + error.message
        }
      } else {
        status.textContent = 'Berhasil berlangganan!';
        form.reset()
      }
    })
}

// Jalankan fungsi inisialisasi setelah seluruh halaman dimuat
document.addEventListener('DOMContentLoaded', initNewsletterForm);

