// js/shop.js - Specialist untuk halaman shop
class ShopPage {
    constructor() {
        this.filters = {
            categories: [],
            brands: [],
            minPrice: null,
            maxPrice: null,
            searchQuery: '',
            sort: 'newest'
        };
        
        this.pagination = {
            currentPage: 1,
            productsPerPage: 12,
            totalProducts: 0,
            totalPages: 0
        };
        
        this.allProducts = [];
        this.filteredProducts = [];
    }

    async init() {
        console.log('Shop Page Initialized');
        
        // Update cart & wishlist counts
        SneakZoneApp.CartService.updateCartCount();
        SneakZoneApp.WishlistService.updateWishlistCount();
        
        // Load initial data
        await this.loadAllProducts();
        await this.loadFiltersData();
        this.setupEventListeners();
        
        // Process URL parameters
        this.processURLParameters();
        
        // Apply initial filters
        await this.applyFilters();
    }

    async loadAllProducts() {
        try {
            this.showLoadingState();
            this.allProducts = await SneakZoneApp.ProductService.getAllProducts();
            this.totalProducts = this.allProducts.length;
            this.calculateTotalPages();
        } catch (error) {
            console.error('Error loading products:', error);
            this.showErrorState('Gagal memuat produk. Silakan refresh halaman.');
        }
    }

    async loadFiltersData() {
        // Extract unique categories and brands from products
        const categories = [...new Set(this.allProducts.map(p => p.category))].sort();
        const brands = [...new Set(this.allProducts.map(p => p.brand))].sort();
        
        this.renderCategoryFilters(categories);
        this.renderBrandFilters(brands);
    }

    renderCategoryFilters(categories) {
        const container = document.getElementById('category-filters');
        if (!container) return;

        container.innerHTML = `
            <div class="custom-control custom-checkbox d-flex align-items-center justify-content-between mb-3">
                <input type="checkbox" class="custom-control-input" id="category-all" checked>
                <label class="custom-control-label" for="category-all">Semua Kategori</label>
                <span class="badge border font-weight-normal">${this.totalProducts}</span>
            </div>
            ${categories.map(category => {
                const count = this.allProducts.filter(p => p.category === category).length;
                return `
                    <div class="custom-control custom-checkbox d-flex align-items-center justify-content-between mb-3">
                        <input type="checkbox" class="custom-control-input category-filter" 
                               id="category-${category.replace(/\s+/g, '-')}" 
                               value="${category}">
                        <label class="custom-control-label" for="category-${category.replace(/\s+/g, '-')}">${category}</label>
                        <span class="badge border font-weight-normal">${count}</span>
                    </div>
                `;
            }).join('')}
        `;
    }

    renderBrandFilters(brands) {
        const container = document.getElementById('brand-filters');
        if (!container) return;

        container.innerHTML = `
            <div class="custom-control custom-checkbox d-flex align-items-center justify-content-between mb-3">
                <input type="checkbox" class="custom-control-input" id="brand-all" checked>
                <label class="custom-control-label" for="brand-all">Semua Brand</label>
                <span class="badge border font-weight-normal">${this.totalProducts}</span>
            </div>
            ${brands.map(brand => {
                const count = this.allProducts.filter(p => p.brand === brand).length;
                return `
                    <div class="custom-control custom-checkbox d-flex align-items-center justify-content-between mb-3">
                        <input type="checkbox" class="custom-control-input brand-filter" 
                               id="brand-${brand.replace(/\s+/g, '-')}" 
                               value="${brand}">
                        <label class="custom-control-label" for="brand-${brand.replace(/\s+/g, '-')}">${brand}</label>
                        <span class="badge border font-weight-normal">${count}</span>
                    </div>
                `;
            }).join('')}
        `;
    }

    setupEventListeners() {
        // Category filters
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('category-filter')) {
                this.handleCategoryFilter(e.target);
            }
            if (e.target.id === 'category-all') {
                this.handleSelectAll('category');
            }
        });

        // Brand filters
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('brand-filter')) {
                this.handleBrandFilter(e.target);
            }
            if (e.target.id === 'brand-all') {
                this.handleSelectAll('brand');
            }
        });

        // Price filter
        document.getElementById('apply-price-filter').addEventListener('click', () => {
            this.handlePriceFilter();
        });

        // Search
        document.getElementById('search-input').addEventListener('input', 
            SneakZoneApp.Utils.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300)
        );

        // Sort
        document.querySelectorAll('.sort-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSort(e.target.getAttribute('data-sort'));
            });
        });

        // Clear filters
        document.getElementById('clear-filters').addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Reset search
        document.getElementById('reset-search').addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Add to cart & wishlist (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart')) {
                this.handleAddToCart(e);
            }
            if (e.target.closest('.add-to-wishlist')) {
                this.handleAddToWishlist(e);
            }
        });
    }

    handleCategoryFilter(checkbox) {
        if (checkbox.checked) {
            this.filters.categories.push(checkbox.value);
        } else {
            this.filters.categories = this.filters.categories.filter(c => c !== checkbox.value);
        }
        this.updateSelectAllCheckbox('category');
        this.applyFilters();
    }

    handleBrandFilter(checkbox) {
        if (checkbox.checked) {
            this.filters.brands.push(checkbox.value);
        } else {
            this.filters.brands = this.filters.brands.filter(b => b !== checkbox.value);
        }
        this.updateSelectAllCheckbox('brand');
        this.applyFilters();
    }

    handlePriceFilter() {
        const minPrice = document.getElementById('min-price').value;
        const maxPrice = document.getElementById('max-price').value;
        
        this.filters.minPrice = minPrice ? parseInt(minPrice) : null;
        this.filters.maxPrice = maxPrice ? parseInt(maxPrice) : null;
        
        this.applyFilters();
    }

    handleSearch(query) {
        this.filters.searchQuery = query.trim();
        this.pagination.currentPage = 1; // Reset to first page on search
        this.applyFilters();
    }

    handleSort(sortType) {
        this.filters.sort = sortType;
        this.applyFilters();
        
        // Update dropdown text
        const dropdownBtn = document.getElementById('sort-dropdown');
        const sortText = {
            'newest': 'Terbaru',
            'price_asc': 'Harga Terendah', 
            'price_desc': 'Harga Tertinggi',
            'name': 'Nama A-Z'
        }[sortType];
        
        dropdownBtn.textContent = `Urutkan: ${sortText}`;
    }

    async applyFilters() {
        try {
            this.showLoadingState();
            
            // Filter products
            this.filteredProducts = this.allProducts.filter(product => {
                // Category filter
                if (this.filters.categories.length > 0 && 
                    !this.filters.categories.includes(product.category)) {
                    return false;
                }
                
                // Brand filter
                if (this.filters.brands.length > 0 && 
                    !this.filters.brands.includes(product.brand)) {
                    return false;
                }
                
                // Price filter
                if (this.filters.minPrice !== null && product.price < this.filters.minPrice) {
                    return false;
                }
                if (this.filters.maxPrice !== null && product.price > this.filters.maxPrice) {
                    return false;
                }
                
                // Search filter
                if (this.filters.searchQuery && 
                    !product.name.toLowerCase().includes(this.filters.searchQuery.toLowerCase()) &&
                    !product.brand.toLowerCase().includes(this.filters.searchQuery.toLowerCase())) {
                    return false;
                }
                
                return true;
            });
            
            // Sort products
            this.sortProducts();
            
            // Update pagination
            this.totalProducts = this.filteredProducts.length;
            this.calculateTotalPages();
            
            // Render results
            this.renderProducts();
            this.renderPagination();
            this.updateURL();
            
        } catch (error) {
            console.error('Error applying filters:', error);
            this.showErrorState('Gagal menerapkan filter.');
        }
    }

    sortProducts() {
        switch (this.filters.sort) {
            case 'price_asc':
                this.filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                this.filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'name':
                this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'newest':
            default:
                this.filteredProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
        }
    }

    renderProducts() {
        const container = document.getElementById('products-grid');
        const loading = document.getElementById('loading-state');
        const empty = document.getElementById('empty-state');
        
        if (!container) return;
        
        // Hide loading
        loading.classList.add('d-none');
        
        if (this.filteredProducts.length === 0) {
            // Show empty state
            empty.classList.remove('d-none');
            container.innerHTML = '';
            return;
        }
        
        // Hide empty state
        empty.classList.add('d-none');
        
        // Calculate products to show for current page
        const startIndex = (this.pagination.currentPage - 1) * this.pagination.productsPerPage;
        const endIndex = startIndex + this.pagination.productsPerPage;
        const productsToShow = this.filteredProducts.slice(startIndex, endIndex);
        
        // Render products
        container.innerHTML = productsToShow.map(product => `
            <div class="col-lg-4 col-md-6 col-sm-12 pb-1">
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
                            <button class="btn btn-sm text-dark p-0 mr-2 add-to-wishlist" 
                                    data-product-id="${product.id}"
                                    title="${SneakZoneApp.WishlistService.isInWishlist(product.id) ? 'Hapus dari wishlist' : 'Tambahkan ke wishlist'}">
                                <i class="fas fa-heart ${SneakZoneApp.WishlistService.isInWishlist(product.id) ? 'text-danger' : 'text-secondary'}"></i>
                            </button>
                            <button class="btn btn-sm text-dark p-0 add-to-cart" 
                                    data-product-id="${product.id}"
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

    renderPagination() {
        const container = document.getElementById('pagination-container');
        if (!container || this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <ul class="pagination justify-content-center mb-3">
                <li class="page-item ${this.pagination.currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${this.pagination.currentPage - 1}">
                        <span aria-hidden="true">&laquo;</span>
                    </a>
                </li>
                
                ${Array.from({length: this.totalPages}, (_, i) => i + 1).map(page => `
                    <li class="page-item ${page === this.pagination.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${page}">${page}</a>
                    </li>
                `).join('')}
                
                <li class="page-item ${this.pagination.currentPage === this.totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${this.pagination.currentPage + 1}">
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            </ul>
        `;

        // Add pagination event listeners
        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.getAttribute('data-page'));
                if (page && page !== this.pagination.currentPage) {
                    this.pagination.currentPage = page;
                    this.applyFilters();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    calculateTotalPages() {
        this.totalPages = Math.ceil(this.totalProducts / this.pagination.productsPerPage);
        if (this.pagination.currentPage > this.totalPages) {
            this.pagination.currentPage = 1;
        }
    }

    processURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Category
        const category = urlParams.get('category');
        if (category) {
            this.filters.categories = [category];
            this.updateFilterCheckboxes('category', category);
        }
        
        // Search
        const search = urlParams.get('search');
        if (search) {
            this.filters.searchQuery = search;
            document.getElementById('search-input').value = search;
        }
    }

    updateURL() {
        const params = new URLSearchParams();
        
        if (this.filters.categories.length === 1) {
            params.set('category', this.filters.categories[0]);
        }
        
        if (this.filters.searchQuery) {
            params.set('search', this.filters.searchQuery);
        }
        
        if (this.pagination.currentPage > 1) {
            params.set('page', this.pagination.currentPage);
        }
        
        const newURL = params.toString() ? `shop.html?${params.toString()}` : 'shop.html';
        window.history.replaceState({}, '', newURL);
    }

    handleSelectAll(type) {
        const checkboxes = document.querySelectorAll(`.${type}-filter`);
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.filters[`${type}s`] = [];
        this.applyFilters();
    }

    updateSelectAllCheckbox(type) {
        const allCheckbox = document.getElementById(`${type}-all`);
        const checkboxes = document.querySelectorAll(`.${type}-filter`);
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        
        allCheckbox.checked = checkedCount === 0;
    }

    updateFilterCheckboxes(type, value) {
        const checkbox = document.querySelector(`.${type}-filter[value="${value}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    }

    clearAllFilters() {
        // Reset filters
        this.filters = {
            categories: [],
            brands: [],
            minPrice: null,
            maxPrice: null,
            searchQuery: '',
            sort: 'newest'
        };
        
        this.pagination.currentPage = 1;
        
        // Reset UI
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (cb.id.includes('all')) {
                cb.checked = true;
            } else {
                cb.checked = false;
            }
        });
        
        document.getElementById('min-price').value = '';
        document.getElementById('max-price').value = '';
        document.getElementById('search-input').value = '';
        
        // Reset URL
        window.history.replaceState({}, '', 'shop.html');
        
        // Reapply filters
        this.applyFilters();
    }

    handleAddToCart(e) {
        const button = e.target.closest('.add-to-cart');
        if (!button.disabled) {
            const productId = button.getAttribute('data-product-id');
            const product = this.allProducts.find(p => p.id === productId);
            
            if (product) {
                SneakZoneApp.CartService.addToCart(product, 1);
                SneakZoneApp.Utils.showNotification(
                    `<strong>${product.name}</strong> berhasil ditambahkan ke keranjang!`, 
                    'success'
                );
            }
        }
    }

    handleAddToWishlist(e) {
        const button = e.target.closest('.add-to-wishlist');
        const productId = button.getAttribute('data-product-id');
        const product = this.allProducts.find(p => p.id === productId);
        
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
            const heartIcon = button.querySelector('.fa-heart');
            if (heartIcon) {
                heartIcon.classList.toggle('text-danger', SneakZoneApp.WishlistService.isInWishlist(productId));
                heartIcon.classList.toggle('text-secondary', !SneakZoneApp.WishlistService.isInWishlist(productId));
            }
        }
    }

    showLoadingState() {
        document.getElementById('loading-state').classList.remove('d-none');
        document.getElementById('empty-state').classList.add('d-none');
    }

    showErrorState(message) {
        const container = document.getElementById('products-grid');
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h5 class="text-warning">Terjadi Kesalahan</h5>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Coba Lagi</button>
            </div>
        `;
    }
}

// Initialize shop page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const shopPage = new ShopPage();
    shopPage.init();
    
    // Make available globally for debugging
    window.shopPage = shopPage;
});