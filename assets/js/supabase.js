import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://xtarsaurwclktwhhryas.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXJzYXVyd2Nsa3R3aGhyeWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDM1ODksImV4cCI6MjA2NzM3OTU4OX0.ZAgs8NbZs8F2GuBVfiFYuyqOLrRC1hemdMyE-i4riYI'
)

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