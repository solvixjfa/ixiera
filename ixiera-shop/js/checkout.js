// js/checkout.js - Versi Konsisten dengan Template
class CheckoutPage {
    constructor() {
        this.checkoutData = null;
        this.selectedPaymentMethod = null;
        this.shippingCost = 15000;
        this.freeShippingThreshold = 500000;
        
        this.provinces = [
            'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 
            'Banten', 'Bali', 'Yogyakarta', 'Sumatera Utara'
        ];
        
        this.paymentMethods = [
            { 
                id: 'bank_transfer', 
                name: 'Transfer Bank', 
                description: 'Transfer ke rekening bank kami'
            },
            { 
                id: 'cod', 
                name: 'Bayar di Tempat (COD)', 
                description: 'Bayar ketika barang sampai'
            }
        ];
    }

    async init() {
        console.log('Checkout Page Initialized');
        
        // Update cart count
        if (window.SneakZoneApp && SneakZoneApp.CartService) {
            SneakZoneApp.CartService.updateCartCount();
        }
        
        this.loadCheckoutData();
        this.renderCheckout();
        this.setupEventListeners();
        this.setupProvinceOptions();
    }

    loadCheckoutData() {
        console.log('Loading checkout data...');
        
        // Coba dari sessionStorage dulu
        const savedData = sessionStorage.getItem('checkoutData');
        
        if (savedData) {
            try {
                this.checkoutData = JSON.parse(savedData);
                console.log('Checkout data loaded from sessionStorage');
                
                if (!this.checkoutData.cart || this.checkoutData.cart.length === 0) {
                    this.showEmptyCheckout();
                    return;
                }
            } catch (error) {
                console.error('Error loading from sessionStorage:', error);
                sessionStorage.removeItem('checkoutData');
            }
        }
        
        // Fallback: Load dari cart
        if (window.SneakZoneApp && SneakZoneApp.CartService) {
            const cart = SneakZoneApp.CartService.getCart();
            if (cart.length === 0) {
                this.showEmptyCheckout();
                return;
            }
            
            this.checkoutData = this.createCheckoutDataFromCart(cart);
            sessionStorage.setItem('checkoutData', JSON.stringify(this.checkoutData));
            console.log('Checkout data created from cart');
        }
    }

    createCheckoutDataFromCart(cart) {
        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        const shipping = subtotal >= this.freeShippingThreshold ? 0 : this.shippingCost;
        
        return {
            cart: cart,
            subtotal: subtotal,
            shipping: shipping,
            discount: 0,
            total: subtotal + shipping,
            timestamp: new Date().toISOString()
        };
    }

    setupProvinceOptions() {
        const provinceSelect = document.getElementById('province');
        if (provinceSelect) {
            // Clear existing options except the first one
            while (provinceSelect.options.length > 1) {
                provinceSelect.remove(1);
            }
            
            // Add Indonesia provinces
            this.provinces.forEach(province => {
                const option = document.createElement('option');
                option.value = province;
                option.textContent = province;
                provinceSelect.appendChild(option);
            });
        }
    }

    renderCheckout() {
        if (!this.checkoutData || !this.checkoutData.cart || this.checkoutData.cart.length === 0) {
            this.showEmptyCheckout();
            return;
        }

        this.renderOrderSummary();
        this.renderPaymentMethods();
        this.updateOrderSummary();
    }

    renderOrderSummary() {
        const container = document.getElementById('checkout-items');
        if (!container) {
            console.error('checkout-items container not found');
            return;
        }

        container.innerHTML = this.checkoutData.cart.map(item => `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex align-items-center">
                    <img src="${item.image_url}" alt="${item.name}" 
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px;"
                         onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'">
                    <div class="ml-3">
                        <h6 class="mb-1">${item.name}</h6>
                        <small class="text-muted">
                            ${item.size ? `Size: ${item.size} | ` : ''}
                            Qty: ${item.quantity}
                        </small>
                    </div>
                </div>
                <span class="font-weight-medium">${this.formatPrice(item.price * item.quantity)}</span>
            </div>
        `).join('');
    }

    renderPaymentMethods() {
        const container = document.getElementById('payment-methods-container');
        if (!container) {
            console.error('payment-methods-container not found');
            return;
        }

        container.innerHTML = this.paymentMethods.map(method => `
            <div class="form-group">
                <div class="custom-control custom-radio">
                    <input type="radio" class="custom-control-input" name="payment" 
                           id="${method.id}" value="${method.id}" required>
                    <label class="custom-control-label" for="${method.id}">
                        <strong>${method.name}</strong> - ${method.description}
                    </label>
                </div>
            </div>
        `).join('');
    }

    updateOrderSummary() {
        if (!this.checkoutData) return;

        const subtotal = this.calculateSubtotal();
        const shipping = this.calculateShipping(subtotal);
        const discount = this.calculateDiscount(subtotal);
        const total = subtotal + shipping - discount;

        // Update data
        this.checkoutData.subtotal = subtotal;
        this.checkoutData.shipping = shipping;
        this.checkoutData.discount = discount;
        this.checkoutData.total = total;

        // Update UI
        this.updateElementText('subtotal-price', this.formatPrice(subtotal));
        this.updateElementText('shipping-price', shipping === 0 ? 'FREE' : this.formatPrice(shipping));
        this.updateElementText('total-price', this.formatPrice(total));

        sessionStorage.setItem('checkoutData', JSON.stringify(this.checkoutData));
    }

    setupEventListeners() {
        // Payment method selection
        document.addEventListener('change', (e) => {
            if (e.target.name === 'payment') {
                this.selectedPaymentMethod = e.target.value;
                console.log('Payment method selected:', this.selectedPaymentMethod);
            }
        });

        // Place order button
        const placeOrderBtn = document.getElementById('place-order-btn');
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener('click', (e) => this.handlePlaceOrder(e));
        }

        // Form validation on blur
        const formInputs = document.querySelectorAll('input[required], select[required], textarea[required]');
        formInputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
        });

        // Real-time phone validation
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                this.formatPhoneNumber(e.target);
            });
        }
    }

    async handlePlaceOrder(e) {
        e.preventDefault();

        if (!this.validateForm()) {
            return;
        }

        const placeOrderBtn = document.getElementById('place-order-btn');
        const originalText = placeOrderBtn.innerHTML;
        
        // Show loading state
        placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
        placeOrderBtn.disabled = true;

        try {
            // Validasi stok
            const stockValidation = await this.validateStock();
            if (!stockValidation.valid) {
                this.showNotification(stockValidation.message, 'warning');
                this.updateCartWithCurrentStock();
                return;
            }

            // Simpan order ke database
            const orderResult = await this.saveOrderToDatabase();
            
            if (orderResult.success) {
                // Clear data
                if (window.SneakZoneApp && SneakZoneApp.CartService) {
                    SneakZoneApp.CartService.clearCart();
                }
                sessionStorage.removeItem('checkoutData');
                
                // Redirect ke thank you page
                this.showNotification('Order berhasil dibuat! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = `thankyou.html?order_number=${orderResult.orderNumber}`;
                }, 2000);
                
            } else {
                throw new Error(orderResult.message);
            }

        } catch (error) {
            console.error('Error placing order:', error);
            this.showNotification(`Gagal membuat order: ${error.message}`, 'error');
        } finally {
            // Restore button state
            placeOrderBtn.innerHTML = originalText;
            placeOrderBtn.disabled = false;
        }
    }

    validateForm() {
        let isValid = true;

        // Validate required fields
        const requiredFields = document.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Validate phone number format (Indonesia)
        const phoneField = document.getElementById('phone');
        if (phoneField && phoneField.value) {
            const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
            if (!phoneRegex.test(phoneField.value.replace(/\s/g, ''))) {
                this.showFieldError(phoneField, 'Format nomor WhatsApp Indonesia tidak valid');
                isValid = false;
            }
        }

        if (!this.selectedPaymentMethod) {
            this.showNotification('Please select a payment method', 'warning');
            isValid = false;
        }

        return isValid;
    }

    validateField(field) {
        const value = field.value.trim();
        const isValid = value !== '';

        if (isValid) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
        } else {
            field.classList.remove('is-valid');
            field.classList.add('is-invalid');
        }

        return isValid;
    }

    formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.startsWith('0')) {
            value = '62' + value.substring(1);
        } else if (!value.startsWith('62')) {
            value = '62' + value;
        }
        
        // Format: +62 812 3456 7890
        if (value.length > 2) {
            value = '+62 ' + value.substring(2);
        }
        if (value.length > 6) {
            value = value.substring(0, 6) + ' ' + value.substring(6);
        }
        if (value.length > 11) {
            value = value.substring(0, 11) + ' ' + value.substring(11);
        }
        
        input.value = value;
    }

    showFieldError(field, message) {
        // Remove existing error
        const existingError = field.parentNode.querySelector('.invalid-feedback');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }

    async validateStock() {
        try {
            if (!window.SneakZoneApp || !SneakZoneApp.ProductService) {
                return { valid: true, message: 'Stock validation skipped' };
            }

            const stockPromises = this.checkoutData.cart.map(async (item) => {
                const currentProduct = await SneakZoneApp.ProductService.getProductById(item.id);
                return {
                    item,
                    currentStock: currentProduct.stock,
                    isValid: currentProduct.stock >= item.quantity
                };
            });

            const stockResults = await Promise.all(stockPromises);
            const outOfStockItems = stockResults.filter(result => !result.isValid);

            if (outOfStockItems.length > 0) {
                const itemNames = outOfStockItems.map(item => item.item.name).join(', ');
                return {
                    valid: false,
                    message: `Maaf, stok untuk ${itemNames} tidak mencukupi`
                };
            }

            return { valid: true, message: 'Stok tersedia' };
        } catch (error) {
            console.error('Error validating stock:', error);
            return { valid: false, message: 'Error validasi stok' };
        }
    }

    async saveOrderToDatabase() {
        try {
            const formData = this.getFormData();

            const orderData = {
                customer_name: formData.fullName,
                customer_email: formData.email,
                customer_phone: formData.phone,
                billing_address: {
                    address: formData.address,
                    province: formData.province,
                    city: formData.city,
                    postalCode: formData.postalCode,
                    country: 'Indonesia'
                },
                shipping_address: this.getShippingAddress(),
                ship_to_different_address: document.getElementById('shipto')?.checked || false,
                items: this.checkoutData.cart,
                subtotal: this.checkoutData.subtotal,
                shipping_cost: this.checkoutData.shipping,
                discount_amount: this.checkoutData.discount,
                total_amount: this.checkoutData.total,
                payment_method: this.selectedPaymentMethod,
                payment_status: 'pending',
                order_status: 'pending'
            };

            console.log('Saving order to database:', orderData);

            const { data, error } = await supabase
                .from('orders')
                .insert([orderData])
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                orderId: data.id,
                orderNumber: data.order_number,
                message: 'Order berhasil dibuat'
            };

        } catch (error) {
            console.error('Error saving order:', error);
            return {
                success: false,
                message: error.message || 'Terjadi kesalahan saat menyimpan order'
            };
        }
    }

    getFormData() {
        return {
            fullName: document.getElementById('fullName')?.value || '',
            email: document.getElementById('email')?.value || '',
            phone: document.getElementById('phone')?.value || '',
            province: document.getElementById('province')?.value || '',
            city: document.getElementById('city')?.value || '',
            postalCode: document.getElementById('postalCode')?.value || '',
            address: document.getElementById('address')?.value || ''
        };
    }

    getShippingAddress() {
        const shipToDifferent = document.getElementById('shipto')?.checked;
        
        if (!shipToDifferent) {
            return this.getFormData();
        }

        return {
            name: document.getElementById('shipping-name')?.value || '',
            email: document.getElementById('shipping-email')?.value || '',
            phone: document.getElementById('shipping-phone')?.value || '',
            address: document.getElementById('shipping-address')?.value || ''
        };
    }

    // Helper methods
    formatPrice(price) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price);
    }

    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = text;
    }

    showNotification(message, type = 'info') {
        // Simple notification using alert for now
        alert(message);
    }

    showEmptyCheckout() {
        const checkoutContainer = document.querySelector('.container-fluid.pt-5');
        if (checkoutContainer) {
            checkoutContainer.innerHTML = `
                <div class="row justify-content-center">
                    <div class="col-md-6 text-center">
                        <div class="alert alert-warning">
                            <i class="fas fa-shopping-cart fa-3x mb-3"></i>
                            <h4>Keranjang Belanja Kosong</h4>
                            <p>Silakan tambahkan produk ke keranjang sebelum checkout.</p>
                            <a href="cart.html" class="btn btn-primary">Kembali ke Keranjang</a>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    calculateSubtotal() {
        return this.checkoutData.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    calculateShipping(subtotal) {
        return subtotal >= this.freeShippingThreshold ? 0 : this.shippingCost;
    }

    calculateDiscount(subtotal) {
        return this.checkoutData.discount || 0;
    }

    updateCartWithCurrentStock() {
        if (!window.SneakZoneApp || !SneakZoneApp.CartService) return;
        
        const currentCart = SneakZoneApp.CartService.getCart();
        this.checkoutData.cart.forEach(checkoutItem => {
            const cartItem = currentCart.find(item => item.id === checkoutItem.id);
            if (cartItem) {
                SneakZoneApp.CartService.updateQuantity(cartItem.id, checkoutItem.max_stock);
            }
        });
    }
}

// Initialize checkout page
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing Checkout...');
    
    setTimeout(() => {
        try {
            const checkoutPage = new CheckoutPage();
            checkoutPage.init();
            window.checkoutPage = checkoutPage;
        } catch (error) {
            console.error('Failed to initialize checkout page:', error);
        }
    }, 100);
});