/*
================================================================================
| FIXED DASHBOARD JAVASCRIPT FOR LEADS_SOLVIXONE TABLE                       |
| Description: Fixed query for leads_solvixone table structure               |
| Version: 3.3 (Fixed table integration)                                     |
================================================================================
*/

// Menunggu sinyal 'supabase-ready' SEBELUM menjalankan logika dashboard
document.addEventListener('supabase-ready', async () => {
  
  // --- SCRIPT PENJAGA (Authentication Guard) ---
  const { data: { session } } = await window.dbClient.auth.getSession();
  if (!session) {
    window.location.href = 'sign-in.html';
    return;
  }
  
  // --- Variabel Global untuk Fitur Baru ---
  let allOrders = [];
  let currentPage = 1;
  const ordersPerPage = 5;
  let currentSort = { field: 'created_at', direction: 'desc' };
  let currentSearch = '';

  // --- Seleksi Elemen DOM dengan Null Checking ---
  const ordersTableBody = document.getElementById("orders-tracking-table");
  const emptyOrdersMessage = document.getElementById("empty-orders-message");
  const orderRowTemplate = document.getElementById("order-row-template");
  
  const statsInProgress = document.getElementById("stats-in-progress");
  const statsCompleted = document.getElementById("stats-completed");
  const statsTotalSpent = document.getElementById("stats-total-spent");
  
  // Elemen untuk fitur baru dengan null checking
  const timeGreeting = document.getElementById("time-greeting");
  const currentTime = document.getElementById("current-time");
  const lastUpdatedTime = document.getElementById("last-updated-time");
  const totalOrdersCount = document.getElementById("total-orders-count");
  const progressInProgress = document.getElementById("progress-in-progress");
  const progressCompleted = document.getElementById("progress-completed");
  const averageOrderValue = document.getElementById("average-order-value");
  const orderSearch = document.getElementById("order-search");
  const paginationContainer = document.getElementById("pagination-container");
  const showingCount = document.getElementById("showing-count");
  const totalCount = document.getElementById("total-count");
  const refreshButton = document.querySelector('.refresh-dashboard');
  const exportButton = document.getElementById('export-data');

  // --- Validasi Elemen DOM yang Diperlukan ---
  if (!ordersTableBody || !emptyOrdersMessage || !orderRowTemplate) {
    console.error('Required DOM elements not found');
    return;
  }

  // --- Inisialisasi Fitur UX ---
  initializeUXFeatures();

  /**
   * Inisialisasi semua fitur UX tambahan dengan error handling
   */
  function initializeUXFeatures() {
    try {
      updateTimeAndGreeting();
      setInterval(updateTimeAndGreeting, 60000);
      
      // Event listeners untuk fitur baru dengan null checking
      if (refreshButton) {
        refreshButton.addEventListener('click', handleRefresh);
      }
      
      if (exportButton) {
        exportButton.addEventListener('click', handleExport);
      }
      
      if (orderSearch) {
        orderSearch.addEventListener('input', handleSearch);
      }
      
      // Auto-refresh setiap 2 menit
      setInterval(loadDashboard, 120000);
      
    } catch (error) {
      console.error('Error initializing UX features:', error);
    }
  }

  /**
   * Update waktu dan greeting dengan error handling
   */
  function updateTimeAndGreeting() {
    try {
      const now = new Date();
      const hours = now.getHours();
      const timeString = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      let greeting = 'Welcome back!';
      if (hours < 12) greeting = 'Good morning!';
      else if (hours < 18) greeting = 'Good afternoon!';
      else greeting = 'Good evening!';
      
      if (timeGreeting) timeGreeting.textContent = `${greeting} Here's the progress on your orders.`;
      if (currentTime) currentTime.textContent = timeString;
    } catch (error) {
      console.error('Error updating time and greeting:', error);
    }
  }

  /**
   * Fungsi utama untuk memuat semua data dashboard
   */
  async function loadDashboard() {
    if (window.toggleLoadingSpinner) {
      window.toggleLoadingSpinner(true);
    }
    
    try {
      const user = await window.getCurrentUser();
      if (!user) {
        throw new Error("User not authenticated. Please log in again.");
      }

      // Query untuk mengambil data dari leads_solvixone dengan join ke products
      const { data: orders, error } = await window.dbClient
        .from("leads_solvixone")
        .select(`
          id,
          created_at,
          updated_at,
          status,
          quantity,
          notes,
          product:products (
            id,
            name, 
            price, 
            file_path,
            description
          )
        `)
        .eq("client_id", user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      allOrders = orders || [];
      updateLastUpdatedTime();
      applyFiltersAndRender();

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      showError("Failed to load order data. Please refresh the page.");
    } finally {
      if (window.toggleLoadingSpinner) {
        window.toggleLoadingSpinner(false);
      }
    }
  }

  /**
   * Apply search, sort, dan pagination sebelum render
   */
  function applyFiltersAndRender() {
    try {
      let filteredOrders = [...allOrders];
      
      // Apply search filter
      if (currentSearch) {
        filteredOrders = filteredOrders.filter(order => 
          order.product?.name?.toLowerCase().includes(currentSearch.toLowerCase()) ||
          order.id.toString().includes(currentSearch) ||
          order.status?.toLowerCase().includes(currentSearch.toLowerCase()) ||
          order.notes?.toLowerCase().includes(currentSearch.toLowerCase())
        );
      }
      
      // Apply sorting
      filteredOrders.sort((a, b) => {
        let aValue, bValue;
        
        switch (currentSort.field) {
          case 'product':
            aValue = a.product?.name || '';
            bValue = b.product?.name || '';
            break;
          case 'progress':
            aValue = getProgressDetails(a.status).progress;
            bValue = getProgressDetails(b.status).progress;
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'created_at':
          default:
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
        }
        
        if (currentSort.direction === 'desc') {
          return aValue < bValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
      
      // Apply pagination
      const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
      const startIndex = (currentPage - 1) * ordersPerPage;
      const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);
      
      renderOrderTracking(paginatedOrders);
      renderPagination(totalPages);
      updateStatsDisplay(filteredOrders);
      
      // Update counters dengan null checking
      if (showingCount) showingCount.textContent = paginatedOrders.length;
      if (totalCount) totalCount.textContent = filteredOrders.length;
      if (totalOrdersCount) totalOrdersCount.textContent = allOrders.length;
      
    } catch (error) {
      console.error('Error applying filters and rendering:', error);
      showError('Error displaying orders. Please refresh the page.');
    }
  }

  /**
   * Render order tracking
   */
  function renderOrderTracking(orders) {
    try {
      ordersTableBody.innerHTML = '';

      if (!orders || orders.length === 0) {
        emptyOrdersMessage.style.display = 'block';
        return;
      }
      
      emptyOrdersMessage.style.display = 'none';

      orders.forEach(order => {
        const templateClone = orderRowTemplate.content.cloneNode(true);
        const { progress, isComplete, description } = getProgressDetails(order.status);
        const productName = order.product ? order.product.name : 'Product Not Found';
        const orderId = `Order #${order.id.substring(0, 8)}`; // Shorten ID for display
        const createdDate = new Date(order.created_at).toLocaleDateString();
        const updatedDate = new Date(order.updated_at || order.created_at).toLocaleDateString();

        // Seleksi elemen
        const nameEl = templateClone.querySelector('.product-name');
        const idEl = templateClone.querySelector('.order-id');
        const dateEl = templateClone.querySelector('.order-date');
        const progressBarEl = templateClone.querySelector('.progress-bar');
        const progressTextEl = templateClone.querySelector('.progress-text');
        const statusDescEl = templateClone.querySelector('.status-description');
        const downloadBtnEl = templateClone.querySelector('.download-btn');
        const statusTextEl = templateClone.querySelector('.status-text');
        const statusTimeEl = templateClone.querySelector('.status-time');

        // Isi data
        if (nameEl) nameEl.textContent = productName;
        if (idEl) idEl.textContent = orderId;
        if (dateEl) dateEl.textContent = `Created: ${createdDate}`;
        if (progressTextEl) progressTextEl.textContent = `${progress}%`;
        if (progressBarEl) {
          progressBarEl.style.width = `${progress}%`;
          progressBarEl.setAttribute('aria-valuenow', progress);
        }
        if (statusDescEl) statusDescEl.textContent = description;
        if (statusTimeEl) statusTimeEl.textContent = `Updated: ${updatedDate}`;

        // Logika tombol download
        if (isComplete) {
          if (statusTextEl) statusTextEl.style.display = 'none';
          if (downloadBtnEl) {
            downloadBtnEl.style.display = 'inline-block';
            downloadBtnEl.dataset.filePath = order.product ? order.product.file_path : '';
          }
          
          // Update badge untuk completed orders
          const statusBadge = templateClone.querySelector('.status-badge');
          if (statusBadge) {
            statusBadge.className = 'badge status-badge bg-success';
            statusBadge.textContent = 'Completed';
          }
        } else {
          if (downloadBtnEl) downloadBtnEl.style.display = 'none';
          if (statusTextEl) {
            statusTextEl.style.display = 'inline-block';
            statusTextEl.textContent = order.status || 'New';
          }
          
          // Update badge color berdasarkan status
          const statusBadge = templateClone.querySelector('.status-badge');
          if (statusBadge) {
            updateStatusBadgeColor(statusBadge, order.status);
          }
        }

        ordersTableBody.appendChild(templateClone);
      });
    } catch (error) {
      console.error('Error rendering order tracking:', error);
      showError('Error displaying order data.');
    }
  }

  /**
   * Update stats dengan progress bars dan additional info
   */
  function updateStatsDisplay(orders) {
    try {
      let inProgressCount = 0;
      let completedCount = 0;
      let totalSpent = 0;

      orders.forEach(order => {
        if (getProgressDetails(order.status).isComplete) {
          completedCount++;
          // Calculate total spent only for completed orders
          if (order.product && order.product.price) {
            totalSpent += parseFloat(order.product.price) * (order.quantity || 1);
          }
        } else {
          inProgressCount++;
        }
      });

      const totalOrders = orders.length;
      const progressPercentage = totalOrders > 0 ? (completedCount / totalOrders) * 100 : 0;
      const averageOrder = completedCount > 0 ? totalSpent / completedCount : 0;

      // Update stats
      if (statsInProgress) statsInProgress.textContent = inProgressCount;
      if (statsCompleted) statsCompleted.textContent = completedCount;
      if (statsTotalSpent) statsTotalSpent.textContent = `$${totalSpent.toFixed(2)}`;
      if (averageOrderValue) averageOrderValue.textContent = `Avg: $${averageOrder.toFixed(2)}`;

      // Update progress bars di stats cards
      if (progressInProgress && totalOrders > 0) {
        progressInProgress.style.width = `${(inProgressCount / totalOrders) * 100}%`;
      }
      if (progressCompleted && totalOrders > 0) {
        progressCompleted.style.width = `${progressPercentage}%`;
      }
    } catch (error) {
      console.error('Error updating stats display:', error);
    }
  }

  // --- Progress Details Function (tetap sama) ---
  function getProgressDetails(status) {
    const s = status ? status.toLowerCase() : 'new';
    switch (s) {
      case 'new': 
        return { progress: 10, isComplete: false, description: 'Order received and queued' };
      case 'design': 
        return { progress: 25, isComplete: false, description: 'Design phase in progress' };
      case 'development': 
        return { progress: 50, isComplete: false, description: 'Development underway' };
      case 'review': 
        return { progress: 75, isComplete: false, description: 'Under quality review' };
      case 'completed': 
        return { progress: 100, isComplete: true, description: 'Ready for download' };
      default: 
        return { progress: 0, isComplete: false, description: 'Processing order' };
    }
  }

  function updateStatusBadgeColor(badge, status) {
    const statusMap = {
      'new': 'bg-secondary',
      'design': 'bg-info',
      'development': 'bg-primary',
      'review': 'bg-warning',
      'completed': 'bg-success'
    };
    
    badge.className = `badge status-badge ${statusMap[status?.toLowerCase()] || 'bg-secondary'}`;
  }

  // --- Event Handlers (tetap sama seperti sebelumnya) ---
  function handleRefresh() {
    // ... (sama seperti sebelumnya)
  }

  function handleSearch(e) {
    // ... (sama seperti sebelumnya)
  }

  function handleExport() {
    // ... (sama seperti sebelumnya)
  }

  function updateLastUpdatedTime() {
    // ... (sama seperti sebelumnya)
  }

  function showError(message) {
    // ... (sama seperti sebelumnya)
  }

  // --- Event Listener untuk Download ---
  document.body.addEventListener('click', function(event) {
    const downloadButton = event.target.closest('.download-btn');
    if (downloadButton) {
      const filePath = downloadButton.dataset.filePath;
      handleSecureDownload(filePath);
    }
  });

  /**
   * Fungsi download
   */
  async function handleSecureDownload(filePath) {
    if (!filePath) {
      if (window.showNotification) {
        window.showNotification("File path is missing. Cannot download.", "danger");
      }
      return;
    }
    
    if (window.toggleLoadingSpinner) {
      window.toggleLoadingSpinner(true);
    }
    
    try {
      const { data, error } = await window.dbClient
        .storage
        .from('product_files')
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      
      window.open(data.signedUrl, '_blank');
      
      if (window.showNotification) {
        window.showNotification("Download started successfully", "success");
      }

    } catch (error) {
      console.error('Error creating signed URL:', error);
      if (window.showNotification) {
        window.showNotification("Could not generate secure download link.", "danger");
      }
    } finally {
      if (window.toggleLoadingSpinner) {
        window.toggleLoadingSpinner(false);
      }
    }
  }

  // --- Memuat Data Awal ---
  loadDashboard();
});