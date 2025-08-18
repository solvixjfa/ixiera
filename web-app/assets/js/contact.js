// [PRODUKSI] Impor dan panggil fungsi getSupabase dari file pusat
import { getSupabase } from './supabase-client.js';
const supabase = getSupabase();

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('order-form');
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const buttonText = submitButton.querySelector('.button-text');
  const formMessage = document.getElementById('form-message');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const originalButtonText = buttonText.textContent;
    submitButton.disabled = true;
    buttonText.textContent = 'Mengirim...';
    formMessage.innerHTML = '';

    try {
      // [PERBAIKAN] Kumpulkan data form dengan cara yang lebih aman
      
      // Cari elemen opsional terlebih dahulu
      const budgetEl = document.getElementById('budget');
      const currencyEl = document.getElementById('currency');
      const deadlineEl = document.getElementById('deadline');

      // Ambil nilainya hanya jika elemennya ada
      const budgetValue = budgetEl ? budgetEl.value : null;
      const currencyValue = currencyEl ? currencyEl.value : 'IDR';
      const fullBudget = budgetValue ? `${currencyValue} ${budgetValue}` : null;
      const deadlineValue = deadlineEl ? deadlineEl.value || null : null;

      const formData = {
        client_name: document.getElementById('fullName').value,
        client_email: document.getElementById('email').value,
        client_phone: document.getElementById('phone').value,
        service_type: document.getElementById('serviceType').value,
        project_requirements: document.getElementById('projectRequirements').value,
        budget: fullBudget,
        deadline: deadlineValue,
      };

      const { data, error } = await supabase.functions.invoke('submit-order', {
        body: formData,
      });

      if (error || (data && data.error)) {
        console.error('Submission Error:', error || data.error);
        throw new Error('Gagal mengirim pesan Anda. Silakan coba lagi nanti.');
      }

      formMessage.innerHTML = `<div class="alert alert-success" role="alert">
        <strong>Terima kasih!</strong> Pesan Anda telah berhasil terkirim. Kami akan segera menghubungi Anda.
      </div>`;
      form.reset();

    } catch (error) {
      formMessage.innerHTML = `<div class="alert alert-danger" role="alert">
        <strong>Terjadi Kesalahan:</strong> ${error.message}
      </div>`;
    } finally {
      submitButton.disabled = false;
      buttonText.textContent = originalButtonText;
    }
  });
});

