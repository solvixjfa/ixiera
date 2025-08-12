// [PERUBAHAN] Impor koneksi Supabase dari file pusat
import { supabase } from './supabase-client.js';

// Fungsi utama untuk memuat dan menampilkan artikel blog
async function loadBlogPosts() {
    const postsContainer = document.getElementById('posts-container');
    if (!postsContainer) return;

    postsContainer.innerHTML = '<p class="text-center">Memuat artikel terbaru...</p>';

    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (posts.length === 0) {
            postsContainer.innerHTML = '<p class="text-center">Belum ada artikel yang dipublikasikan.</p>';
            return;
        }

        postsContainer.innerHTML = '';

        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'col-lg-6';
            postElement.innerHTML = `
                <article class="d-flex flex-column h-100">
                    <div class="post-img">
                        <a href="blog-details.html?slug=${post.slug}">
                            <img src="${post.image_url}?tr=w-400,q-85" alt="Gambar thumbnail untuk ${post.title}" class="img-fluid">
                        </a>
                    </div>
                    <h2 class="title">
                        <a href="blog-details.html?slug=${post.slug}">${post.title}</a>
                    </h2>
                    <div class="d-flex align-items-center mt-auto">
                        <img src="https://ik.imagekit.io/solviXone/ixiera/img/team/team-01.png?tr=w-40,h-40,q-90" alt="Foto Jeffry" class="img-fluid post-author-img flex-shrink-0">
                        <div class="post-meta">
                            <p class="post-author mb-0">Jeffry</p>
                            <p class="post-date mb-0">
                                <time datetime="${post.created_at}">${new Date(post.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                            </p>
                        </div>
                    </div>
                </article>
            `;
            postsContainer.appendChild(postElement);
        });

    } catch (error) {
        console.error('Error fetching posts:', error);
        postsContainer.innerHTML = `<p class="text-center text-danger">Gagal memuat artikel. Silakan coba lagi nanti.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', loadBlogPosts);

