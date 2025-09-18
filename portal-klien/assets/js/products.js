/*
================================================================================
| JAVASCRIPT LOGIC FOR PRODUCTS PAGE (FINAL FIX)                               |
| Description: Handles fetching products from Supabase, rendering them,        |
|              and managing the order modal functionality.                     |
| FIX: Corrected bootstrap modal initialization to prevent timing errors.      |
================================================================================
*/
document.addEventListener('supabase-ready', async () => {
  const productGallery = document.getElementById("product-gallery");
  const galleryLoader = document.getElementById("gallery-loader");
  const leadForm = document.getElementById('lead-form');
  let productsData = []; // Cache for product data
  let productModalEl = null; // Initialize modal as null

  /**
   * Fetches product data from the 'products' table in Supabase.
   */
  async function fetchProducts() {
    try {
      const { data, error } = await dbClient
        .from("products")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;

      productsData = data;
      renderProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      productGallery.innerHTML = `<div class="col-12"><div class="alert alert-danger">Failed to load products. Please try again later.</div></div>`;
    } finally {
      if(galleryLoader) galleryLoader.style.display = "none";
    }
  }

  /**
   * Renders the product cards into the gallery.
   */
  function renderProducts(products) {
    if (!products || products.length === 0) {
      productGallery.innerHTML = `<div class="col-12"><div class="alert alert-info">No new products available at the moment.</div></div>`;
      return;
    }

    productGallery.innerHTML = products.map(product => {
        // Trim any whitespace from the image_path before generating the URL
        const imagePath = product.image_path ? product.image_path.trim() : '';
        const { data: { publicUrl } } = dbClient.storage.from('product_images').getPublicUrl(imagePath);

        console.log(`Generating URL for "${product.name}": ${publicUrl}`);

        return `
        <div class="col-xl-3 col-lg-4 col-md-6 col-sm-12">
          <div class="product-card">
            <div class="product-image-container">
              <img src="${publicUrl}" class="product-image" alt="${product.name}" onerror="this.onerror=null;this.src='https://placehold.co/400x300/f4f5f9/ccc?text=Image+Not+Found';">
            </div>
            <div class="product-content">
              <h5 class="product-name">${product.name}</h5>
              <p class="product-description">${product.description || 'No description available.'}</p>
              <div class="product-footer">
                <span class="product-price">$${product.price || '0.00'}</span>
                <button class="btn btn-primary btn-sm" onclick="openProductModal('${product.id}')">
                  View & Order
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Opens and populates the product modal with data.
   */
  window.openProductModal = (productId) => {
    // FIX: Initialize modal instance only when it's first needed
    if (!productModalEl) {
        productModalEl = new bootstrap.Modal(document.getElementById('productModal'));
    }

    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('productModalLabel').textContent = product.name;
    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-product-price').textContent = `$${product.price || '0.00'}`;
    document.getElementById('modal-product-description').textContent = product.description;
    document.getElementById('modal-product-id').value = product.id;
    
    const imagePath = product.image_path ? product.image_path.trim() : '';
    const { data: { publicUrl } } = dbClient.storage.from('product_images').getPublicUrl(imagePath);
    document.getElementById('modal-product-image').src = publicUrl;

    leadForm.reset();
    productModalEl.show();
  };

  /**
   * Handles the submission of the order form inside the modal.
   */
  leadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = leadForm.querySelector('button[type="submit"]');
    const spinner = submitButton.querySelector('.spinner-border');
    const btnText = submitButton.querySelector('.btn-text');
    
    submitButton.disabled = true;
    spinner.classList.remove('d-none');
    btnText.textContent = 'Placing Order...';

    try {
      const user = await window.getCurrentUser();
      if (!user) {
        window.showNotification("You must be logged in to place an order.", "danger", "fa fa-warning");
        return;
      }

      const orderData = {
        client_id: user.id,
        product_id: document.getElementById('modal-product-id').value,
        quantity: document.getElementById('quantity').value,
        notes: document.getElementById('notes').value,
        status: 'new'
      };

      const { error } = await dbClient.from('leads_solvixone').insert([orderData]);
      if (error) throw error;

      productModalEl.hide();
      window.showNotification("Your order has been placed successfully!", "success", "fa fa-check");

    } catch (error) {
      console.error("Error placing order:", error);
      window.showNotification("Failed to place your order. Please try again.", "danger", "fa fa-warning");
    } finally {
      submitButton.disabled = false;
      spinner.classList.add('d-none');
      btnText.textContent = 'Place Order';
    }
  });

  // Initial load
  fetchProducts();
});

