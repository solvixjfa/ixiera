// File: api/send-email.js

// Impor library Resend untuk mengirim email
import { Resend } from 'resend';

// Ambil API Key dari Environment Variables di Vercel, BUKAN di kode
const resend = new Resend(process.env.RESEND_API_KEY);

// Ini adalah fungsi utama yang akan dijalankan Vercel
export default async function handler(req, res) {
  // Pastikan request datang dari Supabase dengan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  try {
    // Ambil data klien yang dikirim oleh Supabase function
    const inquiryData = req.body;

    // Validasi sederhana, pastikan ada email klien
    if (!inquiryData.client_email) {
        return res.status(400).json({ error: 'Email klien tidak ditemukan' });
    }

    // Kirim email konfirmasi ke klien menggunakan Resend
    const { data, error } = await resend.emails.send({
      from: 'IXIERA <noreply@domain-resend-anda.com>', // GANTI dengan email dan domain terverifikasi di Resend
      to: [inquiryData.client_email],
      subject: 'Terima Kasih! Permintaan Proyek Anda Telah Kami Terima',
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
      console.error({ error });
      return res.status(400).json(error);
    }

    // Kirim balasan sukses jika email berhasil dikirim
    res.status(200).json({ message: 'Email berhasil dikirim', data });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Terjadi kesalahan internal pada server' });
  }
}

