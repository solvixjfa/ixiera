// js/supabase-config.js - Konfigurasi Supabase
const SUPABASE_URL = 'https://armthhnachqtropqlegl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybXRoaG5hY2hxdHJvcHFsZWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MDI4NDksImV4cCI6MjA3NDI3ODg0OX0.mSNqVDB4qPu9ZVHJPKW_88k9iM4ibwYZmUzYnRRpUy0';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Product Management Functions
const ProductService = {
    async getAllProducts() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    },

    async getFeaturedProducts(limit = 8) {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('is_featured', true)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching featured products:', error);
            return [];
        }
    },

    async getNewArrivals(limit = 8) {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('is_new_arrival', true)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching new arrivals:', error);
            return [];
        }
    },

    async getProductsByCategory(category, limit = 12) {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('category', category)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching products by category:', error);
            return [];
        }
    },

    async getProductById(id) {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching product:', error);
            return null;
        }
    },

    async searchProducts(query, limit = 12) {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .textSearch('name', query)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    },

    // NEW FUNCTION FOR SHOP PAGE - Advanced filtering
    async getProductsWithFilters(filters = {}) {
        try {
            let query = supabase.from('products').select('*', { count: 'exact' });
            
            // Category filter
            if (filters.categories && filters.categories.length > 0) {
                query = query.in('category', filters.categories);
            }
            
            // Brand filter
            if (filters.brands && filters.brands.length > 0) {
                query = query.in('brand', filters.brands);
            }
            
            // Price range filter
            if (filters.minPrice) {
                query = query.gte('price', parseInt(filters.minPrice));
            }
            if (filters.maxPrice) {
                query = query.lte('price', parseInt(filters.maxPrice));
            }
            
            // Search filter
            if (filters.searchQuery) {
                query = query.or(`name.ilike.%${filters.searchQuery}%,brand.ilike.%${filters.searchQuery}%`);
            }
            
            // Featured filter
            if (filters.featuredOnly) {
                query = query.eq('is_featured', true);
            }
            
            // New arrivals filter
            if (filters.newArrivalsOnly) {
                query = query.eq('is_new_arrival', true);
            }
            
            // Stock filter
            if (filters.inStockOnly) {
                query = query.gt('stock', 0);
            }
            
            // Sorting
            if (filters.sort === 'price_asc') {
                query = query.order('price', { ascending: true });
            } else if (filters.sort === 'price_desc') {
                query = query.order('price', { ascending: false });
            } else if (filters.sort === 'name') {
                query = query.order('name', { ascending: true });
            } else if (filters.sort === 'popular') {
                query = query.order('is_featured', { ascending: false });
            } else {
                // Default: newest first
                query = query.order('created_at', { ascending: false });
            }
            
            // Pagination
            if (filters.limit) {
                query = query.limit(filters.limit);
            }
            if (filters.offset) {
                query = query.range(filters.offset, filters.offset + (filters.limit || 12) - 1);
            }
            
            const { data, error, count } = await query;
            
            if (error) throw error;
            return { data, count: count || 0 };
        } catch (error) {
            console.error('Error fetching products with filters:', error);
            return { data: [], count: 0 };
        }
    },

    // NEW FUNCTION - Get unique categories and brands for filters
    async getFilterOptions() {
        try {
            const { data: categories, error: catError } = await supabase
                .from('products')
                .select('category')
                .not('category', 'is', null);
            
            const { data: brands, error: brandError } = await supabase
                .from('products')
                .select('brand')
                .not('brand', 'is', null);
            
            if (catError || brandError) throw catError || brandError;
            
            const uniqueCategories = [...new Set(categories.map(item => item.category))].sort();
            const uniqueBrands = [...new Set(brands.map(item => item.brand))].sort();
            
            return {
                categories: uniqueCategories,
                brands: uniqueBrands
            };
        } catch (error) {
            console.error('Error fetching filter options:', error);
            return { categories: [], brands: [] };
        }
    },

    // NEW FUNCTION - Get price range for filters
    async getPriceRange() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('price')
                .order('price', { ascending: true });
            
            if (error) throw error;
            
            if (data.length === 0) {
                return { min: 0, max: 0 };
            }
            
            const prices = data.map(item => item.price);
            return {
                min: Math.min(...prices),
                max: Math.max(...prices)
            };
        } catch (error) {
            console.error('Error fetching price range:', error);
            return { min: 0, max: 0 };
        }
    }
};

// Cart Management Functions
const CartService = {
    getCart() {
        const cart = localStorage.getItem('sneakzone_cart');
        return cart ? JSON.parse(cart) : [];
    },

    addToCart(product, quantity = 1, size = null, color = null) {
        const cart = this.getCart();
        const existingItem = cart.find(item => 
            item.id === product.id && item.size === size && item.color === color
        );

        if (existingItem) {
            existingItem.quantity += quantity;
            // Update stock validation
            if (existingItem.quantity > existingItem.max_stock) {
                existingItem.quantity = existingItem.max_stock;
            }
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                quantity: Math.min(quantity, product.stock), // Ensure doesn't exceed stock
                size: size,
                color: color,
                max_stock: product.stock
            });
        }

        localStorage.setItem('sneakzone_cart', JSON.stringify(cart));
        this.updateCartCount();
        return cart;
    },

    removeFromCart(productId, size = null, color = null) {
        let cart = this.getCart();
        cart = cart.filter(item => 
            !(item.id === productId && item.size === size && item.color === color)
        );
        
        localStorage.setItem('sneakzone_cart', JSON.stringify(cart));
        this.updateCartCount();
        return cart;
    },

    updateQuantity(productId, quantity, size = null, color = null) {
        const cart = this.getCart();
        const item = cart.find(item => 
            item.id === productId && item.size === size && item.color === color
        );

        if (item) {
            item.quantity = Math.max(1, Math.min(quantity, item.max_stock));
            localStorage.setItem('sneakzone_cart', JSON.stringify(cart));
            this.updateCartCount();
        }

        return cart;
    },

    clearCart() {
        localStorage.removeItem('sneakzone_cart');
        this.updateCartCount();
    },

    getCartCount() {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + item.quantity, 0);
    },

    updateCartCount() {
        const count = this.getCartCount();
        const cartElements = document.querySelectorAll('#cart-count');
        cartElements.forEach(element => {
            element.textContent = count;
        });
    },

    getCartTotal() {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    // NEW FUNCTION - Check if product is in cart
    isInCart(productId, size = null, color = null) {
        const cart = this.getCart();
        return cart.some(item => 
            item.id === productId && item.size === size && item.color === color
        );
    },

    // NEW FUNCTION - Get cart item quantity
    getCartItemQuantity(productId, size = null, color = null) {
        const cart = this.getCart();
        const item = cart.find(item => 
            item.id === productId && item.size === size && item.color === color
        );
        return item ? item.quantity : 0;
    }
};

// Wishlist Management Functions
const WishlistService = {
    getWishlist() {
        const wishlist = localStorage.getItem('sneakzone_wishlist');
        return wishlist ? JSON.parse(wishlist) : [];
    },

    addToWishlist(product) {
        const wishlist = this.getWishlist();
        
        if (!wishlist.find(item => item.id === product.id)) {
            wishlist.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                brand: product.brand,
                category: product.category,
                added_at: new Date().toISOString()
            });
            
            localStorage.setItem('sneakzone_wishlist', JSON.stringify(wishlist));
            this.updateWishlistCount();
        }
        
        return wishlist;
    },

    removeFromWishlist(productId) {
        let wishlist = this.getWishlist();
        wishlist = wishlist.filter(item => item.id !== productId);
        
        localStorage.setItem('sneakzone_wishlist', JSON.stringify(wishlist));
        this.updateWishlistCount();
        return wishlist;
    },

    isInWishlist(productId) {
        const wishlist = this.getWishlist();
        return wishlist.some(item => item.id === productId);
    },

    updateWishlistCount() {
        const count = this.getWishlist().length;
        const wishlistElements = document.querySelectorAll('#wishlist-count');
        wishlistElements.forEach(element => {
            element.textContent = count;
        });
    },

    // NEW FUNCTION - Get wishlist products with details
    async getWishlistProducts() {
        const wishlist = this.getWishlist();
        if (wishlist.length === 0) return [];
        
        const productIds = wishlist.map(item => item.id);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .in('id', productIds);
            
            if (error) throw error;
            
            // Merge with wishlist data to preserve added_at
            return wishlist.map(wishlistItem => {
                const product = data.find(p => p.id === wishlistItem.id);
                return { ...wishlistItem, ...product };
            });
        } catch (error) {
            console.error('Error fetching wishlist products:', error);
            return wishlist; // Return basic wishlist data if error
        }
    }
};

// Newsletter Service
const NewsletterService = {
    async subscribe(email) {
        try {
            const { error } = await supabase
                .from('newsletter')
                .insert([{ 
                    email: email.toLowerCase().trim(), 
                    subscribed_at: new Date().toISOString(),
                    is_active: true
                }]);
            
            if (error) throw error;
            return { success: true, message: 'Berhasil berlangganan newsletter!' };
        } catch (error) {
            console.error('Error subscribing to newsletter:', error);
            return { 
                success: false, 
                message: error.code === '23505' 
                    ? 'Email sudah terdaftar dalam newsletter kami.' 
                    : 'Terjadi error. Silakan coba lagi.' 
            };
        }
    },

    // NEW FUNCTION - Check if email is already subscribed
    async checkSubscription(email) {
        try {
            const { data, error } = await supabase
                .from('newsletter')
                .select('email')
                .eq('email', email.toLowerCase().trim())
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
            
            return { isSubscribed: !!data };
        } catch (error) {
            console.error('Error checking subscription:', error);
            return { isSubscribed: false };
        }
    }
};

// Utility Functions
const Utils = {
    formatPrice(price) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price);
    },

    formatNumber(number) {
        return new Intl.NumberFormat('id-ID').format(number);
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    showNotification(message, type = 'success') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.sneakzone-notification');
        existingNotifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `sneakzone-notification alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; max-width: 400px;';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : type === 'danger' ? 'fa-times-circle' : 'fa-info-circle'} mr-2"></i>
                <span>${message}</span>
                <button type="button" class="close ml-auto" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // Add click to dismiss
        notification.addEventListener('click', (e) => {
            if (e.target.closest('.close') || e.target === notification) {
                notification.remove();
            }
        });
    },

    // NEW FUNCTION - Format date
    formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'Asia/Jakarta'
        };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    },

    // NEW FUNCTION - Validate email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // NEW FUNCTION - Scroll to element
    scrollToElement(elementId, offset = 100) {
        const element = document.getElementById(elementId);
        if (element) {
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    },

    // NEW FUNCTION - Generate product slug
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^\w ]+/g, '')
            .replace(/ +/g, '-');
    }
};

// NEW - Analytics Service (Basic)
const AnalyticsService = {
    trackProductView(productId) {
        const views = JSON.parse(localStorage.getItem('product_views') || '{}');
        views[productId] = (views[productId] || 0) + 1;
        localStorage.setItem('product_views', JSON.stringify(views));
    },

    trackAddToCart(productId) {
        const events = JSON.parse(localStorage.getItem('cart_events') || '[]');
        events.push({
            productId,
            timestamp: new Date().toISOString(),
            action: 'add_to_cart'
        });
        localStorage.setItem('cart_events', JSON.stringify(events));
    },

    getPopularProducts(limit = 5) {
        const views = JSON.parse(localStorage.getItem('product_views') || '{}');
        return Object.entries(views)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([productId]) => productId);
    }
};

// Export for use in other files
window.SneakZoneApp = {
    supabase,
    ProductService,
    CartService,
    WishlistService,
    NewsletterService,
    AnalyticsService,
    Utils
};

// Initialize when loaded
document.addEventListener('DOMContentLoaded', function() {
    // Update cart and wishlist counts on every page load
    SneakZoneApp.CartService.updateCartCount();
    SneakZoneApp.WishlistService.updateWishlistCount();
    
    console.log('SneakZone App Initialized');
});