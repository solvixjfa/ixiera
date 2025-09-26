// js/wishlist.js - Specialist Wishlist Page
class WishlistPage {
    constructor() {
        this.wishlistItems = [];
        this.init();
    }

    async init() {
        console.log('🔄 Wishlist Page Initialized');
        
        // Tunggu SneakZoneApp load
        if (!window.SneakZoneApp) {
            setTimeout(() => this.init(), 100);
            return;
        }

        await this.loadWishlist();
        this.renderWishlist();
        this.setupEventListeners();
        this.updateWishlistCount();
    }

    async loadWishlist() {
        try {
            console.log('📦 Loading wishlist...');
            
            // Load dari WishlistService
            if (window.SneakZoneApp.WishlistService) {
                this.wishlistItems = await window.SneakZoneApp.WishlistService.getWishlistProducts();
                console.log('✅ Wishlist loaded:', this.wishlistItems);
            } else {
                // Fallback ke localStorage
                const wishlist = localStorage.getItem('sneakzone_wishlist');
                this.wishlistItems = wishlist ? JSON.parse(wishlist) : [];
            }
        } catch (error) {
            console.error('❌ Error loading wishlist:', error);
            this.wishlistItems = [];
        }
    }

    renderWishlist() {
        const container = document.getElementById('wishlist-items');
        const emptyState = document.getElementById('empty-wishlist');
        const countElement = document.getElementById('wishlist-count');

        if (!container) return;

        if (this.wishlistItems.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'flex';
            countElement.textContent = '0';
            return;
        }

        emptyState.style.display = 'none';
        countElement.textContent = this.wishlistItems.length;

        container.innerHTML = this.wishlistItems.map((item, index) => `
            <div class="card border-0 shadow-sm mb-3 wishlist-item">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <img src="${item.image_url}" 
                                 alt="${item.name}" 
                                 class="product-image img-fluid"
                                 onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80'">
                        </div>
                        <div class="col-md-4">
                            <h5 class="card-title mb-1">${item.name}</h5>
                            <p class="text-muted mb-1 small">${item.brand || 'SneakZone'}</p>
                            <p class="text-muted mb-0 small">Kategori: ${item.category || 'General'}</p>
                            ${item.added_at ? `<small class="text-muted">Ditambahkan: ${this.formatDate(item.added_at)}</small>` : ''}
                        </div>
                        <div class="col-md-2 text-center">
                            <span class="h5 text-primary">${this.formatPrice(item.price)}</span>
                            ${item.original_price && item.original_price > item.price ? 
                                `<small class="text-muted d-block"><del>${this.formatPrice(item.original_price)}</del></small>` : ''}
                        </div>
                        <div class="col-md-2 text-center">
                            <span class="badge ${item.stock > 0 ? 'badge-success' : 'badge-danger'}">
                                ${item.stock > 0 ? 'Stok Tersedia' : 'Stok Habis'}
                            </span>
                            ${item.stock > 0 ? `<small class="text-muted d-block">${item.stock} tersedia</small>` : ''}
                        </div>
                        <div class="col-md-2 text-center">
                            <div class="btn-group-vertical">
                                <button class="btn btn-primary btn-sm mb-2 add-to-cart" 
                                        data-product-id="${item.id}"
                                        ${item.stock === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-shopping-cart mr-1"></i>
                                    ${item.stock === 0 ? 'Habis' : '+ Keranjang'}
                                </button>
                                <button class="btn btn-outline-danger btn-sm remove-wishlist" 
                                        data-product-id="${item.id}">
                                    <i class="fas fa-trash mr-1"></i> Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Remove from wishlist
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-wishlist')) {
                const button = e.target.closest('.remove-wishlist');
                const productId = button.getAttribute('data-product-id');
                this.removeFromWishlist(productId);
            }

            // Add to cart from wishlist
            if (e.target.closest('.add-to-cart')) {
                const button = e.target.closest('.add-to-cart');
                if (!button.disabled) {
                    const productId = button.getAttribute('data-product-id');
                    this.addToCartFromWishlist(productId);
                }
            }
        });

        // Clear all wishlist
        const clearBtn = document.getElementById('clear-wishlist');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearWishlist());
        }

        // Update wishlist count periodically
        setInterval(() => this.updateWishlistCount(), 2000);
    }

    async removeFromWishlist(productId) {
        try {
            if (window.SneakZoneApp.WishlistService) {
                window.SneakZoneApp.WishlistService.removeFromWishlist(productId);
                
                // Show notification
                if (window.SneakZoneApp.Utils) {
                    window.SneakZoneApp.Utils.showNotification('Produk dihapus dari wishlist', 'info');
                } else {
                    alert('Produk dihapus dari wishlist');
                }
            }

            // Reload wishlist
            await this.loadWishlist();
            this.renderWishlist();
            this.updateWishlistCount();

        } catch (error) {
            console.error('Error removing from wishlist:', error);
        }
    }

    async addToCartFromWishlist(productId) {
        try {
            const product = this.wishlistItems.find(item => item.id == productId);
            if (!product) return;

            if (window.SneakZoneApp.CartService) {
                window.SneakZoneApp.CartService.addToCart(product, 1);
                
                // Show notification
                if (window.SneakZoneApp.Utils) {
                    window.SneakZoneApp.Utils.showNotification(
                        `<strong>${product.name}</strong> ditambahkan ke keranjang!`, 
                        'success'
                    );
                }

                // Optional: Remove from wishlist after adding to cart
                // this.removeFromWishlist(productId);
            }

        } catch (error) {
            console.error('Error adding to cart:', error);
            if (window.SneakZoneApp.Utils) {
                window.SneakZoneApp.Utils.showNotification('Gagal menambahkan ke keranjang', 'danger');
            }
        }
    }

    clearWishlist() {
        if (confirm('Apakah Anda yakin ingin menghapus semua item dari wishlist?')) {
            if (window.SneakZoneApp.WishlistService) {
                const wishlist = window.SneakZoneApp.WishlistService.getWishlist();
                wishlist.forEach(item => {
                    window.SneakZoneApp.WishlistService.removeFromWishlist(item.id);
                });
            } else {
                localStorage.removeItem('sneakzone_wishlist');
            }

            this.wishlistItems = [];
            this.renderWishlist();
            this.updateWishlistCount();

            if (window.SneakZoneApp.Utils) {
                window.SneakZoneApp.Utils.showNotification('Wishlist berhasil dikosongkan', 'info');
            }
        }
    }

    updateWishlistCount() {
        if (window.SneakZoneApp.WishlistService) {
            window.SneakZoneApp.WishlistService.updateWishlistCount();
        }
    }

    formatPrice(price) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}

// Initialize wishlist page
document.addEventListener('DOMContentLoaded', function() {
    // Tunggu SneakZoneApp load
    function initializeWishlist() {
        if (!window.SneakZoneApp) {
            setTimeout(initializeWishlist, 100);
            return;
        }
        
        const wishlistPage = new WishlistPage();
        window.wishlistPage = wishlistPage;
    }

    initializeWishlist();
});