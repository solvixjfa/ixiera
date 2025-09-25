// js/detail.js - VERSI LENGKAP DENGAN HANDLE MISSING ID
class DetailPage {
    constructor() {
        this.productId = null;
        this.product = null;
        this.selectedSize = null;
        this.selectedColor = null;
        this.quantity = 1;
        this.reviews = [];
    }

    async init() {
        console.log('Detail Page Initialized');
        
        // Update cart & wishlist counts
        SneakZoneApp.CartService.updateCartCount();
        SneakZoneApp.WishlistService.updateWishlistCount();
        
        // Get product ID from URL
        this.productId = this.getProductIdFromURL();
        
        // Handle case ketika tidak ada ID di URL
        if (!this.productId) {
            await this.handleNoProductId();
            return;
        }

        // Load product data
        await this.loadProductData();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    getProductIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        console.log('URL Product ID:', id);
        return id;
    }

    async handleNoProductId() {
        console.log('No product ID found in URL');
        
        // Option 1: Redirect to shop page
        // window.location.href = 'shop.html';
        // return;
        
        // Option 2: Show featured product (REKOMENDASI)
        await this.loadFeaturedProduct();
    }

    async loadFeaturedProduct() {
        try {
            this.showLoadingState();
            console.log('Loading featured product...');
            
            // Get first featured product
            const featuredProducts = await SneakZoneApp.ProductService.getFeaturedProducts(1);
            
            if (featuredProducts.length > 0) {
                this.product = featuredProducts[0];
                this.productId = this.product.id;
                
                // Update URL dengan product ID
                window.history.replaceState({}, '', `detail.html?id=${this.productId}`);
                
                console.log('Using featured product:', this.product.name);
                this.renderProductDetails();
                this.renderProductImages();
                this.renderSizeOptions();
                this.renderColorOptions();
                await this.renderRelatedProducts();
                await this.loadReviews();
                
                this.hideLoadingState();
            } else {
                // Jika tidak ada featured products, show error
                this.showErrorState(
                    'Tidak ada produk yang ditemukan. <a href="shop.html" class="alert-link">Kunjungi toko kami</a> untuk melihat koleksi produk.'
                );
            }
            
        } catch (error) {
            console.error('Error loading featured product:', error);
            this.showErrorState(
                'Gagal memuat produk. <a href="shop.html" class="alert-link">Kembali ke toko</a>'
            );
        }
    }

    async loadProductData() {
        try {
            this.showLoadingState();
            console.log('Loading product data for ID:', this.productId);
            
            this.product = await SneakZoneApp.ProductService.getProductById(this.productId);
            console.log('Product data loaded:', this.product);
            
            if (!this.product) {
                this.showErrorState(
                    'Produk tidak ditemukan. <a href="shop.html" class="alert-link">Lihat produk lainnya</a>'
                );
                return;
            }

            // Render product data
            this.renderProductDetails();
            this.renderProductImages();
            this.renderSizeOptions();
            this.renderColorOptions();
            await this.renderRelatedProducts();
            
            // Load reviews
            await this.loadReviews();
            
            this.hideLoadingState();
            
        } catch (error) {
            console.error('Error loading product data:', error);
            this.showErrorState(
                'Gagal memuat data produk. <a href="shop.html" class="alert-link">Coba lagi</a>'
            );
        }
    }

    renderProductDetails() {
        if (!this.product) return;

        // Basic info
        document.getElementById('product-name').textContent = this.product.name || 'Produk';
        document.getElementById('breadcrumb-product-name').textContent = this.product.name || 'Produk';
        document.getElementById('product-description').textContent = this.product.description || 'Deskripsi tidak tersedia';
        document.getElementById('product-category').textContent = this.product.category || '-';
        document.getElementById('product-brand').textContent = this.product.brand || '-';
        
        // Price
        const price = this.product.price || 0;
        document.getElementById('product-price').textContent = SneakZoneApp.Utils.formatPrice(price);
        
        // Original price & discount
        const originalPriceElement = document.getElementById('original-price');
        const discountBadge = document.getElementById('discount-badge');
        
        if (this.product.original_price && this.product.original_price > price) {
            const discount = Math.round((1 - price / this.product.original_price) * 100);
            originalPriceElement.innerHTML = `<del>${SneakZoneApp.Utils.formatPrice(this.product.original_price)}</del>`;
            discountBadge.textContent = `${discount}%`;
            originalPriceElement.style.display = 'block';
            discountBadge.style.display = 'inline-block';
        } else {
            originalPriceElement.style.display = 'none';
            discountBadge.style.display = 'none';
        }
        
        // Stock
        const stock = this.product.stock || 0;
        const stockBadge = document.getElementById('stock-badge');
        const addToCartBtn = document.getElementById('add-to-cart-btn');
        
        stockBadge.textContent = `Stok: ${stock}`;
        
        if (stock === 0) {
            stockBadge.className = 'badge badge-danger';
            addToCartBtn.disabled = true;
            addToCartBtn.innerHTML = '<i class="fa fa-shopping-cart mr-1"></i> Stok Habis';
        } else if (stock < 5) {
            stockBadge.className = 'badge badge-warning';
            addToCartBtn.disabled = false;
        } else {
            stockBadge.className = 'badge badge-success';
            addToCartBtn.disabled = false;
        }
        
        // Badges
        const newArrivalBadge = document.getElementById('new-arrival-badge');
        const featuredBadge = document.getElementById('featured-badge');
        
        if (newArrivalBadge) {
            newArrivalBadge.classList.toggle('d-none', !this.product.is_new_arrival);
        }
        if (featuredBadge) {
            featuredBadge.classList.toggle('d-none', !this.product.is_featured);
        }
        
        // Update meta
        this.updateMetaDescription();
    }

    renderProductImages() {
        const carousel = document.getElementById('carousel-images');
        const thumbnails = document.getElementById('image-thumbnails');
        
        if (!carousel) return;
        
        // Fallback images jika tidak ada
        const fallbackImages = [
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
        ];
        
        // Gunakan images array atau image_url single
        let images = [];
        if (this.product.images && this.product.images.length > 0) {
            images = this.product.images;
        } else if (this.product.image_url) {
            images = [this.product.image_url];
        } else {
            images = fallbackImages;
        }
        
        carousel.innerHTML = images.map((img, index) => `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <img class="w-100 h-100" src="${img}" alt="${this.product.name}" 
                     style="object-fit: cover; max-height: 500px;"
                     onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'">
            </div>
        `).join('');
        
        // Hanya show thumbnails jika multiple images
        if (thumbnails && images.length > 1) {
            thumbnails.innerHTML = images.map((img, index) => `
                <div class="col-3 mb-2">
                    <a href="#" class="thumbnail-link ${index === 0 ? 'active' : ''}" data-slide-to="${index}">
                        <img src="${img}" class="img-thumbnail" alt="Thumbnail ${index + 1}" 
                             style="width: 100%; height: 80px; object-fit: cover;"
                             onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80'">
                    </a>
                </div>
            `).join('');
        } else if (thumbnails) {
            thumbnails.innerHTML = '';
        }
    }

    renderSizeOptions() {
        const sizeContainer = document.getElementById('size-options');
        const sizeSection = document.getElementById('size-section');
        
        if (!sizeContainer || !sizeSection) return;
        
        // Default sizes untuk sneakers
        const defaultSizes = ['39', '40', '41', '42', '43', '44'];
        const sizes = this.product.sizes || defaultSizes;
        
        if (sizes.length === 0) {
            sizeSection.style.display = 'none';
            return;
        }
        
        sizeContainer.innerHTML = sizes.map(size => `
            <div class="custom-control custom-radio custom-control-inline mr-2 mb-2">
                <input type="radio" class="custom-control-input size-option" 
                       id="size-${size}" name="size" value="${size}">
                <label class="custom-control-label" for="size-${size}">${size}</label>
            </div>
        `).join('');
        
        // Auto-select first size
        if (sizes.length > 0) {
            this.selectedSize = sizes[0];
            const firstSizeRadio = document.getElementById(`size-${sizes[0]}`);
            if (firstSizeRadio) {
                firstSizeRadio.checked = true;
            }
        }
    }

    renderColorOptions() {
        const colorContainer = document.getElementById('color-options');
        const colorSection = document.getElementById('color-section');
        
        if (!colorContainer || !colorSection) return;
        
        // Default colors
        const defaultColors = ['Black', 'White'];
        const colors = this.product.colors || defaultColors;
        
        if (colors.length === 0) {
            colorSection.style.display = 'none';
            return;
        }
        
        colorContainer.innerHTML = colors.map(color => `
            <div class="custom-control custom-radio custom-control-inline mr-2 mb-2">
                <input type="radio" class="custom-control-input color-option" 
                       id="color-${color.replace(/\s+/g, '-')}" name="color" value="${color}">
                <label class="custom-control-label" for="color-${color.replace(/\s+/g, '-')}">${color}</label>
            </div>
        `).join('');
        
        // Auto-select first color
        if (colors.length > 0) {
            this.selectedColor = colors[0];
            const firstColorRadio = document.getElementById(`color-${colors[0].replace(/\s+/g, '-')}`);
            if (firstColorRadio) {
                firstColorRadio.checked = true;
            }
        }
    }

    async loadReviews() {
        // Simulate reviews - bisa diintegrasikan dengan table terpisah nanti
        this.reviews = [
            {
                id: 1,
                user_name: "Budi Santoso",
                rating: 5,
                comment: "Sangat nyaman dipakai, bahan berkualitas tinggi! Cocok untuk sehari-hari.",
                created_at: "2024-01-15T10:30:00Z"
            },
            {
                id: 2, 
                user_name: "Sari Wijaya",
                rating: 4,
                comment: "Desainnya keren dan nyaman. Harga cukup worth it untuk kualitasnya.",
                created_at: "2024-01-10T14:20:00Z"
            }
        ];
        
        this.renderReviews();
    }

    renderReviews() {
        const reviewsContainer = document.getElementById('reviews-container');
        const noReviews = document.getElementById('no-reviews');
        const reviewsCount = document.getElementById('reviews-count');
        
        if (!reviewsContainer || !noReviews || !reviewsCount) return;
        
        reviewsCount.textContent = this.reviews.length;
        
        if (this.reviews.length === 0) {
            noReviews.classList.remove('d-none');
            reviewsContainer.innerHTML = '';
            return;
        }
        
        noReviews.classList.add('d-none');
        reviewsContainer.innerHTML = this.reviews.map(review => `
            <div class="media mb-4">
                <div class="media-body">
                    <h6>${review.user_name}<small> - <i>${SneakZoneApp.Utils.formatDate(review.created_at)}</i></small></h6>
                    <div class="text-primary mb-2">
                        ${this.renderStarRating(review.rating)}
                    </div>
                    <p>${review.comment}</p>
                </div>
            </div>
        `).join('');
        
        this.updateAverageRating();
    }

    renderStarRating(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star"></i>';
            } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
                stars += '<i class="fas fa-star-half-alt"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        return stars;
    }

    updateAverageRating() {
        const ratingElement = document.getElementById('product-rating');
        const reviewCountElement = document.getElementById('review-count');
        
        if (!ratingElement || !reviewCountElement) return;
        
        if (this.reviews.length === 0) {
            ratingElement.innerHTML = this.renderStarRating(0);
            reviewCountElement.textContent = '(Belum ada ulasan)';
            return;
        }
        
        const averageRating = this.reviews.reduce((sum, review) => sum + review.rating, 0) / this.reviews.length;
        ratingElement.innerHTML = this.renderStarRating(averageRating);
        reviewCountElement.textContent = `(${this.reviews.length} Ulasan)`;
    }

    async renderRelatedProducts() {
        try {
            const relatedSection = document.getElementById('related-products-section');
            if (!relatedSection || !this.product || !this.product.category) {
                if (relatedSection) relatedSection.style.display = 'none';
                return;
            }
            
            const relatedProducts = await SneakZoneApp.ProductService.getProductsByCategory(
                this.product.category, 
                6
            );
            
            // Exclude current product
            const filteredProducts = relatedProducts.filter(p => p.id !== this.product.id).slice(0, 5);
            
            if (filteredProducts.length === 0) {
                relatedSection.style.display = 'none';
                return;
            }
            
            const carousel = document.getElementById('related-products-carousel');
            if (!carousel) {
                relatedSection.style.display = 'none';
                return;
            }
            
            carousel.innerHTML = filteredProducts.map(product => `
                <div class="card product-item border-0">
                    <div class="card-header product-img position-relative overflow-hidden bg-transparent border p-0">
                        <img class="img-fluid w-100" src="${product.image_url}" alt="${product.name}" 
                             style="height: 200px; object-fit: cover;"
                             onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'">
                    </div>
                    <div class="card-body border-left border-right text-center p-0 pt-4 pb-3">
                        <h6 class="text-truncate mb-3">${product.name}</h6>
                        <div class="d-flex justify-content-center">
                            <h6>${SneakZoneApp.Utils.formatPrice(product.price)}</h6>
                            ${product.original_price && product.original_price > product.price ? 
                                `<h6 class="text-muted ml-2"><del>${SneakZoneApp.Utils.formatPrice(product.original_price)}</del></h6>` : ''}
                        </div>
                    </div>
                    <div class="card-footer d-flex justify-content-between bg-light border">
                        <a href="detail.html?id=${product.id}" class="btn btn-sm text-dark p-0">
                            <i class="fas fa-eye text-primary mr-1"></i>Detail
                        </a>
                        <button class="btn btn-sm text-dark p-0 add-to-cart-related" data-product-id="${product.id}">
                            <i class="fas fa-shopping-cart text-primary mr-1"></i>+ Keranjang
                        </button>
                    </div>
                </div>
            `).join('');
            
            // Initialize Owl Carousel jika available
            this.initOwlCarousel();
            
        } catch (error) {
            console.error('Error loading related products:', error);
            const relatedSection = document.getElementById('related-products-section');
            if (relatedSection) relatedSection.style.display = 'none';
        }
    }

    initOwlCarousel() {
        // Tunggu sampai DOM siap
        setTimeout(() => {
            if (typeof $ !== 'undefined' && $.fn.owlCarousel) {
                $('.related-carousel').owlCarousel({
                    loop: true,
                    margin: 29,
                    nav: false,
                    autoplay: true,
                    smartSpeed: 1000,
                    responsive: {
                        0: { items: 1 },
                        576: { items: 2 },
                        768: { items: 3 },
                        992: { items: 4 }
                    }
                });
            }
        }, 100);
    }

    setupEventListeners() {
        // Quantity controls
        const minusBtn = document.querySelector('.btn-minus');
        const plusBtn = document.querySelector('.btn-plus');
        
        if (minusBtn) {
            minusBtn.addEventListener('click', () => {
                if (this.quantity > 1) {
                    this.quantity--;
                    this.updateQuantityDisplay();
                }
            });
        }
        
        if (plusBtn) {
            plusBtn.addEventListener('click', () => {
                const maxQuantity = Math.min(10, this.product?.stock || 1);
                if (this.quantity < maxQuantity) {
                    this.quantity++;
                    this.updateQuantityDisplay();
                }
            });
        }

        // Add to cart
        const addToCartBtn = document.getElementById('add-to-cart-btn');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', () => {
                this.addToCart();
            });
        }

        // Add to wishlist
        const wishlistBtn = document.getElementById('add-to-wishlist-btn');
        if (wishlistBtn) {
            wishlistBtn.addEventListener('click', () => {
                this.toggleWishlist();
            });
        }

        // Delegated event listeners
        document.addEventListener('click', (e) => {
            // Size selection
            if (e.target.classList.contains('size-option')) {
                this.selectedSize = e.target.value;
            }
            
            // Color selection
            if (e.target.classList.contains('color-option')) {
                this.selectedColor = e.target.value;
            }
            
            // Related products add to cart
            if (e.target.closest('.add-to-cart-related')) {
                const productId = e.target.closest('.add-to-cart-related').getAttribute('data-product-id');
                this.addRelatedToCart(productId);
            }
            
            // Thumbnail navigation
            if (e.target.closest('.thumbnail-link')) {
                e.preventDefault();
                const slideTo = parseInt(e.target.closest('.thumbnail-link').getAttribute('data-slide-to'));
                if (typeof $ !== 'undefined') {
                    $('#product-carousel').carousel(slideTo);
                }
            }
        });

        // Review form
        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitReview();
            });
        }

        // Star rating
        document.querySelectorAll('.rating-stars .fa-star').forEach(star => {
            star.addEventListener('click', () => {
                this.setRating(parseInt(star.getAttribute('data-rating')));
            });
        });

        // Social sharing
        document.querySelectorAll('.social-share').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.shareProduct(e.target.closest('.social-share').getAttribute('data-platform'));
            });
        });
    }

    updateQuantityDisplay() {
        const quantityInput = document.getElementById('quantity-input');
        if (quantityInput) {
            quantityInput.value = this.quantity;
        }
    }

    addToCart() {
        if (!this.product) return;

        if (this.product.stock === 0) {
            SneakZoneApp.Utils.showNotification('Maaf, produk ini sedang habis.', 'warning');
            return;
        }

        SneakZoneApp.CartService.addToCart(this.product, this.quantity, this.selectedSize, this.selectedColor);
        
        SneakZoneApp.Utils.showNotification(
            `<strong>${this.product.name}</strong> berhasil ditambahkan ke keranjang!`, 
            'success'
        );
    }

    addRelatedToCart(productId) {
        // Simulate adding related product to cart
        SneakZoneApp.Utils.showNotification('Produk berhasil ditambahkan ke keranjang!', 'success');
    }

    toggleWishlist() {
        if (!this.product) return;

        const wishlistBtn = document.getElementById('add-to-wishlist-btn');
        if (!wishlistBtn) return;
        
        if (SneakZoneApp.WishlistService.isInWishlist(this.product.id)) {
            SneakZoneApp.WishlistService.removeFromWishlist(this.product.id);
            wishlistBtn.innerHTML = '<i class="fas fa-heart mr-1"></i> Wishlist';
            wishlistBtn.className = 'btn btn-outline-danger px-3';
            SneakZoneApp.Utils.showNotification('Produk dihapus dari wishlist.', 'info');
        } else {
            SneakZoneApp.WishlistService.addToWishlist(this.product);
            wishlistBtn.innerHTML = '<i class="fas fa-heart mr-1"></i> Dalam Wishlist';
            wishlistBtn.className = 'btn btn-danger px-3';
            SneakZoneApp.Utils.showNotification('Produk ditambahkan ke wishlist!', 'success');
        }
    }

    setRating(rating) {
        const selectedRatingInput = document.getElementById('selected-rating');
        if (!selectedRatingInput) return;
        
        selectedRatingInput.value = rating;
        const stars = document.querySelectorAll('.rating-stars .fa-star');
        
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('far');
                star.classList.add('fas');
            } else {
                star.classList.remove('fas');
                star.classList.add('far');
            }
        });
    }

    submitReview() {
        const selectedRatingInput = document.getElementById('selected-rating');
        const commentInput = document.getElementById('review-comment');
        const nameInput = document.getElementById('review-name');
        const emailInput = document.getElementById('review-email');
        
        if (!selectedRatingInput || !commentInput || !nameInput || !emailInput) return;
        
        const rating = parseInt(selectedRatingInput.value);
        const comment = commentInput.value.trim();
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();

        if (rating === 0) {
            SneakZoneApp.Utils.showNotification('Harap berikan rating untuk produk ini.', 'warning');
            return;
        }

        if (!comment || !name || !email) {
            SneakZoneApp.Utils.showNotification('Harap lengkapi semua field yang diperlukan.', 'warning');
            return;
        }

        // Add new review
        const newReview = {
            id: Date.now(),
            user_name: name,
            rating: rating,
            comment: comment,
            created_at: new Date().toISOString()
        };

        this.reviews.unshift(newReview);
        this.renderReviews();
        
        // Reset form
        document.getElementById('review-form').reset();
        this.setRating(0);
        
        SneakZoneApp.Utils.showNotification('Terima kasih atas ulasan Anda!', 'success');
    }

    shareProduct(platform) {
        if (!this.product) return;
        
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(this.product.name);
        const text = encodeURIComponent(`Lihat ${this.product.name} di SneakZone!`);
        
        let shareUrl = '';
        
        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${text} ${url}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;
                break;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    }

    updateMetaDescription() {
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription && this.product) {
            const desc = this.product.description ? 
                this.product.description.substring(0, 160) : 
                'Sneakers berkualitas premium dengan harga terbaik';
            metaDescription.content = `${this.product.name} - ${desc}...`;
        }
    }

    showLoadingState() {
        const loadingState = document.getElementById('loading-state');
        const productContent = document.getElementById('product-content');
        const errorState = document.getElementById('error-state');
        
        if (loadingState) loadingState.classList.remove('d-none');
        if (productContent) productContent.classList.add('d-none');
        if (errorState) errorState.classList.add('d-none');
    }

    hideLoadingState() {
        const loadingState = document.getElementById('loading-state');
        const productContent = document.getElementById('product-content');
        
        if (loadingState) loadingState.classList.add('d-none');
        if (productContent) productContent.classList.remove('d-none');
    }

    showErrorState(message) {
        const loadingState = document.getElementById('loading-state');
        const productContent = document.getElementById('product-content');
        const errorState = document.getElementById('error-state');
        
        if (loadingState) loadingState.classList.add('d-none');
        if (productContent) productContent.classList.add('d-none');
        if (errorState) {
            errorState.classList.remove('d-none');
            errorState.innerHTML = `
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h5 class="text-warning">Terjadi Kesalahan</h5>
                <p class="text-muted">${message}</p>
                <div class="mt-3">
                    <a href="index.html" class="btn btn-secondary mr-2">Kembali ke Beranda</a>
                    <a href="shop.html" class="btn btn-primary">Lihat Semua Produk</a>
                </div>
            `;
        }
    }
}

// Initialize dengan error handling
document.addEventListener('DOMContentLoaded', function() {
    try {
        const detailPage = new DetailPage();
        detailPage.init();
        
        // Global access untuk debugging
        window.detailPage = detailPage;
    } catch (error) {
        console.error('Error initializing detail page:', error);
        // Fallback error display
        const body = document.body;
        if (body) {
            body.innerHTML = `
                <div class="container text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <h3 class="text-danger">Terjadi Kesalahan</h3>
                    <p class="text-muted">Gagal memuat halaman detail produk.</p>
                    <div class="mt-3">
                        <a href="index.html" class="btn btn-primary">Kembali ke Beranda</a>
                        <a href="shop.html" class="btn btn-secondary">Lihat Produk</a>
                    </div>
                </div>
            `;
        }
    }
});