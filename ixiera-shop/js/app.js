// js/app.js - Aplikasi e-commerce SneakZone
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    console.log('SneakZone App Initialized');
    
    // Load featured products on homepage
    if (document.getElementById('featured-products')) {
        await loadFeaturedProducts();
    }

    // Load new arrivals on homepage
    if (document.getElementById('new-arrivals')) {
        await loadNewArrivals();
    }

    // Load categories
    if (document.getElementById('categories-container')) {
        await loadCategories();
    }

    // Initialize event listeners
    initializeEventListeners();
    
    // Update cart and wishlist counts
    SneakZoneApp.CartService.updateCartCount();
    SneakZoneApp.WishlistService.updateWishlistCount();
}

async function loadFeaturedProducts() {
    try {
        const products = await SneakZoneApp.ProductService.getFeaturedProducts();
        displayProducts(products, 'featured-products');
    } catch (error) {
        console.error('Error loading featured products:', error);
        document.getElementById('featured-products').innerHTML = 
            '<div class="col-12 text-center"><p class="text-muted">Gagal memuat produk. Silakan refresh halaman.</p></div>';
    }
}

async function loadNewArrivals() {
    try {
        const products = await SneakZoneApp.ProductService.getNewArrivals();
        displayProducts(products, 'new-arrivals');
    } catch (error) {
        console.error('Error loading new arrivals:', error);
        document.getElementById('new-arrivals').innerHTML = 
            '<div class="col-12 text-center"><p class="text-muted">Gagal memuat produk baru.</p></div>';
    }
}

async function loadCategories() {
    try {
        const products = await SneakZoneApp.ProductService.getAllProducts();
        updateCategories(products);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function displayProducts(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '<div class="col-12 text-center"><p class="text-muted">Belum ada produk untuk kategori ini.</p></div>';
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="col-lg-3 col-md-6 col-sm-12 pb-1">
            <div class="card product-item border-0 mb-4 hover-shadow">
                <div class="card-header product-img position-relative overflow-hidden bg-transparent border p-0">
                    <img class="img-fluid w-100" src="${product.image_url}" alt="${product.name}" 
                         style="height: 250px; object-fit: cover;" 
                         onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'">
                    ${product.is_new_arrival ? '<span class="position-absolute top-0 start-0 bg-danger text-white px-2 py-1 small">Baru</span>' : ''}
                    ${product.original_price && product.original_price > product.price ? 
                        `<span class="position-absolute top-0 end-0 bg-primary text-white px-2 py-1 small">
                            -${Math.round((1 - product.price/product.original_price) * 100)}%
                        </span>` : ''}
                    ${product.stock < 5 ? '<span class="position-absolute bottom-0 start-0 bg-warning text-dark px-2 py-1 small">Hampir Habis</span>' : ''}
                </div>
                <div class="card-body border-left border-right text-center p-0 pt-4 pb-3">
                    <h6 class="text-truncate mb-2">${product.name}</h6>
                    <p class="mb-2 small text-muted">${product.brand}</p>
                    <div class="d-flex justify-content-center align-items-center mb-2">
                        <h6 class="mb-0 text-primary">${SneakZoneApp.Utils.formatPrice(product.price)}</h6>
                        ${product.original_price && product.original_price > product.price ? 
                            `<small class="text-muted ml-2"><del>${SneakZoneApp.Utils.formatPrice(product.original_price)}</del></small>` : ''}
                    </div>
                    <small class="text-muted d-block">Stok: ${product.stock}</small>
                </div>
                <div class="card-footer d-flex justify-content-between bg-light border">
                    <a href="detail.html?id=${product.id}" class="btn btn-sm text-dark p-0">
                        <i class="fas fa-eye text-primary mr-1"></i>Detail
                    </a>
                    <div class="d-flex">
                        <button class="btn btn-sm text-dark p-0 mr-2 add-to-wishlist" data-product-id="${product.id}" 
                                title="${SneakZoneApp.WishlistService.isInWishlist(product.id) ? 'Hapus dari wishlist' : 'Tambahkan ke wishlist'}">
                            <i class="fas fa-heart ${SneakZoneApp.WishlistService.isInWishlist(product.id) ? 'text-danger' : 'text-secondary'}"></i>
                        </button>
                        <button class="btn btn-sm text-dark p-0 add-to-cart" data-product-id="${product.id}" 
                                ${product.stock === 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart text-primary mr-1"></i>
                            ${product.stock === 0 ? 'Habis' : '+ Keranjang'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateCategories(products) {
    const container = document.getElementById('categories-container');
    if (!container) return;

    const categoryCount = {};
    products.forEach(product => {
        categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
    });

    const categories = [
        { name: 'Running', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' },
        { name: 'Basketball', image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' },
        { name: 'Lifestyle', image: 'https://images.unsplash.com/photo-1545289414-1c3cb1c06238?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' },
        { name: 'Limited Edition', image: 'https://images.unsplash.com/photo-1545289414-1c3cb1c06238?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' },
        { name: 'Classic', image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' },
        { name: 'Sports', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' }
    ];

    container.innerHTML = categories.map(category => `
        <div class="col-lg-4 col-md-6 pb-1">
            <div class="cat-item d-flex flex-column border mb-4 hover-shadow" style="padding: 30px;">
                <p class="text-right mb-0"><small>${categoryCount[category.name] || 0} Produk</small></p>
                <a href="shop.html?category=${encodeURIComponent(category.name)}" class="cat-img position-relative overflow-hidden mb-3 text-decoration-none">
                    <img class="img-fluid" src="${category.image}" alt="${category.name}" 
                         style="height: 200px; object-fit: cover;">
                </a>
                <h5 class="font-weight-semi-bold m-0 text-dark">${category.name}</h5>
                <a href="shop.html?category=${encodeURIComponent(category.name)}" class="btn btn-sm btn-primary mt-2">Jelajahi</a>
            </div>
        </div>
    `).join('');
}

function initializeEventListeners() {
    // Newsletter subscription
    const newsletterForms = document.querySelectorAll('#newsletter-form, #footer-newsletter');
    newsletterForms.forEach(form => {
        form.addEventListener('submit', handleNewsletterSubscription);
    });

    // Add to cart buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.add-to-cart')) {
            const button = e.target.closest('.add-to-cart');
            if (!button.disabled) {
                const productId = button.getAttribute('data-product-id');
                handleAddToCart(productId);
            }
        }

        if (e.target.closest('.add-to-wishlist')) {
            const button = e.target.closest('.add-to-wishlist');
            const productId = button.getAttribute('data-product-id');
            handleAddToWishlist(productId);
        }
    });

    // Search functionality
    const searchInput = document.querySelector('input[placeholder*="Cari"]');
    if (searchInput) {
        searchInput.addEventListener('input', SneakZoneApp.Utils.debounce(handleSearch, 300));
    }
}

async function handleNewsletterSubscription(e) {
    e.preventDefault();
    const form = e.target;
    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput.value;

    if (!email) {
        SneakZoneApp.Utils.showNotification('Harap masukkan email Anda', 'warning');
        return;
    }

    const result = await SneakZoneApp.NewsletterService.subscribe(email);
    SneakZoneApp.Utils.showNotification(result.message, result.success ? 'success' : 'danger');
    
    if (result.success) {
        form.reset();
    }
}

async function handleAddToCart(productId) {
    try {
        const product = await SneakZoneApp.ProductService.getProductById(productId);
        if (product) {
            if (product.stock === 0) {
                SneakZoneApp.Utils.showNotification('Maaf, produk ini sedang habis', 'warning');
                return;
            }

            SneakZoneApp.CartService.addToCart(product, 1);
            SneakZoneApp.Utils.showNotification(
                `<strong>${product.name}</strong> berhasil ditambahkan ke keranjang!`, 
                'success'
            );
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        SneakZoneApp.Utils.showNotification('Gagal menambahkan ke keranjang', 'danger');
    }
}

async function handleAddToWishlist(productId) {
    try {
        const product = await SneakZoneApp.ProductService.getProductById(productId);
        if (product) {
            if (SneakZoneApp.WishlistService.isInWishlist(productId)) {
                SneakZoneApp.WishlistService.removeFromWishlist(productId);
                SneakZoneApp.Utils.showNotification(
                    `<strong>${product.name}</strong> dihapus dari wishlist`, 
                    'info'
                );
            } else {
                SneakZoneApp.WishlistService.addToWishlist(product);
                SneakZoneApp.Utils.showNotification(
                    `<strong>${product.name}</strong> ditambahkan ke wishlist!`, 
                    'success'
                );
            }
            
            // Update heart icon
            const heartIcon = document.querySelector(`[data-product-id="${productId}"] .fa-heart`);
            if (heartIcon) {
                heartIcon.classList.toggle('text-danger', SneakZoneApp.WishlistService.isInWishlist(productId));
                heartIcon.classList.toggle('text-secondary', !SneakZoneApp.WishlistService.isInWishlist(productId));
            }
        }
    } catch (error) {
        console.error('Error updating wishlist:', error);
        SneakZoneApp.Utils.showNotification('Gagal memperbarui wishlist', 'danger');
    }
}

function handleSearch(e) {
    const query = e.target.value.trim();
    if (query.length > 2) {
        // Redirect to shop page with search query
        window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
    }
}