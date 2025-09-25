// js/cart.js - Specialist untuk halaman keranjang belanja
class CartPage {
    constructor() {
        this.cart = [];
        this.coupon = null;
        this.shippingCost = 15000; // Default shipping cost
        this.freeShippingThreshold = 500000; // Free shipping above this amount
    }

    async init() {
        console.log('Cart Page Initialized');
        
        // Update cart & wishlist counts
        SneakZoneApp.CartService.updateCartCount();
        SneakZoneApp.WishlistService.updateWishlistCount();
        
        // Load cart data
        this.loadCartData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load suggested products
        await this.loadSuggestedProducts();
    }

    loadCartData() {
        this.cart = SneakZoneApp.CartService.getCart();
        console.log('Cart items:', this.cart);
        
        if (this.cart.length === 0) {
            this.showEmptyCart();
        } else {
            this.showCartContent();
            this.renderCartItems();
            this.updateCartSummary();
        }
    }

    showEmptyCart() {
        document.getElementById('empty-cart').classList.remove('d-none');
        document.getElementById('cart-content').classList.add('d-none');
    }

    showCartContent() {
        document.getElementById('empty-cart').classList.add('d-none');
        document.getElementById('cart-content').classList.remove('d-none');
    }

    renderCartItems() {
        const cartItemsContainer = document.getElementById('cart-items');
        if (!cartItemsContainer) return;

        cartItemsContainer.innerHTML = this.cart.map((item, index) => `
            <tr id="cart-item-${index}">
                <td class="align-middle text-left">
                    <div class="d-flex align-items-center">
                        <img src="${item.image_url}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover;" 
                             onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'">
                        <div class="ml-3">
                            <h6 class="mb-1">${item.name}</h6>
                            <small class="text-muted">
                                ${item.size ? `Ukuran: ${item.size} | ` : ''}
                                ${item.color ? `Warna: ${item.color}` : ''}
                            </small>
                        </div>
                    </div>
                </td>
                <td class="align-middle">${SneakZoneApp.Utils.formatPrice(item.price)}</td>
                <td class="align-middle">
                    <div class="input-group quantity mx-auto" style="width: 120px;">
                        <div class="input-group-btn">
                            <button class="btn btn-sm btn-primary btn-minus" data-index="${index}">
                                <i class="fa fa-minus"></i>
                            </button>
                        </div>
                        <input type="text" class="form-control form-control-sm bg-secondary text-center quantity-input" 
                               value="${item.quantity}" data-index="${index}" max="${item.max_stock}">
                        <div class="input-group-btn">
                            <button class="btn btn-sm btn-primary btn-plus" data-index="${index}">
                                <i class="fa fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    <small class="text-muted d-block mt-1">Stok: ${item.max_stock}</small>
                </td>
                <td class="align-middle">${SneakZoneApp.Utils.formatPrice(item.price * item.quantity)}</td>
                <td class="align-middle">
                    <button class="btn btn-sm btn-danger remove-item" data-index="${index}" title="Hapus dari keranjang">
                        <i class="fa fa-times"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateCartSummary() {
        const subtotal = this.calculateSubtotal();
        const shipping = this.calculateShipping(subtotal);
        const discount = this.calculateDiscount(subtotal);
        const total = subtotal + shipping - discount;

        // Update prices
        document.getElementById('subtotal-price').textContent = SneakZoneApp.Utils.formatPrice(subtotal);
        document.getElementById('shipping-price').textContent = SneakZoneApp.Utils.formatPrice(shipping);
        document.getElementById('total-price').textContent = SneakZoneApp.Utils.formatPrice(total);

        // Show/hide discount
        const discountRow = document.getElementById('discount-row');
        const discountPrice = document.getElementById('discount-price');
        
        if (discount > 0) {
            discountRow.style.display = 'flex';
            discountPrice.textContent = `-${SneakZoneApp.Utils.formatPrice(discount)}`;
        } else {
            discountRow.style.display = 'none';
        }

        // Update shipping info
        if (shipping === 0) {
            document.getElementById('shipping-price').innerHTML = 
                '<span class="text-success">Gratis</span>';
        }
    }

    calculateSubtotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    calculateShipping(subtotal) {
        return subtotal >= this.freeShippingThreshold ? 0 : this.shippingCost;
    }

    calculateDiscount(subtotal) {
        if (!this.coupon) return 0;
        
        switch (this.coupon.type) {
            case 'percentage':
                return subtotal * (this.coupon.value / 100);
            case 'fixed':
                return this.coupon.value;
            default:
                return 0;
        }
    }

    setupEventListeners() {
        // Quantity controls
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-minus')) {
                const index = parseInt(e.target.closest('.btn-minus').getAttribute('data-index'));
                this.decreaseQuantity(index);
            }
            
            if (e.target.closest('.btn-plus')) {
                const index = parseInt(e.target.closest('.btn-plus').getAttribute('data-index'));
                this.increaseQuantity(index);
            }
            
            if (e.target.closest('.remove-item')) {
                const index = parseInt(e.target.closest('.remove-item').getAttribute('data-index'));
                this.removeItem(index);
            }
        });

        // Quantity input change
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('quantity-input')) {
                const index = parseInt(e.target.getAttribute('data-index'));
                const newQuantity = parseInt(e.target.value) || 1;
                this.updateQuantity(index, newQuantity);
            }
        });

        // Coupon form
        document.getElementById('coupon-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.applyCoupon();
        });

        // Checkout button
        document.getElementById('checkout-btn').addEventListener('click', () => {
            this.proceedToCheckout();
        });
    }

    decreaseQuantity(index) {
        if (index >= 0 && index < this.cart.length) {
            const newQuantity = Math.max(1, this.cart[index].quantity - 1);
            this.updateQuantity(index, newQuantity);
        }
    }

    increaseQuantity(index) {
        if (index >= 0 && index < this.cart.length) {
            const maxStock = this.cart[index].max_stock;
            const newQuantity = Math.min(maxStock, this.cart[index].quantity + 1);
            this.updateQuantity(index, newQuantity);
        }
    }

    updateQuantity(index, newQuantity) {
        if (index >= 0 && index < this.cart.length) {
            const item = this.cart[index];
            
            if (newQuantity > item.max_stock) {
                SneakZoneApp.Utils.showNotification(
                    `Stok tidak mencukupi. Stok tersisa: ${item.max_stock}`,
                    'warning'
                );
                newQuantity = item.max_stock;
            }

            SneakZoneApp.CartService.updateQuantity(item.id, newQuantity, item.size, item.color);
            this.loadCartData(); // Reload cart data
            SneakZoneApp.Utils.showNotification('Jumlah produk diperbarui', 'success');
        }
    }

    removeItem(index) {
        if (index >= 0 && index < this.cart.length) {
            const item = this.cart[index];
            if (confirm(`Hapus ${item.name} dari keranjang?`)) {
                SneakZoneApp.CartService.removeFromCart(item.id, item.size, item.color);
                this.loadCartData(); // Reload cart data
                SneakZoneApp.Utils.showNotification('Produk dihapus dari keranjang', 'info');
            }
        }
    }

    applyCoupon() {
        const couponCode = document.getElementById('coupon-code').value.trim();
        const couponMessage = document.getElementById('coupon-message');
        
        if (!couponCode) {
            couponMessage.textContent = 'Masukkan kode kupon';
            couponMessage.className = 'text-muted';
            return;
        }

        // Simulate coupon validation
        const coupons = {
            'DISKON10': { type: 'percentage', value: 10, message: 'Diskon 10% berhasil diterapkan!' },
            'GRATISONGKIR': { type: 'fixed', value: this.shippingCost, message: 'Gratis ongkir berhasil diterapkan!' },
            'SNEAKZONE15': { type: 'percentage', value: 15, message: 'Diskon 15% berhasil diterapkan!' }
        };

        if (coupons[couponCode.toUpperCase()]) {
            this.coupon = coupons[couponCode.toUpperCase()];
            couponMessage.textContent = this.coupon.message;
            couponMessage.className = 'text-success';
            this.updateCartSummary();
            SneakZoneApp.Utils.showNotification(this.coupon.message, 'success');
        } else {
            couponMessage.textContent = 'Kode kupon tidak valid';
            couponMessage.className = 'text-danger';
            this.coupon = null;
            this.updateCartSummary();
        }
    }

    proceedToCheckout() {
        if (this.cart.length === 0) {
            SneakZoneApp.Utils.showNotification('Keranjang belanja kosong', 'warning');
            return;
        }

        // Simulate checkout process
        SneakZoneApp.Utils.showNotification(
            'Mengalihkan ke halaman checkout...',
            'info'
        );

        // Redirect to checkout page
        setTimeout(() => {
            window.location.href = 'checkout.html';
        }, 1000);
    }

    async loadSuggestedProducts() {
        try {
            // Get random products for suggestions
            const allProducts = await SneakZoneApp.ProductService.getAllProducts();
            const suggestedProducts = allProducts
                .filter(product => !this.cart.some(item => item.id === product.id))
                .sort(() => 0.5 - Math.random())
                .slice(0, 5);

            this.renderSuggestedProducts(suggestedProducts);
        } catch (error) {
            console.error('Error loading suggested products:', error);
        }
    }

    renderSuggestedProducts(products) {
        const container = document.getElementById('suggested-products');
        if (!container || products.length === 0) {
            const suggestedSection = document.querySelector('.row.mt-5');
            if (suggestedSection) suggestedSection.style.display = 'none';
            return;
        }

        container.innerHTML = products.map(product => `
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
                    <button class="btn btn-sm text-dark p-0 add-to-cart-suggested" data-product-id="${product.id}">
                        <i class="fas fa-shopping-cart text-primary mr-1"></i>+ Keranjang
                    </button>
                </div>
            </div>
        `).join('');

        // Initialize carousel
        this.initSuggestedCarousel();

        // Add event listeners for suggested products
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart-suggested')) {
                const productId = e.target.closest('.add-to-cart-suggested').getAttribute('data-product-id');
                this.addSuggestedToCart(productId);
            }
        });
    }

    initSuggestedCarousel() {
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

    async addSuggestedToCart(productId) {
        try {
            const product = await SneakZoneApp.ProductService.getProductById(productId);
            if (product) {
                SneakZoneApp.CartService.addToCart(product, 1);
                this.loadCartData(); // Refresh cart
                SneakZoneApp.Utils.showNotification(
                    `${product.name} ditambahkan ke keranjang!`,
                    'success'
                );
            }
        } catch (error) {
            console.error('Error adding suggested product to cart:', error);
            SneakZoneApp.Utils.showNotification('Gagal menambahkan produk', 'danger');
        }
    }
}

// Initialize cart page
document.addEventListener('DOMContentLoaded', function() {
    const cartPage = new CartPage();
    cartPage.init();
    
    // Global access for debugging
    window.cartPage = cartPage;
});