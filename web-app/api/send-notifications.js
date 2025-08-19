// File: web-app/api/send-notifications.js

// Handler utama untuk Vercel Serverless Function
export default async function handler(request, response) {
  // Hanya izinkan metode POST
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Ambil data lengkap yang dikirim oleh Supabase Edge Function
    const inquiryData = request.body;
    const { 
      client_name, 
      client_email, 
      service_type,
      client_phone,
      budget,
      deadline,
      project_requirements
    } = inquiryData;

    // --- OTOMATISASI EKSTERNAL DIMULAI ---

    const notificationMessage = `
🔔 **Permintaan Proyek Baru!**
----------------------------------
**Nama:** ${client_name}
**Email:** ${client_email}
**Telepon:** ${client_phone || 'Tidak ada'}
**Layanan:** ${service_type}
**Anggaran:** ${budget}
**Deadline:** ${deadline || 'Tidak ditentukan'}
**Kebutuhan:**
${project_requirements}
    `.trim();

    // Kirim notifikasi ke Slack
    try {
      // Ambil secrets dari Vercel Environment Variables
      const slackApiKey = process.env.SLACK_API_KEY;
      const slackChannelId = process.env.SLACK_CHANNEL_ID;
      if (slackApiKey && slackChannelId) {
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${slackApiKey}`
          },
          body: JSON.stringify({
            channel: slackChannelId,
            text: notificationMessage.replace(/\*/g, '') // Hapus format bold untuk Slack
          })
        });
      }
    } catch (e) {
      console.error("Gagal mengirim ke Slack:", e.message);
      // Lanjutkan proses meskipun Slack gagal
    }

    // Kirim email follow-up ke klien via Resend
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Ixiera <onboarding@resend.dev>',
            to: [client_email],
            subject: 'Terima Kasih Telah Menghubungi Ixiera!',
            html: `<p>Halo ${client_name},<br><br>Terima kasih atas permintaan Anda untuk layanan <strong>${service_type}</strong>. Tim kami akan segera meninjaunya.</p>`,
          })
        });
      }
    } catch (e) {
      console.error("Gagal mengirim ke Resend:", e.message);
    }

    // Kirim balasan sukses bahwa tugas telah diterima
    response.status(200).json({ message: 'Notifications processed' });

  } catch (error) {
    console.error("Error utama di Vercel Function:", error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
}

