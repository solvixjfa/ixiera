/*
================================================================================
| JAVASCRIPT LOGIC FOR THE ORDER FORM
| Description: Handles form submission by sending data to a Supabase Edge
|              Function. Provides user feedback on success or failure.
================================================================================
*/
import { supabase } from './supabase-client.js'; // Pastikan path-nya benar


document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('order-form');
  const submitButton = document.getElementById('submit-button');
  const buttonText = submitButton.querySelector('.button-text');
  const spinner = submitButton.querySelector('.spinner-border');
  const formMessage = document.getElementById('form-message');

  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // Mencegah form mengirim data secara tradisional

    // --- UI Feedback: Loading State ---
    submitButton.disabled = true;
    spinner.style.display = 'inline-block';
    buttonText.textContent = 'Sending...';
    formMessage.innerHTML = ''; // Kosongkan pesan sebelumnya

    try {
      // --- Kumpulkan Data Form ---
      const formData = {
        client_name: document.getElementById('fullName').value,
        client_email: document.getElementById('email').value,
        client_phone: document.getElementById('whatsapp').value,
        service_type: document.getElementById('serviceType').value,
        project_requirements: document.getElementById('projectRequirements').value,
        budget: document.getElementById('budget').value || null, // Kirim null jika kosong
        deadline: document.getElementById('deadline').value || null, // Kirim null jika kosong
      };

      // --- Panggil Supabase Edge Function ---
      // PENTING: Ganti URL ini dengan URL Supabase Function Anda.
      const { data, error } = await window.dbClient.functions.invoke('submit-order', {
        body: formData,
      });

      if (error) {
        throw error; // Lemparkan error untuk ditangkap oleh blok catch
      }

      // --- UI Feedback: Success ---
      formMessage.innerHTML = `<div class="alert alert-success" role="alert">Thank you! Your inquiry has been sent successfully. We will contact you shortly.</div>`;
      form.reset(); // Kosongkan form setelah berhasil

    } catch (error) {
      // --- UI Feedback: Error ---
      console.error('Error submitting form:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      formMessage.innerHTML = `<div class="alert alert-danger" role="alert">Error: ${errorMessage}</div>`;
    } finally {
      // --- UI Feedback: Reset Button State ---
      submitButton.disabled = false;
      spinner.style.display = 'none';
      buttonText.textContent = 'Send Project Inquiry';
    }
  });
});

