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
      // Kumpulkan data dari form HTML Anda
      const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        serviceType: document.getElementById('serviceType').value,
        projectRequirements: document.getElementById('projectRequirements').value,
        budget: document.getElementById('budget').value,
        currency: document.getElementById('currency').value,
        deadline: document.getElementById('deadline').value || null,
      };

      // Panggil Edge Function
      const { data, error } = await supabase.functions.invoke('submit-order', {
        body: formData,
      });

      if (error || (data && data.error)) {
        console.error('Submission Error:', error || data.error);
        throw new Error('Gagal mengirim pesan Anda. Silakan coba lagi nanti.');
      }

      formMessage.innerHTML = `<div class="alert alert-success" role="alert"><strong>Terima kasih!</strong> Pesan Anda telah berhasil terkirim.</div>`;
      form.reset();

    } catch (error) {
      formMessage.innerHTML = `<div class="alert alert-danger" role="alert"><strong>Terjadi Kesalahan:</strong> ${error.message}</div>`;
    } finally {
      submitButton.disabled = false;
      buttonText.textContent = originalButtonText;
    }
  });
});

