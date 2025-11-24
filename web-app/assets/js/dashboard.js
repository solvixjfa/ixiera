// assets/js/dashboard.js - FIXED VERSION
import { getSupabase } from './supabase-client.js';

class ElegantDashboard {
    constructor() {
        this.supabase = getSupabase();
        this.currentUser = null;
        this.projects = [];
        this.invoices = [];
        this.currentSection = 'projects';
        this.cacheKey = null;
        this.cacheDuration = 5 * 60 * 1000;
        this.performance = {
            startTime: 0,
            loadTime: 0
        };
        this.init();
    }

    async init() {
        this.performance.startTime = performance.now();
        console.log('🚀 Initializing Elegant Dashboard...');

        try {
            const isAuthenticated = await this.checkAuthentication();
            if (isAuthenticated) {
                this.setupCache();
                this.setupNavigation();
                this.setupEventListeners();
                await this.loadInitialData();
                this.setupPerformanceMonitoring();
                this.showDashboard();
            } else {
                this.showAccessDenied();
            }
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError('Terjadi kesalahan saat memuat dashboard');
        }
    }

    async loadInitialData() {
        await Promise.all([
            this.loadUserProjects(),
            this.loadUserInvoices()
        ]);
        
        this.handleHashNavigation();
    }

    // === NAVIGATION ===
    setupNavigation() {
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('data-section') || 
                               e.target.closest('.nav-link').getAttribute('data-section');
                this.switchSection(section);
            });
        });

        window.addEventListener('hashchange', () => {
            this.handleHashNavigation();
        });
    }

    handleHashNavigation() {
        const hash = window.location.hash.substring(1) || 'projects';
        this.switchSection(hash);
    }

    switchSection(section) {
        console.log('🔄 Switching to section:', section);
        window.location.hash = section;
        
        // Update navigation active state
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            const linkSection = link.getAttribute('data-section');
            if (linkSection === section) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Hide all sections
        document.querySelectorAll('section').forEach(sec => {
            sec.style.display = 'none';
        });

        // Show target section
        const targetSection = document.getElementById(`${section}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            console.log('✅ Section displayed:', section);
        } else {
            console.error('❌ Section not found:', `${section}-section`);
        }

        this.currentSection = section;
    }

    // === AUTH & CACHE ===
    async checkAuthentication() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error || !session) {
                console.log('❌ No valid session found');
                return false;
            }

            this.currentUser = session.user;
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = this.currentUser.email;
            }
            console.log('✅ User authenticated:', this.currentUser.email);
            return true;
        } catch (error) {
            console.error('Auth error:', error);
            return false;
        }
    }

    setupCache() {
        if (this.currentUser && this.currentUser.email) {
            this.cacheKey = `ixiera_dashboard_${this.currentUser.email}`;
        }
    }

    getCachedData(key) {
        if (!this.cacheKey) return null;

        try {
            const cached = localStorage.getItem(`${this.cacheKey}_${key}`);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();

            if (now - timestamp < this.cacheDuration) {
                return data;
            } else {
                localStorage.removeItem(`${this.cacheKey}_${key}`);
                return null;
            }
        } catch (error) {
            console.warn('Cache read error:', error);
            return null;
        }
    }

    setCachedData(key, data) {
        if (!this.cacheKey) return;

        try {
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(`${this.cacheKey}_${key}`, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Cache write error:', error);
        }
    }

    // === PROJECTS SYSTEM ===
    async loadUserProjects(forceRefresh = false) {
        this.showSkeletonLoader('projects');
        
        try {
            let projects = null;
            let fromCache = false;

            if (!forceRefresh) {
                projects = this.getCachedData('projects');
                if (projects) {
                    fromCache = true;
                    console.log('📦 Loading projects from cache');
                }
            }

            if (!projects) {
                console.log('🌐 Fetching fresh projects data from API');
                const { data, error } = await this.supabase
                    .from('project_inquiries')
                    .select('*')
                    .eq('client_email', this.currentUser.email)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Supabase error:', error);
                    throw new Error(`Database error: ${error.message}`);
                }
                projects = data || [];
                this.setCachedData('projects', projects);
            }

            this.projects = projects;
            this.displayProjects();
            this.updateProjectsStats();
            this.showCacheIndicator(fromCache, 'projects');

        } catch (error) {
            console.error('❌ Error loading projects:', error);
            this.showError('Gagal memuat project: ' + (error.message || 'Unknown error'));
        } finally {
            this.hideSkeletonLoader('projects');
        }
    }

    displayProjects() {
        const container = document.getElementById('projects-container');
        if (!container) {
            console.error('❌ projects-container not found');
            return;
        }

        if (this.projects.length === 0) {
            container.innerHTML = this.getEmptyProjectsHTML();
            return;
        }

        container.innerHTML = this.projects.map((project, index) => {
            const projectInvoice = this.invoices.find(inv => inv.project_id === project.id);
            const hasInvoice = !!projectInvoice;
            
            return `
            <div class="project-card project-item" data-status="${project.status || 'new'}" 
                 style="opacity: 0; transform: translateY(20px); animation: fadeInUp 0.6s ease ${index * 0.1}s forwards;">
                <div class="card-body p-4">
                    <div class="row align-items-start">
                        <div class="col-lg-8">
                            <div class="d-flex align-items-start justify-content-between mb-3">
                                <div>
                                    <h5 class="fw-bold mb-2">${this.escapeHtml(project.service_type || 'General Project')}</h5>
                                    <div class="d-flex gap-2 align-items-center">
                                        <span class="status-badge status-${this.getStatusClass(project.status)}">
                                            ${this.getStatusText(project.status)}
                                        </span>
                                        ${hasInvoice ? `
                                            <span class="status-badge status-paid">
                                                Invoice Ready
                                            </span>
                                        ` : ''}
                                    </div>
                                </div>
                                <small class="text-silver-mist">#${project.id}</small>
                            </div>
                            
                            <div class="project-details mb-3">
                                <p class="text-silver-mist mb-0" style="white-space: pre-line; line-height: 1.6;">
                                    ${this.escapeHtml(project.project_requirements || 'No requirements specified')}
                                </p>
                                ${project.project_requirements && project.project_requirements.length > 150 ? `
                                <div class="read-more">
                                    <button class="btn btn-link btn-sm p-0 text-premium read-more-btn">
                                        <i class="bi bi-chevron-down me-1"></i>Baca selengkapnya
                                    </button>
                                </div>
                                ` : ''}
                            </div>
                            
                            <div class="d-flex flex-wrap gap-3 text-silver-mist" style="font-size: 0.85rem;">
                                <div><i class="bi bi-calendar me-1"></i>${new Date(project.created_at).toLocaleDateString('id-ID')}</div>
                                <div><i class="bi bi-person me-1"></i>${this.escapeHtml(project.client_name || 'Unknown')}</div>
                                ${project.budget && project.budget !== 'Tidak ditentukan' ? `
                                    <div><i class="bi bi-currency-dollar me-1"></i>${this.escapeHtml(project.budget)}</div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="col-lg-4 mt-3 mt-lg-0">
                            <div class="d-flex flex-column gap-2">
                                ${project.project_demo_url ? `
                                    <a href="${this.escapeHtml(project.project_demo_url)}" target="_blank" class="btn btn-premium btn-sm">
                                        <i class="bi bi-eye me-2"></i>live preview
                                    </a>
                                ` : `
                                    <button class="btn btn-outline-premium btn-sm" disabled>
                                        <i class="bi bi-eye me-2"></i>Demo Coming
                                    </button>
                                `}
                                <button class="btn btn-outline-premium btn-sm whatsapp-btn" 
                                    data-project-type="${this.escapeHtml(project.service_type || 'General Project')}"
                                    data-project-id="${project.id}">
                                    <i class="bi bi-whatsapp me-2"></i>Contact Support
                                </button>
                                ${this.getProjectActionButton(project)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        this.setupProjectInteractions();
        this.setupProjectFilters();
    }

    getProjectActionButton(project) {
        if (project.status === 'completed') {
            return `
                <button class="btn btn-premium btn-sm request-invoice-btn" 
                    data-project-id="${project.id}"
                    data-project-type="${this.escapeHtml(project.service_type)}">
                    <i class="bi bi-receipt me-2"></i>Request Invoice
                </button>
            `;
        } else {
            return `
                <button class="btn btn-outline-secondary btn-sm" disabled>
                    <i class="bi bi-hourglass me-2"></i>Complete Project First
                </button>
            `;
        }
    }

    setupProjectInteractions() {
        // Read more functionality
        document.querySelectorAll('.read-more-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const details = e.target.closest('.project-details');
                if (!details) return;
                
                const readMore = details.querySelector('.read-more');
                details.classList.toggle('expanded');
                
                if (readMore) {
                    readMore.classList.toggle('hidden');
                }
                
                if (details.classList.contains('expanded')) {
                    e.target.innerHTML = '<i class="bi bi-chevron-up me-1"></i>Sembunyikan';
                } else {
                    e.target.innerHTML = '<i class="bi bi-chevron-down me-1"></i>Baca selengkapnya';
                }
            });
        });

        // WhatsApp buttons
        document.querySelectorAll('.whatsapp-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectType = e.target.closest('.whatsapp-btn')?.dataset.projectType;
                const projectId = e.target.closest('.whatsapp-btn')?.dataset.projectId;
                if (projectType && projectId) {
                    this.openWhatsApp(`Halo IXIERA, saya mau tanya tentang project: ${projectType} (ID: ${projectId})`);
                }
            });
        });

        // Request Invoice buttons
        document.querySelectorAll('.request-invoice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.target.closest('.request-invoice-btn')?.dataset.projectId;
                const projectType = e.target.closest('.request-invoice-btn')?.dataset.projectType;
                if (projectId && projectType) {
                    this.requestInvoice(projectId, projectType);
                }
            });
        });
    }

    setupProjectFilters() {
        // Create filter buttons if they don't exist
        const projectsHeader = document.querySelector('#projects-section .dashboard-card .card-body');
        if (projectsHeader && !document.querySelector('.project-filters')) {
            const filterHtml = `
                <div class="project-filters mb-4">
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-outline-premium active" data-filter="all">All</button>
                        <button type="button" class="btn btn-outline-premium" data-filter="new">New</button>
                        <button type="button" class="btn btn-outline-premium" data-filter="in_progress">In Progress</button>
                        <button type="button" class="btn btn-outline-premium" data-filter="completed">Completed</button>
                    </div>
                </div>
            `;
            projectsHeader.insertAdjacentHTML('afterbegin', filterHtml);
        }

        const filterButtons = document.querySelectorAll('[data-filter]');
        const projectItems = document.querySelectorAll('.project-item');

        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                projectItems.forEach(item => {
                    if (filter === 'all' || item.dataset.status === filter) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }

    // === INVOICE SYSTEM ===
    async loadUserInvoices(forceRefresh = false) {
        this.showSkeletonLoader('invoices');
        
        try {
            let invoices = null;
            let fromCache = false;

            if (!forceRefresh) {
                invoices = this.getCachedData('invoices');
                if (invoices) {
                    fromCache = true;
                    console.log('📦 Loading invoices from cache');
                }
            }

            if (!invoices) {
                console.log('🌐 Fetching invoices data from API');
                const { data, error } = await this.supabase
                    .from('invoices')
                    .select('*')
                    .eq('client_email', this.currentUser.email)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Supabase error:', error);
                    throw new Error(`Database error: ${error.message}`);
                }
                invoices = data || [];
                this.setCachedData('invoices', invoices);
            }

            this.invoices = invoices;
            this.displayInvoices();
            this.updateInvoicesStats();
            this.showCacheIndicator(fromCache, 'invoices');

        } catch (error) {
            console.error('❌ Error loading invoices:', error);
            this.showError('Gagal memuat invoices: ' + error.message);
        } finally {
            this.hideSkeletonLoader('invoices');
        }
    }

    displayInvoices() {
        const container = document.getElementById('invoices-container');
        if (!container) {
            console.error('❌ invoices-container not found');
            return;
        }

        if (this.invoices.length === 0) {
            container.innerHTML = this.getEmptyInvoicesHTML();
            return;
        }

        container.innerHTML = this.invoices.map((invoice, index) => {
            const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status === 'sent';
            const status = isOverdue ? 'overdue' : invoice.status;
            
            return `
            <div class="project-card invoice-item" data-status="${status}" 
                 style="opacity: 0; transform: translateY(20px); animation: fadeInUp 0.6s ease ${index * 0.1}s forwards;">
                <div class="card-body p-4">
                    <div class="row align-items-center">
                        <div class="col-md-4 mb-3 mb-md-0">
                            <h6 class="fw-bold mb-1 text-premium">${invoice.invoice_number}</h6>
                            <small class="text-silver-mist">
                                ${invoice.project_name || 'General Service'}
                                ${invoice.project_id ? `<br>Project ID: ${invoice.project_id}` : ''}
                            </small>
                        </div>
                        <div class="col-md-2 mb-3 mb-md-0">
                            <span class="status-badge status-${status}">
                                ${this.getInvoiceStatusText(status)}
                                ${isOverdue ? ' ⚠️' : ''}
                            </span>
                        </div>
                        <div class="col-md-2 mb-3 mb-md-0">
                            <strong class="amount-badge">Rp ${this.formatCurrency(invoice.total_amount)}</strong>
                        </div>
                        <div class="col-md-2 mb-3 mb-md-0">
                            <small class="text-silver-mist">
                                Due: ${this.formatDate(invoice.due_date)}
                            </small>
                        </div>
                        <div class="col-md-2 text-md-end">
                            ${this.getInvoiceActions(invoice, status)}
                        </div>
                    </div>
                    
                    ${invoice.description ? `
                    <div class="row mt-3 pt-3 border-top border-dark">
                        <div class="col-12">
                            <small class="text-silver-mist">
                                <strong>Description:</strong> ${invoice.description}
                            </small>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            `;
        }).join('');

        this.setupInvoiceInteractions();
    }

    getInvoiceActions(invoice, status) {
        if (status === 'paid') {
            return `
                <button class="btn btn-outline-success btn-sm" disabled>
                    <i class="bi bi-check-lg me-1"></i>Paid
                </button>
            `;
        } else {
            return `
                <button class="btn btn-premium btn-sm pay-invoice-btn" data-invoice-id="${invoice.id}">
                    <i class="bi bi-credit-card me-1"></i>Pay Now
                </button>
            `;
        }
    }

    setupInvoiceInteractions() {
        // Pay Invoice - Show SeaBank Instructions
        document.querySelectorAll('.pay-invoice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const invoiceId = e.target.closest('.pay-invoice-btn')?.dataset.invoiceId;
                if (invoiceId) {
                    this.showSeaBankPayment(invoiceId);
                }
            });
        });
    }

    // === SEA BANK PAYMENT SYSTEM ===
    showSeaBankPayment(invoiceId) {
        const invoice = this.invoices.find(i => i.id == invoiceId);
        if (!invoice) return;

        const paymentInfo = `
🎯 **INSTRUKSI PEMBAYARAN - TRANSFER KE SEA BANK**

🧾 **INVOICE:** ${invoice.invoice_number}
💰 **TOTAL:** Rp ${this.formatCurrency(invoice.total_amount)}
📅 **TENGAT WAKTU:** ${this.formatDate(invoice.due_date)}

🏦 **INFORMASI REKENING TUJUAN:**
┌─────────────────────────────
│ 🌊 **Bank Tujuan:** SeaBank
│ 📞 **Nomor Rekening:** 9018 3198 4710
│ 👤 **Nama Penerima:** Muhammad Jeffri Saputra
│ 🏢 **Nama PENYEDIA JASA:** IXIERA DIGITAL AGENCY
└─────────────────────────────

💳 **CARA TRANSFER DARI BANK LAIN:**

**• TRANSFER VIA ATM:**
1. Masukkan kartu ATM & PIN
2. Pilih menu "Transfer"
3. Pilih "Ke Rekening Bank Lain"
4. Masukkan kode bank: 889 (SeaBank)
5. Input nomor rekening: 9018 3198 4710
6. Masukkan jumlah: Rp ${this.formatCurrency(invoice.total_amount)}
7. Konfirmasi transfer

**• TRANSFER VIA MOBILE BANKING:**
1. Buka aplikasi bank Anda
2. Pilih "Transfer Antar Bank"
3. Pilih bank: SeaBank (Kode: 889)
4. Input rekening: 9018 3198 4710
5. Nama akan muncul: Muhammad Jeffri Saputra
6. Input jumlah: Rp ${this.formatCurrency(invoice.total_amount)}
7. Masukkan berita: ${invoice.invoice_number}
8. Konfirmasi transfer

**• TRANSFER VIA INTERNET BANKING:**
1. Login internet banking
2. Pilih "Transfer Antar Bank"
3. Pilih bank: SeaBank
4. Input rekening: 9018 3198 4710
5. Jumlah: Rp ${this.formatCurrency(invoice.total_amount)}
6. Keterangan: ${invoice.invoice_number}

📞 **KONFIRMASI PEMBAYARAN:**
Setelah transfer, segera konfirmasi via WhatsApp dengan mengirim:
• Screenshot bukti transfer
• Nomor invoice: ${invoice.invoice_number}
• Nama Anda: ${this.currentUser.email}
• Bank asal transfer

⏰ **WAKTU PROSES:**
• Transfer instant: 1-5 menit
• Verifikasi: 1-2 jam kerja
• Update status: Real-time

⚠️ **HAL PENTING:**
• Transfer jumlah yang tepat
• Simpan bukti transfer dengan baik
• Konfirmasi maksimal 24 jam setelah transfer
• Pastikan nama penerima: Muhammad Jeffri Saputra
        `.trim();

        this.showPaymentModal(paymentInfo, invoice);
    }

    showPaymentModal(paymentInfo, invoice) {
        // Remove existing modal
        const existingModal = document.getElementById('paymentModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHtml = `
            <div class="modal fade" id="paymentModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content premium-payment-modal">
                        <div class="modal-header border-bottom border-premium">
                            <h5 class="modal-title text-white fw-bold">
                                <i class="bi bi-bank me-2"></i>Pembayaran via SeaBank
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="payment-header alert alert-premium mb-4">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-receipt me-3 fs-4"></i>
                                    <div>
                                        <strong class="d-block text-white">Invoice ${invoice.invoice_number}</strong>
                                        <span class="text-silver-mist">Total: <strong class="text-white">Rp ${this.formatCurrency(invoice.total_amount)}</strong> • Jatuh Tempo: ${this.formatDate(invoice.due_date)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="payment-instructions">
                                <div class="instruction-section mb-4">
                                    <h6 class="text-premium mb-3">
                                        <i class="bi bi-wallet2 me-2"></i>Informasi Rekening Tujuan
                                    </h6>
                                    <div class="bank-info-card">
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <div class="info-item">
                                                    <span class="label">Bank Tujuan</span>
                                                    <span class="value">SeaBank</span>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="info-item">
                                                    <span class="label">Kode Bank</span>
                                                    <span class="value">889</span>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="info-item">
                                                    <span class="label">Nomor Rekening</span>
                                                    <span class="value text-premium fw-bold">9018 3198 4710</span>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="info-item">
                                                    <span class="label">Nama Penerima</span>
                                                    <span class="value">Muhammad Jeffri Saputra</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="instruction-section mb-4">
                                    <h6 class="text-premium mb-3">
                                        <i class="bi bi-phone me-2"></i>Cara Transfer dari Bank Lain
                                    </h6>
                                    <div class="transfer-methods">
                                        <div class="method-item">
                                            <div class="method-header">
                                                <i class="bi bi-credit-card text-premium"></i>
                                                <span class="fw-bold">Via Mobile Banking</span>
                                            </div>
                                            <ol class="method-steps">
                                                <li>Buka aplikasi mobile banking bank Anda</li>
                                                <li>Pilih <strong>"Transfer Antar Bank"</strong></li>
                                                <li>Cari bank: <strong>SeaBank (Kode: 889)</strong></li>
                                                <li>Masukkan rekening: <strong>9018 3198 4710</strong></li>
                                                <li>Nama akan muncul: <strong>Muhammad Jeffri Saputra</strong></li>
                                                <li>Jumlah: <strong>Rp ${this.formatCurrency(invoice.total_amount)}</strong></li>
                                                <li>Berita: <strong>${invoice.invoice_number}</strong></li>
                                            </ol>
                                        </div>
                                        
                                        <div class="method-item">
                                            <div class="method-header">
                                                <i class="bi bi-laptop text-premium"></i>
                                                <span class="fw-bold">Via Internet Banking</span>
                                            </div>
                                            <ol class="method-steps">
                                                <li>Login ke internet banking</li>
                                                <li>Pilih menu <strong>"Transfer Antar Bank"</strong></li>
                                                <li>Pilih bank: <strong>SeaBank</strong></li>
                                                <li>Input rekening tujuan</li>
                                                <li>Masukkan jumlah transfer</li>
                                                <li>Tambahkan keterangan transfer</li>
                                            </ol>
                                        </div>

                                        <div class="method-item">
                                            <div class="method-header">
                                                <i class="bi bi-atm text-premium"></i>
                                                <span class="fw-bold">Via ATM</span>
                                            </div>
                                            <ol class="method-steps">
                                                <li>Masukkan kartu ATM & PIN</li>
                                                <li>Pilih menu <strong>"Transfer"</strong></li>
                                                <li>Pilih <strong>"Ke Rekening Bank Lain"</strong></li>
                                                <li>Masukkan kode bank: <strong>889</strong></li>
                                                <li>Input nomor rekening tujuan</li>
                                                <li>Konfirmasi data transfer</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>

                                <div class="instruction-section mb-4">
                                    <h6 class="text-premium mb-3">
                                        <i class="bi bi-whatsapp me-2"></i>Konfirmasi Pembayaran
                                    </h6>
                                    <div class="confirmation-info">
                                        <p class="mb-3">Setelah transfer berhasil, segera konfirmasi dengan mengirim:</p>
                                        <ul class="confirmation-list">
                                            <li><i class="bi bi-image text-premium me-2"></i>Screenshot bukti transfer</li>
                                            <li><i class="bi bi-receipt text-premium me-2"></i>Nomor invoice: <strong>${invoice.invoice_number}</strong></li>
                                            <li><i class="bi bi-person text-premium me-2"></i>Nama Anda: <strong>${this.currentUser.email}</strong></li>
                                            <li><i class="bi bi-bank text-premium me-2"></i>Bank asal transfer</li>
                                        </ul>
                                    </div>
                                </div>

                                <div class="instruction-section">
                                    <h6 class="text-premium mb-3">
                                        <i class="bi bi-clock me-2"></i>Informasi Penting
                                    </h6>
                                    <div class="important-notes">
                                        <div class="note-item">
                                            <i class="bi bi-check-circle text-success me-2"></i>
                                            <span>Transfer jumlah yang tepat: <strong>Rp ${this.formatCurrency(invoice.total_amount)}</strong></span>
                                        </div>
                                        <div class="note-item">
                                            <i class="bi bi-check-circle text-success me-2"></i>
                                            <span>Pastikan nama penerima: <strong>Muhammad Jeffri Saputra</strong></span>
                                        </div>
                                        <div class="note-item">
                                            <i class="bi bi-check-circle text-success me-2"></i>
                                            <span>Simpan bukti transfer dengan baik</span>
                                        </div>
                                        <div class="note-item">
                                            <i class="bi bi-check-circle text-success me-2"></i>
                                            <span>Konfirmasi maksimal 24 jam setelah transfer</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer border-top border-premium">
                            <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">
                                <i class="bi bi-x me-1"></i>Tutup
                            </button>
                            <button type="button" class="btn btn-premium" id="copy-payment-btn">
                                <i class="bi bi-copy me-1"></i>Salin Instruksi
                            </button>
                            <button type="button" class="btn btn-success" id="confirm-payment-btn">
                                <i class="bi bi-whatsapp me-1"></i>Konfirmasi via WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modalElement = document.getElementById('paymentModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();

            // Setup copy button
            document.getElementById('copy-payment-btn').addEventListener('click', () => {
                navigator.clipboard.writeText(paymentInfo).then(() => {
                    this.showToast('✅ Instruksi pembayaran berhasil disalin!', 'success');
                });
            });

            // Setup WhatsApp confirmation
            document.getElementById('confirm-payment-btn').addEventListener('click', () => {
                this.confirmPaymentViaWhatsApp(invoice);
                modal.hide();
            });

            // Clean up modal when hidden
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
            });
        }
    }

    confirmPaymentViaWhatsApp(invoice) {
        const message = `Halo IXIERA, saya sudah melakukan transfer untuk invoice ${invoice.invoice_number} sebesar Rp ${this.formatCurrency(invoice.total_amount)}. Berikut bukti transfer: [SILAKAN LAMPIRKAN SCREENSHOT]\n\nDetail Transfer:\n• Invoice: ${invoice.invoice_number}\n• Jumlah: Rp ${this.formatCurrency(invoice.total_amount)}\n• Email: ${this.currentUser.email}`;
        
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/6285702373412?text=${encodedMessage}`, '_blank');
        
        this.showToast('💬 Membuka WhatsApp untuk konfirmasi pembayaran', 'info');
    }

    requestInvoice(projectId, projectType) {
        const message = `Halo IXIERA, saya ingin request invoice untuk project: ${projectType} (ID: ${projectId}). Mohon kirimkan invoice ke email saya.`;
        
        this.openWhatsApp(message);
    }

    openWhatsApp(message) {
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/6285702373412?text=${encodedMessage}`, '_blank');
    }

    // === STATS & UTILITIES ===
    updateProjectsStats() {
        const stats = {
            total: this.projects.length,
            inProgress: this.projects.filter(p => p.status === 'in_progress').length,
            completed: this.projects.filter(p => p.status === 'completed').length,
            review: this.projects.filter(p => p.status === 'review').length
        };

        this.updateStatNumber('total-inquiries', stats.total);
        this.updateStatNumber('in-progress', stats.inProgress);
        this.updateStatNumber('completed', stats.completed);
        this.updateStatNumber('awaiting-review', stats.review);

        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Anda memiliki ${stats.total} project${stats.total !== 1 ? 's' : ''}`;
        }
    }

    updateInvoicesStats() {
        const now = new Date();
        const stats = {
            total: this.invoices.length,
            pending: this.invoices.filter(i => i.status === 'sent').length,
            paid: this.invoices.filter(i => i.status === 'paid').length,
            overdue: this.invoices.filter(i => 
                i.due_date && new Date(i.due_date) < now && i.status === 'sent'
            ).length
        };

        this.updateStatNumber('total-invoices', stats.total);
        this.updateStatNumber('pending-invoices', stats.pending);
        this.updateStatNumber('paid-invoices', stats.paid);
        this.updateStatNumber('overdue-invoices', stats.overdue);
    }

    updateStatNumber(elementId, targetNumber) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = targetNumber;
            
            // Animate stat cards
            const statCard = element.closest('.stat-card');
            if (statCard) {
                statCard.style.opacity = '1';
                statCard.style.transform = 'translateY(0) scale(1)';
            }
        }
    }

    // === UI MANAGEMENT ===
    showSkeletonLoader(type) {
        const loader = document.getElementById(`${type}-skeleton-loader`);
        const container = document.getElementById(`${type}-container`);
        
        if (loader && container) {
            loader.style.display = 'block';
            container.innerHTML = '';
        }
    }

    hideSkeletonLoader(type) {
        const loader = document.getElementById(`${type}-skeleton-loader`);
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showCacheIndicator(fromCache, type = 'projects') {
        const indicator = document.getElementById(`${type}-cache-indicator`);
        if (!indicator) {
            console.warn(`❌ Cache indicator not found: ${type}-cache-indicator`);
            return;
        }

        if (fromCache) {
            indicator.innerHTML = `<i class="bi bi-database me-1"></i>Data cached • ${new Date().toLocaleTimeString('id-ID')}`;
        } else {
            indicator.innerHTML = `<i class="bi bi-wifi me-1"></i>Data live • ${new Date().toLocaleTimeString('id-ID')}`;
        }
    }

    getStatusClass(status) {
        const statusClassMap = {
            'new': 'new',
            'review': 'new', 
            'in_progress': 'progress',
            'completed': 'completed'
        };
        return statusClassMap[status] || 'new';
    }

    getStatusText(status) {
        const statusMap = {
            'new': 'Baru',
            'review': 'Review', 
            'in_progress': 'Dalam Proses',
            'completed': 'Selesai'
        };
        return statusMap[status] || 'Baru';
    }

    getInvoiceStatusText(status) {
        const statusMap = {
            'draft': 'Draft',
            'sent': 'Pending',
            'paid': 'Paid', 
            'overdue': 'Overdue'
        };
        return statusMap[status] || 'Pending';
    }

    formatCurrency(amount) {
        if (!amount) return '0';
        return new Intl.NumberFormat('id-ID').format(amount);
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    getEmptyProjectsHTML() {
        return `
            <div class="text-center py-5">
                <i class="bi bi-inbox display-1 text-premium"></i>
                <h4 class="mt-3">Belum Ada Project</h4>
                <p class="text-silver-mist mb-4">Mulai dengan mengajukan project pertama Anda</p>
                <a href="contact.html" class="btn btn-premium">Ajukan Project</a>
            </div>
        `;
    }

    getEmptyInvoicesHTML() {
        return `
            <div class="text-center py-5">
                <i class="bi bi-receipt display-1 text-premium"></i>
                <h4 class="mt-3">Belum Ada Invoice</h4>
                <p class="text-silver-mist mb-4">Invoice akan muncul di sini setelah project selesai</p>
            </div>
        `;
    }

    showDashboard() {
        console.log('🎯 Showing dashboard content');
        this.hideElement('loading-section');
        this.hideElement('access-denied-section');
        this.showElement('dashboard-content');
    }

    showAccessDenied() {
        console.log('🚫 Showing access denied');
        this.hideElement('loading-section');
        this.hideElement('dashboard-content');
        this.showElement('access-denied-section');
    }

    showError(message) {
        console.error('💥 Showing error:', message);
        this.hideElement('loading-section');

        const container = document.getElementById(this.currentSection === 'invoices' ? 'invoices-container' : 'projects-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-light border border-premium">
                    <i class="bi bi-exclamation-triangle me-2 text-premium"></i>
                    <strong>Error:</strong> 
                    <span class="text-dark">${message}</span>
                    <br><br>
                    <button class="btn btn-outline-premium btn-sm" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise me-1"></i>Coba Lagi
                    </button>
                </div>
            `;
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.warn('❌ Toast container not found');
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white border-0 ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : type === 'warning' ? 'toast-warning' : 'toast-info'}`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    hideElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        } else {
            console.warn(`❌ Element to hide not found: ${id}`);
        }
    }

    showElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'block';
        } else {
            console.warn(`❌ Element to show not found: ${id}`);
        }
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    setupPerformanceMonitoring() {
        if (this.performance.startTime) {
            this.performance.loadTime = performance.now() - this.performance.startTime;
            console.log(`📊 Dashboard loaded in ${this.performance.loadTime.toFixed(0)}ms`);
        }
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await this.supabase.auth.signOut();
                window.location.href = 'login.html';
            });
        } else {
            console.warn('❌ Logout button not found');
        }

        // Refresh buttons
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadUserProjects(true);
            });
        }

        const refreshInvoicesBtn = document.getElementById('refresh-invoices-btn');
        if (refreshInvoicesBtn) {
            refreshInvoicesBtn.addEventListener('click', () => {
                this.loadUserInvoices(true);
            });
        }

        // Real-time updates every 2 minutes
        setInterval(() => {
            if (this.currentSection === 'projects') {
                this.loadUserProjects(true);
            } else {
                this.loadUserInvoices(true);
            }
        }, 2 * 60 * 1000);
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏁 DOM Content Loaded - Initializing Dashboard');
    new ElegantDashboard();
});

// Handle module loading errors
window.addEventListener('error', (e) => {
    console.error('💥 Global error:', e.error);
});
// === MOBILE NAVIGATION TOGGLE ===
// Taruh di PALING BAWAH file dashboard.js

function setupMobileNavigation() {
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mainNavigation = document.querySelector('.navbar-nav.ms-auto');
    
    if (mobileToggle && mainNavigation) {
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            mainNavigation.classList.toggle('show');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mainNavigation.contains(e.target) && !mobileToggle.contains(e.target)) {
                mainNavigation.classList.remove('show');
            }
        });
        
        // Close mobile menu when clicking nav links
        mainNavigation.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mainNavigation.classList.remove('show');
            });
        });
    }
}

// Auto setup
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(setupMobileNavigation, 500);
});