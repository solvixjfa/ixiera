/*
================================================================================
| JAVASCRIPT LOGIC FOR THE CLIENT DASHBOARD (INDEX.HTML)                       |
| Description: Fetches and displays order tracking, stats, and handles secure  |
|              file downloads using a <template> for efficient rendering.      |
| Version: 2.0 (Refactored for performance and security)                       |
================================================================================
*/

// Menunggu sinyal 'supabase-ready' SEBELUM menjalankan logika dashboard
document.addEventListener('supabase-ready', async () => {
  
  // --- SCRIPT PENJAGA (Authentication Guard) ---
  const { data: { session } } = await window.dbClient.auth.getSession();
  if (!session) {
    window.location.href = 'sign-in.html';
    return; // Hentikan eksekusi jika tidak ada sesi
  }
  
  // --- Seleksi Elemen DOM ---
  const ordersTableBody = document.getElementById("orders-tracking-table");
  const emptyOrdersMessage = document.getElementById("empty-orders-message");
  const orderRowTemplate = document.getElementById("order-row-template");
  
  const statsInProgress = document.getElementById("stats-in-progress");
  const statsCompleted = document.getElementById("stats-completed");
  const statsTotalSpent = document.getElementById("stats-total-spent");

  /**
   * Fungsi utama untuk memuat semua data dashboard.
   * Mengambil data order dan memicu fungsi render.
   */
  async function loadDashboard() {
    window.toggleLoadingSpinner(true); // Tampilkan spinner global
    try {
      const user = await window.getCurrentUser();
      if (!user) {
        throw new Error("User not authenticated. Please log in again.");
      }

      // Ambil semua order (leads) milik pengguna saat ini, gabungkan dengan data produk
      const { data: orders, error } = await window.dbClient
        .from("leads_solvixone")
        .select(`
          id,
          created_at,
          status,
          product:products ( name, price, file_path ) 
        `) // Perbaikan: Mengambil file_path, bukan image_path
        .eq("client_id", user.id);

      if (error) throw error;

      renderOrderTracking(orders);
      calculateAndRenderStats(orders);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      ordersTableBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger p-5">Failed to load order data. Please refresh the page.</td></tr>`;
    } finally {
      window.toggleLoadingSpinner(false); // Sembunyikan spinner global
    }
  }

  /**
   * Merender daftar order ke dalam tabel menggunakan elemen <template>.
   * @param {Array} orders - Array objek order dari Supabase.
   */
  function renderOrderTracking(orders) {
    ordersTableBody.innerHTML = ''; // Kosongkan tabel sebelum mengisi

    // Tampilkan pesan "empty state" jika tidak ada order
    if (!orders || orders.length === 0) {
      emptyOrdersMessage.style.display = 'block';
      return;
    }
    
    emptyOrdersMessage.style.display = 'none'; // Sembunyikan pesan jika ada order

    orders.forEach(order => {
      // Kloning konten dari template
      const templateClone = orderRowTemplate.content.cloneNode(true);
      
      // Dapatkan detail progress berdasarkan status
      const { progress, isComplete } = getProgressDetails(order.status);
      const productName = order.product ? order.product.name : 'Product Not Found';
      const orderId = `Order #${order.id}`;

      // Seleksi elemen di dalam kloningan template
      const nameEl = templateClone.querySelector('.product-name');
      const idEl = templateClone.querySelector('.order-id');
      const progressBarEl = templateClone.querySelector('.progress-bar');
      const progressTextEl = templateClone.querySelector('.progress-text');
      const downloadBtnEl = templateClone.querySelector('.download-btn');
      const statusTextEl = templateClone.querySelector('.status-text');

      // Isi data ke dalam elemen
      nameEl.textContent = productName;
      idEl.textContent = orderId;
      progressTextEl.textContent = `${progress}%`;
      progressBarEl.style.width = `${progress}%`;
      progressBarEl.setAttribute('aria-valuenow', progress);

      // Logika kondisional untuk tombol download
      if (isComplete) {
        statusTextEl.style.display = 'none';
        downloadBtnEl.style.display = 'block';
        // Simpan path file di dataset tombol untuk digunakan nanti
        downloadBtnEl.dataset.filePath = order.product ? order.product.file_path : '';
      } else {
        downloadBtnEl.style.display = 'none';
        statusTextEl.style.display = 'inline-block'; // Tampilkan badge status
        statusTextEl.textContent = order.status || 'New';
      }

      // Tambahkan baris yang sudah jadi ke dalam tabel
      ordersTableBody.appendChild(templateClone);
    });
  }
  
  /**
   * Menghitung dan menampilkan statistik utama di kartu atas.
   * @param {Array} orders - Array objek order dari Supabase.
   */
  function calculateAndRenderStats(orders) {
      let inProgressCount = 0;
      let completedCount = 0;
      let totalSpent = 0;

      orders.forEach(order => {
          if (getProgressDetails(order.status).isComplete) {
              completedCount++;
          } else {
              inProgressCount++;
          }
          totalSpent += order.product ? (order.product.price || 0) : 0;
      });

      statsInProgress.textContent = inProgressCount;
      statsCompleted.textContent = completedCount;
      statsTotalSpent.textContent = `$${totalSpent.toFixed(2)}`;
  }

  /**
   * Menerjemahkan status order menjadi persentase progress dan status penyelesaian.
   * @param {string} status - Status order dari database.
   * @returns {object} Objek berisi { progress, color, isComplete }.
   */
  function getProgressDetails(status) {
    const s = status ? status.toLowerCase() : 'new';
    switch (s) {
      case 'new': return { progress: 10, isComplete: false };
      case 'design': return { progress: 25, isComplete: false };
      case 'development': return { progress: 50, isComplete: false };
      case 'review': return { progress: 75, isComplete: false };
      case 'completed': return { progress: 100, isComplete: true };
      default: return { progress: 0, isComplete: false };
    }
  }

  /**
   * Menangani unduhan file produk secara aman menggunakan Signed URL dari Supabase.
   * @param {string} filePath - Path file di dalam Supabase Storage.
   */
  async function handleSecureDownload(filePath) {
      if (!filePath) {
          window.showNotification("File path is missing. Cannot download.", "danger");
          return;
      }
      
      window.toggleLoadingSpinner(true);
      try {
          // Perbaikan Kritis: Menggunakan bucket 'product_files' yang privat
          const { data, error } = await window.dbClient
              .storage
              .from('product_files') // <-- NAMA BUCKET YANG BENAR UNTUK FILE .ZIP
              .createSignedUrl(filePath, 60); // Link berlaku selama 60 detik

          if (error) throw error;
          
          // Memicu unduhan di tab baru untuk UX yang lebih baik
          window.open(data.signedUrl, '_blank');

      } catch (error) {
          console.error('Error creating signed URL:', error);
          window.showNotification("Could not generate secure download link.", "danger");
      } finally {
          window.toggleLoadingSpinner(false);
      }
  }

  // --- Event Listener Menggunakan Delegasi ---
  // Lebih efisien karena hanya ada satu listener di body
  document.body.addEventListener('click', function(event) {
      const downloadButton = event.target.closest('.download-btn');
      if (downloadButton) {
          const filePath = downloadButton.dataset.filePath;
          handleSecureDownload(filePath);
      }
  });

  // --- Memuat Data Awal ---
  loadDashboard();
});

