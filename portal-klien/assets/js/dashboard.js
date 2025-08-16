/*
================================================================================
| JAVASCRIPT LOGIC FOR THE CLIENT DASHBOARD (INDEX.HTML)                       |
| Description: Fetches and displays personal order tracking, stats,            |
|              and handles secure file downloads.                              |
| FIX: Changed getCurrentUser to window.getCurrentUser to access global func.  |
================================================================================
*/

document.addEventListener("DOMContentLoaded", async () => {
  // --- DOM Element Selection ---
  const ordersTableBody = document.getElementById("orders-tracking-table");
  const statsInProgress = document.getElementById("stats-in-progress");
  const statsCompleted = document.getElementById("stats-completed");
  const statsTotalSpent = document.getElementById("stats-total-spent");
  const loader = document.getElementById("orders-loader");

  // --- Main Function to Load Dashboard Data ---
  async function loadDashboard() {
    try {
      // FIXED: Called the global function from the window object
      const user = await window.getCurrentUser();
      if (!user) {
        ordersTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Could not authenticate user. Please log in again.</td></tr>`;
        console.error("User not authenticated.");
        return;
      }

      // Fetch all orders (leads) belonging to the current user
      const { data: orders, error } = await dbClient
        .from("leads_solvixone")
        .select(`
          id,
          created_at,
          product_id,
          status,
          product:products ( name, price, image_path ) 
        `) // Joins with products table
        .eq("client_id", user.id);

      if (error) throw error;

      renderOrderTracking(orders);
      calculateAndRenderStats(orders);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      ordersTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Failed to load order data.</td></tr>`;
    } finally {
        if(loader) loader.style.display = 'none';
    }
  }

  /**
   * Renders the list of orders with their progress bars.
   * @param {Array} orders - The user's orders from Supabase.
   */
  function renderOrderTracking(orders) {
    if (!orders || orders.length === 0) {
      ordersTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-5">You have no active orders.</td></tr>`;
      return;
    }

    ordersTableBody.innerHTML = orders.map(order => {
      const { progress, color, isComplete } = getProgressDetails(order.status);
      const productName = order.product ? order.product.name : 'Product not found';
      const orderDate = new Date(order.created_at).toLocaleDateString();

      const downloadButtonHtml = `
        <button 
          class="btn btn-success btn-sm download-btn" 
          data-product-path="${order.product ? order.product.image_path : ''}" 
          ${!isComplete ? 'disabled' : ''}
          title="${isComplete ? 'Download File' : 'File available upon completion'}"
        >
          <i class="fas fa-download"></i> Download
        </button>`;

      return `
        <tr>
          <td>
            <div class="d-flex align-items-center">
              <div>
                <h6 class="fw-bold mb-1">${productName}</h6>
                <small class="text-muted">Ordered on: ${orderDate}</small>
              </div>
            </div>
          </td>
          <td>
            <div class="progress-container">
              <div class="progress-label">${order.status.toUpperCase()} (${progress}%)</div>
              <div class="progress" style="height: 10px;">
                <div class="progress-bar bg-${color}" role="progressbar" style="width: ${progress}%;" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
              </div>
            </div>
          </td>
          <td class="text-center">
            ${downloadButtonHtml}
          </td>
        </tr>
      `;
    }).join('');
  }
  
  /**
   * Calculates and displays key statistics.
   * @param {Array} orders - The user's orders.
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

      if(statsInProgress) statsInProgress.textContent = inProgressCount;
      if(statsCompleted) statsCompleted.textContent = completedCount;
      if(statsTotalSpent) statsTotalSpent.textContent = `$${totalSpent.toFixed(2)}`;
  }

  /**
   * Translates order status text into progress percentage and color.
   */
  function getProgressDetails(status) {
    const s = status ? status.toLowerCase() : 'new';
    switch (s) {
      case 'new': return { progress: 10, color: 'secondary', isComplete: false };
      case 'design': return { progress: 25, color: 'info', isComplete: false };
      case 'development': return { progress: 50, color: 'warning', isComplete: false };
      case 'review': return { progress: 75, color: 'primary', isComplete: false };
      case 'completed': return { progress: 100, color: 'success', isComplete: true };
      default: return { progress: 0, color: 'light', isComplete: false };
    }
  }

  /**
   * Handles the secure download of a product file using a signed URL.
   */
  async function handleSecureDownload(filePath) {
      if (!filePath) {
          window.showNotification("File path is missing. Cannot download.", "danger");
          return;
      }
      
      window.toggleLoadingSpinner(true);
      try {
          const { data, error } = await dbClient
              .storage
              .from('product_images')
              .createSignedUrl(filePath, 60);

          if (error) throw error;
          
          window.location.href = data.signedUrl;

      } catch (error) {
          console.error('Error creating signed URL:', error);
          window.showNotification("Could not generate secure download link.", "danger");
      } finally {
          window.toggleLoadingSpinner(false);
      }
  }

  // Event Delegation for Download Buttons
  document.body.addEventListener('click', function(event) {
      if (event.target.classList.contains('download-btn')) {
          const filePath = event.target.dataset.productPath;
          handleSecureDownload(filePath);
      }
  });

  // Initial Load
  loadDashboard();
});

