/*
================================================================================
| JAVASCRIPT LOGIC FOR ORDER HISTORY PAGE                                      |
| Description: Fetches and displays user's order history with multiple views,  |
|              filtering, and search functionality.                            |
================================================================================
*/

document.addEventListener('supabase-ready', async () => {

    // --- DOM Element Selection ---
    const timelineContainer = document.getElementById('ordersTimeline');
    const gridContent = document.getElementById('ordersGridContent');
    const gridContainer = document.getElementById('ordersGrid');
    const totalOrdersEl = document.getElementById('totalOrders');
    const totalSpentEl = document.getElementById('totalSpent');
    const searchInput = document.getElementById('searchOrders');
    const statusFilter = document.getElementById('statusFilter');
    const periodFilter = document.getElementById('periodFilter');
    const timelineViewBtn = document.getElementById('timelineView');
    const gridViewBtn = document.getElementById('gridView');

    let allOrders = []; // Cache to store all fetched orders
    let currentView = 'timeline'; // Default view

    /**
     * Consistent function to get progress details based on status
     */
    function getProgressDetails(status) {
        const s = status ? status.toLowerCase() : 'new';
        const details = {
            'new': { icon: 'fa-star', color: '#6c757d' },
            'design': { icon: 'fa-pencil-ruler', color: '#0d6efd' },
            'development': { icon: 'fa-code', color: '#ffc107' },
            'review': { icon: 'fa-search', color: '#0dcaf0' },
            'completed': { icon: 'fa-check-circle', color: '#198754' }
        };
        return details[s] || { icon: 'fa-question-circle', color: '#6c757d' };
    }

    /**
     * Fetches all orders for the current user from Supabase
     */
    async function fetchOrders() {
        try {
            const user = await window.getCurrentUser();
            if (!user) throw new Error("Authentication error. Please log in again.");

            const { data, error } = await window.dbClient
                .from('leads_solvixone')
                .select(`id, created_at, status, product:products(name, price, image_path)`)
                .eq('client_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            allOrders = data;
            applyFilters(); // Initial render with all orders
            updateStats(allOrders);

        } catch (error) {
            console.error("Error fetching orders:", error);
            timelineContainer.innerHTML = `<div class="alert alert-danger">Failed to load order history.</div>`;
        }
    }

    /**
     * Renders orders in the Timeline view
     */
    function renderTimeline(orders) {
        if (orders.length === 0) {
            timelineContainer.innerHTML = `<div class="alert alert-info text-center">No orders found matching your criteria.</div>`;
            return;
        }
        timelineContainer.innerHTML = orders.map(order => {
            const { icon, color } = getProgressDetails(order.status);
            const orderDate = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            return `
                <div class="timeline-item">
                    <div class="timeline-icon-status" style="border-color: ${color};"><i class="fas ${icon}" style="color: ${color};"></i></div>
                    <div class="timeline-content">
                        <div class="product-info">
                            <img src="${window.dbClient.storage.from('product_images').getPublicUrl(order.product.image_path).data.publicUrl}" class="product-image-sm" alt="${order.product.name}">
                            <div>
                                <span class="product-name">${order.product.name}</span>
                                <span class="product-date">${orderDate}</span>
                            </div>
                        </div>
                        <span class="status-badge status-${order.status}">${order.status}</span>
                        <span class="timeline-price">$${order.product.price.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Renders orders in the Grid view
     */
    function renderGrid(orders) {
        if (orders.length === 0) {
            gridContent.innerHTML = `<div class="col-12"><div class="alert alert-info text-center">No orders found matching your criteria.</div></div>`;
            return;
        }
        gridContent.innerHTML = orders.map(order => {
            const { progress } = getProgressDetails(order.status); // Assuming progress details exist
            return `
                <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                    <div class="order-grid-card">
                        <img src="${window.dbClient.storage.from('product_images').getPublicUrl(order.product.image_path).data.publicUrl}" class="grid-product-image" alt="${order.product.name}">
                        <h6 class="grid-product-name">${order.product.name}</h6>
                        <p class="grid-order-id">#${order.id.substring(0, 8)}</p>
                        <div class="grid-progress">
                            <div class="progress"><div class="progress-bar bg-primary" role="progressbar" style="width: 50%;" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Updates the summary statistics
     */
    function updateStats(orders) {
        totalOrdersEl.textContent = orders.length;
        const totalValue = orders.reduce((sum, order) => sum + (order.product ? order.product.price : 0), 0);
        totalSpentEl.textContent = `$${totalValue.toFixed(2)}`;
    }

    /**
     * Applies all active filters and re-renders the current view
     */
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedStatus = statusFilter.value;
        const selectedPeriod = periodFilter.value;

        let filteredOrders = allOrders.filter(order => {
            const matchesSearch = !searchTerm || (order.product && order.product.name.toLowerCase().includes(searchTerm)) || order.status.toLowerCase().includes(searchTerm);
            const matchesStatus = !selectedStatus || order.status === selectedStatus;
            
            let matchesPeriod = true;
            if (selectedPeriod) {
                const orderDate = new Date(order.created_at);
                const periodDate = new Date();
                periodDate.setDate(periodDate.getDate() - parseInt(selectedPeriod));
                matchesPeriod = orderDate >= periodDate;
            }
            return matchesSearch && matchesStatus && matchesPeriod;
        });

        if (currentView === 'timeline') {
            renderTimeline(filteredOrders);
        } else {
            renderGrid(filteredOrders);
        }
    }
    
    /**
     * Toggles between Timeline and Grid view
     */
    function toggleView(view) {
        currentView = view;
        if (view === 'timeline') {
            timelineContainer.style.display = 'block';
            gridContainer.style.display = 'none';
            timelineViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
        } else {
            timelineContainer.style.display = 'none';
            gridContainer.style.display = 'block';
            timelineViewBtn.classList.remove('active');
            gridViewBtn.classList.add('active');
        }
        applyFilters(); // Re-render with the new view
    }

    // --- Event Listeners ---
    searchInput.addEventListener('input', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    periodFilter.addEventListener('change', applyFilters);
    timelineViewBtn.addEventListener('click', () => toggleView('timeline'));
    gridViewBtn.addEventListener('click', () => toggleView('grid'));

    // --- Initial Load ---
    fetchOrders();
});

