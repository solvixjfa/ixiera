/*
================================================================================
| JAVASCRIPT UNTUK HALAMAN LAYANAN - BAHASA INDONESIA                         |
| Version: 5.1 (Fixed Loading Issue)                                         |
================================================================================
*/

// Tunggu sampai DOM dan Supabase siap
document.addEventListener('DOMContentLoaded', function() {
    // Check jika Supabase client sudah tersedia
    if (window.dbClient) {
        initializeProductsPage();
    } else {
        // Jika belum, tunggu event custom
        document.addEventListener('supabase-ready', initializeProductsPage);
    }
});

async function initializeProductsPage() {
    console.log('🚀 Initializing Products Page...');
    
    try {
        // Cek session dulu
        const { data: { session } } = await window.dbClient.auth.getSession();
        if (!session) {
            console.warn('No session found, redirecting to login...');
            window.location.href = 'sign-in.html';
            return;
        }

        console.log('✅ User authenticated:', session.user.email);

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

        // Gambar random untuk fallback
        const randomImages = [
            'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80',
            'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80',
            'https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80'
        ];

        // --- Initialize Features ---
        initializeProductFeatures();

        /**
         * Initialize all product page features
         */
        function initializeProductFeatures() {
            console.log('🔄 Initializing product features...');
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
                console.log('✅ Modal initialized');
            }
            
            // Initial load
            loadProducts();
        }

        /**
         * Load products from Supabase
         */
        async function loadProducts() {
            console.log('📦 Loading products from Supabase...');
            
            if (galleryLoader) galleryLoader.style.display = "block";
            if (emptyProducts) emptyProducts.style.display = "none";
            
            try {
                const { data, error } = await window.dbClient
                    .from("products")
                    .select("*")
                    .eq("is_active", true)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('❌ Database error:', error);
                    throw error;
                }

                productsData = data || [];
                console.log(`✅ Loaded ${productsData.length} products`);
                
                updateProductsCount();
                updateLastUpdatedTime();
                applyProductFilters();

            } catch (error) {
                console.error("❌ Error fetching products:", error);
                showProductError("Gagal memuat layanan. Silakan refresh halaman.");
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
            console.log(`🎨 Rendering ${products.length} products...`);
            
            if (!products || products.length === 0) {
                productGallery.innerHTML = '';
                if (emptyProducts) emptyProducts.style.display = "block";
                return;
            }
            
            if (emptyProducts) emptyProducts.style.display = "none";

            productGallery.innerHTML = products.map((product, index) => {
                const imageUrl = getProductImageUrl(product, index);
                const shortDescription = product.description ? 
                    (product.description.length > 120 ? 
                        product.description.substring(0, 120) + '...' : 
                        product.description) : 
                    'Tidak ada deskripsi tersedia.';

                // Format Rupiah
                const formatRupiah = (amount) => {
                    return new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0
                    }).format(amount);
                };

                return `
                    <div class="col-xl-3 col-lg-4 col-md-6 col-sm-12 mb-4">
                        <div class="card product-card h-100 border-dark shadow-sm">
                            <div class="product-image-container position-relative">
                                <img src="${imageUrl}" 
                                     class="card-img-top product-image" 
                                     alt="${product.name}"
                                     loading="lazy"
                                     style="height: 200px; object-fit: cover;"
                                     onerror="this.src='${randomImages[index % randomImages.length]}'">
                                <div class="product-overlay bg-dark bg-opacity-75 d-flex align-items-center justify-content-center">
                                    <div class="d-flex flex-column gap-2">
                                        <button class="btn btn-outline-light btn-sm" onclick="openProductModal('${product.id}')">
                                            <i class="fas fa-eye me-1"></i>Detail
                                        </button>
                                        ${product.demo_link ? `
                                            <a href="${product.demo_link}" class="btn btn-light btn-sm" target="_blank">
                                                <i class="fas fa-external-link-alt me-1"></i>Demo
                                            </a>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="card-body d-flex flex-column bg-white">
                                <h5 class="card-title product-name text-dark fw-bold">${product.name}</h5>
                                <p class="card-text product-description flex-grow-1 text-muted">${shortDescription}</p>
                                
                                <div class="product-footer mt-auto">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span class="product-price fw-bold text-dark fs-5">${formatRupiah(product.price || 0)}</span>
                                        <button class="btn btn-dark btn-sm px-3" onclick="openProductModal('${product.id}')">
                                            <i class="fas fa-rocket me-1"></i>Pesan
                                        </button>
                                    </div>
                                    <div class="d-flex justify-content-between text-muted small">
                                        ${product.category ? `
                                            <span><i class="fas fa-tag me-1"></i>${product.category}</span>
                                        ` : ''}
                                        ${product.duration_days ? `
                                            <span><i class="fas fa-clock me-1"></i>${product.duration_days} hari</span>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            console.log('✅ Products rendered successfully');
        }

        /**
         * Get product image URL with error handling
         */
        function getProductImageUrl(product, index) {
            // Jika tidak ada image_path, gunakan random image
            if (!product.image_path) {
                return randomImages[index % randomImages.length];
            }
            
            try {
                // Coba ambil dari Supabase storage
                const { data: { publicUrl } } = window.dbClient.storage
                    .from('product_images')
                    .getPublicUrl(product.image_path);
                return publicUrl;
            } catch (error) {
                console.warn('⚠️ Error getting image URL, using fallback:', error);
                return randomImages[index % randomImages.length];
            }
        }

        /**
         * Open product modal (global function)
         */
        window.openProductModal = (productId) => {
            console.log('📱 Opening modal for product:', productId);
            const product = productsData.find(p => p.id === productId);
            if (!product || !productModal) {
                console.error('❌ Product or modal not found');
                return;
            }

            // Populate modal dengan data product
            document.getElementById('productModalLabel').textContent = product.name;
            document.getElementById('modal-product-name').textContent = product.name;
            
            // Format Rupiah
            const formatRupiah = (amount) => {
                return new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0
                }).format(amount);
            };
            
            document.getElementById('modal-product-price').textContent = formatRupiah(product.price || 0);
            document.getElementById('modal-product-description').textContent = product.description || 'Tidak ada deskripsi tersedia.';
            document.getElementById('modal-product-id').value = product.id;
            
            // Set product image
            const productIndex = productsData.findIndex(p => p.id === productId);
            const imageUrl = getProductImageUrl(product, productIndex);
            document.getElementById('modal-product-image').src = imageUrl;

            // Handle demo link
            const demoLinkElement = document.getElementById('modal-demo-link');
            if (product.demo_link) {
                demoLinkElement.href = product.demo_link;
                demoLinkElement.style.display = 'block';
            } else {
                demoLinkElement.style.display = 'none';
            }

            // Reset form
            document.getElementById('project_name').value = '';
            document.getElementById('client_company').value = '';
            document.getElementById('client_phone').value = '';
            document.getElementById('requirements').value = '';
            document.getElementById('deadline').value = '';
            document.getElementById('notes').value = '';
            document.getElementById('contact_whatsapp').checked = true;
            
            // Show modal
            productModal.show();
            console.log('✅ Modal shown successfully');
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
                lastUpdatedTime.textContent = now.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
        }

        /**
         * Show product error
         */
        function showProductError(message) {
            if (productGallery) {
                productGallery.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger d-flex align-items-center">
                            <i class="fas fa-exclamation-triangle me-3 fa-2x"></i>
                            <div>
                                <h5 class="alert-heading">Error Memuat Layanan</h5>
                                <p class="mb-0">${message}</p>
                                <button class="btn btn-dark mt-2" onclick="location.reload()">
                                    <i class="fas fa-redo me-2"></i>Coba Lagi
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        /**
         * Handle order form submission
         */
        if (leadForm) {
            leadForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                
                const submitButton = leadForm.querySelector('button[type="submit"]');
                const spinner = submitButton.querySelector('.spinner-border');
                const btnText = submitButton.querySelector('.btn-text');
                
                // Show loading state
                submitButton.disabled = true;
                spinner.classList.remove('d-none');
                btnText.textContent = 'Memulai Project...';

                try {
                    const user = await window.getCurrentUser();
                    if (!user) {
                        throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
                    }

                    // Get form data
                    const productId = document.getElementById('modal-product-id').value;
                    const projectName = document.getElementById('project_name').value;
                    const requirements = document.getElementById('requirements').value;
                    const clientPhone = document.getElementById('client_phone').value;

                    // Validate required fields
                    if (!projectName.trim() || !requirements.trim() || !clientPhone.trim()) {
                        throw new Error("Semua field wajib harus diisi.");
                    }

                    // Prepare order data
                    const orderData = {
                        client_id: user.id,
                        product_id: productId,
                        quantity: 1,
                        status: 'consultation',
                        project_name: projectName,
                        requirements: requirements,
                        client_phone: clientPhone,
                        progress_percentage: 0,
                        current_phase: 'consultation'
                    };

                    console.log('📝 Inserting order:', orderData);

                    // Insert into leads_solvixone table
                    const { data, error } = await window.dbClient
                        .from('leads_solvixone')
                        .insert([orderData])
                        .select();

                    if (error) throw error;

                    console.log('✅ Order inserted successfully:', data);

                    // Success
                    if (productModal) {
                        productModal.hide();
                    }
                    
                    if (window.showNotification) {
                        window.showNotification(
                            "Project Anda berhasil dimulai! Tim kami akan segera menghubungi Anda.", 
                            "success"
                        );
                    }

                    // Redirect to dashboard
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);

                } catch (error) {
                    console.error("❌ Error placing order:", error);
                    
                    let errorMessage = "Gagal memulai project. Silakan coba lagi.";
                    if (window.showNotification) {
                        window.showNotification(errorMessage, "danger");
                    }
                } finally {
                    // Reset button state
                    submitButton.disabled = false;
                    spinner.classList.add('d-none');
                    btnText.innerHTML = '<i class="fas fa-rocket me-2"></i>Mulai Project';
                }
            });
        }

        // Initialize copyright year
        if (document.getElementById('copyright-year')) {
            document.getElementById('copyright-year').textContent = new Date().getFullYear();
        }

    } catch (error) {
        console.error('❌ Fatal error initializing products page:', error);
        showProductError("Terjadi kesalahan sistem. Silakan refresh halaman.");
    }
}