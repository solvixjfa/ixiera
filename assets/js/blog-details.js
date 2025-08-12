import { supabase } from './supabase-client.js';

/**
 * Memuat dan menampilkan konten artikel tunggal berdasarkan slug dari URL.
 */
async function loadBlogPost() {
    // 1. Dapatkan 'slug' dari parameter URL
    const urlParams = new URLSearchParams(window.location.search);
    const postSlug = urlParams.get('slug');

    const articleContainer = document.getElementById('article-container');
    if (!articleContainer || !postSlug) {
        if (articleContainer) articleContainer.innerHTML = '<p class="text-center text-danger">Artikel tidak ditemukan atau URL tidak valid.</p>';
        return;
    }

    try {
        // 2. Minta data ke Supabase untuk satu artikel yang cocok dengan slug
        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('slug', postSlug)
            .single();

        if (error || !post) {
            throw new Error('Artikel tidak ditemukan atau gagal dimuat.');
        }

        // 3. Hapus efek skeleton loading sebelum mengisi data
        const placeholders = document.querySelectorAll('.placeholder');
        placeholders.forEach(el => el.classList.remove('placeholder'));
        
        const placeholderGlows = document.querySelectorAll('.placeholder-glow');
        placeholderGlows.forEach(el => el.classList.remove('placeholder-glow'));

        // 4. Isi elemen-elemen HTML dengan data yang diterima
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

        // [MODIFIKASI] Hitung dan tampilkan waktu baca
        const words = post.content.split(' ').length;
        const readingTime = Math.ceil(words / 200); // Rata-rata 200 kata per menit
        document.getElementById('post-reading-time').textContent = `${readingTime} min read`;

    } catch (error) {
        console.error('Error fetching post:', error);
        articleContainer.innerHTML = `<p class="text-center text-danger">${error.message}</p>`;
    }
}

document.addEventListener('DOMContentLoaded', loadBlogPost);

