import { supabase } from './supabase-client.js';

// --- FUNGSI-FUNGSI UNTUK KOMENTAR ---
async function loadComments(postId) {
    // ... (Fungsi ini tetap sama seperti sebelumnya) ...
}
function handleCommentSubmit(postId) {
    // ... (Fungsi ini tetap sama seperti sebelumnya) ...
}

// --- FUNGSI UTAMA (DIMODIFIKASI DENGAN PENANGANAN ERROR) ---
async function loadBlogPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postSlug = urlParams.get('slug');
    const articleContainer = document.getElementById('article-container');

    if (!articleContainer || !postSlug) {
        if (articleContainer) articleContainer.innerHTML = '<p class="text-center text-danger">Artikel tidak ditemukan. URL tidak valid.</p>';
        return;
    }

    // [PERBAIKAN] Kita bungkus semua logika utama dalam blok try...catch
    try {
        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('slug', postSlug)
            .single();

        // Jika Supabase mengembalikan error atau post tidak ditemukan, kita "lemparkan" error
        if (error || !post) {
            // Kita buat pesan error yang lebih jelas
            throw new Error('Artikel dengan slug ini tidak ditemukan di database.');
        }

        // Hapus efek skeleton loading
        const placeholders = document.querySelectorAll('.placeholder');
        placeholders.forEach(el => el.classList.remove('placeholder'));
        const placeholderGlows = document.querySelectorAll('.placeholder-glow');
        placeholderGlows.forEach(el => el.classList.remove('placeholder-glow'));

        // Isi elemen-elemen HTML dengan data
        document.title = `${post.title} - Ixiera Blog`;
        document.getElementById('breadcrumb-title').textContent = post.title;
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-image').src = `${post.image_url}?tr=w-800,q-85`;
        document.getElementById('post-image').alt = `Gambar utama untuk artikel ${post.title}`;
        document.getElementById('post-content').innerHTML = post.content;

        const postDateEl = document.getElementById('post-date');
        const postDate = new Date(post.created_at).toLocaleDateString('id-ID', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        postDateEl.textContent = postDate;
        postDateEl.dateTime = post.created_at;

        const words = post.content.split(' ').length;
        const readingTime = Math.ceil(words / 200);
        document.getElementById('post-reading-time').textContent = `${readingTime} min read`;

        // Setelah artikel berhasil dimuat, panggil fungsi untuk komentar
        loadComments(post.id);
        handleCommentSubmit(post.id);

    } catch (error) {
        // [PENTING] Jika ada error di dalam blok 'try', kita tangkap di sini
        console.error('Terjadi kesalahan saat memuat artikel:', error);
        // Dan kita tampilkan pesan errornya langsung di halaman agar terlihat
        articleContainer.innerHTML = `<div class="alert alert-danger"><strong>Terjadi Kesalahan:</strong> ${error.message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', loadBlogPost);

