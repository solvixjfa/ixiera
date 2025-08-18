// [PRODUKSI] Impor dan panggil fungsi getSupabase dari file pusat
import { getSupabase } from './supabase-client.js';
const supabase = getSupabase();

document.addEventListener('DOMContentLoaded', () => {
  // Pastikan kita berada di halaman yang memiliki form kontak
  const form = document.getElementById('order-form');
  if (!form) return; // Jika tidak ada form, hentikan script

  const submitButton = document.getElementById('submit-button');
  const buttonText = submitButton.querySelector('.button-text');
  const spinner = submitButton.querySelector('.spinner-border');
  const formMessage = document.getElementById('form-message');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // --- UI Feedback: Loading ---
    submitButton.disabled = true;
    spinner.style.display = 'inline-block';
    buttonText.textContent = 'Mengirim...';
    formMessage.innerHTML = ''; // Selalu bersihkan pesan sebelumnya

    try {
      // --- Kumpulkan Data Form ---
      const formData = {
        client_name: document.getElementById('fullName').value,
        client_email: document.getElementById('email').value,
        client_phone: document.getElementById('whatsapp').value,
        service_type: document.getElementById('serviceType').value,
        project_requirements: document.getElementById('projectRequirements').value,
        budget: document.getElementById('budget').value || null,
        deadline: document.getElementById('deadline').value || null,
      };

      // --- Panggil Edge Function ---
      const { data, error } = await supabase.functions.invoke('submit-order', {
        body: formData,
      });

      // Tangani semua jenis error
      if (error || (data && data.error)) {
        // Catat error teknis di console untuk developer
        console.error('Submission Error:', error || data.error);
        // Tampilkan pesan yang ramah untuk pengguna
        throw new Error('Gagal mengirim pesan Anda. Silakan coba lagi nanti.');
      }

      // --- UI Feedback: Sukses ---
      // Tampilkan pesan sukses yang jelas dan profesional
      formMessage.innerHTML = `<div class="alert alert-success" role="alert">
        <strong>Terima kasih!</strong> Pesan Anda telah berhasil terkirim. Kami akan segera menghubungi Anda.
      </div>`;
      form.reset(); // Kosongkan form setelah berhasil

    } catch (error) {
      // --- UI Feedback: Gagal ---
      // Tampilkan pesan error yang ramah untuk pengguna
      formMessage.innerHTML = `<div class="alert alert-danger" role="alert">
        <strong>Terjadi Kesalahan:</strong> ${error.message}
      </div>`;
    } finally {
      // --- UI Feedback: Reset Tombol ---
      // Ini akan selalu dijalankan, baik berhasil maupun gagal
      submitButton.disabled = false;
      spinner.style.display = 'none';
      buttonText.textContent = 'Kirim Permintaan Proyek';
    }
  });
});

