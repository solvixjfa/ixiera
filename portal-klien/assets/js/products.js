/*
================================================================================
| FIXED JAVASCRIPT LOGIC FOR PRODUCTS PAGE                                    |
| Description: Fixed data insertion to leads_solvixone table                 |
| Version: 3.1 (Fixed database integration)                                  |
================================================================================
*/

document.addEventListener('supabase-ready', async () => {
  
  // --- Authentication Guard ---
  const { data: { session } } = await window.dbClient.auth.getSession();
  if (!session) {
    window.location.href = 'sign-in.html';
    return;
  }
  
  // --- Global Variables ---
  const productGallery = document.getElementById("product-gallery");
  const galleryLoader = document.getElementById("gallery-loader");
  const emptyProducts = document.getElementById("empty-products");
  const leadForm = document.getElementById('lead-form');
  const productSearch = document.getElementById('product-search');
  const refreshButton = document.getElementById('refresh-products');
  const productsCount = document.getElementById('products-count');
  const lastUpdatedTime = document.getElementById('last-updated-time');
  
  let productsData = [];
  let productModal = null;
  let currentSearch = '';

  // --- Initialize Features ---
  initializeProductFeatures();

  /**
   * Initialize all product page features
   */
  function initializeProductFeatures() {
    updateLastUpdatedTime();
    
    // Event listeners
    if (productSearch) {
      productSearch.addEventListener('input', handleProductSearch);
    }
    
    if (refreshButton) {
      refreshButton.addEventListener('click', handleRefreshProducts);
    }
    
    // Initialize modal
    const modalElement = document.getElementById('productModal');
    if (modalElement) {
      productModal = new bootstrap.Modal(modalElement);
    }
    
    // Auto-refresh products every 5 minutes
    setInterval(loadProducts, 300000);
    
    // Initial load
    loadProducts();
  }

  /**
   * Load products from Supabase
   */
  async function loadProducts() {
    if (galleryLoader) galleryLoader.style.display = "block";
    if (emptyProducts) emptyProducts.style.display = "none";
    
    try {
      const { data, error } = await window.dbClient
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      productsData = data || [];
      updateProductsCount();
      updateLastUpdatedTime();
      applyProductFilters();

    } catch (error) {
      console.error("Error fetching products:", error);
      showProductError("Failed to load products. Please try again later.");
    } finally {
      if (galleryLoader) galleryLoader.style.display = "none";
    }
  }

  /**
   * Apply search filter and render products
   */
  function applyProductFilters() {
    let filteredProducts = [...productsData];
    
    // Apply search filter
    if (currentSearch) {
      filteredProducts = filteredProducts.filter(product => 
        product.name?.toLowerCase().includes(currentSearch.toLowerCase()) ||
        product.description?.toLowerCase().includes(currentSearch.toLowerCase()) ||
        product.category?.toLowerCase().includes(currentSearch.toLowerCase())
      );
    }
    
    renderProducts(filteredProducts);
  }

  /**
   * Render products to the gallery
   */
  function renderProducts(products) {
    if (!products || products.length === 0) {
      productGallery.innerHTML = '';
      if (emptyProducts) emptyProducts.style.display = "block";
      return;
    }
    
    if (emptyProducts) emptyProducts.style.display = "none";

    productGallery.innerHTML = products.map(product => {
      const imageUrl = getProductImageUrl(product);
      const shortDescription = product.description ? 
        (product.description.length > 100 ? 
          product.description.substring(0, 100) + '...' : 
          product.description) : 
        'No description available.';

      return `
        <div class="col-xl-3 col-lg-4 col-md-6 col-sm-12 mb-4">
          <div class="card product-card h-100">
            <div class="product-image-container position-relative">
              <img src="${imageUrl}" 
                   class="card-img-top product-image" 
                   alt="${product.name}"
                   loading="lazy"
                   onerror="this.onerror=null;this.src='https://placehold.co/400x300/f4f5f9/ccc?text=Image+Not+Found';">
              <div class="product-overlay">
                <button class="btn btn-primary btn-sm" onclick="openProductModal('${product.id}')">
                  <i class="fas fa-eye me-1"></i>View Details
                </button>
              </div>
            </div>
            <div class="card-body d-flex flex-column">
              <h5 class="card-title product-name">${product.name}</h5>
              <p class="card-text product-description flex-grow-1">${shortDescription}</p>
              <div class="product-footer mt-auto">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="product-price fw-bold text-primary">$${product.price || '0.00'}</span>
                  <button class="btn btn-outline-primary btn-sm" onclick="openProductModal('${product.id}')">
                    <i class="fas fa-shopping-cart me-1"></i>Order
                  </button>
                </div>
                ${product.category ? `
                  <small class="text-muted">
                    <i class="fas fa-tag me-1"></i>${product.category}
                  </small>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Get product image URL with error handling
   */
  function getProductImageUrl(product) {
    if (!product.image_path) {
      return 'https://placehold.co/400x300/f4f5f9/ccc?text=No+Image';
    }
    
    try {
      const imagePath = product.image_path.trim();
      const { data: { publicUrl } } = window.dbClient.storage.from('product_images').getPublicUrl(imagePath);
      return publicUrl;
    } catch (error) {
      console.error('Error getting image URL:', error);
      return 'https://placehold.co/400x300/f4f5f9/ccc?text=Image+Error';
    }
  }

  /**
   * Open product modal (global function)
   */
  window.openProductModal = (productId) => {
    const product = productsData.find(p => p.id === productId);
    if (!product || !productModal) return;

    // Populate modal with product data
    document.getElementById('productModalLabel').textContent = product.name;
    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-product-price').textContent = `$${product.price || '0.00'}`;
    document.getElementById('modal-product-description').textContent = product.description || 'No description available.';
    document.getElementById('modal-product-id').value = product.id;
    
    if (product.category) {
      const categoryElement = document.getElementById('modal-product-category');
      if (categoryElement) {
        categoryElement.textContent = product.category;
      }
    }
    
    // Set product image
    const imageUrl = getProductImageUrl(product);
    document.getElementById('modal-product-image').src = imageUrl;

    // Reset form
    leadForm.reset();
    
    // Show modal
    productModal.show();
  };

  /**
   * Handle product search
   */
  function handleProductSearch(event) {
    currentSearch = event.target.value;
    applyProductFilters();
  }

  /**
   * Handle refresh products
   */
  function handleRefreshProducts() {
    if (refreshButton) {
      const originalHtml = refreshButton.innerHTML;
      refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      refreshButton.disabled = true;
      
      loadProducts().finally(() => {
        setTimeout(() => {
          refreshButton.innerHTML = originalHtml;
          refreshButton.disabled = false;
          if (window.showNotification) {
            window.showNotification("Products updated successfully", "success");
          }
        }, 1000);
      });
    }
  }

  /**
   * Update products count
   */
  function updateProductsCount() {
    if (productsCount) {
      productsCount.textContent = productsData.length;
    }
  }

  /**
   * Update last updated time
   */
  function updateLastUpdatedTime() {
    if (lastUpdatedTime) {
      const now = new Date();
      lastUpdatedTime.textContent = now.toLocaleTimeString();
    }
  }

  /**
   * Show product error
   */
  function showProductError(message) {
    productGallery.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger d-flex align-items-center">
          <i class="fas fa-exclamation-triangle me-3 fa-2x"></i>
          <div>
            <h5 class="alert-heading">Error Loading Products</h5>
            <p class="mb-0">${message}</p>
            <button class="btn btn-primary mt-2" onclick="location.reload()">
              <i class="fas fa-redo me-2"></i>Try Again
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle order form submission - FIXED VERSION
   */
  leadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const submitButton = leadForm.querySelector('button[type="submit"]');
    const spinner = submitButton.querySelector('.spinner-border');
    const btnText = submitButton.querySelector('.btn-text');
    
    // Show loading state
    submitButton.disabled = true;
    spinner.classList.remove('d-none');
    btnText.textContent = 'Placing Order...';

    try {
      const user = await window.getCurrentUser();
      if (!user) {
        throw new Error("You must be logged in to place an order.");
      }

      const productId = document.getElementById('modal-product-id').value;
      const quantity = parseInt(document.getElementById('quantity').value) || 1;
      const notes = document.getElementById('notes').value;

      // Validate quantity
      if (quantity < 1 || quantity > 10) {
        throw new Error("Quantity must be between 1 and 10.");
      }

      // Validate product exists
      const product = productsData.find(p => p.id === productId);
      if (!product) {
        throw new Error("Selected product not found.");
      }

      // Prepare order data according to your database structure
      const orderData = {
        client_id: user.id,
        product_id: productId,
        quantity: quantity,
        status: 'new', // Default status
        notes: notes || null,
        // created_at and updated_at will be automatically set by database
      };

      console.log('Inserting order data:', orderData);

      // Insert into leads_solvixone table
      const { data, error } = await window.dbClient
        .from('leads_solvixone')
        .insert([orderData])
        .select(); // Return the inserted data

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('Order inserted successfully:', data);

      // Success
      if (productModal) {
        productModal.hide();
      }
      
      if (window.showNotification) {
        window.showNotification(
          "Your order has been placed successfully!", 
          "success", 
          "fas fa-check-circle"
        );
      }

      // Optional: Redirect to dashboard after successful order
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);

    } catch (error) {
      console.error("Error placing order:", error);
      
      let errorMessage = "Failed to place your order. Please try again.";
      if (error.message.includes('foreign key constraint')) {
        errorMessage = "Invalid product selected. Please try again.";
      } else if (error.message.includes('database error')) {
        errorMessage = "Database error. Please contact support.";
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      if (window.showNotification) {
        window.showNotification(
          errorMessage, 
          "danger", 
          "fas fa-exclamation-circle"
        );
      }
    } finally {
      // Reset button state
      submitButton.disabled = false;
      spinner.classList.add('d-none');
      btnText.innerHTML = '<i class="fas fa-shopping-cart me-2"></i>Place Order';
    }
  });

  // Initialize copyright year
  if (document.getElementById('copyright-year')) {
    document.getElementById('copyright-year').textContent = new Date().getFullYear();
  }
});