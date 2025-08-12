// [PERUBAHAN] Impor koneksi Supabase dari file pusat
import { supabase } from './supabase-client.js';

// [TETAP SAMA] Semua logika newsletter Anda di bawah ini tidak diubah sama sekali.

async function subscribeToNewsletter(email, source = 'website') {
  return await supabase
    .from('newsletter_subscribers')
    .insert([{ email, source }])
}

function initNewsletterForm() {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('newsletter-form')
    const status = document.getElementById('form-status')

    if (!form) return

    form.addEventListener('submit', async (e) => {
      e.preventDefault()

      const email = document.getElementById('email').value.trim()
      const sourceInput = document.querySelector('[name="source"]')
      const source = sourceInput ? sourceInput.value : 'website'

      if (!email) {
        status.textContent = ' Email wajib diisi.'
        return
      }

      status.textContent = 'Mengirim...';

      const { error } = await subscribeToNewsletter(email, source)

      if (error) {
        if (error.code === '23505') {
          status.textContent = '️ Email sudah terdaftar.'
        } else {
          status.textContent = ' Error: ' + error.message
        }
      } else {
        status.textContent = 'Berhasil berlangganan!'
        form.reset()
      }
    })
  })
}

// ✅ Auto-panggil fungsinya langsung kalau dipanggil dari <script src="...">
initNewsletterForm()

