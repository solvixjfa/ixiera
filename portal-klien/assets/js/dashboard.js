/*
================================================================================
| DASHBOARD JAVASCRIPT UNTUK AGENCY - BAHASA INDONESIA                        |
| Version: 5.0 (With Cache System & Agency Features)                         |
================================================================================
*/

// --- SIMPLE USER DATA HANDLER --- 
async function initializeUserData() {
    try {
        const { data: { session } } = await window.dbClient.auth.getSession();
        
        if (!session || !session.user) {
            window.location.href = 'sign-in.html';
            return;
        }

        // Update UI dengan data user
        const user = session.user;
        const userMetadata = user.user_metadata;
        const displayName = userMetadata?.full_name || 
                           userMetadata?.name || 
                           user.email?.split('@')[0] || 
                           'Klien';

        const userEmail = user.email || 'klien@email.com';
        const avatarUrl = userMetadata?.avatar_url || 'assets/img/profile.jpg';

        // Update navbar elements
        const usernameDisplay = document.getElementById('username-display');
        const usernameDropdown = document.getElementById('username-dropdown');
        const userEmailDropdown = document.getElementById('user-email-dropdown');

        if (usernameDisplay) usernameDisplay.textContent = displayName;
        if (usernameDropdown) usernameDropdown.textContent = displayName;
        if (userEmailDropdown) userEmailDropdown.textContent = userEmail;

        // Update avatar images
        const avatarImages = document.querySelectorAll('.avatar-img');
        avatarImages.forEach(img => {
            if (avatarUrl && avatarUrl !== 'assets/img/profile.jpg') {
                img.src = avatarUrl;
            }
            img.alt = `${displayName}'s profile picture`;
        });

        console.log('✅ User data loaded:', displayName);

        // Setup logout handlers
        const logoutButtons = document.querySelectorAll('#logoutButton, #logoutButtonDropdown');
        logoutButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                await handleLogout();
            });
        });

    } catch (error) {
        console.error('Error loading user data:', error);
        window.location.href = 'sign-in.html';
    }
}

// Handle logout
async function handleLogout() {
    try {
        const { error } = await window.dbClient.auth.signOut();
        if (error) throw error;

        if (window.showNotification) {
            window.showNotification("Logout berhasil!", "info");
        }
        setTimeout(() => {
            window.location.href = 'sign-in.html';
        }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        if (window.showNotification) {
            window.showNotification("Error logout. Silakan coba lagi.", "error");
        }
    }
}

// --- MAIN DASHBOARD INITIALIZATION ---
document.addEventListener('DOMContentLoaded', function() {
    if (window.dbClient) {
        initializeDashboard();
    } else {
        document.addEventListener('supabase-ready', initializeDashboard);
    }
});

async function initializeDashboard() {
    console.log('🚀 Initializing Dashboard...');
    
    try {
        // Pertama, load user data
        await initializeUserData();
        
        // --- VARIABEL GLOBAL ---
        let allOrders = [];
        let currentPage = 1;
        const ordersPerPage = 5;
        let currentSort = { field: 'created_at', direction: 'desc' };
        let currentSearch = '';

        // --- SELEKSI ELEMEN DOM ---
        const ordersTableBody = document.getElementById("orders-tracking-table");
        const emptyOrdersMessage = document.getElementById("empty-orders-message");
        const orderRowTemplate = document.getElementById("order-row-template");
        
        const statsInProgress = document.getElementById("stats-in-progress");
        const statsCompleted = document.getElementById("stats-completed");
        const statsTotalSpent = document.getElementById("stats-total-spent");
        
        // Elemen untuk fitur baru
        const timeGreeting = document.getElementById("time-greeting");
        const currentTime = document.getElementById("current-time");
        const lastUpdatedTime = document.getElementById("last-updated-time");
        const totalOrdersCount = document.getElementById("total-orders-count");
        const progressInProgress = document.getElementById("progress-in-progress");
        const progressCompleted = document.getElementById("progress-completed");
        const averageOrderValue = document.getElementById("average-order-value");
        const orderSearch = document.getElementById("order-search");
        const paginationContainer = document.getElementById("pagination-container");
        const showingCount = document.getElementById("showing-count");
        const totalCount = document.getElementById("total-count");
        const refreshButton = document.querySelector('.refresh-dashboard');
        const exportButton = document.getElementById('export-data');

        // --- VALIDASI ELEMEN DOM ---
        if (!ordersTableBody || !emptyOrdersMessage || !orderRowTemplate) {
            console.error('Elemen DOM yang diperlukan tidak ditemukan');
            return;
        }

        // --- INISIALISASI FITUR UX ---
        initializeUXFeatures();

        /**
         * Inisialisasi semua fitur UX tambahan
         */
        function initializeUXFeatures() {
            try {
                updateTimeAndGreeting();
                setInterval(updateTimeAndGreeting, 60000);
                
                // Event listeners untuk fitur baru
                if (refreshButton) {
                    refreshButton.addEventListener('click', handleRefresh);
                }
                
                if (exportButton) {
                    exportButton.addEventListener('click', handleExport);
                }
                
                if (orderSearch) {
                    orderSearch.addEventListener('input', handleSearch);
                }
                
            } catch (error) {
                console.error('Error inisialisasi fitur UX:', error);
            }
        }

        /**
         * Update waktu dan greeting dalam Bahasa Indonesia
         */
        function updateTimeAndGreeting() {
            try {
                const now = new Date();
                const hours = now.getHours();
                const timeString = now.toLocaleString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                let greeting = 'Selamat datang kembali!';
                if (hours < 11) greeting = 'Selamat pagi!';
                else if (hours < 15) greeting = 'Selamat siang!';
                else if (hours < 19) greeting = 'Selamat sore!';
                else greeting = 'Selamat malam!';
                
                if (timeGreeting) timeGreeting.textContent = `${greeting} Berikut progress project Anda.`;
                if (currentTime) currentTime.textContent = timeString;
            } catch (error) {
                console.error('Error update waktu dan greeting:', error);
            }
        }

        /**
         * Fungsi utama untuk memuat semua data dashboard - WITH CACHE
         */
        async function loadDashboard() {
            if (window.toggleLoadingSpinner) {
                window.toggleLoadingSpinner(true);
            }
            
            try {
                const user = await window.getCurrentUser();
                if (!user) {
                    throw new Error("User tidak terautentikasi. Silakan login kembali.");
                }

                // CEK CACHE DULU - Hemat API Calls!
                const cachedOrders = getCachedOrders(user.id);
                if (cachedOrders && cachedOrders.length > 0) {
                    console.log('💾 Using cached orders (0 API calls)');
                    allOrders = cachedOrders;
                    updateLastUpdatedTime();
                    applyFiltersAndRender();
                    return; // STOP - tidak perlu API call!
                }

                // Jika cache kosong, baru query Supabase
                console.log('🔄 Cache empty, fetching from Supabase...');
                const { data: orders, error } = await window.dbClient
                    .from("leads_solvixone")
                    .select(`
                        id,
                        created_at,
                        updated_at,
                        status,
                        quantity,
                        notes,
                        project_name,
                        service_type,
                        progress_percentage,
                        current_phase,
                        deadline,
                        assigned_agent,
                        requirements,
                        integration_services,
                        client_phone,
                        client_company,
                        product:products (
                            id,
                            name, 
                            price, 
                            image_path,
                            description,
                            category,
                            features,
                            demo_link
                        )
                    `)
                    .eq("client_id", user.id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error database:', error);
                    throw error;
                }

                allOrders = orders || [];
                
                // SIMPAN KE CACHE untuk next time
                setOrdersCache(user.id, allOrders);
                
                updateLastUpdatedTime();
                applyFiltersAndRender();

            } catch (error) {
                console.error("Error memuat data dashboard:", error);
                showError("Gagal memuat data project. Silakan refresh halaman.");
            } finally {
                if (window.toggleLoadingSpinner) {
                    window.toggleLoadingSpinner(false);
                }
            }
        }

        /**
         * Cache System untuk Orders
         */
        function getCachedOrders(userId) {
            try {
                const cached = localStorage.getItem(`ixiera_orders_cache_${userId}`);
                const cacheTime = localStorage.getItem(`ixiera_orders_cache_time_${userId}`);
                
                if (!cached || !cacheTime) {
                    console.log('💾 No orders cache found');
                    return null;
                }
                
                // Cek jika cache masih fresh (30 menit = 1800000 ms)
                const now = Date.now();
                const cacheAge = now - parseInt(cacheTime);
                const thirtyMinutes = 30 * 60 * 1000;
                
                if (cacheAge < thirtyMinutes) {
                    console.log('💾 Orders cache is fresh (' + Math.round(cacheAge/1000/60) + ' minutes old)');
                    return JSON.parse(cached);
                } else {
                    // Cache expired, hapus
                    console.log('💾 Orders cache expired, cleaning...');
                    localStorage.removeItem(`ixiera_orders_cache_${userId}`);
                    localStorage.removeItem(`ixiera_orders_cache_time_${userId}`);
                    return null;
                }
            } catch (error) {
                console.warn('⚠️ Orders cache error:', error);
                return null;
            }
        }

        function setOrdersCache(userId, orders) {
            try {
                localStorage.setItem(`ixiera_orders_cache_${userId}`, JSON.stringify(orders));
                localStorage.setItem(`ixiera_orders_cache_time_${userId}`, Date.now().toString());
                console.log('💾 Orders cached successfully for 30 minutes');
            } catch (error) {
                console.warn('⚠️ Cannot cache orders:', error);
            }
        }

        /**
         * Apply search filter and render orders
         */
        function applyFiltersAndRender() {
            try {
                let filteredOrders = [...allOrders];
                
                // Apply search filter
                if (currentSearch) {
                    filteredOrders = filteredOrders.filter(order => 
                        order.product?.name?.toLowerCase().includes(currentSearch.toLowerCase()) ||
                        order.project_name?.toLowerCase().includes(currentSearch.toLowerCase()) ||
                        order.id.toString().includes(currentSearch) ||
                        order.status?.toLowerCase().includes(currentSearch.toLowerCase()) ||
                        order.notes?.toLowerCase().includes(currentSearch.toLowerCase()) ||
                        order.service_type?.toLowerCase().includes(currentSearch.toLowerCase())
                    );
                }
                
                // Apply sorting
                filteredOrders.sort((a, b) => {
                    let aValue, bValue;
                    
                    switch (currentSort.field) {
                        case 'product':
                            aValue = a.project_name || a.product?.name || '';
                            bValue = b.project_name || b.product?.name || '';
                            break;
                        case 'progress':
                            aValue = getProgressDetails(a.status).progress;
                            bValue = getProgressDetails(b.status).progress;
                            break;
                        case 'status':
                            aValue = a.status || '';
                            bValue = b.status || '';
                            break;
                        case 'created_at':
                        default:
                            aValue = new Date(a.created_at);
                            bValue = new Date(b.created_at);
                    }
                    
                    if (currentSort.direction === 'desc') {
                        return aValue < bValue ? 1 : -1;
                    } else {
                        return aValue > bValue ? 1 : -1;
                    }
                });
                
                // Apply pagination
                const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
                const startIndex = (currentPage - 1) * ordersPerPage;
                const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);
                
                renderOrderTracking(paginatedOrders);
                renderPagination(totalPages);
                updateStatsDisplay(filteredOrders);
                
                // Update counters
                if (showingCount) showingCount.textContent = paginatedOrders.length;
                if (totalCount) totalCount.textContent = filteredOrders.length;
                if (totalOrdersCount) totalOrdersCount.textContent = allOrders.length;
                
            } catch (error) {
                console.error('Error apply filters dan render:', error);
                showError('Error menampilkan project. Silakan refresh halaman.');
            }
        }

        /**
         * Render order tracking dengan fitur agency
         */
        function renderOrderTracking(orders) {
            try {
                ordersTableBody.innerHTML = '';

                if (!orders || orders.length === 0) {
                    emptyOrdersMessage.style.display = 'block';
                    return;
                }
                
                emptyOrdersMessage.style.display = 'none';

                orders.forEach(order => {
                    const templateClone = orderRowTemplate.content.cloneNode(true);
                    renderEnhancedOrderRow(templateClone, order);
                    ordersTableBody.appendChild(templateClone);
                });
            } catch (error) {
                console.error('Error render order tracking:', error);
                showError('Error menampilkan data project.');
            }
        }

        /**
         * Render enhanced order row dengan fitur agency - MODIFIED
         */
        function renderEnhancedOrderRow(templateClone, order) {
            const { progress, isComplete, description, actionText } = getProgressDetails(order.status);
            
            // Basic info
            const productName = order.product ? order.product.name : 'Project';
            const projectName = order.project_name || productName;
            const orderId = `#${order.id.substring(0, 8)}`;
            const createdDate = new Date(order.created_at).toLocaleDateString('id-ID');
            const updatedDate = new Date(order.updated_at || order.created_at).toLocaleDateString('id-ID');

            // Update elemen dasar
            const nameEl = templateClone.querySelector('.product-name');
            const idEl = templateClone.querySelector('.order-id');
            const dateEl = templateClone.querySelector('.order-date');
            const progressBarEl = templateClone.querySelector('.progress-bar');
            const progressTextEl = templateClone.querySelector('.progress-text');
            const statusDescEl = templateClone.querySelector('.status-description');
            const statusTimeEl = templateClone.querySelector('.status-time');

            if (nameEl) nameEl.textContent = projectName;
            if (idEl) idEl.textContent = orderId;
            if (dateEl) dateEl.textContent = `Dibuat: ${createdDate}`;
            if (progressTextEl) progressTextEl.textContent = `${progress}%`;
            if (progressBarEl) {
                progressBarEl.style.width = `${progress}%`;
                progressBarEl.setAttribute('aria-valuenow', progress);
            }
            if (statusDescEl) statusDescEl.textContent = description;
            if (statusTimeEl) statusTimeEl.textContent = `Update: ${updatedDate}`;

            // Product details - TAMPILKAN INFO PRODUK
            const productDetails = templateClone.querySelector('.product-details');
            if (productDetails && order.product) {
                let detailsHTML = '';
                if (order.product.category) {
                    detailsHTML += `<small class="text-muted"><i class="fas fa-tag me-1"></i>${order.product.category}</small><br>`;
                }
                if (order.product.description) {
                    const shortDesc = order.product.description.length > 80 ? 
                        order.product.description.substring(0, 80) + '...' : 
                        order.product.description;
                    detailsHTML += `<small class="text-muted">${shortDesc}</small>`;
                }
                productDetails.innerHTML = detailsHTML;
            }

            // Service type badge
            const serviceTypeBadge = templateClone.querySelector('.service-type-badge');
            if (serviceTypeBadge && order.service_type) {
                serviceTypeBadge.textContent = order.service_type;
                serviceTypeBadge.className = `badge bg-${getServiceTypeColor(order.service_type)} service-type-badge`;
            }

            // Timeline info
            const timelineInfo = templateClone.querySelector('.timeline-info');
            if (timelineInfo && order.deadline) {
                const deadline = new Date(order.deadline);
                const today = new Date();
                const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
                
                if (daysLeft > 0) {
                    timelineInfo.innerHTML = `<i class="fas fa-clock me-1"></i>${daysLeft} hari lagi`;
                    timelineInfo.className = `text-${daysLeft < 7 ? 'danger' : 'warning'} timeline-info d-block`;
                } else if (daysLeft === 0) {
                    timelineInfo.innerHTML = `<i class="fas fa-exclamation-circle me-1"></i>Deadline hari ini`;
                    timelineInfo.className = 'text-warning timeline-info d-block';
                } else {
                    timelineInfo.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i>Terlambat ${Math.abs(daysLeft)} hari`;
                    timelineInfo.className = 'text-danger timeline-info d-block';
                }
            }

            // Status badge dan tombol - MODIFIED UNTUK AGENCY
            const statusBadge = templateClone.querySelector('.status-badge');
            if (statusBadge) {
                updateStatusBadgeColor(statusBadge, order.status);
            }

            // HAPUS TOMBOL DOWNLOAD & GANTI DENGAN AGENCY ACTIONS
            const downloadBtnEl = templateClone.querySelector('.download-btn');
            if (downloadBtnEl) {
                downloadBtnEl.remove(); // HAPUS TOMBOL DOWNLOAD
            }

            // Tombol actions untuk agency
            const actionButtons = templateClone.querySelector('.action-buttons');
            if (actionButtons) {
                let buttonsHTML = '';
                
                if (isComplete) {
                    // Project selesai - tombol review & support
                    buttonsHTML = `
                        <button class="btn btn-outline-success btn-sm complete-action" 
                                onclick="handleProjectComplete('${order.id}')">
                            <i class="fas fa-star me-1"></i>Berikan Review
                        </button>
                        <button class="btn btn-outline-info btn-sm support-action"
                                onclick="contactSupport('${order.id}')">
                            <i class="fas fa-headset me-1"></i>Support
                        </button>
                    `;
                } else {
                    // Project aktif - tombol progress & chat
                    buttonsHTML = `
                        <button class="btn btn-outline-primary btn-sm view-details"
                                onclick="viewProjectDetails('${order.id}')">
                            <i class="fas fa-eye me-1"></i>Detail
                        </button>
                        <button class="btn btn-outline-dark btn-sm contact-action"
                                onclick="contactProjectManager('${order.id}')">
                            <i class="fas fa-comments me-1"></i>Chat
                        </button>
                    `;
                }
                
                actionButtons.innerHTML = buttonsHTML;
            }

            // Tampilkan action text untuk completed projects
            const actionTextEl = templateClone.querySelector('.action-text');
            if (actionTextEl && isComplete) {
                actionTextEl.innerHTML = `<small class="text-success"><i class="fas fa-check-circle me-1"></i>${actionText}</small>`;
                actionTextEl.style.display = 'block';
            }
        }

        /**
         * Mapping progress untuk agency services - MODIFIED
         */
        function getProgressDetails(status) {
            const s = status ? status.toLowerCase() : 'new';
            const progressMap = {
                'new': { 
                    progress: 10, 
                    isComplete: false, 
                    description: 'Project diterima dan dalam antrian',
                    actionText: ''
                },
                'consultation': { 
                    progress: 20, 
                    isComplete: false, 
                    description: 'Sedang konsultasi kebutuhan',
                    actionText: ''
                },
                'requirements': { 
                    progress: 35, 
                    isComplete: false, 
                    description: 'Analisis requirements',
                    actionText: ''
                },
                'design': { 
                    progress: 50, 
                    isComplete: false, 
                    description: 'Phase desain UI/UX',
                    actionText: ''
                },
                'development': { 
                    progress: 65, 
                    isComplete: false, 
                    description: 'Pengembangan berjalan',
                    actionText: ''
                },
                'testing': { 
                    progress: 80, 
                    isComplete: false, 
                    description: 'Testing kualitas',
                    actionText: ''
                },
                'review': { 
                    progress: 90, 
                    isComplete: false, 
                    description: 'Review oleh klien',
                    actionText: ''
                },
                'completed': { 
                    progress: 100, 
                    isComplete: true, 
                    description: 'Project selesai dan delivered',
                    actionText: 'Project selesai! Silakan hubungi admin untuk maintenance.'
                },
                'maintenance': { 
                    progress: 100, 
                    isComplete: true, 
                    description: 'Dalam masa maintenance',
                    actionText: 'Dalam maintenance. Hubungi admin untuk support.'
                }
            };
            return progressMap[s] || { 
                progress: 5, 
                isComplete: false, 
                description: 'Memproses project',
                actionText: ''
            };
        }

        function updateStatusBadgeColor(badge, status) {
            const statusMap = {
                'new': 'bg-secondary',
                'consultation': 'bg-info',
                'requirements': 'bg-primary',
                'design': 'bg-purple',
                'development': 'bg-primary',
                'testing': 'bg-warning',
                'review': 'bg-orange',
                'completed': 'bg-success',
                'maintenance': 'bg-dark'
            };
            
            badge.className = `badge status-badge ${statusMap[status?.toLowerCase()] || 'bg-secondary'}`;
            badge.textContent = status || 'Baru';
        }

        function getServiceTypeColor(serviceType) {
            const colors = {
                'website': 'primary',
                'automation': 'info', 
                'integration': 'success',
                'maintenance': 'warning',
                'consultation': 'secondary',
                'mobile': 'purple',
                'ecommerce': 'orange',
                'marketing': 'pink'
            };
            return colors[serviceType] || 'primary';
        }

        /**
         * Update stats dengan format Rupiah
         */
        function updateStatsDisplay(orders) {
            try {
                let inProgressCount = 0;
                let completedCount = 0;
                let totalSpent = 0;

                orders.forEach(order => {
                    if (getProgressDetails(order.status).isComplete) {
                        completedCount++;
                        if (order.product && order.product.price) {
                            totalSpent += parseFloat(order.product.price) * (order.quantity || 1);
                        }
                    } else {
                        inProgressCount++;
                    }
                });

                const totalOrders = orders.length;
                const progressPercentage = totalOrders > 0 ? (completedCount / totalOrders) * 100 : 0;
                const averageOrder = completedCount > 0 ? totalSpent / completedCount : 0;

                // Format Rupiah
                const formatRupiah = (amount) => {
                    return new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0
                    }).format(amount);
                };

                // Update stats
                if (statsInProgress) statsInProgress.textContent = inProgressCount;
                if (statsCompleted) statsCompleted.textContent = completedCount;
                if (statsTotalSpent) statsTotalSpent.textContent = formatRupiah(totalSpent);
                if (averageOrderValue) averageOrderValue.textContent = `Rata-rata: ${formatRupiah(averageOrder)}`;

                // Update progress bars
                if (progressInProgress && totalOrders > 0) {
                    progressInProgress.style.width = `${(inProgressCount / totalOrders) * 100}%`;
                }
                if (progressCompleted && totalOrders > 0) {
                    progressCompleted.style.width = `${progressPercentage}%`;
                }
            } catch (error) {
                console.error('Error update stats display:', error);
            }
        }

        // --- EVENT HANDLERS ---
        function handleRefresh() {
            const user = window.getCurrentUser();
            if (user) {
                // HAPUS CACHE untuk force refresh
                localStorage.removeItem(`ixiera_orders_cache_${user.id}`);
                localStorage.removeItem(`ixiera_orders_cache_time_${user.id}`);
            }
            
            currentPage = 1;
            currentSearch = '';
            if (orderSearch) orderSearch.value = '';
            loadDashboard();
            if (window.showNotification) {
                window.showNotification("Dashboard diperbarui dari server", "success");
            }
        }

        function handleSearch(e) {
            currentSearch = e.target.value;
            currentPage = 1;
            applyFiltersAndRender();
        }

        function handleExport() {
            if (window.showNotification) {
                window.showNotification("Fitur export akan segera hadir", "info");
            }
        }

        function updateLastUpdatedTime() {
            if (lastUpdatedTime) {
                const now = new Date();
                lastUpdatedTime.textContent = now.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
        }

        function showError(message) {
            if (window.showNotification) {
                window.showNotification(message, "danger");
            }
        }

        // --- PAGINATION ---
        function renderPagination(totalPages) {
            if (!paginationContainer) return;
            
            paginationContainer.innerHTML = '';
            
            if (totalPages <= 1) return;
            
            // Previous button
            const prevLi = document.createElement('li');
            prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
            prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">Sebelumnya</a>`;
            paginationContainer.appendChild(prevLi);
            
            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                const pageLi = document.createElement('li');
                pageLi.className = `page-item ${currentPage === i ? 'active' : ''}`;
                pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
                paginationContainer.appendChild(pageLi);
            }
            
            // Next button
            const nextLi = document.createElement('li');
            nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
            nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">Selanjutnya</a>`;
            paginationContainer.appendChild(nextLi);
            
            // Add event listeners
            paginationContainer.querySelectorAll('.page-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = parseInt(e.target.dataset.page);
                    if (page && page !== currentPage) {
                        currentPage = page;
                        applyFiltersAndRender();
                    }
                });
            });
        }

        // --- AGENCY ACTION FUNCTIONS ---
        window.handleProjectComplete = function(orderId) {
            if (window.showNotification) {
                window.showNotification("Terima kasih! Silakan berikan review pengalaman Anda.", "info");
            }
            // Redirect ke review page atau buka modal review
            setTimeout(() => {
                window.open('https://forms.gle/your-review-form-link', '_blank');
            }, 1000);
        };

        window.contactSupport = function(orderId) {
            if (window.showNotification) {
                window.showNotification("Mengarahkan ke halaman support...", "info");
            }
            window.open('support.html', '_blank');
        };

        window.viewProjectDetails = function(orderId) {
            const order = allOrders.find(o => o.id === orderId);
            if (order && window.showNotification) {
                window.showNotification(`Membuka detail project: ${order.project_name}`, "info");
            }
            // Buka modal detail project
            // showProjectDetailsModal(orderId);
        };

        window.contactProjectManager = function(orderId) {
            if (window.showNotification) {
                window.showNotification("Membuka chat dengan project manager...", "info");
            }
            window.open('community.html', '_blank');
        };

        // --- MEMUAT DATA AWAL ---
        loadDashboard();

    } catch (error) {
        console.error('❌ Fatal error initializing dashboard:', error);
        showError("Terjadi kesalahan sistem. Silakan refresh halaman.");
    }
}