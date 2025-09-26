// js/checkout.js - VERSI FIXED (FULL REPLACEMENT)
class CheckoutPage {
    constructor() {
        this.checkoutData = null;
        this.selectedPaymentMethod = null;
        this.shippingCost = 15000;
        this.freeShippingThreshold = 500000;
        
        this.provinces = [
           'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 
'Banten', 'Bali', 'Yogyakarta', 'Sumatera Utara', 
'Sulawesi Selatan', 'Kalimantan Timur'
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
        console.log('🔄 Checkout Page Initialized');
        
        // Cek apakah SneakZoneApp sudah loaded
        if (!window.SneakZoneApp) {
            console.error('❌ SneakZoneApp not loaded!');
            this.showNotification('Aplikasi belum siap. Silakan refresh halaman.', 'error');
            return;
        }
        
        console.log('✅ SneakZoneApp loaded:', !!window.SneakZoneApp.OrderService);
        
        // Update cart count
        if (window.SneakZoneApp && window.SneakZoneApp.CartService) {
            window.SneakZoneApp.CartService.updateCartCount();
        }
        
        this.loadCheckoutData();
        this.renderCheckout();
        this.setupEventListeners();
        this.setupProvinceOptions();
    }

    loadCheckoutData() {
        console.log('📦 Loading checkout data...');
        
        // Coba dari sessionStorage dulu
        const savedData = sessionStorage.getItem('checkoutData');
        
        if (savedData) {
            try {
                this.checkoutData = JSON.parse(savedData);
                console.log('✅ Checkout data loaded from sessionStorage');
                
                if (!this.checkoutData.cart || this.checkoutData.cart.length === 0) {
                    this.showEmptyCheckout();
                    return;
                }
            } catch (error) {
                console.error('❌ Error loading from sessionStorage:', error);
                sessionStorage.removeItem('checkoutData');
            }
        }
        
        // Fallback: Load dari cart
        if (window.SneakZoneApp && window.SneakZoneApp.CartService) {
            const cart = window.SneakZoneApp.CartService.getCart();
            if (cart.length === 0) {
                this.showEmptyCheckout();
                return;
            }
            
            this.checkoutData = this.createCheckoutDataFromCart(cart);
            sessionStorage.setItem('checkoutData', JSON.stringify(this.checkoutData));
            console.log('✅ Checkout data created from cart');
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
        console.log('🔄 Handle place order clicked');

        if (!this.validateForm()) {
            console.log('❌ Form validation failed');
            return;
        }

        const placeOrderBtn = document.getElementById('place-order-btn');
        const originalText = placeOrderBtn.innerHTML;
        
        // Show loading state
        placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
        placeOrderBtn.disabled = true;

        try {
            console.log('🔍 Starting order process...');
            
            // Validasi stok menggunakan OrderService baru
            const stockValidation = await this.validateStock();
            if (!stockValidation.valid) {
                console.log('❌ Stock validation failed:', stockValidation.message);
                this.showNotification(stockValidation.message, 'warning');
                this.updateCartWithCurrentStock();
                return;
            }
            console.log('✅ Stock validation passed');

            // Simpan order ke database menggunakan OrderService baru
            console.log('💾 Saving order to database...');
            const orderResult = await this.saveOrderToDatabase();
            console.log('📊 Order result:', orderResult);
            
                // order result
            if (orderResult.success) {
    console.log('✅ Order saved successfully!');
    
    // Clear data
    if (window.SneakZoneApp && window.SneakZoneApp.CartService) {
        window.SneakZoneApp.CartService.clearCart();
    }
    sessionStorage.removeItem('checkoutData');
    
    // Redirect ke thank you page
    this.showNotification('Order berhasil dibuat! Redirecting...', 'success');
    setTimeout(() => {
        window.location.href = `thankyou.html?order_number=${orderResult.orderNumber}&payment_method=${this.selectedPaymentMethod}&total=${this.checkoutData.total}`;
    }, 2000);
    
} else {
    console.error('❌ Order failed:', orderResult.message);
    throw new Error(orderResult.message);
}

        } catch (error) {
            console.error('💥 Error placing order:', error);
            this.showNotification(`Gagal membuat order: ${error.message}`, 'error');
        } finally {
            // Restore button state
            placeOrderBtn.innerHTML = originalText;
            placeOrderBtn.disabled = false;
        }
    }

   validateForm() {
    console.log('🔍 === FORM VALIDATION START ===');
    
    let isValid = true;

    // Hanya validate field yang VISIBLE dan required
    const allRequiredFields = document.querySelectorAll('[required]');
    console.log('All required fields:', allRequiredFields.length);
    
    // Filter hanya field yang visible (tidak di collapse hidden)
    const visibleRequiredFields = Array.from(allRequiredFields).filter(field => {
        // Cek jika field ada di section yang collapsed
        const shippingSection = document.getElementById('shipping-address');
        const isInHiddenSection = shippingSection && !shippingSection.classList.contains('show') && 
                                 shippingSection.contains(field);
        
        return !isInHiddenSection; // Hanya field yang tidak di section hidden
    });
    
    console.log('Visible required fields:', visibleRequiredFields.length);
    
    visibleRequiredFields.forEach((field, index) => {
        const value = field.value.trim();
        const fieldValid = value !== '';
        console.log(`Field ${index + 1} (${field.id}): "${value}" -> ${fieldValid ? 'VALID' : 'INVALID'}`);
        
        if (!fieldValid) {
            field.classList.remove('is-valid');
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
        }
    });

    // Validate phone number format
    const phoneField = document.getElementById('phone');
    if (phoneField && phoneField.value) {
        const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
        const phoneValid = phoneRegex.test(phoneField.value.replace(/\s/g, ''));
        console.log('Phone validation:', phoneValid, 'Value:', phoneField.value);
        if (!phoneValid) {
            this.showFieldError(phoneField, 'Format nomor WhatsApp Indonesia tidak valid');
            isValid = false;
        }
    }

    // Check payment method
    console.log('Payment method selected:', this.selectedPaymentMethod);
    if (!this.selectedPaymentMethod) {
        console.log('❌ No payment method selected');
        this.showNotification('Please select a payment method', 'warning');
        isValid = false;
    } else {
        console.log('✅ Payment method:', this.selectedPaymentMethod);
    }

    console.log('🔍 === FORM VALIDATION RESULT:', isValid, '===');
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
            console.log('🔍 Validating stock...');
            
            if (!window.SneakZoneApp || !window.SneakZoneApp.OrderService) {
                console.log('⚠️ OrderService not available, skipping stock validation');
                return { valid: true, message: 'Stock validation skipped' };
            }

            // Gunakan OrderService untuk validasi stok
            const validation = await window.SneakZoneApp.OrderService.validateStock(this.checkoutData.cart);
            console.log('📊 Stock validation result:', validation);
            
            if (!validation.valid && validation.outOfStockItems) {
                const itemNames = validation.outOfStockItems.map(item => item.name).join(', ');
                return {
                    valid: false,
                    message: `Maaf, stok untuk ${itemNames} tidak mencukupi`
                };
            }
            
            return validation;
            
        } catch (error) {
            console.error('❌ Stock validation error:', error);
            return { valid: false, message: 'Error validasi stok' };
        }
    }

    async saveOrderToDatabase() {
    try {
        console.log('💾 Saving order to database...');
        
        if (!window.SneakZoneApp || !window.SneakZoneApp.OrderService) {
            throw new Error('OrderService not available');
        }

        const formData = this.getFormData();
        console.log('📋 Form data:', formData);

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

            items: this.checkoutData.cart,
            subtotal: this.checkoutData.subtotal,
            shipping_cost: this.checkoutData.shipping,
            discount_amount: this.checkoutData.discount,
            total_amount: this.checkoutData.total,
            payment_method: this.selectedPaymentMethod,
            payment_status: 'pending',
            order_status: 'pending'
        };

        console.log('📦 Order data to save:', orderData);

        // GUNAKAN ORDER SERVICE YANG BARU
        const result = await window.SneakZoneApp.OrderService.createOrder(orderData);
        console.log('📊 Order creation result:', result);

        if (result.success) {
            return {
                success: true,
                orderId: result.data.id,
                orderNumber: result.data.order_number,
                message: 'Order berhasil dibuat'
            };
        } else {
            throw new Error(result.error || 'Unknown error');
        }

    } catch (error) {
        console.error('💥 Error saving order:', error);
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
        if (window.SneakZoneApp && window.SneakZoneApp.Utils) {
            window.SneakZoneApp.Utils.showNotification(message, type);
        } else {
            // Fallback simple notification
            alert(message);
        }
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
        if (!window.SneakZoneApp || !window.SneakZoneApp.CartService) return;
        
        const currentCart = window.SneakZoneApp.CartService.getCart();
        this.checkoutData.cart.forEach(checkoutItem => {
            const cartItem = currentCart.find(item => item.id === checkoutItem.id);
            if (cartItem) {
                window.SneakZoneApp.CartService.updateQuantity(cartItem.id, checkoutItem.max_stock);
            }
        });
    }
}

// Initialize checkout page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏁 DOM Content Loaded - Initializing Checkout...');
    
    // Tunggu sedikit untuk pastikan SneakZoneApp sudah loaded
    setTimeout(() => {
        try {
            if (!window.SneakZoneApp) {
                console.error('❌ SneakZoneApp not found!');
                return;
            }
            
            console.log('✅ SneakZoneApp found, initializing checkout...');
            const checkoutPage = new CheckoutPage();
            checkoutPage.init();
            window.checkoutPage = checkoutPage;
            console.log('🎉 Checkout page initialized successfully!');
        } catch (error) {
            console.error('💥 Failed to initialize checkout page:', error);
        }
    }, 500);
});