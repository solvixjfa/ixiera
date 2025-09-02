// File: api/send-email.js

// Impor library Resend untuk mengirim email
import { Resend } from 'resend';

// Ambil API Key dari Environment Variables di Vercel
const resend = new Resend(process.env.RESEND_API_KEY);

// Ini adalah fungsi utama yang akan dijalankan Vercel
export default async function handler(req, res) {
  // Pastikan request datang dengan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  try {
    // --- PERBAIKAN UTAMA DI SINI ---
    // Data dari Supabase Webhook ada di dalam properti 'record'
    const { record: inquiryData } = req.body;

    // Validasi, pastikan 'record' dan email klien ada di dalam payload
    if (!inquiryData || !inquiryData.client_email) {
        console.error("Payload tidak valid dari Supabase Webhook:", req.body);
        return res.status(400).json({ error: "Data 'record' atau 'client_email' tidak ditemukan dalam payload." });
    }

    console.log(`Menerima permintaan untuk mengirim email ke: ${inquiryData.client_email}`);

    // Kirim email konfirmasi ke klien menggunakan Resend
    const { data, error } = await resend.emails.send({
      from: 'IXIERA <noreply@domain-resend-anda.com>', // PENTING: Ganti dengan email dan domain terverifikasi di Resend
      to: [inquiryData.client_email],
      subject: `Terima Kasih! Permintaan Proyek Anda Telah Kami Terima, ${inquiryData.client_name}`,
      html: `
        <h1>Halo ${inquiryData.client_name},</h1>
        <p>Terima kasih telah menghubungi kami. Kami telah menerima detail permintaan proyek Anda dan akan segera meninjaunya.</p>
        <p>Kami akan menghubungi Anda kembali dalam 1-2 hari kerja.</p>
        <br>
        <p>Hormat kami,</p>
        <p><strong>Tim IXIERA</strong></p>
      `,
    });

    if (error) {
      console.error('Error dari Resend API:', error);
      return res.status(400).json({ error: 'Gagal mengirim email.', details: error });
    }

    console.log('Email berhasil dikirim, ID:', data.id);
    // Kirim balasan sukses jika email berhasil dikirim
    res.status(200).json({ message: 'Email berhasil dikirim', data });

  } catch (error) {
    console.error('Terjadi kesalahan internal:', error);
    res.status(500).json({ error: 'Terjadi kesalahan internal pada server.' });
  }
}

